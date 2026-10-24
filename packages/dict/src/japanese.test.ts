import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, lookup, lookupJapanese, isReadableWord, alignJapaneseReading } from './index';
import { paginateLines } from '../../../apps/mochiread/src/lib/paginate';
import { sentenceForToken, speechSegments } from '../../../apps/mochiread/src/lib/reading';
import { migrateVocabulary, sameVocabWord } from '../../../apps/mochiread/src/lib/vocabulary';

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

test('particles lead with grammatical senses while homographs remain separate', () => {
  const tokens = tokenize('私は学校に行きます。', 'ja');
  const topic = tokens.find((token) => token.word === 'は')!.japanese!;
  assert(topic.meanings[0].includes('topic'));
  assert(!topic.meanings.includes('tooth'));
  assert(topic.alternatives.some((entry) => entry.senses.some((sense) => sense.meanings.includes('tooth'))));
  const ni = tokens.find((token) => token.word === 'に')!.japanese!;
  assert(ni.senses.every((sense) => sense.partsOfSpeech.includes('prt')));
  assert(!ni.meanings.includes('baggage'));
  assert(lookupJapanese('歯')?.meanings.includes('tooth'));
  const tooth = topic.alternatives.find((entry) => entry.senses.some((sense) => sense.meanings.includes('tooth')))!;
  assert(lookupJapanese('は', tooth)?.meanings.includes('tooth'));
  assert(tokenize('はが痛い。', 'ja')[0].japanese?.meanings.includes('tooth'));
});

test('layered conjugations resolve to their verb with the complete surface reading', () => {
  for (const [surface, base, reading] of [
    ['食べたい', '食べる', 'たべたい'],
    ['食べられなかった', '食べる', 'たべられなかった'],
    ['食べさせられました', '食べる', 'たべさせられました'],
    ['読んでいました', '読む', 'よんでいました'],
    ['読めなかった', '読む', 'よめなかった'],
    ['行こう', '行く', 'いこう'],
    ['来ています', '来る', 'きています'],
    ['勉強していました', '勉強', 'べんきょうしていました'],
  ]) {
    const result = lookupJapanese(surface);
    assert.equal(result?.dictionaryForm, base, surface);
    assert.equal(result?.reading, reading, surface);
    assert(result?.conjugation, surface);
    assert(tokenize(surface, 'ja').some((token) => token.word === surface && token.pinyin === reading), surface);
  }
});

test('compounds can span or split statistical chunks without swallowing particles', () => {
  const tokens = tokenize('今日は一日中雨です。生ビールを飲む。', 'ja');
  assert.deepEqual(tokens.slice(0, 4).map((token) => token.word), ['今日', 'は', '一日中', '雨']);
  assert.equal(tokens[2].pinyin, 'いちにちじゅう');
  assert.equal(tokens.find((token) => token.word === '生ビール')?.pinyin, 'なまビール');
  assert(lookupJapanese('生ビール')?.meanings.some((meaning) => meaning.includes('beer')));
});

test('half-width and decomposed kana match normalized entries while preserving source text', () => {
  const text = 'ｺｰﾋｰとｶﾞﾗｽ、は\u3099ら。𠮷野家\nHello 😀';
  const tokens = tokenize(text, 'ja');
  assert.equal(tokens.map((token) => token.word).join(''), text);
  assert(tokens.every((token) => token.word.length > 0));
  assert.equal(tokens.find((token) => token.word === 'ｺｰﾋｰ')?.japanese?.dictionaryForm, 'コーヒー');
  assert.equal(tokens.find((token) => token.word === 'ｶﾞﾗｽ')?.japanese?.dictionaryForm, 'ガラス');
  assert.equal(lookupJapanese('は\u3099ら')?.reading, 'ばら');
});

test('furigana annotates kanji runs and leaves kana/okurigana untouched', () => {
  assert.deepEqual(alignJapaneseReading('食べたい', 'たべたい'), [{ text: '食', reading: 'た' }, { text: 'べたい', reading: '' }]);
  assert.deepEqual(alignJapaneseReading('取り扱う', 'とりあつかう'), [{ text: '取', reading: 'と' }, { text: 'り', reading: '' }, { text: '扱', reading: 'あつか' }, { text: 'う', reading: '' }]);
  assert.deepEqual(alignJapaneseReading('生ビール', 'なまビール'), [{ text: '生', reading: 'なま' }, { text: 'ビール', reading: '' }]);
  assert.deepEqual(alignJapaneseReading('ｶﾞﾗｽ', 'ガラス'), [{ text: 'ｶﾞﾗｽ', reading: '' }]);
});

test('sentence speech retains punctuation, mixed scripts and selection context', () => {
  const text = '今日は学校へ行こう。生ビールとcoffee！\n明日は雨です。';
  const tokens = tokenize(text, 'ja');
  const segments = speechSegments(tokens, 'ja');
  assert.equal(segments.map((segment) => segment.text).join(''), text);
  assert.equal(segments[0].text, '今日は学校へ行こう。');
  assert.equal(sentenceForToken(tokens, tokens.findIndex((token) => token.word === '学校')), '今日は学校へ行こう。');
  assert.equal(segments[1].text, '生ビールとcoffee！');
  const quoted = speechSegments(tokenize('「学校へ行こう。」今日は雨です。', 'ja'), 'ja');
  assert.equal(quoted[0].text, '「学校へ行こう。」');
});

test('line and page boundaries keep Japanese punctuation with its neighbour', () => {
  const tokens = tokenize('「学校へ行こう。」今日は一日中雨です。', 'ja');
  const pages = paginateLines({ tokens, hanziSize: 28, pinyinSize: 13, reservePinyinRow: true, viewWidth: 145, viewHeight: 130 });
  assert.equal(pages.flat(2).map((token) => token.word).join(''), tokens.map((token) => token.word).join(''));
  for (const line of pages.flat()) {
    assert(!/^[。、）」』]/u.test(line[0]?.word ?? ''));
    assert(!/[（「『]$/u.test(line.at(-1)?.word ?? ''));
  }
});

test('vocabulary migration canonicalizes conjugations without losing review history or Chinese cards', () => {
  const vocab = migrateVocabulary([
    { word: '食べました', language: 'ja', remembered: 2, forgotten: 1, dueAt: 100, savedAt: 50 },
    { word: '食べたい', language: 'ja', remembered: 3, forgotten: 2, dueAt: 200, savedAt: 60 },
    { word: '学校', pinyin: 'xuéxiào', remembered: 7 },
  ]);
  assert.equal(vocab.length, 2);
  const japanese = vocab.find((entry) => entry.language === 'ja')!;
  assert.equal(japanese.word, '食べる');
  assert.equal(japanese.pinyin, 'たべる');
  assert.equal(japanese.remembered, 5);
  assert.equal(japanese.forgotten, 3);
  assert.equal(japanese.dueAt, 100);
  assert.equal(japanese.examples?.length, 2);
  assert(sameVocabWord(japanese, '食べる', 'ja', japanese.entryId));
  assert(!sameVocabWord(japanese, '食べる', 'ja', 'another-entry'));
  assert.equal(vocab.find((entry) => entry.language === 'zh')?.remembered, 7);
  assert.deepEqual(migrateVocabulary(vocab), vocab);
});
