/**
 * Free Chinese → English translation via public Lingva instances (open-source
 * Google Translate proxies). No API key required. Falls back through a list of
 * mirror instances if the primary is down or rate-limiting.
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
  /** Override the default endpoint list (mostly for tests). */
  endpoints?: string[];
};

const DEFAULT_ENDPOINTS = [
  'https://lingva.ml',
  'https://lingva.lunar.icu',
  'https://lingva.thedaviddelta.com',
];

export async function translate(
  text: string,
  opts: TranslateOptions = {}
): Promise<TranslationResult> {
  const trimmed = text.trim();
  if (!trimmed) return { translation: '', source: 'empty' };
  const from = opts.from ?? 'zh';
  const to = opts.to ?? 'en';
  const endpoints = opts.endpoints ?? DEFAULT_ENDPOINTS;
  const encoded = encodeURIComponent(trimmed);
  const errors: string[] = [];
  for (const base of endpoints) {
    try {
      const res = await fetch(`${base}/api/v1/${from}/${to}/${encoded}`);
      if (!res.ok) {
        errors.push(`${base}: HTTP ${res.status}`);
        continue;
      }
      const json = (await res.json()) as { translation?: string };
      if (json.translation && json.translation.trim().length > 0) {
        return { translation: json.translation, source: base };
      }
      errors.push(`${base}: empty response`);
    } catch (e) {
      errors.push(`${base}: ${e instanceof Error ? e.message : String(e)}`);
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
