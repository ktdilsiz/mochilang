// Selected only by MochiRead's web Metro resolver. Other apps keep bundled data.
import { gunzipSync, strFromU8 } from 'fflate';

type Chinese = { dictionaries: Record<string, string[]>[]; decomposition: unknown };
let chinese: Chinese | undefined;
let japanese: unknown[] | undefined;
let manifest: Promise<Record<'ja' | 'zh', string>> | undefined;
const pending = new Map<string, Promise<void>>();

async function request(path: string, binary = false): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(new URL(`dictionaries/${path}`, window.location.href), { signal: controller.signal, cache: path === 'manifest.json' ? 'no-cache' : 'default' });
    if (!response.ok) throw new Error('Dictionary download failed');
    if (!binary) return await response.json();
    const bytes = new Uint8Array(await response.arrayBuffer());
    return JSON.parse(strFromU8(bytes[0] === 31 && bytes[1] === 139 ? gunzipSync(bytes) : bytes));
  } finally { clearTimeout(timer); }
}

export function prepareDictionary(language: 'ja' | 'zh'): Promise<void> {
  if ((language === 'ja' && japanese) || (language === 'zh' && chinese)) return Promise.resolve();
  const existing = pending.get(language);
  if (existing) return existing;
  const load = (async () => {
    manifest ??= (request('manifest.json') as Promise<Record<'ja' | 'zh', string>>).catch((error) => { manifest = undefined; throw error; });
    const files = await manifest;
    const filename = files[language];
    if (!/^(ja|zh)-[a-f0-9]{16}\.json\.gz$/.test(filename)) throw new Error('Invalid dictionary manifest');
    const data = await request(filename, true);
    if (language === 'ja') {
      if (!Array.isArray(data) || !data.length) throw new Error('Invalid Japanese dictionary');
      japanese = data;
    } else {
      const value = data as Chinese;
      if (!Array.isArray(value?.dictionaries) || value.dictionaries.length !== 4 || !value.decomposition) throw new Error('Invalid Chinese dictionary');
      chinese = value;
    }
  })();
  pending.set(language, load);
  void load.catch(() => { pending.delete(language); manifest = undefined; });
  return load;
}

export function getChineseData(): Record<string, string[]>[] {
  if (!chinese) throw new Error('Chinese dictionary is not ready');
  return chinese.dictionaries;
}
export function getJapaneseRows(): unknown[] {
  if (!japanese) throw new Error('Japanese dictionary is not ready');
  return japanese;
}
export function getChineseDecomposition(): unknown { return chinese?.decomposition ?? {}; }
export function getBilingualData(_pair: string): Record<string, string[]> | null { return null; }
