import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize } from '@mochilang/dict';
import { parseBackup, summarizeBackup } from '../../src/storage/backup-format';
import { migrateLibrary } from '../../src/storage/migrations';
import { migrateVocabulary } from '../../src/storage/vocabulary-migration';
import { paginateLines } from '../../src/features/reading/paginate';
import { readingLines } from '../../src/features/reading/reading-presentation';
import { speechSegments, readAlongSegments } from '../../src/features/reading/reading';

test('Spanish survives backup and migrations without being reclassified as Chinese', () => {
  const entry = { id: 'es', title: 'Hola', text: '¡Hola!', language: 'es', createdAt: 1 };
  const vocab = [{ word: 'hola', language: 'es' as const, remembered: 9, dueAt: 100 }];
  const data = { 'mochiread:library': JSON.stringify([entry]), 'mochiread:vocab': JSON.stringify(vocab), 'mochiread:prefs:es': JSON.stringify({ fontSize: 30 }), 'mochiread:stats:es': '[]', 'mochiread:reading:text:es': '¡Hola!', 'mochiread:reading:page:es': '2' };
  const backup = parseBackup(JSON.stringify({ format: 'mochiread-backup', version: 1, createdAt: new Date().toISOString(), data }));
  assert.deepEqual(backup.data, data);
  assert.deepEqual(summarizeBackup(backup).find(summary => summary.language === 'es'), { language: 'es', texts: 1, words: 1 });
  assert.equal(migrateLibrary([entry], null, null).library.find(value => value.id === 'es')?.language, 'es');
  assert.equal(migrateVocabulary(vocab, 'es')[0].language, 'es');
  assert.equal(migrateVocabulary(vocab, 'zh')[0].remembered, 9);
});
test('Spanish uses original spelling and sentence/word speech without CJK readings', () => {
  const tokens = tokenize('¡Hola, mundo! Estoy leyendo. ¿Y tú?', 'es');
  const sentences = speechSegments(tokens, 'es');
  assert.equal(sentences.map(segment => segment.text).join(''), '¡Hola, mundo! Estoy leyendo. ¿Y tú?');
  assert.equal(sentences.length, 3);
  assert(readAlongSegments(tokens, 'es').some(segment => segment.text.includes('leyendo')));
  assert.deepEqual(readingLines('hola', 'es', 'both'), []);
});

test('Spanish punctuation stays with its word across narrow lines', () => {
  const tokens = tokenize('¿Hola, mundo? Estoy leyendo libros.', 'es');
  const pages = paginateLines({ tokens, hanziSize: 28, pinyinSize: 13, reservePinyinRow: false, viewWidth: 130, viewHeight: 200 });
  assert.equal(pages.flat(2).map(token => token.word).join(''), tokens.map(token => token.word).join(''));
  for (const line of pages.flat()) {
    assert(!/^[.,!?]/u.test(line[0]?.word ?? ''));
    assert(!/[¿¡]$/u.test(line.at(-1)?.word ?? ''));
  }
});
