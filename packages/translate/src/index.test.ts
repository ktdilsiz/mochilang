import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translate, translationChunks } from './index';

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const memory = (text = "It's a nice day.") => json({ responseStatus: 200, responseData: { translatedText: text } });
const isMemory = (url: unknown) => String(url).includes('api.mymemory.translated.net');

test('Japanese and Chinese echoes fall through to real English instead of success', async (t) => {
  const calls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    calls.push(String(url));
    return isMemory(url) ? memory() : json({ translation: decodeURIComponent(new URL(url).pathname.split('/').at(-1)!) });
  });
  for (const [from, text] of [['ja', '今日はいい天気です。'], ['zh', '今天天气很好。']]) {
    const result = await translate(text, { from });
    assert.equal(result.source, 'mymemory');
    assert.equal(result.translation, "It's a nice day.");
  }
  assert.equal(calls.length, 4);
});

test('normalizing punctuation cannot disguise an untranslated answer', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: string) => isMemory(url) ? memory() : json({ translation: ' 今 日 は い い 天 気 で す！' }));
  assert.equal((await translate('今日はいい天気です。', { from: 'ja' })).source, 'mymemory');
});

test('malformed payloads and HTTP errors advance through configured providers', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    if (String(url).startsWith('https://bad-payload')) return json({ translation: { text: 'bad' } });
    if (String(url).startsWith('https://bad-http')) return json({}, 503);
    return memory('Good morning.');
  });
  const result = await translate('おはようございます。', { from: 'ja', lingvaEndpoints: ['https://bad-payload', 'https://bad-http'] });
  assert.equal(result.translation, 'Good morning.');
});

test('a stalled request cannot block the fallback even when fetch ignores abort', async (t) => {
  let aborted = false;
  t.mock.method(globalThis, 'fetch', (url: string, options?: RequestInit) => {
    if (isMemory(url)) return Promise.resolve(memory());
    options?.signal?.addEventListener('abort', () => { aborted = true; });
    return new Promise<Response>(() => {});
  });
  const result = await translate('今日はいい天気です。', { from: 'ja', requestTimeoutMs: 15 });
  assert.equal(result.source, 'mymemory');
  assert(aborted);
});

test('a stalled JSON response body is covered by the same deadline', async (t) => {
  t.mock.method(globalThis, 'fetch', (url: string) => Promise.resolve(isMemory(url) ? memory() : { ok: true, json: () => new Promise(() => {}) }));
  assert.equal((await translate('今日はいい天気です。', { from: 'ja', requestTimeoutMs: 15 })).source, 'mymemory');
});

test('cancel aborts the active request without contacting another provider', async (t) => {
  const controller = new AbortController();
  let calls = 0;
  t.mock.method(globalThis, 'fetch', () => {
    calls++;
    return new Promise<Response>(() => {});
  });
  const pending = translate('今日はいい天気です。', { from: 'ja', signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(calls, 1);
  await assert.rejects(translate('天気', { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls, 1);
});

test('quota failures and echoed fallback responses become errors, not displayed translations', async (t) => {
  let quota = true;
  t.mock.method(globalThis, 'fetch', async () => quota ? json({ responseStatus: 429, quotaFinished: true, responseDetails: 'Quota exceeded' }) : memory('今日はいい天気です。'));
  await assert.rejects(translate('今日はいい天気です。', { from: 'ja', lingvaEndpoints: [] }), /Quota exceeded/);
  quota = false;
  await assert.rejects(translate('今日はいい天気です。', { from: 'ja', lingvaEndpoints: [] }), /untranslated source/);
});

test('legitimate invariant text and same-language requests are preserved', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url: string) => { calls++; return json({ translation: decodeURIComponent(new URL(url).pathname.split('/').at(-1)!) }); });
  assert.equal((await translate('123', { from: 'ja' })).translation, '123');
  assert.equal((await translate('Tokyo', { from: 'ja' })).translation, 'Tokyo');
  assert.equal((await translate('今日はいい天気です。', { from: 'ja', to: 'ja' })).source, 'identity');
  assert.equal((await translate(' ')).source, 'empty');
  assert.equal(calls, 2);
});

test('long passages obey UTF-8 byte limits without splitting emoji or losing text', async (t) => {
  const text = ('今日は雨です。😀学校に行きます。\n').repeat(20);
  const chunks = translationChunks(text);
  assert.equal(chunks.join(''), text);
  assert(chunks.length > 1);
  assert(chunks.every((chunk) => Buffer.byteLength(chunk, 'utf8') <= 480));
  assert(translationChunks('a ' + '😀'.repeat(200)).every((chunk) => Buffer.byteLength(chunk, 'utf8') <= 480));
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    const request = new URL(url);
    assert(Buffer.byteLength(request.searchParams.get('q')!, 'utf8') <= 500);
    calls++;
    return memory(`English paragraph ${calls}.`);
  });
  const result = await translate(text, { from: 'ja', lingvaEndpoints: [] });
  assert.equal(calls, translationChunks(text.trim()).length);
  assert(result.translation.includes('English paragraph 2.'));
  assert.equal(result.source, 'mymemory');
});

test('provider entities are decoded as text and auto language pairs remain supported', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    assert.equal(new URL(url).searchParams.get('langpair'), 'Autodetect|en');
    return memory('It&#39;s a nice day &amp; evening.');
  });
  assert.equal((await translate('今日はいい天気です。', { from: 'auto', lingvaEndpoints: [] })).translation, "It's a nice day & evening.");
});

test('disabling the fallback still reports the rejected echo', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => json({ translation: '今日はいい天気です。' }));
  await assert.rejects(translate('今日はいい天気です。', { from: 'ja', disableMyMemoryFallback: true }), /untranslated source/);
});
