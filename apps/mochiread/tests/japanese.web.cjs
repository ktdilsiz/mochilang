const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

// Run against a supplied export, or build a fresh one in an isolated folder.
const root = process.env.MOCHIREAD_WEB_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'mochiread-japanese-test-'));
if (!process.env.MOCHIREAD_WEB_DIR) execFileSync('pnpm', ['exec', 'expo', 'export', '--platform', 'web', '--output-dir', root], { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
const server = http.createServer((request, response) => {
  const relative = decodeURIComponent(request.url.split('?')[0]);
  const file = path.join(root, relative === '/' ? 'index.html' : relative);
  response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream');
  fs.createReadStream(file).on('error', () => { response.statusCode = 404; response.end(); }).pipe(response);
});

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: process.env.MOCHIREAD_BROWSER_CHANNEL || 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      // Mock speech transport, not the app: verify the utterances it sends,
      // language, boundaries and cancellation without relying on PC voices.
      window.testSpeech = [];
      let timer;
      window.speechSynthesis.getVoices = () => [
        { voiceURI: 'test-ja', lang: 'ja-JP', name: 'Japanese test voice', localService: true },
        { voiceURI: 'test-zh', lang: 'zh-CN', name: 'Chinese test voice', localService: true },
      ];
      window.speechSynthesis.speak = (message) => {
        window.testSpeech.push({ text: message.text, language: message.lang, voice: message.voice?.voiceURI });
        message.onstart?.({});
        message.onboundary?.({ charIndex: 0 });
        timer = setTimeout(() => message.onend?.({}), 250);
      };
      window.speechSynthesis.cancel = () => clearTimeout(timer);
      if (localStorage.getItem('mochiread:test-seeded')) return;
      localStorage.setItem('mochiread:test-seeded', '1');
      localStorage.setItem('mochiread:prefs', JSON.stringify({ showPinyin: false, autoPlay: false }));
      localStorage.setItem('mochiread:library', JSON.stringify([{ id: 'legacy', title: 'Legacy text', text: '你好', createdAt: 1 }]));
      localStorage.setItem('mochiread:vocab', JSON.stringify([{ word: '学校', pinyin: 'xuéxiào', meanings: ['school'], remembered: 3, dueAt: 0 }]));
    });
    const menu = async (screen) => {
      await page.getByLabel('Open menu', { exact: true }).click();
      await page.getByText(screen, { exact: true }).click();
    };
    const edit = async (text) => {
      await menu('New text');
      await page.getByText('Japanese', { exact: true }).click();
      await page.getByPlaceholder('例：こんにちは、世界！').fill(text);
      await page.getByText('Read', { exact: true }).click();
    };
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await edit('今日は学校に行きました。コーヒーを飲んだ。');
    await page.getByRole('button', { name: '学校', exact: true }).click();
    await page.getByText('• school', { exact: true }).waitFor();
    await page.getByText('がっこう', { exact: true }).last().waitFor();
    assert.equal(await page.getByText('Practice writing ✎', { exact: true }).count(), 0);
    await page.getByLabel('Save word', { exact: true }).click();
    await page.mouse.click(410, 850);
    await menu('Vocabulary');
    assert.equal(await page.getByText('学校', { exact: true }).count(), 2);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('mochiread:vocab')));
    assert.equal(stored[0].language, 'ja');
    assert(stored[0].entryId);
    assert(stored[0].examples[0].sentence.includes('学校'));
    assert.equal(stored[1].language, 'zh');
    assert.equal(stored[1].remembered, 3);
    await page.getByLabel('Back', { exact: true }).click();
    await menu('Flashcards');
    await page.getByText('Got it', { exact: true }).click();
    await page.getByText('Got it', { exact: true }).click();
    await page.getByText('Session complete', { exact: true }).waitFor();
    const reviewed = await page.evaluate(() => JSON.parse(localStorage.getItem('mochiread:vocab')));
    assert.equal(reviewed.find((entry) => entry.language === 'ja').remembered, 1);
    assert.equal(reviewed.find((entry) => entry.language === 'zh').remembered, 4);
    await page.reload();
    await page.getByRole('button', { name: '学校', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('mochiread:reading:language')), 'ja');

    await menu('Display');
    assert.equal(await page.getByText('Tone colors', { exact: true }).count(), 0);
    await page.getByText('Always show', { exact: true }).click();
    await page.getByLabel('Back', { exact: true }).click();
    await edit('私は学校に行こう。今日は一日中雨です。生ビールとｺｰﾋｰを飲む。食べられなかった。');
    await page.getByRole('button', { name: 'は', exact: true }).first().click();
    await page.getByText('Particle', { exact: true }).first().waitFor();
    assert((await page.getByText('• indicates sentence topic', { exact: true }).count()) > 0);
    assert.equal(await page.getByText('• tooth', { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Use は: tooth', exact: true }).click();
    await page.getByText('• tooth', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Use は: indicates sentence topic', exact: true }).click();
    await page.getByText('• indicates sentence topic', { exact: true }).waitFor();
    await page.mouse.click(410, 850);
    await page.getByRole('button', { name: '一日中', exact: true }).waitFor();
    await page.getByRole('button', { name: 'ｺｰﾋｰ', exact: true }).waitFor();
    await page.getByRole('button', { name: '食べられなかった', exact: true }).click();
    await page.getByText('食べる · potential / passive · past negative', { exact: true }).waitFor();
    await page.getByLabel('Save word', { exact: true }).click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mochiread:vocab')));
    const eat = saved.find((entry) => entry.word === '食べる');
    assert.equal(eat.pinyin, 'たべる');
    assert.equal(eat.examples[0].surface, '食べられなかった');
    assert.equal(eat.examples[0].sentence, '食べられなかった。');
    await page.mouse.click(410, 850);

    // Real sentence speech, including punctuation; stopping cannot start the
    // queued next sentence even if the platform omits its onStopped event.
    await page.getByLabel('Play page', { exact: true }).click();
    await page.waitForFunction(() => window.testSpeech.length > 0);
    await page.getByLabel('Pause', { exact: true }).click();
    await page.waitForTimeout(350);
    const speech = await page.evaluate(() => window.testSpeech);
    assert.equal(speech.length, 1);
    assert.equal(speech[0].text, '私は学校に行こう。');
    assert.equal(speech[0].language, 'ja-JP');

    let translatedFromJapanese = false;
    await page.route('**/api/v1/**', async (route) => {
      translatedFromJapanese = route.request().url().includes('/ja/en/');
      await route.fulfill({ json: { translation: 'I will go to school.' } });
    });
    await page.getByRole('button', { name: '学校', exact: true }).click({ delay: 500 });
    await page.getByText('Translate', { exact: true }).click();
    await page.getByText('I will go to school.', { exact: true }).waitFor();
    assert(translatedFromJapanese);
    await page.getByLabel('Close', { exact: true }).click();
    await menu('Audio');
    await page.getByText('Japanese test voice', { exact: true }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mochiread:prefs')).japaneseVoiceId), 'test-ja');
    await page.getByLabel('Back', { exact: true }).click();
    await menu('Display');
    await page.getByText('XL', { exact: true }).click();
    await page.getByLabel('Back', { exact: true }).click();
    for (const width of [360, 430, 1280]) {
      await page.setViewportSize({ width, height: 932 });
      await page.waitForTimeout(100);
      for (const word of ['学校', '食べられなかった']) {
        const box = await page.getByRole('button', { name: word, exact: true }).boundingBox();
        assert(box && box.x >= 19 && box.x + box.width <= width - 19, `Word overflow at ${width}px: ${word}`);
      }
    }
    await page.setViewportSize({ width: 430, height: 932 });
    await page.screenshot({ path: path.join(root, 'japanese-reader.png') });
    assert.deepEqual(errors, []);
    console.log('PASS: migration, Japanese lookups, grammar, canonical vocabulary, review history, furigana, widths, sentence speech/cancel, voice settings, translation routing.');
    console.log(`Preview screenshot: ${path.join(root, 'japanese-reader.png')}`);
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
