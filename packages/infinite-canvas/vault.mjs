/**
 * Local Markdown-vault support (Obsidian-style), shared by the DSH plugin Host and
 * the standalone desktop server.
 *
 * Pure Node ESM: lists a folder, reads text files, and converts Obsidian `.canvas`
 * files (JSON Canvas 1.0) or Markdown notes into native canvas items. No imports
 * from @deepseek-ai/* packages.
 */
import { copyFile, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

import { newId, relationTextMeta } from './model.js';

export const TEXT_EXTENSIONS = new Set(['.md', '.markdown', '.txt', '.canvas', '.json']);
export const IMAGE_MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};
const SKIP_DIRS = new Set(['.git', 'node_modules', '.obsidian', '__pycache__', '.venv', 'dist', 'build', '.idea']);
const MAX_FILES = 600;
const MAX_DEPTH = 6;
const MAX_TEXT_BYTES = 400_000;
const MAX_IMAGE_BYTES = 2_400_000;

const OBSIDIAN_COLORS = {
  1: 'pink',
  2: 'orange',
  3: 'yellow',
  4: 'green',
  5: 'blue',
  6: 'purple',
};

const fileKind = (ext) => {
  if (ext === '.canvas') return 'canvas';
  if (ext === '.pdf') return 'pdf';
  if (IMAGE_MIME[ext]) return 'image';
  if (TEXT_EXTENSIONS.has(ext)) return 'text';
  return 'file';
};

/** Recursively list the readable files of a local folder (bounded). */
export async function listVault(root) {
  const absolute = resolve(String(root ?? '').trim());
  let info;
  try {
    info = await stat(absolute);
  } catch (error) {
    throw new Error(`文件夹不存在或不可访问：${absolute}`);
  }
  if (!info.isDirectory()) throw new Error(`不是文件夹：${absolute}`);
  const files = [];
  let truncated = false;

  async function walk(directory, depth, relative) {
    if (depth > MAX_DEPTH || truncated) return;
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      return;
    }
    entries.sort((left, right) => {
      if (left.isDirectory() !== right.isDirectory()) return left.isDirectory() ? -1 : 1;
      return left.name.localeCompare(right.name, 'zh-CN');
    });
    for (const entry of entries) {
      if (files.length >= MAX_FILES) {
        truncated = true;
        return;
      }
      const relativePath = relative === '' ? entry.name : `${relative}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
        await walk(join(directory, entry.name), depth + 1, relativePath);
        continue;
      }
      if (!entry.isFile()) continue;
      const extension = extname(entry.name).toLowerCase();
      const kind = fileKind(extension);
      if (kind === 'file') continue;
      let size = 0;
      let mtimeMs = 0;
      try {
        const stats = await stat(join(directory, entry.name));
        size = stats.size;
        mtimeMs = stats.mtimeMs;
      } catch (error) {
        /* unreadable file: still list the name */
      }
      files.push({
        path: join(directory, entry.name),
        rel: relativePath,
        name: entry.name,
        dir: relative,
        ext: extension,
        kind,
        size,
        mtimeMs,
      });
    }
  }

  await walk(absolute, 0, '');
  return { root: absolute, files, truncated };
}

/** Read one text-like file from the vault (bounded). */
export async function readVaultFile(filePath) {
  const absolute = resolve(String(filePath ?? '').trim());
  const extension = extname(absolute).toLowerCase();
  if (!TEXT_EXTENSIONS.has(extension)) throw new Error(`不支持读取该类型文件：${extension || 'unknown'}`);
  const info = await stat(absolute);
  if (!info.isFile()) throw new Error(`不是文件：${absolute}`);
  if (info.size > MAX_TEXT_BYTES) throw new Error(`文件太大（${Math.round(info.size / 1024)} KB），上限 ${Math.round(MAX_TEXT_BYTES / 1024)} KB`);
  const content = await readFile(absolute, 'utf8');
  return { path: absolute, content, size: info.size, mtimeMs: info.mtimeMs };
}

/**
 * Write a card's text back into its Markdown file.
 *
 * External edits are never silently lost: when the file on disk differs from what
 * this process last knew, the previous on-disk version is copied to
 * `<file>.conflict-<timestamp>.md` before the write.
 */
export async function writeNoteFile(filePath, content, options = {}) {
  const absolute = resolve(String(filePath ?? '').trim());
  const extension = extname(absolute).toLowerCase();
  if (!['.md', '.markdown', '.txt'].includes(extension)) {
    throw new Error(`只能写回 .md / .markdown / .txt 文件，当前是 ${extension || 'unknown'}`);
  }
  const nextContent = String(content ?? '');
  let previous = null;
  let mtimeMs = 0;
  try {
    const info = await stat(absolute);
    if (!info.isFile()) throw new Error(`不是文件：${absolute}`);
    mtimeMs = info.mtimeMs;
    previous = await readFile(absolute, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  if (previous !== null && previous === nextContent) {
    return { path: absolute, unchanged: true, size: Buffer.byteLength(nextContent, 'utf8'), mtimeMs, conflictBackup: '' };
  }
  const knownContent = typeof options.knownContent === 'string' ? options.knownContent : undefined;
  const knownMtime = Number(options.knownMtime);
  const externallyChanged =
    previous === null
      ? false
      : knownContent !== undefined
        ? previous !== knownContent
        : Number.isFinite(knownMtime) && knownMtime > 0 && mtimeMs > knownMtime + 2;
  let conflictBackup = '';
  if (externallyChanged) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    conflictBackup = `${absolute}.conflict-${stamp}.md`;
    try {
      await copyFile(absolute, conflictBackup);
    } catch (error) {
      conflictBackup = '';
    }
  }
  await writeFile(absolute, nextContent, 'utf8');
  const after = await stat(absolute);
  return {
    path: absolute,
    unchanged: false,
    size: after.size,
    mtimeMs: after.mtimeMs,
    conflictBackup,
    externallyChanged,
  };
}

const GRAPH_MAX_FILES = 300;
const GRAPH_FILE_MAX_BYTES = 200 * 1024;
const GRAPH_TOTAL_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Scan a Markdown vault into graph-ready note summaries (title / links / tags).
 * Read-only: this never modifies the folder. Used by the Obsidian-style graph view.
 */
export async function scanVaultGraph(root, options = {}) {
  const listing = await listVault(root);
  const maxFiles = Math.max(1, Math.min(Number(options.maxFiles) || GRAPH_MAX_FILES, GRAPH_MAX_FILES));
  const files = [];
  let truncated = Boolean(listing.truncated);
  let totalBytes = 0;
  for (const file of listing.files) {
    if (files.length >= maxFiles) {
      truncated = true;
      break;
    }
    if (!['.md', '.markdown'].includes(file.ext)) continue;
    const fallbackTitle = file.name.replace(/\.(md|markdown)$/i, '');
    if (Number(file.size) > GRAPH_FILE_MAX_BYTES) {
      files.push({ rel: file.rel, path: file.path, name: file.name, dir: file.dir, size: file.size, title: fallbackTitle, tags: [], links: [], tooLarge: true });
      continue;
    }
    let content = '';
    try {
      content = await readFile(file.path, 'utf8');
    } catch (error) {
      files.push({ rel: file.rel, path: file.path, name: file.name, dir: file.dir, size: file.size, title: fallbackTitle, tags: [], links: [], unreadable: true });
      continue;
    }
    totalBytes += Buffer.byteLength(content, 'utf8');
    if (totalBytes > GRAPH_TOTAL_MAX_BYTES) {
      truncated = true;
      break;
    }
    const meta = relationTextMeta(content);
    files.push({
      rel: file.rel,
      path: file.path,
      name: file.name,
      dir: file.dir,
      size: file.size,
      title: meta.title || fallbackTitle,
      tags: meta.tags,
      links: meta.links,
    });
  }
  return { root: listing.root, files, truncated, count: files.length };
}

const round = (value, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.round(Math.min(1_000_000, Math.max(-1_000_000, number)));
};

const clampSize = (value, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.round(Math.min(8000, Math.max(40, number)));
};

async function imageDataUrl(filePath) {
  const info = await stat(filePath);
  if (info.size > MAX_IMAGE_BYTES) throw new Error('图片太大，未导入');
  const extension = extname(filePath).toLowerCase();
  const mime = IMAGE_MIME[extension];
  if (!mime) throw new Error('不是支持的图片格式');
  const buffer = await readFile(filePath);
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

const LONG_TEXT_CHARS = 320;
const LONG_TEXT_LINES = 10;

/** Long Markdown is a document, not a sticky note: import it as a wider auto-height text card. */
function isLongMarkdown(text) {
  const value = String(text ?? '');
  return value.length > LONG_TEXT_CHARS || value.split('\n').length > LONG_TEXT_LINES;
}

function documentHeight(text, width) {
  const columns = Math.max(18, Math.floor((Number(width) || 560) / 13));
  const lines = String(text ?? '')
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / columns)), 0);
  return Math.min(4000, Math.max(220, Math.round(lines * 27 + 70)));
}

async function markdownItem(filePath, meta = {}) {
  const absolute = resolve(filePath);
  const extension = extname(absolute).toLowerCase();
  if (extension === '.canvas') return canvasItems(absolute);
  if (IMAGE_MIME[extension]) {
    const src = await imageDataUrl(absolute);
    return {
      items: [
        {
          id: newId('n'),
          type: 'image',
          x: 0,
          y: 0,
          w: 360,
          h: 240,
          text: absolute.split(/[\\/]/).pop() ?? '',
          src,
          meta: { ...meta, filePath: absolute },
        },
      ],
    };
  }
  const file = await readVaultFile(absolute);
  const long = isLongMarkdown(file.content);
  const width = long ? 560 : 360;
  return {
    items: [
      {
        id: newId('n'),
        type: long ? 'text' : 'note',
        x: 0,
        y: 0,
        w: width,
        h: long ? documentHeight(file.content, width) : 260,
        ...(long ? { color: 'white' } : {}),
        text: file.content,
        meta: {
          ...meta,
          filePath: absolute,
          fileName: absolute.split(/[\\/]/).pop() ?? '',
          ...(long ? { longDoc: true } : {}),
        },
      },
    ],
  };
}

/** Convert one Obsidian `.canvas` (JSON Canvas 1.0) into native canvas items. */
async function canvasItems(filePath) {
  const file = await readVaultFile(filePath);
  let parsed;
  try {
    parsed = JSON.parse(file.content);
  } catch (error) {
    throw new Error(`.canvas 不是合法 JSON：${error?.message ?? error}`);
  }
  const nodes = Array.isArray(parsed?.nodes) ? parsed.nodes : [];
  const edges = Array.isArray(parsed?.edges) ? parsed.edges : [];
  const items = [];
  const byNodeId = new Map();
  const warnings = [];
  for (const node of nodes.slice(0, 200)) {
    if (!node || typeof node !== 'object') continue;
    const nodeId = String(node.id ?? '');
    const type = String(node.type ?? 'text');
    const id = newId('n');
    const base = {
      id,
      x: round(node.x, -400 + items.length * 40),
      y: round(node.y, -300 + items.length * 40),
      w: clampSize(node.width ?? node.w, type === 'group' ? 640 : 360),
      h: clampSize(node.height ?? node.h, type === 'group' ? 420 : 240),
    };
    if (type === 'text') {
      items.push({ ...base, type: 'note', text: String(node.text ?? '').slice(0, 18000), ...(node.color ? { color: OBSIDIAN_COLORS[node.color] ?? 'yellow' } : { color: 'yellow' }) });
      byNodeId.set(nodeId, id);
    } else if (type === 'group') {
      items.push({ ...base, type: 'frame', text: String(node.label ?? 'Obsidian 区域').slice(0, 120), color: OBSIDIAN_COLORS[node.color] ?? 'gray', meta: { obsidianGroup: true } });
      byNodeId.set(nodeId, id);
    } else if (type === 'link') {
      items.push({ ...base, type: 'note', text: String(node.url ?? '').slice(0, 2000), color: 'blue', meta: { url: String(node.url ?? '') } });
      byNodeId.set(nodeId, id);
    } else if (type === 'file') {
      const relative = String(node.file ?? '').trim();
      if (relative === '') {
        warnings.push(`file 节点缺少 file 字段：${nodeId}`);
        continue;
      }
      const absolute = resolve(filePath.split(/[\\/]/).slice(0, -1).join('/'), relative);
      const extension = extname(absolute).toLowerCase();
      try {
        if (IMAGE_MIME[extension]) {
          items.push({ ...base, type: 'image', src: await imageDataUrl(absolute), text: relative.split('/').pop() ?? relative, meta: { filePath: absolute } });
          byNodeId.set(nodeId, id);
        } else if (extension === '.md' || extension === '.markdown' || extension === '.txt') {
          const referenced = await readVaultFile(absolute);
          const long = isLongMarkdown(referenced.content);
          const width = long ? Math.max(base.w, 560) : base.w;
          items.push({
            ...base,
            type: long ? 'text' : 'note',
            w: width,
            ...(long ? { h: documentHeight(referenced.content, width), color: 'white' } : {}),
            text: referenced.content,
            meta: { filePath: absolute, fileName: relative, ...(long ? { longDoc: true } : {}) },
          });
          byNodeId.set(nodeId, id);
        } else {
          warnings.push(`跳过不支持的内嵌文件：${relative}`);
        }
      } catch (error) {
        warnings.push(`读取 ${relative} 失败：${error?.message ?? error}`);
      }
    }
  }
  for (const edge of edges.slice(0, 300)) {
    if (!edge || typeof edge !== 'object') continue;
    const from = byNodeId.get(String(edge.fromNode ?? ''));
    const to = byNodeId.get(String(edge.toNode ?? ''));
    if (!from || !to || from === to) continue;
    items.push({
      id: newId('e'),
      type: 'edge',
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      from,
      to,
      ...(edge.label ? { label: String(edge.label).slice(0, 120) } : {}),
      ...(edge.color ? { color: OBSIDIAN_COLORS[edge.color] ?? 'gray' } : { color: 'gray' }),
    });
  }
  return { items, warnings, sourcePath: filePath };
}

/**
 * Convert a vault path into native items.
 * - `.canvas` → its nodes/edges (text, group, link, embedded md/images)
 * - `.md` / `.txt` → one note card carrying the file content (meta.filePath)
 * - image → one image card with a data URL
 */
export async function importVaultPath(filePath) {
  const absolute = resolve(String(filePath ?? '').trim());
  const extension = extname(absolute).toLowerCase();
  if (extension === '.canvas') {
    const converted = await canvasItems(absolute);
    return { kind: 'canvas', items: converted.items, warnings: converted.warnings ?? [], filePath: absolute };
  }
  const converted = await markdownItem(absolute);
  return { kind: extension === '.md' || extension === '.markdown' || extension === '.txt' ? 'note' : 'media', items: converted.items, warnings: [], filePath: absolute };
}

/** Bounding box of imported items (world coordinates), for focusing the view. */
export function boundsOfItems(items) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const item of items) {
    if (!item || item.type === 'edge') continue;
    const x = Number(item.x);
    const y = Number(item.y);
    const w = Number(item.w) || 0;
    const h = Number(item.h) || 0;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }
  if (minX === Infinity) return null;
  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}
