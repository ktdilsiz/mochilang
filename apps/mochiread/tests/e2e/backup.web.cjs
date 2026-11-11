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
  const url = `http://127.0.0.1:${server.address().port}${basePath}/`;
  const menu = async (page, label) => { await page.getByLabel('Open menu', { exact: true }).click(); await page.getByText(label, { exact: true }).click(); };
  const snapshot = (page) => page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('mochiread:'))));
  try {
    const source = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const requests = [];
    source.on('request', (request) => { if (request.url().includes('/dictionaries/')) requests.push(request.url()); });
    await source.addInitScript(() => {
      localStorage.setItem('mochiread:library', JSON.stringify([
        { id: 'my-ja', title: 'My Japanese passage', text: '学校に行きます。', language: 'ja', createdAt: 1 },
        { id: 'my-zh', title: 'My Chinese passage', text: '你好，世界！', language: 'zh', createdAt: 2 },
      ]));
      localStorage.setItem('mochiread:vocab', JSON.stringify([
        { word: '学校', language: 'ja', pinyin: 'がっこう', meanings: ['school'], remembered: 7, forgotten: 2, intervalDays: 12, ease: 2.3, dueAt: 2000 },
        { word: '你好', language: 'zh', pinyin: 'nǐ hǎo', meanings: ['hello'], remembered: 3, forgotten: 1, dueAt: 1000 },
      ]));
      localStorage.setItem('mochiread:prefs:ja', JSON.stringify({ fontSize: 'xl', autoPlay: false }));
      localStorage.setItem('mochiread:prefs:zh', JSON.stringify({ fontSize: 31, autoPlay: false }));
      localStorage.setItem('mochiread:stats:ja', JSON.stringify([{ date: '2026-10-30', wordTaps: 12, secondsRead: 100 }]));
      localStorage.setItem('mochiread:reading:text:ja', '学校に行きます。');
      localStorage.setItem('mochiread:reading:text:zh', '你好，世界！');
      localStorage.setItem('mochiread:reading:page:ja', '0');
    });
    await source.goto(url);
    await source.getByRole('button', { name: 'Choose Japanese', exact: true }).waitFor();
    assert.equal(requests.length, 0, 'The chooser must not download dictionaries');
    await source.getByRole('button', { name: 'Choose Japanese', exact: true }).click();
    await menu(source, 'Backup & restore');
    assert(requests.some((value) => /\/ja-[a-f0-9]+\.json\.gz$/.test(value)));
    assert(!requests.some((value) => /\/zh-[a-f0-9]+\.json\.gz$/.test(value)), 'Japanese must not download Chinese data');
    const [download] = await Promise.all([source.waitForEvent('download'), source.getByRole('button', { name: 'Download backup', exact: true }).click()]);
    const backupText = fs.readFileSync(await download.path(), 'utf8');
    const backup = JSON.parse(backupText);
    assert.equal(backup.format, 'mochiread-backup');
    assert.equal(JSON.parse(backup.data['mochiread:vocab']).find((entry) => entry.language === 'ja').remembered, 7);
    await source.screenshot({ path: path.join(root, 'backup-phone.png') });

    const target = await browser.newPage();
    const targetRequests = [];
    target.on('request', (request) => { if (request.url().includes('/dictionaries/')) targetRequests.push(request.url()); });
    await target.addInitScript(() => {
      localStorage.setItem('mochiread:library', JSON.stringify([{ id: 'old', title: 'Old device text', text: '旧的文本', language: 'zh', createdAt: 1 }]));
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (window.failRestore && key === 'mochiread:vocab') { window.failRestore = false; throw new DOMException('Storage full', 'QuotaExceededError'); }
        return set.call(this, key, value);
      };
    });
    await target.goto(url);
    await target.route('**/dictionaries/zh-*.json.gz', (route) => route.fulfill({ status: 503, body: 'Temporarily unavailable' }));
    await target.getByRole('button', { name: 'Choose Chinese', exact: true }).click();
    await target.getByRole('alert').waitFor();
    assert.equal(JSON.parse((await snapshot(target))['mochiread:library'])[0].id, 'old');
    await target.unroute('**/dictionaries/zh-*.json.gz');
    await target.getByRole('button', { name: 'Choose Chinese', exact: true }).click();
    await menu(target, 'Backup & restore');
    assert(!targetRequests.some((value) => /\/ja-[a-f0-9]+\.json\.gz$/.test(value)), 'Chinese must not download Japanese data');
    const before = await snapshot(target);
    await target.getByLabel('Paste backup JSON', { exact: true }).fill('{"bad":true}');
    await target.getByRole('button', { name: 'Review pasted backup', exact: true }).click();
    await target.getByRole('alert').waitFor();
    assert.deepEqual(await snapshot(target), before, 'Invalid files must not change storage');

    const chooseBackup = async () => {
      const [chooser] = await Promise.all([target.waitForEvent('filechooser'), target.getByRole('button', { name: 'Choose backup file', exact: true }).click()]);
      await chooser.setFiles({ name: 'mochiread-backup.json', mimeType: 'application/json', buffer: Buffer.from(backupText) });
      await target.getByText('Review backup', { exact: true }).waitFor();
    };
    await chooseBackup();
    assert.deepEqual(await snapshot(target), before, 'Preview must not restore anything');
    await target.getByRole('button', { name: 'Cancel restore', exact: true }).click();
    assert.deepEqual(await snapshot(target), before);
    await chooseBackup();
    await target.evaluate(() => { window.failRestore = true; });
    await target.getByRole('button', { name: 'Restore this backup', exact: true }).click();
    await target.getByText(/Your previous data has been restored/).waitFor();
    assert.deepEqual(await snapshot(target), before, 'A failed restore must roll back');
    await target.getByRole('button', { name: 'Restore this backup', exact: true }).click();
    await target.getByLabel('Open menu', { exact: true }).waitFor();
    const after = await snapshot(target);
    assert(!after['mochiread:restore-journal']);
    assert.deepEqual(JSON.parse(after['mochiread:vocab']), JSON.parse(backup.data['mochiread:vocab']));
    assert.equal(JSON.parse(after['mochiread:prefs:zh']).fontSize, 31);
    assert.equal(JSON.parse(after['mochiread:prefs:ja']).fontSize, 'xl');
    assert.equal(after['mochiread:reading:text:ja'], '学校に行きます。');
    await menu(target, 'Library');
    await target.getByText('My Chinese passage', { exact: true }).waitFor();
    assert.equal(await target.getByText('Old device text', { exact: true }).count(), 0);
    assert.equal(await target.getByText('My Japanese passage', { exact: true }).count(), 0);
    await target.getByLabel('Back', { exact: true }).click();
    await menu(target, 'Switch language');
    await target.getByRole('button', { name: 'Choose Japanese', exact: true }).click();
    await menu(target, 'Library');
    await target.getByText('My Japanese passage', { exact: true }).waitFor();

    const recovery = await browser.newPage();
    await recovery.addInitScript(() => {
      const previous = { 'mochiread:library': JSON.stringify([{ id: 'safe', title: 'Before interruption', text: '你好', language: 'zh', createdAt: 1 }]), 'mochiread:vocab': '[]' };
      localStorage.setItem('mochiread:restore-journal', JSON.stringify(previous));
      localStorage.setItem('mochiread:library', JSON.stringify([{ id: 'partial', title: 'Partial restore', text: '错误', language: 'zh', createdAt: 1 }]));
    });
    await recovery.goto(url);
    await recovery.getByRole('button', { name: 'Choose Chinese', exact: true }).click();
    await menu(recovery, 'Library');
    await recovery.getByText('Before interruption', { exact: true }).waitFor();
    assert.equal(await recovery.getByText('Partial restore', { exact: true }).count(), 0);
    assert.equal(await recovery.evaluate(() => localStorage.getItem('mochiread:restore-journal')), null);
    // A failed read must not replace that domain's existing data with defaults.
    for (const failedKey of ['mochiread:library', 'mochiread:vocab', 'mochiread:prefs:zh', 'mochiread:stats:zh', 'mochiread:reading:text:zh']) {
      const blocked = await browser.newPage();
      await blocked.addInitScript((key) => {
        const saved = {
          'mochiread:library': JSON.stringify([{ id: 'safe', title: 'Keep me', text: '你好', language: 'zh', createdAt: 1 }]),
          'mochiread:vocab': JSON.stringify([{ word: '你好', language: 'zh', pinyin: 'nǐ hǎo', meanings: ['hello'], remembered: 7, dueAt: 2000 }]),
          'mochiread:prefs:zh': JSON.stringify({ fontSize: 37 }),
          'mochiread:stats:zh': JSON.stringify([{ date: '2026-10-30', wordTaps: 9, secondsRead: 120 }]),
          'mochiread:reading:text:zh': '这是保存的文章。',
        };
        Object.entries(saved).forEach(([name, value]) => localStorage.setItem(name, value));
        window.expectedSavedValue = saved[key];
        const get = Storage.prototype.getItem;
        window.restoreStorageReads = () => { Storage.prototype.getItem = get; };
        Storage.prototype.getItem = function (name) {
          if (name === key) throw new Error('Simulated storage read failure');
          return get.call(this, name);
        };
      }, failedKey);
      await blocked.goto(url);
      await blocked.getByRole('button', { name: 'Choose Chinese', exact: true }).click();
      await blocked.getByRole('alert').filter({ hasText: 'Couldn’t load saved data' }).waitFor();
      await blocked.waitForTimeout(100);
      assert(await blocked.evaluate((key) => {
        window.restoreStorageReads();
        return localStorage.getItem(key) === window.expectedSavedValue;
      }, failedKey), `Failed read overwrote ${failedKey}`);
      await blocked.getByRole('button', { name: 'Retry loading', exact: true }).click();
      await blocked.getByLabel('Open menu', { exact: true }).waitFor();
      await blocked.close();
    }
    // Returning users must see progress while their remembered dictionary loads.
    const remembered = await browser.newPage();
    await remembered.addInitScript(() => localStorage.setItem('mochiread:preferred-language', 'ja'));
    let releaseManifest;
    const manifestGate = new Promise((resolve) => { releaseManifest = resolve; });
    await remembered.route('**/dictionaries/manifest.json', async (route) => {
      await manifestGate;
      await route.fulfill({ status: 503, body: 'Offline' });
    });
    await remembered.goto(url);
    await remembered.getByText(/Loading Japanese dictionary/).waitFor();
    assert(await remembered.getByRole('button', { name: 'Choose Japanese', exact: true }).isDisabled());
    releaseManifest();
    await remembered.getByRole('alert').waitFor();
    await remembered.unroute('**/dictionaries/manifest.json');
    await remembered.getByRole('button', { name: 'Choose Japanese', exact: true }).click();
    await remembered.getByLabel('Open menu', { exact: true }).waitFor();
    await remembered.close();

    // All persisted domains expose write failures and can retry without reload.
    for (const failedKey of ['mochiread:library', 'mochiread:vocab', 'mochiread:prefs:zh', 'mochiread:stats:zh', 'mochiread:reading:text:zh', 'mochiread:reading:page:zh']) {
      const writable = await browser.newPage();
      await writable.addInitScript((key) => {
        localStorage.setItem('mochiread:library', JSON.stringify([{ id: 'safe', title: 'Keep my text', text: '你好', language: 'zh', createdAt: 1 }]));
        window.failWrites = true;
        const set = Storage.prototype.setItem;
        Storage.prototype.setItem = function (name, value) {
          if (window.failWrites && name === key) { window.failedWriteAttempts = (window.failedWriteAttempts || 0) + 1; throw new DOMException('Storage full', 'QuotaExceededError'); }
          return set.call(this, name, value);
        };
      }, failedKey);
      await writable.goto(url);
      await writable.getByRole('button', { name: 'Choose Chinese', exact: true }).click();
      await writable.getByRole('alert').filter({ hasText: 'Changes couldn’t be saved' }).waitFor();
      await menu(writable, 'Backup & restore');
      // A write failure during startup must not block exporting existing data.
      const [safeDownload] = await Promise.all([writable.waitForEvent('download'), writable.getByRole('button', { name: 'Download backup', exact: true }).click()]);
      const safeBackup = JSON.parse(fs.readFileSync(await safeDownload.path(), 'utf8'));
      assert(JSON.parse(safeBackup.data['mochiread:library']).some((entry) => entry.id === 'safe'));
      const attempts = await writable.evaluate(() => window.failedWriteAttempts);
      await writable.getByRole('button', { name: 'Retry saving', exact: true }).click();
      await writable.waitForFunction((previous) => window.failedWriteAttempts > previous, attempts);
      await writable.getByRole('alert').filter({ hasText: 'Changes couldn’t be saved' }).waitFor();
      await writable.evaluate(() => { window.failWrites = false; });
      await writable.getByRole('button', { name: 'Retry saving', exact: true }).click();
      await writable.getByRole('alert').filter({ hasText: 'Changes couldn’t be saved' }).waitFor({ state: 'detached' });
      assert.notEqual(await writable.evaluate((key) => localStorage.getItem(key), failedKey), null);
      await writable.close();
    }

    const unsaved = await browser.newPage();
    await unsaved.addInitScript(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name, value) {
        if (window.failWrites && name === 'mochiread:library') { window.failedWriteAttempts = (window.failedWriteAttempts || 0) + 1; throw new DOMException('Storage full', 'QuotaExceededError'); }
        return set.call(this, name, value);
      };
    });
    await unsaved.goto(url);
    await unsaved.getByRole('button', { name: 'Choose Chinese', exact: true }).click();
    await unsaved.getByLabel('Open menu', { exact: true }).waitFor();
    await unsaved.evaluate(() => { window.failWrites = true; });
    for (const text of ['这是第一篇文章。', '这是第二篇文章。']) {
      const attempts = await unsaved.evaluate(() => window.failedWriteAttempts || 0);
      await menu(unsaved, 'New text');
      await unsaved.locator('textarea').fill(text);
      await unsaved.getByText('Read', { exact: true }).click();
      await unsaved.waitForFunction((previous) => window.failedWriteAttempts > previous, attempts);
      await unsaved.getByRole('alert').filter({ hasText: 'Changes couldn’t be saved' }).waitFor();
    }
    await unsaved.evaluate(() => { window.failWrites = false; });
    await unsaved.getByRole('button', { name: 'Retry saving', exact: true }).click();
    await unsaved.getByRole('alert').waitFor({ state: 'detached' });
    await unsaved.reload();
    await menu(unsaved, 'Library');
    await unsaved.getByText('这是第一篇文章。', { exact: true }).waitFor();
    await unsaved.getByText('这是第二篇文章。', { exact: true }).waitFor();
    await unsaved.close();

    // A persistent read error still lets users restore a healthy backup.
    const damaged = await browser.newPage();
    await damaged.addInitScript(() => localStorage.setItem('mochiread:prefs:zh', '{broken json'));
    await damaged.goto(url);
    await damaged.getByRole('button', { name: 'Choose Chinese', exact: true }).click();
    await damaged.getByRole('alert').filter({ hasText: 'Couldn’t load saved data' }).waitFor();
    await damaged.getByRole('button', { name: 'Backup & restore', exact: true }).click();
    await damaged.getByLabel('Paste backup JSON', { exact: true }).fill(backupText);
    await damaged.getByRole('button', { name: 'Review pasted backup', exact: true }).click();
    await damaged.getByRole('button', { name: 'Restore this backup', exact: true }).click();
    await damaged.getByLabel('Open menu', { exact: true }).waitFor();
    await menu(damaged, 'Library');
    await damaged.getByText('My Chinese passage', { exact: true }).waitFor();
    await damaged.close();
    const files = fs.readdirSync(path.join(root, '_expo/static/js/web')).filter((file) => file.endsWith('.js'));
    const bytes = files.reduce((total, file) => total + fs.statSync(path.join(root, '_expo/static/js/web', file)).size, 0);
    assert(bytes < 4 * 1024 * 1024, `Initial JavaScript unexpectedly large: ${bytes}`);
    console.log(`PASS: ${(bytes / 1024 / 1024).toFixed(2)} MB initial JS; per-language downloads/retry; backup transfer, validation, preview/cancel, scheduling, rollback, interrupted-restore recovery, failed-read protection, visible loading, save retries and recovery access`);
  } finally { await browser.close(); server.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; server.close(); });
