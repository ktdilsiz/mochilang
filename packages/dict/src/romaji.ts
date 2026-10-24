import { toRomaji } from 'wanakana';
const cache = new Map<string, string>();
const foreignSounds = { てぃ: 'ti', でぃ: 'di', とぅ: 'tu', どぅ: 'du', てゅ: 'tyu', でゅ: 'dyu' };

/** Plain Hepburn-style spellings retain long vowels (chiisana, gakkou,
 * koohii) rather than introducing macrons a beginner may not recognize. */
export function romanizeJapanese(reading: string, particle = false): string {
  const kana = reading.normalize('NFKC');
  if (!kana || /\p{Script=Han}/u.test(kana)) return '';
  const key = `${particle ? 'particle' : 'word'}:${kana}`;
  const cached = cache.get(key);
  if (cached) return cached;
  if (particle) {
    const pronunciation = ({ は: 'wa', へ: 'e', を: 'o' } as Record<string, string>)[kana];
    if (pronunciation) return pronunciation;
  }
  const greeting = ({ 'こんにちは': 'konnichiwa', 'こんばんは': 'konbanwa' } as Record<string, string>)[kana];
  const result = greeting ?? toRomaji(kana, /[テデトドてでとど][ィゥュぃぅゅ]/.test(kana) ? { customRomajiMapping: foreignSounds } : undefined);
  if (cache.size >= 512) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}
