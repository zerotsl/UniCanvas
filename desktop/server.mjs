#!/usr/bin/env node
/**
 * Standalone host for UniCanvas.
 *
 * Serves the renderer (a React mount of the plugin's CanvasPanel) and the same
 * JSON API the plugin speaks (`/api/canvas.doc`), backed by its own local data
 * file. AI generation is not available in standalone mode: those actions return
 * a readable error instead of failing silently.
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  librarySummary,
  listSnapshots,
  newId,
  normalizeLibrary,
  pushSnapshot,
  relationTextMeta,
  renameCanvas,
  restoreSnapshot,
  switchCanvas,
  syncPayload,
} from '../packages/infinite-canvas/model.js';
import { boundsOfItems, importVaultPath, listVault, readVaultFile, scanVaultGraph, writeNoteFile } from '../packages/infinite-canvas/vault.mjs';
import {
  AI_MAX_PROVIDERS,
  AI_PROVIDER_SCHEMA,
  callOpenAiCompatible,
  extractJsonObject,
  normalizeProviderConfig,
  providerFromLegacyConfig,
  publicProvider,
  testAiProvider,
} from '../packages/infinite-canvas/ai.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const RENDERER = join(HERE, 'renderer');
const PORT = Number(process.env.DSH_CANVAS_PORT ?? 47822);
// Local data stays inside the app folder: the standalone window must work without
// touching per-user Windows folders, and the canvas can be imported from DSH on demand.
const DATA_DIR = process.env.DSH_CANVAS_DATA ?? join(HERE, 'data');
const DATA_FILE = join(DATA_DIR, 'library.json');
const AI_CONFIG_FILE = join(DATA_DIR, 'ai-config.json');
const AI_PROVIDERS_FILE = join(DATA_DIR, 'ai-providers.json');
const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh');
const DSH_STORAGE_FILE = join(DSH_HOME, 'storages', 'infinite_canvas.json');
const HOST_BUILD = 'standalone-1.14';
const MAX_ENTRIES = 400;
const IDLE_EXIT_MS = 20 * 60 * 1000;
const AI_TIMEOUT_MS = 90_000;

const runtime = { library: null, doc: null, entries: [], saveTimer: null, saving: null, dirty: false, lastRequestAt: Date.now() };

/** Last content this process read/wrote for each file-backed card. */
const knownFileContents = new Map();

/* ------------------------------------------------------------------ *
 * User-supplied OpenAI-compatible model API (settings > AI 模型 API).
 * The key is stored in the standalone data folder and never sent back
 * to the renderer in clear text.
 * ------------------------------------------------------------------ */
const ai = { baseUrl: '', model: '', apiKey: '' };

async function loadAiConfig() {
  const stored = await readJson(AI_CONFIG_FILE);
  if (!stored || typeof stored !== 'object') return;
  ai.baseUrl = typeof stored.baseUrl === 'string' ? stored.baseUrl : '';
  ai.model = typeof stored.model === 'string' ? stored.model : '';
  ai.apiKey = typeof stored.apiKey === 'string' ? stored.apiKey : '';
}

async function saveAiConfig() {
  await mkdir(DATA_DIR, { recursive: true });
  const temporary = `${AI_CONFIG_FILE}.tmp`;
  await writeFile(temporary, JSON.stringify(ai), 'utf8');
  await rename(temporary, AI_CONFIG_FILE);
}

/* ------------------------------------------------------------------ *
 * Custom OpenAI-compatible providers (multiple endpoints). Stored in
 * desktop/data/ai-providers.json; the old single ai-config.json is
 * migrated automatically on first start.
 * ------------------------------------------------------------------ */
let aiProviders = [];

async function loadAiProviders() {
  const stored = await readJson(AI_PROVIDERS_FILE);
  const list = Array.isArray(stored?.providers) ? stored.providers : [];
  aiProviders = list
    .slice(0, AI_MAX_PROVIDERS)
    .map((entry) => normalizeProviderConfig(entry).provider)
    .filter(Boolean);
}

async function saveAiProviders() {
  await mkdir(DATA_DIR, { recursive: true });
  const temporary = `${AI_PROVIDERS_FILE}.tmp`;
  await writeFile(temporary, JSON.stringify({ schema: AI_PROVIDER_SCHEMA, providers: aiProviders }, null, 2), 'utf8');
  await rename(temporary, AI_PROVIDERS_FILE);
}

async function migrateLegacyAiConfig() {
  if (aiProviders.length > 0) return;
  const provider = providerFromLegacyConfig(ai);
  if (!provider) return;
  aiProviders = [provider];
  await saveAiProviders();
  console.log('[canvas-standalone] migrated ai-config.json into ai-providers.json');
}

const enabledProviders = () => aiProviders.filter((provider) => provider.enabled !== false);
const defaultAiProvider = () => enabledProviders()[0] ?? null;
const findAiProvider = (id) => aiProviders.find((provider) => provider.id === String(id ?? '')) ?? null;

/** Resolve the client model choice to `{ provider, model }` (or null when unavailable). */
function selectAiProvider(selection) {
  if (selection && typeof selection === 'object' && selection.source === 'custom') {
    const provider = findAiProvider(selection.providerId);
    if (!provider || provider.enabled === false) return null;
    const model = String(selection.model || provider.defaultModel || provider.models?.[0] || '');
    return model === '' ? null : { provider, model };
  }
  const provider = defaultAiProvider();
  if (!provider) return null;
  const model = String(provider.defaultModel || provider.models?.[0] || '');
  return model === '' ? null : { provider, model };
}

/** One-shot chat call against the selected custom provider. */
async function callProviderChat(selection, { system, user, maxTokens, temperature, timeoutMs }) {
  const result = await callOpenAiCompatible(selection.provider, {
    model: selection.model,
    messages: [
      { role: 'system', content: String(system ?? '') },
      { role: 'user', content: String(user ?? '') },
    ],
    maxTokens,
    temperature,
    timeoutMs,
  });
  return result.text;
}

function maskApiKey(key) {
  const text = String(key ?? '');
  if (text === '') return '';
  if (text.length <= 8) return '••••';
  return `${text.slice(0, 4)}••••${text.slice(-4)}`;
}

const aiPublic = () => ({
  baseUrl: ai.baseUrl,
  model: ai.model,
  hasKey: ai.apiKey !== '',
  keyMasked: maskApiKey(ai.apiKey),
});

function cleanAiInput(payload) {
  const baseUrl = String(payload?.baseUrl ?? ai.baseUrl ?? '')
    .trim()
    .replace(/\/+$/, '')
    .slice(0, 500);
  if (baseUrl !== '' && !/^https?:\/\//i.test(baseUrl)) {
    return { error: 'API 地址必须以 http:// 或 https:// 开头' };
  }
  const model = String(payload?.model ?? ai.model ?? '').trim().slice(0, 120);
  const apiKey = typeof payload?.apiKey === 'string' ? payload.apiKey.trim().slice(0, 500) : undefined;
  if (baseUrl !== '' && model === '') return { error: '请填写模型名（例如 deepseek-chat）' };
  return { baseUrl, model, apiKey };
}

function chatUrl(baseUrl) {
  const root = String(baseUrl ?? '').replace(/\/+$/, '');
  if (/\/chat\/completions$/i.test(root)) return root;
  return `${root}/chat/completions`;
}

async function callModel({ system, user, maxTokens = 2400, temperature = 0.4, apiKeyOverride, baseUrlOverride, modelOverride }) {
  const baseUrl = String(baseUrlOverride ?? ai.baseUrl).trim();
  const model = String(modelOverride ?? ai.model).trim();
  if (baseUrl === '' || model === '') throw new Error('请先在设置 → AI 模型 API 里填写 API 地址和模型名');
  const key = typeof apiKeyOverride === 'string' && apiKeyOverride !== '' ? apiKeyOverride : ai.apiKey;
  if (key === '') throw new Error('请先在设置 → AI 模型 API 里填写 API Key');
  const route = chatUrl(baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    let response;
    try {
      response = await fetch(route, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error(`模型接口超时（${Math.round(AI_TIMEOUT_MS / 1000)} 秒）`);
      const reason = error?.cause?.code ?? error?.code ?? error?.message ?? String(error);
      throw new Error(`无法连接模型接口（${route}）：${String(reason)}`);
    }
    const raw = await response.text();
    if (!response.ok) {
      let detail = raw.slice(0, 400);
      try {
        const parsed = JSON.parse(raw);
        detail = parsed?.error?.message ?? parsed?.message ?? detail;
      } catch (error) {
        /* plain-text error body */
      }
      throw new Error(`模型接口 HTTP ${response.status}：${detail}`);
    }
    let body;
    try {
      body = JSON.parse(raw);
    } catch (error) {
      throw new Error('模型接口返回的不是 JSON');
    }
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim() === '') throw new Error('模型没有返回内容');
    return content.trim();
  } finally {
    clearTimeout(timer);
  }
}

const PLAN_SYSTEM_PROMPT = [
  '你是「通用画布」的生成器。你只输出一个 JSON 对象，不要 markdown 代码块，不要解释。',
  'JSON 结构：{"title":"可选的新画板标题","delete":["现有节点id"],"updates":[{"id":"现有节点id","text":"新文本","x":0,"y":0,"w":240,"h":168,"color":"yellow","shape":"rect"}],"nodes":[{"ref":"短引用","type":"note|text|shape|frame|image","text":"内容","x":0,"y":0,"w":280,"h":200,"color":"yellow","shape":"rect"}],"edges":[{"from":"ref或现有id","to":"ref或现有id","label":"可选"}],"focus":["ref或现有id"]}',
  '规则：type 默认 note；color 取 yellow|blue|green|pink|purple|orange|gray|white；每张便签文字 ≤ 40 字；没有把握的字段可省略；一次最多 12 个节点、20 条边；不要编造不存在的 id。',
  '坐标为画布世界坐标；如果请求没有指定位置，围绕给定的锚点（或可见视野中心）紧凑排布，节点之间留 40-80px 间距。',
  '禁止套用与用户请求无关的通用模板；如果请求是对选中节点的提问、解题、解释或续写，答案必须写回该节点的 text（保留原文，换行后以「答：」开头），不要新建节点。',
].join('\n');

const DOC_SYSTEM_PROMPT = [
  '你是画板文档生成器。输出一份中文 Markdown 文档，可直接阅读与打印。',
  '只输出文档正文：不要输出 JSON、不要解释你的过程、不要用代码块包裹整篇内容。',
  '结构清晰：标题、分节、必要的表格（Markdown 表格）与要点列表。',
].join('\n');

function docSummaryForPrompt(payload) {
  const items = Object.values(runtime.doc.items);
  const selection = Array.isArray(payload?.selection) ? payload.selection.map(String) : [];
  const lines = [];
  const described = [];
  for (const item of items) {
    if (item.type === 'edge') continue;
    if (described.length >= 80) break;
    const text = String(item.text ?? '').replace(/\s+/g, ' ').trim();
    described.push(`- ${item.id} (${item.type}) x=${item.x} y=${item.y} w=${item.w} h=${item.h}${text ? ` text="${text.slice(0, 80)}"` : ''}`);
  }
  if (described.length > 0) lines.push('当前画布节点：', ...described);
  else lines.push('当前画布是空的。');
  if (selection.length > 0) {
    lines.push('选中的节点 id：' + selection.join(', '));
    for (const id of selection) {
      const item = runtime.doc.items[id];
      if (item) lines.push(`选中内容（${id}）：${String(item.text ?? '').slice(0, 2000)}`);
    }
  }
  const anchor = payload?.anchor && Number.isFinite(Number(payload.anchor.x)) && Number.isFinite(Number(payload.anchor.y))
    ? { x: Math.round(Number(payload.anchor.x)), y: Math.round(Number(payload.anchor.y)) }
    : null;
  lines.push(anchor ? `锚点（新内容放在这附近）：x=${anchor.x} y=${anchor.y}` : '没有指定锚点，请放在画布可见区域附近。');
  const viewport = payload?.viewport;
  if (viewport && Number.isFinite(Number(viewport.cx)) && Number.isFinite(Number(viewport.cy))) {
    lines.push(`当前视野中心：x=${Math.round(Number(viewport.cx))} y=${Math.round(Number(viewport.cy))}`);
  }
  return { text: lines.join('\n'), anchor };
}

function parsePlan(raw) {
  const parsed = extractJsonObject(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('模型没有返回 JSON 计划');
  return parsed;
}

function safeCoord(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.round(Math.min(1_000_000, Math.max(-1_000_000, number)));
}

function planToOps(plan, anchor) {
  const ops = [];
  const counts = { created: 0, updated: 0, deleted: 0 };
  const refIds = new Map();
  const existingIds = new Set(Object.keys(runtime.doc.items));
  const center = anchor ?? {
    x: Math.round(Number(runtime.doc.viewport.cx) || 0),
    y: Math.round(Number(runtime.doc.viewport.cy) || 0),
  };
  if (Array.isArray(plan.delete)) {
    for (const id of plan.delete.slice(0, 60)) {
      if (existingIds.has(String(id))) {
        ops.push({ op: 'delete', id: String(id) });
        counts.deleted += 1;
      }
    }
  }
  if (Array.isArray(plan.updates)) {
    for (const entry of plan.updates.slice(0, 60)) {
      if (!entry || typeof entry !== 'object') continue;
      const id = String(entry.id ?? '');
      if (!existingIds.has(id)) continue;
      const patch = {};
      for (const key of ['text', 'x', 'y', 'w', 'h', 'color', 'shape', 'frameId']) {
        if (entry[key] !== undefined && entry[key] !== null) patch[key] = entry[key];
      }
      if (Object.keys(patch).length === 0) continue;
      ops.push({ op: 'patch', id, patch });
      counts.updated += 1;
    }
  }
  const createdItems = [];
  if (Array.isArray(plan.nodes)) {
    plan.nodes.slice(0, 12).forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') return;
      const type = ['note', 'text', 'shape', 'frame', 'image'].includes(entry.type) ? entry.type : 'note';
      const id = newId(type === 'edge' ? 'e' : 'n');
      const column = index % 3;
      const row = Math.floor(index / 3);
      const width = type === 'frame' ? 640 : Number(entry.w) > 0 ? Number(entry.w) : 280;
      const item = {
        id,
        type,
        text: String(entry.text ?? '').slice(0, 4000),
        x: safeCoord(entry.x, center.x + column * (width + 60) - 320),
        y: safeCoord(entry.y, center.y + row * 250 - 120),
        w: safeCoord(entry.w, width),
        h: safeCoord(entry.h, type === 'frame' ? 420 : 200),
        ...(entry.color ? { color: entry.color } : {}),
        ...(entry.shape ? { shape: entry.shape } : {}),
        ...(entry.src ? { src: entry.src } : {}),
        ...(entry.frameId ? { frameId: String(entry.frameId) } : {}),
      };
      if (entry.ref) refIds.set(String(entry.ref), id);
      createdItems.push(item);
      ops.push({ op: 'upsert', item });
      counts.created += 1;
    });
  }
  if (Array.isArray(plan.edges)) {
    for (const entry of plan.edges.slice(0, 20)) {
      if (!entry || typeof entry !== 'object') continue;
      const resolveId = (value) => {
        const raw = String(value ?? '');
        return refIds.get(raw) ?? (existingIds.has(raw) ? raw : '');
      };
      const from = resolveId(entry.from);
      const to = resolveId(entry.to);
      if (!from || !to || from === to) continue;
      ops.push({
        op: 'upsert',
        item: {
          id: newId('e'),
          type: 'edge',
          from,
          to,
          ...(entry.label ? { label: String(entry.label).slice(0, 80) } : {}),
        },
      });
      counts.created += 1;
    }
  }
  if (typeof plan.title === 'string' && plan.title.trim() !== '') {
    ops.push({ op: 'title', title: plan.title.slice(0, 120) });
  }
  return { ops, counts };
}

async function generateWithAi(payload) {
  const selection = selectAiProvider(payload?.model);
  if (!selection) {
    return {
      ok: false,
      error: {
        code: 'canvas/ai-config',
        message:
          aiProviders.length === 0
            ? '还没有配置 AI 接口：点顶部「模型」→「+ 添加接口」，填一个 OpenAI 兼容的地址 / 模型 / Key'
            : '当前选择的模型接口不可用（可能已被删除或缺少 Key），请在「模型」里重新选择',
      },
    };
  }
  const prompt = String(payload?.prompt ?? '').trim();
  if (prompt === '') return { ok: false, error: { code: 'canvas/ai-prompt', message: '请先写需求' } };
  const persona = String(payload?.persona ?? '').trim().slice(0, 12000);
  const summary = docSummaryForPrompt(payload);
  const isDocument = payload?.output === 'document';
  try {
    if (isDocument) {
      const content = await callProviderChat(selection, {
        system: persona ? `${DOC_SYSTEM_PROMPT}\n\n【角色设定】\n${persona}` : DOC_SYSTEM_PROMPT,
        user: `${summary.text}\n\n请求：${prompt}`,
        maxTokens: 3000,
        temperature: 0.5,
      });
      const anchorPoint = summary.anchor ?? { x: runtime.doc.viewport.cx, y: runtime.doc.viewport.cy };
      const result = applyBatch([
        {
          op: 'upsert',
          item: {
            type: 'text',
            text: content.slice(0, 18000),
            x: Math.round(anchorPoint.x),
            y: Math.round(anchorPoint.y),
            w: 560,
            h: Math.min(3600, Math.max(220, content.split('\n').length * 26 + 60)),
          },
        },
      ]);
      return {
        ok: true,
        value: { mode: 'document', characters: content.length, created: result.applied.length, revision: result.revision },
      };
    }
    const planText = await callProviderChat(selection, {
      system: persona ? `${PLAN_SYSTEM_PROMPT}\n\n【角色设定（最高优先级）】\n${persona}` : PLAN_SYSTEM_PROMPT,
      user: `${summary.text}\n\n用户请求：${prompt}`,
      maxTokens: 2600,
      temperature: 0.4,
    });
    const plan = parsePlan(planText);
    const { ops, counts } = planToOps(plan, summary.anchor);
    if (ops.every((op) => op.op === 'title')) {
      return { ok: false, error: { code: 'canvas/ai-empty', message: '模型没有给出画板改动，换个说法再试' } };
    }
    const result = applyBatch(ops);
    return {
      ok: true,
      value: {
        mode: 'direct',
        created: counts.created,
        updated: counts.updated,
        deleted: counts.deleted,
        revision: result.revision,
        warnings: Array.isArray(result.errors) ? result.errors.slice(0, 5) : [],
      },
    };
  } catch (error) {
    return { ok: false, error: { code: 'canvas/ai-failed', message: String(error?.message ?? error) } };
  }
}

const json = (response, status, value) => {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  response.end(body);
};

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    return null;
  }
}

async function readDshLibrary() {
  const wrapper = await readJson(DSH_STORAGE_FILE);
  const stored = wrapper?.tables?.scenes?.main;
  if (!stored) return null;
  try {
    return normalizeLibrary(stored);
  } catch (error) {
    console.warn('[canvas-standalone] DSH storage not importable:', error?.message ?? error);
    return null;
  }
}

async function loadLibrary() {
  const own = await readJson(DATA_FILE);
  if (own) {
    try {
      return normalizeLibrary(own);
    } catch (error) {
      console.warn('[canvas-standalone] local data invalid, starting fresh:', error?.message ?? error);
    }
  }
  const imported = await readDshLibrary();
  if (imported) {
    console.log('[canvas-standalone] imported canvases from DeepSeek Harness storage');
    return imported;
  }
  return createLibrary(createDoc());
}

function scheduleSave() {
  syncActiveScene();
  runtime.dirty = true;
  if (runtime.saveTimer) return;
  runtime.saveTimer = setTimeout(() => {
    runtime.saveTimer = null;
    persist().catch((error) => console.warn('[canvas-standalone] save failed:', error?.message ?? error));
  }, 180);
}

async function persist() {
  if (!runtime.library || !runtime.dirty) return;
  runtime.dirty = false;
  const snapshot = JSON.parse(JSON.stringify(runtime.library));
  await mkdir(DATA_DIR, { recursive: true });
  const temporary = `${DATA_FILE}.tmp`;
  await writeFile(temporary, JSON.stringify(snapshot), 'utf8');
  await rename(temporary, DATA_FILE);
  runtime.savedAt = Date.now();
}

const activeScene = () => currentScene(runtime.library);

function syncActiveScene() {
  const scene = activeScene();
  if (!scene || !runtime.doc) return;
  scene.doc = runtime.doc;
  scene.updatedAt = runtime.doc.updatedAt;
  runtime.library.updatedAt = runtime.doc.updatedAt;
}

function fullState() {
  syncActiveScene();
  return {
    ...syncPayload(runtime.doc, [], undefined),
    docId: runtime.library.currentId,
    library: librarySummary(runtime.library),
    snapshots: listSnapshots(runtime.library),
    hostBuild: HOST_BUILD,
  };
}

function readState(since, docId) {
  syncActiveScene();
  const requested = typeof docId === 'string' ? docId : '';
  const switched = requested !== '' && requested !== runtime.library.currentId;
  const payload = syncPayload(runtime.doc, runtime.entries, switched ? undefined : since);
  return {
    ...payload,
    docId: runtime.library.currentId,
    library: librarySummary(runtime.library),
    snapshots: listSnapshots(runtime.library),
    hostBuild: HOST_BUILD,
  };
}

function syncItemFile(item) {
  const filePath = String(item?.meta?.filePath ?? '').trim();
  if (filePath === '') return Promise.resolve(null);
  return writeNoteFile(filePath, String(item.text ?? ''), {
    knownContent: knownFileContents.get(filePath),
    knownMtime: Number(item.meta?.fileMtime) || 0,
  })
    .then((result) => {
      if (!result.unchanged) knownFileContents.set(filePath, String(item.text ?? ''));
      if (result.conflictBackup) console.warn('[canvas-standalone] conflict backup:', result.conflictBackup);
      return result;
    })
    .catch((error) => {
      console.warn('[canvas-standalone] write-back failed:', filePath, error?.message ?? error);
      return null;
    });
}

function applyBatch(ops) {
  if (!Array.isArray(ops) || ops.length === 0) throw new Error('ops must be a non-empty array');
  const result = applyOps(runtime.doc, ops, 'user', new Date().toISOString());
  if (result.applied.length === 0) {
    return { revision: runtime.doc.rev, applied: [], changed: [], errors: result.errors };
  }
  runtime.doc = result.doc;
  runtime.entries = appendLog(runtime.entries, {
    rev: runtime.doc.rev,
    ops: result.applied,
    by: 'user',
    at: Date.now(),
  });
  if (runtime.entries.length > MAX_ENTRIES) runtime.entries = runtime.entries.slice(-MAX_ENTRIES);
  scheduleSave();
  if (result.changed.length > 0) {
    const fileItems = result.changed
      .map((id) => runtime.doc.items[id])
      .filter((item) => item && (item.type === 'note' || item.type === 'text') && item.meta?.filePath);
    for (const item of fileItems) syncItemFile(item).catch(() => {});
  }
  return {
    revision: runtime.doc.rev,
    applied: result.applied,
    changed: result.changed,
    errors: result.errors,
    title: runtime.doc.title,
  };
}

function updateViewport(viewport) {
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
}

function openLocalPath(payload) {
  const target = String(payload?.path ?? '').trim();
  if (target === '') return { ok: false, error: { code: 'canvas/path', message: '路径不能为空' } };
  try {
    if (!existsSync(target)) return { ok: false, error: { code: 'canvas/path-missing', message: `路径不存在：${target}` } };
  } catch (error) {
    return { ok: false, error: { code: 'canvas/path-missing', message: String(error?.message ?? error) } };
  }
  try {
    const command = process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    spawn(command, [target], { detached: true, stdio: 'ignore' }).unref();
    return { ok: true, value: { path: target } };
  } catch (error) {
    return { ok: false, error: { code: 'canvas/path', message: String(error?.message ?? error) } };
  }
}

const AI_UNAVAILABLE = {
  ok: false,
  error: {
    code: 'canvas/standalone-ai',
    message: '独立版暂不支持「派活 / 跑子任务」；请回到插件窗口使用（画板数据独立保存）',
  },
};

const libraryActions = {
  library: () => ({ ok: true, value: { ...librarySummary(runtime.library), snapshots: listSnapshots(runtime.library) } }),
  'canvas-create': (payload) => {
    syncActiveScene();
    const doc = addCanvas(runtime.library, String(payload?.title ?? '').slice(0, 120));
    if (!doc) return { ok: false, error: { code: 'canvas/library-full', message: '画布数量已达上限' } };
    runtime.doc = doc;
    runtime.entries = [];
    scheduleSave();
    return { ok: true, value: fullState() };
  },
  'canvas-switch': (payload) => {
    syncActiveScene();
    const doc = switchCanvas(runtime.library, String(payload?.id ?? ''));
    if (!doc) return { ok: false, error: { code: 'canvas/not-found', message: '找不到该画布' } };
    runtime.doc = doc;
    runtime.entries = [];
    scheduleSave();
    return { ok: true, value: fullState() };
  },
  'canvas-rename': (payload) => {
    syncActiveScene();
    const id = String(payload?.id ?? '');
    if (!renameCanvas(runtime.library, id, String(payload?.title ?? ''))) {
      return { ok: false, error: { code: 'canvas/rename', message: '重命名失败：名称不能为空' } };
    }
    if (runtime.library.currentId === id) runtime.doc = activeScene()?.doc ?? runtime.doc;
    runtime.entries = [];
    scheduleSave();
    return { ok: true, value: { library: librarySummary(runtime.library) } };
  },
  'canvas-delete': (payload) => {
    syncActiveScene();
    if (!deleteCanvas(runtime.library, String(payload?.id ?? ''))) {
      return { ok: false, error: { code: 'canvas/not-found', message: '找不到该画布' } };
    }
    runtime.doc = activeScene()?.doc ?? createDoc();
    runtime.entries = [];
    scheduleSave();
    return { ok: true, value: fullState() };
  },
  'history-list': () => ({ ok: true, value: { snapshots: listSnapshots(runtime.library), library: librarySummary(runtime.library) } }),
  'history-save': (payload) => {
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
  },
  'history-restore': (payload) => {
    syncActiveScene();
    if (!restoreSnapshot(runtime.library, String(payload?.entryId ?? payload?.id ?? ''))) {
      return { ok: false, error: { code: 'canvas/history', message: '找不到该历史快照' } };
    }
    runtime.doc = activeScene()?.doc ?? runtime.doc;
    runtime.entries = [];
    scheduleSave();
    return { ok: true, value: fullState() };
  },
  'history-delete': (payload) => {
    if (!deleteSnapshot(runtime.library, String(payload?.entryId ?? payload?.id ?? ''))) {
      return { ok: false, error: { code: 'canvas/history', message: '找不到该历史快照' } };
    }
    scheduleSave();
    return { ok: true, value: { snapshots: listSnapshots(runtime.library) } };
  },
  'import-dsh': async () => {
    const imported = await readDshLibrary();
    if (!imported) return { ok: false, error: { code: 'canvas/import', message: '没有找到可导入的画板数据' } };
    runtime.library = imported;
    runtime.doc = activeScene()?.doc ?? createDoc();
    runtime.entries = [];
    scheduleSave();
    return { ok: true, value: fullState() };
  },
  'data-info': () => ({
    ok: true,
    value: { file: DATA_FILE, dshFile: DSH_STORAGE_FILE, dshExists: existsSync(DSH_STORAGE_FILE) },
  }),
};

async function handleApi(request, response) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 8_000_000) {
      response.writeHead(413);
      response.end('too large');
      return;
    }
  }
  let body;
  try {
    body = JSON.parse(raw || '{}');
  } catch (error) {
    json(response, 200, { ok: false, error: { code: 'canvas/body', message: 'request body must be JSON' } });
    return;
  }
  const action = String(body?.action ?? '');
  const payload = body?.payload && typeof body.payload === 'object' ? body.payload : {};
  try {
    if (action === 'state') return json(response, 200, { ok: true, value: readState(payload.since, payload.docId) });
    if (action === 'apply') return json(response, 200, { ok: true, value: applyBatch(payload.ops) });
    if (action === 'viewport') return json(response, 200, { ok: true, value: updateViewport(payload.viewport) });
    if (action === 'open-path') return json(response, 200, { ok: true, value: await openLocalPath(payload) });
    if (action === 'vault-list') return json(response, 200, { ok: true, value: await listVault(payload?.root) });
    if (action === 'vault-read') return json(response, 200, { ok: true, value: await readVaultFile(payload?.path) });
    if (action === 'graph-data') {
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
          return json(response, 200, { ok: false, error: { code: 'canvas/graph-vault', message: String(error?.message ?? error) } });
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
      return json(response, 200, {
        ok: true,
        value: {
          scope,
          nodes: graph.nodes,
          edges: graph.edges,
          truncated: graph.truncated || vaultTruncated,
          counts: { cards: cards.length, canvases: scenes.length, files: files.length },
          vaultRoot,
        },
      });
    }
    if (action === 'vault-import') {
      const target = String(payload?.path ?? '').trim();
      if (target === '') return json(response, 200, { ok: false, error: { code: 'canvas/vault-path', message: '请先选择要导入的文件' } });
      let converted;
      try {
        converted = await importVaultPath(target);
      } catch (error) {
        return json(response, 200, { ok: false, error: { code: 'canvas/vault-import', message: String(error?.message ?? error) } });
      }
      if (!Array.isArray(converted.items) || converted.items.length === 0) {
        return json(response, 200, { ok: false, error: { code: 'canvas/vault-empty', message: '这个文件没有可导入的内容' } });
      }
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
        ops.push({ op: 'focus', cx: Math.round(bounds.x + bounds.w / 2), cy: Math.round(bounds.y + bounds.h / 2), zoom: Math.round(zoom * 100) / 100 });
      }
      const result = applyBatch(ops);
      for (const item of converted.items) {
        const filePath = String(item?.meta?.filePath ?? '').trim();
        if (filePath !== '' && (item.type === 'note' || item.type === 'text')) knownFileContents.set(filePath, String(item.text ?? ''));
      }
      return json(response, 200, {
        ok: true,
        value: {
          mode: converted.kind,
          created: converted.items.filter((item) => item.type !== 'edge').length,
          edges: converted.items.filter((item) => item.type === 'edge').length,
          warnings: converted.warnings ?? [],
          revision: result.revision,
          errors: result.errors,
        },
      });
    }
    if (action === 'tags-all' || action === 'search-all') {
      const query = String(payload?.query ?? '').trim().toLowerCase();
      const tagPattern = /(?:^|[\s(（:：])#([\p{L}\p{N}_\-/]{1,40})/gu;
      const tagCounts = new Map();
      const canvases = [];
      const cards = [];
      for (const scene of runtime.library.canvases) {
        const perCanvas = new Map();
        for (const item of Object.values(scene.doc.items)) {
          if (!item || item.type === 'edge' || item.type === 'stroke') continue;
          const text = String(item.text ?? '');
          const pool = [text];
          if (Array.isArray(item.meta?.tags)) pool.push(...item.meta.tags.map((tag) => `#${tag}`));
          for (const value of pool) {
            let match;
            tagPattern.lastIndex = 0;
            while ((match = tagPattern.exec(value)) !== null) {
              const tag = match[1];
              perCanvas.set(tag, (perCanvas.get(tag) ?? 0) + 1);
              tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
            }
          }
          if (action === 'search-all' && query !== '' && cards.length < 60) {
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
        if (perCanvas.size > 0) {
          canvases.push({ id: scene.id, title: scene.doc.title, tags: [...perCanvas.entries()].map(([tag, count]) => ({ tag, count })) });
        }
      }
      if (action === 'tags-all') {
        return json(response, 200, {
          ok: true,
          value: { tags: [...tagCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 120).map(([tag, count]) => ({ tag, count })), canvases },
        });
      }
      const files = [];
      const root = String(payload?.vaultRoot ?? '').trim();
      if (root !== '' && query !== '') {
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
          /* vault unavailable */
        }
      }
      return json(response, 200, { ok: true, value: { cards, files } });
    }
    if (action === 'vault-write-back') {
      const id = String(payload?.id ?? payload?.itemId ?? '').trim();
      const item = runtime.doc.items[id];
      if (!item) return json(response, 200, { ok: false, error: { code: 'canvas/vault-write', message: '找不到该卡片' } });
      if (item.type !== 'note' && item.type !== 'text') {
        return json(response, 200, { ok: false, error: { code: 'canvas/vault-write', message: '只有便签 / 文本卡片可以写回 Markdown' } });
      }
      if (String(item.meta?.filePath ?? '').trim() === '') {
        return json(response, 200, { ok: false, error: { code: 'canvas/vault-write', message: '这张卡片没有绑定本地文件（先从左侧笔记库导入 .md）' } });
      }
      const written = await syncItemFile(item);
      return json(response, 200, {
        ok: true,
        value: {
          id,
          path: written?.path ?? item.meta.filePath,
          unchanged: Boolean(written?.unchanged),
          conflictBackup: written?.conflictBackup ?? '',
          size: written?.size ?? 0,
        },
      });
    }
    if (action === 'ai-providers') {
      return json(response, 200, { ok: true, value: { providers: aiProviders.map(publicProvider) } });
    }
    if (action === 'ai-provider-save') {
      const id = String(payload?.id ?? '').trim();
      const existing = id === '' ? null : aiProviders.find((provider) => provider.id === id) ?? null;
      if (id !== '' && !existing) {
        return json(response, 200, { ok: false, error: { code: 'canvas/ai-provider', message: '找不到要编辑的 AI 接口（可能已被删除）' } });
      }
      const normalized = normalizeProviderConfig(payload ?? {}, existing);
      if (!normalized.ok) return json(response, 200, { ok: false, error: { code: 'canvas/ai-provider', message: normalized.error } });
      if (existing) {
        aiProviders = aiProviders.map((provider) => (provider.id === existing.id ? normalized.provider : provider));
      } else {
        if (aiProviders.length >= AI_MAX_PROVIDERS) {
          return json(response, 200, { ok: false, error: { code: 'canvas/ai-provider', message: `最多只能配置 ${AI_MAX_PROVIDERS} 个 AI 接口` } });
        }
        aiProviders = [...aiProviders, normalized.provider];
      }
      await saveAiProviders();
      return json(response, 200, {
        ok: true,
        value: { providers: aiProviders.map(publicProvider), provider: publicProvider(normalized.provider) },
      });
    }
    if (action === 'ai-provider-delete') {
      const id = String(payload?.id ?? '').trim();
      const next = aiProviders.filter((provider) => provider.id !== id);
      if (next.length === aiProviders.length) {
        return json(response, 200, { ok: false, error: { code: 'canvas/ai-provider', message: '找不到要删除的 AI 接口' } });
      }
      aiProviders = next;
      await saveAiProviders();
      return json(response, 200, { ok: true, value: { providers: aiProviders.map(publicProvider) } });
    }
    if (action === 'ai-provider-test') {
      const id = String(payload?.id ?? '').trim();
      let provider = null;
      if (id !== '') {
        provider = aiProviders.find((entry) => entry.id === id) ?? null;
        if (!provider) return json(response, 200, { ok: false, error: { code: 'canvas/ai-provider', message: '找不到要测试的 AI 接口' } });
        const overrides = normalizeProviderConfig(payload ?? {}, provider);
        if (!overrides.ok) return json(response, 200, { ok: false, error: { code: 'canvas/ai-provider', message: overrides.error } });
        provider = overrides.provider;
      } else {
        const normalized = normalizeProviderConfig(payload ?? {}, null);
        if (!normalized.ok) return json(response, 200, { ok: false, error: { code: 'canvas/ai-provider', message: normalized.error } });
        provider = normalized.provider;
      }
      const tested = await testAiProvider(provider);
      if (!tested.ok) return json(response, 200, { ok: false, error: { code: tested.code ?? 'canvas/ai-test', message: tested.message } });
      return json(response, 200, { ok: true, value: { latencyMs: tested.latencyMs, reply: tested.reply, model: tested.model } });
    }
    if (action === 'models') {
      const fallback = defaultAiProvider();
      return json(response, 200, {
        ok: true,
        value: {
          current: null,
          default: fallback
            ? { source: 'custom', providerId: fallback.id, model: fallback.defaultModel || fallback.models?.[0] || '' }
            : null,
          providers: [],
          customProviders: aiProviders.map(publicProvider),
          failures: aiProviders.length === 0 ? [{ message: '还没有配置自定义 AI 接口' }] : [],
        },
      });
    }
    if (action === 'settings') {
      return json(response, 200, {
        ok: true,
        value: {
          standalone: true,
          canImportDsh: true,
          hostBuild: HOST_BUILD,
          dataLocation: 'file',
          dataPath: DATA_FILE,
          available: existsSync(DATA_FILE),
          dshFile: DSH_STORAGE_FILE,
          dshExists: existsSync(DSH_STORAGE_FILE),
          canvases: runtime.library.canvases.length,
          snapshots: listSnapshots(runtime.library).length,
          currentId: runtime.library.currentId,
          currentTitle: runtime.doc.title,
          ai: aiPublic(),
        },
      });
    }
    if (action === 'settings-save-ai') {
      const cleaned = cleanAiInput(payload);
      if (cleaned.error) return json(response, 200, { ok: false, error: { code: 'canvas/ai-input', message: cleaned.error } });
      ai.baseUrl = cleaned.baseUrl;
      ai.model = cleaned.model;
      if (cleaned.apiKey !== undefined) ai.apiKey = cleaned.apiKey;
      if (payload?.clearKey === true) ai.apiKey = '';
      await saveAiConfig();
      if (ai.baseUrl !== '' && ai.model !== '') {
        if (aiProviders.length === 0) {
          const provider = providerFromLegacyConfig(ai);
          if (provider) {
            aiProviders = [provider];
            await saveAiProviders();
          }
        } else {
          const first = aiProviders[0];
          const models = [...new Set([ai.model, ...(Array.isArray(first.models) ? first.models : [])])].slice(0, 24);
          aiProviders = aiProviders.map((provider, index) =>
            index === 0
              ? {
                  ...provider,
                  baseUrl: ai.baseUrl,
                  models,
                  defaultModel: ai.model,
                  apiKey: ai.apiKey,
                  updatedAt: new Date().toISOString(),
                }
              : provider,
          );
          await saveAiProviders();
        }
      }
      return json(response, 200, { ok: true, value: { ai: aiPublic() } });
    }
    if (action === 'settings-test-ai') {
      const cleaned = cleanAiInput(payload);
      if (cleaned.error) return json(response, 200, { ok: false, error: { code: 'canvas/ai-input', message: cleaned.error } });
      const startedAt = Date.now();
      try {
        const content = await callModel({
          system: '你是连通性测试。只回答一个词：pong',
          user: 'ping',
          maxTokens: 8,
          temperature: 0,
          apiKeyOverride: cleaned.apiKey,
          baseUrlOverride: cleaned.baseUrl,
          modelOverride: cleaned.model,
        });
        return json(response, 200, {
          ok: true,
          value: { latencyMs: Date.now() - startedAt, model: cleaned.model || ai.model, reply: content.slice(0, 40) },
        });
      } catch (error) {
        return json(response, 200, { ok: false, error: { code: 'canvas/ai-test', message: String(error?.message ?? error) } });
      }
    }
    if (action === 'generate') return json(response, 200, await generateWithAi(payload));
    if (action === 'delegate' || action === 'generate-apply') return json(response, 200, AI_UNAVAILABLE);
    if (Object.prototype.hasOwnProperty.call(libraryActions, action)) {
      return json(response, 200, await libraryActions[action](payload));
    }
    return json(response, 200, { ok: false, error: { code: 'canvas/unknown-action', message: `unknown action ${JSON.stringify(action)}` } });
  } catch (error) {
    return json(response, 200, { ok: false, error: { code: 'canvas/host', message: String(error?.message ?? error) } });
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const STATIC_FILES = {
  '/': join(RENDERER, 'index.html'),
  '/index.html': join(RENDERER, 'index.html'),
  '/app.js': join(RENDERER, 'app.js'),
  '/style.css': join(RENDERER, 'style.css'),
  '/client.js': join(HERE, '..', 'packages', 'infinite-canvas', 'client.js'),
  '/react.js': join(HERE, 'node_modules', 'react', 'umd', 'react.production.min.js'),
  '/react-dom.js': join(HERE, 'node_modules', 'react-dom', 'umd', 'react-dom.production.min.js'),
  '/icon.svg': join(HERE, '..', 'packages', 'infinite-canvas', 'icon.svg'),
};

const server = http.createServer(async (request, response) => {
  runtime.lastRequestAt = Date.now();
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${PORT}`);
  if (url.pathname === '/api/canvas.doc') {
    if (request.method !== 'POST') {
      response.writeHead(405, { allow: 'POST' });
      response.end();
      return;
    }
    await handleApi(request, response);
    return;
  }
  const file = STATIC_FILES[url.pathname];
  if (file) {
    try {
      const content = await readFile(file);
      response.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      response.end(content);
    } catch (error) {
      response.writeHead(404);
      response.end('not found');
    }
    return;
  }
  response.writeHead(404);
  response.end('not found');
});

async function main() {
  runtime.library = await loadLibrary();
  runtime.doc = activeScene()?.doc ?? createDoc();
  runtime.entries = [];
  runtime.dirty = true;
  await persist();
  await loadAiConfig();
  await loadAiProviders();
  await migrateLegacyAiConfig();
  if (aiProviders.length > 0) {
    console.log(
      `[canvas-standalone] AI providers: ${aiProviders
        .map((provider) => `${provider.name}(${provider.defaultModel || provider.models?.[0] || '?'})`)
        .join(', ')}`,
    );
  }
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[canvas-standalone] http://127.0.0.1:${PORT}  data=${DATA_FILE}`);
  });
  server.on('error', (error) => {
    console.error('[canvas-standalone] server error:', error?.message ?? error);
    process.exitCode = 1;
  });
  process.on('SIGINT', () => persist().finally(() => process.exit(0)));
  process.on('SIGTERM', () => persist().finally(() => process.exit(0)));
  // The launcher runs this server in the background; stop it once the window has
  // been closed for a while so no stray process keeps the port or the files open.
  setInterval(async () => {
    if (Date.now() - runtime.lastRequestAt < IDLE_EXIT_MS) return;
    try {
      await persist();
    } finally {
      console.log('[canvas-standalone] idle for 20 minutes, shutting down');
      process.exit(0);
    }
  }, 60_000).unref();
}

main().catch((error) => {
  console.error('[canvas-standalone] failed:', error?.stack ?? String(error));
  process.exitCode = 1;
});
