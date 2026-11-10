/**
 * Custom AI providers (OpenAI-compatible HTTP APIs) shared by the DSH plugin Host and
 * the standalone desktop server.
 *
 * Pure Node ESM: uses the global fetch / AbortController shipped with Node 18+ and
 * imports nothing from @deepseek-ai/*. Neither half stores provider keys in the
 * canvas document — they live in a small JSON file next to the canvas data.
 */

export const AI_PROVIDER_SCHEMA = 1;
export const AI_MAX_PROVIDERS = 20;
export const AI_MAX_MODELS = 24;
export const AI_MAX_URL = 500;
export const AI_MAX_KEY = 500;
export const AI_DEFAULT_TIMEOUT_MS = 90_000;

/** Ready-made endpoints shown in the provider editor. */
export const AI_PRESETS = [
  {
    id: 'deepseek',
    name: 'DeepSeek 官方',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o'],
  },
  {
    id: 'kimi',
    name: 'Kimi（月之暗面）',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k'],
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4-flash', 'glm-4-plus'],
  },
  {
    id: 'ollama',
    name: 'Ollama 本地',
    baseUrl: 'http://127.0.0.1:11434/v1',
    models: ['qwen2.5:14b', 'llama3.1:8b'],
  },
];

const clampNumber = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const clampInt = (value, min, max, fallback) => Math.round(clampNumber(value, min, max, fallback));

const uniqueStrings = (values, limit) => {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text === '' || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    result.push(text.slice(0, 120));
    if (result.length >= limit) break;
  }
  return result;
};

/** `sk-abcd••••wxyz` — safe to render in the UI. */
export function maskApiKey(key) {
  const text = String(key ?? '');
  if (text === '') return '';
  if (text.length <= 8) return '••••';
  return `${text.slice(0, 4)}••••${text.slice(-4)}`;
}

export function newProviderId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Validate / normalize one provider config.
 * Returns `{ ok: true, provider }` or `{ ok: false, error }`.
 */
export function normalizeProviderConfig(input = {}, existing = null) {
  const base = { ...(existing ?? {}) };
  const name = String(input.name === undefined ? base.name ?? '' : input.name).trim().slice(0, 60) || '自定义接口';
  let baseUrl = String(input.baseUrl === undefined ? base.baseUrl ?? '' : input.baseUrl).trim().slice(0, AI_MAX_URL);
  baseUrl = baseUrl.replace(/\/+$/, '');
  if (baseUrl !== '' && !/^https?:\/\//i.test(baseUrl)) {
    return { ok: false, error: 'API 地址必须以 http:// 或 https:// 开头' };
  }
  let apiKey = typeof base.apiKey === 'string' ? String(base.apiKey) : '';
  if (typeof input.apiKey === 'string' && input.apiKey.trim() !== '') apiKey = input.apiKey.trim().slice(0, AI_MAX_KEY);
  if (input.clearKey === true) apiKey = '';
  const rawModels = Array.isArray(input.models)
    ? input.models
    : typeof input.models === 'string'
      ? String(input.models).split(/[\n,，;；]+/)
      : Array.isArray(base.models)
        ? base.models
        : [];
  const models = uniqueStrings(rawModels, AI_MAX_MODELS);
  if (models.length === 0) return { ok: false, error: '至少填写一个模型名（例如 deepseek-chat）' };
  const wantedDefault = String(input.defaultModel ?? base.defaultModel ?? '').trim();
  let defaultModel = models.includes(wantedDefault) ? wantedDefault : models[0];
  const paramsInput = input.params && typeof input.params === 'object' ? input.params : base.params ?? {};
  const headers = {};
  const headerInput = input.headers && typeof input.headers === 'object' ? input.headers : base.headers && typeof base.headers === 'object' ? base.headers : {};
  for (const [key, value] of Object.entries(headerInput).slice(0, 10)) {
    const headerName = String(key ?? '').trim().slice(0, 80);
    if (headerName === '' || !/^[A-Za-z0-9-_]+$/.test(headerName)) continue;
    if (/authorization|content-type/i.test(headerName)) continue;
    headers[headerName] = String(value ?? '').trim().slice(0, 500);
  }
  const now = new Date().toISOString();
  return {
    ok: true,
    provider: {
      id: String(base.id ?? input.id ?? '').trim().slice(0, 80) || newProviderId(),
      name,
      protocol: 'openai-compatible',
      baseUrl,
      apiKey,
      models,
      defaultModel,
      params: {
        temperature: clampNumber(paramsInput.temperature, 0, 2, 0.4),
        maxTokens: clampInt(paramsInput.maxTokens, 256, 64000, 2400),
        timeoutMs: clampInt(paramsInput.timeoutMs, 5000, 300_000, AI_DEFAULT_TIMEOUT_MS),
      },
      headers,
      enabled: input.enabled === undefined ? base.enabled !== false : input.enabled !== false,
      createdAt: String(base.createdAt ?? '') || now,
      updatedAt: now,
    },
  };
}

/** Strip the secret before it leaves the Host process. */
export function publicProvider(provider) {
  const source = provider && typeof provider === 'object' ? provider : {};
  return {
    id: String(source.id ?? ''),
    name: String(source.name ?? ''),
    protocol: 'openai-compatible',
    baseUrl: String(source.baseUrl ?? ''),
    models: Array.isArray(source.models) ? source.models.map((entry) => String(entry)) : [],
    defaultModel: String(source.defaultModel ?? ''),
    params: {
      temperature: clampNumber(source.params?.temperature, 0, 2, 0.4),
      maxTokens: clampInt(source.params?.maxTokens, 256, 64000, 2400),
      timeoutMs: clampInt(source.params?.timeoutMs, 5000, 300_000, AI_DEFAULT_TIMEOUT_MS),
    },
    headers: source.headers && typeof source.headers === 'object' ? { ...source.headers } : {},
    enabled: source.enabled !== false,
    hasKey: String(source.apiKey ?? '') !== '',
    keyMasked: maskApiKey(source.apiKey),
    createdAt: String(source.createdAt ?? ''),
    updatedAt: String(source.updatedAt ?? ''),
  };
}

/** Turn a base URL into the OpenAI chat-completions endpoint. */
export function buildChatUrl(baseUrl) {
  const root = String(baseUrl ?? '').trim().replace(/\/+$/, '');
  if (root === '') return '';
  if (/\/chat\/completions$/i.test(root)) return root;
  return `${root}/chat/completions`;
}

export class AiProviderError extends Error {
  constructor(message, code = 'ai/error', detail = undefined) {
    super(message);
    this.name = 'AiProviderError';
    this.code = code;
    this.detail = detail;
  }
}

function classifyHttpStatus(status) {
  if (status === 401 || status === 403) return 'ai/auth';
  if (status === 404) return 'ai/model';
  if (status === 429) return 'ai/rate';
  if (status >= 500) return 'ai/server';
  return 'ai/http';
}

/** Best-effort human readable reason for a failed fetch (ECONNREFUSED / ENOTFOUND / …). */
function describeFetchFailure(error) {
  const candidates = [error, error?.cause];
  if (error?.cause && Array.isArray(error.cause.errors)) candidates.push(...error.cause.errors);
  for (const entry of candidates) {
    if (entry && typeof entry.code === 'string' && entry.code !== '') return entry.code;
  }
  return String(error?.cause?.message ?? error?.message ?? error);
}

function statusHint(code) {
  if (code === 'ai/auth') return '（API Key 无效或没有权限）';
  if (code === 'ai/model') return '（模型名或接口地址不对）';
  if (code === 'ai/rate') return '（触发限流，稍后再试）';
  if (code === 'ai/server') return '（接口服务出错，稍后再试）';
  return '';
}

/**
 * One non-streaming OpenAI-compatible chat call.
 * Returns `{ text, model, usage }`; throws `AiProviderError` with a readable message.
 */
export async function callOpenAiCompatible(provider, options = {}) {
  const source = provider && typeof provider === 'object' ? provider : {};
  const url = buildChatUrl(source.baseUrl);
  if (url === '') throw new AiProviderError('这个接口还没有填写 API 地址', 'ai/no-url');
  if (String(source.apiKey ?? '') === '') {
    throw new AiProviderError(`接口「${String(source.name ?? '自定义接口')}」还没有填写 API Key`, 'ai/no-key');
  }
  const models = Array.isArray(source.models) ? source.models : [];
  const model = String(options.model ?? source.defaultModel ?? models[0] ?? '').trim();
  if (model === '') throw new AiProviderError('这个接口没有配置模型名', 'ai/no-model');
  const messages = Array.isArray(options.messages)
    ? options.messages.filter((entry) => entry && typeof entry === 'object' && typeof entry.content === 'string')
    : [];
  if (messages.length === 0) throw new AiProviderError('缺少要发送的消息', 'ai/no-messages');
  const body = {
    model,
    messages,
    temperature: clampNumber(options.temperature, 0, 2, clampNumber(source.params?.temperature, 0, 2, 0.4)),
    max_tokens: clampInt(options.maxTokens, 16, 64000, clampInt(source.params?.maxTokens, 256, 64000, 2400)),
    stream: false,
  };
  if (options.responseFormat === 'json') body.response_format = { type: 'json_object' };
  const timeoutMs = clampInt(options.timeoutMs, 5000, 300_000, clampInt(source.params?.timeoutMs, 5000, 300_000, AI_DEFAULT_TIMEOUT_MS));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${String(source.apiKey ?? '')}`,
        ...(source.headers && typeof source.headers === 'object' ? source.headers : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    if (error?.name === 'AbortError') {
      throw new AiProviderError(`接口「${String(source.name ?? '自定义接口')}」超时（${Math.round(timeoutMs / 1000)} 秒）`, 'ai/timeout');
    }
    const detail = describeFetchFailure(error);
    throw new AiProviderError(`无法连接「${String(source.name ?? '自定义接口')}」：${String(detail)}`, 'ai/network');
  }
  clearTimeout(timer);
  let raw = '';
  try {
    raw = await response.text();
  } catch (error) {
    throw new AiProviderError(`读取「${String(source.name ?? '自定义接口')}」的响应失败：${String(error?.message ?? error)}`, 'ai/network');
  }
  if (!response.ok) {
    let detail = raw.slice(0, 400);
    try {
      const parsed = JSON.parse(raw);
      detail = String(parsed?.error?.message ?? parsed?.message ?? detail);
    } catch (error) {
      /* keep the raw prefix */
    }
    const code = classifyHttpStatus(response.status);
    throw new AiProviderError(
      `接口「${String(source.name ?? '自定义接口')}」返回 HTTP ${response.status}${statusHint(code)}：${detail.slice(0, 300)}`,
      code,
      { status: response.status, detail },
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new AiProviderError(`「${String(source.name ?? '自定义接口')}」返回的不是 JSON：${raw.slice(0, 160)}`, 'ai/format');
  }
  const content = parsed?.choices?.[0]?.message?.content;
  const text = Array.isArray(content)
    ? content.map((part) => (typeof part === 'string' ? part : String(part?.text ?? ''))).join('')
    : String(content ?? '');
  if (text.trim() === '') {
    const refusal = parsed?.choices?.[0]?.message?.refusal;
    throw new AiProviderError(`「${String(source.name ?? '自定义接口')}」没有返回内容${refusal ? `：${String(refusal).slice(0, 160)}` : ''}`, 'ai/empty');
  }
  return { text: text.trim(), model: String(parsed?.model ?? model), usage: parsed?.usage ?? null };
}

/** Tiny "does this endpoint work?" probe used by the provider editor. */
export async function testAiProvider(provider) {
  const startedAt = Date.now();
  try {
    const result = await callOpenAiCompatible(provider, {
      messages: [{ role: 'user', content: '只回复两个大写字母：OK' }],
      maxTokens: 24,
      temperature: 0,
      timeoutMs: 30_000,
    });
    return { ok: true, latencyMs: Date.now() - startedAt, reply: result.text.slice(0, 80), model: result.model };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - startedAt, message: String(error?.message ?? error), code: error?.code ?? 'ai/error' };
  }
}

/** Pull the first JSON object out of a model reply (fenced code blocks included). */
export function extractJsonObject(text) {
  const raw = String(text ?? '').trim();
  if (raw === '') return undefined;
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const candidates = [];
  if (fenced && fenced[1]) candidates.push(fenced[1].trim());
  candidates.push(raw);
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      /* keep looking */
    }
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch (error) {
        /* keep looking */
      }
    }
  }
  return undefined;
}

/** Migrate the old standalone single-endpoint config into one provider entry. */
export function providerFromLegacyConfig(legacy) {
  const baseUrl = String(legacy?.baseUrl ?? '').trim();
  const model = String(legacy?.model ?? '').trim();
  if (baseUrl === '' || model === '') return null;
  const result = normalizeProviderConfig({
    name: '默认接口',
    baseUrl,
    apiKey: String(legacy?.apiKey ?? ''),
    models: [model],
    defaultModel: model,
  });
  return result.ok ? result.provider : null;
}
