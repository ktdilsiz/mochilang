import type { Token } from './index';
import TinySegmenter from 'tiny-segmenter';
import { gunzipSync, strFromU8 } from 'fflate';

export type RubyPart = { text: string; reading: string };
export type JapaneseSense = { partsOfSpeech: string[]; meanings: string[] };
export type JapaneseAlternative = {
  entryId: string;
  dictionaryForm: string;
  reading: string;
  senses: JapaneseSense[];
};
export type JapaneseDefinition = JapaneseAlternative & {
  word: string;
  dictionaryReading: string;
  meanings: string[];
  conjugation?: string;
  alternatives: JapaneseAlternative[];
  ruby: RubyPart[];
};

// Entry ID, spellings [surface, allowed readings, priority], restricted senses.
type Sense = [string[], string[], string[], string[]];
type Entry = [string, [string, string[], number][], Sense[]];
type IndexedForm = { entry: Entry; form: Entry[1][number] };
let dictionary: Map<string, IndexedForm[]> | undefined;

function decodeBase64(text: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes = new Uint8Array(Math.floor(text.length * 3 / 4) - (text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0));
  let buffer = 0, bits = 0, offset = 0;
  for (let i = 0; i < text.length && text[i] !== '='; i++) {
    buffer = (buffer << 6) | alphabet.indexOf(text[i]);
    bits += 6;
    if (bits >= 8) { bits -= 8; bytes[offset++] = (buffer >> bits) & 255; }
  }
  return bytes;
}

function entries() {
  if (!dictionary) {
    const data = require('./data/japanese.json') as { compressed: string };
    const rows = JSON.parse(strFromU8(gunzipSync(decodeBase64(data.compressed)))) as Entry[];
    dictionary = new Map();
    for (const entry of rows) {
      for (const form of entry[1]) {
        const previous = dictionary.get(form[0]);
        const value = { entry, form };
        if (previous) previous.push(value);
        else dictionary.set(form[0], [value]);
      }
    }
  }
  return dictionary;
}

export const normalizeJapanese = (text: string) => text.normalize('NFKC');
const hiragana = (text: string) => normalizeJapanese(text).replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
const hasTag = (tags: string[], tag: string) => tags.some((value) => value === tag || value.startsWith(tag + '-'));
const PARTICLES = new Set(['は', 'が', 'を', 'に', 'へ', 'と', 'の', 'で', 'も', 'や', 'か', 'ね', 'よ', 'から', 'まで', 'より', 'ので', 'のに']);

type Rule = { surface: string; base: string; tag: string; label: string; readingBase?: string; readingSurface?: string };
const rules: Rule[] = [];
const add = (surface: string, base: string, tag: string, label: string, readingBase?: string, readingSurface?: string) =>
  rules.push({ surface, base, tag, label, readingBase, readingSurface });

// Generate a bounded paradigm rather than recursively stripping arbitrary
// suffixes. Every result must still have the matching JMdict verb class.
const polite: [string, string][] = [['ます', 'polite'], ['ました', 'polite past'], ['ません', 'polite negative'], ['ませんでした', 'polite past negative']];
const desires: [string, string][] = [['たい', 'desire'], ['たかった', 'past desire'], ['たくない', 'negative desire'], ['たくなかった', 'past negative desire']];
const progressive: [string, string][] = [['いる', 'progressive'], ['いた', 'past progressive'], ['います', 'polite progressive'], ['いました', 'polite past progressive'], ['いない', 'negative progressive'], ['いなかった', 'past negative progressive'], ['いません', 'polite negative progressive'], ['いませんでした', 'polite past negative progressive']];

function ichidan(stem: string, base: string, tag: string, prefix = '') {
  const forms: [string, string][] = [['る', ''], ['た', 'past'], ['て', 'te-form'], ['ない', 'negative'], ['なかった', 'past negative'], ['なくて', 'negative te-form'], ['よう', 'volitional'], ...polite, ...desires];
  for (const [ending, label] of forms) add(stem + ending, base, tag, [prefix, label].filter(Boolean).join(' · '));
  for (const [ending, label] of progressive) add(stem + 'て' + ending, base, tag, [prefix, label].filter(Boolean).join(' · '));
}
ichidan('', 'る', 'v1');
ichidan('られ', 'る', 'v1', 'potential / passive');
ichidan('させ', 'る', 'v1', 'causative');
ichidan('させられ', 'る', 'v1', 'causative passive');
for (const [ending, i, a, e, o, te, ta, tag] of [
  ['う', 'い', 'わ', 'え', 'お', 'って', 'った', 'v5u'],
  ['く', 'き', 'か', 'け', 'こ', 'いて', 'いた', 'v5k'],
  ['ぐ', 'ぎ', 'が', 'げ', 'ご', 'いで', 'いだ', 'v5g'],
  ['す', 'し', 'さ', 'せ', 'そ', 'して', 'した', 'v5s'],
  ['つ', 'ち', 'た', 'て', 'と', 'って', 'った', 'v5t'],
  ['ぬ', 'に', 'な', 'ね', 'の', 'んで', 'んだ', 'v5n'],
  ['ぶ', 'び', 'ば', 'べ', 'ぼ', 'んで', 'んだ', 'v5b'],
  ['む', 'み', 'ま', 'め', 'も', 'んで', 'んだ', 'v5m'],
  ['る', 'り', 'ら', 'れ', 'ろ', 'って', 'った', 'v5r'],
]) {
  for (const [suffix, label] of [...polite, ...desires]) add(i + suffix, ending, tag, label);
  for (const [suffix, label] of [['ない', 'negative'], ['なかった', 'past negative'], ['なくて', 'negative te-form']]) add(a + suffix, ending, tag, label);
  add(o + 'う', ending, tag, 'volitional');
  add(te, ending, tag, 'te-form');
  add(ta, ending, tag, 'past');
  for (const [suffix, label] of progressive) add(te + suffix, ending, tag, label);
  ichidan(e, ending, tag, 'potential');
  ichidan(a + 'れ', ending, tag, 'passive');
  ichidan(a + 'せ', ending, tag, 'causative');
}
for (const [surface, label] of [['かった', 'past'], ['くない', 'negative'], ['くなかった', 'past negative'], ['くて', 'te-form'], ['ければ', 'conditional']]) add(surface, 'い', 'adj-i', label);

// Irregular bases use kana for the transformed reading, preserving the kanji
// in the dictionary form. Reuse the same paradigms, not a list of exceptions.
const suruStart = rules.length;
ichidan('し', 'する', 'vs');
for (let i = suruStart; i < rules.length; i++) {
  // する is not ichidan: the generated infinitive/negative/volitional differ.
  const rule = rules[i];
  if (rule.surface === 'しる') rule.surface = 'する';
  if (rule.surface === 'しない') rule.label = 'negative';
  if (rule.surface === 'しよう') rule.label = 'volitional';
}
ichidan('され', 'する', 'vs', 'passive');
ichidan('させ', 'する', 'vs', 'causative');
// 来る: き- before polite/te/past, こ- before negative/passive/volitional.
for (const [suffix, label] of [...polite, ...desires, ['た', 'past'], ['て', 'te-form']] as [string, string][]) add('来' + suffix, '来る', 'vk', label, 'くる', 'き' + suffix);
for (const [suffix, label] of progressive) add('来て' + suffix, '来る', 'vk', label, 'くる', 'きて' + suffix);
for (const [suffix, label] of [['ない', 'negative'], ['なかった', 'past negative'], ['よう', 'volitional']]) add('来' + suffix, '来る', 'vk', label, 'くる', 'こ' + suffix);
for (const suffix of ['った', 'って', ...progressive.map(([ending]) => 'って' + ending)]) add('行' + suffix, '行く', 'v5k-s', suffix === 'った' ? 'past' : 'te-form / progressive', 'いく', 'い' + suffix);
rules.sort((a, b) => b.surface.length - a.surface.length);

function applicableSenses(item: IndexedForm, reading: string, tag?: string): JapaneseSense[] {
  return item.entry[2].filter(([pos, , kanji, kana]) =>
    (!tag || hasTag(pos, tag)) &&
    (kanji.includes('*') || kanji.includes(item.form[0]) || item.form[0] === reading) &&
    (kana.includes('*') || kana.includes(reading))
  ).map(([partsOfSpeech, meanings]) => ({ partsOfSpeech, meanings }));
}

export function lookupJapanese(surface: string, preference?: { entryId?: string; reading?: string; preferParticle?: boolean }): JapaneseDefinition | null {
  const word = normalizeJapanese(surface);
  const dict = entries();
  type Candidate = JapaneseAlternative & { score: number; surfaceReading: string; conjugation?: string };
  const candidates: Candidate[] = [];
  function collect(base: string, rule?: Rule, suruNoun = false) {
    for (const item of dict.get(base) ?? []) {
      for (const reading of item.form[1]) {
        let senses = applicableSenses(item, reading, rule?.tag);
        if (!senses.length) continue;
        const particle = PARTICLES.has(word) && !rule && senses.some((sense) => sense.partsOfSpeech.includes('prt'));
        if (particle) senses = senses.filter((sense) => sense.partsOfSpeech.includes('prt'));
        let surfaceReading = reading;
        if (rule) {
          const readingBase = rule.readingBase ?? rule.base;
          if (suruNoun) surfaceReading = reading + rule.surface;
          else if (reading.endsWith(readingBase)) surfaceReading = reading.slice(0, -readingBase.length) + (rule.readingSurface ?? rule.surface);
          else continue;
        }
        // Keep dictionary homographs separate. Particle forms in running text
        // outrank similarly spelled nouns; common/primary spellings follow.
        const score = (particle ? preference?.preferParticle === false ? -30 : 100 : 0) + item.form[2] + (rule ? -1 : 5) +
          (preference?.entryId === item.entry[0] && (!preference.reading || preference.reading === reading) ? 1000 : 0) +
          (rule?.base.startsWith('行') || rule?.tag === 'vk' ? 20 : 0);
        candidates.push({ entryId: item.entry[0], dictionaryForm: suruNoun ? base : item.form[0], reading, surfaceReading, senses, score, conjugation: rule?.label || undefined });
      }
    }
  }
  collect(word);
  for (const rule of rules) {
    if (!word.endsWith(rule.surface)) continue;
    const stem = word.slice(0, -rule.surface.length);
    collect(stem + rule.base, rule);
    if (rule.tag === 'vs' && stem) collect(stem, rule, true);
  }
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best) return null;
  const alternatives = candidates.filter((candidate, i) =>
    i > 0 && (candidate.entryId !== best.entryId || candidate.reading !== best.reading) &&
    candidates.findIndex((other) => other.entryId === candidate.entryId && other.reading === candidate.reading) === i
  ).slice(0, 8).map(({ entryId, dictionaryForm, reading, senses }) => ({ entryId, dictionaryForm, reading, senses }));
  return {
    word: surface, entryId: best.entryId, dictionaryForm: best.dictionaryForm,
    dictionaryReading: best.reading, reading: best.surfaceReading,
    senses: best.senses, meanings: [...new Set(best.senses.flatMap((sense) => sense.meanings))],
    conjugation: best.conjugation, alternatives,
    ruby: alignJapaneseReading(surface, best.surfaceReading),
  };
}

const JAPANESE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ーｰ々〆ヶ\uFF9E\uFF9F]/u;
export function isJapanese(text: string) { return JAPANESE.test(text); }
export function isJapaneseGlyph(char: string) { return JAPANESE.test(char); }

/** Normalize for matching, retain offsets into the untouched original text. */
function normalizedOffsets(text: string) {
  const clusters = text.match(/.[\u3099\u309A\uFF9E\uFF9F]*/gu) ?? [];
  let normalized = '', offset = 0;
  const ends = [0];
  for (const cluster of clusters) {
    const value = normalizeJapanese(cluster);
    offset += cluster.length;
    for (let i = 0; i < value.length; i++) ends.push(offset);
    normalized += value;
  }
  return { normalized, ends };
}

/** Align readings to kanji runs, leaving okurigana and kana unannotated. */
export function alignJapaneseReading(surface: string, reading: string): RubyPart[] {
  const { normalized, ends } = normalizedOffsets(surface);
  const pieces = normalized.match(/[\p{Script=Han}々〆]+|[^\p{Script=Han}々〆]+/gu) ?? [];
  const ruby: RubyPart[] = [];
  let offset = 0, cursor = 0;
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    const text = surface.slice(ends[offset], ends[offset + piece.length]);
    offset += piece.length;
    if (/^[\p{Script=Han}々〆]+$/u.test(piece)) {
      const anchor = pieces[i + 1];
      const next = anchor ? hiragana(reading).indexOf(hiragana(anchor), cursor + 1) : reading.length;
      if (next < cursor || next === -1) return [{ text: surface, reading }];
      ruby.push({ text, reading: reading.slice(cursor, next) });
      cursor = next;
    } else {
      if (hiragana(reading.slice(cursor, cursor + piece.length)) !== hiragana(piece)) return [{ text: surface, reading }];
      ruby.push({ text, reading: '' });
      cursor += piece.length;
    }
  }
  return cursor === reading.length ? ruby : [{ text: surface, reading }];
}

const segmenter = new TinySegmenter();
/** Reconcile statistical boundaries with compounds, inflections and source offsets. */
export function tokenizeJapanese(text: string): Token[] {
  const tokens: Token[] = [];
  const runs = text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ーｰ々〆ヶ\uFF9E\uFF9F\u3099\u309A]+|\n|[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ーｰ々〆ヶ\uFF9E\uFF9F\u3099\u309A\n]+/gu) ?? [];
  const cache = new Map<string, JapaneseDefinition | null>();
  const lookup = (word: string): JapaneseDefinition | null => {
    if (!cache.has(word)) cache.set(word, lookupJapanese(word));
    return cache.get(word) ?? null;
  };
  for (const run of runs) {
    if (!isJapanese(run)) {
      for (const part of run.match(/[A-Za-z0-9]{1,12}|[^\S\n]+|\n|./gu) ?? []) tokens.push({ word: part, pinyin: '', syllables: [] });
      continue;
    }
    const { normalized, ends } = normalizedOffsets(run);
    const boundaries = new Set<number>();
    let boundary = 0;
    for (const part of segmenter.segment(normalized)) {
      boundary += part.length;
      if (!/[\uDC00-\uDFFF]/.test(normalized[boundary] ?? '')) boundaries.add(boundary);
    }
    for (let start = 0; start < normalized.length;) {
      const fallbackEnd = [...boundaries].find((end) => end > start) ?? normalized.length;
      let end = fallbackEnd;
      let match = lookup(normalized.slice(start, end));
      const first = normalized.slice(start, fallbackEnd);
      // Consider ends inside the statistical chunks too: 一 / 日 / 中雨 must
      // resolve as 一日中 / 雨. Never consume a trailing topic particle in 今日は.
      for (let limit = Math.min(normalized.length, start + 24); limit > start; limit--) {
        if (limit < normalized.length && /[\uDC00-\uDFFF]/.test(normalized[limit])) continue;
        const candidate = normalized.slice(start, limit);
        const longer = lookup(candidate);
        if (!longer) continue;
        const crossesParticle = limit > fallbackEnd && /\p{Script=Han}/u.test(first) && PARTICLES.has(candidate.slice(first.length));
        if (crossesParticle && !longer.conjugation) continue;
        // Rare dictionary coincidences must not swallow several ordinary
        // words. Compounds containing kanji or katakana are useful joins;
        // all-kana joins retain the statistical boundary except inflections.
        const usefulJoin = /[\p{Script=Han}\p{Script=Katakana}]/u.test(candidate) || longer.conjugation || ['こんにちは', 'こんばんは', 'ありがとう', 'おはよう'].includes(candidate);
        if (limit > fallbackEnd && !usefulJoin && match) continue;
        if (limit >= end || !match) { end = limit; match = longer; break; }
      }
      const word = run.slice(ends[start], ends[end]);
      // A short homograph immediately before the subject marker が is more
      // plausibly a noun (はが痛い) than another particle. Keep this heuristic
      // conservative; the popup also lets readers choose another entry.
      if (PARTICLES.has(normalized.slice(start, end)) && normalized[end] === 'が') match = lookupJapanese(normalized.slice(start, end), { preferParticle: false });
      if (match) match = { ...match, word, ruby: alignJapaneseReading(word, match.reading) };
      const reading = match?.reading ?? (/\p{Script=Han}/u.test(word) ? '' : normalizeJapanese(word));
      tokens.push({ word, pinyin: reading, syllables: reading ? [{ text: reading, tone: 0 }] : [], japanese: match ?? undefined });
      start = end;
    }
  }
  return tokens;
}
