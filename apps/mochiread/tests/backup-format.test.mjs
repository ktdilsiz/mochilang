import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBackup, summarizeBackup } from '../src/lib/backup-format.ts';

const make = (data = {}) => JSON.stringify({ format: 'mochiread-backup', version: 1, createdAt: '2026-10-31T12:00:00.000Z', data: { 'mochiread:library': '[]', 'mochiread:vocab': '[]', ...data } });
test('retains both languages and review scheduling without rewriting data', () => {
  const word = { word: '学校', language: 'ja', pinyin: 'がっこう', meanings: ['school'], savedAt: 1, remembered: 8, forgotten: 2, ease: 2.3, intervalDays: 12, dueAt: 2000, examples: [{ sentence: '学校に行く。', surface: '学校' }] };
  const text = { id: 'custom', title: 'My text', text: '你好', language: 'zh', createdAt: 1 };
  const backup = parseBackup(make({ 'mochiread:library': JSON.stringify([text]), 'mochiread:vocab': JSON.stringify([word]), 'mochiread:reading:page:ja': '4' }));
  assert.deepEqual(JSON.parse(backup.data['mochiread:vocab'])[0], word);
  assert.deepEqual(summarizeBackup(backup), [{ language: 'ja', texts: 0, words: 1 }, { language: 'zh', texts: 1, words: 0 }]);
});
test('rejects malformed files, unrelated keys, unsupported versions, and invalid progress/settings', () => {
  for (const bad of [
    'not json', '{}', make().replace('"version":1', '"version":2'),
    make({ 'other-app:token': 'secret' }), make({ 'mochiread:vocab': 'null' }),
    make({ 'mochiread:vocab': JSON.stringify([{ word: '学校', remembered: -1 }]) }),
    make({ 'mochiread:prefs:ja': '{"fontSize":"huge"}' }),
    make({ 'mochiread:reading:page:ja': '-1' }), make({ 'mochiread:reading:page:ja': 'Infinity' }),
    make({ 'mochiread:stats:ja': '[{"date":"today","wordTaps":2,"secondsRead":4}]' }),
  ]) assert.throws(() => parseBackup(bad));
});
test('accepts legacy data for migration and counts untagged entries as Chinese', () => {
  const backup = parseBackup(make({ 'mochiread:vocab': '[{"word":"你好"}]', 'mochiread:prefs': '{"showPinyin":false}', 'mochiread:reading:text': '你好' }));
  assert.equal(summarizeBackup(backup)[1].words, 1);
});

test('accepts slider sizes alongside legacy presets and rejects out-of-range sizes', () => {
  for (const fontSize of [18, 31, 48, 'sm', 'md', 'lg', 'xl']) {
    assert.equal(JSON.parse(parseBackup(make({ 'mochiread:prefs:ja': JSON.stringify({ fontSize }) })).data['mochiread:prefs:ja']).fontSize, fontSize);
  }
  for (const fontSize of [0, 17, 49, '31']) assert.throws(() => parseBackup(make({ 'mochiread:prefs:ja': JSON.stringify({ fontSize }) })));
});
