import type { Token } from './index';
import TinySegmenter from 'tiny-segmenter';

export type JapaneseDefinition = {
  word: string;
  reading: string;
  meanings: string[];
  dictionaryForm: string;
};
type Row = [string, string, string[], string[]];
let dictionary: Map<string, Row[]> | undefined;
function entries() {
  if (!dictionary) {
    dictionary = new Map();
    const rows = require('./data/japanese.json') as Row[];
    for (const row of rows) {
      const previous = dictionary.get(row[0]);
      if (previous) previous.push(row);
      else dictionary.set(row[0], [row]);
    }
  }
  return dictionary;
}

// Surface ending, dictionary ending, required JMdict part of speech.
// Bound lookup to one transformation: guessing recursively can turn ordinary
// nouns into unrelated verbs. These cover common polite/past/negative forms.
const endings: [string, string, string][] = [
  ['ました', 'る', 'v1'], ['ません', 'る', 'v1'], ['ます', 'る', 'v1'],
  ['ませんでした', 'る', 'v1'], ['なかった', 'る', 'v1'],
  ['ない', 'る', 'v1'], ['た', 'る', 'v1'], ['て', 'る', 'v1'],
  ['かった', 'い', 'adj-i'], ['くない', 'い', 'adj-i'],
  ['くなかった', 'い', 'adj-i'],
  ['した', 'する', 'vs'], ['して', 'する', 'vs'],
  ['します', 'する', 'vs'], ['しました', 'する', 'vs'],
  ['しない', 'する', 'vs'], ['しなかった', 'する', 'vs'],
  ['している', 'する', 'vs'], ['しています', 'する', 'vs'],
];
for (const [stem, ending, tag] of [
  ['い', 'う', 'v5u'], ['き', 'く', 'v5k'], ['ぎ', 'ぐ', 'v5g'],
  ['し', 'す', 'v5s'], ['ち', 'つ', 'v5t'], ['に', 'ぬ', 'v5n'],
  ['び', 'ぶ', 'v5b'], ['み', 'む', 'v5m'], ['り', 'る', 'v5r'],
]) {
  for (const suffix of ['ます', 'ました', 'ません', 'ませんでした']) {
    endings.push([stem + suffix, ending, tag]);
  }
}
for (const [stem, ending, tag] of [
  ['わ', 'う', 'v5u'], ['か', 'く', 'v5k'], ['が', 'ぐ', 'v5g'],
  ['さ', 'す', 'v5s'], ['た', 'つ', 'v5t'], ['な', 'ぬ', 'v5n'],
  ['ば', 'ぶ', 'v5b'], ['ま', 'む', 'v5m'], ['ら', 'る', 'v5r'],
]) {
  for (const suffix of ['ない', 'なかった']) endings.push([stem + suffix, ending, tag]);
}
for (const [surface, base, tag] of [
  ['った', 'う', 'v5u'], ['った', 'つ', 'v5t'], ['った', 'る', 'v5r'],
  ['って', 'う', 'v5u'], ['って', 'つ', 'v5t'], ['って', 'る', 'v5r'],
  ['いた', 'く', 'v5k'], ['いて', 'く', 'v5k'],
  ['いだ', 'ぐ', 'v5g'], ['いで', 'ぐ', 'v5g'],
  ['んだ', 'む', 'v5m'], ['んだ', 'ぶ', 'v5b'], ['んだ', 'ぬ', 'v5n'],
  ['んで', 'む', 'v5m'], ['んで', 'ぶ', 'v5b'], ['んで', 'ぬ', 'v5n'],
  ['した', 'す', 'v5s'], ['して', 'す', 'v5s'],
]) endings.push([surface, base, tag]);

// Progressive forms keep the verb's te-form reading.
for (const [surface, base, tag] of [...endings]) {
  if (surface.endsWith('て') || surface.endsWith('で')) {
    endings.push([surface + 'いる', base, tag], [surface + 'います', base, tag]);
  }
}

function candidates(word: string): { rows: Row[]; reading?: string } | null {
  const dict = entries();
  const direct = dict.get(word);
  if (direct) return { rows: direct };
  const irregular: Record<string, [string, string]> = {
    '行った': ['行く', 'いった'], '行って': ['行く', 'いって'],
    '行っている': ['行く', 'いっている'], '行っています': ['行く', 'いっています'],
    '来た': ['来る', 'きた'], '来て': ['来る', 'きて'],
    '来ます': ['来る', 'きます'], '来ました': ['来る', 'きました'],
    '来ない': ['来る', 'こない'], '来なかった': ['来る', 'こなかった'],
  };
  if (irregular[word]) {
    const [base, reading] = irregular[word];
    const rows = dict.get(base);
    if (rows) return { rows, reading };
  }
  for (const [surface, base, tag] of endings) {
    if (!word.endsWith(surface) || word.length <= surface.length) continue;
    const rows = dict.get(word.slice(0, -surface.length) + base)?.filter(
      (row) => row[3].some((pos) => pos === tag || pos.startsWith(tag + '-'))
    );
    if (rows?.length) {
      const reading = rows[0][1];
      if (!reading.endsWith(base)) continue;
      return { rows, reading: reading.slice(0, -base.length) + surface };
    }
  }
  // JMdict stores suru nouns as 勉強 (vs), not necessarily 勉強する.
  for (const suffix of ['する', 'した', 'して', 'します', 'しました', 'しない', 'しなかった', 'している', 'しています']) {
    if (!word.endsWith(suffix)) continue;
    const rows = dict.get(word.slice(0, -suffix.length))?.filter(
      (row) => row[3].includes('vs')
    );
    if (rows?.length) return { rows, reading: rows[0][1] + suffix };
  }
  return null;
}

export function lookupJapanese(word: string): JapaneseDefinition | null {
  const result = candidates(word);
  if (!result) return null;
  return {
    word,
    dictionaryForm: result.rows[0][0],
    reading: result.reading ?? result.rows[0][1],
    meanings: [...new Set(result.rows.flatMap((row) => row[2]))],
  };
}

const JAPANESE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々〆ヶ]/u;
export function isJapanese(text: string) {
  return JAPANESE.test(text);
}
export function isJapaneseGlyph(char: string) {
  return JAPANESE.test(char);
}

const segmenter = new TinySegmenter();
/** Statistical word boundaries, enriched by dictionary readings/inflections. */
export function tokenizeJapanese(text: string): Token[] {
  const tokens: Token[] = [];
  const runs = text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々〆ヶ]+|\n|[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々〆ヶ\n]+/gu) ?? [];
  for (const run of runs) {
    if (!isJapanese(run)) {
      tokens.push({ word: run, pinyin: '', syllables: [] });
      continue;
    }
    const parts = segmenter.segment(run);
    for (let i = 0; i < parts.length;) {
      let word = parts[i];
      let match = lookupJapanese(word);
      let count = 1;
      let candidate = word;
      for (let j = i + 1; j < Math.min(parts.length, i + 6); j++) {
        candidate += parts[j];
        const longer = lookupJapanese(candidate);
        // Keep known statistical boundaries (e.g. 今日 + は) unless joining
        // an inflection. Merge unknown pieces of words such as こんにちは.
        if (longer && (!match || longer.dictionaryForm !== candidate || ['こんにちは', 'こんばんは', 'ありがとう', 'おはよう'].includes(candidate))) {
          word = candidate;
          match = longer;
          count = j - i + 1;
        }
      }
      const reading = match?.reading ?? (/\p{Script=Han}/u.test(word) ? '' : word);
      tokens.push({ word, pinyin: reading, syllables: reading ? [{ text: reading, tone: 0 }] : [] });
      i += count;
    }
  }
  return tokens;
}
