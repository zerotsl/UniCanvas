/**
 * Offline verification for the infinite-canvas bundle.
 * Runs without the Harness: syntax + module-contract + model + store behaviour.
 * Usage: node scripts/verify.mjs
 */
import assert from 'node:assert/strict';
import { readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const bundle = join(here, '..', 'packages', 'infinite-canvas');
const results = [];
const ok = (name) => results.push({ name, status: 'PASS' });
const fail = (name, error) => {
  results.push({ name, status: 'FAIL', error: String(error?.stack ?? error) });
};

async function check(name, fn) {
  try {
    await fn();
    ok(name);
  } catch (error) {
    fail(name, error);
  }
}

/* ---------------------------------------------------------------- *
 * 1. manifest / locale / icon / files
 * ---------------------------------------------------------------- */
await check('manifest + exports + files', async () => {
  const manifest = JSON.parse(await readFile(join(bundle, 'package.json'), 'utf8'));
  assert.equal(manifest.type, 'module');
  assert.ok(manifest.exports['.'], 'exports["."]');
  assert.ok(manifest.exports['./client'], 'exports["./client"]');
  assert.ok(manifest.exports['./locale/*.json'], 'locale export');
  assert.ok(manifest.exports['./icon'], 'icon export');
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml');
  assert.equal(manifest.dsh.client.platform, 'web');
  assert.equal(manifest.dsh.client.immediately, true);
  assert.ok(Array.isArray(manifest.dsh.client.inject));
  for (const relative of [
    manifest.exports['.'],
    manifest.exports['./client'],
    manifest.exports['./icon'],
    manifest.dsh.bundle.patch,
    'locale/zh.json',
    'locale/en.json',
  ]) {
    assert.ok(existsSync(join(bundle, relative)), `missing file ${relative}`);
  }
  for (const file of manifest.files) {
    if (file.includes('*')) continue;
    assert.ok(existsSync(join(bundle, file)), `files[] entry missing on disk: ${file}`);
  }
  for (const language of ['zh', 'en']) {
    const locale = JSON.parse(await readFile(join(bundle, 'locale', `${language}.json`), 'utf8'));
    assert.ok(locale.meta?.title, `${language} meta.title`);
    assert.ok(locale.meta?.description, `${language} meta.description`);
  }
  const icon = await readFile(join(bundle, 'icon.svg'), 'utf8');
  assert.ok(icon.trimStart().startsWith('<svg'), 'icon.svg starts with <svg');
  assert.ok(icon.trimEnd().endsWith('</svg>'), 'icon.svg ends with </svg>');
  assert.ok(!/&(?![a-zA-Z#])/.test(icon), 'icon.svg has no bare ampersands');
  assert.ok(Buffer.byteLength(icon) < 256 * 1024, 'icon under 256 KiB');
  const patch = await readFile(join(bundle, 'cordis.patch.yml'), 'utf8');
  assert.match(patch, /- insert:/);
  assert.match(patch, new RegExp(`name: '${manifest.name}'`));
});

/* ---------------------------------------------------------------- *
 * 2. model behaviour
 * ---------------------------------------------------------------- */
const now = '2026-10-21T00:00:00.000Z';
let model;
await check('import model.js', async () => {
  model = await import(pathToFileURL(join(bundle, 'model.js')).href);
});
if (model) {
  await check('model: createDoc + upsert', async () => {
    const doc = model.createDoc(now);
    assert.equal(doc.rev, 0);
    const result = model.applyOps(doc, [{ op: 'upsert', item: { type: 'note', text: 'hi', x: 10, y: 20 } }], 'ai', now);
    assert.equal(result.doc.rev, 1);
    assert.equal(result.applied.length, 1);
    assert.equal(result.applied[0].item.by, 'ai');
    assert.equal(result.applied[0].item.w, 240);
  });
  await check('model: edges + cascade delete + errors', async () => {
    let doc = model.createDoc(now);
    let step = model.applyOps(doc, [{ op: 'upsert', item: { type: 'note', text: 'a', x: 0, y: 0 } }], 'ai', now);
    doc = step.doc;
    const a = step.applied[0].item.id;
    step = model.applyOps(doc, [{ op: 'upsert', item: { type: 'note', text: 'b', x: 300, y: 0 } }], 'ai', now);
    doc = step.doc;
    const b = step.applied[0].item.id;
    step = model.applyOps(doc, [{ op: 'upsert', item: { type: 'edge', from: a, to: b, label: 'then' } }], 'ai', now);
    doc = step.doc;
    assert.equal(Object.keys(doc.items).length, 3);
    const deleted = model.applyOps(doc, [{ op: 'delete', id: a }], 'ai', now);
    assert.equal(deleted.applied.length, 2, 'node + attached edge removed');
    assert.equal(Object.keys(deleted.doc.items).length, 1);
    const patchMissing = model.applyOps(deleted.doc, [{ op: 'patch', id: 'nope', patch: { text: 'x' } }], 'ai', now);
    assert.equal(patchMissing.errors.length, 1);
    assert.equal(patchMissing.doc.rev, deleted.doc.rev, 'failed op does not bump revision');
    const invalid = model.applyOps(deleted.doc, [{ op: 'upsert', item: { type: 'bogus' } }], 'ai', now);
    assert.equal(invalid.errors.length, 1);
  });
  await check('model: syncPayload delta vs full', async () => {
    const doc = model.createDoc(now);
    doc.rev = 5;
    const log = [{ rev: 5, ops: [{ op: 'upsert', item: { id: 'x' } }], by: 'ai', at: 1 }];
    const delta = model.syncPayload(doc, log, 4);
    assert.equal(delta.full, false);
    assert.equal(delta.ops.length, 1);
    const full = model.syncPayload(doc, log, 0);
    assert.equal(full.full, true);
    assert.ok(full.items);
    const noop = model.syncPayload(doc, log, 5);
    assert.equal(noop.full, false);
    assert.equal(noop.ops, undefined);
  });
  await check('model: placeItems + summarizeDoc + focusViewport', async () => {
    let doc = model.createDoc(now);
    let step = model.applyOps(doc, [{ op: 'upsert', item: { type: 'note', text: 'first', x: 0, y: 0 } }], 'ai', now);
    doc = step.doc;
    const placements = model.placeItems(doc, 3);
    assert.equal(placements.length, 3);
    assert.ok(placements[0].x > 200, 'placement continues to the right of existing content');
    const summary = model.summarizeDoc(doc, { limit: 10 });
    assert.equal(summary.total, 1);
    assert.equal(summary.nextCursor, null);
    assert.ok(Number.isFinite(summary.viewport.visibleWorld.w));
    const target = model.focusViewport(doc, { ids: [Object.keys(doc.items)[0]] });
    assert.ok(target && Number.isFinite(target.cx) && target.zoom >= 0.1 && target.zoom <= 4);
    assert.equal(model.focusViewport(doc, { ids: ['missing'] }), null);
  });
  await check('model: syncPayload dead-end and restart safety', async () => {
    const doc = model.createDoc(now);
    doc.rev = 5;
    // a client that claims a newer revision than the host must get a full resync
    assert.equal(model.syncPayload(doc, [], 9).full, true);
    // an empty log (fresh Host restart) with since < rev must also resync fully
    assert.equal(model.syncPayload(doc, [], 2).full, true);
    // since === rev with an empty log stays a cheap no-op
    const same = model.syncPayload(doc, [], 5);
    assert.equal(same.full, false);
    assert.equal(same.ops, undefined);
  });
  await check('model: inline data URLs are bounded', async () => {
    const big = `data:image/png;base64,${'A'.repeat(300000)}`;
    const small = 'data:image/png;base64,AAAA';
    const doc = model.createDoc(now);
    const result = model.applyOps(
      doc,
      [
        { op: 'upsert', item: { type: 'image', src: big, x: 0, y: 0 } },
        { op: 'upsert', item: { type: 'image', src: small, x: 300, y: 0 } },
        { op: 'upsert', item: { type: 'image', src: 'javascript:alert(1)', x: 600, y: 0 } },
      ],
      'ai',
      now,
    );
    const sources = result.applied.map((op) => op.item.src);
    assert.equal(sources[0], '', 'oversized inline image dropped');
    assert.equal(sources[1], small, 'small inline image kept');
    assert.equal(sources[2], '', 'non-http/data source rejected');
  });
  await check('model: edge geometry and frameId clearing', async () => {
    const doc = model.createDoc(now);
    const result = model.applyOps(
      doc,
      [{ op: 'upsert', item: { type: 'edge', from: 'a', to: 'b' } }],
      'ai',
      now,
    );
    assert.equal(result.applied[0].item.w, 0);
    assert.equal(result.applied[0].item.h, 0);
  });
  await check('model: freehand strokes', async () => {
    const doc = model.createDoc(now);
    const result = model.applyOps(
      doc,
      [{ op: 'upsert', item: { type: 'stroke', x: 100, y: 200, points: [[0, 0], [10, 20], [30, 40]], width: 4 } }],
      'ai',
      now,
    );
    const stroke = result.applied[0].item;
    assert.equal(stroke.type, 'stroke');
    assert.equal(stroke.w, 30, 'bbox width from points');
    assert.equal(stroke.h, 40, 'bbox height from points');
    assert.equal(stroke.width, 4);
    assert.equal(stroke.points.length, 3);
    const moved = model.applyOps(result.doc, [{ op: 'patch', id: stroke.id, patch: { x: 300, y: 400 } }], 'ai', now);
    assert.equal(moved.doc.items[stroke.id].x, 300);
    assert.deepEqual(moved.doc.items[stroke.id].points, [[0, 0], [10, 20], [30, 40]], 'points stay relative when moved');
    const invalid = model.applyOps(result.doc, [{ op: 'upsert', item: { type: 'stroke', points: [] } }], 'ai', now);
    assert.equal(invalid.errors.length, 1, 'empty stroke rejected');
    const summary = model.summarizeDoc(result.doc, {});
    assert.equal(summary.items[0].points, 3, 'summary reports the point count');
  });
  await check('model: agent task cards', async () => {
    const doc = model.createDoc(now);
    const created = model.applyOps(
      doc,
      [{ op: 'upsert', item: { type: 'agent', text: 'Agent1', task: '拆分需求', status: 'running' } }],
      'user',
      now,
    );
    const agent = created.applied[0].item;
    assert.equal(agent.type, 'agent');
    assert.equal(agent.status, 'running');
    assert.equal(agent.task, '拆分需求');
    const patched = model.applyOps(created.doc, [{ op: 'patch', id: agent.id, patch: { status: 'done', agentResult: '完成' } }], 'ai', now);
    assert.equal(patched.doc.items[agent.id].status, 'done');
    assert.equal(patched.doc.items[agent.id].agentResult, '完成');
    const summary = model.summarizeDoc(patched.doc, {});
    assert.equal(summary.items[0].status, 'done');
    assert.equal(summary.items[0].task, '拆分需求');
    const invalid = model.applyOps(doc, [{ op: 'upsert', item: { type: 'agent', status: 'bogus' } }], 'user', now);
    assert.equal(invalid.applied[0].item.status, 'idle', 'invalid status normalized');
    assert.equal(invalid.applied[0].item.w, 440, 'default agent card is born bigger (w)');
    assert.equal(invalid.applied[0].item.h, 340, 'default agent card is born bigger (h)');
    const defaultNote = model.applyOps(doc, [{ op: 'upsert', item: { type: 'note', text: '默认便签' } }], 'user', now);
    assert.equal(defaultNote.applied[0].item.w, 240, 'default sticky note is born bigger (w)');
    assert.equal(defaultNote.applied[0].item.h, 168, 'default sticky note is born bigger (h)');
    const axisDoc = model.applyOps(
      doc,
      [{ op: 'upsert', item: { type: 'axis', text: '时间轴', meta: { axis: { orientation: 'h', min: 2020, max: 2025, step: 1, unit: '年' } } } }],
      'user',
      now,
    );
    assert.equal(axisDoc.applied[0].item.type, 'axis', 'axis items are supported');
    assert.equal(axisDoc.applied[0].item.w, 1200, 'axis is born wide');
    assert.equal(axisDoc.applied[0].item.meta.axis.orientation, 'h', 'axis orientation normalized');
    assert.equal(axisDoc.applied[0].item.meta.axis.ticks, 6, 'axis tick count follows min/max/step');
    assert.equal(axisDoc.applied[0].item.meta.axis.unit, '年', 'axis unit kept');
    const verticalAxis = model.normalizeAxisConfig({ orientation: 'v', min: 1, max: 5, step: 1 });
    assert.equal(verticalAxis.orientation, 'v', 'vertical axis supported');
    assert.equal(verticalAxis.ticks, 5, 'vertical axis ticks computed');
    const withRole = model.applyOps(
      doc,
      [{ op: 'upsert', item: { type: 'agent', text: '研究员', task: '设计访谈', role: '# 角色\n你是一位研究员', output: 'document' } }],
      'user',
      now,
    );
    assert.equal(withRole.applied[0].item.output, 'document', 'document output mode stored');
    assert.ok(withRole.applied[0].item.role.includes('用户研究员') || withRole.applied[0].item.role.includes('研究员'));
    const rolePatched = model.applyOps(withRole.doc, [{ op: 'patch', id: withRole.applied[0].item.id, patch: { role: '# 角色\n你是产品经理', output: 'canvas' } }], 'user', now);
    assert.equal(rolePatched.doc.items[withRole.applied[0].item.id].role, '# 角色\n你是产品经理');
    assert.equal(rolePatched.doc.items[withRole.applied[0].item.id].output, 'canvas');
    const describedRole = model.describeItem(rolePatched.doc.items[withRole.applied[0].item.id]);
    assert.ok(String(describedRole.role).includes('产品经理'), 'role shown in describeItem');
    const projectAgent = model.applyOps(
      created.doc,
      [{ op: 'upsert', item: { type: 'agent', text: '子Agent', task: '做小程序', project: '小程序', parentId: agent.id } }],
      'ai',
      now,
    );
    assert.equal(projectAgent.applied[0].item.project, '小程序', 'project name stored on the child agent');
    assert.equal(projectAgent.applied[0].item.parentId, agent.id, 'parent agent id stored');
    const describedChild = model.describeItem(projectAgent.applied[0].item);
    assert.equal(describedChild.project, '小程序', 'describeItem exposes the project');
    assert.equal(describedChild.parentId, agent.id, 'describeItem exposes the parent');
    const detached = model.applyOps(
      projectAgent.doc,
      [{ op: 'patch', id: projectAgent.applied[0].item.id, patch: { parentId: '' } }],
      'ai',
      now,
    );
    assert.equal(detached.doc.items[projectAgent.applied[0].item.id].parentId, null, 'empty parentId clears to null');
  });
  await check('model: relation graph builder (cards / wiki / tags / canvas edges / same file)', async () => {
    const graph = model.buildRelationGraph({
      cards: [
        { itemId: 'a', canvasId: 'c1', type: 'note', text: '# 项目 A\n\n参考 [[项目 B]] #调研', filePath: 'E:/vault/a.md' },
        { itemId: 'b', canvasId: 'c1', type: 'text', text: '项目 B\n\n#调研' },
        { itemId: 'e', canvasId: 'c1', type: 'edge' },
      ],
      canvasEdges: [{ canvasId: 'c1', from: 'a', to: 'b', label: '然后' }],
      files: [{ rel: 'a.md', path: 'E:/vault/a.md', name: 'a.md', text: '# 项目 A\n\n#调研' }],
    });
    const nodeIds = graph.nodes.map((node) => node.id);
    assert.ok(nodeIds.includes('card:c1:a') && nodeIds.includes('card:c1:b'), 'cards become nodes');
    assert.ok(!nodeIds.includes('card:c1:e'), 'edge items never become nodes');
    const wikiEdge = graph.edges.find((edge) => edge.kind === 'wiki');
    assert.ok(wikiEdge, 'wiki links become edges');
    assert.equal(wikiEdge.source, 'card:c1:a');
    assert.equal(wikiEdge.target, 'card:c1:b', 'wiki links resolve by card title');
    assert.ok(graph.edges.some((edge) => edge.kind === 'canvas' && edge.label === '然后'), 'canvas edges are preserved');
    assert.ok(graph.edges.some((edge) => edge.kind === 'sync'), 'an imported card links to its vault source file');
    assert.ok(nodeIds.includes('tag:调研'), 'hashtags become tag nodes');
    assert.ok(graph.nodes.find((node) => node.id === 'card:c1:a').degree >= 3, 'degree counts every attached edge');
    const noTags = model.buildRelationGraph({
      cards: [
        { itemId: 'a', canvasId: 'c1', type: 'note', text: '项目 A #调研', links: ['项目 B'] },
        { itemId: 'b', canvasId: 'c1', type: 'note', text: '项目 B' },
      ],
      includeTags: false,
      includeOrphans: false,
    });
    assert.ok(!noTags.nodes.some((node) => node.kind === 'tag'), 'tag nodes can be switched off');
    assert.equal(noTags.nodes.find((node) => node.id === 'card:c1:a').degree, 1, 'degree counts the wiki link');
    const capped = model.buildRelationGraph({
      cards: Array.from({ length: 30 }, (_, index) => ({ itemId: `n${index}`, canvasId: 'c1', type: 'note', text: `节点 ${index}` })),
      maxNodes: 12,
    });
    assert.equal(capped.nodes.length, 12, 'node cap applies');
    assert.equal(capped.truncated, true, 'truncation is reported');
    assert.equal(model.relationTextMeta('[[甲|别名]] #tag1').links[0], '甲', 'wiki link aliases are stripped');
    assert.equal(model.relationTextMeta('## 标题\n正文').title, '标题', 'markdown heading becomes the title');
  });
  await check('model: animated GIF inline budget', async () => {
    const gif = `data:image/gif;base64,${'A'.repeat(500000)}`;
    const withGif = model.applyOps(model.createDoc(now), [{ op: 'upsert', item: { type: 'image', src: gif, x: 0, y: 0 } }], 'ai', now);
    assert.equal(withGif.applied[0].item.src, gif, 'large animated GIF kept');
    const png = `data:image/png;base64,${'A'.repeat(500000)}`;
    const withPng = model.applyOps(model.createDoc(now), [{ op: 'upsert', item: { type: 'image', src: png, x: 0, y: 0 } }], 'ai', now);
    assert.equal(withPng.applied[0].item.src, '', 'oversized static PNG still dropped');
  });
  await check('model: canvas library + history snapshots', async () => {
    const legacy = model.createDoc(now);
    legacy.title = '旧画板';
    const library = model.normalizeLibrary(legacy);
    assert.equal(library.canvases.length, 1, 'legacy doc becomes a one-canvas library');
    assert.equal(model.currentScene(library).doc.title, '旧画板');
    assert.equal(library.currentId, library.canvases[0].id);

    const second = model.addCanvas(library, '第二画布');
    assert.ok(second, 'second canvas created');
    assert.equal(library.canvases.length, 2);
    assert.equal(library.currentId, second.id, 'new canvas becomes current');
    assert.equal(second.items && Object.keys(second.items).length, 0, 'new canvas starts empty');

    const firstId = library.canvases[0].id;
    assert.equal(model.switchCanvas(library, firstId).id, firstId, 'switch returns the target doc');
    assert.equal(library.currentId, firstId);
    assert.equal(model.renameCanvas(library, second.id, '项目看板'), true);
    assert.equal(library.canvases[1].doc.title, '项目看板');
    assert.equal(model.renameCanvas(library, second.id, '   '), false, 'blank rename rejected');

    model.switchCanvas(library, second.id);
    const scene = model.currentScene(library);
    scene.doc.items = { a: { id: 'a', type: 'note', x: 0, y: 0, w: 280, h: 200, z: 1, text: '一', color: 'yellow', by: 'user' } };
    const snapshot = model.pushSnapshot(library, '第一版');
    assert.ok(snapshot && snapshot.nodes === 1, 'snapshot records nodes');
    scene.doc.items = {};
    assert.equal(model.listSnapshots(library).length, 1, 'snapshot listed for the active canvas');
    assert.equal(model.restoreSnapshot(library, snapshot.id), true, 'restore succeeds');
    assert.equal(Object.keys(model.currentScene(library).doc.items).length, 1, 'restore brings the snapshot back');
    assert.ok(model.listSnapshots(library).length >= 2, 'pre-restore snapshot auto-saved');
    assert.equal(model.deleteSnapshot(library, snapshot.id), true, 'snapshot delete works');

    const otherId = library.canvases.find((entry) => entry.id !== library.currentId).id;
    assert.equal(model.deleteCanvas(library, otherId), true);
    assert.equal(library.canvases.length, 1, 'canvas deleted');
    assert.equal(model.deleteCanvas(library, library.currentId), true);
    assert.equal(library.canvases.length, 1, 'library always keeps one canvas');
  });
  await check('vault: list a local folder and import .md / .canvas into native items', async () => {
    const vaultModule = await import(pathToFileURL(join(bundle, 'vault.mjs')).href);
    const root = join(here, '..', '.verify-vault');
    await rm(root, { recursive: true, force: true });
    await mkdir(join(root, 'sub'), { recursive: true });
    await writeFile(join(root, 'notes.md'), '# Hello\n\n- point a\n- point b\n', 'utf8');
    await writeFile(
      join(root, 'sub', 'board.canvas'),
      JSON.stringify({
        nodes: [
          { id: 'a', type: 'text', text: 'Obsidian 文本节点', x: 0, y: 0, width: 300, height: 160, color: '3' },
          { id: 'b', type: 'group', label: '区域一', x: -400, y: -200, width: 800, height: 500 },
          { id: 'c', type: 'file', file: '../notes.md', x: 400, y: 0, width: 320, height: 240 },
          { id: 'd', type: 'file', file: '../missing.md', x: 0, y: 300, width: 200, height: 120 },
        ],
        edges: [{ id: 'e1', fromNode: 'a', toNode: 'c', label: '引用' }],
      }),
      'utf8',
    );
    await writeFile(join(root, 'skip.txt'), 'plain text note', 'utf8');
    const listing = await vaultModule.listVault(root);
    assert.ok(listing.files.some((file) => file.rel === 'notes.md' && file.kind === 'text'), 'vault lists markdown files');
    assert.ok(listing.files.some((file) => file.rel === 'sub/board.canvas' && file.kind === 'canvas'), 'vault lists .canvas files');
    const read = await vaultModule.readVaultFile(join(root, 'notes.md'));
    assert.match(read.content, /Hello/, 'vault reads markdown');
    const noteImport = await vaultModule.importVaultPath(join(root, 'notes.md'));
    assert.equal(noteImport.items.length, 1, 'markdown becomes one card');
    assert.equal(noteImport.items[0].type, 'note');
    assert.ok(String(noteImport.items[0].meta.filePath).includes('notes.md'), 'imported card remembers its file path');
    const canvasImport = await vaultModule.importVaultPath(join(root, 'sub', 'board.canvas'));
    // long Markdown imports as a document card (wider + auto height), not a sticky note
    await writeFile(join(root, 'long.md'), '# 长文\n\n' + Array.from({ length: 24 }, (_, index) => `- 第 ${index + 1} 行内容，比较长的一段文字。`).join('\n'), 'utf8');
    const longImport = await vaultModule.importVaultPath(join(root, 'long.md'));
    assert.equal(longImport.items.length, 1);
    assert.equal(longImport.items[0].type, 'text', 'long markdown becomes a document card');
    assert.ok(longImport.items[0].w >= 520, 'document card is wider than a sticky note');
    assert.ok(longImport.items[0].h > 260, 'document card height grows with content');
    assert.ok(longImport.items[0].meta.longDoc === true, 'document card is marked longDoc');
    assert.equal(longImport.items[0].meta.filePath, join(root, 'long.md'), 'document card keeps its file binding');
    // graph scan: notes, wiki links and hashtags (read-only, used by the graph view)
    await writeFile(join(root, 'alpha.md'), '# Alpha 笔记\n\n参见 [[notes]] 和 #调研\n', 'utf8');
    const graphScan = await vaultModule.scanVaultGraph(root);
    assert.ok(graphScan.count >= 3, 'graph scan lists every markdown note');
    const alphaFile = graphScan.files.find((file) => file.rel === 'alpha.md');
    assert.ok(alphaFile, 'graph scan includes the new note');
    assert.equal(alphaFile.title, 'Alpha 笔记', 'first markdown heading becomes the graph title');
    assert.ok(alphaFile.links.includes('notes'), 'wiki links are extracted for the graph');
    assert.ok(alphaFile.tags.includes('调研'), 'hashtags are extracted for the graph');
    assert.equal(graphScan.truncated, false, 'a small vault is not truncated');
    assert.equal(graphScan.files.find((file) => file.rel === 'notes.md').title, 'Hello', 'existing note title read');
    assert.ok(canvasImport.items.filter((item) => item.type !== 'edge').length === 3, 'canvas maps a text node, a group and one embedded markdown file');
    assert.ok(canvasImport.items.some((item) => item.type === 'frame' && item.text === '区域一'), 'group becomes a frame');
    assert.ok(canvasImport.items.some((item) => item.type === 'edge' && item.label === '引用'), 'edges are preserved with labels');
    assert.ok(canvasImport.warnings.some((warning) => String(warning).includes('missing.md')), 'missing embedded files are reported, not fatal');
    const bounds = vaultModule.boundsOfItems(canvasImport.items);
    assert.ok(bounds && bounds.w > 0 && bounds.h > 0, 'imported items expose bounds for focusing');
    // write-back: content update, no-op detection, external-edit conflict backup
    const notePath = join(root, 'notes.md');
    const written = await vaultModule.writeNoteFile(notePath, '# Hello\n\n- point a\n- point b\n-updated\n', {
      knownContent: '# Hello\n\n- point a\n- point b\n',
    });
    assert.equal(written.unchanged, false, 'writeNoteFile writes card text back');
    assert.match(await readFile(notePath, 'utf8'), /-updated/, 'file content reflects the card');
    const same = await vaultModule.writeNoteFile(notePath, '# Hello\n\n- point a\n- point b\n-updated\n', {});
    assert.equal(same.unchanged, true, 'identical text is a no-op');
    await writeFile(notePath, 'external edit\n', 'utf8');
    const conflicted = await vaultModule.writeNoteFile(notePath, 'card wins\n', { knownContent: '# Hello\n\n- point a\n- point b\n-updated\n' });
    assert.ok(conflicted.conflictBackup, 'external edits produce a conflict backup');
    assert.match(String(conflicted.conflictBackup), /\.conflict-.*\.md$/, 'backup name is timestamped');
    assert.equal(await readFile(conflicted.conflictBackup, 'utf8'), 'external edit\n', 'backup keeps the external version');
    assert.equal(await readFile(notePath, 'utf8'), 'card wins\n', 'card text wins after the backup');
    await rm(root, { recursive: true, force: true });
  });
  await check('model: title/focus/viewport ops and log bounds', async () => {
    const doc = model.createDoc(now);
    const titled = model.applyOps(doc, [{ op: 'title', title: '  我的画板  ' }], 'user', now);
    assert.equal(titled.doc.title, '我的画板');
    const focused = model.applyOps(titled.doc, [{ op: 'focus', cx: 100, cy: -50, zoom: 9 }], 'ai', now);
    assert.equal(focused.doc.focus.zoom, 4, 'zoom clamped');
    const viewport = model.applyOps(focused.doc, [{ op: 'viewport', viewport: { cx: 1, cy: 2, zoom: 0.5, vw: 800, vh: 600 } }], 'user', now);
    assert.equal(viewport.doc.viewport.zoom, 0.5);
    let log = [];
    for (let index = 1; index <= 600; index += 1) log = model.appendLog(log, { rev: index, ops: [], by: 'ai', at: index });
    assert.equal(log.length, 400);
    assert.equal(log[log.length - 1].rev, 600);
  });
}

/* ---------------------------------------------------------------- *
 * 3. store behaviour (file fallback; domain branch needs the Host)
 * ---------------------------------------------------------------- */
await check('store: file fallback load/save/close', async () => {
  const temporaryHome = join(here, '..', '.verify-home');
  await rm(temporaryHome, { recursive: true, force: true });
  await mkdir(temporaryHome, { recursive: true });
  const previous = process.env.DSH_HOME;
  process.env.DSH_HOME = temporaryHome;
  try {
    const storeModule = await import(pathToFileURL(join(bundle, 'store.js')).href);
    const modelModule = await import(pathToFileURL(join(bundle, 'model.js')).href);
    assert.equal(storeModule.canvasDataLocation(), join(temporaryHome, 'canvas', 'scene.json'));
    const ctxStub = { get: () => undefined };
    const messages = [];
    const store = await storeModule.createCanvasStore(ctxStub, (message) => messages.push(message));
    const library = await store.load();
    assert.equal(library.canvases.length, 1, 'fresh library has one canvas');
    assert.equal(modelModule.currentScene(library).doc.rev, 0, 'fresh document');
    const written = await readFile(join(temporaryHome, 'canvas', 'scene.json'), 'utf8');
    assert.equal(JSON.parse(written).schema, modelModule.LIBRARY_SCHEMA, 'fresh library persisted on first load');
    const scene = modelModule.currentScene(library);
    scene.doc.rev = 7;
    scene.doc.title = 'saved';
    await store.save(library);
    await store.flush();
    const reloaded = JSON.parse(await readFile(join(temporaryHome, 'canvas', 'scene.json'), 'utf8'));
    assert.equal(reloaded.canvases[0].doc.rev, 7);
    assert.equal(reloaded.canvases[0].doc.title, 'saved');
    const again = await store.load();
    assert.equal(modelModule.currentScene(again).doc.rev, 7, 'reload sees the saved revision');
    // a legacy single document is migrated into a one-canvas library
    await writeFile(
      join(temporaryHome, 'canvas', 'scene.json'),
      JSON.stringify({ schema: 1, id: 'legacy', title: 'legacy board', rev: 3, viewport: { cx: 0, cy: 0, zoom: 1, vw: 1200, vh: 800 }, focus: null, items: {} }),
      'utf8',
    );
    const migrated = await store.load();
    assert.equal(migrated.canvases.length, 1, 'legacy document wrapped into a library');
    assert.equal(modelModule.currentScene(migrated).doc.title, 'legacy board');
    assert.equal(modelModule.currentScene(migrated).doc.rev, 3);
    const migratedDisk = JSON.parse(await readFile(join(temporaryHome, 'canvas', 'scene.json'), 'utf8'));
    assert.ok(Array.isArray(migratedDisk.canvases), 'migrated library written back to disk');
    await store.close();
    await assert.rejects(() => store.save(library), /closed/, 'save after close rejects');
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = previous;
    await rm(temporaryHome, { recursive: true, force: true });
  }
});

/* ---------------------------------------------------------------- *
 * 4. custom AI providers (shared OpenAI-compatible module)
 * ---------------------------------------------------------------- */
await check('ai: provider config normalization, masking and JSON extraction', async () => {
  const ai = await import(pathToFileURL(join(bundle, 'ai.mjs')).href);
  const norm = ai.normalizeProviderConfig({
    name: ' 测试接口 ',
    baseUrl: 'https://api.example.com/v1/',
    apiKey: 'sk-1234567890abcdef',
    models: 'm1, m2\nm1',
    defaultModel: 'm2',
  });
  assert.equal(norm.ok, true, 'valid provider normalized');
  assert.equal(norm.provider.name, '测试接口', 'name trimmed');
  assert.equal(norm.provider.baseUrl, 'https://api.example.com/v1', 'trailing slash trimmed');
  assert.deepEqual(norm.provider.models, ['m1', 'm2'], 'models deduped');
  assert.equal(norm.provider.defaultModel, 'm2', 'default model kept');
  assert.equal(ai.maskApiKey('sk-1234567890abcdef'), 'sk-1••••cdef', 'keys are masked');
  const pub = ai.publicProvider(norm.provider);
  assert.equal('apiKey' in pub, false, 'public provider never exposes the key');
  assert.equal(pub.hasKey, true, 'public provider reports key presence');
  assert.equal(ai.buildChatUrl('https://api.example.com/v1'), 'https://api.example.com/v1/chat/completions', 'chat URL built');
  assert.equal(
    ai.buildChatUrl('https://api.example.com/v1/chat/completions'),
    'https://api.example.com/v1/chat/completions',
    'chat endpoint is not doubled',
  );
  assert.equal(ai.normalizeProviderConfig({ baseUrl: 'ftp://x', models: 'm' }).ok, false, 'non-http URLs rejected');
  assert.equal(ai.normalizeProviderConfig({ baseUrl: 'https://x/v1', models: '' }).ok, false, 'at least one model required');
  const edited = ai.normalizeProviderConfig({ name: '编辑', baseUrl: 'https://x/v2', models: 'm3' }, norm.provider);
  assert.equal(edited.ok, true, 'edit accepted');
  assert.equal(edited.provider.id, norm.provider.id, 'edit keeps the provider id');
  assert.equal(edited.provider.apiKey, 'sk-1234567890abcdef', 'empty key keeps the stored key');
  const cleared = ai.normalizeProviderConfig({ clearKey: true }, norm.provider);
  assert.equal(cleared.provider.apiKey, '', 'clearKey removes the key');
  const legacy = ai.providerFromLegacyConfig({ baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', apiKey: 'sk-old-12345678' });
  assert.ok(legacy, 'legacy single-endpoint config migrates');
  assert.equal(legacy.baseUrl, 'https://api.deepseek.com/v1', 'legacy base URL kept');
  assert.deepEqual(legacy.models, ['deepseek-chat'], 'legacy model kept');
  assert.deepEqual(ai.extractJsonObject('```json\n{"a":1}\n```'), { a: 1 }, 'fenced JSON extracted');
  assert.deepEqual(ai.extractJsonObject('前言 {"nodes":[1]} 结尾'), { nodes: [1] }, 'embedded JSON extracted');
  const unreachable = await ai.testAiProvider(
    ai.normalizeProviderConfig({ name: '死接口', baseUrl: 'http://127.0.0.1:9/v1', models: 'm', apiKey: 'sk-x' }).provider,
  );
  assert.equal(unreachable.ok, false, 'unreachable endpoint reports failure');
  assert.match(String(unreachable.message), /无法连接|超时/);
});

/* ---------------------------------------------------------------- *
 * 4. client module contract (syntax + factory + slot registrations)
 * ---------------------------------------------------------------- */
await check('client: parses, factory returns plugin, registers panel + sidebar entry', async () => {
  const source = await readFile(join(bundle, 'client.js'), 'utf8');
  let captured = null;
  const reactStub = {
    createElement: (...args) => ({ type: 'react-element', args }),
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    useMemo: (factory) => factory(),
    useCallback: (fn) => fn,
    createContext: () => ({}),
  };
  const windowStub = { __ModuleLoader__: { load: (definition) => { captured = definition; } } };
  const documentStub = { baseURI: 'http://127.0.0.1:56311/', createElement: () => ({}), head: { appendChild: () => {} } };
  const navigatorStub = { language: 'zh-CN', clipboard: { writeText: async () => {} } };
  const fetchStub = async () => ({ ok: true, json: async () => ({ ok: true, value: {} }) });
  const evaluate = new Function('window', 'document', 'navigator', 'fetch', 'performance', 'requestAnimationFrame', 'ResizeObserver', 'console', source);
  evaluate(windowStub, documentStub, navigatorStub, fetchStub, { now: () => 0 }, () => 0, undefined, { log() {}, error() {}, warn() {} });
  assert.ok(captured, 'module loader registration captured');
  assert.equal(captured.id, '@local/infinite-canvas');
  assert.equal(typeof captured.factory, 'function');
  const plugin = captured.factory((name) => {
    if (name === 'react') return reactStub;
    throw new Error(`unexpected require(${JSON.stringify(name)})`);
  });
  assert.equal(typeof plugin.apply, 'function');
  assert.ok(Array.isArray(plugin.inject));
  assert.ok(plugin.inject.includes('slots'));
  const registrations = [];
  const localeStub = {
    getLocale: () => ({ id: 'zh-CN' }),
    subscribe: () => () => {},
    bind: () => (key) => key,
  };
  const ctxStub = {
    get: (name) => (name === 'locale' ? localeStub : undefined),
    slots: {
      inject: (key, callback) => {
        const disposer = callback();
        return typeof disposer === 'function' ? disposer : () => {};
      },
      register: (options, component) => {
        registrations.push({ options, component });
        return () => {};
      },
    },
  };
  plugin.apply(ctxStub);
  const main = registrations.find((entry) => entry.options.name === 'main');
  assert.ok(main, 'main slot registered');
  assert.equal(main.options.key, 'infinite-canvas');
  assert.equal(typeof main.component, 'function');
  const sidebar = registrations.find((entry) => entry.options.name === 'sidebar.panellist');
  assert.ok(sidebar, 'sidebar.panellist registered');
  assert.equal(sidebar.options.id, 'infinite-canvas', 'sidebar id matches the main key');
  assert.equal(typeof sidebar.options.order, 'number');
  const label = sidebar.options.label();
  assert.equal(typeof label, 'string');
  assert.ok(label.length > 0);
  assert.equal(typeof sidebar.component, 'function');
  const iconProps = { size: 16, active: true };
  const icon = sidebar.component(iconProps);
  assert.ok(icon, 'sidebar icon renders an element');
  // the panel component must be callable React (it is only invoked by the renderer)
  assert.equal(typeof main.component, 'function');
});

/* ---------------------------------------------------------------- *
 * 4b. client render smoke tests (walks the element tree in one pass)
 * ---------------------------------------------------------------- */
const SEED_ITEMS = {
  'seed-note': {
    id: 'seed-note', type: 'note', x: 0, y: 0, w: 240, h: 168, z: 1,
    text: '你好', color: 'yellow', by: 'user', createdAt: 'x', updatedAt: 'x',
  },
  'seed-target': {
    id: 'seed-target', type: 'note', x: 400, y: 0, w: 240, h: 168, z: 3,
    text: '', color: 'blue', by: 'user', createdAt: 'x', updatedAt: 'x',
  },
  'seed-edge': {
    id: 'seed-edge', type: 'edge', x: 0, y: 0, w: 0, h: 0, z: 2,
    color: 'yellow', from: 'seed-note', to: 'seed-target', by: 'user', createdAt: 'x', updatedAt: 'x',
  },
  'seed-stroke': {
    id: 'seed-stroke', type: 'stroke', x: 0, y: 300, w: 60, h: 40, z: 4,
    points: [[0, 0], [30, 20], [60, 40]], width: 3, color: 'white', by: 'user', createdAt: 'x', updatedAt: 'x',
  },
  'seed-frame': {
    id: 'seed-frame', type: 'frame', x: -820, y: -420, w: 520, h: 380, z: 0,
    text: '画框', color: 'gray', by: 'user', createdAt: 'x', updatedAt: 'x',
  },
  'seed-agent': {
    id: 'seed-agent', type: 'agent', x: 800, y: 0, w: 280, h: 200, z: 6,
    text: 'Agent1', task: '拆分需求', status: 'running', color: 'purple', by: 'user', createdAt: 'x', updatedAt: 'x',
  },
};

async function renderPanelScenario({ selection = [], items = {}, patches = [] } = {}) {
  const source = await readFile(join(bundle, 'client.js'), 'utf8');
  let patched = source.replace(
    'const [selection, setSelection] = useState([]);',
    `const [selection, setSelection] = useState(${JSON.stringify(selection)});`,
  );
  patched = patched.replace('items: {},', `items: ${JSON.stringify(items)},`);
  for (const [find, replace] of patches) patched = patched.replace(find, replace);
  assert.ok(
    patched.includes(`const [selection, setSelection] = useState(${JSON.stringify(selection)});`),
    'selection scenario patch',
  );
  assert.ok(patched.includes(`items: ${JSON.stringify(items)},`), 'items scenario patch');

  let captured = null;
  let renderHooks = null;
  const react = {
    createElement(type, props, ...children) {
      const flat = [];
      const push = (child) => {
        if (Array.isArray(child)) child.forEach(push);
        else if (child !== null && child !== undefined && child !== false && child !== true) flat.push(child);
      };
      children.forEach(push);
      return { type, props: props ?? {}, children: flat };
    },
    useState(initial) {
      const index = renderHooks.index++;
      if (!(index in renderHooks.store)) renderHooks.store[index] = typeof initial === 'function' ? initial() : initial;
      return [renderHooks.store[index], () => {}];
    },
    useRef(initial) {
      const index = renderHooks.index++;
      if (!(index in renderHooks.store)) renderHooks.store[index] = { current: initial };
      return renderHooks.store[index];
    },
    useMemo(factory) {
      return factory();
    },
    useCallback(fn) {
      return fn;
    },
    useEffect() {},
    useLayoutEffect() {},
    createContext: () => ({ Provider: 'Provider', Consumer: 'Consumer' }),
  };
  const windowStub = { __ModuleLoader__: { load: (definition) => { captured = definition; } } };
  const documentStub = { baseURI: 'http://127.0.0.1:56311/', createElement: () => ({}), head: { appendChild: () => {} } };
  const navigatorStub = { language: 'zh-CN', clipboard: { writeText: async () => {} } };
  const evaluate = new Function('window', 'document', 'navigator', 'fetch', 'performance', 'requestAnimationFrame', 'ResizeObserver', 'console', patched);
  evaluate(
    windowStub,
    documentStub,
    navigatorStub,
    async () => ({ ok: true, json: async () => ({ ok: true, value: {} }) }),
    { now: () => 0 },
    () => 0,
    undefined,
    { log() {}, error() {}, warn() {} },
  );
  const plugin = captured.factory((name) => {
    if (name === 'react') return react;
    throw new Error(`unexpected require(${JSON.stringify(name)})`);
  });
  const registrations = [];
  const localeStub = { getSnapshot: () => ({ active: 'zh-CN' }), subscribe: () => () => {}, bind: () => (key) => key };
  plugin.apply({
    get: (name) => (name === 'locale' ? localeStub : undefined),
    slots: {
      inject: (_key, callback) => {
        const disposer = callback();
        return typeof disposer === 'function' ? disposer : () => {};
      },
      register: (options, component) => {
        registrations.push({ options, component });
        return () => {};
      },
    },
  });
  const panel = registrations.find((entry) => entry.options.name === 'main');
  assert.ok(panel, 'panel component registered');

  const hostElements = [];
  let depth = 0;
  const render = (element) => {
    if (element === null || element === undefined || element === false || element === true) return;
    if (Array.isArray(element)) {
      element.forEach(render);
      return;
    }
    if (typeof element !== 'object') return;
    if (typeof element.type === 'function') {
      depth += 1;
      assert.ok(depth < 200, 'render tree too deep (possible recursion)');
      const previous = renderHooks;
      renderHooks = { index: 0, store: [] };
      let output;
      try {
        output = element.type({ ...element.props, children: element.children });
      } finally {
        renderHooks = previous;
        depth -= 1;
      }
      render(output);
      return;
    }
    hostElements.push(element);
    (element.children ?? []).forEach(render);
  };
  render({ type: panel.component, props: {}, children: [] });
  return { hostElements, registrations, render };
}

const classOf = (hostElements) => hostElements.map((element) => element.props.className ?? '').join(' ');

await check('client: panel render pass produces the canvas chrome', async () => {
  const { hostElements, registrations, render } = await renderPanelScenario();
  assert.ok(hostElements.length > 20, `expected a rich tree, rendered ${hostElements.length} host elements`);
  const classes = classOf(hostElements);
  for (const expected of ['dsic-root', 'dsic-bar', 'dsic-stage', 'dsic-world', 'dsic-hint', 'dsic-addtext', 'dsic-tool-label']) {
    assert.ok(classes.includes(expected), `missing ${expected} in rendered tree`);
  }
  const emptyScenario = await renderPanelScenario({
    patches: [['loaded: false,', 'loaded: true,']],
  });
  const emptyClasses = classOf(emptyScenario.hostElements);
  assert.ok(emptyClasses.includes('dsic-empty'), 'empty-canvas onboarding rendered');
  assert.ok(emptyClasses.includes('dsic-empty-modes'), 'onboarding lists the product modes');
  const emptyModeChips = emptyScenario.hostElements.filter(
    (element) => String(element.props.className ?? '') === 'dsic-empty-mode',
  );
  assert.equal(emptyModeChips.length, 3, 'Agent / 通用画布 / 画笔 mode chips rendered');
  const emptyCopy = emptyScenario.hostElements
    .filter((element) => ['dsic-empty-title', 'dsic-empty-body'].includes(String(element.props.className ?? '')))
    .map((element) => element.children.map((child) => (typeof child === 'string' ? child : '')).join(''))
    .join('');
  assert.ok(emptyCopy.includes('通用画布'), 'onboarding title uses the product name');
  const emptyAlias = emptyScenario.hostElements.find(
    (element) => String(element.props.className ?? '') === 'dsic-empty-alias',
  );
  assert.ok(emptyAlias, 'onboarding renders the English product name badge');
  assert.equal(String((emptyAlias.children ?? []).join('')), 'UniCanvas', 'English product name is UniCanvas');
  const enLocale = JSON.parse(await readFile(join(bundle, 'locale', 'en.json'), 'utf8'));
  assert.equal(enLocale.meta.title, 'UniCanvas', 'English locale uses the UniCanvas name');
  const zhLocale = JSON.parse(await readFile(join(bundle, 'locale', 'zh.json'), 'utf8'));
  assert.ok(zhLocale.meta.title.includes('UniCanvas'), 'Chinese locale shows the UniCanvas alias');
  assert.ok(emptyCopy.includes('本地文件可查询的数据库'), 'onboarding describes the local-file database');
  assert.ok(emptyCopy.includes('可视化 Agent 管理分工'), 'onboarding mentions visual agent delegation');
  assert.ok(emptyCopy.includes('灵感一键展示'), 'onboarding mentions one-click inspiration showcase');
  assert.ok(emptyClasses.includes('dsic-empty-status'), 'onboarding shows the cyberpunk terminal status line');
  assert.ok(emptyClasses.includes('dsic-empty-cta'), 'onboarding CTA keeps its neon treatment');
  assert.ok(emptyClasses.includes('dsic-empty-boards'), 'onboarding exposes the canvas/history strip');
  assert.ok(emptyClasses.includes('dsic-empty-newboard'), 'onboarding offers “new canvas” like the initial screen CTA');
  assert.ok(emptyClasses.includes('dsic-empty-savesnap'), 'onboarding offers a snapshot button below the canvas chips');
  const emptySource = await readFile(join(bundle, 'client.js'), 'utf8');
  assert.ok(emptySource.includes('UniCanvas'), 'UniCanvas name is wired into the client copy');
  assert.ok(emptySource.includes('dsic-empty-glitch') && emptySource.includes('dsic-empty-scan'), 'onboarding carries glitch + scanline effects');
  const styleTag = hostElements.find((element) => element.type === 'style');
  assert.ok(styleTag, 'stylesheet element rendered');
  assert.ok(String(styleTag.children?.[0] ?? '').includes('dsic-overlay-editor'), 'overlay editor styles present');
  assert.ok(String(styleTag.children?.[0] ?? '').includes('dsic-plus'), 'plus-bubble styles present');
  const sidebar = registrations.find((entry) => entry.options.name === 'sidebar.panellist');
  render({ type: sidebar.component, props: { size: 18, active: true }, children: [] });
  assert.ok(hostElements.some((element) => element.type === 'svg'), 'sidebar icon renders an svg');
});

await check('client: selected-node and selected-edge render paths (TDZ regression)', async () => {
  const note = await renderPanelScenario({ selection: ['seed-note'], items: SEED_ITEMS });
  const noteClasses = classOf(note.hostElements);
  assert.ok(noteClasses.includes('dsic-node'), 'node rendered');
  assert.ok(noteClasses.includes('dsic-node-text'), 'node text rendered');
  assert.ok(noteClasses.includes('dsic-selectallbtn'), 'toolbar has a one-click select-all button');
  assert.ok(
    note.hostElements.some((element) => String(element.props.title ?? '').includes('同类型')),
    'selection bar offers selecting every node of the same kind',
  );
  assert.ok(noteClasses.includes('dsic-handle'), 'resize handles rendered for the selected node');
  assert.ok(noteClasses.includes('dsic-selectframe'), 'cyberpunk selection frame rendered');
  const selectFrame = note.hostElements.find(
    (element) => String(element.props.className ?? '') === 'dsic-selectframe',
  );
  const selectedNoteCard = note.hostElements.find(
    (element) => String(element.props.className ?? '') === 'dsic-node dsic-note',
  );
  assert.ok(selectFrame && selectedNoteCard, 'selection frame and selected card both rendered');
  assert.equal(String(selectFrame.props.style.width), '100%', 'selection frame fills its own card (can never drift)');
  assert.equal(String(selectFrame.props.style.height), '100%', 'selection frame height fills its own card');
  assert.equal(String(selectFrame.props.style.left), '0', 'selection frame is anchored inside the card');
  assert.ok(String(selectFrame.props.style['--dsic-frame-corner']).endsWith('px'), 'selection frame corner tick sized for the zoom');
  const inlineHandleCount = note.hostElements.filter(
    (element) => String(element.props.className ?? '') === 'dsic-handle',
  ).length;
  assert.equal(inlineHandleCount, 8, 'eight handles are children of the selected card');
  assert.ok(noteClasses.includes('dsic-node-plus'), 'quick-add plus bubble rendered for the selected node');
  const plusButtons = note.hostElements.filter((element) => String(element.props.className ?? '') === 'dsic-node-plus');
  assert.equal(plusButtons.length, 4, 'four quick-add bubbles around the selected node');
  const plusSides = plusButtons.map((element) => element.props['data-side']).sort();
  assert.deepEqual(plusSides, ['bottom', 'left', 'right', 'top'], 'bubbles on every side of the node');
  assert.ok(noteClasses.includes('dsic-selbar-colors'), 'colour section laid out horizontally');
  assert.ok(noteClasses.includes('dsic-selbar'), 'selection bar rendered');
  assert.ok(noteClasses.includes('dsic-selbar-count'), 'selection count shown');
  assert.ok(noteClasses.includes('dsic-selbar-kind'), 'selection type shown');
  const kindChip = note.hostElements.find((element) => String(element.props.className ?? '') === 'dsic-selbar-kind');
  assert.ok(kindChip && String(kindChip.children.join('')).includes('你好'), 'selection bar names the selected item');
  assert.ok(noteClasses.includes('dsic-selbar-label'), 'colour section labelled');
  const selButtons = note.hostElements.filter((element) => String(element.props.className ?? '') === 'dsic-selbtn');
  assert.ok(selButtons.length >= 3, 'labelled selection actions rendered');
  assert.ok(
    selButtons.some((element) => String(element.props.title ?? '').includes('Enter')),
    'edit action hints its shortcut',
  );
  assert.ok(noteClasses.includes('dsic-twinkle'), 'starry twinkle layer rendered');
  assert.ok(noteClasses.includes('dsic-scanlines'), 'CRT scanline overlay rendered');
  assert.ok(noteClasses.includes('dsic-vignette'), 'edge vignette rendered');
  assert.ok(noteClasses.includes('dsic-hud'), 'HUD corner brackets rendered');
  const clientSourceForCss = await readFile(join(bundle, 'client.js'), 'utf8');
  assert.ok(!clientSourceForCss.includes('will-change:transform'), 'world layer is never promoted (no re-raster flashes)');
  assert.ok(!/\.dsic-edges\{[^}]*drop-shadow/.test(clientSourceForCss), 'no whole-canvas glow filter on the edge layer');
  assert.ok(clientSourceForCss.includes("className: 'dsic-scanbeam'"), 'the slow scan-beam is kept');
  assert.ok(clientSourceForCss.includes('animation:dsic-scan 11s linear infinite'), 'scan-beam sweeps every 11s');
  assert.ok(
    clientSourceForCss.includes('rgba(148,163,184,.035) 0px'),
    'CRT scanline texture kept at 1px/3px @ .035',
  );
  assert.ok(
    !clientSourceForCss.includes('animation:dsic-twinkle'),
    'no looping twinkle animation',
  );
  assert.ok(
    !clientSourceForCss.includes('data-auto-height'),
    'auto-height mutation is gone: card geometry is always the stored w/h',
  );
  const stageElement = note.hostElements.find((element) => String(element.props.className ?? '') === 'dsic-stage');
  assert.ok(stageElement, 'canvas stage rendered');
  const starBackground = String(stageElement.props.style.backgroundImage ?? '');
  assert.ok(
    (starBackground.match(/radial-gradient\(circle/g) ?? []).length >= 3,
    'three dot layers keep the black/white star field',
  );
  assert.ok(starBackground.includes('rgba(255,255,255,.55)'), 'big white stars are the brightest layer');
  assert.ok(starBackground.includes('rgba(34,211,238,.055)'), 'cyan neon grid layer present');
  assert.ok(starBackground.includes('rgba(168,85,247,.05)'), 'violet major-grid layer present');
  assert.ok(noteClasses.includes('dsic-hud-tag'), 'HUD corner readouts rendered');
  assert.ok(!noteClasses.includes('dsic-nixie'), 'no duplicate world-line meter inside the default skin HUD');

  const groupedNote = await renderPanelScenario({
    selection: ['seed-note'],
    items: {
      ...SEED_ITEMS,
      'seed-note': { ...SEED_ITEMS['seed-note'], frameId: 'seed-frame' },
    },
  });
  const groupedClasses = classOf(groupedNote.hostElements);
  assert.ok(groupedClasses.includes('dsic-selbar-kind'), 'selection bar shows the owning frame');
  assert.ok(
    groupedNote.hostElements.some((element) => String(element.props.title ?? '') === '移出画框'),
    'grouped node can be detached from its frame',
  );
  const groupedAgent = await renderPanelScenario({
    selection: ['seed-agent'],
    items: {
      ...SEED_ITEMS,
      'seed-agent': { ...SEED_ITEMS['seed-agent'], frameId: 'seed-frame' },
    },
  });
  const groupedAgentCardClasses = classOf(groupedAgent.hostElements);
  assert.ok(groupedAgentCardClasses.includes('dsic-agent-parent'), 'agent card shows the frame it belongs to');

  const frameSelection = await renderPanelScenario({ selection: ['seed-frame'], items: SEED_ITEMS });
  const frameClasses = classOf(frameSelection.hostElements);
  assert.ok(frameClasses.includes('dsic-handle'), 'frame selection still shows resize handles');
  assert.ok(
    frameSelection.hostElements.some((element) => String(element.props.title ?? '') === '贴合内容'),
    'frame selection offers fit-to-content',
  );
  assert.ok(
    frameSelection.hostElements.some((element) => String(element.props.title ?? '').includes('收进这个画框')),
    'frame selection offers gather-nodes (frame and Agent move together)',
  );
  assert.ok(
    frameSelection.hostElements.some((element) => String(element.props.title ?? '').includes('连带')),
    'frame selection has a carry-contents toggle (off = only the frame moves)',
  );

  const realDocUnused = null;
  const edge = await renderPanelScenario({ selection: ['seed-edge'], items: SEED_ITEMS });
  const edgeClasses = classOf(edge.hostElements);
  assert.ok(edgeClasses.includes('dsic-edge'), 'edge rendered');
  assert.ok(edgeClasses.includes('dsic-plus'), 'quick-add plus bubble rendered for the selected connector');
  assert.ok(!edgeClasses.includes('dsic-handle'), 'no resize handles for an edge');
  const toolbarSource = await readFile(join(bundle, 'client.js'), 'utf8');
  assert.ok(/\.dsic-btn\{[^}]*height:38px/.test(toolbarSource), 'every toolbar button shares one height');
  assert.ok(/\.dsic-tool\{[^}]*height:38px/.test(toolbarSource), 'tool buttons share the same height');
  assert.ok(/\.dsic-addtext\{[^}]*height:38px/.test(toolbarSource), 'labelled toolbar buttons share the same height');
  assert.ok(
    toolbarSource.includes('.dsic-tool-label{font-size:11px') && toolbarSource.includes('.dsic-addtext span{font-size:11px'),
    'toolbar labels share one font size',
  );
  assert.ok(/\.dsic-tool\{[^}]*border:0 !important/.test(toolbarSource), 'tool buttons render without the light frame');
  assert.ok(/\.dsic-addtext\{[^}]*border-color:transparent/.test(toolbarSource), 'labelled buttons render without the light frame');
  assert.ok(
    edge.hostElements.some((element) => String(element.props.id ?? '').startsWith('dsic-arrow-')),
    'each edge gets a matching arrow marker',
  );
  const edgeLine = edge.hostElements.find((element) => String(element.props.className ?? '') === 'dsic-edge-line');
  assert.ok(edgeLine, 'solid edge line rendered');
  assert.ok(/^#[0-9a-f]{6}$/i.test(String(edgeLine.props.stroke ?? '')), 'edge stroke is a solid colour, not a gradient');
  assert.ok(!String(edgeLine.props.stroke).includes('url('), 'no gradient paint on edges');
  assert.ok(edgeClasses.includes('dsic-edge-scan'), 'edges carry the scan-line texture');
  assert.ok(edgeClasses.includes('dsic-edge-port'), 'connectors have circuit-style port dots');
  assert.ok(edgeClasses.includes('dsic-edge-flow'), 'selected edge shows the flowing energy dash');
  const edgeGeometry = (result) => {
    const line = result.hostElements.find((element) => String(element.props.className ?? '') === 'dsic-edge-line');
    return line ? line.props.d : null;
  };
  const normalEdgePath = edgeGeometry(edge);
  const draggedEdge = await renderPanelScenario({
    selection: ['seed-edge'],
    items: SEED_ITEMS,
    patches: [['const [dragDraft, setDragDraft] = useState(null);', "const [dragDraft, setDragDraft] = useState({ 'seed-note': { x: 140, y: 120 } });"]],
  });
  assert.ok(normalEdgePath, 'edge path available');
  assert.notEqual(edgeGeometry(draggedEdge), normalEdgePath, 'edge follows the node while it is being dragged');

  const multi = await renderPanelScenario({ selection: ['seed-note', 'seed-target'], items: SEED_ITEMS });
  const multiClasses = classOf(multi.hostElements);
  assert.ok(multiClasses.includes('dsic-selbar'), 'multi-selection bar rendered');
  assert.ok(!multiClasses.includes('dsic-plus'), 'no plus bubble for multi-selection');

  const stroke = await renderPanelScenario({ selection: ['seed-stroke'], items: SEED_ITEMS });
  const strokeClasses = classOf(stroke.hostElements);
  assert.ok(strokeClasses.includes('dsic-stroke'), 'freehand stroke rendered');
  assert.ok(strokeClasses.includes('dsic-stroke-hit'), 'stroke hit target rendered');
  assert.ok(strokeClasses.includes('dsic-handle'), 'resize handles for a selected stroke');
  assert.ok(strokeClasses.includes('dsic-plus'), 'quick-add plus for a selected stroke');

  const agent = await renderPanelScenario({ selection: ['seed-agent'], items: SEED_ITEMS });
  const agentClasses = classOf(agent.hostElements);
  assert.ok(agentClasses.includes('dsic-agent'), 'agent card rendered');
  assert.ok(agentClasses.includes('dsic-agent-status'), 'agent status pill rendered');
  assert.ok(agentClasses.includes('dsic-agent-run'), 'agent run button rendered');
  assert.ok(agentClasses.includes('dsic-agent-task'), 'agent task text rendered');
  const agentPlusBubbles = agent.hostElements.filter((element) => String(element.props.className ?? '') === 'dsic-node-plus');
  assert.equal(agentPlusBubbles.length, 4, 'agent selection keeps the four quick-add bubbles');
  assert.ok(agentClasses.includes('dsic-handle'), 'agent cards are resizable too');
  assert.ok(agentClasses.includes('dsic-selectframe'), 'agent selection uses the same neon frame');
  const agentFrameEl = agent.hostElements.find(
    (element) => String(element.props.className ?? '') === 'dsic-selectframe',
  );
  assert.equal(String(agentFrameEl.props.style.width), '100%', 'agent frame is a child of its own card (no offset possible)');
  const agentHandles = agent.hostElements.filter(
    (element) => String(element.props.className ?? '') === 'dsic-handle',
  );
  assert.equal(agentHandles.length, 8, 'agent card owns its eight resize handles');
  assert.ok(
    agentHandles.every((element) => String(element.props.style.transform ?? '').includes('translate(-50%, -50%)')),
    'handles are centred on their own card corners/edges',
  );
  const scaledAgent = await renderPanelScenario({
    selection: ['seed-agent'],
    items: {
      ...SEED_ITEMS,
      'seed-agent': { ...SEED_ITEMS['seed-agent'], w: 560, h: 420, meta: { sizeBase: { w: 280, h: 210 } } },
    },
  });
  const scaledCard = scaledAgent.hostElements.find((element) =>
    String(element.props.className ?? '').includes('dsic-agent-scale'),
  );
  assert.ok(scaledCard, 'agent content is wrapped in a proportional scale layer');
  assert.match(String(scaledCard.props.style.transform), /^scale\((1\.9|2\.0|2)\)$/, 'agent text scales with the card box');
  assert.equal(String(scaledCard.props.style.width), '280', 'scale layer layout width compensates the transform');
  assert.equal(String(scaledCard.props.style.height), '210', 'scale layer layout height compensates the transform');
  const scaledNote = await renderPanelScenario({
    selection: ['seed-note'],
    items: {
      ...SEED_ITEMS,
      'seed-note': { ...SEED_ITEMS['seed-note'], w: 480, h: 336, meta: { sizeBase: { w: 240, h: 168 } } },
    },
  });
  const scaledNoteEl = scaledNote.hostElements.find(
    (element) => String(element.props.className ?? '') === 'dsic-node dsic-note',
  );
  assert.ok(scaledNoteEl, 'note rendered');
  assert.ok(Number(scaledNoteEl.props.style['--dsic-text-scale']) > 1.9, 'note type scales with the note box');
  const hugeNote = await renderPanelScenario({
    selection: ['seed-note'],
    items: {
      ...SEED_ITEMS,
      'seed-note': { ...SEED_ITEMS['seed-note'], w: 2400, h: 1680, meta: { sizeBase: { w: 240, h: 168 } } },
    },
  });
  const hugeNoteEl = hugeNote.hostElements.find(
    (element) => String(element.props.className ?? '') === 'dsic-node dsic-note',
  );
  assert.ok(
    Number(hugeNoteEl.props.style['--dsic-text-scale']) >= 3.9,
    'very large sticky notes scale by width (capped so tall/long cards stay readable)',
  );
  const agentCard = agent.hostElements.find(
    (element) => String(element.props.className ?? '') === 'dsic-node dsic-agent',
  );
  assert.ok(agentCard, 'agent card element found');
  assert.equal(String(agentCard.props.style.height), String(SEED_ITEMS['seed-agent'].h), 'agent card renders the stored height exactly');
  assert.equal(agentCard.props['data-auto-height'], undefined, 'auto height is fully removed');
  assert.equal(agentCard.props.style['--dsic-agent-accent'], '#E5DCFF', 'agent card exposes its colour as an accent');
  assert.ok(String(agentCard.props.style['--dsic-agent-accent-line']).startsWith('rgba('), 'agent accent line derived');
  assert.ok(agentClasses.includes('dsic-agent-avatar-ring'), 'running agent shows the spinning ring');
  assert.ok(agentClasses.includes('dsic-agent-typing'), 'running agent shows the typing dots');

  const idleAgent = await renderPanelScenario({
    items: {
      ...SEED_ITEMS,
      'seed-agent': { ...SEED_ITEMS['seed-agent'], status: 'idle', task: '' },
    },
  });
  const idleAgentClasses = classOf(idleAgent.hostElements);
  assert.ok(idleAgentClasses.includes('dsic-agent-quip'), 'idle agent shows a playful quip');
  assert.ok(idleAgentClasses.includes('dsic-agent-empty-emoji'), 'idle agent shows the mascot');
  assert.ok(idleAgentClasses.includes('dsic-agent-hint'), 'idle agent shows the usage hint');

  const roleAgent = await renderPanelScenario({
    selection: ['seed-agent'],
    items: {
      ...SEED_ITEMS,
      'seed-agent': {
        ...SEED_ITEMS['seed-agent'],
        status: 'idle',
        task: '设计访谈提纲',
        role: '# 角色\n你是一位做了 200 场用户访谈的用户研究员',
        output: 'document',
      },
    },
  });
  const roleAgentClasses = classOf(roleAgent.hostElements);
  assert.ok(roleAgentClasses.includes('dsic-agent-role'), 'agent card shows the role badge');
  assert.ok(roleAgentClasses.includes('dsic-agent-role-text'), 'role badge shows the preview');

  const roleDialog = await renderPanelScenario({
    items: SEED_ITEMS,
    patches: [
      [
        'const [roleEditor, setRoleEditor] = useState(null);',
        "const [roleEditor, setRoleEditor] = useState({ id: 'seed-agent', role: '# 角色', output: 'document' });",
      ],
    ],
  });
  const roleDialogClasses = classOf(roleDialog.hostElements);
  assert.ok(roleDialogClasses.includes('dsic-role-card'), 'role dialog rendered');
  assert.ok(roleDialogClasses.includes('dsic-role-input'), 'role textarea rendered');
  assert.ok(roleDialogClasses.includes('dsic-role-example'), 'example-role button rendered');

  const promptDialog = await renderPanelScenario({
    items: SEED_ITEMS,
    patches: [['const [promptOpen, setPromptOpen] = useState(null);', "const [promptOpen, setPromptOpen] = useState('manage');"]],
  });
  const promptClasses = classOf(promptDialog.hostElements);
  assert.ok(promptClasses.includes('dsic-prompt-card'), 'prompt library dialog rendered');
  assert.ok(promptClasses.includes('dsic-prompt-new'), 'new-prompt button rendered');
  assert.ok(promptClasses.includes('dsic-prompt-examples'), 'example-prompt button rendered');
  assert.ok(promptClasses.includes('dsic-prompt-input'), 'prompt editor textarea rendered');
  assert.ok(promptClasses.includes('dsic-prompt-generate'), 'prompt dialog offers a generate action');
  const promptGenerate = promptDialog.hostElements.find(
    (element) => String(element.props.className ?? '').includes('dsic-prompt-generate'),
  );
  assert.ok(promptGenerate, 'generate button rendered');
  const promptSource = await readFile(join(bundle, 'client.js'), 'utf8');
  assert.ok(promptSource.includes('promptGenerate'), 'generate copy wired into the prompt dialog');

  const projectMenu = await renderPanelScenario({
    items: {
      ...SEED_ITEMS,
      'seed-project-frame': {
        id: 'seed-project-frame',
        type: 'frame',
        x: -1600,
        y: 0,
        w: 1000,
        h: 720,
        z: 0,
        text: '项目 1',
        color: 'blue',
        meta: { workspacePath: 'E:\\projects\\docs' },
        by: 'user',
        createdAt: 'x',
        updatedAt: 'x',
      },
      'seed-project-agent': {
        id: 'seed-project-agent',
        type: 'agent',
        x: -1560,
        y: 70,
        w: 440,
        h: 340,
        z: 1,
        text: '项目 1',
        color: 'blue',
        project: '项目 1',
        frameId: 'seed-project-frame',
        task: '',
        status: 'idle',
        by: 'user',
        createdAt: 'x',
        updatedAt: 'x',
      },
      'seed-project-empty': {
        id: 'seed-project-empty',
        type: 'frame',
        x: -2400,
        y: 0,
        w: 1000,
        h: 720,
        z: 0,
        text: '项目 2',
        color: 'blue',
        meta: { kind: 'project' },
        by: 'user',
        createdAt: 'x',
        updatedAt: 'x',
      },
    },
    patches: [['const [projectsOpen, setProjectsOpen] = useState(false);', 'const [projectsOpen, setProjectsOpen] = useState(true);']],
  });
  const projectMenuClasses = classOf(projectMenu.hostElements);
  assert.ok(projectMenuClasses.includes('dsic-projectbtn'), 'toolbar has a projects button');
  assert.ok(projectMenuClasses.includes('dsic-projects'), 'project menu opens');
  assert.ok(projectMenuClasses.includes('dsic-projects-new'), 'project menu offers a new independent project');
  const projectRows = projectMenu.hostElements.filter((element) => String(element.props.className ?? '') === 'dsic-project-row');
  assert.equal(projectRows.length, 2, 'project frames (even temporarily empty) are listed in the menu');
  assert.ok(
    String(projectRows[0].props.title ?? '').includes('项目'),
    'project row carries a jump title',
  );
  assert.ok(projectMenuClasses.includes('dsic-project-open'), 'linked project offers opening its local folder');

  const linkedFrame = await renderPanelScenario({
    selection: ['seed-frame'],
    items: {
      ...SEED_ITEMS,
      'seed-frame': { ...SEED_ITEMS['seed-frame'], text: '项目 1', meta: { workspacePath: 'E:\\projects\\docs' } },
    },
  });
  const linkedFrameClasses = classOf(linkedFrame.hostElements);
  assert.ok(linkedFrameClasses.includes('dsic-frame-open'), 'project frame shows the open-workspace button');
  const pathDialog = await renderPanelScenario({
    items: SEED_ITEMS,
    patches: [
      [
        'const [pathDialog, setPathDialog] = useState(null);',
        "const [pathDialog, setPathDialog] = useState({ id: 'seed-frame', value: 'E:\\\\projects\\\\docs' });",
      ],
    ],
  });
  const pathDialogClasses = classOf(pathDialog.hostElements);
  assert.ok(pathDialogClasses.includes('dsic-path-card'), 'local path dialog rendered');
  assert.ok(pathDialogClasses.includes('dsic-path-input'), 'path input rendered');

  const modelDialog = await renderPanelScenario({
    items: SEED_ITEMS,
    patches: [
      ['const [modelOpen, setModelOpen] = useState(false);', 'const [modelOpen, setModelOpen] = useState(true);'],
      [
        'const [modelCatalogData, setModelCatalogData] = useState(null);',
        "const [modelCatalogData, setModelCatalogData] = useState({ current: { provider: 'p1', model: 'm1' }, default: { provider: 'p1', model: 'm1' }, providers: [{ id: 'p1', name: 'Provider 1', models: [{ id: 'm1', name: 'Model 1' }, { id: 'm2', name: 'Model 2' }] }], customProviders: [{ id: 'p_custom', name: 'Ollama 本地', baseUrl: 'http://127.0.0.1:11434/v1', models: ['qwen2.5:14b', 'llama3.1:8b'], defaultModel: 'qwen2.5:14b', params: { temperature: 0.4, maxTokens: 2400, timeoutMs: 90000 }, hasKey: true, keyMasked: 'sk-a••••z', enabled: true }], failures: [] });",
      ],
      [
        'const [modelSel, setModelSel] = useState(() => loadModelChoice());',
        "const [modelSel, setModelSel] = useState({ source: 'custom', providerId: 'p_custom', model: 'qwen2.5:14b', providerName: 'Ollama 本地' });",
      ],
    ],
  });
  const modelClasses = classOf(modelDialog.hostElements);
  assert.ok(modelClasses.includes('dsic-modelbtn'), 'toolbar has a model picker button');
  assert.ok(modelClasses.includes('dsic-model-card'), 'model picker dialog rendered');
  const modelRows = modelDialog.hostElements.filter((element) => String(element.props.className ?? '') === 'dsic-model-row');
  assert.ok(modelRows.length >= 3, 'model rows rendered (DSH models + custom endpoints)');
  assert.ok(modelClasses.includes('dsic-model-provider'), 'models grouped by provider');
  assert.ok(modelClasses.includes('dsic-model-custom-head'), 'custom endpoints section rendered');
  assert.ok(modelClasses.includes('dsic-model-provider-row'), 'custom endpoint header rendered');
  assert.ok(modelClasses.includes('dsic-model-actions'), 'custom endpoint has test/edit/delete actions');
  assert.ok(modelClasses.includes('dsic-model-act'), 'custom endpoint action buttons rendered');
  assert.ok(
    modelDialog.hostElements.some((element) => String(element.props.className ?? '').includes('dsic-model-row') && String(element.props['data-active']) === 'true'),
    'the saved custom model is marked as the current choice',
  );
  assert.ok(clientSourceForCss.includes("callCanvas('ai-provider-save'"), 'client can save a custom AI endpoint');
  assert.ok(clientSourceForCss.includes("callCanvas('ai-provider-delete'"), 'client can delete a custom AI endpoint');
  assert.ok(clientSourceForCss.includes("callCanvas('ai-provider-test'"), 'client can test a custom AI endpoint');
  assert.ok(clientSourceForCss.includes('function AiProviderDialog'), 'custom endpoint editor exists');
  assert.ok(clientSourceForCss.includes('AI_PROVIDER_PRESETS'), 'endpoint presets offered in the editor');

  const helpDialog = await renderPanelScenario({
    items: SEED_ITEMS,
    patches: [['const [helpOpen, setHelpOpen] = useState(false);', 'const [helpOpen, setHelpOpen] = useState(true);']],
  });
  const helpClasses = classOf(helpDialog.hostElements);
  assert.ok(helpClasses.includes('dsic-help-card'), 'help dialog rendered');
  const helpSections = helpDialog.hostElements.filter(
    (element) => String(element.props.className ?? '') === 'dsic-help-section',
  );
  assert.equal(helpSections.length, 11, 'help covers text, canvas, boards/history, projects, media/model, axis, graph, batch, what’s-new, shortcuts and AI');
  assert.ok(
    clientSourceForCss.includes('helpUpdateTitle') && clientSourceForCss.includes('helpUpdateBody'),
    'help documents the latest update list',
  );
  assert.ok(clientSourceForCss.includes('工具栏「↺ 历史」'), 'help points at the renamed history toolbar button');

  const skinDialog = await renderPanelScenario({
    items: SEED_ITEMS,
    patches: [['const [skinOpen, setSkinOpen] = useState(false);', 'const [skinOpen, setSkinOpen] = useState(true);']],
  });
  const skinClasses = classOf(skinDialog.hostElements);
  assert.ok(skinClasses.includes('dsic-skin-card'), 'skin dialog rendered');
  assert.ok(skinClasses.includes('dsic-skin-grid'), 'skin preset grid rendered');
  const skinItems = skinDialog.hostElements.filter((element) => String(element.props.className ?? '') === 'dsic-skin-item');
  assert.ok(skinItems.length >= 6, 'built-in background skins rendered');
  assert.ok(skinClasses.includes('dsic-decor-grid'), 'decoration grid rendered next to the skins');
  const decorItems = skinDialog.hostElements.filter(
    (element) => String(element.props.className ?? '') === 'dsic-skin-item dsic-decor-item',
  );
  assert.equal(decorItems.length, 4, 'whale, rainbow cat, aurora and Steins;Gate decorations offered');
  const decorGlyphs = skinDialog.hostElements.filter((element) => String(element.props.className ?? '') === 'dsic-skin-thumb-glyph');
  assert.equal(decorGlyphs.length, 4, 'decoration tiles show glyph thumbnails');
  assert.ok(skinClasses.includes('dsic-skin-custom'), 'custom background section rendered');
  assert.ok(clientSourceForCss.includes('DECOR_PRESETS'), 'decoration presets are defined');
  assert.ok(clientSourceForCss.includes('function DecorFx'), 'decoration canvas renderer exists');
  assert.ok(clientSourceForCss.includes('function SteinsGateDecor'), 'Steins;Gate decoration overlay exists');

  const decorScene = await renderPanelScenario({
    items: SEED_ITEMS,
    patches: [
      ['const [decor, setDecor] = useState(() => loadDecor());', "const [decor, setDecor] = useState(['whale', 'aurora']);"],
    ],
  });
  assert.ok(classOf(decorScene.hostElements).includes('dsic-decorfx'), 'particle / aurora decorations mount a canvas behind the content');

  const steinsGateScene = await renderPanelScenario({
    items: SEED_ITEMS,
    patches: [
      ['const [decor, setDecor] = useState(() => loadDecor());', "const [decor, setDecor] = useState(['steinsgate']);"],
    ],
  });
  assert.ok(
    classOf(steinsGateScene.hostElements).includes('dsic-decor-sg'),
    'Steins;Gate world-line meter renders above the content',
  );
  const sgDigits = steinsGateScene.hostElements.filter((element) => String(element.props.className ?? '') === 'dsic-decor-sg-cell');
  assert.ok(sgDigits.length >= 6, 'Steins;Gate nixie digits render inside the decoration');
  const sgText = sgDigits
    .map((element) => (Array.isArray(element.children) ? element.children.join('') : String(element.children ?? '')))
    .join('')
    .replace(/\D/g, '');
  assert.ok(sgText.includes('1048596'), 'Steins;Gate decoration keeps the 1.048596 worldline');
  assert.ok(
    classOf(steinsGateScene.hostElements).includes('dsic-decor-sg-caption'),
    'Steins;Gate world-line caption rendered',
  );

  const bigEditorScenario = await renderPanelScenario({
    items: SEED_ITEMS,
    patches: [
      [
        'const [bigEditor, setBigEditor] = useState(null);',
        "const [bigEditor, setBigEditor] = useState({ id: 'seed-agent', field: 'task', value: '把需求拆成三张便签' });",
      ],
    ],
  });
  const bigEditorClasses = classOf(bigEditorScenario.hostElements);
  assert.ok(bigEditorClasses.includes('dsic-bigeditor'), 'standalone big editor rendered');
  assert.ok(bigEditorClasses.includes('dsic-bigeditor-input'), 'big editor textarea rendered');
  assert.ok(bigEditorClasses.includes('dsic-bigeditor-foot'), 'big editor actions rendered');

  const delegationView = await renderPanelScenario({
    selection: ['seed-agent'],
    items: {
      ...SEED_ITEMS,
      'seed-agent': {
        ...SEED_ITEMS['seed-agent'],
        status: 'done',
        task: '把新产品拆成三个项目',
        project: '品牌官网',
        agentResult: '已完成 3 个节点',
      },
      'seed-child': {
        id: 'seed-child',
        type: 'agent',
        x: 800,
        y: 420,
        w: 360,
        h: 280,
        z: 8,
        text: '小程序',
        project: '小程序',
        parentId: 'seed-agent',
        task: '做小程序',
        status: 'done',
        color: 'blue',
        by: 'ai',
        createdAt: 'x',
        updatedAt: 'x',
      },
    },
  });
  const delegationClasses = classOf(delegationView.hostElements);
  assert.ok(delegationClasses.includes('dsic-agent-project-name'), 'project chip rendered on the agent card');
  assert.ok(delegationClasses.includes('dsic-agent-children'), 'coordinator card shows child progress');
  assert.ok(delegationClasses.includes('dsic-agent-delegate'), 'coordinator card offers delegation');
  assert.ok(delegationClasses.includes('dsic-agent-runchildren'), 'coordinator card offers running its children');
  const childView = await renderPanelScenario({
    selection: ['seed-child'],
    items: {
      'seed-parent': {
        id: 'seed-parent',
        type: 'agent',
        x: -600,
        y: 0,
        w: 360,
        h: 280,
        z: 6,
        text: '协调者',
        parentId: 'upstream-agent',
        task: '拆项目',
        status: 'idle',
        color: 'purple',
        by: 'ai',
        createdAt: 'x',
        updatedAt: 'x',
      },
      'seed-child': {
        id: 'seed-child',
        type: 'agent',
        x: 0,
        y: 0,
        w: 360,
        h: 280,
        z: 8,
        text: '小程序',
        project: '小程序',
        parentId: 'seed-parent',
        task: '做小程序',
        status: 'idle',
        color: 'blue',
        by: 'ai',
        createdAt: 'x',
        updatedAt: 'x',
      },
    },
  });
  const childClasses = classOf(childView.hostElements);
  assert.ok(childClasses.includes('dsic-agent-parent'), 'child card shows the coordinator it belongs to');
  assert.ok(!childClasses.includes('dsic-agent-delegate'), 'child cards cannot delegate further');

  const delegateDialog = await renderPanelScenario({
    items: SEED_ITEMS,
    patches: [
      [
        'const [delegateFor, setDelegateFor] = useState(null);',
        "const [delegateFor, setDelegateFor] = useState({ id: 'seed-agent' });",
      ],
      ["const [delegateText, setDelegateText] = useState('');", "const [delegateText, setDelegateText] = useState('品牌官网、小程序');"],
    ],
  });
  const delegateDialogClasses = classOf(delegateDialog.hostElements);
  assert.ok(delegateDialogClasses.includes('dsic-delegate-card'), 'delegate dialog rendered');
  assert.ok(delegateDialogClasses.includes('dsic-delegate-input'), 'delegate textarea rendered');
  assert.ok(delegateDialogClasses.includes('dsic-delegate-parent'), 'delegate dialog names the coordinator');

  assert.ok(clientSourceForCss.includes("callCanvas('delegate'"), 'panel sends the delegate action to the host');
  assert.ok(clientSourceForCss.includes('contextIds: projectContextIds(child)'), 'child runs send their project context ids');
  assert.ok(clientSourceForCss.includes('agentDelegateTip'), 'delegation copy is wired into the card');
  assert.ok(clientSourceForCss.includes('--dsic-text-scale'), 'sticky/text type scale variable is wired');
  assert.ok(clientSourceForCss.includes('calc(15px * var(--dsic-text-scale,1))'), 'note font size follows the box');
  assert.ok(clientSourceForCss.includes('sizeBase'), 'resizing records the content base size');
  assert.ok(clientSourceForCss.includes('contentScaleOf(item, rect)'), 'agent scale derived from its rendered rect');
  assert.ok(clientSourceForCss.includes('const createProject = useCallback'), 'panel can create an independent project');
  assert.ok(clientSourceForCss.includes('projectNoteHint'), 'project workspace seeds a hint note');
  assert.ok(clientSourceForCss.includes('focusProjectFrame'), 'project jump helper wired');
  assert.ok(clientSourceForCss.includes('projectsAnchor'), 'project menu is anchored under its toolbar button');
  assert.ok(
    clientSourceForCss.includes('const right = Math.round(current.cx - frameW / 2)'),
    'new project lands in the current view, not off-screen',
  );
  assert.ok(clientSourceForCss.includes("callCanvas('open-path'"), 'panel can open a linked local path through the host');
  assert.ok(clientSourceForCss.includes('dsic-frame-open'), 'project frame renders the open-workspace button');
  assert.ok(clientSourceForCss.includes("callCanvas('models'"), 'model catalog fetched from the host');
  assert.ok(clientSourceForCss.includes('model: modelSel ?? undefined'), 'generation requests carry the chosen model');
  assert.ok(clientSourceForCss.includes('dsic-model-card'), 'model picker dialog is wired');
  assert.ok(clientSourceForCss.includes('helpProjectTitle'), 'help documents the project / Agent workflow');
  assert.ok(clientSourceForCss.includes('helpMediaTitle'), 'help documents media, prompts, skin and model');
  assert.ok(clientSourceForCss.includes('helpBulkTitle'), 'help documents multi-select and batch actions');
  assert.ok(clientSourceForCss.includes('helpKeysTitle'), 'help ships a keyboard shortcut sheet');
  assert.ok(clientSourceForCss.includes('关联本地路径'), 'help mentions linking a local path');
  assert.ok(clientSourceForCss.includes('gatherFrameNodes'), 'frame can gather its nodes (including Agents)');
  assert.ok(clientSourceForCss.includes('detachFromFrame'), 'a node can be detached from its frame');
  assert.ok(clientSourceForCss.includes('dsic-selectframe'), 'cyberpunk selection frame is wired');
  assert.ok(clientSourceForCss.includes('.dsic-handle::after'), 'resize handles use the neon cyberpunk style');
  assert.ok(
    clientSourceForCss.includes("commit([{ op: 'upsert', item: { ...item, ...rect, meta: nextMeta, updatedAt } }]);"),
    'resizing commits only the grabbed node — siblings are untouched',
  );
  assert.ok(
    clientSourceForCss.includes('gesture.startWorld.x - defaults.w / 2'),
    'a clicked Agent is created centred on the click point (never below it)',
  );
  assert.ok(
    clientSourceForCss.includes('const isClick = dragScreen < 6'),
    'click detection is measured in screen pixels, so low zoom no longer turns clicks into drags',
  );
  assert.ok(
    !clientSourceForCss.includes('overlaps(finalRect)'),
    'new Agents are not silently shifted away from the click point',
  );
  assert.ok(
    clientSourceForCss.includes("showChrome: tool === 'select' && createDraft === null"),
    'selection frame and handles hide while a create tool is active',
  );
  assert.ok(
    clientSourceForCss.includes('.dsic-node[data-selected="true"]{overflow:visible}'),
    'selected cards expose their own frame and handles outside their box',
  );
  const createToolScenario = await renderPanelScenario({
    selection: ['seed-agent'],
    items: SEED_ITEMS,
    patches: [["const [tool, setTool] = useState('select');", "const [tool, setTool] = useState('agent');"]],
  });
  const createToolClasses = classOf(createToolScenario.hostElements);
  assert.ok(!createToolClasses.includes('dsic-selectframe'), 'no stale selection frame while creating an Agent');
  assert.ok(!createToolClasses.includes('dsic-handle'), 'no stale resize handles while creating an Agent');
  assert.ok(
    clientSourceForCss.includes('z: highestZ(store.doc.items)'),
    'new nodes get their own z and never shift existing cards',
  );
  assert.ok(
    clientSourceForCss.includes('const hostFrame = frameContainingPoint('),
    'new nodes created inside a frame are attached to it',
  );
  assert.ok(
    clientSourceForCss.includes("mode: 'agent-place'"),
    'the Agent card is created on mouse-down at the pressed point (it cannot drift on release)',
  );
  assert.ok(
    clientSourceForCss.includes('openBigEditor(gesture.id)'),
    'the large editor opens after the press point has been fixed',
  );
  assert.ok(
    clientSourceForCss.includes('dsic-place-marker'),
    'a crosshair marks the exact world point that was placed (drift diagnostics)',
  );
  assert.ok(
    clientSourceForCss.includes('frameCarryRef.current || Boolean(event.altKey)'),
    'frames carry their contents only when the toggle (or Alt) is active',
  );
  assert.ok(
    clientSourceForCss.includes("raw === null ? true : raw !== '0'"),
    'dragging a frame carries its contents by default (mouse drag moves the whole block)',
  );
  assert.ok(
    clientSourceForCss.includes('Agent cards never use the inline overlay'),
    'Agent editing is routed to the large panel everywhere',
  );
  assert.ok(
    clientSourceForCss.includes('lastCanvasPointRef.current = {'),
    'the panel remembers the exact canvas point the user clicked',
  );
  assert.ok(
    clientSourceForCss.includes('agentPlaceHint'),
    'Agent tool arms placement first: click the canvas, then the editor opens',
  );
  assert.ok(clientSourceForCss.includes('const selectAllItems = useCallback'), 'one-click select-all handler wired');
  assert.ok(clientSourceForCss.includes('const selectSameKind = useCallback'), 'select-same-kind handler wired');
  assert.ok(clientSourceForCss.includes('selectAllDone'), 'select-all reports the ticked count');
  assert.ok(
    !clientSourceForCss.includes('createAgentAtPoint(lastPoint)'),
    'pressing Agent no longer creates/opens anything before the placement click',
  );
  assert.ok(
    clientSourceForCss.includes('anchor:\n                scope === '),
    'AI generation anchors at the remembered click point instead of the viewport centre',
  );

  // canvas library UI: one panel with the canvas list on top and history below
  assert.ok(clientSourceForCss.includes("callCanvas('canvas-create'"), 'client can create canvases');
  assert.ok(clientSourceForCss.includes("callCanvas('canvas-switch'"), 'client can switch canvases');
  assert.ok(clientSourceForCss.includes("callCanvas('history-save'"), 'client can save history snapshots');
  assert.ok(clientSourceForCss.includes("callCanvas('history-restore'"), 'client can restore history snapshots');
  assert.ok(clientSourceForCss.includes('docId: store.docId'), 'polling sends the active canvas id for atomic switching');
  const boardsScenario = await renderPanelScenario({
    patches: [
      ['const [boardsOpen, setBoardsOpen] = useState(false);', 'const [boardsOpen, setBoardsOpen] = useState(true);'],
      [
        'const [boardList, setBoardList] = useState([]);',
        "const [boardList, setBoardList] = useState([{ id: 'c1', title: '我的画板', nodes: 3, updatedAt: new Date().toISOString() }, { id: 'c2', title: '项目看板', nodes: 0, updatedAt: new Date().toISOString() }]);",
      ],
      [
        'const [historyList, setHistoryList] = useState([]);',
        "const [historyList, setHistoryList] = useState([{ id: 'h1', at: Date.now(), label: '第一版', nodes: 4 }, { id: 'h2', at: Date.now() - 3600000, label: '', nodes: 2 }]);",
      ],
    ],
  });
  const boardsClasses = classOf(boardsScenario.hostElements);
  assert.ok(boardsClasses.includes('dsic-boardbtn'), 'toolbar has a history/canvas switcher button');
  const boardButtonText = (() => {
    const node = boardsScenario.hostElements.find(
      (element) => String(element.props.className ?? '') === 'dsic-btn dsic-addtext dsic-boardbtn',
    );
    const textOf = (value) => {
      if (typeof value === 'string' || typeof value === 'number') return String(value);
      if (Array.isArray(value)) return value.map(textOf).join('');
      if (value && typeof value === 'object') return textOf(value.children ?? []);
      return '';
    };
    return textOf(node);
  })();
  assert.ok(boardButtonText.includes('历史'), 'the toolbar entry is labelled 历史');
  const boardButtonCss = /\.dsic-boardbtn[^']*\{[^}]*flex:0 0 auto/.exec(clientSourceForCss);
  assert.ok(boardButtonCss, 'the history toolbar button never shrinks its label away');
  assert.ok(
    /\.dsic-boardbtn span[^']*\{[^}]*overflow:visible/.test(clientSourceForCss),
    'the history label is not clipped when the toolbar is crowded',
  );
  assert.ok(boardsClasses.includes('dsic-boards'), 'canvas list panel renders');
  assert.ok(boardsClasses.includes('dsic-history'), 'history section renders inside the same panel');
  assert.ok(boardsClasses.includes('dsic-panel-sep'), 'canvas list and history are visually separated');
  const boardRows = boardsScenario.hostElements.filter((element) => String(element.props.className ?? '') === 'dsic-board-row');
  assert.equal(boardRows.length, 2, 'both canvases listed');
  assert.equal(
    boardsScenario.hostElements.filter((element) => String(element.props.className ?? '').includes('dsic-board-act')).length,
    4,
    'each canvas offers rename + delete',
  );
  assert.equal(
    boardsScenario.hostElements.filter((element) => String(element.props.className ?? '') === 'dsic-history-item').length,
    2,
    'snapshots listed below the canvases',
  );
  assert.ok(
    !boardsClasses.includes('dsic-historybtn'),
    'the separate history toolbar button is gone (history moved under the canvas list)',
  );

  // minimap: content blocks + view rect, plus a collapsed-state restore button
  const minimapScenario = await renderPanelScenario({ items: SEED_ITEMS });
  const minimapClasses = classOf(minimapScenario.hostElements);
  assert.ok(minimapClasses.includes('dsic-minimap'), 'minimap rendered when the canvas has content');
  assert.ok(minimapClasses.includes('dsic-minimap-svg'), 'minimap draws an SVG');
  assert.ok(minimapClasses.includes('dsic-minimap-view'), 'minimap marks the current viewport');
  assert.ok(
    minimapScenario.hostElements.filter((element) => String(element.props.className ?? '') === 'dsic-minimap-item').length > 0,
    'minimap draws one block per node',
  );
  const minimapCollapsed = await renderPanelScenario({
    items: SEED_ITEMS,
    patches: [
      [
        'const [minimapOpen, setMinimapOpen] = useState(() => loadMinimapOpen());',
        'const [minimapOpen, setMinimapOpen] = useState(false);',
      ],
    ],
  });
  assert.ok(classOf(minimapCollapsed.hostElements).includes('dsic-minimap-mini'), 'collapsed minimap leaves a reopen button');
  assert.ok(clientSourceForCss.includes("const MINIMAP_KEY = 'dsic.minimap.v1'"), 'minimap visibility is persisted locally');
  assert.ok(clientSourceForCss.includes('const minimapJumpTo = useCallback'), 'minimap click/drag recentres the viewport');
  assert.ok(clientSourceForCss.includes('setPointerCapture'), 'dragging the minimap captures the pointer');

  // settings dialog: appearance toggles, language, data path, mode/build info
  const settingsScenario = await renderPanelScenario({
    items: SEED_ITEMS,
    patches: [
      ['const [settingsOpen, setSettingsOpen] = useState(false);', 'const [settingsOpen, setSettingsOpen] = useState(true);'],
      [
        'const [settingsInfo, setSettingsInfo] = useState(null);',
        "const [settingsInfo, setSettingsInfo] = useState({ standalone: true, canImportDsh: true, hostBuild: 'standalone-0.1', dataPath: 'E:/draw/data/library.json', available: true, canvases: 3, snapshots: 2, currentTitle: 'demo' });",
      ],
    ],
  });
  const settingsClasses = classOf(settingsScenario.hostElements);
  assert.ok(settingsClasses.includes('dsic-settings-card'), 'settings dialog rendered');
  assert.ok(settingsClasses.includes('dsic-settings-row'), 'settings rows rendered');
  assert.ok(settingsClasses.includes('dsic-settings-toggle'), 'settings toggles rendered');
  assert.ok(settingsClasses.includes('dsic-settings-path'), 'settings shows the storage path');
  assert.ok(settingsClasses.includes('dsic-settings-builds'), 'settings shows build info');
  assert.ok(
    settingsScenario.hostElements.filter((element) => String(element.props.className ?? '') === 'dsic-settings-row').length >= 4,
    'settings covers appearance, language, data and about',
  );
  assert.ok(clientSourceForCss.includes("callCanvas('settings'"), 'settings dialog reads host capability info');
  assert.ok(clientSourceForCss.includes('function applyLangPref'), 'language preference is persisted');
  assert.ok(clientSourceForCss.includes("localStorage.getItem('dsic.lang.v1')"), 'language override is honoured on boot');
  assert.ok(clientSourceForCss.includes("callCanvas('settings-save-ai'"), 'settings can persist an AI model API');
  assert.ok(clientSourceForCss.includes("callCanvas('settings-test-ai'"), 'settings can test the AI model API');
  assert.ok(clientSourceForCss.includes('dsic-settings-aifields'), 'settings renders the AI model API form');
  const aiSettingsScenario = await renderPanelScenario({
    items: SEED_ITEMS,
    patches: [
      ['const [settingsOpen, setSettingsOpen] = useState(false);', 'const [settingsOpen, setSettingsOpen] = useState(true);'],
      [
        'const [settingsInfo, setSettingsInfo] = useState(null);',
        "const [settingsInfo, setSettingsInfo] = useState({ standalone: true, canImportDsh: true, hostBuild: 'standalone-0.2', dataPath: 'E:/draw/data/library.json', available: true, canvases: 3, snapshots: 2, currentTitle: 'demo', ai: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', hasKey: true, keyMasked: 'sk-a••••wxyz' } });",
      ],
      [
        'const [settingsAi, setSettingsAi] = useState({ baseUrl: \'\', model: \'\', key: \'\', testing: false, result: \'\' });',
        "const [settingsAi, setSettingsAi] = useState({ baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', key: '', testing: false, result: '连接成功 · 120ms · deepseek-chat' });",
      ],
    ],
  });
  const aiSettingsClasses = classOf(aiSettingsScenario.hostElements);
  assert.ok(aiSettingsClasses.includes('dsic-settings-aifields'), 'AI settings form rendered');
  assert.ok(aiSettingsClasses.includes('dsic-settings-input'), 'AI settings inputs rendered');
  assert.ok(aiSettingsClasses.includes('dsic-settings-aiactions'), 'AI save / test / clear buttons rendered');
  assert.ok(aiSettingsClasses.includes('dsic-settings-airesult'), 'AI connection test result rendered');
  assert.equal(
    aiSettingsScenario.hostElements.filter((element) => element.type === 'input').length >= 3,
    true,
    'AI settings exposes base URL, model and key inputs',
  );

  // left sidebar: vault browser (Obsidian-style), tags and search live on the left
  assert.ok(clientSourceForCss.includes("callCanvas('vault-list'"), 'sidebar can browse a local vault folder');
  assert.ok(clientSourceForCss.includes("callCanvas('vault-import'"), 'sidebar can import vault files onto the canvas');
  assert.ok(clientSourceForCss.includes('function loadSidebarOpen'), 'sidebar visibility is persisted');
  const sidebarScenario = await renderPanelScenario({
    items: SEED_ITEMS,
    patches: [
      [
        'const [vaultFiles, setVaultFiles] = useState([]);',
        "const [vaultFiles, setVaultFiles] = useState([{ path: 'E:/notes/a.md', rel: 'a.md', name: 'a.md', dir: '', ext: '.md', kind: 'text', size: 1200 }, { path: 'E:/notes/b.canvas', rel: 'b.canvas', name: 'b.canvas', dir: '', ext: '.canvas', kind: 'canvas', size: 800 }]);",
      ],
    ],
  });
  const sidebarClasses = classOf(sidebarScenario.hostElements);
  assert.ok(sidebarClasses.includes('dsic-sidebar'), 'left sidebar rendered in the canvas');
  assert.ok(sidebarClasses.includes('dsic-sidebar-rail'), 'left sidebar rail rendered');
  assert.ok(sidebarClasses.includes('dsic-sidebar-panel'), 'left sidebar panel open by default');
  assert.ok(sidebarClasses.includes('dsic-vault-input'), 'vault path input rendered');
  assert.equal(
    sidebarScenario.hostElements.filter((element) => String(element.props.className ?? '') === 'dsic-vault-row').length,
    2,
    'vault files are listed in the sidebar',
  );
  assert.ok(sidebarClasses.includes('dsic-vault-icon'), 'vault rows carry a kind icon');
  assert.ok(clientSourceForCss.includes('dsic-tag-chip'), 'tag chips rendered on the left');
  assert.ok(clientSourceForCss.includes('dsic-search-row'), 'search results rendered on the left');
  assert.ok(clientSourceForCss.includes('const canvasTags = useMemo'), 'hashtags are extracted from card text');
  assert.ok(clientSourceForCss.includes('const tagDimmed ='), 'tag filter dims non-matching cards');

  // write-back, backlinks and the quick switcher
  assert.ok(clientSourceForCss.includes("callCanvas('vault-write-back'"), 'client can write a card back to its Markdown file');
  assert.ok(clientSourceForCss.includes('const writeBackItem = useCallback'), 'write-back handler wired to the selection bar');
  assert.ok(clientSourceForCss.includes('const linkData = useMemo'), 'wiki links / backlinks are indexed');
  assert.ok(clientSourceForCss.includes("key === 'o'"), 'Ctrl/⌘+O opens the quick switcher');
  assert.ok(clientSourceForCss.includes('function openQuickSwitcher') || clientSourceForCss.includes('const openQuickSwitcher = useCallback'), 'quick switcher handler exists');
  assert.ok(clientSourceForCss.includes('dsic-link-row'), 'backlink rows rendered in the left sidebar');
  assert.ok(clientSourceForCss.includes('dsic-quick-row'), 'quick switcher rows rendered');
  const linksScenario = await renderPanelScenario({
    items: SEED_ITEMS,
    selection: [Object.keys(SEED_ITEMS)[0]],
    patches: [
      ['const [sidebarTab, setSidebarTab] = useState(\'vault\');', "const [sidebarTab, setSidebarTab] = useState('links');"],
    ],
  });
  const linksClasses = classOf(linksScenario.hostElements);
  assert.ok(linksClasses.includes('dsic-links-list') || linksClasses.includes('dsic-sidebar-empty'), 'links tab renders');
  const quickScenario = await renderPanelScenario({
    items: SEED_ITEMS,
    patches: [
      ['const [quickOpen, setQuickOpen] = useState(false);', 'const [quickOpen, setQuickOpen] = useState(true);'],
      ['const [quickQuery, setQuickQuery] = useState(\'\');', "const [quickQuery, setQuickQuery] = useState('');"],
    ],
  });
  const quickClasses = classOf(quickScenario.hostElements);
  assert.ok(quickClasses.includes('dsic-quick-card'), 'quick switcher overlay renders');
  assert.ok(quickClasses.includes('dsic-quick-input'), 'quick switcher has a search input');
  assert.ok(quickScenario.hostElements.some((element) => String(element.props.className ?? '') === 'dsic-quick-row'), 'quick switcher lists cards');

  // long-text sticky notes: Markdown-ish rendering, scrolling, big editor, conversion
  assert.ok(clientSourceForCss.includes('function MarkdownLite'), 'document cards render lightweight Markdown');
  assert.ok(clientSourceForCss.includes('function renderInlineMarkdown'), 'Markdown inline emphasis is rendered');
  assert.ok(clientSourceForCss.includes('const LONG_CARD_CHARS = 320'), 'long-card threshold exists');
  assert.ok(clientSourceForCss.includes('isLongCardText(editValueOf(item))'), 'long notes open the big editor instead of the inline one');
  assert.ok(clientSourceForCss.includes('estimateDocHeight'), 'document card height is auto-estimated');
  assert.ok(clientSourceForCss.includes('dsic-md-h1'), 'Markdown heading styles exist');
  assert.ok(clientSourceForCss.includes('dsic-note[data-long'), 'long notes become scrollable');
  assert.ok(clientSourceForCss.includes('convertToDoc'), 'long notes can be converted to document cards');
  const longNoteText = '# 长文标题\n\n**数据快照**：这是一段很长的内容，用来测试便签在超长文本下的显示行为。\n\n> 一句话结论：长文本不应该被便利贴直接裁掉。\n\n- 第一条\n- 第二条\n- 第三条\n' + '更多内容。'.repeat(80);
  const longNoteScenario = await renderPanelScenario({
    items: { n_long: { id: 'n_long', type: 'note', x: 0, y: 0, w: 420, h: 260, z: 1, text: longNoteText, color: 'yellow', by: 'user' } },
    selection: ['n_long'],
  });
  const longClasses = classOf(longNoteScenario.hostElements);
  assert.ok(longClasses.includes('dsic-md'), 'long sticky note content is rendered as Markdown blocks');
  assert.ok(longClasses.includes('dsic-note'), 'long sticky note still renders as a note card');
  assert.ok(
    longNoteScenario.hostElements.some((element) => String(element.props.className ?? '') === 'dsic-node dsic-note' && element.props['data-long'] === 'true'),
    'long sticky note is marked data-long for scrolling',
  );

  // axis: number line / timeline cards with clickable ticks
  assert.ok(clientSourceForCss.includes("item.type === 'axis'"), 'axis nodes render');
  assert.ok(clientSourceForCss.includes('function axisTicks'), 'axis ticks are computed');
  assert.ok(clientSourceForCss.includes('h(AxisDialog'), 'axis configuration dialog is wired');
  assert.ok(clientSourceForCss.includes('onAxisTick'), 'clicking an axis tick creates a card');
  // the axis entry lives in the LEFT sidebar (below the search icon), not in the top toolbar
  assert.ok(clientSourceForCss.includes("sidebarTab === 'axis'"), 'the axis tab lives in the left sidebar');
  assert.ok(clientSourceForCss.includes('dsic-axis-insert'), 'the left sidebar offers inserting an axis');
  assert.ok(clientSourceForCss.includes('dsic-axis-main'), 'the left sidebar lists the canvas axes');
  assert.ok(clientSourceForCss.includes("h(Icon, { name: 'axis', size: 17 })"), 'the rail has an axis icon');
  assert.ok(clientSourceForCss.includes("meta: { axisValue: tick.value, axisId: axisItem.id }"), 'tick-created cards remember their axis');
  const axisScenario = await renderPanelScenario({
    items: {
      seedAxis: {
        id: 'seedAxis',
        type: 'axis',
        x: 0,
        y: 0,
        w: 1200,
        h: 150,
        text: '时间轴',
        color: 'gray',
        meta: { axis: { orientation: 'h', min: 2020, max: 2025, step: 1, ticks: 6, unit: '年', title: '时间轴' } },
      },
    },
    selection: ['seedAxis'],
  });
  const axisClasses = classOf(axisScenario.hostElements);
  assert.ok(axisClasses.includes('dsic-axis'), 'axis card rendered');
  assert.equal(
    axisScenario.hostElements.filter((element) => String(element.props.className ?? '') === 'dsic-axis-label').length,
    6,
    'one label per axis tick',
  );
  assert.ok(
    axisScenario.hostElements.filter((element) => String(element.props.className ?? '') === 'dsic-axis-label').every((element) => String(element.props.title ?? element.title ?? '').includes('年')),
    'axis tick labels carry the unit',
  );
  const axisTabScenario = await renderPanelScenario({
    items: {
      seedAxis: {
        id: 'seedAxis',
        type: 'axis',
        x: 0,
        y: 0,
        w: 1200,
        h: 150,
        text: '时间轴',
        color: 'gray',
        meta: { axis: { orientation: 'h', min: 2020, max: 2025, step: 1, ticks: 6, unit: '年', title: '时间轴' } },
      },
      seedTickCard: {
        id: 'seedTickCard', type: 'note', x: 0, y: 40, w: 240, h: 168, z: 2,
        text: '2024年', color: 'yellow', meta: { axisValue: 2024, axisId: 'seedAxis' },
      },
    },
    patches: [
      ['const [sidebarTab, setSidebarTab] = useState(\'vault\');', "const [sidebarTab, setSidebarTab] = useState('axis');"],
    ],
  });
  const axisTabClasses = classOf(axisTabScenario.hostElements);
  assert.ok(axisTabClasses.includes('dsic-axis-insert'), 'the axis tab renders its insert button');
  assert.equal(
    axisTabScenario.hostElements.filter((element) => String(element.props.className ?? '') === 'dsic-axis-row').length,
    1,
    'the axis tab lists the canvas axes',
  );
  assert.ok(axisTabClasses.includes('dsic-axis-row-count'), 'tick-created cards are counted per axis');
  assert.ok(
    !axisTabScenario.hostElements.some((element) => String(element.props.title ?? '') === 'axisTitle'),
    'the axis insert entry is no longer in the top toolbar',
  );
  // relation graph: left sidebar entry + full-screen force-directed view
  assert.ok(clientSourceForCss.includes('function GraphView'), 'force-directed relation graph view exists');
  assert.ok(clientSourceForCss.includes("callCanvas('graph-data'"), 'graph data comes from the host');
  assert.ok(clientSourceForCss.includes("h(Icon, { name: 'graph', size: 17 })"), 'the rail has a graph icon below the axis icon');
  assert.ok(
    clientSourceForCss.includes('stepPhysics') && clientSourceForCss.includes('drawGraph'),
    'the graph uses a hand-written force simulation + canvas 2D renderer',
  );
  assert.ok(clientSourceForCss.includes('GRAPH_EDGE_COLORS'), 'every edge kind is colour-coded');
  assert.ok(clientSourceForCss.includes('dsic-graph-canvas'), 'graph canvas styles rendered');
  assert.ok(clientSourceForCss.includes('saveGraphLayout'), 'graph layout is remembered');
  const graphScenario = await renderPanelScenario({
    items: SEED_ITEMS,
    patches: [['const [graphOpen, setGraphOpen] = useState(false);', 'const [graphOpen, setGraphOpen] = useState(true);']],
  });
  const graphClasses = classOf(graphScenario.hostElements);
  assert.ok(graphClasses.includes('dsic-graph'), 'graph overlay rendered');
  assert.ok(graphClasses.includes('dsic-graph-bar'), 'graph toolbar rendered');
  assert.ok(graphClasses.includes('dsic-graph-legend'), 'graph legend rendered');
  assert.ok(graphClasses.includes('dsic-graph-stats'), 'graph node/link counters rendered');
  assert.ok(
    graphScenario.hostElements.some((element) => element.type === 'canvas' && String(element.props.className ?? '') === 'dsic-graph-canvas'),
    'the graph draws on its own canvas element',
  );
  assert.ok(
    graphScenario.hostElements.some((element) => String(element.props.className ?? '').includes('dsic-graph-back')),
    'the graph view has a back-to-canvas button',
  );
  assert.ok(
    longNoteScenario.hostElements.some((element) => String(element.props.className ?? '') === 'dsic-selbtn' && String(element.props.title ?? '').includes('文档卡')),
    'selection bar offers converting the long note to a document card',
  );
  const media = await renderPanelScenario({
    items: SEED_ITEMS,
    patches: [['const [mediaOpen, setMediaOpen] = useState(false);', 'const [mediaOpen, setMediaOpen] = useState(true);']],
  });
  const mediaClasses = classOf(media.hostElements);
  assert.ok(mediaClasses.includes('dsic-media-card'), 'media generation dialog rendered');
  assert.ok(mediaClasses.includes('dsic-tabs'), 'image/GIF tabs rendered');
  assert.ok(mediaClasses.includes('dsic-media-limits'), 'capability limits block rendered');
  assert.ok(mediaClasses.includes('dsic-mediabtn'), 'media toolbar button rendered');

  const ai = await renderPanelScenario({
    items: SEED_ITEMS,
    patches: [
      ['const [aiDialog, setAiDialog] = useState(false);', 'const [aiDialog, setAiDialog] = useState(true);'],
      ["const [aiPrompt, setAiPrompt] = useState('');", "const [aiPrompt, setAiPrompt] = useState('画一个三步流程');"],
      [
        'const [aiPending, setAiPending] = useState(null);',
        "const [aiPending, setAiPending] = useState({ sessionId: 'session-smoke', title: '测试对话', at: 0 });",
      ],
    ],
  });
  const aiClasses = classOf(ai.hostElements);
  assert.ok(aiClasses.includes('dsic-aibtn'), 'AI generate button rendered in the toolbar');
  const aiButton = ai.hostElements.find((element) => String(element.props.className ?? '') === 'dsic-btn dsic-addtext dsic-aibtn');
  assert.ok(aiButton, 'toolbar AI button element found');
  const textOf = (node) => {
    if (node === null || node === undefined) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(textOf).join('');
    if (typeof node === 'object') return textOf(node.children ?? []);
    return '';
  };
  assert.ok(textOf(aiButton).includes('生成'), 'AI toolbar button is labelled 生成');
  assert.ok(
    !ai.hostElements.some((element) => String(element.props.title ?? '').startsWith('添加文字')),
    'the 添加文字 toolbar button was removed',
  );
  assert.ok(aiClasses.includes('dsic-ai-input'), 'AI prompt dialog rendered');
  assert.ok(aiClasses.includes('dsic-primary'), 'AI submit button rendered');
  assert.ok(aiClasses.includes('dsic-scope'), 'AI scope selector rendered');
  assert.ok(aiClasses.includes('dsic-mode'), 'AI ask/auto mode selector rendered');
  assert.ok(aiClasses.includes('dsic-aipending'), 'AI pending chip rendered while generating');
  assert.ok(aiClasses.includes('dsic-aiopen'), 'pending chip offers opening the conversation');
  const dialogControls = ai.hostElements.filter((element) =>
    String(element.props.className ?? '').includes('dsic-scope-option'),
  );
  assert.ok(dialogControls.length >= 4, 'scope and mode options rendered');
  assert.ok(
    dialogControls.some((option) => String(option.props.className ?? '').includes('dsic-scope-option') && option.props.disabled === true),
    'selection scope disabled without selection',
  );
  const backdrop = ai.hostElements.find((element) => (element.props.className ?? '') === 'dsic-dialog');
  assert.ok(backdrop, 'dialog backdrop rendered');
  assert.equal(typeof backdrop.props.onPointerDown, 'function', 'backdrop pointer-down handler exists');
  assert.equal(typeof backdrop.props.onClick, 'function', 'backdrop click handler exists');
  backdrop.props.onClick({ target: backdrop, currentTarget: backdrop, stopPropagation() {} });
  assert.ok(classOf(ai.hostElements).includes('dsic-dialog-backdrop-hint'), 'backdrop hint rendered');

  const aiSelection = await renderPanelScenario({
    selection: ['seed-note'],
    items: SEED_ITEMS,
    patches: [
      ['const [aiDialog, setAiDialog] = useState(false);', 'const [aiDialog, setAiDialog] = useState(true);'],
      ["const [aiScope, setAiScope] = useState('canvas');", "const [aiScope, setAiScope] = useState('selection');"],
    ],
  });
  const selectionScopeOptions = aiSelection.hostElements.filter(
    (element) => String(element.props.className ?? '').includes('dsic-scope-option'),
  );
  assert.ok(
    selectionScopeOptions.some((option) => option.props['data-active'] === 'true' && option.props.disabled !== true),
    'selection scope active and enabled when nodes are selected',
  );
});

/* ---------------------------------------------------------------- *
 * 4c. media generation: GIF encoder round-trip and SVG image builder
 * ---------------------------------------------------------------- */
await check('media: GIF encoder round-trip and SVG image generator', async () => {
  const source = await readFile(join(bundle, 'client.js'), 'utf8');
  const start = source.indexOf('// #region media-generation');
  const end = source.indexOf('// #endregion media-generation');
  assert.ok(start > 0 && end > start, 'media generation region present');
  const region = source.slice(start, end);
  const factory = new Function('document', 'btoa', 'Buffer', `${region}\nreturn { encodeGif, gifColorIndex, buildImageSvg, generateMediaAsset };`);
  const btoaStub = (value) => Buffer.from(value, 'binary').toString('base64');
  const media = factory(undefined, btoaStub, Buffer);

  assert.equal(media.gifColorIndex(0, 0, 0), 0, 'black maps to first palette slot');
  assert.equal(media.gifColorIndex(255, 255, 255), 215, 'white maps to last palette slot');

  const lzwDecode = (data, minCodeSize) => {
    const clear = 1 << minCodeSize;
    const endCode = clear + 1;
    let size = minCodeSize + 1;
    let dict = [];
    const reset = () => {
      dict = [];
      for (let index = 0; index < clear; index += 1) dict.push([index]);
      dict.push(null, null);
      size = minCodeSize + 1;
    };
    reset();
    const out = [];
    let bitPos = 0;
    const readCode = () => {
      let value = 0;
      for (let bit = 0; bit < size; bit += 1) {
        const byteIndex = bitPos >> 3;
        if (byteIndex >= data.length) return null;
        value |= ((data[byteIndex] >> (bitPos & 7)) & 1) << bit;
        bitPos += 1;
      }
      return value;
    };
    let previous = null;
    for (;;) {
      const code = readCode();
      if (code === null || code === endCode) break;
      if (code === clear) {
        reset();
        previous = null;
        continue;
      }
      let entry;
      if (code < dict.length && dict[code]) entry = dict[code];
      else if (previous) entry = previous.concat(previous[0]);
      else break;
      for (const value of entry) out.push(value);
      if (previous) {
        dict.push(previous.concat(entry[0]));
        if (dict.length > 1 << size && size < 12) size += 1;
      }
      previous = entry;
    }
    return out;
  };

  const width = 6;
  const height = 3;
  const frameA = Uint8Array.from({ length: width * height }, (_, index) => (index % 2 === 0 ? 0 : 215));
  const frameB = Uint8Array.from({ length: width * height }, (_, index) => (index % 3 === 0 ? 215 : 40));
  const url = media.encodeGif({ width, height, frames: [frameA, frameB], delayMs: 90 });
  assert.ok(url.startsWith('data:image/gif;base64,'), 'GIF data URL returned');
  const bytes = Buffer.from(url.slice('data:image/gif;base64,'.length), 'base64');
  assert.equal(bytes.subarray(0, 6).toString('ascii'), 'GIF89a', 'GIF header');
  assert.equal(bytes[bytes.length - 1], 0x3b, 'GIF trailer');
  const readU16 = (buffer, offset) => buffer[offset] | (buffer[offset + 1] << 8);
  let offset = 6;
  assert.equal(readU16(bytes, offset), width);
  offset += 2;
  assert.equal(readU16(bytes, offset), height);
  offset += 2;
  const packed = bytes[offset];
  offset += 1;
  offset += 2;
  const tableSize = 1 << ((packed & 0x07) + 1);
  assert.equal(tableSize, 256, 'global colour table size');
  offset += tableSize * 3;
  const decodedFrames = [];
  while (offset < bytes.length) {
    const marker = bytes[offset];
    if (marker === 0x3b) break;
    if (marker === 0x21) {
      offset += 2;
      for (;;) {
        const size = bytes[offset];
        offset += 1;
        if (size === 0) break;
        offset += size;
      }
      continue;
    }
    assert.equal(marker, 0x2c, 'image descriptor marker');
    offset += 1;
    offset += 8;
    const imagePacked = bytes[offset];
    offset += 1;
    assert.equal(imagePacked, 0, 'no local colour table');
    const minCodeSize = bytes[offset];
    offset += 1;
    const data = [];
    for (;;) {
      const size = bytes[offset];
      offset += 1;
      if (size === 0) break;
      for (let index = 0; index < size; index += 1) data.push(bytes[offset + index]);
      offset += size;
    }
    decodedFrames.push(lzwDecode(data, minCodeSize));
  }
  assert.equal(decodedFrames.length, 2, 'two frames encoded');
  assert.deepEqual(decodedFrames[0].slice(0, frameA.length), Array.from(frameA), 'first frame round-trips');
  assert.deepEqual(decodedFrames[1].slice(0, frameB.length), Array.from(frameB), 'second frame round-trips');

  const svg = media.buildImageSvg({ width: 640, height: 360, title: '测试 <海报>', subtitle: '副标题', style: 'poster', hue: 210 });
  assert.ok(svg.startsWith('<svg'), 'SVG root');
  assert.ok(svg.endsWith('</svg>'), 'SVG closed');
  assert.ok(svg.includes('测试 &lt;海报&gt;'), 'title XML-escaped');
  const asset = media.generateMediaAsset({ kind: 'image', prompt: '发布会海报', style: 'poster', ratio: 'wide', subtitle: '通用画布' });
  assert.ok(asset.src.startsWith('data:image/svg+xml;base64,'), 'SVG data URL');
  assert.ok(asset.width > 0 && asset.height > 0, 'display size returned');
  const decodedSvg = Buffer.from(asset.src.split(',')[1], 'base64').toString('utf8');
  assert.ok(decodedSvg.includes('发布会海报'), 'prompt embedded as the title');
  assert.throws(
    () => media.generateMediaAsset({ kind: 'gif', prompt: 'x', style: 'waves', ratio: 'wide', subtitle: '' }),
    /canvas/,
    'GIF generation needs a browser canvas',
  );
});

/* ---------------------------------------------------------------- *
 * 4d. prompt library: browser-storage round-trip and normalisation
 * ---------------------------------------------------------------- */
await check('prompt library: storage round-trip and normalisation', async () => {
  const source = await readFile(join(bundle, 'client.js'), 'utf8');
  const start = source.indexOf('// #region prompt-library');
  const end = source.indexOf('// #endregion prompt-library');
  assert.ok(start > 0 && end > start, 'prompt library region present');
  const storage = {
    data: {},
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null;
    },
    setItem(key, value) {
      this.data[key] = String(value);
    },
  };
  const factory = new Function('localStorage', `${source.slice(start, end)}\nreturn { normalizePromptEntry, loadPrompts, persistPrompts, newPromptId, promptExamples };`);
  const lib = factory(storage);
  assert.ok(lib.newPromptId().startsWith('p_'), 'prompt ids are prefixed');
  assert.equal(lib.normalizePromptEntry({ id: '', body: 'x' }), null, 'empty id rejected');
  assert.equal(lib.normalizePromptEntry({ id: 'a', body: '   ' }), null, 'empty body rejected');
  const normalized = lib.normalizePromptEntry({ id: 'a', name: '', body: '用 {{产品}} 写一段介绍' });
  assert.equal(normalized.name, '未命名提示词', 'fallback name');
  assert.equal(normalized.body, '用 {{产品}} 写一段介绍');
  lib.persistPrompts([normalized]);
  const reloaded = lib.loadPrompts();
  assert.equal(reloaded.length, 1, 'prompt reloaded from storage');
  assert.equal(reloaded[0].body, '用 {{产品}} 写一段介绍');
  assert.ok(reloaded[0].at > 0, 'timestamp stored');
  storage.data['dsic.prompts.v1'] = '{not-json';
  assert.deepEqual(lib.loadPrompts(), [], 'corrupt storage tolerated');
  const examples = lib.promptExamples((key) => `example:${key}`);
  assert.equal(examples.length, 4, 'four example prompts');
  assert.ok(examples.every((entry) => entry.name.startsWith('example:')), 'example names translated');
  assert.deepEqual(factory(undefined).loadPrompts(), [], 'no localStorage → empty library');
});

/* ---------------------------------------------------------------- *
 * 4e. frame helpers: containment + recursive frame members (group move)
 * ---------------------------------------------------------------- */
await check('frame helpers: containment and recursive descendants', async () => {
  const source = await readFile(join(bundle, 'client.js'), 'utf8');
  const start = source.indexOf('// #region frame-helpers');
  const end = source.indexOf('// #endregion frame-helpers');
  assert.ok(start > 0 && end > start, 'frame helpers region present');
  const factory = new Function(`${source.slice(start, end)}\nreturn { frameContainingPoint, frameDescendants };`);
  const { frameContainingPoint, frameDescendants } = factory();
  const items = {
    f1: { id: 'f1', type: 'frame', x: 0, y: 0, w: 800, h: 600 },
    f2: { id: 'f2', type: 'frame', x: 100, y: 100, w: 300, h: 200, frameId: 'f1' },
    n1: { id: 'n1', type: 'note', x: 200, y: 150, w: 240, h: 168, frameId: 'f2' },
    n2: { id: 'n2', type: 'note', x: 500, y: 400, w: 240, h: 168, frameId: 'f1' },
    e1: { id: 'e1', type: 'edge', from: 'n1', to: 'n2' },
  };
  assert.equal(frameContainingPoint(items, { x: 220, y: 170 }).id, 'f2', 'innermost frame wins');
  assert.equal(frameContainingPoint(items, { x: 700, y: 500 }).id, 'f1', 'outer frame detected');
  assert.equal(frameContainingPoint(items, { x: 2000, y: 2000 }), null, 'outside any frame → null');
  assert.equal(frameContainingPoint(items, { x: 220, y: 170 }, new Set(['f2'])).id, 'f1', 'excluded frame ignored');
  const descendants = frameDescendants(items, new Set(['f1']));
  assert.deepEqual([...descendants.keys()].sort(), ['f2', 'n1', 'n2'], 'recursive descendants collected');
  const directOnly = frameDescendants(items, new Set(['f2']));
  assert.deepEqual([...directOnly.keys()].sort(), ['n1'], 'nested frame members resolved');
});

/* ---------------------------------------------------------------- *
 * 4f. canvas skins: presets, custom background and local persistence
 * ---------------------------------------------------------------- */
await check('canvas skins: presets, custom background and persistence', async () => {
  const source = await readFile(join(bundle, 'client.js'), 'utf8');
  const start = source.indexOf('// #region skins');
  const end = source.indexOf('// #endregion skins');
  assert.ok(start > 0 && end > start, 'skins region present');
  const storage = {
    data: {},
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null;
    },
    setItem(key, value) {
      this.data[key] = String(value);
    },
  };
  const factory = new Function('localStorage', `${source.slice(start, end)}\nreturn { SKIN_PRESETS, skinBackground, buildSkinStyle, normalizeSkin, loadSkin, persistSkin, skinOverlays };`);
  const skins = factory(storage);
  assert.ok(skins.SKIN_PRESETS.length >= 6, 'built-in background skins');
  assert.equal(
    skins.normalizeSkin({ kind: 'preset', presetId: 'whale' }).presetId,
    'starry',
    'retired particle skin falls back to the default skin',
  );
  skins.persistSkin({ kind: 'preset', presetId: 'neon' });
  assert.equal(skins.loadSkin().presetId, 'neon', 'skin persisted and reloaded');
  for (const preset of skins.SKIN_PRESETS) {
    const style = skins.buildSkinStyle({ kind: 'preset', presetId: preset.id }, { zoom: 0.5, ox: 40, oy: 20, gridSize: 24 });
    assert.ok(String(style.backgroundImage).length > 10, `${preset.id} has background layers`);
    assert.ok(String(style.backgroundSize).length > 0, `${preset.id} has background sizing`);
  }
  const fallback = skins.buildSkinStyle({ kind: 'preset', presetId: 'nope' }, { zoom: 0.5, ox: 0, oy: 0, gridSize: 24 });
  assert.ok(String(fallback.backgroundImage).includes('rgba(255,255,255,.55)'), 'unknown preset falls back to the starry skin');
  const custom = skins.buildSkinStyle({ kind: 'custom', src: 'data:image/jpeg;base64,AAAA', w: 800, h: 600 }, { zoom: 0.5, ox: 10, oy: 20, gridSize: 24 });
  assert.ok(String(custom.backgroundImage).includes('url("data:image/jpeg'), 'custom background uses the uploaded image');
  assert.equal(custom.backgroundSize, '400px 300px', 'custom background scales with zoom');
  assert.equal(skins.normalizeSkin(null).presetId, 'starry', 'invalid skin → default');
  assert.equal(skins.normalizeSkin({ kind: 'custom', src: 'javascript:alert(1)' }).kind, 'preset', 'non-image custom source rejected');
  const customSkin = skins.normalizeSkin({ kind: 'custom', src: 'data:image/png;base64,AA', w: 99999, h: 1 });
  assert.equal(customSkin.kind, 'custom');
  assert.equal(customSkin.w, 6000, 'custom width clamped');
  assert.equal(customSkin.h, 32, 'custom height clamped');
  assert.equal(skins.skinOverlays(customSkin).hud, true, 'custom skin keeps the HUD frame');
  skins.persistSkin({ kind: 'preset', presetId: 'neon' });
  assert.equal(skins.loadSkin().presetId, 'neon', 'skin persisted and reloaded');
  storage.data['dsic.skin.v1'] = '{oops';
  assert.equal(skins.loadSkin().presetId, 'starry', 'corrupt skin storage tolerated');
  assert.equal(factory(undefined).loadSkin().presetId, 'starry', 'no localStorage → default skin');
});

/* ---------------------------------------------------------------- *
 * 4g. canvas decorations: multi-select overlay layer, persisted locally
 * ---------------------------------------------------------------- */
await check('canvas decorations: presets, multi-select persistence and layer flags', async () => {
  const source = await readFile(join(bundle, 'client.js'), 'utf8');
  const start = source.indexOf('// #region decor');
  const end = source.indexOf('// #endregion decor');
  assert.ok(start > 0 && end > start, 'decoration region present');
  const storage = {
    data: {},
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null;
    },
    setItem(key, value) {
      this.data[key] = String(value);
    },
  };
  const factory = new Function(
    'localStorage',
    `${source.slice(start, end)}\nreturn { DECOR_PRESETS, DECOR_IDS, normalizeDecor, loadDecor, persistDecor, decorHasCanvasFx, decorHas };`,
  );
  const decor = factory(storage);
  assert.equal(decor.DECOR_PRESETS.length, 4, 'whale, rainbow cat, aurora and Steins;Gate decorations');
  assert.deepEqual(decor.DECOR_IDS, ['whale', 'rainbowcat', 'aurora', 'steinsgate'], 'decoration ids are stable');
  assert.deepEqual(decor.normalizeDecor(['whale', 'whale', 'nope', 'aurora']), ['whale', 'aurora'], 'unknown and duplicate decorations dropped');
  assert.deepEqual(decor.normalizeDecor(null), [], 'invalid decoration payload → empty');
  assert.equal(decor.decorHasCanvasFx(['whale']), true, 'particle decoration mounts a canvas layer');
  assert.equal(decor.decorHasCanvasFx(['steinsgate']), false, 'Steins;Gate decoration is a DOM overlay');
  assert.equal(decor.decorHas(['steinsgate'], 'steinsgate'), true, 'decoration active lookup');
  decor.persistDecor(['whale', 'rainbowcat']);
  assert.deepEqual(decor.loadDecor(), ['whale', 'rainbowcat'], 'decorations persisted and reloaded');
  storage.data['dsic.decor.v1'] = '{oops';
  assert.deepEqual(decor.loadDecor(), [], 'corrupt decoration storage tolerated');
  assert.deepEqual(factory(undefined).loadDecor(), [], 'no localStorage → no decorations');
});

/* ---------------------------------------------------------------- *
 * 5. Host plugin: registration + browser API + agent tools end to end
 * ---------------------------------------------------------------- */
await check('host: index.js parses and wires API + tools + prompt', async () => {
  assert.equal(typeof Request, 'function', 'Node must provide fetch primitives');
  const temporaryHome = join(here, '..', '.verify-home-host');
  await rm(temporaryHome, { recursive: true, force: true });
  const previous = process.env.DSH_HOME;
  process.env.DSH_HOME = temporaryHome;
  try {
    const host = await import(pathToFileURL(join(bundle, 'index.js')).href);
    assert.equal(typeof host.apply, 'function');
    assert.ok(Array.isArray(host.inject) && host.inject.includes('connection'));
    const tools = new Map();
    const sections = [];
    let route = null;
    const aiMessages = [];
    const llmRequests = [];
    let nextPlan = {};
    let nextDocument = '';
    let nextProjects = {
      projects: [
        { name: '品牌官网', task: '设计品牌官网的页面结构和文案' },
        { name: '小程序', task: '设计小程序的核心流程' },
        { name: '数据看板', task: '设计数据看板的指标和布局' },
      ],
    };
    let llmEnabled = true;
    const agentStub = {
      session: { id: 'session-smoke', header: { updatedAt: '2026-10-21T15:00:00.000Z' } },
      followup: async (message) => {
        aiMessages.push(message);
      },
    };
    const ctxStub = {
      effect: (factory) => {
        const disposer = factory();
        return typeof disposer === 'function' ? disposer : () => {};
      },
      get: (name) => {
        if (name === 'agents') return { roots: () => [agentStub], get: () => agentStub };
        if (name === 'sessionController') {
          return {
            modelCatalog: async () => ({
              default: { provider: 'test-provider', model: 'test-model' },
              routableProviders: ['test-provider', 'alt-provider'],
              groups: [
                {
                  id: 'test-provider',
                  name: 'Test Provider',
                  models: [{ id: 'test-model', name: 'Test Model' }, { id: 'test-model-2', name: 'Test Model 2' }],
                },
                { id: 'alt-provider', name: 'Alt Provider', models: [{ id: 'alt-model', name: 'Alt Model' }] },
              ],
              failures: [],
            }),
          };
        }
        if (name === 'agentDefaultModel') return { currentSelection: () => ({ provider: 'test-provider', model: 'test-model' }) };
        if (name === 'llm') {
          if (!llmEnabled) return undefined;
          return {
            stream: (options) => {
              llmRequests.push(options);
              const wantsDocument = String(options.system).includes('文档生成器');
              const wantsProjects = String(options.system).includes('协调者');
              const body = wantsProjects
                ? JSON.stringify(nextProjects)
                : wantsDocument
                  ? nextDocument
                  : `\`\`\`json\n${JSON.stringify(nextPlan)}\n\`\`\``;
              return (async function* () {
                yield { type: 'text-delta', index: 0, text: body };
                yield { type: 'finish', reason: { kind: 'stop' } };
              })();
            },
          };
        }
        return undefined;
      },
      inject: (_deps, callback) => {
        const child = {
          tools: {
            register: (definition) => {
              if (tools.has(definition.name)) throw new Error(`duplicate tool ${definition.name}`);
              tools.set(definition.name, definition);
              return () => {};
            },
          },
          systemPrompt: {
            section: (section) => {
              sections.push(section);
              return () => {};
            },
          },
        };
        callback(child);
        return () => {};
      },
      connection: {
        fetch: {
          register: (definition) => {
            route = definition;
            return () => {};
          },
        },
      },
    };
    host.apply(ctxStub, {});

    const hostSource = await readFile(join(bundle, 'index.js'), 'utf8');
    assert.ok(hostSource.includes("action === 'delegate'"), 'delegate browser action is routed');
    assert.ok(hostSource.includes('MAX_CHILD_AGENTS = 6'), 'per-coordinator child cap of six');
    assert.ok(
      hostSource.includes('buildPlanUserPrompt(prompt, scope, selectedItems, anchor, contextIds)'),
      'project context ids threaded into the plan prompt',
    );
    assert.ok(hostSource.includes('parentId') && hostSource.includes('project'), 'child agent fields supported');
    assert.ok(hostSource.includes("action === 'open-path'"), 'open-path browser action is routed');
    assert.ok(hostSource.includes("'graph-data'"), 'graph data browser action is routed');
    assert.ok(hostSource.includes('buildRelationGraph'), 'host builds the relation graph with the shared model');
    assert.ok(hostSource.includes("'ai-provider-save'"), 'custom AI endpoint save action is routed');
    assert.ok(hostSource.includes('callOpenAiCompatible'), 'host calls OpenAI-compatible endpoints directly');
    assert.ok(hostSource.includes("spawn(command, [resolved]"), 'local paths are opened with the OS handler');

    assert.ok(route, 'browser API route registered');
    assert.equal(route.path, '/api/canvas.doc');
    assert.ok(route.methods.includes('POST'));
    assert.equal(route.requestBody, 'buffered');
    assert.equal(typeof route.fetch, 'function');
    assert.deepEqual(
      Array.from(tools.keys()).sort(),
      ['canvas_connect', 'canvas_create', 'canvas_delete', 'canvas_focus', 'canvas_read', 'canvas_update'],
    );
    for (const [name, definition] of tools) {
      assert.equal(typeof definition.description, 'string', `${name} description`);
      assert.ok(definition.description.length > 30, `${name} description length`);
      assert.equal(definition.parameters.type, 'object', `${name} parameters root`);
      assert.equal(typeof definition.output.render, 'function', `${name} render`);
      assert.equal(definition.output.schema.type, 'object', `${name} output schema root`);
      assert.equal(typeof definition.execute, 'function', `${name} execute`);
      const blocks = definition.output.render({}, { text: 'hello', revision: 1 });
      assert.ok(Array.isArray(blocks) && blocks[0].type === 'text' && blocks[0].text === 'hello');
    }
    assert.equal(sections.length, 1, 'one system prompt section');
    assert.equal(sections[0].name, 'canvas:infinite-canvas');
    assert.equal(sections[0].order, 3200);
    assert.equal(typeof sections[0].text, 'function');
    assert.ok(sections[0].text().includes('canvas_read'));

    const api = async (action, payload) => {
      const request = new Request('http://127.0.0.1:56311/api/canvas.doc', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      const response = await route.fetch(request);
      assert.equal(response.status, 200, `${action} status`);
      assert.match(response.headers.get('content-type') || '', /application\/json/);
      return response.json();
    };
    const runTool = async (name, args = {}) => {
      const definition = tools.get(name);
      return definition.execute(args, { signal: new AbortController().signal });
    };

    const initial = await api('state', {});
    assert.equal(initial.ok, true, 'state ok');
    assert.equal(initial.value.full, true, 'first state is full');
    assert.deepEqual(initial.value.items, {});
    assert.equal(typeof initial.value.docId, 'string', 'state carries the active canvas id');
    assert.equal(initial.value.library.canvases.length, 1, 'library starts with one canvas');
    const firstCanvasId = initial.value.docId;

    // ---- settings action: plugin mode, storage path, counts ----
    const settings = await api('settings', {});
    assert.equal(settings.ok, true, 'settings ok');
    assert.equal(settings.value.standalone, false, 'plugin host reports plugin mode');
    assert.equal(settings.value.canImportDsh, false, 'plugin host cannot import from itself');
    assert.match(String(settings.value.dataPath), /\.json$/, 'settings exposes the storage file');
    assert.equal(typeof settings.value.hostBuild, 'string', 'settings exposes the host build');
    assert.equal(settings.value.canvases, 1, 'settings reports the canvas count');
    assert.equal(settings.value.snapshots, 0, 'settings reports the snapshot count');

    // ---- custom AI providers (OpenAI-compatible endpoints) ----
    const savedProvider = await api('ai-provider-save', {
      name: '测试接口',
      baseUrl: 'http://127.0.0.1:9/v1',
      models: 'test-model, test-model-2',
      defaultModel: 'test-model',
      apiKey: 'sk-test-1234567890',
    });
    assert.equal(savedProvider.ok, true, 'ai-provider-save ok');
    assert.equal(savedProvider.value.providers.length, 1, 'provider listed after save');
    assert.equal(savedProvider.value.providers[0].hasKey, true, 'key stored');
    assert.equal('apiKey' in savedProvider.value.providers[0], false, 'key never returned in clear text');
    assert.ok(String(savedProvider.value.providers[0].keyMasked).includes('••'), 'masked key returned');
    const providerId = savedProvider.value.providers[0].id;
    const mergedCatalog = await api('models', {});
    assert.ok(
      Array.isArray(mergedCatalog.value.customProviders) && mergedCatalog.value.customProviders.length === 1,
      'models catalog merges custom providers',
    );
    const editedProvider = await api('ai-provider-save', {
      id: providerId,
      name: '测试接口 2',
      baseUrl: 'http://127.0.0.1:9/v1',
      models: 'test-model',
      apiKey: '',
    });
    assert.equal(editedProvider.value.providers[0].name, '测试接口 2', 'provider renamed');
    assert.equal(editedProvider.value.providers[0].hasKey, true, 'empty key keeps the stored one');
    const failedProviderTest = await api('ai-provider-test', { id: providerId });
    assert.equal(failedProviderTest.ok, false, 'unreachable provider fails its connection test');
    assert.match(String(failedProviderTest.error?.message ?? ''), /无法连接|超时|连接/);
    const missingCustom = await api('generate', {
      prompt: '用自定义接口生成',
      scope: 'canvas',
      model: { source: 'custom', providerId: 'p_missing', model: 'x' },
    });
    assert.equal(missingCustom.ok, false, 'unknown custom provider is rejected');
    assert.match(String(missingCustom.error?.message ?? ''), /找不到该 AI 接口配置/);
    const deletedProvider = await api('ai-provider-delete', { id: providerId });
    assert.equal(deletedProvider.ok, true, 'ai-provider-delete ok');
    assert.equal(deletedProvider.value.providers.length, 0, 'provider deleted from the store');

    // ---- multiple canvases: create / switch / rename / delete ----
    const createdCanvas = await api('canvas-create', {});
    assert.equal(createdCanvas.ok, true, 'canvas-create ok');
    assert.equal(createdCanvas.value.library.canvases.length, 2, 'second canvas listed');
    assert.notEqual(createdCanvas.value.docId, firstCanvasId, 'new canvas becomes active');
    assert.deepEqual(createdCanvas.value.items, {}, 'new canvas starts empty');
    const secondCanvasId = createdCanvas.value.docId;

    await api('apply', { ops: [{ op: 'upsert', item: { type: 'note', text: '第二个画布的便签' } }] });
    const secondState = await api('state', {});
    assert.equal(Object.keys(secondState.value.items).length, 1, 'note only lives on the second canvas');

    const switched = await api('canvas-switch', { id: firstCanvasId });
    assert.equal(switched.ok, true, 'canvas-switch ok');
    assert.equal(switched.value.docId, firstCanvasId);
    assert.deepEqual(switched.value.items, {}, 'switching back shows the first (still empty) canvas');
    const staleSince = await api('state', { since: secondState.value.rev, docId: secondCanvasId });
    assert.equal(staleSince.value.full, true, 'switching canvases forces a full state payload');
    assert.equal(staleSince.value.docId, firstCanvasId);

    const renamed = await api('canvas-rename', { id: secondCanvasId, title: '项目看板' });
    assert.equal(renamed.ok, true, 'canvas-rename ok');
    assert.ok(
      renamed.value.library.canvases.some((canvas) => canvas.title === '项目看板'),
      'renamed title appears in the library list',
    );

    // ---- history snapshots on the active canvas ----
    const backToSecond = await api('canvas-switch', { id: secondCanvasId });
    assert.equal(backToSecond.value.library.canvases.length, 2);
    const snapshot = await api('history-save', { label: '第一版' });
    assert.equal(snapshot.ok, true, 'history-save ok');
    assert.equal(snapshot.value.saved.nodes, 1, 'snapshot records the node count');
    await api('apply', { ops: [{ op: 'upsert', item: { type: 'note', text: '第二张便签' } }] });
    const beforeRestore = await api('state', {});
    assert.equal(Object.keys(beforeRestore.value.items).length, 2, 'canvas gained a second note');
    const restored = await api('history-restore', { entryId: snapshot.value.saved.id });
    assert.equal(restored.ok, true, 'history-restore ok');
    const restoredState = await api('state', {});
    assert.equal(Object.keys(restoredState.value.items).length, 1, 'restore rolls the canvas back');
    assert.ok(restoredState.value.snapshots.length >= 2, 'pre-restore state was snapshotted automatically');
    const listed = await api('history-list', {});
    assert.equal(listed.value.snapshots.length, restoredState.value.snapshots.length, 'history-list matches state');
    const removedSnapshot = await api('history-delete', { entryId: snapshot.value.saved.id });
    assert.equal(removedSnapshot.ok, true, 'history-delete ok');
    assert.ok(
      !removedSnapshot.value.snapshots.some((entry) => entry.id === snapshot.value.saved.id),
      'deleted snapshot disappears',
    );

    const deletedCanvas = await api('canvas-delete', { id: secondCanvasId });
    assert.equal(deletedCanvas.ok, true, 'canvas-delete ok');
    assert.equal(deletedCanvas.value.library.canvases.length, 1, 'deleting leaves one canvas');
    assert.equal(deletedCanvas.value.docId, firstCanvasId, 'falls back to the remaining canvas');

    const created = await runTool('canvas_create', { items: [{ type: 'note', text: '想法 A' }, { type: 'note', text: '想法 B' }] });
    assert.equal(created.revision, 1, 'create bumps revision');
    assert.match(created.text, /Created 2 node/);
    assert.match(created.text, /n_|note/);

    const afterCreate = await api('state', {});
    assert.equal(afterCreate.value.full, true);
    const createdItems = Object.values(afterCreate.value.items);
    assert.equal(createdItems.length, 2);
    assert.equal(createdItems[0].by, 'ai', 'agent writes are attributed');

    const read = await runTool('canvas_read', { include: 'full' });
    const parsed = JSON.parse(read.text);
    assert.equal(parsed.total, 2);
    assert.equal(parsed.items.length, 2);
    const [firstId, secondId] = parsed.items.map((item) => item.id);
    assert.ok(firstId && secondId);

    const updated = await runTool('canvas_update', { items: [{ id: firstId, text: '改名了', color: 'blue' }] });
    assert.equal(updated.revision, 2);
    const afterUpdate = await api('state', {});
    assert.equal(afterUpdate.value.items[firstId].text, '改名了');
    assert.equal(afterUpdate.value.items[firstId].color, 'blue');
    assert.equal(afterUpdate.value.items[firstId].by, 'ai', 'agent writes stay attributed after update');

    const connected = await runTool('canvas_connect', { edges: [{ from: firstId, to: secondId, label: '然后' }] });
    assert.match(connected.text, /Connected 1 edge/);

    const focused = await runTool('canvas_focus', { ids: [firstId, secondId] });
    assert.equal(focused.revision, 4);
    const afterFocus = await api('state', {});
    assert.ok(afterFocus.value.focus && typeof afterFocus.value.focus.at === 'number', 'focus request recorded');

    // ---- relation graph data (Obsidian-style force-directed graph view) ----
    const graphCanvas = await api('graph-data', { scope: 'canvas' });
    assert.equal(graphCanvas.ok, true, 'graph-data action ok');
    assert.ok(Array.isArray(graphCanvas.value.nodes) && graphCanvas.value.nodes.length >= 2, 'graph includes the canvas cards');
    assert.ok(graphCanvas.value.nodes.every((node) => node.kind === 'card'), 'canvas scope only returns cards');
    assert.ok(graphCanvas.value.edges.some((edge) => edge.kind === 'canvas'), 'canvas connections become canvas edges');
    const graphVaultDir = join(temporaryHome, 'graph-vault');
    await mkdir(graphVaultDir, { recursive: true });
    await writeFile(join(graphVaultDir, 'alpha.md'), '# Alpha\n\n[[Beta]] #tagA\n', 'utf8');
    await writeFile(join(graphVaultDir, 'beta.md'), '# Beta\n\n#tagA\n', 'utf8');
    const graphVault = await api('graph-data', { scope: 'vault', vaultRoot: graphVaultDir, includeTags: true });
    assert.equal(graphVault.ok, true, 'vault graph data ok');
    assert.ok(graphVault.value.nodes.some((node) => node.kind === 'file' && node.rel === 'alpha.md'), 'vault notes become graph nodes');
    assert.ok(graphVault.value.nodes.some((node) => node.kind === 'tag' && String(node.label).includes('tagA')), 'vault hashtags become tag nodes');
    assert.ok(graphVault.value.edges.some((edge) => edge.kind === 'wiki'), 'vault [[links]] become wiki edges');
    assert.ok(graphVault.value.edges.some((edge) => edge.kind === 'tag'), 'vault hashtags link to tag nodes');
    assert.ok(graphVault.value.counts.files >= 2, 'vault graph reports the scanned note count');
    const graphNoTags = await api('graph-data', { scope: 'vault', vaultRoot: graphVaultDir, includeTags: false, includeOrphans: false });
    assert.ok(!graphNoTags.value.nodes.some((node) => node.kind === 'tag'), 'tag nodes can be switched off');

    // AI generation: direct LLM route (no conversation involved)
    nextPlan = {
      title: 'AI 生成的流程',
      nodes: [
        { ref: 'a', type: 'note', text: '目标', color: 'yellow' },
        { ref: 'b', type: 'note', text: '方案', color: 'blue' },
        { ref: 'c', type: 'note', text: '结果', color: 'green' },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c', label: '然后' },
      ],
      focus: ['a'],
    };
    llmEnabled = true;
    const generated = await api('generate', { prompt: '画一个三步流程', scope: 'canvas' });
    assert.equal(generated.ok, true, 'direct generate accepted');
    assert.equal(generated.value.mode, 'direct', 'direct LLM route used');
    assert.ok(generated.value.created >= 5, 'notes and edges created directly on the canvas');
    assert.ok(generated.value.revision > 0, 'revision returned');
    assert.equal(llmRequests.length, 1, 'llm stream called once');
    const llmRequest = llmRequests[0];
    assert.equal(llmRequest.provider, 'test-provider');
    assert.equal(llmRequest.model, 'test-model');
    assert.ok(String(llmRequest.system).includes('JSON'), 'plan system prompt sent');
    const requestText = llmRequest.messages[0].content[0].text;
    assert.ok(requestText.includes('画一个三步流程'), 'prompt forwarded to the model');
    assert.ok(requestText.includes('生成范围'), 'scope explained to the model');
    const afterDirect = await api('state', {});
    const directItems = Object.values(afterDirect.value.items);
    assert.ok(directItems.some((item) => item.text === '目标'), 'generated note landed on the canvas');
    assert.ok(directItems.filter((item) => item.type === 'edge').length >= 2, 'generated edges landed on the canvas');
    assert.ok(afterDirect.value.focus && typeof afterDirect.value.focus.at === 'number', 'focus applied after generation');
    assert.ok(aiMessages.length === 0, 'direct route does not post a chat message');

    // selection scope: answer-type requests must be written back into the selected node
    await runTool('canvas_update', { items: [{ id: firstId, text: '1+1 等于多少？' }] });
    const titleBefore = (await api('state', {})).value.title;
    nextPlan = {
      title: '不应生效的标题',
      updates: [
        { id: firstId, text: '1+1 等于多少？\n答：2' },
        { id: 'not-selected-id', text: 'x' },
      ],
    };
    const selectionGenerate = await api('generate', { prompt: '回答这张便签里的问题', scope: 'selection', selection: [firstId] });
    assert.equal(selectionGenerate.ok, true, 'selection generate accepted');
    assert.equal(selectionGenerate.value.updated, 1, 'only the selected node updated');
    const selectionRequest = llmRequests[1].messages[0].content[0].text;
    assert.ok(selectionRequest.includes('只输出 updates'), 'answer-mode directive sent to the model');
    assert.ok(selectionRequest.includes('答：'), 'answer format explained');
    assert.ok(selectionRequest.includes('1+1 等于多少？'), 'selected node text forwarded');
    const afterSelection = await api('state', {});
    assert.equal(afterSelection.value.items[firstId].text, '1+1 等于多少？\n答：2');
    assert.equal(afterSelection.value.title, titleBefore, 'selection scope must not change the canvas title');
    assert.ok(
      selectionGenerate.value.warnings.some((warning) => warning.includes('not-selected-id')),
      'update outside the selection ignored',
    );

    // ask mode: preview first, nothing written until the caller confirms
    nextPlan = { nodes: [{ ref: 'p', type: 'note', text: '预览便签', color: 'blue' }] };
    const itemCountBeforeAsk = Object.keys((await api('state', {})).value.items).length;
    const preview = await api('generate', { prompt: '加一张便签', scope: 'canvas', mode: 'ask' });
    assert.equal(preview.ok, true, 'ask mode accepted');
    assert.equal(preview.value.mode, 'plan', 'ask mode returns a plan preview');
    assert.ok(typeof preview.value.planId === 'string' && preview.value.planId.length > 0, 'plan id returned');
    assert.ok(preview.value.nodeTexts.includes('预览便签'), 'preview lists the planned node text');
    const itemCountAfterAsk = Object.keys((await api('state', {})).value.items).length;
    assert.equal(itemCountAfterAsk, itemCountBeforeAsk, 'ask mode writes nothing before confirmation');
    const appliedPlan = await api('generate-apply', { planId: preview.value.planId });
    assert.equal(appliedPlan.ok, true, 'plan applied');
    assert.equal(appliedPlan.value.mode, 'direct');
    assert.ok(appliedPlan.value.created >= 1, 'plan writes nodes after confirmation');
    const afterPlanItems = Object.values((await api('state', {})).value.items);
    assert.ok(afterPlanItems.some((item) => item.text === '预览便签'), 'planned node landed on the canvas');
    const reusedPlan = await api('generate-apply', { planId: preview.value.planId });
    assert.equal(reusedPlan.ok, false, 'a plan cannot be applied twice');

    // anchored generation (agent card): created nodes get edges from the anchor
    nextPlan = {
      nodes: [
        { ref: 'a', type: 'note', text: '锚点结果一', color: 'green' },
        { ref: 'b', type: 'note', text: '锚点结果二', color: 'green' },
      ],
    };
    const anchored = await api('generate', {
      prompt: '围绕我生成两张便签',
      scope: 'canvas',
      mode: 'auto',
      anchor: { x: 0, y: 0 },
      anchorId: firstId,
    });
    assert.equal(anchored.ok, true, 'anchored generation accepted');
    const afterAnchorItems = Object.values((await api('state', {})).value.items);
    const anchorEdges = afterAnchorItems.filter((item) => item.type === 'edge' && item.from === firstId);
    assert.ok(anchorEdges.length >= 2, 'generated nodes are connected back to the anchor card');

    // role persona + document output: long-form Markdown becomes frame + text cards
    nextDocument = '# 访谈提纲\n\n## 一、产品假设复述\n这是一个访谈文档正文。\n\n## 二、待验证假设\n- H1：用户确实有痛点\n';
    const docResult = await api('generate', {
      prompt: '设计用户访谈提纲',
      scope: 'canvas',
      output: 'document',
      persona: '# 角色\n你是一位用户研究员',
      anchor: { x: 100, y: 100 },
      anchorId: firstId,
    });
    assert.equal(docResult.ok, true, 'document generation accepted');
    assert.equal(docResult.value.mode, 'document');
    assert.ok(docResult.value.created >= 2, 'frame plus text cards created');
    assert.ok(docResult.value.characters > 0, 'document length reported');
    const docItems = Object.values((await api('state', {})).value.items);
    const docFrame = docItems.find((item) => item.type === 'frame');
    assert.ok(docFrame, 'document frame created');
    const docCard = docItems.find((item) => item.type === 'text' && String(item.text).includes('访谈提纲'));
    assert.ok(docCard, 'document text card created');
    assert.ok(
      docItems.some((item) => item.type === 'edge' && item.from === firstId && item.to === docFrame.id),
      'document frame linked back to the agent card',
    );
    const docRequest = llmRequests[llmRequests.length - 1];
    assert.ok(String(docRequest.system).includes('文档生成器'), 'document system prompt used');
    assert.ok(String(docRequest.messages[0].content[0].text).includes('你是一位用户研究员'), 'persona forwarded to the document prompt');

    // persona is also honoured on the structured plan route
    nextPlan = { nodes: [{ ref: 'x', type: 'note', text: '角色化便签', color: 'blue' }] };
    const personaPlan = await api('generate', { prompt: '生成一张便签', scope: 'canvas', persona: '你是一位严谨的产品经理' });
    assert.equal(personaPlan.ok, true, 'persona plan generation accepted');
    assert.ok(
      String(llmRequests[llmRequests.length - 1].system).includes('你是一位严谨的产品经理'),
      'persona appended to the plan system prompt',
    );

    // ---- A+B: coordinator delegates projects to child Agents (one frame each) ----
    const coordinatorCreate = await api('apply', {
      ops: [
        {
          op: 'upsert',
          item: {
            id: 'coord-agent',
            type: 'agent',
            text: '协调者',
            task: '把新产品拆成三个项目：品牌官网、小程序、数据看板',
            x: -600,
            y: 1200,
            w: 360,
            h: 280,
            status: 'idle',
          },
        },
      ],
    });
    assert.equal(coordinatorCreate.ok, true, 'coordinator card created');
    const delegation = await api('delegate', { parentId: 'coord-agent', prompt: '品牌官网、小程序、数据看板' });
    assert.equal(delegation.ok, true, 'delegate action accepted');
    assert.equal(delegation.value.children.length, 3, 'three child Agents created from the model plan');
    const projectSplitRequest = llmRequests[llmRequests.length - 1];
    assert.ok(
      String(projectSplitRequest.messages[0].content[0].text).includes('品牌官网') ||
        String(projectSplitRequest.messages[0].content[0].text).includes('协调者的任务'),
      'delegation prompt forwarded to the model',
    );
    const afterDelegate = (await api('state', {})).value;
    const childAgents = Object.values(afterDelegate.items).filter(
      (item) => item.type === 'agent' && item.parentId === 'coord-agent',
    );
    assert.equal(childAgents.length, 3, 'children stored with parentId');
    assert.ok(
      childAgents.every((item) => typeof item.project === 'string' && item.project !== ''),
      'each child owns a project name',
    );
    assert.ok(
      childAgents.every((item) => item.frameId && afterDelegate.items[item.frameId]?.type === 'frame'),
      'each child sits inside a project frame',
    );
    const projectFrames = childAgents
      .map((item) => afterDelegate.items[item.frameId])
      .filter((item) => item && item.type === 'frame');
    assert.equal(projectFrames.length, 3, 'one project frame per child');
    assert.ok(
      projectFrames.every((item) => item.meta && item.meta.kind === 'project'),
      'delegated project frames are marked as projects',
    );
    assert.ok(
      projectFrames.some((item) => item.text === '品牌官网'),
      'frame carries the project name',
    );
    const parentEdges = Object.values(afterDelegate.items).filter(
      (item) => item.type === 'edge' && item.from === 'coord-agent',
    );
    assert.equal(parentEdges.length, 3, 'coordinator linked to each child Agent');

    // depth guard: a child cannot delegate further (max two levels)
    const tooDeep = await api('delegate', { parentId: childAgents[0].id });
    assert.equal(tooDeep.ok, false, 'child delegation rejected');
    assert.equal(tooDeep.error.code, 'canvas/depth', 'depth error code returned');

    // per-coordinator cap: never more than six children on one card
    const secondDelegation = await api('delegate', {
      parentId: 'coord-agent',
      projects: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
    });
    assert.equal(secondDelegation.ok, true, 'second delegation accepted within the cap');
    assert.equal(secondDelegation.value.children.length, 3, 'room limited to the remaining child slots');
    const cappedAgain = await api('delegate', { parentId: 'coord-agent', projects: ['x'] });
    assert.equal(cappedAgain.ok, false, 'child limit enforced');
    assert.equal(cappedAgain.error.code, 'canvas/agent-cap');

    // project isolation: the child Agent only sees its own project context
    nextPlan = { nodes: [{ ref: 'z', type: 'note', text: '小程序页面一', color: 'blue' }] };
    const childRun = await api('generate', {
      prompt: '做小程序首页',
      scope: 'canvas',
      anchorId: childAgents[1].id,
      anchor: { x: childAgents[1].x + 40, y: childAgents[1].y + 40 },
      contextIds: [childAgents[1].id, childAgents[1].frameId],
    });
    assert.equal(childRun.ok, true, 'child Agent generation accepted');
    const childRequest = llmRequests[llmRequests.length - 1].messages[0].content[0].text;
    assert.ok(childRequest.includes('上下文范围'), 'child run adds the project scope to the prompt');
    assert.ok(childRequest.includes(childAgents[1].id), 'child prompt lists its own node');
    assert.ok(!childRequest.includes('coord-agent'), 'project context excludes the coordinator node');

    // model picker: catalog endpoint + per-request model override
    const catalog = await api('models', {});
    assert.equal(catalog.ok, true, 'model catalog endpoint ok');
    assert.ok(Array.isArray(catalog.value.providers) && catalog.value.providers.length >= 2, 'providers listed');
    assert.ok(
      catalog.value.providers.some((provider) => Array.isArray(provider.models) && provider.models.length >= 2),
      'provider lists its models',
    );
    nextPlan = { nodes: [{ ref: 'm', type: 'note', text: '指定模型生成', color: 'blue' }] };
    const overrideGenerate = await api('generate', {
      prompt: '用指定模型生成',
      scope: 'canvas',
      model: { provider: 'alt-provider', model: 'alt-model' },
    });
    assert.equal(overrideGenerate.ok, true, 'generation with model override accepted');
    const overrideRequest = llmRequests[llmRequests.length - 1];
    assert.equal(overrideRequest.provider, 'alt-provider', 'override provider used for the call');
    assert.equal(overrideRequest.model, 'alt-model', 'override model used for the call');

    // linked local path: a missing path is reported, nothing is spawned
    const missingPath = await api('open-path', { path: join(temporaryHome, 'definitely-missing-folder') });
    assert.equal(missingPath.ok, false, 'missing local path rejected');
    assert.equal(missingPath.error.code, 'canvas/path-missing', 'missing path error code');
    const emptyPath = await api('open-path', { path: '   ' });
    assert.equal(emptyPath.ok, false, 'empty local path rejected');

    // an unusable plan is reported instead of silently doing nothing
    nextPlan = {};
    const emptyPlan = await api('generate', { prompt: '什么也不做', scope: 'canvas' });
    assert.equal(emptyPlan.ok, false);
    assert.equal(emptyPlan.error.code, 'canvas/empty-plan');

    // fallback to the conversation route when this deployment has no LLM route
    llmEnabled = false;
    const fallback = await api('generate', { prompt: '用会话生成', scope: 'canvas' });
    assert.equal(fallback.ok, true);
    assert.equal(fallback.value.mode, 'session');
    assert.equal(aiMessages.length, 1, 'session fallback queued one chat message');
    llmEnabled = true;

    const missingSelection = await api('generate', { prompt: 'x', scope: 'selection' });
    assert.equal(missingSelection.ok, false, 'selection scope without selection rejected');
    const emptyPrompt = await api('generate', { prompt: '   ' });
    assert.equal(emptyPrompt.ok, false, 'empty prompt rejected');

    // browser-style write, exactly as the panel sends it
    const browserWrite = await api('apply', {
      ops: [{ op: 'upsert', item: { type: 'text', text: '用户写的', x: 0, y: 420, w: 320, h: 90 } }],
    });
    assert.equal(browserWrite.ok, true);
    assert.equal(browserWrite.value.errors.length, 0);
    const browserRevision = browserWrite.value.revision;

    const delta = await api('state', { since: browserRevision - 1 });
    assert.equal(delta.value.full, false, 'delta sync uses the op log');
    assert.ok(Array.isArray(delta.value.ops) && delta.value.ops.length >= 1);

    const viewport = await api('viewport', { viewport: { cx: 5, cy: 6, zoom: 2, vw: 800, vh: 600 } });
    assert.equal(viewport.ok, true);
    const afterViewport = await api('state', { since: browserRevision });
    assert.equal(afterViewport.value.viewport.cx, 5);
    assert.equal(afterViewport.value.viewport.zoom, 2);

    await assert.rejects(() => runTool('canvas_update', { items: [{ id: 'missing', text: 'x' }] }), /no node/);
    await assert.rejects(() => runTool('canvas_create', { items: [] }), /non-empty/);
    await assert.rejects(() => runTool('canvas_create', { items: [{ id: 'hijack', text: 'x' }] }), /omit id/);
    await assert.rejects(() => runTool('canvas_create', { items: [{ type: 'image', text: 'x' }] }), /needs src/);

    const deleted = await runTool('canvas_delete', { ids: [firstId] });
    assert.match(deleted.text, /Deleted/);
    const cleared = await runTool('canvas_delete', { all: true });
    assert.match(cleared.text, /0 nodes remain/);

    const finalState = await api('state', {});
    assert.equal(Object.keys(finalState.value.items).length, 0);

    // ---- local Markdown vault: list / read / import through the Host API ----
    const vaultRoot = join(temporaryHome, 'vault');
    await mkdir(join(vaultRoot, 'sub'), { recursive: true });
    await writeFile(join(vaultRoot, 'idea.md'), '# idea\n\n#灵感 值得做\n', 'utf8');
    await writeFile(
      join(vaultRoot, 'sub', 'board.canvas'),
      JSON.stringify({
        nodes: [
          { id: 'n1', type: 'text', text: 'from obsidian', x: 0, y: 0, width: 300, height: 160 },
          { id: 'g1', type: 'group', label: 'obsidian group', x: -300, y: -200, width: 700, height: 400 },
        ],
        edges: [],
      }),
      'utf8',
    );
    const vaultListing = await api('vault-list', { root: vaultRoot });
    assert.equal(vaultListing.ok, true, 'vault-list ok');
    assert.ok(vaultListing.value.files.some((file) => file.rel === 'idea.md'), 'vault listing includes the markdown note');
    assert.ok(vaultListing.value.files.some((file) => file.rel === 'sub/board.canvas'), 'vault listing includes the canvas');
    const vaultRead = await api('vault-read', { path: join(vaultRoot, 'idea.md') });
    assert.match(vaultRead.value.content, /#灵感/, 'vault-read returns the note text');
    const vaultImportNote = await api('vault-import', { path: join(vaultRoot, 'idea.md') });
    assert.equal(vaultImportNote.ok, true, 'vault-import note ok');
    assert.equal(vaultImportNote.value.created, 1, 'markdown imports one card');
    const afterVaultNote = await api('state', {});
    const importedCards = Object.values(afterVaultNote.value.items);
    assert.equal(importedCards.length, 1, 'imported note is on the canvas');
    assert.match(String(importedCards[0].meta?.filePath ?? ''), /idea\.md$/, 'imported card remembers the file path');
    const importedNoteId = importedCards[0].id;
    // editing a file-backed card mirrors the Markdown file automatically
    await api('apply', { ops: [{ op: 'patch', id: importedNoteId, patch: { text: '# idea\n\n#灵感 从画布写回的内容\n' } }] });
    let mirrored = '';
    for (let attempt = 0; attempt < 20; attempt += 1) {
      mirrored = await readFile(join(vaultRoot, 'idea.md'), 'utf8');
      if (mirrored.includes('从画布写回的内容')) break;
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    assert.match(mirrored, /从画布写回的内容/, 'card edits are written back into the Markdown file');
    // explicit write-back also reports no-op and protects external edits
    const noopWrite = await api('vault-write-back', { id: importedNoteId });
    assert.equal(noopWrite.ok, true, 'vault-write-back ok');
    assert.equal(noopWrite.value.unchanged, true, 'unchanged card content is a no-op');
    await writeFile(join(vaultRoot, 'idea.md'), 'external version\n', 'utf8');
    const conflictWrite = await api('vault-write-back', { id: importedNoteId });
    assert.equal(conflictWrite.ok, true, 'write-back after external edit ok');
    assert.ok(conflictWrite.value.conflictBackup, 'external edit is backed up before the card overwrites it');
    await api('apply', { ops: [{ op: 'clear' }] });
    const vaultImportCanvas = await api('vault-import', { path: join(vaultRoot, 'sub', 'board.canvas') });
    assert.equal(vaultImportCanvas.ok, true, 'vault-import canvas ok');
    assert.equal(vaultImportCanvas.value.created, 2, 'canvas imports its text node and group');
    assert.ok(vaultImportCanvas.value.revision > 0, 'import advances the revision');

    // persisted file exists under the temporary DSH_HOME
    const persisted = JSON.parse(await readFile(join(temporaryHome, 'canvas', 'scene.json'), 'utf8'));
    assert.equal(persisted.schema, 1);
    assert.ok(Array.isArray(persisted.canvases) && persisted.canvases.length === 1, 'persisted library keeps one canvas');
    assert.equal(typeof persisted.canvases[0].doc.rev, 'number');
    assert.ok(persisted.canvases[0].doc.items && typeof persisted.canvases[0].doc.items === 'object');
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = previous;
    await rm(temporaryHome, { recursive: true, force: true });
  }
});

/* ---------------------------------------------------------------- *
 * report
 * ---------------------------------------------------------------- */
const failed = results.filter((entry) => entry.status === 'FAIL');
for (const entry of results) {
  console.log(`${entry.status === 'PASS' ? '  ok  ' : ' FAIL '} ${entry.name}`);
  if (entry.error) console.log(entry.error.split('\n').map((line) => `        ${line}`).join('\n'));
}
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exitCode = failed.length === 0 ? 0 : 1;
