import { test } from 'node:test';
import assert from 'node:assert/strict';
import { romanizeJapanese, tokenize, lookupJapanese } from './index';
import { readingLines } from '../../../apps/mochiread/src/lib/reading-presentation';
import { paginateLines, tokenWidth } from '../../../apps/mochiread/src/lib/paginate';
import { readAlongSegments } from '../../../apps/mochiread/src/lib/reading';

test('romaji handles long vowels, small kana, doubled consonants and syllabic n', () => {
  for (const [kana, romaji] of [
    ['ちいさな', 'chiisana'], ['がっこう', 'gakkou'], ['きょう', 'kyou'],
    ['しんよう', "shin'you"], ['まっちゃ', 'matcha'], ['りょこう', 'ryokou'],
    ['コーヒー', 'koohii'], ['ｺｰﾋｰ', 'koohii'], ['ティー', 'tii'],
    ['こんにちは', 'konnichiwa'], ['こんばんは', 'konbanwa'],
  ]) assert.equal(romanizeJapanese(kana), romaji, kana);
  assert.equal(romanizeJapanese('食べる'), '');
  assert.equal(romanizeJapanese(''), '');
});

test('kana, romaji and both expose distinct presentations without changing pronunciation data', () => {
  const entry = lookupJapanese('小さな')!;
  assert.deepEqual(readingLines(entry.reading, 'ja', 'kana'), ['ちいさな']);
  assert.deepEqual(readingLines(entry.reading, 'ja', 'romaji'), ['chiisana']);
  assert.deepEqual(readingLines(entry.reading, 'ja', 'both'), ['ちいさな', 'chiisana']);
  assert.deepEqual(readingLines('xuéxiào', 'zh', 'both'), ['xuéxiào']);
  assert.deepEqual(readingLines('', 'ja', 'both'), []);
  const tokens = tokenize('小さな猫は学校へ行こう。', 'ja');
  assert.equal(readAlongSegments(tokens, 'ja')[0].text, 'ちいさな');
  assert.equal(tokens[0].pinyin, 'ちいさな');
});

test('particle romaji follows pronunciation while homographic nouns stay distinct', () => {
  assert.deepEqual(readingLines('は', 'ja', 'both', 'は'), ['は', 'wa']);
  assert.deepEqual(readingLines('へ', 'ja', 'romaji', 'へ'), ['e']);
  assert.deepEqual(readingLines('を', 'ja', 'romaji', 'を'), ['o']);
  const topic = lookupJapanese('は')!;
  const tooth = topic.alternatives.find((entry) => entry.senses.some((sense) => sense.meanings.includes('tooth')))!;
  assert.deepEqual(readingLines('は', 'ja', 'romaji', 'は', tooth.entryId), ['ha']);
});

test('both allocates two reading rows and the measured romaji width', () => {
  const tokens = tokenize('小さな猫。\n学校に行こう。\n今日は雨です。', 'ja');
  const args = { tokens, hanziSize: 28, pinyinSize: 13, reservePinyinRow: true, viewWidth: 180, viewHeight: 130 };
  const kana = paginateLines({ ...args, japaneseReadingMode: 'kana' });
  const both = paginateLines({ ...args, japaneseReadingMode: 'both' });
  assert(both.length > kana.length);
  assert.equal(both.flat(2).map((token) => token.word).join(''), tokens.map((token) => token.word).join(''));
  assert(tokenWidth(tokens[0], 28, 20, true, 'both') >= tokenWidth(tokens[0], 28, 20, false, 'both'));
  const kanaHidden = paginateLines({ ...args, reservePinyinRow: false, japaneseReadingMode: 'kana' });
  const bothHidden = paginateLines({ ...args, reservePinyinRow: false, japaneseReadingMode: 'both' });
  assert.deepEqual(bothHidden, kanaHidden);
});
