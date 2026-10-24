/** Shared key-free translation with validated responses and bounded requests. */
export type TranslationResult = { translation: string; source: string; sources?: string[] };
export type TranslateOptions = {
  from?: string;
  to?: string;
  lingvaEndpoints?: string[];
  disableMyMemoryFallback?: boolean;
  requestTimeoutMs?: number;
  signal?: AbortSignal;
};

// These two services are checked independently. Retired/paused Lingva mirrors
// are deliberately omitted so they cannot delay the working fallback.
const LINGVA_ENDPOINTS = ['https://lingva.ml'];
const abortError = () => Object.assign(new Error('Translation cancelled'), { name: 'AbortError' });
const comparable = (text: string) => text.normalize('NFKC').replace(/[\p{P}\p{Z}\s]/gu, '').toLowerCase();

function decodedText(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|apos|quot|amp|lt|gt);/gi, (entity, name: string) => {
    if (name.startsWith('#')) {
      const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    }
    return ({ apos: "'", quot: '"', amp: '&', lt: '<', gt: '>' } as Record<string, string>)[name.toLowerCase()] ?? entity;
  }).trim();
}

function validate(value: unknown, text: string, from: string, to: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Empty or malformed translation');
  const result = decodedText(value);
  const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
  // CJK text echoed under an English heading is not a translation. Preserve
  // valid invariants such as numbers, Latin proper names and same-language text.
  if (from !== to && to.split('-')[0] === 'en' && cjk.test(text) &&
      (comparable(result) === comparable(text) || (cjk.test(result) && !/[a-z]/i.test(result)))) {
    throw new Error('Provider returned untranslated source text');
  }
  return result;
}

async function requestJSON(url: string, options: TranslateOptions): Promise<unknown> {
  if (options.signal?.aborted) throw abortError();
  const controller = new AbortController();
  const timeout = Math.max(1, options.requestTimeoutMs ?? 5000);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    cancel = () => { controller.abort(); reject(abortError()); };
    options.signal?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(() => {
      controller.abort();
      reject(Object.assign(new Error(`Translation request timed out after ${timeout}ms`), { name: 'TimeoutError' }));
    }, timeout);
  });
  try {
    // Include response-body reading in the deadline, even on fetch adapters
    // which do not reject a pending request when the signal is aborted.
    return await Promise.race([
      fetch(url, { signal: controller.signal }).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      }),
      interrupted,
    ]);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}

const bytes = (char: string) => {
  const code = char.codePointAt(0)!;
  return code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
};

/** MyMemory limits q to 500 UTF-8 bytes. Split at sentence/space boundaries
 * when possible, never inside a Unicode code point or a surrogate pair. */
export function translationChunks(text: string, maximumBytes = 480): string[] {
  if (!Number.isFinite(maximumBytes) || maximumBytes < 4) throw new Error('Translation chunk limit must be at least 4 bytes');
  const chunks: string[] = [];
  let chunk = '', size = 0, boundary = 0;
  for (const char of text) {
    while (size + bytes(char) > maximumBytes && chunk) {
      const cut = boundary || chunk.length;
      chunks.push(chunk.slice(0, cut));
      chunk = chunk.slice(cut);
      size = [...chunk].reduce((sum, value) => sum + bytes(value), 0);
      boundary = 0;
    }
    chunk += char;
    size += bytes(char);
    if (/[。！？.!?\s]/u.test(char)) boundary = chunk.length;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

async function translateChunk(text: string, from: string, to: string, options: TranslateOptions): Promise<TranslationResult> {
  const errors: string[] = [];
  for (const endpoint of options.lingvaEndpoints ?? LINGVA_ENDPOINTS) {
    try {
      const data = await requestJSON(`${endpoint}/api/v1/${from}/${to}/${encodeURIComponent(text)}`, options) as { translation?: unknown };
      return { translation: validate(data?.translation, text, from, to), source: endpoint };
    } catch (error) {
      if (options.signal?.aborted) throw abortError();
      errors.push(`${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (!options.disableMyMemoryFallback) {
    try {
      const pair = `${from === 'auto' ? 'Autodetect' : from}|${to}`;
      const data = await requestJSON(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(pair)}`, options) as {
        responseStatus?: number | string;
        responseData?: { translatedText?: unknown };
        quotaFinished?: boolean;
        responseDetails?: string;
      };
      if (Number(data?.responseStatus) !== 200 || data.quotaFinished) throw new Error(data?.responseDetails || 'Translation provider unavailable or quota exceeded');
      return { translation: validate(data.responseData?.translatedText, text, from, to), source: 'mymemory' };
    } catch (error) {
      if (options.signal?.aborted) throw abortError();
      errors.push(`mymemory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`All translation services failed:\n${errors.join('\n')}`);
}

export async function translate(text: string, options: TranslateOptions = {}): Promise<TranslationResult> {
  if (options.signal?.aborted) throw abortError();
  const trimmed = text.trim();
  if (!trimmed) return { translation: '', source: 'empty' };
  const from = options.from ?? 'zh', to = options.to ?? 'en';
  if (from === to) return { translation: trimmed, source: 'identity' };
  const chunks = translationChunks(trimmed);
  const results: TranslationResult[] = [];
  for (const chunk of chunks) {
    if (options.signal?.aborted) throw abortError();
    results.push(chunk.trim() ? await translateChunk(chunk, from, to, options) : { translation: chunk, source: 'whitespace' });
  }
  const sources = [...new Set(results.map((result) => result.source).filter((source) => source !== 'whitespace'))];
  return {
    translation: results.map((result, index) => result.translation + (index < results.length - 1 ? /\n\s*$/.test(chunks[index]) ? '\n' : ' ' : '')).join(''),
    source: sources.length === 1 ? sources[0] : 'mixed', sources,
  };
}

export function translateChinese(text: string): Promise<TranslationResult> {
  return translate(text, { from: 'zh', to: 'en' });
}
