/**
 * Host half of UniCanvas.
 *
 * Owns the single canvas document, its operation log and its durable store, exposes
 * the browser-facing JSON API on the Connection Fetch route, and registers the agent
 * tools plus a system-prompt section that make the canvas usable by the model.
 *
 * Plain ESM with no @deepseek-ai/* imports: the bundle is linked into a profile whose
 * node_modules does not contain the harness packages.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve as resolvePath } from 'node:path';
import {
  addCanvas,
  applyOps,
  appendLog,
  buildRelationGraph,
  createDoc,
  createLibrary,
  currentScene,
  deleteCanvas,
  deleteSnapshot,
  focusViewport,
  librarySummary,
  listSnapshots,
  missingIds,
  newId,
  PALETTE,
  placeItems,
  pushSnapshot,
  relationTextMeta,
  renameCanvas,
  restoreSnapshot,
  SHAPES,
  summarizeDoc,
  switchCanvas,
  syncPayload,
} from './model.js';
import { appendDiagnostic, canvasDiagnosticsDir, canvasStorageFile, createCanvasStore } from './store.js';
import { boundsOfItems, importVaultPath, listVault, readVaultFile, scanVaultGraph, writeNoteFile } from './vault.mjs';
import {
  AI_MAX_PROVIDERS,
  AI_PROVIDER_SCHEMA,
  callOpenAiCompatible,
  extractJsonObject,
  normalizeProviderConfig,
  publicProvider,
  testAiProvider,
} from './ai.mjs';

export const name = 'infinite-canvas';
export const inject = ['connection'];

const API_ROUTE = '/api/canvas.doc';
const HOST_BUILD = '2026-11-08.21';
const MAX_CREATE_BATCH = 60;
const READ_TEXT_LIMIT = 24000;
const CREATE_FIELDS = ['type', 'text', 'x', 'y', 'w', 'h', 'color', 'shape', 'src', 'frameId'];

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    text: { type: 'string' },
    revision: { type: 'integer' },
  },
  required: ['text', 'revision'],
};

const renderText = (_args, value) => [{ type: 'text', text: value.text }];
const presentationMeta = (_args, value) => ({ revision: value.revision });
const output = { schema: OUTPUT_SCHEMA, render: renderText, presentationMeta };

const shortText = (text, limit) => {
  const single = String(text ?? '').replace(/\s+/g, ' ').trim();
  return single.length > limit ? `${single.slice(0, limit)}…` : single;
};

const describe = (item, limit = 40) => {
  const label = shortText(item.text, limit);
  return `${item.id} (${item.type}${label ? `: ${label}` : ''})`;
};

const jsonResponse = (status, value) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export function apply(ctx, config) {
  const log = (message) => {
    try {
      console.log(`[infinite-canvas] ${message}`);
    } catch (error) {
      /* logging must never break activation */
    }
  };

  const runtime = {
    store: null,
    library: null,
    doc: null,
    entries: [],
    ready: null,
    queue: Promise.resolve(),
  };

  /** Last content this process read/wrote for each file-backed card. */
  const knownFileContents = new Map();

  /** Serialize every document mutation onto one chain (browser API and agent tools share it). */
  const serialize = (task) => {
    const run = runtime.queue.then(task, task);
    runtime.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  const ensureReady = () => {
    if (runtime.ready !== null) return runtime.ready;
    runtime.ready = (async () => {
      try {
        runtime.store = await createCanvasStore(ctx, log);
        runtime.library = await runtime.store.load();
        runtime.doc = currentScene(runtime.library)?.doc ?? createDoc();
        runtime.entries = [];
        log(
          `loaded ${runtime.library.canvases.length} canvas(es), active "${runtime.doc.title}" revision ${runtime.doc.rev} with ${Object.keys(runtime.doc.items).length} nodes`,
        );
      } catch (error) {
        log(`store unavailable, running in memory only: ${String(error?.message ?? error)}`);
        try {
          if (runtime.store) await runtime.store.close();
        } catch (closeError) {
          /* the store never became usable */
        }
        runtime.store = null;
        runtime.library = createLibrary(createDoc());
        runtime.doc = currentScene(runtime.library)?.doc ?? createDoc();
        runtime.entries = [];
      }
    })();
    return runtime.ready;
  };

  /** Keep the active canvas record in the library in sync with the live doc. */
  const syncActiveScene = () => {
    const scene = currentScene(runtime.library);
    if (!scene || !runtime.doc) return null;
    scene.doc = runtime.doc;
    scene.updatedAt = runtime.doc.updatedAt;
    runtime.library.updatedAt = runtime.doc.updatedAt;
    return scene;
  };

  const scheduleSave = () => {
    if (!runtime.store || !runtime.library || !runtime.doc) return;
    syncActiveScene();
    runtime.store.save(runtime.library).catch((error) => log(`save failed: ${String(error?.message ?? error)}`));
  };

  /** Full state payload for the browser (used after switching / restoring). */
  const fullState = () => ({
    ...syncPayload(runtime.doc, [], undefined),
    docId: runtime.library.currentId,
    library: librarySummary(runtime.library),
    snapshots: listSnapshots(runtime.library),
    hostBuild: HOST_BUILD,
  });

  /** Write one file-backed card back into its Markdown file. */
  const syncItemFile = async (item) => {
    const filePath = String(item?.meta?.filePath ?? '').trim();
    if (filePath === '') return null;
    const content = String(item.text ?? '');
    try {
      const result = await writeNoteFile(filePath, content, {
        knownContent: knownFileContents.get(filePath),
        knownMtime: Number(item.meta?.fileMtime) || 0,
      });
      if (!result.unchanged) knownFileContents.set(filePath, content);
      if (result.conflictBackup) {
        appendDiagnostic('vault-sync.log', `conflict backup ${result.conflictBackup} for ${filePath}`).catch(() => {});
      }
      return result;
    } catch (error) {
      appendDiagnostic('vault-sync.log', `write-back failed ${filePath}: ${String(error?.message ?? error)}`).catch(() => {});
      throw error;
    }
  };

  /** Apply ops against the loaded document; caller must already be inside the serial chain. */
  const applyOpsNow = (ops, by) => {
    const result = applyOps(runtime.doc, ops, by === 'ai' ? 'ai' : 'user', new Date().toISOString());
    if (result.applied.length === 0) {
      return { revision: runtime.doc.rev, applied: [], changed: [], errors: result.errors };
    }
    runtime.doc = result.doc;
    runtime.entries = appendLog(runtime.entries, {
      rev: runtime.doc.rev,
      ops: result.applied,
      by: by === 'ai' ? 'ai' : 'user',
      at: Date.now(),
    });
    scheduleSave();
    // File-backed cards mirror their Markdown file as soon as their text changes
    // (user edits, AI plans and write-back patches all flow through here).
    if (result.changed.length > 0) {
      const fileItems = result.changed
        .map((id) => runtime.doc.items[id])
        .filter((item) => item && (item.type === 'note' || item.type === 'text') && item.meta?.filePath);
      if (fileItems.length > 0) {
        setTimeout(() => {
          for (const item of fileItems) syncItemFile(item).catch(() => {});
        }, 0);
      }
    }
    return {
      revision: runtime.doc.rev,
      applied: result.applied,
      changed: result.changed,
      errors: result.errors,
      title: runtime.doc.title,
    };
  };

  const applyBatch = (ops, by) =>
    serialize(async () => {
      await ensureReady();
      if (!Array.isArray(ops) || ops.length === 0) throw new Error('ops must be a non-empty array');
      return applyOpsNow(ops, by);
    });

  const readState = (since, docId) =>
    serialize(async () => {
      await ensureReady();
      const requestedDoc = typeof docId === 'string' ? docId : '';
      const switched = requestedDoc !== '' && requestedDoc !== runtime.library.currentId;
      const payload = syncPayload(runtime.doc, runtime.entries, switched ? undefined : since);
      return {
        ...payload,
        docId: runtime.library.currentId,
        library: librarySummary(runtime.library),
        snapshots: listSnapshots(runtime.library),
        hostBuild: HOST_BUILD,
      };
    });

  const updateViewport = (viewport) =>
    serialize(async () => {
      await ensureReady();
      const number = (value, fallback, min, max) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return fallback;
        return Math.min(max, Math.max(min, parsed));
      };
      const current = runtime.doc.viewport ?? {};
      runtime.doc = {
        ...runtime.doc,
        viewport: {
          cx: Math.round(number(viewport?.cx, current.cx ?? 0, -1_000_000, 1_000_000)),
          cy: Math.round(number(viewport?.cy, current.cy ?? 0, -1_000_000, 1_000_000)),
          zoom: Math.round(number(viewport?.zoom, current.zoom ?? 1, 0.1, 4) * 1000) / 1000,
          vw: Math.round(number(viewport?.vw, current.vw ?? 1200, 100, 20000)),
          vh: Math.round(number(viewport?.vh, current.vh ?? 800, 100, 20000)),
        },
      };
      scheduleSave();
      return { ok: true };
    });

  /* ------------------------------------------------------------------ *
   * Canvas library — multiple canvases, switching and history snapshots.
   * Every handler runs inside the serial chain and returns a fresh full
   * state payload so the browser can swap documents atomically.
   * ------------------------------------------------------------------ */
  const libraryActions = {
    library: () =>
      serialize(async () => {
        await ensureReady();
        return {
          ok: true,
          value: { ...librarySummary(runtime.library), snapshots: listSnapshots(runtime.library) },
        };
      }),
    'canvas-create': (payload) =>
      serialize(async () => {
        await ensureReady();
        syncActiveScene();
        const doc = addCanvas(runtime.library, String(payload?.title ?? '').slice(0, 120));
        if (!doc) return { ok: false, error: { code: 'canvas/library-full', message: '画布数量已达上限' } };
        runtime.doc = doc;
        runtime.entries = [];
        scheduleSave();
        return { ok: true, value: fullState() };
      }),
    'canvas-switch': (payload) =>
      serialize(async () => {
        await ensureReady();
        syncActiveScene();
        const doc = switchCanvas(runtime.library, String(payload?.id ?? ''));
        if (!doc) return { ok: false, error: { code: 'canvas/not-found', message: '找不到该画布' } };
        runtime.doc = doc;
        runtime.entries = [];
        scheduleSave();
        return { ok: true, value: fullState() };
      }),
    'canvas-rename': (payload) =>
      serialize(async () => {
        await ensureReady();
        syncActiveScene();
        const id = String(payload?.id ?? '');
        const ok = renameCanvas(runtime.library, id, String(payload?.title ?? ''));
        if (!ok) return { ok: false, error: { code: 'canvas/rename', message: '重命名失败：名称不能为空' } };
        if (runtime.library.currentId === id) runtime.doc = currentScene(runtime.library)?.doc ?? runtime.doc;
        runtime.entries = [];
        scheduleSave();
        return { ok: true, value: { library: librarySummary(runtime.library) } };
      }),
    'canvas-delete': (payload) =>
      serialize(async () => {
        await ensureReady();
        syncActiveScene();
        const ok = deleteCanvas(runtime.library, String(payload?.id ?? ''));
        if (!ok) return { ok: false, error: { code: 'canvas/not-found', message: '找不到该画布' } };
        runtime.doc = currentScene(runtime.library)?.doc ?? createDoc();
        runtime.entries = [];
        scheduleSave();
        return { ok: true, value: fullState() };
      }),
    'history-list': () =>
      serialize(async () => {
        await ensureReady();
        return {
          ok: true,
          value: { snapshots: listSnapshots(runtime.library), library: librarySummary(runtime.library) },
        };
      }),
    'history-save': (payload) =>
      serialize(async () => {
        await ensureReady();
        syncActiveScene();
        const entry = pushSnapshot(runtime.library, String(payload?.label ?? '').slice(0, 60));
        scheduleSave();
        return {
          ok: true,
          value: {
            saved: entry ? { id: entry.id, at: entry.at, label: entry.label, nodes: entry.nodes } : null,
            snapshots: listSnapshots(runtime.library),
          },
        };
      }),
    'history-restore': (payload) =>
      serialize(async () => {
        await ensureReady();
        syncActiveScene();
        const ok = restoreSnapshot(runtime.library, String(payload?.entryId ?? payload?.id ?? ''));
        if (!ok) return { ok: false, error: { code: 'canvas/history', message: '找不到该历史快照' } };
        runtime.doc = currentScene(runtime.library)?.doc ?? runtime.doc;
        runtime.entries = [];
        scheduleSave();
        return { ok: true, value: fullState() };
      }),
    'history-delete': (payload) =>
      serialize(async () => {
        await ensureReady();
        const ok = deleteSnapshot(runtime.library, String(payload?.entryId ?? payload?.id ?? ''));
        if (!ok) return { ok: false, error: { code: 'canvas/history', message: '找不到该历史快照' } };
        scheduleSave();
        return { ok: true, value: { snapshots: listSnapshots(runtime.library) } };
      }),
  };

  /* ------------------------------------------------------------------ *
   * AI generation — call the model directly through `ctx.llm`, parse a JSON
   * plan and apply it to this canvas. No conversation session is involved;
   * the session route remains only as a fallback when no LLM route exists.
   * ------------------------------------------------------------------ */
  const PLAN_SYSTEM_PROMPT = [
    '你是「通用画布」的生成器。你只输出一个 JSON 对象，不要 markdown 代码块，不要解释。',
    'JSON 结构：{"title":"可选的新画板标题","delete":["现有节点id"],"updates":[{"id":"现有节点id","text":"新文本","x":0,"y":0,"w":240,"h":168,"color":"yellow","shape":"rect"}],"nodes":[{"ref":"短引用","type":"note|text|shape|frame|image","text":"内容","x":0,"y":0,"w":240,"h":168,"color":"yellow","shape":"rect","src":"https://..."}],"edges":[{"from":"ref或现有id","to":"ref或现有id","label":"可选"}],"focus":["ref或现有id"]}',
    '规则：type 默认 note；color 取 yellow|blue|green|pink|purple|orange|gray|white；每张便签文字 ≤ 40 字；没有把握的字段可省略；一次最多 12 个节点、20 条边；不要编造不存在的 id。',
    '禁止套用与用户请求无关的通用模板（例如和请求无关的「目标→方案→结果」三步流程）。',
    '如果请求是对选中节点的提问、解题、解释或续写，答案必须写回该节点的 text（保留原文，换行后以「答：」开头），不要新建节点。',
  ].join('\n');

  const withPersona = (base, persona) => {
    const role = String(persona ?? '').trim().slice(0, 12000);
    if (role === '') return base;
    return `${base}\n\n【角色设定（最高优先级，必须严格遵守；与默认风格冲突时以此为准）】\n${role}`;
  };

  const DOC_SYSTEM_PROMPT = [
    '你是画板文档生成器。输出一份中文 Markdown 文档，可直接阅读与打印。',
    '只输出文档正文：不要输出 JSON、不要解释你的过程、不要用代码块包裹整篇内容。',
    '结构清晰：标题、分节、必要的表格（Markdown 表格）与要点列表。',
  ].join('\n');

  const docChunkHeight = (chunk) => {
    const lines = String(chunk)
      .split('\n')
      .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 46)), 0);
    return Math.min(3600, Math.max(160, lines * 24 + 40));
  };

  const splitForCanvas = (text, chunkSize = 3000) => {
    const chunks = [];
    let rest = String(text ?? '').trim();
    while (rest.length > 0 && chunks.length < 12) {
      if (rest.length <= chunkSize) {
        chunks.push(rest);
        break;
      }
      let cut = rest.lastIndexOf('\n', chunkSize);
      if (cut < chunkSize * 0.5) cut = chunkSize;
      chunks.push(rest.slice(0, cut));
      rest = rest.slice(cut).replace(/^\n+/, '');
    }
    return chunks;
  };

  const ANSWER_HINTS = ['回答', '答案', '解释', '为什么', '怎么做', '怎么算', '求解', '帮我答', '这题', '什么意思', '啥意思', '翻译', '改写', '续写', '补充'];

  const buildPlanUserPrompt = (prompt, scope, selectedItems, anchor = undefined, contextIds = []) => {
    const summary = summarizeDoc(runtime.doc, { limit: 40 });
    const visible = summary.viewport.visibleWorld;
    const contextList = Array.isArray(contextIds) ? contextIds.map(String).filter(Boolean).slice(0, 60) : [];
    const contextItems = contextList.map((id) => runtime.doc.items[id]).filter(Boolean);
    const existing = summary.items
      .filter((item) => item.type !== 'edge')
      .map((item) => `- ${item.id} (${item.type})${item.text ? `: ${item.text}` : ''} @(${item.x},${item.y},${item.w}x${item.h})`);
    const lines = [
      `用户请求：${prompt}`,
      `画布现状：revision ${summary.rev}，共 ${summary.total} 个节点。可见世界范围：x ${visible.x} ~ ${visible.x + visible.w}，y ${visible.y} ~ ${visible.y + visible.h}。`,
    ];
    if (contextItems.length > 0) {
      // Project isolation: a child Agent only sees its own project context, so
      // parallel projects never leak into each other's output.
      lines.push(
        '上下文范围：你只负责下面这些节点（同一个项目）；不要参考或修改其他项目的内容。',
        ...contextItems.map(
          (item) =>
            `- ${item.id} (${item.type})${item.text ? `: ${shortText(item.text, 800)}` : ''} @(${item.x},${item.y},${item.w}x${item.h})`,
        ),
      );
    } else if (existing.length > 0) {
      lines.push('现有节点（可引用其 id）：', ...existing.slice(0, 40));
    }
    if (scope === 'selection') {
      const blocks = selectedItems.map(
        (item) =>
          `- ${item.id} (${item.type}) 位置 (${item.x}, ${item.y}) 尺寸 ${item.w}x${item.h}${item.text ? `，完整文本：${shortText(item.text, 1200)}` : '（当前为空）'}`,
      );
      const selectedText = selectedItems.map((item) => String(item.text ?? '')).join('\n');
      const asksAnswer =
        /[?？]/.test(selectedText) || ANSWER_HINTS.some((hint) => String(prompt ?? '').includes(hint));
      lines.push(
        '生成范围：只处理选中的节点，画布其余部分必须保持不变；不要修改画布的 title。',
        '选中节点：',
        ...blocks,
        ...(asksAnswer
          ? [
              '这是「回答/解释」型请求：',
              '1) 只输出 updates，把答案追加到选中节点的 text：保留原有文字，另起一行以「答：」开头；',
              '2) 不要新建 nodes/edges，也不要套用与这个问题无关的通用流程模板；',
              '3) 答案要直接针对选中节点里的问题/内容，简洁准确。',
            ]
          : [
              '要求：优先用 updates 改写选中节点的文本/属性；只有用户明确要求拆分、展开成多张或补关联时，才在选中节点右侧/下方 60px 之外新增 nodes + edges，并避免与现有内容重叠。',
            ]),
      );
    } else {
      lines.push(
        '生成范围：整个画板。',
        anchor
          ? `新节点请围绕锚点 (${anchor.x}, ${anchor.y}) 排布：从锚点向右、向下铺开（半径 700 内），避免与现有节点重叠；可分组为 frame、用 edges 表示流程。`
          : `新节点请放在可见范围内（x ${Math.round(visible.x + 60)} ~ ${Math.round(visible.x + visible.w - 320)}，y ${Math.round(visible.y + 60)} ~ ${Math.round(visible.y + visible.h - 220)}），避免与现有节点重叠；可分组为 frame、用 edges 表示流程。`,
      );
    }
    return lines.join('\n');
  };

  const parsePlanText = (raw) => {
    const parsed = extractJsonObject(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined;
  };

  const applyPlan = (plan, scope, selectedItems) => {
    const items = runtime.doc.items;
    const visible = summarizeDoc(runtime.doc, { limit: 1 }).viewport.visibleWorld;
    const ops = [];
    const refMap = new Map();
    const createdIds = [];
    const createdNodeIds = [];
    const warnings = [];
    let updated = 0;
    let deleted = 0;

    for (const rawId of Array.isArray(plan?.delete) ? plan.delete.slice(0, 40) : []) {
      const id = String(rawId ?? '');
      if (!items[id]) continue;
      ops.push({ op: 'delete', id });
      deleted += 1;
    }

    for (const update of Array.isArray(plan?.updates) ? plan.updates.slice(0, 60) : []) {
      const id = String(update?.id ?? '');
      if (!items[id]) {
        warnings.push(`忽略未知节点 ${id}`);
        continue;
      }
      if (scope === 'selection' && selectedItems.length > 0 && !selectedItems.some((item) => item.id === id)) {
        warnings.push(`忽略选中范围外的节点 ${id}`);
        continue;
      }
      const patch = {};
      for (const key of ['text', 'x', 'y', 'w', 'h', 'z', 'color', 'shape', 'src']) {
        if (update[key] !== undefined) patch[key] = update[key];
      }
      if (Object.keys(patch).length === 0) continue;
      ops.push({ op: 'patch', id, patch });
      updated += 1;
    }

    const SIZES = { note: [240, 168], text: [360, 90], shape: [200, 140], frame: [640, 420], image: [320, 240] };
    const nodeList = Array.isArray(plan?.nodes) ? plan.nodes.slice(0, 12) : [];
    const baseX = Math.round(visible.x + 80);
    const baseY = Math.round(visible.y + 80);
    nodeList.forEach((node, index) => {
      const rawType = String(node?.type ?? 'note');
      const type = SIZES[rawType] ? rawType : 'note';
      const size = SIZES[type];
      const columns = 3;
      const column = index % columns;
      const row = Math.floor(index / columns);
      const item = {
        id: newId(type === 'frame' ? 'f' : 'n'),
        type,
        x: Number.isFinite(Number(node?.x)) ? Number(node.x) : baseX + column * 300,
        y: Number.isFinite(Number(node?.y)) ? Number(node.y) : baseY + row * 220,
        w: Number.isFinite(Number(node?.w)) ? Number(node.w) : size[0],
        h: Number.isFinite(Number(node?.h)) ? Number(node.h) : size[1],
        text: node?.text ?? '',
        color: node?.color,
        shape: node?.shape,
        src: node?.src,
        by: 'ai',
      };
      refMap.set(String(node?.ref ?? `n${index}`), item.id);
      ops.push({ op: 'upsert', item });
      createdIds.push(item.id);
      createdNodeIds.push(item.id);
    });

    const known = (id) => Boolean(items[id]) || createdIds.includes(id);
    const resolve = (value) => refMap.get(String(value ?? '')) ?? String(value ?? '');
    for (const edge of Array.isArray(plan?.edges) ? plan.edges.slice(0, 20) : []) {
      const from = resolve(edge?.from);
      const to = resolve(edge?.to);
      if (!from || !to) {
        warnings.push('连线缺少端点');
        continue;
      }
      if (!known(from) || !known(to)) {
        warnings.push(`连线 ${from}->${to} 端点不存在，已跳过`);
        continue;
      }
      const item = { id: newId('e'), type: 'edge', from, to, label: cleanPlanLabel(edge?.label), by: 'ai' };
      ops.push({ op: 'upsert', item });
      createdIds.push(item.id);
    }

    if (scope !== 'selection' && typeof plan?.title === 'string' && plan.title.trim() !== '') {
      ops.push({ op: 'title', title: plan.title.trim().slice(0, 120) });
    }

    const focusIds = (Array.isArray(plan?.focus) ? plan.focus : []).map(resolve).filter((id) => known(id));
    return { ops, warnings, stats: { created: createdIds.length, updated, deleted }, focusIds, createdNodeIds };
  };

  const cleanPlanLabel = (value) => String(value ?? '').replace(/[\r\n\t]/g, ' ').slice(0, 120);

  /** Read the deployment default model selection (provider/model/reasoning). */
  const readDefaultModelSelection = () => {
    const models = (() => {
      try {
        return ctx.get('agentDefaultModel');
      } catch (error) {
        return undefined;
      }
    })();
    const current = models && typeof models.currentSelection === 'function' ? models.currentSelection() ?? {} : {};
    return {
      provider: String(current.provider ?? ''),
      model: String(current.model ?? current.id ?? ''),
      reasoningEffort: current.reasoningEffort ?? current.reasoning,
    };
  };

  /* ------------------------------------------------------------------ *
   * custom AI providers (OpenAI-compatible endpoints; keys stay on this machine)
   * ------------------------------------------------------------------ */
  const aiProvidersFile = () => join(canvasDiagnosticsDir(), 'ai-providers.json');
  let aiProvidersCache = null;

  const loadAiProviders = async () => {
    if (Array.isArray(aiProvidersCache)) return aiProvidersCache;
    try {
      const parsed = JSON.parse(await readFile(aiProvidersFile(), 'utf8'));
      const list = Array.isArray(parsed?.providers) ? parsed.providers : [];
      aiProvidersCache = list
        .slice(0, AI_MAX_PROVIDERS)
        .map((entry) => normalizeProviderConfig(entry).provider)
        .filter(Boolean);
    } catch (error) {
      aiProvidersCache = [];
    }
    return aiProvidersCache;
  };

  const saveAiProviders = async (list) => {
    const file = aiProvidersFile();
    await mkdir(dirname(file), { recursive: true });
    const temp = `${file}.tmp`;
    await writeFile(temp, JSON.stringify({ schema: AI_PROVIDER_SCHEMA, providers: list }, null, 2), 'utf8');
    await rename(temp, file);
    aiProvidersCache = list;
    return list;
  };

  const findAiProvider = async (providerId) => {
    const id = String(providerId ?? '');
    if (id === '') return null;
    return (await loadAiProviders()).find((provider) => provider.id === id) ?? null;
  };

  /** Validate a client-supplied model selection; invalid input falls back to default. */
  const sanitizeModelOverride = (value) => {
    if (!value || typeof value !== 'object') return undefined;
    if (value.source === 'custom') {
      const providerId = String(value.providerId ?? '').trim().slice(0, 80);
      const model = String(value.model ?? '').trim().slice(0, 200);
      if (providerId === '' || model === '') return undefined;
      return { source: 'custom', providerId, model };
    }
    const provider = String(value.provider ?? '').trim().slice(0, 120);
    const model = String(value.model ?? '').trim().slice(0, 200);
    if (provider === '' || model === '') return undefined;
    const effort = value.reasoningEffort ?? value.reasoning;
    return {
      source: 'dsh',
      provider,
      model,
      reasoningEffort: effort === undefined || effort === null ? undefined : String(effort).slice(0, 80),
    };
  };

  /** Effective DSH model for one generation: the panel choice, else the deployment default. */
  const chooseModel = (modelOverride) => {
    const fallback = readDefaultModelSelection();
    const choice = modelOverride && modelOverride.source !== 'custom' ? modelOverride : fallback;
    return {
      provider: String(choice.provider ?? fallback.provider ?? ''),
      model: String(choice.model ?? fallback.model ?? ''),
      reasoningEffort: choice.reasoningEffort ?? fallback.reasoningEffort,
    };
  };

  /** Effective route: a custom provider selection wins, otherwise the DSH default route. */
  const chooseModelForGenerate = (modelOverride) => {
    if (modelOverride && modelOverride.source === 'custom') return modelOverride;
    return { source: 'dsh', ...chooseModel(modelOverride) };
  };

  /** Whether the DSH LLM route can be used in this deployment. */
  const llmRouteAvailable = () => {
    const llm = (() => {
      try {
        return ctx.get('llm');
      } catch (error) {
        return undefined;
      }
    })();
    const models = (() => {
      try {
        return ctx.get('agentDefaultModel');
      } catch (error) {
        return undefined;
      }
    })();
    return Boolean(llm && typeof llm.stream === 'function' && models && typeof models.currentSelection === 'function');
  };

  /**
   * One-shot chat call used by every generation route: custom providers are called
   * directly over HTTP, DSH models keep using the Harness LLM service. Returns
   * undefined only when a DSH route is unavailable (the caller may fall back).
   */
  const callCanvasModel = async (selection, options) => {
    const source = selection?.source === 'custom' ? 'custom' : 'dsh';
    if (source === 'custom') {
      const provider = await findAiProvider(selection.providerId);
      if (!provider) {
        return { text: '', failure: '找不到该 AI 接口配置（可能已被删除），请重新选择模型', provider: 'custom', model: String(selection.model ?? '') };
      }
      try {
        const result = await callOpenAiCompatible(provider, {
          model: String(selection.model || provider.defaultModel || ''),
          messages: [
            { role: 'system', content: String(options.system ?? '') },
            { role: 'user', content: String(options.user ?? '') },
          ],
          maxTokens: options.maxTokens,
          temperature: options.temperature,
          timeoutMs: options.timeoutMs,
          responseFormat: options.responseFormat,
        });
        return { text: result.text, failure: undefined, provider: `custom/${provider.name}`, model: result.model };
      } catch (error) {
        return { text: '', failure: String(error?.message ?? error), provider: `custom/${provider.name}`, model: String(selection.model ?? '') };
      }
    }
    const llm = (() => {
      try {
        return ctx.get('llm');
      } catch (error) {
        return undefined;
      }
    })();
    const provider = String(selection.provider ?? '');
    const model = String(selection.model ?? '');
    if (!llm || typeof llm.stream !== 'function' || provider === '' || model === '') return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(options.timeoutMs) || 90000);
    let text = '';
    let failure;
    try {
      const request = {
        provider,
        model,
        system: String(options.system ?? ''),
        messages: [{ role: 'user', content: [{ type: 'text', text: String(options.user ?? '') }] }],
        temperature: options.temperature ?? 0.4,
        maxTokens: options.maxTokens ?? 4000,
        signal: controller.signal,
      };
      if (selection.reasoningEffort !== undefined && selection.reasoningEffort !== null && selection.reasoningEffort !== '') {
        request.reasoningEffort = selection.reasoningEffort;
      }
      for await (const chunk of llm.stream(request)) {
        if (chunk?.type === 'text-delta') text += chunk.text ?? '';
        else if (chunk?.type === 'finish') {
          const kind = chunk.reason?.kind;
          if (kind === 'error' || kind === 'aborted') failure = chunk.reason?.failure?.message ?? kind;
        }
      }
    } catch (error) {
      failure = String(error?.message ?? error);
    } finally {
      clearTimeout(timer);
    }
    return { text, failure, provider, model };
  };

  /** The model pickers data: routable providers, their models and the current default. */
  const readModelCatalog = async () => {
    const current = readDefaultModelSelection();
    const controller = (() => {
      try {
        return ctx.get('sessionController');
      } catch (error) {
        return undefined;
      }
    })();
    if (controller && typeof controller.modelCatalog === 'function') {
      try {
        const catalog = await controller.modelCatalog();
        if (catalog && Array.isArray(catalog.groups)) {
          return {
            ok: true,
            value: {
              current,
              default: catalog.default ?? current,
              providers: catalog.groups.map((group) => ({
                id: String(group?.id ?? ''),
                name: String(group?.name ?? group?.id ?? ''),
                models: (Array.isArray(group?.models) ? group.models : []).map((entry) => ({
                  id: String(entry?.id ?? ''),
                  name: String(entry?.name ?? entry?.id ?? ''),
                  description: entry?.description ? String(entry.description).slice(0, 240) : undefined,
                })),
              })),
              customProviders: (await loadAiProviders()).map(publicProvider),
              failures: Array.isArray(catalog.failures) ? catalog.failures.slice(0, 8) : [],
            },
          };
        }
      } catch (error) {
        log(`model catalog unavailable: ${String(error?.message ?? error)}`);
      }
    }
    return {
      ok: true,
      value: {
        current,
        default: current,
        providers:
          current.provider === ''
            ? []
            : [{ id: current.provider, name: current.provider, models: [{ id: current.model, name: current.model }] }],
        customProviders: (await loadAiProviders()).map(publicProvider),
        failures: [],
      },
    };
  };

  /** Direct model call; returns undefined when this deployment has no usable route. */
  const runDirectGeneration = async (prompt, scope, selectedItems, anchor = undefined, persona = '', contextIds = [], modelOverride = undefined) => {
    const selection = chooseModelForGenerate(modelOverride);
    if (selection.source !== 'custom' && !llmRouteAvailable()) return undefined;
    const result = await callCanvasModel(selection, {
      system: withPersona(PLAN_SYSTEM_PROMPT, persona),
      user: buildPlanUserPrompt(prompt, scope, selectedItems, anchor, contextIds),
      temperature: 0.4,
      maxTokens: 4000,
      timeoutMs: 90000,
      responseFormat: 'json',
    });
    if (!result) return undefined;
    return { text: result.text, failure: result.failure, provider: result.provider, model: result.model };
  };

  /** Long-form document generation (role persona + task → Markdown on the canvas). */
  const runDocumentGeneration = async (prompt, persona, anchor, modelOverride = undefined) => {
    const selection = chooseModelForGenerate(modelOverride);
    if (selection.source !== 'custom' && !llmRouteAvailable()) return undefined;
    const summary = summarizeDoc(runtime.doc, { limit: 20 });
    const userPrompt = [
      ...(String(persona ?? '').trim() !== '' ? [`【角色设定】\n${String(persona).trim().slice(0, 12000)}`] : []),
      `【任务】\n${prompt}`,
      `【画布上下文】当前画板已有 ${summary.total} 个节点，视口中心 (${Math.round(runtime.doc.viewport.cx)}, ${Math.round(runtime.doc.viewport.cy)})。`,
      '【输出要求】直接输出完整可用的中文 Markdown 文档正文，不要寒暄、不要解释过程。',
    ].join('\n\n');
    const result = await callCanvasModel(selection, {
      system: DOC_SYSTEM_PROMPT,
      user: userPrompt,
      temperature: 0.5,
      maxTokens: 6000,
      timeoutMs: 150000,
    });
    if (!result) return undefined;
    return { text: String(result.text ?? '').trim(), failure: result.failure, provider: result.provider, model: result.model };
  };

  /** Lay a generated document out as a frame plus readable text cards. */
  const placeDocument = async (text, prompt, anchorId, anchor) => {
    const chunks = splitForCanvas(text);
    if (chunks.length === 0) return { ok: false, error: { code: 'canvas/empty-doc', message: '模型没有返回文档内容' } };
    const anchorItem = anchorId !== '' ? runtime.doc.items[anchorId] : undefined;
    const baseX = anchorItem
      ? Math.round(anchorItem.x + anchorItem.w + 140)
      : Math.round(anchor?.x ?? runtime.doc.viewport.cx);
    const baseY = anchorItem ? Math.round(anchorItem.y) : Math.round(anchor?.y ?? runtime.doc.viewport.cy);
    const frameId = newId('f');
    const heights = chunks.map((chunk) => docChunkHeight(chunk));
    const totalHeight = heights.reduce((sum, value) => sum + value + 24, 0) + 110;
    const ops = [
      {
        op: 'upsert',
        item: {
          id: frameId,
          type: 'frame',
          text: shortText(prompt, 40) || '生成文档',
          x: baseX,
          y: baseY,
          w: 940,
          h: Math.min(4200, totalHeight),
          color: 'gray',
          by: 'ai',
        },
      },
    ];
    let cursorY = baseY + 90;
    chunks.forEach((chunk, index) => {
      ops.push({
        op: 'upsert',
        item: {
          id: newId('n'),
          type: 'text',
          text: chunk,
          x: baseX + 50,
          y: cursorY,
          w: 840,
          h: heights[index],
          color: 'white',
          by: 'ai',
        },
      });
      cursorY += heights[index] + 24;
    });
    if (anchorItem) {
      ops.push({ op: 'upsert', item: { id: newId('e'), type: 'edge', from: anchorId, to: frameId, label: '', by: 'ai' } });
    }
    const applied = await applyBatch(ops, 'ai');
    const target = focusViewport(runtime.doc, { ids: [frameId] });
    if (target) await applyBatch([{ op: 'focus', cx: target.cx, cy: target.cy, zoom: target.zoom }], 'ai');
    return {
      ok: true,
      value: {
        mode: 'document',
        revision: applied.revision,
        created: ops.length,
        characters: text.length,
        frameId,
        total: Object.keys(runtime.doc.items).length,
        warnings: [],
      },
    };
  };

  const generateViaSession = async (payload, prompt, scope, selectedItems) => {
    const agents = (() => {
      try {
        return ctx.get('agents');
      } catch (error) {
        return undefined;
      }
    })();
    if (!agents) return { ok: false, error: { code: 'canvas/no-agents', message: '当前环境没有可用的智能体服务' } };
    const target = findTargetAgent(agents, payload?.sessionId);
    if (!target) {
      await appendDiagnostic('ai-generate.log', 'session-route: no live agent');
      return { ok: false, error: { code: 'canvas/no-agent', message: '没有打开的对话会话，请先在左侧新建或打开一个会话' } };
    }
    const messageText = buildSessionRequestText(prompt, scope, selectedItems);
    try {
      await target.followup({ content: [{ type: 'text', text: messageText }], source: { kind: 'user' } });
    } catch (error) {
      await appendDiagnostic('ai-generate.log', `session-route failed: ${String(error?.message ?? error)}`);
      return { ok: false, error: { code: 'canvas/generate', message: String(error?.message ?? error) } };
    }
    await appendDiagnostic('ai-generate.log', `session-route delivered session=${target.session?.id ?? ''}`);
    return {
      ok: true,
      value: { mode: 'session', sessionId: target.session?.id ?? null, sessionTitle: target.session?.header?.title ?? '', scope },
    };
  };

  const buildSessionRequestText = (prompt, scope, selectedItems) => {
    const summary = summarizeDoc(runtime.doc, { limit: 12 });
    const visible = summary.viewport.visibleWorld;
    return [
      '【画板 AI 生成】用户在通用画布面板里请求你直接在画板上生成内容，而不是给出文字方案。',
      `用户请求：${prompt}`,
      `画布现状：revision ${summary.rev}，${summary.total} 个节点；可见世界范围：x ${visible.x} ~ ${visible.x + visible.w}，y ${visible.y} ~ ${visible.y + visible.h}。`,
      ...(selectedItems.length > 0 ? ['选中节点：', ...selectedItems.map((item) => `- ${item.id} (${item.type})${item.text ? `: ${shortText(item.text, 60)}` : ''}`)] : []),
      scope === 'selection' ? '只修改上述选中节点或紧贴它们新增内容。' : '可在整个画布上生成或整理内容。',
      '请用 canvas_create / canvas_update / canvas_connect 落地，完成后 canvas_focus。',
    ].join('\n');
  };

  const pendingPlans = new Map();
  const PLAN_TTL_MS = 5 * 60 * 1000;
  const prunePendingPlans = () => {
    const now = Date.now();
    for (const [id, entry] of pendingPlans) if (now - entry.at > PLAN_TTL_MS) pendingPlans.delete(id);
  };

  /** Apply a parsed plan, then link the anchor card (agent node) to the created nodes. */
  const applyGeneratedPlan = async (plan, scope, selectedItems, anchorId = '') => {
    const { ops, warnings, stats, focusIds, createdNodeIds } = applyPlan(plan, scope, selectedItems);
    if (ops.length === 0) return undefined;
    const applied = await applyBatch(ops, 'ai');
    if (anchorId !== '' && runtime.doc.items[anchorId] && createdNodeIds.length > 0) {
      const edgeOps = createdNodeIds.slice(0, 8).map((to) => ({
        op: 'upsert',
        item: { id: newId('e'), type: 'edge', from: anchorId, to, label: '', by: 'ai' },
      }));
      await applyBatch(edgeOps, 'ai');
    }
    const focusTargets = focusIds.length > 0 ? focusIds : createdNodeIds;
    if (focusTargets.length > 0) {
      const target = focusViewport(runtime.doc, { ids: focusTargets });
      if (target) await applyBatch([{ op: 'focus', cx: target.cx, cy: target.cy, zoom: target.zoom }], 'ai');
    }
    const total = Object.keys(runtime.doc.items).length;
    await appendDiagnostic(
      'ai-generate.log',
      `direct applied revision=${applied.revision} created=${stats.created} updated=${stats.updated} deleted=${stats.deleted} total=${total} errors=${JSON.stringify(applied.errors ?? [])}`,
    );
    return {
      revision: applied.revision,
      created: stats.created,
      updated: stats.updated,
      deleted: stats.deleted,
      total,
      warnings: warnings.slice(0, 5),
    };
  };

  const applyPendingPlan = async (planId) => {
    prunePendingPlans();
    const key = String(planId ?? '');
    const entry = pendingPlans.get(key);
    if (!entry) return { ok: false, error: { code: 'canvas/plan-expired', message: '生成方案已过期，请重新生成' } };
    pendingPlans.delete(key);
    await ensureReady();
    const result = await applyGeneratedPlan(entry.plan, entry.scope, entry.selectedItems, entry.anchorId);
    if (!result) return { ok: false, error: { code: 'canvas/empty-plan', message: '这个方案没有可落地的改动' } };
    return { ok: true, value: { mode: 'direct', scope: entry.scope, ...result } };
  };

  const generateOnCanvas = async (payload) => {
    const prompt = String(payload?.prompt ?? '').trim().slice(0, 4000);
    if (prompt === '') return { ok: false, error: { code: 'canvas/prompt', message: '请先填写要生成的内容' } };
    await ensureReady();
    const scope = payload?.scope === 'selection' ? 'selection' : 'canvas';
    const mode = payload?.mode === 'ask' ? 'ask' : 'auto';
    const selectionIds = Array.isArray(payload?.selection) ? payload.selection.map(String).slice(0, 50) : [];
    const selectedItems = selectionIds.map((id) => runtime.doc.items[id]).filter(Boolean);
    const anchor =
      payload?.anchor && Number.isFinite(Number(payload.anchor.x)) && Number.isFinite(Number(payload.anchor.y))
        ? { x: Math.round(Number(payload.anchor.x)), y: Math.round(Number(payload.anchor.y)) }
        : undefined;
    const anchorId = typeof payload?.anchorId === 'string' ? payload.anchorId : '';
    const persona = String(payload?.persona ?? '').trim().slice(0, 12000);
    const output = payload?.output === 'document' ? 'document' : 'canvas';
    const contextIds = Array.isArray(payload?.contextIds) ? payload.contextIds.map(String).filter(Boolean).slice(0, 60) : [];
    const modelOverride = sanitizeModelOverride(payload?.model);
    if (scope === 'selection' && selectedItems.length === 0) {
      return { ok: false, error: { code: 'canvas/no-selection', message: '请先在画板上选中要生成的模块' } };
    }

    const startedAt = Date.now();

    // Long-form document mode (role persona → Markdown laid out as cards on the canvas).
    if (output === 'document') {
      const doc = await runDocumentGeneration(prompt, persona, anchor, modelOverride);
      if (doc !== undefined) {
        if (!doc.failure && doc.text !== '') {
          const placed = await placeDocument(doc.text, prompt, anchorId, anchor);
          await appendDiagnostic(
            'ai-generate.log',
            `document route=${doc.provider}/${doc.model} chars=${doc.text.length} created=${placed.ok ? placed.value.created : 0} ms=${Date.now() - startedAt}`,
          );
          return placed;
        }
        await appendDiagnostic('ai-generate.log', `document failure=${JSON.stringify(doc.failure ?? '')} chars=${doc.text.length}`);
        return {
          ok: false,
          error: {
            code: 'canvas/doc',
            message: doc.failure ? `文档生成失败：${doc.failure}` : '模型没有返回文档内容，请换个说法再试',
          },
        };
      }
      await appendDiagnostic('ai-generate.log', 'document generation unavailable, falling back to the plan route');
    }

    const direct = await runDirectGeneration(prompt, scope, selectedItems, anchor, persona, contextIds, modelOverride);
    if (direct !== undefined) {
      const plan = direct.failure ? undefined : parsePlanText(direct.text);
      await appendDiagnostic(
        'ai-generate.log',
        `direct mode=${mode} route=${direct.provider}/${direct.model} scope=${scope} prompt=${JSON.stringify(prompt.slice(0, 120))} ms=${Date.now() - startedAt} chars=${direct.text.length} failure=${JSON.stringify(direct.failure ?? '')} parsed=${plan ? 'yes' : 'no'}`,
      );
      if (plan === undefined) {
        await appendDiagnostic('ai-generate.log', `direct-raw ${JSON.stringify(direct.text.slice(0, 800))}`);
        return {
          ok: false,
          error: {
            code: 'canvas/plan',
            message: direct.failure ? `模型请求失败：${direct.failure}` : '模型没有返回可用的画板计划，请换个说法再试一次',
          },
        };
      }
      const dry = applyPlan(plan, scope, selectedItems);
      if (dry.ops.length === 0) {
        await appendDiagnostic('ai-generate.log', 'direct empty plan');
        return { ok: false, error: { code: 'canvas/empty-plan', message: '模型没有给出可落地的画板改动，请补充更具体的要求' } };
      }
      await appendDiagnostic('ai-generate.log', `direct plan ops=${dry.ops.length} warnings=${JSON.stringify(dry.warnings.slice(0, 5))}`);

      if (mode === 'ask') {
        prunePendingPlans();
        const planId = `plan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
        pendingPlans.set(planId, {
          plan,
          scope,
          selectedItems: selectedItems.map((item) => ({ id: item.id })),
          anchorId,
          at: Date.now(),
        });
        const nodeTexts = (Array.isArray(plan?.nodes) ? plan.nodes : [])
          .slice(0, 8)
          .map((node) => String(node?.text ?? '').trim())
          .filter((text) => text !== '');
        const updateTexts = (Array.isArray(plan?.updates) ? plan.updates : [])
          .slice(0, 5)
          .map((update) => String(update?.text ?? '').trim())
          .filter((text) => text !== '');
        await appendDiagnostic('ai-generate.log', `ask preview plan=${planId} stats=${JSON.stringify(dry.stats)}`);
        return {
          ok: true,
          value: {
            mode: 'plan',
            planId,
            scope,
            created: dry.stats.created,
            updated: dry.stats.updated,
            deleted: dry.stats.deleted,
            nodeTexts,
            updateTexts,
            warnings: dry.warnings.slice(0, 5),
          },
        };
      }

      const result = await applyGeneratedPlan(plan, scope, selectedItems, anchorId);
      if (!result) return { ok: false, error: { code: 'canvas/empty-plan', message: '模型没有给出可落地的画板改动' } };
      return { ok: true, value: { mode: 'direct', scope, sessionId: null, ...result } };
    }

    await appendDiagnostic('ai-generate.log', 'direct unavailable, falling back to the session route');
    return generateViaSession(payload, prompt, scope, selectedItems);
  };

  /* ---- project delegation (A+B): a coordinator card spawns child Agents ---- */
  const MAX_CHILD_AGENTS = 6;
  const MAX_AGENT_CARDS = 50;

  const splitProjectNames = (source) =>
    String(source ?? '')
      .split(/[\n\r、,，;；|]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, MAX_CHILD_AGENTS);

  const parseProjectPlan = (raw) => {
    const parsed = extractJsonObject(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    if (!Array.isArray(parsed?.projects)) return undefined;
    return parsed.projects
      .map((project) => ({
        name: cleanPlanLabel(project?.name ?? project?.title ?? ''),
        task: String(project?.task ?? project?.goal ?? '')
          .trim()
          .slice(0, 3000),
      }))
      .filter((project) => project.name !== '')
      .slice(0, MAX_CHILD_AGENTS);
  };

  /** Ask the chosen model (DSH or a custom endpoint) to split the coordinator task. */
  const splitProjectsWithModel = async (parent, prompt, modelOverride = undefined) => {
    const selection = chooseModelForGenerate(modelOverride);
    if (selection.source !== 'custom' && !llmRouteAvailable()) return undefined;
    const system = [
      '你是画板上的协调者 Agent。',
      '把用户的工作拆成若干独立的子项目，每个子项目交给一个子 Agent 负责。',
      '只输出 JSON：{"projects":[{"name":"项目名（不超过 20 字）","task":"这个子 Agent 的具体任务（可执行、具体）"}]}。',
      `最多 ${MAX_CHILD_AGENTS} 个项目；不要输出 JSON 以外的任何文字。`,
    ].join('\n');
    const user = [
      `协调者的任务：${String(parent?.task || parent?.text || '')
        .trim()
        .slice(0, 3000) || '（未填写）'}`,
      parent?.role ? `协调者的角色设定：${String(parent.role).slice(0, 1200)}` : '',
      `用户的补充要求：${String(prompt ?? '')
        .trim()
        .slice(0, 2000) || '（无）'}`,
      '请拆分项目。',
    ]
      .filter(Boolean)
      .join('\n');
    const result = await callCanvasModel(selection, {
      system,
      user,
      temperature: 0.3,
      maxTokens: 1600,
      timeoutMs: 45000,
      responseFormat: 'json',
    });
    if (!result) return undefined;
    await appendDiagnostic(
      'ai-generate.log',
      `delegate-split route=${result.provider}/${result.model} chars=${result.text.length} failure=${JSON.stringify(result.failure ?? '')}`,
    );
    if (result.failure) return undefined;
    return parseProjectPlan(result.text);
  };

  /**
   * Split a coordinator card's work into child Agents (one project each): a
   * labelled frame per project, the child Agent inside it, and an edge from the
   * coordinator. Children cannot delegate further (max two levels).
   */
  const delegateToChildren = async (payload) => {
    await ensureReady();
    const parentId = String(payload?.parentId ?? '');
    const parent = runtime.doc.items[parentId];
    if (!parent || parent.type !== 'agent') {
      return { ok: false, error: { code: 'canvas/parent', message: '找不到要派活的父 Agent 卡片' } };
    }
    if (parent.parentId) {
      return { ok: false, error: { code: 'canvas/depth', message: '子 Agent 不能再派活，最多两层' } };
    }
    const agents = Object.values(runtime.doc.items).filter((item) => item.type === 'agent');
    const existingChildren = agents.filter((item) => item.parentId === parentId).length;
    const room = Math.max(0, Math.min(MAX_CHILD_AGENTS - existingChildren, MAX_AGENT_CARDS - agents.length));
    if (room <= 0) {
      return {
        ok: false,
        error: { code: 'canvas/agent-cap', message: `这张卡已有 ${existingChildren} 个子 Agent（上限 ${MAX_CHILD_AGENTS}），无法再派活` },
      };
    }
    const prompt = String(payload?.prompt ?? '')
      .trim()
      .slice(0, 2000);
    let projects = Array.isArray(payload?.projects)
      ? payload.projects
          .map((project) => ({
            name: cleanPlanLabel(typeof project === 'string' ? project : project?.name ?? ''),
            task: String(typeof project === 'string' ? '' : project?.task ?? '')
              .trim()
              .slice(0, 3000),
          }))
          .filter((project) => project.name !== '')
      : [];
    if (projects.length === 0) projects = (await splitProjectsWithModel(parent, prompt, sanitizeModelOverride(payload?.model))) ?? [];
    if (projects.length === 0) {
      const names = splitProjectNames(prompt || parent.task || parent.text);
      projects =
        names.length >= 2
          ? names.map((name) => ({ name, task: name }))
          : Array.from({ length: 3 }, (unused, index) => ({
              name: `项目${index + 1}`,
              task: String(prompt || parent.task || parent.text || '')
                .trim()
                .slice(0, 3000),
            }));
    }
    projects = projects.slice(0, room);

    const frameW = 460;
    const frameH = 470;
    const childW = 420;
    const childH = 340;
    const gap = 60;
    const startX = Math.round(parent.x);
    const startY = Math.round(parent.y + parent.h + 180);
    const maxZ = Math.max(0, ...Object.values(runtime.doc.items).map((item) => Number(item.z) || 0));
    const ops = [];
    const children = [];
    projects.forEach((project, index) => {
      const frameId = newId('f');
      const childId = newId('n');
      const x = startX + index * (frameW + gap);
      ops.push({
        op: 'upsert',
        item: {
          id: frameId,
          type: 'frame',
          x,
          y: startY,
          w: frameW,
          h: frameH,
          z: maxZ + index * 4,
          color: parent.color ?? 'blue',
          text: project.name,
          meta: { kind: 'project' },
          by: 'ai',
        },
      });
      ops.push({
        op: 'upsert',
        item: {
          id: childId,
          type: 'agent',
          x: x + 20,
          y: startY + 56,
          w: childW,
          h: childH,
          z: maxZ + index * 4 + 1,
          color: parent.color ?? 'blue',
          text: project.name,
          task: project.task || project.name,
          role: '',
          output: parent.output ?? 'canvas',
          status: 'idle',
          project: project.name,
          parentId,
          frameId,
          by: 'ai',
        },
      });
      ops.push({
        op: 'upsert',
        item: { id: newId('e'), type: 'edge', from: parentId, to: childId, label: project.name, by: 'ai' },
      });
      children.push({ id: childId, project: project.name, frameId });
    });
    const applied = await applyBatch(ops, 'ai');
    const bounds = focusViewport(runtime.doc, { ids: [parentId, ...children.map((child) => child.id)] });
    if (bounds) await applyBatch([{ op: 'focus', cx: bounds.cx, cy: bounds.cy, zoom: bounds.zoom }], 'ai');
    await appendDiagnostic(
      'ai-generate.log',
      `delegate parent=${parentId} children=${children.length} revision=${applied.revision} names=${JSON.stringify(children.map((child) => child.project))}`,
    );
    return {
      ok: true,
      value: {
        revision: runtime.doc.rev,
        parentId,
        children,
        projects: children.map((child) => child.project),
      },
    };
  };

  /**
   * Open a local file or folder with the OS default handler (Explorer / Finder /
   * xdg-open). Used by project workspaces to jump to their linked folder.
   */
  const openLocalPath = async (payload) => {
    const raw = String(payload?.path ?? '').trim().slice(0, 2000);
    if (raw === '') return { ok: false, error: { code: 'canvas/path', message: '请先填写路径' } };
    const resolved = resolvePath(raw);
    let info;
    try {
      info = await stat(resolved);
    } catch (error) {
      return { ok: false, error: { code: 'canvas/path-missing', message: `路径不存在：${resolved}` } };
    }
    try {
      const command = process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
      const child = spawn(command, [resolved], { detached: true, stdio: 'ignore' });
      child.on('error', () => {});
      child.unref();
    } catch (error) {
      return { ok: false, error: { code: 'canvas/path-open', message: String(error?.message ?? error) } };
    }
    await appendDiagnostic('ai-generate.log', `open-path ${resolved} isDirectory=${info.isDirectory()}`);
    return { ok: true, value: { path: resolved, isDirectory: info.isDirectory() } };
  };

  /** Settings dialog data: storage location, canvas/history counts, build info. */
  const readSettings = () =>
    serialize(async () => {
      await ensureReady();
      syncActiveScene();
      const dataPath = runtime.store && String(runtime.store.location ?? '').startsWith('storage-domain:')
        ? canvasStorageFile()
        : runtime.store?.location ?? '';
      return {
        ok: true,
        value: {
          standalone: false,
          canImportDsh: false,
          hostBuild: HOST_BUILD,
          dataLocation: runtime.store?.location ?? 'memory',
          dataPath,
          available: Boolean(dataPath) && existsSync(dataPath),
          canvases: runtime.library.canvases.length,
          snapshots: listSnapshots(runtime.library).length,
          currentId: runtime.library.currentId,
          currentTitle: runtime.doc.title,
        },
      };
    });

  /* ------------------------------------------------------------------ *
   * Local Markdown vault (Obsidian-style): browse a folder, read a file,
   * and import `.canvas` / `.md` / images as native canvas cards.
   * ------------------------------------------------------------------ */
  const vaultActions = {
    'vault-list': async (payload) => ({ ok: true, value: await listVault(payload?.root) }),
    'vault-read': async (payload) => ({ ok: true, value: await readVaultFile(payload?.path) }),
    'tags-all': async () => {
      const counts = new Map();
      const canvases = [];
      const tagPattern = /(?:^|[\s(（:：])#([\p{L}\p{N}_\-/]{1,40})/gu;
      for (const scene of runtime.library.canvases) {
        const perCanvas = new Map();
        for (const item of Object.values(scene.doc.items)) {
          if (!item || item.type === 'edge' || item.type === 'stroke') continue;
          const pool = [String(item.text ?? '')];
          if (Array.isArray(item.meta?.tags)) pool.push(...item.meta.tags.map((tag) => `#${tag}`));
          for (const text of pool) {
            let match;
            tagPattern.lastIndex = 0;
            while ((match = tagPattern.exec(text)) !== null) {
              const tag = match[1];
              perCanvas.set(tag, (perCanvas.get(tag) ?? 0) + 1);
              counts.set(tag, (counts.get(tag) ?? 0) + 1);
            }
          }
        }
        if (perCanvas.size > 0) {
          canvases.push({
            id: scene.id,
            title: scene.doc.title,
            tags: [...perCanvas.entries()].map(([tag, count]) => ({ tag, count })),
          });
        }
      }
      return {
        ok: true,
        value: {
          tags: [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 120).map(([tag, count]) => ({ tag, count })),
          canvases,
        },
      };
    },
    'search-all': async (payload) => {
      const query = String(payload?.query ?? '').trim().toLowerCase();
      if (query === '') return { ok: true, value: { cards: [], files: [] } };
      const cards = [];
      for (const scene of runtime.library.canvases) {
        for (const item of Object.values(scene.doc.items)) {
          if (cards.length >= 60) break;
          if (!item || item.type === 'edge' || item.type === 'stroke') continue;
          const text = String(item.text ?? '');
          const index = text.toLowerCase().indexOf(query);
          if (index >= 0) {
            cards.push({
              canvasId: scene.id,
              canvasTitle: scene.doc.title,
              itemId: item.id,
              type: item.type,
              snippet: text.slice(Math.max(0, index - 22), index + 76).replace(/\s+/g, ' '),
            });
          }
        }
      }
      const files = [];
      const root = String(payload?.vaultRoot ?? '').trim();
      if (root !== '') {
        try {
          const listing = await listVault(root);
          for (const file of listing.files.slice(0, 200)) {
            if (files.length >= 30) break;
            let snippet = '';
            let hit = file.name.toLowerCase().includes(query) || file.rel.toLowerCase().includes(query);
            if (!hit && (file.kind === 'text' || file.kind === 'canvas')) {
              try {
                const read = await readVaultFile(file.path);
                const index = read.content.toLowerCase().indexOf(query);
                if (index >= 0) {
                  hit = true;
                  snippet = read.content.slice(Math.max(0, index - 22), index + 76).replace(/\s+/g, ' ');
                }
              } catch (error) {
                /* unreadable file */
              }
            }
            if (hit) files.push({ path: file.path, name: file.name, dir: file.dir, kind: file.kind, size: file.size, snippet });
          }
        } catch (error) {
          /* vault unavailable: canvas results still return */
        }
      }
      return { ok: true, value: { cards, files } };
    },
    'graph-data': (payload) =>
      serialize(async () => {
        await ensureReady();
        syncActiveScene();
        const scope = payload?.scope === 'vault' ? 'vault' : payload?.scope === 'all' ? 'all' : 'canvas';
        const canvasId = String(payload?.canvasId ?? '').trim() || String(runtime.library?.currentId ?? '');
        const includeTags = payload?.includeTags !== false;
        const includeOrphans = payload?.includeOrphans !== false;
        const scenes = scope === 'canvas'
          ? runtime.library.canvases.filter((scene) => scene.id === canvasId)
          : runtime.library.canvases;
        const cards = [];
        const canvasEdges = [];
        for (const scene of scenes) {
          if (!scene?.doc?.items) continue;
          for (const item of Object.values(scene.doc.items)) {
            if (!item) continue;
            if (item.type === 'edge') {
              canvasEdges.push({ canvasId: scene.id, from: item.from, to: item.to, label: String(item.label ?? '') });
              continue;
            }
            if (item.type === 'stroke' || item.type === 'frame') continue;
            const meta = relationTextMeta(String(item.text ?? ''));
            const extraTags = Array.isArray(item.meta?.tags) ? item.meta.tags.map((tag) => String(tag)) : [];
            const tags = [...new Set([...meta.tags, ...extraTags])].slice(0, 40);
            cards.push({
              itemId: item.id,
              canvasId: scene.id,
              canvasTitle: String(scene.doc.title ?? ''),
              type: item.type,
              title: meta.title,
              tags,
              links: meta.links,
              filePath: String(item.meta?.filePath ?? ''),
              fileName: String(item.meta?.fileName ?? ''),
            });
            if (cards.length >= 1200) break;
          }
          if (cards.length >= 1200) break;
        }
        let files = [];
        let vaultTruncated = false;
        const vaultRoot = String(payload?.vaultRoot ?? '').trim();
        if (scope === 'vault' && vaultRoot !== '') {
          try {
            const scanned = await scanVaultGraph(vaultRoot);
            files = Array.isArray(scanned.files) ? scanned.files : [];
            vaultTruncated = Boolean(scanned.truncated);
          } catch (error) {
            return { ok: false, error: { code: 'canvas/graph-vault', message: String(error?.message ?? error) } };
          }
          // Vault graph = the notes in the vault + the cards imported from it (Obsidian-like).
          const norm = (value) => String(value ?? '').toLowerCase().replace(/\\/g, '/');
          const filePaths = new Set(files.map((file) => norm(file.path)).filter(Boolean));
          const fileRels = files
            .map((file) => ({ rel: norm(file.rel), name: norm(file.name) }))
            .filter((file) => file.rel !== '');
          const keptCards = cards.filter((card) => {
            const cardPath = norm(card.filePath);
            if (cardPath === '') return false;
            if (filePaths.has(cardPath)) return true;
            const base = cardPath.split('/').pop();
            return fileRels.some((file) => cardPath.endsWith(`/${file.rel}`) || (file.name !== '' && base === file.name));
          });
          cards.splice(0, cards.length, ...keptCards);
        }
        const graph = buildRelationGraph({
          cards,
          files,
          canvasEdges,
          includeTags,
          includeOrphans,
          maxNodes: 900,
          truncated: cards.length >= 1200,
        });
        return {
          ok: true,
          value: {
            scope,
            nodes: graph.nodes,
            edges: graph.edges,
            truncated: graph.truncated || vaultTruncated,
            counts: { cards: cards.length, canvases: scenes.length, files: files.length },
            vaultRoot,
          },
        };
      }),
    'ai-providers': async () => {
      const providers = await loadAiProviders();
      return { ok: true, value: { providers: providers.map(publicProvider) } };
    },
    'ai-provider-save': async (payload) => {
      const providers = await loadAiProviders();
      const id = String(payload?.id ?? '').trim();
      const existing = id === '' ? null : providers.find((provider) => provider.id === id) ?? null;
      if (id !== '' && !existing) {
        return { ok: false, error: { code: 'canvas/ai-provider', message: '找不到要编辑的 AI 接口（可能已被删除）' } };
      }
      const normalized = normalizeProviderConfig(payload ?? {}, existing);
      if (!normalized.ok) return { ok: false, error: { code: 'canvas/ai-provider', message: normalized.error } };
      let next;
      if (existing) {
        next = providers.map((provider) => (provider.id === existing.id ? normalized.provider : provider));
      } else {
        if (providers.length >= AI_MAX_PROVIDERS) {
          return { ok: false, error: { code: 'canvas/ai-provider', message: `最多只能配置 ${AI_MAX_PROVIDERS} 个 AI 接口` } };
        }
        next = [...providers, normalized.provider];
      }
      await saveAiProviders(next);
      return { ok: true, value: { providers: next.map(publicProvider), provider: publicProvider(normalized.provider) } };
    },
    'ai-provider-delete': async (payload) => {
      const providers = await loadAiProviders();
      const id = String(payload?.id ?? '').trim();
      const next = providers.filter((provider) => provider.id !== id);
      if (next.length === providers.length) {
        return { ok: false, error: { code: 'canvas/ai-provider', message: '找不到要删除的 AI 接口' } };
      }
      await saveAiProviders(next);
      return { ok: true, value: { providers: next.map(publicProvider) } };
    },
    'ai-provider-test': async (payload) => {
      let provider = null;
      const id = String(payload?.id ?? '').trim();
      if (id !== '') {
        provider = await findAiProvider(id);
        if (!provider) return { ok: false, error: { code: 'canvas/ai-provider', message: '找不到要测试的 AI 接口' } };
        const overrides = normalizeProviderConfig(payload ?? {}, provider);
        if (!overrides.ok) return { ok: false, error: { code: 'canvas/ai-provider', message: overrides.error } };
        provider = overrides.provider;
      } else {
        const normalized = normalizeProviderConfig(payload ?? {}, null);
        if (!normalized.ok) return { ok: false, error: { code: 'canvas/ai-provider', message: normalized.error } };
        provider = normalized.provider;
      }
      const result = await testAiProvider(provider);
      if (!result.ok) return { ok: false, error: { code: result.code ?? 'canvas/ai-test', message: result.message } };
      return { ok: true, value: { latencyMs: result.latencyMs, reply: result.reply, model: result.model } };
    },
    'vault-import': (payload) =>
      serialize(async () => {
        await ensureReady();
        const target = String(payload?.path ?? '').trim();
        if (target === '') return { ok: false, error: { code: 'canvas/vault-path', message: '请先选择要导入的文件' } };
        let converted;
        try {
          converted = await importVaultPath(target);
        } catch (error) {
          return { ok: false, error: { code: 'canvas/vault-import', message: String(error?.message ?? error) } };
        }
        if (!Array.isArray(converted.items) || converted.items.length === 0) {
          return { ok: false, error: { code: 'canvas/vault-empty', message: '这个文件没有可导入的内容' } };
        }
        syncActiveScene();
        if (converted.kind !== 'canvas') {
          const centerX = Number(runtime.doc.viewport?.cx) || 0;
          const centerY = Number(runtime.doc.viewport?.cy) || 0;
          for (const item of converted.items) {
            if (item.type === 'edge') continue;
            item.x = Math.round(centerX - (Number(item.w) || 360) / 2);
            item.y = Math.round(centerY - (Number(item.h) || 240) / 2);
          }
        }
        const ops = converted.items.map((item) => ({ op: 'upsert', item }));
        const bounds = boundsOfItems(converted.items);
        if (bounds) {
          const zoom = Math.min(1, Math.max(0.2, Math.min(1200 / (bounds.w + 240), 800 / (bounds.h + 240))));
          ops.push({
            op: 'focus',
            cx: Math.round(bounds.x + bounds.w / 2),
            cy: Math.round(bounds.y + bounds.h / 2),
            zoom: Math.round(zoom * 100) / 100,
          });
        }
        const result = applyOpsNow(ops, 'user');
        for (const item of converted.items) {
          const filePath = String(item?.meta?.filePath ?? '').trim();
          if (filePath !== '' && (item.type === 'note' || item.type === 'text')) {
            knownFileContents.set(filePath, String(item.text ?? ''));
          }
        }
        return {
          ok: true,
          value: {
            mode: converted.kind,
            created: converted.items.filter((item) => item.type !== 'edge').length,
            edges: converted.items.filter((item) => item.type === 'edge').length,
            warnings: converted.warnings ?? [],
            revision: result.revision,
            errors: result.errors,
          },
        };
      }),
    'vault-write-back': (payload) =>
      serialize(async () => {
        await ensureReady();
        const id = String(payload?.id ?? payload?.itemId ?? '').trim();
        const item = runtime.doc.items[id];
        if (!item) return { ok: false, error: { code: 'canvas/vault-write', message: '找不到该卡片' } };
        if (item.type !== 'note' && item.type !== 'text') {
          return { ok: false, error: { code: 'canvas/vault-write', message: '只有便签 / 文本卡片可以写回 Markdown' } };
        }
        if (String(item.meta?.filePath ?? '').trim() === '') {
          return { ok: false, error: { code: 'canvas/vault-write', message: '这张卡片没有绑定本地文件（先从左侧笔记库导入 .md）' } };
        }
        let result;
        try {
          result = await syncItemFile(item);
        } catch (error) {
          return { ok: false, error: { code: 'canvas/vault-write', message: String(error?.message ?? error) } };
        }
        if (result && !result.unchanged) {
          applyOpsNow(
            [{ op: 'patch', id, patch: { meta: { ...(item.meta ?? {}), fileMtime: result.mtimeMs } } }],
            'user',
          );
        }
        return {
          ok: true,
          value: {
            id,
            path: result?.path ?? item.meta.filePath,
            unchanged: Boolean(result?.unchanged),
            conflictBackup: result?.conflictBackup ?? '',
            size: result?.size ?? 0,
          },
        };
      }),
  };

  const findTargetAgent = (agents, requestedId) => {
    if (!agents || typeof agents.roots !== 'function') return undefined;
    if (typeof requestedId === 'string' && requestedId !== '' && typeof agents.get === 'function') {
      const requested = agents.get(requestedId);
      if (requested) return requested;
    }
    const scored = (agents.roots() ?? []).map((agent) => {
      const stamp = agent?.session?.header?.updatedAt ?? agent?.session?.updatedAt ?? 0;
      const at = typeof stamp === 'number' ? stamp : Date.parse(String(stamp)) || 0;
      return { agent, at };
    });
    scored.sort((left, right) => right.at - left.at);
    return scored[0]?.agent;
  };

  /* ------------------------------------------------------------------ *
   * browser API — one authenticated exact Fetch route under /api
   * ------------------------------------------------------------------ */
  const handleApi = async (request) => {
    try {
      if (request.method !== 'POST') {
        return jsonResponse(405, { ok: false, error: { code: 'canvas/method', message: 'POST only' } });
      }
      let body;
      try {
        body = await request.json();
      } catch (error) {
        return jsonResponse(200, { ok: false, error: { code: 'canvas/body', message: 'request body must be JSON' } });
      }
      const action = String(body?.action ?? '');
      const payload = body?.payload && typeof body.payload === 'object' ? body.payload : {};
      if (action === 'state') return jsonResponse(200, { ok: true, value: await readState(payload.since, payload.docId) });
      if (action === 'apply') return jsonResponse(200, { ok: true, value: await applyBatch(payload.ops, 'user') });
      if (action === 'viewport') return jsonResponse(200, { ok: true, value: await updateViewport(payload.viewport) });
      if (action === 'generate') return jsonResponse(200, await generateOnCanvas(payload));
      if (action === 'delegate') return jsonResponse(200, await delegateToChildren(payload));
      if (action === 'open-path') return jsonResponse(200, await openLocalPath(payload));
      if (action === 'models') return jsonResponse(200, await readModelCatalog());
      if (action === 'generate-apply') return jsonResponse(200, await applyPendingPlan(payload.planId));
      if (action === 'settings') return jsonResponse(200, await readSettings());
      if (Object.prototype.hasOwnProperty.call(vaultActions, action)) {
        return jsonResponse(200, await vaultActions[action](payload));
      }
      if (Object.prototype.hasOwnProperty.call(libraryActions, action)) {
        return jsonResponse(200, await libraryActions[action](payload));
      }
      return jsonResponse(200, {
        ok: false,
        error: { code: 'canvas/unknown-action', message: `unknown action ${JSON.stringify(action)}` },
      });
    } catch (error) {
      return jsonResponse(200, {
        ok: false,
        error: { code: 'canvas/failed', message: String(error?.message ?? error) },
      });
    }
  };

  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: API_ROUTE,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: handleApi,
      }),
    'infinite-canvas: browser API',
  );

  ctx.effect(
    () => async () => {
      try {
        if (runtime.store) await runtime.store.close();
      } catch (error) {
        log(`close failed: ${String(error?.message ?? error)}`);
      }
    },
    'infinite-canvas: store lifetime',
  );

  /* ------------------------------------------------------------------ *
   * agent tools
   * ------------------------------------------------------------------ */
  ctx.inject(['tools'], (toolCtx) => {
    toolCtx.tools.register({
      name: 'canvas_read',
      description:
        "Read the user's infinite canvas panel: title, revision, viewport and node list. Call it before editing existing content. Returns JSON; page with `cursor` when `next_cursor` is not null.",
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          include: {
            type: 'string',
            enum: ['summary', 'full'],
            description: 'summary (default) gives ids, positions and text previews; full gives complete text and metadata.',
          },
          limit: { type: 'integer', description: 'Maximum nodes to return; default 40.' },
          cursor: { type: 'integer', description: 'Offset into the node list for paging.' },
        },
      },
      output,
      async execute(args) {
        const result = await serialize(async () => {
          await ensureReady();
          const summary = summarizeDoc(runtime.doc, {
            include: args?.include === 'full' ? 'full' : 'summary',
            limit: Number.isFinite(Number(args?.limit)) ? Math.min(400, Math.max(1, Math.trunc(Number(args.limit)))) : 40,
            cursor: Number.isFinite(Number(args?.cursor)) ? Math.max(0, Math.trunc(Number(args.cursor))) : 0,
          });
          return { summary, revision: runtime.doc.rev };
        });
        let text = JSON.stringify(result.summary);
        if (text.length > READ_TEXT_LIMIT) {
          text = `${text.slice(0, READ_TEXT_LIMIT)}\n…truncated; page with cursor=${result.summary.nextCursor ?? 0} or lower limit`;
        }
        return { text, revision: result.revision };
      },
    });

    toolCtx.tools.register({
      name: 'canvas_create',
      description:
        'Create nodes on the infinite canvas: sticky notes (type note), text, shapes, frames or images. Omit x/y to auto-place beside existing content. Returns the new node ids so you can connect or update them.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          items: {
            type: 'array',
            description: 'Nodes to create, in order.',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                type: { type: 'string', enum: ['note', 'text', 'shape', 'frame', 'image'], description: 'Node type, default note.' },
                text: { type: 'string', description: 'Node text (the frame title for frames).' },
                x: { type: 'number', description: 'World x of the top-left corner; omit to auto-place.' },
                y: { type: 'number', description: 'World y of the top-left corner; omit to auto-place.' },
                w: { type: 'number', description: 'Width in world units.' },
                h: { type: 'number', description: 'Height in world units.' },
                color: { type: 'string', enum: PALETTE, description: 'Sticky/shape color.' },
                shape: { type: 'string', enum: SHAPES, description: 'Shape geometry when type is shape.' },
                src: { type: 'string', description: 'Image URL (https:// or data:image/...) when type is image.' },
                frameId: { type: 'string', description: 'Optional id of the frame this node belongs to.' },
              },
            },
          },
        },
        required: ['items'],
      },
      output,
      async execute(args) {
        if (!Array.isArray(args?.items) || args.items.length === 0) throw new Error('items must be a non-empty array');
        if (args.items.length > MAX_CREATE_BATCH) throw new Error(`create at most ${MAX_CREATE_BATCH} nodes per call`);
        const result = await serialize(async () => {
          await ensureReady();
          const inputs = args.items.map((item) => {
            if (item?.id !== undefined) throw new Error('canvas_create: omit id; use canvas_update for existing nodes');
            const next = {};
            for (const key of CREATE_FIELDS) {
              if (item?.[key] !== undefined) next[key] = item[key];
            }
            next.type = item?.type ?? 'note';
            if (next.type === 'image' && !/^(https?:\/\/|data:image\/)/i.test(String(next.src ?? ''))) {
              throw new Error('canvas_create: type image needs src as https:// or data:image/...');
            }
            return next;
          });
          const needsPlacement = inputs.filter(
            (item) => !Number.isFinite(Number(item.x)) || !Number.isFinite(Number(item.y)),
          ).length;
          const positions = placeItems(runtime.doc, needsPlacement);
          let placed = 0;
          const ops = inputs.map((item) => {
            const next = { ...item };
            if (!Number.isFinite(Number(item.x)) || !Number.isFinite(Number(item.y))) {
              const position = positions[placed] ?? { x: 0, y: 0 };
              placed += 1;
              next.x = position.x;
              next.y = position.y;
            }
            return { op: 'upsert', item: next };
          });
          return applyOpsNow(ops, 'ai');
        });
        const created = (result.applied ?? []).filter((op) => op.op === 'upsert').map((op) => op.item);
        const lines = [
          `Created ${created.length} node(s) at revision ${result.revision}.`,
          ...created.map(
            (item) =>
              `- ${item.id} ${item.type} at (${item.x}, ${item.y}) size ${item.w}x${item.h}${item.text ? `: ${shortText(item.text, 60)}` : ''}`,
          ),
        ];
        if (result.errors?.length) lines.push(`Skipped: ${result.errors.join('; ')}`);
        lines.push('Use these ids with canvas_connect (from/to) or canvas_update.');
        return { text: lines.join('\n'), revision: result.revision };
      },
    });

    toolCtx.tools.register({
      name: 'canvas_update',
      description:
        'Update existing nodes by id: text, position, size, color, shape or frame membership. Only the fields you pass change. Returns the updated ids.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          items: {
            type: 'array',
            description: 'Partial updates; each needs an id.',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string', description: 'Exact node id from canvas_read or canvas_create.' },
                text: { type: 'string' },
                x: { type: 'number' },
                y: { type: 'number' },
                w: { type: 'number' },
                h: { type: 'number' },
                z: { type: 'number', description: 'Stacking order; higher is on top.' },
                color: { type: 'string', enum: PALETTE },
                shape: { type: 'string', enum: SHAPES },
                label: { type: 'string', description: 'Edge label when the id belongs to an edge.' },
                frameId: { type: 'string' },
                src: { type: 'string' },
              },
              required: ['id'],
            },
          },
        },
        required: ['items'],
      },
      output,
      async execute(args) {
        if (!Array.isArray(args?.items) || args.items.length === 0) throw new Error('items must be a non-empty array');
        const result = await serialize(async () => {
          await ensureReady();
          const ops = [];
          const skipped = [];
          for (const entry of args.items) {
            const id = String(entry?.id ?? '').trim();
            if (!runtime.doc.items[id]) {
              skipped.push(`no node with id ${JSON.stringify(id)}`);
              continue;
            }
            const patch = {};
            for (const key of ['text', 'x', 'y', 'w', 'h', 'z', 'color', 'shape', 'label', 'frameId', 'src']) {
              if (entry[key] !== undefined) patch[key] = entry[key];
            }
            if (Object.keys(patch).length === 0) {
              skipped.push(`nothing to change for ${id}`);
              continue;
            }
            ops.push({ op: 'patch', id, patch });
          }
          if (ops.length === 0) throw new Error(skipped.join('; ') || 'nothing to update');
          const applied = applyOpsNow(ops, 'ai');
          applied.errors = (applied.errors ?? []).concat(skipped);
          return applied;
        });
        const lines = [
          `Updated ${(result.applied ?? []).length} node(s) at revision ${result.revision}.`,
          ...((result.applied ?? []).filter((op) => op.op === 'upsert').map((op) => `- ${describe(op.item)}`)),
        ];
        if (result.errors?.length) lines.push(`Skipped: ${result.errors.join('; ')}`);
        return { text: lines.join('\n'), revision: result.revision };
      },
    });

    toolCtx.tools.register({
      name: 'canvas_delete',
      description: 'Delete nodes from the infinite canvas by id; edges attached to a deleted node are removed too. Set `all` to clear the whole canvas.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ids: { type: 'array', description: 'Node ids to delete.', items: { type: 'string' } },
          all: { type: 'boolean', description: 'Delete every node instead of specific ids.' },
        },
      },
      output,
      async execute(args) {
        const all = args?.all === true;
        const ids = Array.isArray(args?.ids) ? args.ids.map((id) => String(id)) : [];
        if (!all && ids.length === 0) throw new Error('pass ids or all: true');
        const result = await serialize(async () => {
          await ensureReady();
          if (all) return applyOpsNow([{ op: 'clear' }], 'ai');
          const missing = missingIds(runtime.doc, ids);
          const ops = ids.filter((id) => runtime.doc.items[id]).map((id) => ({ op: 'delete', id }));
          if (ops.length === 0) throw new Error(`no node with id ${missing.join(', ')}`);
          const applied = applyOpsNow(ops, 'ai');
          applied.errors = (applied.errors ?? []).concat(missing.map((id) => `no node with id ${id}`));
          return applied;
        });
        const lines = [`Deleted ${(result.applied ?? []).length} item(s); revision ${result.revision}, ${Object.keys(runtime.doc.items).length} nodes remain.`];
        if (result.errors?.length) lines.push(`Note: ${result.errors.join('; ')}`);
        return { text: lines.join('\n'), revision: result.revision };
      },
    });

    toolCtx.tools.register({
      name: 'canvas_connect',
      description: 'Draw directed edges (arrows) between existing canvas nodes, with an optional label. Returns the edge ids.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          edges: {
            type: 'array',
            description: 'Edges to add.',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                from: { type: 'string', description: 'Source node id (edge starts here).' },
                to: { type: 'string', description: 'Target node id (arrow head).' },
                label: { type: 'string', description: 'Short label drawn on the edge.' },
              },
              required: ['from', 'to'],
            },
          },
        },
        required: ['edges'],
      },
      output,
      async execute(args) {
        if (!Array.isArray(args?.edges) || args.edges.length === 0) throw new Error('edges must be a non-empty array');
        const result = await serialize(async () => {
          await ensureReady();
          const ops = [];
          const skipped = [];
          for (const edge of args.edges) {
            const from = String(edge?.from ?? '').trim();
            const to = String(edge?.to ?? '').trim();
            if (!runtime.doc.items[from] || !runtime.doc.items[to]) {
              skipped.push(`edge ${from}->${to} skipped: ${!runtime.doc.items[from] ? from : to} does not exist`);
              continue;
            }
            ops.push({ op: 'upsert', item: { type: 'edge', from, to, label: edge?.label ?? '', by: 'ai' } });
          }
          if (ops.length === 0) throw new Error(skipped.join('; ') || 'no valid edges');
          const applied = applyOpsNow(ops, 'ai');
          applied.errors = (applied.errors ?? []).concat(skipped);
          return applied;
        });
        const edges = (result.applied ?? []).filter((op) => op.op === 'upsert').map((op) => op.item);
        const lines = [
          `Connected ${edges.length} edge(s) at revision ${result.revision}.`,
          ...edges.map((edge) => `- ${edge.id}: ${edge.from} -> ${edge.to}${edge.label ? ` (${edge.label})` : ''}`),
        ];
        if (result.errors?.length) lines.push(`Note: ${result.errors.join('; ')}`);
        return { text: lines.join('\n'), revision: result.revision };
      },
    });

    toolCtx.tools.register({
      name: 'canvas_focus',
      description:
        "Move the user's canvas viewport to show specific nodes, or a world rectangle, so they see what you just changed. Optionally set a zoom between 0.1 and 4.",
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ids: { type: 'array', description: 'Node ids to frame in the viewport.', items: { type: 'string' } },
          rect: {
            type: 'object',
            additionalProperties: false,
            description: 'Alternate world rectangle to frame.',
            properties: { x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' } },
            required: ['x', 'y', 'w', 'h'],
          },
          zoom: { type: 'number', description: 'Explicit zoom, 0.1 to 4.' },
        },
      },
      output,
      async execute(args) {
        const ids = Array.isArray(args?.ids) ? args.ids.map((id) => String(id)) : [];
        if (ids.length === 0 && !args?.rect) throw new Error('pass ids or rect');
        const result = await serialize(async () => {
          await ensureReady();
          const target = focusViewport(runtime.doc, {
            ids,
            rect: args?.rect,
            zoom: Number.isFinite(Number(args?.zoom)) ? Number(args.zoom) : undefined,
          });
          if (target === null) {
            const missing = missingIds(runtime.doc, ids);
            throw new Error(`nothing to focus${missing.length > 0 ? `: ${missing.join(', ')}` : ''}`);
          }
          return applyOpsNow([{ op: 'focus', cx: target.cx, cy: target.cy, zoom: target.zoom }], 'ai');
        });
        return {
          text: `Viewport focused on ${ids.length > 0 ? ids.join(', ') : 'rectangle'} at revision ${result.revision}.`,
          revision: result.revision,
        };
      },
    });
  });

  /* ------------------------------------------------------------------ *
   * system prompt guidance
   * ------------------------------------------------------------------ */
  ctx.inject(['systemPrompt'], (promptCtx) => {
    promptCtx.systemPrompt.section({
      name: 'canvas:infinite-canvas',
      order: 3200,
      interpolate: false,
      text: () => {
        const doc = runtime.doc;
        const count = doc ? Object.keys(doc.items).length : 0;
        const revision = doc ? doc.rev : 0;
        const viewport = doc?.viewport;
        return [
          '## 通用画布 (UniCanvas)',
          'The Web GUI has a persistent infinite canvas panel that the user can open from the sidebar. You and the user share it: the user sees your changes immediately.',
          '- `canvas_read` — inspect the canvas (title, revision, viewport, nodes) before changing existing content.',
          '- `canvas_create` — add sticky notes, text, shapes, frames or images; omit x/y to auto-place. Returns ids.',
          '- `canvas_update` — change text/position/size/color of existing nodes by id.',
          '- `canvas_delete` — remove nodes (or `all: true` to clear).',
          '- `canvas_connect` — draw arrows between nodes (`from`/`to` ids, optional label).',
          '- `canvas_focus` — bring nodes or a rectangle into the user viewport after you change something.',
          'Prefer many short sticky notes over one long note, group related nodes inside a frame, connect a flow with edges, and keep text readable. Node coordinates are world units; typical notes are 240x168.',
          `Current canvas: title ${JSON.stringify(doc?.title ?? '')}, revision ${revision}, ${count} nodes, viewport centre (${Math.round(viewport?.cx ?? 0)}, ${Math.round(viewport?.cy ?? 0)}) at zoom ${viewport?.zoom ?? 1}. Host build ${HOST_BUILD}.`,
        ].join('\n');
      },
    });
  });

  // Load the document as soon as the plugin activates so the first system prompt and
  // canvas_read see the real title/revision instead of an empty placeholder.
  void ensureReady();
}
