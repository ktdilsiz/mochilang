export const BACKUP_KEYS = [
  'mochiread:library', 'mochiread:vocab', 'mochiread:prefs', 'mochiread:stats',
  'mochiread:seeded', 'mochiread:introduced-seeds', 'mochiread:reading:language',
  ...['zh', 'ja'].flatMap((language) => [
    `mochiread:prefs:${language}`, `mochiread:stats:${language}`,
    `mochiread:reading:text:${language}`, `mochiread:reading:page:${language}`,
  ]),
  'mochiread:reading:text', 'mochiread:reading:page',
];
export const MAX_BACKUP_SIZE = 20 * 1024 * 1024;
export type Backup = { format: 'mochiread-backup'; version: 1; createdAt: string; data: Record<string, string> };

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const string = (value: unknown, max = 1000000): value is string => typeof value === 'string' && value.length <= max;
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const language = (value: unknown) => value === undefined || value === 'zh' || value === 'ja';
const optional = (value: unknown, check: (value: unknown) => boolean) => value === undefined || check(value);

function validValue(key: string, raw: string): boolean {
  if (key.includes('reading:text')) return string(raw);
  if (key.includes('reading:page')) return /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw));
  if (key.endsWith('reading:language')) return raw === 'ja' || raw === 'zh';
  if (key.endsWith(':seeded')) return raw === '1';
  const value: unknown = JSON.parse(raw);
  if (key.endsWith(':introduced-seeds')) return Array.isArray(value) && value.length <= 10000 && value.every((id) => string(id, 200));
  if (key === 'mochiread:library') return Array.isArray(value) && value.length <= 20000 && value.every((entry) =>
    object(entry) && string(entry.id, 200) && !!entry.id && string(entry.title, 2000) && string(entry.text) && language(entry.language) && number(entry.createdAt));
  if (key === 'mochiread:vocab') return Array.isArray(value) && value.length <= 100000 && value.every((entry) =>
    object(entry) && string(entry.word, 2000) && !!entry.word && language(entry.language) &&
    optional(entry.pinyin, (v) => string(v, 4000)) && optional(entry.entryId, (v) => string(v, 200)) &&
    optional(entry.meanings, (v) => Array.isArray(v) && v.length <= 1000 && v.every((m) => string(m, 10000))) &&
    ['savedAt', 'remembered', 'forgotten', 'lastReviewedAt', 'ease', 'intervalDays', 'dueAt'].every((field) => optional(entry[field], number)) &&
    optional(entry.examples, (v) => Array.isArray(v) && v.length <= 100 && v.every((example) => object(example) && string(example.sentence) && string(example.surface, 2000))));
  if (key.startsWith('mochiread:stats')) return Array.isArray(value) && value.length <= 100000 && value.every((day) =>
    object(day) && typeof day.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day.date) && number(day.wordTaps) && number(day.secondsRead));
  if (key.startsWith('mochiread:prefs')) {
    if (!object(value)) return false;
    const choices: Record<string, string[]> = { fontSize: ['sm', 'md', 'lg', 'xl'], pinyinMode: ['on', 'off', 'hint'], japaneseReadingMode: ['kana', 'romaji', 'both'], themeMode: ['system', 'light', 'dark'], speechRate: ['slow', 'normal', 'fast'], pagePlayback: ['word', 'sentence'] };
    return Object.entries(choices).every(([field, values]) => optional(value[field], (v) => values.includes(String(v)))) &&
      ['showToneColors', 'autoPlay', 'showPinyin'].every((field) => optional(value[field], (v) => typeof v === 'boolean')) &&
      ['voiceId', 'japaneseVoiceId'].every((field) => optional(value[field], (v) => string(v, 2000)));
  }
  return false;
}

export function parseBackup(text: string): Backup {
  if (text.length > MAX_BACKUP_SIZE) throw new Error('This backup is too large (maximum 20 MB).');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('This is not a valid JSON backup file.'); }
  if (!object(value) || value.format !== 'mochiread-backup' || value.version !== 1 || !object(value.data) ||
    typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))) throw new Error('This file is not a supported MochiRead backup.');
  if (!Object.hasOwn(value.data, 'mochiread:library') || !Object.hasOwn(value.data, 'mochiread:vocab')) throw new Error('The backup is missing its saved texts or vocabulary.');
  for (const [key, raw] of Object.entries(value.data)) {
    let valid = false;
    try { valid = BACKUP_KEYS.includes(key) && typeof raw === 'string' && validValue(key, raw); } catch { /* invalid serialized value */ }
    if (!valid) throw new Error(`The backup contains invalid data (${key}). Nothing has been restored.`);
  }
  return value as Backup;
}

export function summarizeBackup(backup: Backup) {
  const texts = JSON.parse(backup.data['mochiread:library']) as { language?: string }[];
  const words = JSON.parse(backup.data['mochiread:vocab']) as { language?: string }[];
  return (['ja', 'zh'] as const).map((language) => ({
    language, texts: texts.filter((entry) => (entry.language ?? 'zh') === language).length,
    words: words.filter((entry) => (entry.language ?? 'zh') === language).length,
  }));
}
