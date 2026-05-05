/**
 * Free Chinese → English translation via public Lingva instances (open-source
 * Google Translate proxies), with a MyMemory fallback if all Lingva mirrors
 * are unreachable. No API key required.
 *
 * Shared by the mochiread (Expo) and mochilang (web) apps. Stays pure HTTP
 * (no React/Expo deps) so it can run anywhere fetch is available.
 */

export type TranslationResult = {
  translation: string;
  source: string;
};

export type TranslateOptions = {
  /** Source language code, default 'zh'. */
  from?: string;
  /** Target language code, default 'en'. */
  to?: string;
  /** Override the default Lingva endpoint list (mostly for tests). */
  lingvaEndpoints?: string[];
  /** Disable the MyMemory fallback (mostly for tests). */
  disableMyMemoryFallback?: boolean;
};

const LINGVA_ENDPOINTS = [
  'https://lingva.ml',
  'https://lingva.lunar.icu',
  'https://lingva.thedaviddelta.com',
];

async function tryLingva(
  base: string,
  text: string,
  from: string,
  to: string
): Promise<string | null> {
  const encoded = encodeURIComponent(text);
  const res = await fetch(`${base}/api/v1/${from}/${to}/${encoded}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { translation?: string };
  if (json.translation && json.translation.trim().length > 0) {
    return json.translation;
  }
  return null;
}

async function tryMyMemory(
  text: string,
  from: string,
  to: string
): Promise<string | null> {
  // MyMemory uses pipe-separated lang pair, e.g. zh|en or zh-CN|en-US.
  // It also auto-detects the source if you pass `Autodetect|en`.
  const langpair = `${from}|${to}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    text
  )}&langpair=${encodeURIComponent(langpair)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as {
    responseStatus?: number;
    responseData?: { translatedText?: string };
  };
  if (
    json.responseStatus === 200 &&
    json.responseData?.translatedText &&
    json.responseData.translatedText.trim().length > 0
  ) {
    return json.responseData.translatedText;
  }
  return null;
}

export async function translate(
  text: string,
  opts: TranslateOptions = {}
): Promise<TranslationResult> {
  const trimmed = text.trim();
  if (!trimmed) return { translation: '', source: 'empty' };
  const from = opts.from ?? 'zh';
  const to = opts.to ?? 'en';
  const endpoints = opts.lingvaEndpoints ?? LINGVA_ENDPOINTS;
  const errors: string[] = [];

  for (const base of endpoints) {
    try {
      const t = await tryLingva(base, trimmed, from, to);
      if (t) return { translation: t, source: base };
      errors.push(`${base}: empty response`);
    } catch (e) {
      errors.push(`${base}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (!opts.disableMyMemoryFallback) {
    try {
      const t = await tryMyMemory(trimmed, from, to);
      if (t) return { translation: t, source: 'mymemory' };
      errors.push('mymemory: empty response');
    } catch (e) {
      errors.push(
        `mymemory: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  throw new Error(
    `All translation endpoints failed:\n${errors.join('\n')}`
  );
}

/** Convenience: zh → en (the most common path for our apps). */
export function translateChinese(text: string): Promise<TranslationResult> {
  return translate(text, { from: 'zh', to: 'en' });
}
