const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const root = process.env.MOCHIREAD_WEB_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'mochiread-backup-'));
const basePath = process.env.MOCHIREAD_BASE_PATH || '';
if (!process.env.MOCHIREAD_WEB_DIR) execFileSync('node', ['scripts/build-web-dictionaries.mjs'], { cwd: path.resolve(__dirname, '../..'), stdio: 'inherit' });
if (!process.env.MOCHIREAD_WEB_DIR) execFileSync('pnpm', ['exec', 'expo', 'export', '--platform', 'web', '--output-dir', root], { cwd: path.resolve(__dirname, '../..'), stdio: 'inherit' });
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (!pathname.startsWith(`${basePath}/`)) { response.statusCode = 404; response.end(); return; }
  const relative = pathname.slice(basePath.length);
  const file = path.join(root, relative === '/' ? 'index.html' : relative);
  response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream');
  fs.createReadStream(file).on('error', () => { response.statusCode = 404; response.end(); }).pipe(response);
});

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: process.env.MOCHIREAD_BROWSER_CHANNEL || 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(30000);
    const errors = [], downloads = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => { if (request.url().includes('/dictionaries/')) downloads.push(request.url()); });
    await page.addInitScript(() => {
      window.testSpeech = [];
      window.SpeechSynthesisUtterance = class {};
      window.speechSynthesis.getVoices = () => [
        { voiceURI: 'es-test', lang: 'es-ES', name: 'Spanish Natural', localService: true },
        { voiceURI: 'zh-test', lang: 'zh-CN', name: 'Chinese test', localService: true },
      ];
      window.speechSynthesis.speak = (message) => {
        window.testSpeech.push({ text: message.text, lang: message.lang, voice: message.voice?.voiceURI });
        message.onstart?.({}); setTimeout(() => message.onend?.({}), 30);
      };
      window.speechSynthesis.cancel = () => {};
      if (localStorage.getItem('mochiread:test-es')) return;
      localStorage.setItem('mochiread:test-es', '1');
      localStorage.setItem('mochiread:prefs:es', JSON.stringify({ autoPlay: false }));
      localStorage.setItem('mochiread:vocab', JSON.stringify([{ word: '学校', language: 'zh', pinyin: 'xuéxiào', meanings: ['school'], remembered: 7, dueAt: 0 }]));
    });
    const url = `http://127.0.0.1:${server.address().port}${basePath}/`;
    const menu = async (label) => { await page.getByLabel('Open menu', { exact: true }).click(); await page.getByText(label, { exact: true }).click(); };
    await page.goto(url);
    await page.getByRole('button', { name: 'Choose Spanish', exact: true }).click();
    await menu('New text');
    await page.getByPlaceholder('Por ejemplo: ¡Hola, mundo!').fill('¡Hola! Estoy leyendo libros. Los niños viven en casas.');
    await page.getByText('Read', { exact: true }).click();
    await page.getByRole('button', { name: 'Estoy', exact: true }).click();
    await page.getByText(/estar:/).first().waitFor();
    assert.equal(await page.getByText('Practice writing ✎', { exact: true }).count(), 0);
    await page.getByLabel('Save word', { exact: true }).click({ force: true });
    await page.getByLabel('Play pronunciation', { exact: true }).click({ force: true });
    await page.waitForFunction(() => window.testSpeech.some((speech) => speech.lang === 'es-ES'));
    assert.equal((await page.evaluate(() => window.testSpeech)).at(-1).voice, 'es-test');
    await page.mouse.click(380, 760);
    assert(downloads.some((value) => /es-[a-f0-9]+\.json\.gz$/.test(value)));
    assert(!downloads.some((value) => /(?:ja|zh)-[a-f0-9]+\.json\.gz$/.test(value)), 'Spanish must not download CJK dictionaries');
    for (const width of [360, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.waitForTimeout(100);
      for (const word of ['Estoy', 'leyendo', 'libros', 'niños', 'casas']) {
        const box = await page.getByRole('button', { name: word, exact: true }).boundingBox();
        assert(box && box.x >= 19 && box.x + box.width <= width - 19, `Spanish word overflow at ${width}: ${word}`);
      }
    }
    await page.route('**/api/v1/es/en/**', (route) => route.fulfill({ json: { translation: decodeURIComponent(new URL(route.request().url()).pathname.split('/').at(-1)) } }));
    await page.route('https://api.mymemory.translated.net/**', (route) => route.fulfill({ json: { responseStatus: 200, responseData: { translatedText: 'I am reading books.' } } }));
    await page.getByRole('button', { name: 'Estoy', exact: true }).click({ delay: 500 });
    await page.getByRole('button', { name: 'libros', exact: true }).click();
    await page.getByText('Translate', { exact: true }).click();
    await page.getByText('I am reading books.', { exact: true }).waitFor();
    await page.getByText('Translation via MyMemory.', { exact: true }).waitFor();
    await page.getByLabel('Close', { exact: true }).click();
    await menu('Display');
    assert.equal(await page.getByText('Pinyin', { exact: true }).count(), 0);
    assert.equal(await page.getByRole('radio', { name: 'Both', exact: true }).count(), 0);
    const slider = page.getByRole('slider', { name: 'Font size', exact: true });
    await slider.focus();
    await slider.press('Home');
    for (let index = 0; index < 12; index++) await slider.press('ArrowRight');
    await page.getByLabel('Back', { exact: true }).click();
    await menu('Vocabulary');
    await page.getByText('estoy', { exact: true }).waitFor();
    assert.equal(await page.getByText('学校', { exact: true }).count(), 0);
    await page.getByLabel('Back', { exact: true }).click();
    await menu('Flashcards');
    await page.getByText('Got it', { exact: true }).click();
    await page.getByText('Session complete', { exact: true }).waitFor();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('mochiread:vocab') || '[]').some(word => word.language === 'es' && word.remembered === 1));
    const vocab = await page.evaluate(() => JSON.parse(localStorage.getItem('mochiread:vocab')));
    assert.equal(vocab.find((word) => word.language === 'es').remembered, 1);
    assert.equal(vocab.find((word) => word.language === 'zh').remembered, 7);
    await page.getByLabel('Back', { exact: true }).click();
    await menu('Backup & restore');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download backup', exact: true }).click()]);
    const backup = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    assert.equal(JSON.parse(backup.data['mochiread:prefs:es']).fontSize, 30);
    assert(backup.data['mochiread:reading:text:es'].includes('Estoy'));
    assert(JSON.parse(backup.data['mochiread:library']).some((entry) => entry.language === 'es'));
    const transferred = await browser.newPage();
    await transferred.goto(url);
    await transferred.getByRole('button', { name: 'Choose Spanish', exact: true }).click();
    await transferred.getByLabel('Open menu', { exact: true }).click();
    await transferred.getByText('Backup & restore', { exact: true }).click();
    await transferred.getByLabel('Paste backup JSON', { exact: true }).fill(JSON.stringify(backup));
    await transferred.getByRole('button', { name: 'Review pasted backup', exact: true }).click();
    await transferred.getByRole('button', { name: 'Restore this backup', exact: true }).click();
    await transferred.getByRole('button', { name: 'Estoy', exact: true }).waitFor();
    assert.equal(await transferred.evaluate(() => JSON.parse(localStorage.getItem('mochiread:vocab')).find((word) => word.language === 'es').remembered), 1);
    assert.equal(await transferred.evaluate(() => JSON.parse(localStorage.getItem('mochiread:prefs:es')).fontSize), 30);
    await transferred.close();
    await page.reload();
    await page.getByRole('button', { name: 'Estoy', exact: true }).waitFor();
    await menu('Switch language');
    await page.getByRole('button', { name: 'Choose Chinese', exact: true }).click();
    await menu('Vocabulary');
    await page.getByText('学校', { exact: true }).waitFor();
    assert.equal(await page.getByText('estoy', { exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: full Spanish dictionary/inflections, isolated vocabulary/reviews/settings, Spanish voices, backups, remembered language, responsive reading, and no CJK controls.');
  } finally { await browser.close(); server.closeAllConnections(); server.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; server.closeAllConnections(); server.close(); });
