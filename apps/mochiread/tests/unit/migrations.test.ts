import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateLibrary, migratePrefs } from '../../src/storage/migrations';
import { SEED_LIBRARY, DEPRECATED_SEED_IDS } from '../../src/storage/seeds';

test('library seeding is idempotent and deleted starters stay deleted', () => {
  const first = migrateLibrary([], null, null);
  assert.equal(new Set(first.library.map(entry => entry.id)).size, first.library.length);
  const removed = first.library[0].id;
  const retained = first.library.filter(entry => entry.id !== removed);
  const again = migrateLibrary(retained, '1', JSON.stringify(first.introduced));
  assert.deepEqual(again.library, retained);
  assert(!again.library.some(entry => entry.id === removed));
  assert.equal(first.library.length, SEED_LIBRARY.length);
});
test('library migration keeps custom texts and classifies legacy texts as Chinese', () => {
  const custom = { id: 'custom', title: 'Mine', text: '自分の文章', language: 'ja', createdAt: 1 };
  const old = { id: 'legacy', text: '你好', createdAt: 2 };
  const retired = { id: DEPRECATED_SEED_IDS[0], text: 'retired' };
  const migrated = migrateLibrary([custom, old, retired], '1', null).library;
  assert.deepEqual(migrated.find(entry => entry.id === 'custom'), custom);
  assert.equal(migrated.find(entry => entry.id === 'legacy')?.language, 'zh');
  assert(!migrated.some(entry => entry.id === retired.id));
  assert.throws(() => migrateLibrary({}, null, null));
});
test('legacy preferences retain voice, size and playback choices', () => {
  assert.deepEqual(migratePrefs({ showPinyin: false, fontSize: 31, japaneseVoiceId: 'voice', pagePlayback: 'word' }), {
    pinyinMode: 'off', fontSize: 31, japaneseVoiceId: 'voice', pagePlayback: 'word', japaneseReadingMode: 'both',
  });
});
