import { test } from 'node:test';
import assert from 'node:assert/strict';
// The bundled entry supplies fixtures; application runtime imports only /core.
import { tokenize, lookupJapanese } from '@mochilang/dict';
import { paginateLines, tokenWidth } from '../../src/features/reading/paginate';
import { readingLines } from '../../src/features/reading/reading-presentation';
import { sentenceForToken, speechSegments, readAlongSegments, boundaryRange } from '../../src/features/reading/reading';
import { migrateVocabulary } from '../../src/storage/vocabulary-migration';
import { sameVocabWord } from '../../src/features/vocabulary/model';

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

test('read along owns one word per utterance and uses Japanese particle sounds', () => {
  const tokens = tokenize('私は学校へ行こう。', 'ja');
  const segments = readAlongSegments(tokens, 'ja');
  assert.deepEqual(segments.map((segment) => segment.text), ['わたし', 'わ', 'がっこう', 'え', 'いこう。']);
  assert(segments.every((segment) => segment.start === segment.end));
  assert.deepEqual(segments.map((segment) => tokens[segment.start].word), ['私', 'は', '学校', 'へ', '行こう']);
});

test('speech boundaries cannot jump to the last word on an utterance-end event', () => {
  const tokens = tokenize('今日は学校に行こう。', 'ja');
  const segment = speechSegments(tokens, 'ja')[0];
  const schoolOffset = segment.text.indexOf('学校');
  const schoolIndex = tokens.findIndex((token) => token.word === '学校');
  assert.deepEqual(boundaryRange(segment, tokens, schoolOffset, 2), [schoolIndex, schoolIndex]);
  assert.equal(boundaryRange(segment, tokens, segment.text.length), null);
  assert.equal(boundaryRange(segment, tokens, segment.text.length + 20), null);
  assert.equal(boundaryRange(segment, tokens, segment.text.indexOf('。')), null);
  assert.equal(boundaryRange(segment, tokens, -1), null);
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
