import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, lookup, lookupJapanese, isReadableWord } from './index';

test('Japanese text is preserved including emoji, mixed scripts and hard newlines', () => {
  const text = 'こんにちは、世界！\n日本語の本を読みました。Hello 😀 １２３\n\n𠮷野家';
  const tokens = tokenize(text, 'ja');
  assert.equal(tokens.map((t) => t.word).join(''), text);
  assert.equal(tokens.filter((t) => t.word === '\n').length, 3);
  assert(tokens.some((t) => t.word === 'こんにちは'));
  assert.equal(isReadableWord('コーヒー', 'ja'), true);
  assert.equal(isReadableWord('かな', 'ja'), true);
  assert.equal(isReadableWord('😀', 'ja'), false);
});

test('Japanese has kana readings and English definitions without Chinese pinyin', () => {
  const school = lookupJapanese('学校');
  assert.equal(school?.reading, 'がっこう');
  assert(school?.meanings.includes('school'));
  assert.equal(lookupJapanese('本')?.reading, 'ほん');
  assert.equal(tokenize('学校', 'ja')[0].pinyin, 'がっこう');
  assert.notEqual(tokenize('学校')[0].pinyin, 'がっこう');
  assert(lookup('学校')?.meanings.length);
});

test('common verb and adjective inflections retain surface readings', () => {
  for (const [surface, base, reading] of [
    ['食べました', '食べる', 'たべました'],
    ['食べている', '食べる', 'たべている'],
    ['飲んだ', '飲む', 'のんだ'],
    ['行きました', '行く', 'いきました'],
    ['行った', '行く', 'いった'],
    ['来ました', '来る', 'きました'],
    ['読まない', '読む', 'よまない'],
    ['高かった', '高い', 'たかかった'],
    ['勉強しました', '勉強', 'べんきょうしました'],
    ['勉強しています', '勉強', 'べんきょうしています'],
  ]) {
    assert.equal(lookupJapanese(surface)?.dictionaryForm, base, surface);
    assert.equal(lookupJapanese(surface)?.reading, reading, surface);
  }
});

test('word boundaries keep 今日 separate from its topic particle', () => {
  const tokens = tokenize('今日はいい天気です。寿司を食べました。', 'ja');
  assert.equal(tokens[0].word, '今日');
  assert.equal(tokens[0].pinyin, 'きょう');
  assert.equal(tokens[1].word, 'は');
  assert(tokens.some((t) => t.word === '食べました' && t.pinyin === 'たべました'));
});

test('unknown kanji never receive fabricated Chinese or partial kana readings', () => {
  assert.equal(lookupJapanese('超架空未知語'), null);
  const tokens = tokenize('超架空未知語', 'ja');
  for (const token of tokens) {
    if (!lookupJapanese(token.word) && /\p{Script=Han}/u.test(token.word)) {
      assert.equal(token.pinyin, '');
    }
  }
});
