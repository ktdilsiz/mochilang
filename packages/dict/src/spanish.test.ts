import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, isReadableWord, lookupSpanish } from './index';

test('Spanish tokens retain accents, decomposed marks, punctuation, spaces and Windows line breaks', () => {
  const text = '¡Hola, mundo! ¿Dónde está el niño?\r\nCafe\u0301 y pingüinos. 😀';
  const tokens = tokenize(text, 'es');
  assert.equal(tokens.map(token => token.word).join(''), text);
  assert(tokens.some(token => token.word === 'Cafe\u0301'));
  assert(tokens.some(token => token.word === '\n'));
  assert(tokens.every(token => token.pinyin === '' && token.syllables.length === 0));
  assert(isReadableWord('niño', 'es'));
  assert(!isReadableWord('¿', 'es'));
  assert(!isReadableWord('学校', 'es'));
});
test('full Spanish dictionary includes common words, inflections and linked meanings', () => {
  assert(lookupSpanish('HOLA')?.meanings.some(meaning => meaning.includes('hello')));
  assert(lookupSpanish('estoy')?.lemmas.includes('estar'));
  assert(lookupSpanish('estoy')?.meanings.some(meaning => meaning.startsWith('estar:')));
  assert(lookupSpanish('hablando')?.lemmas.includes('hablar'));
  assert(lookupSpanish('libros')?.meanings.some(meaning => /book/i.test(meaning)));
  assert.deepEqual(lookupSpanish('niños')?.lemmas, ['niño']);
  const went = lookupSpanish('fui');
  assert(went?.lemmas.includes('ir') && went.lemmas.includes('ser'));
  assert.equal(lookupSpanish('zzzznotaword'), null);
});
