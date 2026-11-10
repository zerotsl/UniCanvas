/**
 * Pure canvas document model for UniCanvas.
 *
 * The Host owns the only document. Both the Client (through RPC) and the agent
 * tools mutate it through the same operation list, so every write path produces
 * the same normalized result and the same incremental sync log.
 *
 * No imports: this module is plain ESM loaded by the Host plugin.
 */

/** @typedef {{ x: number, y: number, w: number, h: number }} Rect */

export const SCHEMA_VERSION = 1;
export const ITEM_TYPES = ['note', 'text', 'shape', 'frame', 'image', 'edge', 'stroke', 'agent', 'axis'];
export const AGENT_STATUSES = ['idle', 'running', 'done', 'failed'];
export const SHAPES = ['rect', 'ellipse', 'diamond'];
export const PALETTE = ['yellow', 'blue', 'green', 'pink', 'purple', 'orange', 'gray', 'white'];

const MAX_TEXT = 20000;
const MAX_SRC = 3_000_000;
const MAX_INLINE_SRC = 200_000;
const MAX_COORD = 1_000_000;
const MAX_SIZE = 8000;
const MIN_SIZE = 40;
const MAX_TITLE = 120;
const MAX_ITEMS = 2000;
const MAX_LOG = 400;

const DEFAULTS = {
  note: { w: 240, h: 168, color: 'yellow' },
  text: { w: 340, h: 90, color: 'white' },
  shape: { w: 200, h: 140, color: 'blue' },
  frame: { w: 600, h: 400, color: 'gray' },
  image: { w: 300, h: 220, color: 'white' },
  edge: { w: 0, h: 0, color: 'gray' },
  stroke: { w: 1, h: 1, color: 'gray' },
  agent: { w: 440, h: 340, color: 'purple' },
  axis: { w: 1200, h: 150, color: 'gray' },
};

/** Sanitize an axis configuration (number line / timeline). */
export function normalizeAxisConfig(input) {
  const source = input && typeof input === 'object' ? input : {};
  const orientation = source.orientation === 'v' ? 'v' : 'h';
  let min = toNumber(source.min, 0);
  let max = toNumber(source.max, 10);
  if (!Number.isFinite(min)) min = 0;
  if (!Number.isFinite(max)) max = 10;
  if (max < min) [min, max] = [max, min];
  if (max - min > 1_000_000) max = min + 1_000_000;
  const span = max - min;
  let step = Math.abs(toNumber(source.step, span / 10 || 1));
  if (!Number.isFinite(step) || step <= 0) step = span / 10 || 1;
  const ticks = Math.max(2, Math.min(80, Math.floor(span / step) + 1));
  return {
    orientation,
    min: Math.round(min * 1000) / 1000,
    max: Math.round(max * 1000) / 1000,
    step: Math.round(step * 1000) / 1000,
    ticks,
    unit: cleanText(source.unit ?? '', 20),
    title: cleanText(source.title ?? '数轴', 60),
  };
}

const MAX_STROKE_POINTS = 3000;
const MAX_STROKE_WIDTH = 40;
const MAX_INLINE_GIF = 1_200_000;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toNumber = (value, fallback) => {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : fallback;
};

const round = (value) => Math.round(value);

let idCounter = 0;
/** Short, stable-looking, collision-resistant item id. */
export function newId(type = 'n') {
  idCounter = (idCounter + 1) % 1_000_000;
  const random = Math.random().toString(36).slice(2, 6);
  return `${type}_${Date.now().toString(36).slice(-4)}${idCounter.toString(36)}${random}`;
}

/** Remove control characters and bound the length of a text field. */
export function cleanText(value, limit = MAX_TEXT) {
  if (value === undefined || value === null) return '';
  const text = String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  return text.length > limit ? text.slice(0, limit) : text;
}

function cleanColor(value, type) {
  return PALETTE.includes(value) ? value : DEFAULTS[type]?.color ?? 'yellow';
}

function cleanSrc(value) {
  const src = cleanText(value, MAX_SRC).trim();
  if (src === '') return '';
  // Inline media is rewritten with the whole document on each save; keep it bounded.
  // Animated GIFs (the local video output) get a larger budget than static images.
  if (/^data:image\/gif/i.test(src)) return src.length <= MAX_INLINE_GIF ? src : '';
  if (/^data:image\//i.test(src)) return src.length <= MAX_INLINE_SRC ? src : '';
  if (/^https?:\/\//i.test(src)) return src;
  return '';
}

function nextZ(items) {
  let z = 0;
  for (const key of Object.keys(items)) {
    const item = items[key];
    if (item && typeof item.z === 'number' && item.z > z) z = item.z;
  }
  return z + 1;
}

/** Create an empty document. */
export function createDoc(now = new Date().toISOString()) {
  return {
    schema: SCHEMA_VERSION,
    id: 'default',
    title: '未命名画板',
    rev: 0,
    updatedAt: now,
    viewport: { cx: 0, cy: 0, zoom: 1, vw: 1200, vh: 800 },
    focus: null,
    items: {},
  };
}

/**
 * Coerce whatever the agent or the browser sent into a valid item.
 * Throws a readable error for values a caller must fix (unknown type, bad edge).
 */
export function normalizeItem(input, existing = undefined, items = {}, now = new Date().toISOString()) {
  if (input === null || typeof input !== 'object') throw new Error('item must be an object');
  const type = input.type ?? existing?.type ?? 'note';
  if (!ITEM_TYPES.includes(type)) {
    throw new Error(`unknown item type ${JSON.stringify(type)}; use one of ${ITEM_TYPES.join(', ')}`);
  }
  const defaults = DEFAULTS[type];
  const id = cleanText(input.id ?? existing?.id ?? newId(type === 'edge' ? 'e' : 'n'), 80).trim();
  if (id === '') throw new Error('item id must not be empty');

  const item = {
    id,
    type,
    x: round(clamp(toNumber(input.x, existing?.x ?? 0), -MAX_COORD, MAX_COORD)),
    y: round(clamp(toNumber(input.y, existing?.y ?? 0), -MAX_COORD, MAX_COORD)),
    w: type === 'edge' ? 0 : round(clamp(toNumber(input.w, existing?.w ?? defaults.w), MIN_SIZE, MAX_SIZE)),
    h: type === 'edge' ? 0 : round(clamp(toNumber(input.h, existing?.h ?? defaults.h), MIN_SIZE, MAX_SIZE)),
    z: round(toNumber(input.z, existing?.z ?? nextZ(items))),
    text: cleanText(input.text ?? existing?.text ?? ''),
    color: cleanColor(input.color ?? existing?.color, type),
    by: input.by === 'ai' || existing?.by === 'ai' ? 'ai' : 'user',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (type === 'shape') {
    const shape = input.shape ?? existing?.shape ?? 'rect';
    item.shape = SHAPES.includes(shape) ? shape : 'rect';
  }
  if (type === 'image') item.src = cleanSrc(input.src ?? existing?.src ?? '');
  if (input.frameId === null) item.frameId = null;
  else if (input.frameId !== undefined || existing?.frameId) {
    item.frameId = cleanText(input.frameId ?? existing?.frameId, 80) || null;
  }
  if (type === 'edge') {
    const from = cleanText(input.from ?? existing?.from ?? '', 80).trim();
    const to = cleanText(input.to ?? existing?.to ?? '', 80).trim();
    if (from === '' || to === '') throw new Error('edge requires non-empty "from" and "to" item ids');
    item.from = from;
    item.to = to;
    item.label = cleanText(input.label ?? existing?.label ?? '', 200);
  }
  if (type === 'stroke') {
    const raw = input.points ?? existing?.points ?? [];    if (!Array.isArray(raw) || raw.length === 0) throw new Error('stroke requires a non-empty "points" array');
    const points = [];
    let maxX = 0;
    let maxY = 0;
    for (const point of raw.slice(0, MAX_STROKE_POINTS)) {
      const px = Array.isArray(point) ? Number(point[0]) : Number(point?.x);
      const py = Array.isArray(point) ? Number(point[1]) : Number(point?.y);
      if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
      const relX = round(clamp(px, 0, MAX_SIZE));
      const relY = round(clamp(py, 0, MAX_SIZE));
      points.push([relX, relY]);
      if (relX > maxX) maxX = relX;
      if (relY > maxY) maxY = relY;
    }
    if (points.length === 0) throw new Error('stroke has no valid points');
    item.points = points;
    item.w = Math.max(1, maxX);
    item.h = Math.max(1, maxY);
    item.width = round(clamp(toNumber(input.width, existing?.width ?? 3), 1, MAX_STROKE_WIDTH));
  }
  if (type === 'agent') {
    item.task = cleanText(input.task ?? existing?.task ?? '', 4000);
    item.role = cleanText(input.role ?? existing?.role ?? '', 12000);
    item.output = (input.output ?? existing?.output ?? 'canvas') === 'document' ? 'document' : 'canvas';
    // Project grouping (A) and parent/child delegation (B): a child agent carries
    // the id of its coordinator plus the project name it is responsible for.
    const parentId = cleanText(input.parentId ?? existing?.parentId ?? '', 80).trim();
    item.parentId = parentId === '' ? null : parentId;
    item.project = cleanText(input.project ?? existing?.project ?? '', 60).trim();
    const status = String(input.status ?? existing?.status ?? 'idle');
    item.status = AGENT_STATUSES.includes(status) ? status : 'idle';
    if (input.agentResult !== undefined || existing?.agentResult) {
      item.agentResult = cleanText(input.agentResult ?? existing?.agentResult ?? '', 2000);
    }
  }
  if (input.meta !== undefined && input.meta !== null && typeof input.meta === 'object') {
    try {
      const encoded = JSON.stringify(input.meta);
      if (encoded.length <= 20000) item.meta = JSON.parse(encoded);
    } catch {
      /* ignore unserializable metadata */
    }
  } else if (existing?.meta) {
    item.meta = existing.meta;
  }
  if (type === 'axis') {
    item.meta = { ...(item.meta ?? {}), axis: normalizeAxisConfig(item.meta?.axis ?? existing?.meta?.axis) };
  }
  return item;
}

function normalizeViewport(view, previous) {
  const base = previous ?? { cx: 0, cy: 0, zoom: 1, vw: 1200, vh: 800 };
  return {
    cx: round(clamp(toNumber(view?.cx, base.cx), -MAX_COORD, MAX_COORD)),
    cy: round(clamp(toNumber(view?.cy, base.cy), -MAX_COORD, MAX_COORD)),
    zoom: Math.round(clamp(toNumber(view?.zoom, base.zoom), 0.1, 4) * 1000) / 1000,
    vw: round(clamp(toNumber(view?.vw, base.vw), 100, 20000)),
    vh: round(clamp(toNumber(view?.vh, base.vh), 100, 20000)),
  };
}

/**
 * Apply one batch of operations in place-ish (returns a new doc object).
 * @param {object} doc current document
 * @param {Array<object>} ops operations to apply
 * @param {'user'|'ai'} by writer identity recorded on the items
 * @param {string} now ISO timestamp
 * @returns {{ doc: object, applied: Array<object>, changed: string[], errors: string[] }}
 */
export function applyOps(doc, ops, by = 'user', now = new Date().toISOString()) {
  if (!Array.isArray(ops) || ops.length === 0) throw new Error('ops must be a non-empty array');
  const next = {
    ...doc,
    items: { ...doc.items },
    viewport: { ...doc.viewport },
  };
  const applied = [];
  const changed = [];
  const errors = [];
  let touchedContent = false;

  for (const raw of ops) {
    if (raw === null || typeof raw !== 'object') {
      errors.push('operation must be an object');
      continue;
    }
    const kind = String(raw.op ?? '');
    try {
      if (kind === 'upsert') {
        const replacing = raw.item?.id ? next.items[raw.item.id] : undefined;
        if (!replacing && Object.keys(next.items).length >= MAX_ITEMS) {
          throw new Error(`canvas already holds the maximum of ${MAX_ITEMS} items`);
        }
        const item = normalizeItem({ ...raw.item, by }, replacing, next.items, now);
        next.items[item.id] = item;
        applied.push({ op: 'upsert', item });
        changed.push(item.id);
        touchedContent = true;
      } else if (kind === 'patch') {
        const id = cleanText(raw.id, 80).trim();
        const existing = next.items[id];
        if (!existing) throw new Error(`no item with id ${JSON.stringify(id)}`);
        const item = normalizeItem(
          { ...existing, ...(raw.patch ?? {}), id, by, type: raw.patch?.type ?? existing.type },
          existing,
          next.items,
          now,
        );
        next.items[id] = item;
        applied.push({ op: 'upsert', item });
        changed.push(id);
        touchedContent = true;
      } else if (kind === 'delete') {
        const id = cleanText(raw.id, 80).trim();
        if (!next.items[id]) throw new Error(`no item with id ${JSON.stringify(id)}`);
        delete next.items[id];
        applied.push({ op: 'delete', id });
        changed.push(id);
        for (const key of Object.keys(next.items)) {
          const item = next.items[key];
          if (item.type === 'edge' && (item.from === id || item.to === id)) {
            delete next.items[key];
            applied.push({ op: 'delete', id: key });
            changed.push(key);
          }
        }
        touchedContent = true;
      } else if (kind === 'clear') {
        next.items = {};
        applied.push({ op: 'clear' });
        changed.push('*');
        touchedContent = true;
      } else if (kind === 'title') {
        next.title = cleanText(raw.title, MAX_TITLE).trim() || '未命名画板';
        applied.push({ op: 'title', title: next.title });
      } else if (kind === 'viewport') {
        next.viewport = normalizeViewport(raw.viewport, next.viewport);
        applied.push({ op: 'viewport', viewport: next.viewport });
      } else if (kind === 'focus') {
        const viewport = normalizeViewport({ cx: raw.cx, cy: raw.cy, zoom: raw.zoom ?? next.viewport.zoom, vw: next.viewport.vw, vh: next.viewport.vh }, next.viewport);
        next.focus = { cx: viewport.cx, cy: viewport.cy, zoom: viewport.zoom, at: Date.now() };
        applied.push({ op: 'focus', cx: next.focus.cx, cy: next.focus.cy, zoom: next.focus.zoom, at: next.focus.at });
      } else {
        throw new Error(`unknown op ${JSON.stringify(kind)}; use upsert, patch, delete, clear, title, viewport or focus`);
      }
    } catch (error) {
      errors.push(String(error?.message ?? error));
    }
  }

  if (applied.length === 0) return { doc, applied, changed, errors };
  const rev = (doc.rev ?? 0) + 1;
  next.rev = rev;
  next.updatedAt = now;
  if (touchedContent) next.title = next.title || '未命名画板';
  return { doc: next, applied, changed, errors };
}

/** Append one batch to the bounded sync log. */
export function appendLog(log, entry) {
  const next = log.slice();
  next.push(entry);
  while (next.length > MAX_LOG) next.shift();
  return next;
}

/**
 * Build the incremental or full response for a polling client.
 * @param {object} doc current document
 * @param {Array<object>} log bounded op log
 * @param {number|undefined} since last revision the client saw
 */
export function syncPayload(doc, log, since) {
  const base = { rev: doc.rev, title: doc.title, viewport: doc.viewport, focus: doc.focus, updatedAt: doc.updatedAt };
  const numeric = typeof since === 'number' && Number.isFinite(since);
  if (numeric && since === doc.rev) return { ...base, full: false };
  if (numeric && since > doc.rev) return { ...base, full: true, items: doc.items };
  const firstRev = log.length > 0 ? log[0].rev : doc.rev + 1;
  const canDelta = numeric && log.length > 0 && since >= firstRev - 1;
  if (canDelta) {
    return { ...base, full: false, ops: log.filter((entry) => entry.rev > since).flatMap((entry) => entry.ops) };
  }
  return { ...base, full: true, items: doc.items };
}

function textPreview(text, limit) {
  const single = String(text ?? '').replace(/\s+/g, ' ').trim();
  return single.length > limit ? `${single.slice(0, limit)}…` : single;
}

function visibleWorldRect(doc) {
  const { cx, cy, zoom, vw, vh } = doc.viewport;
  const width = vw / zoom;
  const height = vh / zoom;
  return { x: round(cx - width / 2), y: round(cy - height / 2), w: round(width), h: round(height) };
}

/** Item list without internal noise, for the model. */
export function describeItem(item, textLimit = 160) {
  const described = {
    id: item.id,
    type: item.type,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    z: item.z,
    by: item.by,
  };
  if (item.text) described.text = textPreview(item.text, textLimit);
  if (item.type !== 'text' && item.type !== 'image') described.color = item.color;
  if (item.type === 'shape') described.shape = item.shape;
  if (item.type === 'image') described.src = item.src ? item.src.slice(0, 120) : '';
  if (item.type === 'edge') {
    described.from = item.from;
    described.to = item.to;
    if (item.label) described.label = item.label;
  }
  if (item.type === 'stroke') {
    described.points = Array.isArray(item.points) ? item.points.length : 0;
    described.width = item.width ?? 3;
  }
  if (item.type === 'agent') {
    described.status = item.status ?? 'idle';
    described.output = item.output ?? 'canvas';
    if (item.task) described.task = textPreview(item.task, 120);
    if (item.role) described.role = textPreview(item.role, 160);
    if (item.agentResult) described.result = textPreview(item.agentResult, 120);
    if (item.project) described.project = item.project;
    if (item.parentId) described.parentId = item.parentId;
  }
  if (item.frameId) described.frameId = item.frameId;
  return described;
}

export function summarizeDoc(doc, options = {}) {
  const include = options.include === 'full' ? 'full' : 'summary';
  const limit = clamp(Math.trunc(toNumber(options.limit, include === 'full' ? 120 : 200)), 1, 2000);
  const cursor = Math.max(0, Math.trunc(toNumber(options.cursor, 0)));
  const textLimit = include === 'full' ? 4000 : 160;
  const all = Object.values(doc.items).sort((a, b) => a.z - b.z || String(a.id).localeCompare(String(b.id)));
  const slice = all.slice(cursor, cursor + limit);
  const counts = {};
  for (const item of all) counts[item.type] = (counts[item.type] ?? 0) + 1;
  const summary = {
    rev: doc.rev,
    title: doc.title,
    counts,
    total: all.length,
    viewport: { ...doc.viewport, visibleWorld: visibleWorldRect(doc) },
    focus: doc.focus,
    items: slice.map((item) => (include === 'full'
      ? { ...describeItem(item, textLimit), meta: item.meta ?? null, createdAt: item.createdAt, updatedAt: item.updatedAt }
      : describeItem(item, textLimit))),
    cursor,
    nextCursor: cursor + slice.length < all.length ? cursor + slice.length : null,
  };
  return summary;
}

/** Bounding box of the requested items, or of the whole canvas. */
export function boundsOf(doc, ids) {
  const wanted = Array.isArray(ids) && ids.length > 0 ? ids.map(String) : null;
  const items = Object.values(doc.items).filter((item) => item.type !== 'edge' && (wanted === null || wanted.includes(item.id)));
  if (items.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const item of items) {
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + item.w);
    maxY = Math.max(maxY, item.y + item.h);
  }
  return { x: round(minX), y: round(minY), w: round(maxX - minX), h: round(maxY - minY) };
}

/**
 * Place a batch of new items that did not declare coordinates: continue to the
 * right of existing content in a 4-column grid, or start a fresh row.
 */
export function placeItems(doc, count, cell = { w: 260, h: 180 }) {
  const gap = 40;
  const columns = 4;
  const bounds = boundsOf(doc, []);
  const startX = bounds === null ? 0 : bounds.x + bounds.w + 120;
  const startY = bounds === null ? 0 : bounds.y;
  const positions = [];
  for (let index = 0; index < count; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    positions.push({ x: startX + column * (cell.w + gap), y: startY + row * (cell.h + gap) });
  }
  return positions;
}

/** Viewport that centers the requested rect/ids, with optional zoom. */
export function focusViewport(doc, options = {}) {
  let bounds = boundsOf(doc, options.ids);
  if (options.rect && typeof options.rect === 'object') {
    const rect = {
      x: toNumber(options.rect.x, 0),
      y: toNumber(options.rect.y, 0),
      w: Math.max(1, toNumber(options.rect.w, 100)),
      h: Math.max(1, toNumber(options.rect.h, 100)),
    };
    bounds = bounds === null ? rect : {
      x: Math.min(bounds.x, rect.x),
      y: Math.min(bounds.y, rect.y),
      w: Math.max(bounds.x + bounds.w, rect.x + rect.w) - Math.min(bounds.x, rect.x),
      h: Math.max(bounds.y + bounds.h, rect.y + rect.h) - Math.min(bounds.y, rect.y),
    };
  }
  if (bounds === null) return null;
  const padding = 120;
  const vw = doc.viewport.vw || 1200;
  const vh = doc.viewport.vh || 800;
  const fitZoom = Math.min((vw - padding * 2) / Math.max(bounds.w, 1), (vh - padding * 2) / Math.max(bounds.h, 1));
  const zoom = clamp(toNumber(options.zoom, Math.min(1.2, Math.max(0.2, fitZoom))), 0.1, 4);
  return {
    cx: round(bounds.x + bounds.w / 2),
    cy: round(bounds.y + bounds.h / 2),
    zoom: Math.round(zoom * 1000) / 1000,
  };
}

/** Validate ids exist; returns readable errors for the agent. */
export function missingIds(doc, ids) {
  const missing = [];
  for (const id of ids ?? []) {
    if (!doc.items[String(id)]) missing.push(String(id));
  }
  return missing;
}

/* ------------------------------------------------------------------ *
 * Canvas library: multiple canvases + per-canvas history snapshots.
 * The stored value is this library; each canvas owns a normal doc.
 * ------------------------------------------------------------------ */

export const LIBRARY_SCHEMA = 1;
const MAX_BOARDS = 40;
const MAX_HISTORY = 20;
const MAX_HISTORY_LABEL = 60;

const clone = (value) => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

function docLooksValid(doc) {
  return Boolean(doc && typeof doc === 'object' && !Array.isArray(doc) && doc.items && typeof doc.items === 'object' && !Array.isArray(doc.items) && doc.viewport && typeof doc.viewport === 'object');
}

function cleanDoc(value, fallbackId) {
  const doc = clone(value && typeof value === 'object' ? value : {});
  const id = cleanText(doc.id, 80).trim() || fallbackId;
  const viewport = doc.viewport && typeof doc.viewport === 'object' ? doc.viewport : {};
  return {
    ...doc,
    schema: SCHEMA_VERSION,
    id,
    title: cleanText(doc.title, MAX_TITLE).trim() || '未命名画板',
    rev: Math.max(0, Math.trunc(toNumber(doc.rev, 0))),
    updatedAt: cleanText(doc.updatedAt, 40) || new Date().toISOString(),
    focus: doc.focus && typeof doc.focus === 'object' ? doc.focus : null,
    items: doc.items && typeof doc.items === 'object' && !Array.isArray(doc.items) ? doc.items : {},
    viewport: {
      cx: round(toNumber(viewport.cx, 0)),
      cy: round(toNumber(viewport.cy, 0)),
      zoom: Math.min(4, Math.max(0.1, toNumber(viewport.zoom, 1))),
      vw: Math.min(20000, Math.max(100, toNumber(viewport.vw, 1200))),
      vh: Math.min(20000, Math.max(100, toNumber(viewport.vh, 800))),
    },
  };
}

/** Fresh library with one canvas (the given doc, or a brand-new empty one). */
export function createLibrary(doc = undefined, now = new Date().toISOString()) {
  const canvasId = newId('c');
  const sceneDoc = cleanDoc(doc ?? createDoc(now), canvasId);
  sceneDoc.id = canvasId;
  return {
    schema: LIBRARY_SCHEMA,
    currentId: canvasId,
    updatedAt: now,
    canvases: [{ id: canvasId, createdAt: now, updatedAt: now, doc: sceneDoc }],
    history: {},
  };
}

/** Accept either a legacy single document or a library; always return a valid library. */
export function normalizeLibrary(value, now = new Date().toISOString()) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('stored canvas library is not an object');
  }
  if (!Array.isArray(value.canvases)) {
    // Legacy: the stored value was one bare document under key "main".
    if (!docLooksValid(value)) throw new TypeError('stored canvas has no items object');
    if (typeof value.schema === 'number' && value.schema > SCHEMA_VERSION) {
      throw new Error(`stored canvas schema ${value.schema} is newer than this plugin`);
    }
    return createLibrary(value, now);
  }
  if (typeof value.schema === 'number' && value.schema > LIBRARY_SCHEMA) {
    throw new Error(`stored library schema ${value.schema} is newer than this plugin`);
  }
  const canvases = [];
  const seen = new Set();
  for (const entry of value.canvases.slice(0, MAX_BOARDS)) {
    if (!entry || typeof entry !== 'object') continue;
    const id = cleanText(entry.id, 80).trim() || newId('c');
    if (seen.has(id)) continue;
    seen.add(id);
    const doc = cleanDoc(entry.doc, id);
    doc.id = id;
    canvases.push({
      id,
      createdAt: cleanText(entry.createdAt, 40) || now,
      updatedAt: cleanText(entry.updatedAt, 40) || doc.updatedAt,
      doc,
    });
  }
  if (canvases.length === 0) return createLibrary(undefined, now);
  const currentId = seen.has(cleanText(value.currentId, 80).trim()) ? cleanText(value.currentId, 80).trim() : canvases[0].id;
  const history = {};
  for (const entry of canvases) {
    const list = Array.isArray(value.history?.[entry.id]) ? value.history[entry.id] : [];
    const cleaned = [];
    for (const snapshot of list) {
      if (!snapshot || typeof snapshot !== 'object' || !docLooksValid(snapshot.doc)) continue;
      const snapshotDoc = cleanDoc(snapshot.doc, entry.id);
      snapshotDoc.id = entry.id;
      cleaned.push({
        id: cleanText(snapshot.id, 80).trim() || newId('h'),
        at: Math.max(0, Math.trunc(toNumber(snapshot.at, 0))),
        label: cleanText(snapshot.label, MAX_HISTORY_LABEL).trim(),
        nodes: Number.isFinite(Number(snapshot.nodes)) ? Math.max(0, Math.trunc(Number(snapshot.nodes))) : Object.keys(snapshotDoc.items).length,
        doc: snapshotDoc,
      });
    }
    if (cleaned.length > 0) history[entry.id] = cleaned.slice(-MAX_HISTORY);
  }
  return {
    schema: LIBRARY_SCHEMA,
    currentId,
    updatedAt: cleanText(value.updatedAt, 40) || now,
    canvases,
    history,
  };
}

/** Scene record of the active canvas. */
export function currentScene(library) {
  return library.canvases.find((entry) => entry.id === library.currentId) ?? library.canvases[0] ?? null;
}

/** Lightweight canvas list for the client. */
export function librarySummary(library) {
  return {
    currentId: library.currentId,
    canvases: library.canvases.map((entry) => ({
      id: entry.id,
      title: entry.doc.title,
      nodes: Object.keys(entry.doc.items).length,
      updatedAt: entry.doc.updatedAt,
    })),
    history: Object.fromEntries(
      Object.entries(library.history ?? {}).map(([canvasId, list]) => [canvasId, list.length]),
    ),
  };
}

/** Create a canvas and make it current; returns the fresh doc. */
export function addCanvas(library, title = '', now = new Date().toISOString()) {
  if (library.canvases.length >= MAX_BOARDS) return null;
  const canvasId = newId('c');
  const doc = cleanDoc(createDoc(now), canvasId);
  doc.id = canvasId;
  const fallbackTitle = `画布 ${library.canvases.length + 1}`;
  doc.title = cleanText(title, MAX_TITLE).trim() || fallbackTitle;
  library.canvases.push({ id: canvasId, createdAt: now, updatedAt: now, doc });
  library.currentId = canvasId;
  library.updatedAt = now;
  return doc;
}

/** Switch the active canvas; returns the doc or null. */
export function switchCanvas(library, canvasId) {
  const scene = library.canvases.find((entry) => entry.id === String(canvasId));
  if (!scene) return null;
  library.currentId = scene.id;
  return scene.doc;
}

/** Rename a canvas (doc.title is the canvas name). */
export function renameCanvas(library, canvasId, title) {
  const scene = library.canvases.find((entry) => entry.id === String(canvasId));
  if (!scene) return false;
  const next = cleanText(title, MAX_TITLE).trim();
  if (next === '') return false;
  scene.doc.title = next;
  scene.updatedAt = new Date().toISOString();
  return true;
}

/** Delete a canvas (and its history); the library always keeps at least one canvas. */
export function deleteCanvas(library, canvasId, now = new Date().toISOString()) {
  const id = String(canvasId);
  const index = library.canvases.findIndex((entry) => entry.id === id);
  if (index < 0) return false;
  library.canvases.splice(index, 1);
  if (library.history) delete library.history[id];
  if (library.canvases.length === 0) {
    const doc = addCanvas(library, '', now);
    return doc !== null;
  }
  if (library.currentId === id) {
    const next = library.canvases[Math.min(index, library.canvases.length - 1)];
    library.currentId = next.id;
  }
  library.updatedAt = now;
  return true;
}

/** Save a snapshot of the active canvas; keeps the newest MAX_HISTORY entries. */
export function pushSnapshot(library, label = '', now = Date.now()) {
  const scene = currentScene(library);
  if (!scene) return null;
  const list = Array.isArray(library.history[scene.id]) ? library.history[scene.id] : [];
  const entry = {
    id: newId('h'),
    at: now,
    label: cleanText(label, MAX_HISTORY_LABEL).trim(),
    nodes: Object.keys(scene.doc.items).length,
    doc: cleanDoc(scene.doc, scene.id),
  };
  entry.doc.id = scene.id;
  list.push(entry);
  while (list.length > MAX_HISTORY) list.shift();
  library.history[scene.id] = list;
  return entry;
}

/** Snapshot metadata (without the heavy doc bodies) for the active canvas. */
export function listSnapshots(library) {
  const scene = currentScene(library);
  if (!scene) return [];
  return (library.history[scene.id] ?? [])
    .map((entry) => ({ id: entry.id, at: entry.at, label: entry.label, nodes: entry.nodes }))
    .sort((left, right) => right.at - left.at);
}

/**
 * Restore one snapshot into the active canvas. The pre-restore state is saved as a
 * snapshot first so a restore can always be rolled back.
 */
export function restoreSnapshot(library, entryId) {
  const scene = currentScene(library);
  if (!scene) return false;
  const list = library.history[scene.id] ?? [];
  const entry = list.find((candidate) => candidate.id === String(entryId));
  if (!entry) return false;
  pushSnapshot(library, '恢复前自动保存');
  const next = cleanDoc(entry.doc, scene.id);
  next.id = scene.id;
  next.rev = Math.max(scene.doc.rev, next.rev) + 1;
  next.updatedAt = new Date().toISOString();
  scene.doc = next;
  scene.updatedAt = next.updatedAt;
  return true;
}

/** Delete one snapshot of the active canvas. */
export function deleteSnapshot(library, entryId) {
  const scene = currentScene(library);
  if (!scene) return false;
  const list = library.history[scene.id] ?? [];
  const index = list.findIndex((entry) => entry.id === String(entryId));
  if (index < 0) return false;
  list.splice(index, 1);
  if (list.length === 0) delete library.history[scene.id];
  else library.history[scene.id] = list;
  return true;
}

/* ---------------------------------------------------------------- *
 * relation graph (Obsidian-style graph view data)
 * ---------------------------------------------------------------- */

const GRAPH_LINK_PATTERN = /\[\[([^\]|#\n]{1,120})(?:[|#][^\]\n]*)?\]\]/g;
const GRAPH_TAG_PATTERN = /(?:^|[\s(（:：])#([\p{L}\p{N}_\-/]{1,40})/gu;
/** Card kinds that become graph nodes (edges / strokes / frames are not nodes). */
export const GRAPH_NODE_TYPES = ['note', 'text', 'shape', 'image', 'agent', 'axis'];
const GRAPH_MAX_LINKS = 40;
const GRAPH_MAX_TAGS = 40;

const uniqueStrings = (values, limit) => {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    if (text === '') continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text.slice(0, 120));
    if (result.length >= limit) break;
  }
  return result;
};

/** `[[wiki link]]` targets inside a text, deduped and capped. */
export function extractRelationLinks(text) {
  const source = String(text ?? '');
  const targets = [];
  GRAPH_LINK_PATTERN.lastIndex = 0;
  let match;
  while ((match = GRAPH_LINK_PATTERN.exec(source)) !== null) {
    targets.push(match[1]);
    if (targets.length > GRAPH_MAX_LINKS * 2) break;
  }
  return uniqueStrings(targets, GRAPH_MAX_LINKS);
}

/** `#hashtag`s inside a text, deduped and capped. */
export function extractRelationTags(text) {
  const source = String(text ?? '');
  const tags = [];
  GRAPH_TAG_PATTERN.lastIndex = 0;
  let match;
  while ((match = GRAPH_TAG_PATTERN.exec(source)) !== null) {
    tags.push(match[1]);
    if (tags.length > GRAPH_MAX_TAGS * 2) break;
  }
  return uniqueStrings(tags, GRAPH_MAX_TAGS);
}

/** Readable single-line title for a card / note (markdown heading stripped). */
export function relationTitle(text, fallback = '') {
  const lines = String(text ?? '').split('\n');
  for (const line of lines) {
    const cleaned = line
      .replace(/^#{1,6}\s+/, '')
      .replace(/[*_`>~\-+]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned !== '') return cleaned.slice(0, 80);
  }
  return String(fallback ?? '').trim().slice(0, 80);
}

/** Precompute the graph-relevant fields of a text (title / tags / links). */
export function relationTextMeta(text) {
  return {
    title: relationTitle(text),
    tags: extractRelationTags(text),
    links: extractRelationLinks(text),
  };
}

/** Normalized lookup key for a graph reference (files, titles, wiki targets). */
const graphKey = (value) =>
  String(value ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\.(md|markdown)$/i, '');

/**
 * Build the relation network of a set of cards / vault files.
 *
 * `cards`: [{ itemId, canvasId, canvasTitle?, type, text?, title?, tags?, links?, filePath?, fileName? }]
 * `files`: [{ rel, path, name, title?, text?, tags?, links? }]
 * `canvasEdges`: [{ canvasId, from, to, label? }]
 *
 * Returns { nodes, edges, truncated } where every node carries its degree and
 * every edge carries `kind` = canvas | wiki | tag | sync.
 */
export function buildRelationGraph(input = {}) {
  const cards = Array.isArray(input.cards) ? input.cards : [];
  const files = Array.isArray(input.files) ? input.files : [];
  const canvasEdges = Array.isArray(input.canvasEdges) ? input.canvasEdges : [];
  const includeTags = input.includeTags !== false;
  const includeOrphans = input.includeOrphans !== false;
  const maxNodes = Math.max(10, Math.min(3000, Number(input.maxNodes) || 900));

  const nodes = new Map();
  const lookup = new Map();
  const cardNodeIds = new Map();
  const register = (node) => {
    nodes.set(node.id, node);
    return node;
  };
  const addLookup = (value, nodeId) => {
    const key = graphKey(value);
    if (key === '' || !lookup.has(key)) {
      if (key !== '') lookup.set(key, nodeId);
    }
  };

  for (const card of cards) {
    if (!card || card.itemId === undefined || card.itemId === null) continue;
    const type = String(card.type ?? 'note');
    if (!GRAPH_NODE_TYPES.includes(type)) continue;
    const canvasId = String(card.canvasId ?? '');
    const itemId = String(card.itemId);
    const meta = typeof card.text === 'string' && card.title === undefined ? relationTextMeta(card.text) : null;
    const title = String(card.title ?? (meta ? meta.title : '')).trim() || type;
    const tags = uniqueStrings([...(Array.isArray(card.tags) ? card.tags : []), ...(meta ? meta.tags : [])], GRAPH_MAX_TAGS);
    const links = uniqueStrings([...(Array.isArray(card.links) ? card.links : []), ...(meta ? meta.links : [])], GRAPH_MAX_LINKS);
    const id = `card:${canvasId}:${itemId}`;
    const node = {
      id,
      kind: 'card',
      type,
      label: title.slice(0, 80),
      canvasId,
      canvasTitle: String(card.canvasTitle ?? ''),
      itemId,
      path: String(card.filePath ?? ''),
      fileName: String(card.fileName ?? ''),
      tags,
      links,
      degree: 0,
    };
    register(node);
    cardNodeIds.set(`${canvasId}\u0000${itemId}`, id);
    addLookup(title, id);
    if (node.fileName) addLookup(node.fileName, id);
    if (node.path) {
      addLookup(node.path, id);
      addLookup(node.path.replace(/\.[^./\\]+$/, ''), id);
    }
  }

  for (const file of files) {
    if (!file || file.rel === undefined || file.rel === null) continue;
    const rel = String(file.rel);
    if (rel.trim() === '') continue;
    const meta = typeof file.text === 'string' && file.title === undefined ? relationTextMeta(file.text) : null;
    const name = String(file.name ?? rel.split('/').pop() ?? rel);
    const title = String(file.title ?? (meta ? meta.title : '')).trim() || name.replace(/\.[^.]+$/, '');
    const tags = uniqueStrings([...(Array.isArray(file.tags) ? file.tags : []), ...(meta ? meta.tags : [])], GRAPH_MAX_TAGS);
    const links = uniqueStrings([...(Array.isArray(file.links) ? file.links : []), ...(meta ? meta.links : [])], GRAPH_MAX_LINKS);
    const id = `file:${rel}`;
    register({
      id,
      kind: 'file',
      type: 'file',
      label: title.slice(0, 80),
      rel,
      name,
      path: String(file.path ?? ''),
      tags,
      links,
      degree: 0,
    });
    addLookup(rel, id);
    addLookup(name, id);
    addLookup(title, id);
    if (file.path) addLookup(file.path, id);
  }

  const resolveTarget = (target) => {
    const raw = String(target ?? '').trim().replace(/^\[\[|\]\]$/g, '');
    if (raw === '') return null;
    const key = graphKey(raw);
    if (key === '') return null;
    if (lookup.has(key)) return lookup.get(key);
    const base = key.split('/').pop();
    if (base && base !== key && lookup.has(base)) return lookup.get(base);
    return null;
  };

  const edges = new Map();
  const addEdge = (source, target, kind, label = '') => {
    if (!source || !target || source === target) return;
    const key = `${source}\u0000${target}\u0000${kind}`;
    if (edges.has(key)) return;
    edges.set(key, { source, target, kind, label: String(label ?? '').slice(0, 60) });
  };

  for (const node of nodes.values()) {
    if (node.kind === 'tag') continue;
    for (const link of node.links) {
      const target = resolveTarget(link);
      if (target) addEdge(node.id, target, 'wiki');
    }
  }
  for (const edge of canvasEdges) {
    const canvasId = String(edge?.canvasId ?? '');
    const source = cardNodeIds.get(`${canvasId}\u0000${String(edge?.from ?? '')}`);
    const target = cardNodeIds.get(`${canvasId}\u0000${String(edge?.to ?? '')}`);
    if (source && target) addEdge(source, target, 'canvas', edge.label);
  }
  // Same file imported both from the vault and onto a canvas: link card ↔ file.
  const fileNodes = [...nodes.values()].filter((node) => node.kind === 'file');
  if (fileNodes.length > 0) {
    for (const node of nodes.values()) {
      if (node.kind !== 'card' || node.path === '') continue;
      const cardPath = graphKey(node.path);
      const cardBase = cardPath.split('/').pop();
      let hit = null;
      for (const file of fileNodes) {
        const relPath = graphKey(file.rel);
        if (cardPath === graphKey(file.path) || cardPath.endsWith(`/${relPath}`)) {
          hit = file;
          break;
        }
        if (cardBase && cardBase === graphKey(file.name)) {
          hit = hit ?? file;
        }
      }
      if (hit) addEdge(node.id, hit.id, 'sync');
    }
  }
  if (includeTags) {
    for (const node of nodes.values()) {
      if (node.kind === 'tag') continue;
      for (const tag of node.tags) {
        const id = `tag:${tag.toLowerCase()}`;
        if (!nodes.has(id)) {
          register({ id, kind: 'tag', type: 'tag', label: `#${tag}`, tag, tags: [], links: [], degree: 0 });
        }
        addEdge(node.id, id, 'tag');
      }
    }
  }

  const edgeList = [...edges.values()];
  for (const edge of edgeList) {
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (source) source.degree += 1;
    if (target) target.degree += 1;
  }

  let keptNodes = [...nodes.values()];
  if (!includeOrphans) keptNodes = keptNodes.filter((node) => node.degree > 0);
  let truncated = Boolean(input.truncated);
  if (keptNodes.length > maxNodes) {
    keptNodes = keptNodes
      .slice()
      .sort((left, right) => right.degree - left.degree || String(left.id).localeCompare(String(right.id)))
      .slice(0, maxNodes);
    truncated = true;
  }
  const keptIds = new Set(keptNodes.map((node) => node.id));
  const finalEdges = edgeList.filter((edge) => keptIds.has(edge.source) && keptIds.has(edge.target));
  for (const node of keptNodes) node.degree = 0;
  for (const edge of finalEdges) {
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (source) source.degree += 1;
    if (target) target.degree += 1;
  }
  return { nodes: keptNodes, edges: finalEdges, truncated };
}
