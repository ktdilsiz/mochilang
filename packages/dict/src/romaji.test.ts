import { test } from 'node:test';
import assert from 'node:assert/strict';
import { romanizeJapanese, tokenize, lookupJapanese } from './index';

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
