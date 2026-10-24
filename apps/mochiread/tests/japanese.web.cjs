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
        // Some Japanese voices only emit a sentence boundary at its end.
        // This must never move a read-along highlight to the final word.
        message.onboundary?.({ name: 'sentence', charIndex: message.text.length, charLength: 0 });
        timer = setTimeout(() => message.onend?.({}), 450);
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
    assert.equal(await page.getByRole('radio', { name: 'Both', exact: true }).getAttribute('aria-checked'), 'true');
    assert.equal(await page.getByText('Tone colors', { exact: true }).count(), 0);
    await page.getByText('Always show', { exact: true }).click();
    await page.getByLabel('Back', { exact: true }).click();
    await page.getByRole('button', { name: '学校', exact: true }).getByText('gakkou', { exact: true }).waitFor();
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

    // Word tracking works even when the voice supplies no word events.
    await page.getByLabel('Play page', { exact: true }).click();
    await page.waitForFunction(() => window.testSpeech.length === 1 && document.querySelector('[aria-label="私"]')?.getAttribute('aria-selected') === 'true').catch(async (error) => {
      console.log(await page.evaluate(() => ({ speech: window.testSpeech, highlighted: [...document.querySelectorAll('[role="button"][aria-selected="true"]')].map((node) => node.getAttribute('aria-label')) })));
      throw error;
    });
    assert.equal((await page.evaluate(() => window.testSpeech))[0].text, 'わたし');
    await page.waitForFunction(() => window.testSpeech.length === 2 && document.querySelector('[aria-label="は"]')?.getAttribute('aria-selected') === 'true');
    await page.getByLabel('Pause', { exact: true }).click();
    await page.waitForTimeout(500);
    const speech = await page.evaluate(() => window.testSpeech);
    assert.equal(speech.length, 2);
    assert.equal(speech[1].text, 'わ');
    assert.equal(speech[0].language, 'ja-JP');

    await menu('Audio');
    await page.getByText('Natural sentences', { exact: true }).click();
    await page.getByLabel('Back', { exact: true }).click();
    await page.evaluate(() => { window.testSpeech = []; });
    await page.getByLabel('Play page', { exact: true }).click();
    await page.waitForFunction(() => window.testSpeech.length === 1);
    assert.equal((await page.evaluate(() => window.testSpeech))[0].text, '私は学校に行こう。');
    assert.equal(await page.getByRole('button', { name: '学校', exact: true }).getAttribute('aria-selected'), 'true');
    assert.equal(await page.getByRole('button', { name: '行こう', exact: true }).getAttribute('aria-selected'), 'true');
    await page.getByLabel('Pause', { exact: true }).click();

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

    // Reproduce the real outage: HTTP 200 with an echoed source is rejected,
    // then the working fallback supplies English and its own attribution.
    await page.unroute('**/api/v1/**');
    await page.route('**/api/v1/**', async (route) => {
      const source = decodeURIComponent(new URL(route.request().url()).pathname.split('/').at(-1));
      await route.fulfill({ json: { translation: source } });
    });
    let fallbackFails = false;
    await page.route('https://api.mymemory.translated.net/**', async (route) => {
      await route.fulfill({ json: fallbackFails
        ? { responseStatus: 429, quotaFinished: true, responseDetails: 'Quota exceeded' }
        : { responseStatus: 200, responseData: { translatedText: 'I will go to school.' } } });
    });
    const translateSchool = async () => {
      await page.getByRole('button', { name: '学校', exact: true }).click({ delay: 500 });
      await page.getByText('Translate', { exact: true }).click();
    };
    await translateSchool();
    await page.getByText('I will go to school.', { exact: true }).waitFor();
    await page.getByText('Translation via MyMemory.', { exact: true }).waitFor();
    await page.getByLabel('Close', { exact: true }).click();
    fallbackFails = true;
    await translateSchool();
    await page.getByText('Couldn’t translate. Try again.', { exact: true }).waitFor();
    fallbackFails = false;
    await page.getByText('Retry', { exact: true }).click();
    await page.getByText('I will go to school.', { exact: true }).waitFor();
    await page.getByLabel('Close', { exact: true }).click();
    await menu('Audio');
    await page.getByText('Japanese test voice', { exact: true }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mochiread:prefs')).japaneseVoiceId), 'test-ja');
    await page.getByLabel('Back', { exact: true }).click();
    await edit('学校で食べられなかった。');
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

    // Beginner reading styles apply to the reader, popup, vocabulary and
    // flashcards; only kana stays in storage and is sent to Japanese speech.
    await edit('小さな猫です。');
    const small = () => page.getByRole('button', { name: '小さな', exact: true });
    await small().getByText('ちいさな', { exact: true }).waitFor();
    await small().getByText('chiisana', { exact: true }).waitFor();
    await menu('Display');
    await page.getByRole('radio', { name: 'Kana', exact: true }).click();
    await page.getByLabel('Back', { exact: true }).click();
    assert.equal(await small().getByText('chiisana', { exact: true }).count(), 0);
    await menu('Display');
    await page.getByRole('radio', { name: 'Romaji', exact: true }).click();
    await page.getByLabel('Back', { exact: true }).click();
    await small().getByText('chiisana', { exact: true }).waitFor();
    assert.equal(await small().getByText('ちいさな', { exact: true }).count(), 0);
    await small().click();
    await page.getByLabel('Save word', { exact: true }).click();
    const smallCard = await page.evaluate(() => JSON.parse(localStorage.getItem('mochiread:vocab')).find((entry) => entry.word === '小さな'));
    assert.equal(smallCard.pinyin, 'ちいさな');
    await page.mouse.click(410, 850);
    await menu('Vocabulary');
    await page.getByText('chiisana', { exact: true }).waitFor();
    assert.equal(await page.getByText('ちいさな', { exact: true }).count(), 0);
    await page.getByLabel('Back', { exact: true }).click();
    await menu('Flashcards');
    await page.getByText('Show', { exact: true }).click();
    await page.getByText('taberu', { exact: true }).waitFor();
    await page.getByText('Got it', { exact: true }).click();
    await page.getByText('Show', { exact: true }).click();
    await page.getByText('chiisana', { exact: true }).waitFor();
    await page.getByLabel('Back', { exact: true }).click();
    await menu('Display');
    await page.getByRole('radio', { name: 'Both', exact: true }).click();
    await page.getByLabel('Back', { exact: true }).click();
    await menu('Flashcards');
    await page.getByText('Show', { exact: true }).click();
    await page.getByText('ちいさな', { exact: true }).waitFor();
    await page.getByText('chiisana', { exact: true }).waitFor();
    await page.reload();
    await small().getByText('chiisana', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mochiread:prefs')).japaneseReadingMode), 'both');
    await page.screenshot({ path: path.join(root, 'japanese-romaji.png') });

    if (process.env.MOCHIREAD_LIVE_TRANSLATION === '1') {
      await page.unroute('**/api/v1/**');
      await page.unroute('https://api.mymemory.translated.net/**');
      for (const language of ['ja', 'zh']) {
        await menu('New text');
        await page.getByText(language === 'ja' ? 'Japanese' : 'Chinese', { exact: true }).click();
        const source = language === 'ja' ? '今日はいい天気です。' : '今天天气很好。';
        await page.locator('textarea').fill(source);
        await page.getByText('Read', { exact: true }).click();
        const words = page.getByRole('button', { name: language === 'ja' ? '今日' : '今天', exact: true });
        await words.click({ delay: 500 });
        await page.getByRole('button', { name: language === 'ja' ? 'です' : '好', exact: true }).click();
        await page.getByText('Translate', { exact: true }).click();
        const result = page.getByTestId('translation-result');
        await result.waitFor({ timeout: 30000 });
        const english = await result.innerText();
        assert(/[a-z]/i.test(english) && !/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(english), english);
        console.log(`LIVE ${language} → English: ${english}`);
        await page.getByLabel('Close', { exact: true }).click();
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS: migration, dictionary, vocabulary, furigana, widths, per-word tracking without boundary events, sentence mode/cancel, voice settings, translation echo rejection/fallback/retry.');
    console.log(`Preview screenshot: ${path.join(root, 'japanese-reader.png')}`);
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
