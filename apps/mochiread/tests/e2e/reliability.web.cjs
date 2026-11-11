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
  const edit = async (page, text) => { await menu(page, 'New text'); await page.locator('textarea').fill(text); await page.getByText('Read', { exact: true }).click(); };
  try {
    const context = await browser.newContext();
    const a = await context.newPage();
    await a.goto(url);
    await a.getByRole('button', { name: 'Choose Chinese', exact: true }).click();
    await a.getByLabel('Open menu', { exact: true }).waitFor();
    const b = await context.newPage();
    await b.goto(url);
    await b.getByLabel('Open menu', { exact: true }).waitFor();
    await edit(a, '第一篇独有文章。');
    await a.waitForFunction(() => JSON.parse(localStorage.getItem('mochiread:library')).some(entry => entry.text === '第一篇独有文章。'));
    await edit(b, '第二篇独有文章。');
    await b.getByRole('alert').filter({ hasText: 'changed in another tab' }).waitFor();
    let texts = await b.evaluate(() => JSON.parse(localStorage.getItem('mochiread:library')).map(entry => entry.text));
    assert(texts.includes('第一篇独有文章。'));
    assert(!texts.includes('第二篇独有文章。'));
    await b.getByRole('button', { name: 'Retry saving', exact: true }).click();
    await b.getByRole('alert').filter({ hasText: 'changed in another tab' }).waitFor();
    assert(await b.evaluate(() => JSON.parse(localStorage.getItem('mochiread:library')).some(entry => entry.text === '第一篇独有文章。')));
    await context.close();

    const words = await browser.newContext();
    await words.addInitScript(() => {
      if (localStorage.getItem('word-test')) return;
      localStorage.setItem('word-test', '1');
      localStorage.setItem('mochiread:prefs:zh', JSON.stringify({ autoPlay: false }));
      localStorage.setItem('mochiread:reading:text:zh', '学校。你好。');
    });
    const first = await words.newPage();
    await first.goto(url);
    await first.getByRole('button', { name: 'Choose Chinese', exact: true }).click();
    await first.getByLabel('Open menu', { exact: true }).waitFor();
    const second = await words.newPage();
    await second.goto(url);
    await second.getByLabel('Open menu', { exact: true }).waitFor();
    await first.getByRole('button', { name: '学校', exact: true }).click();
    await first.getByLabel('Save word', { exact: true }).click({ force: true });
    await first.waitForFunction(() => JSON.parse(localStorage.getItem('mochiread:vocab')).some(word => word.word === '学校'));
    await second.getByRole('button', { name: '你好', exact: true }).click();
    await second.getByLabel('Save word', { exact: true }).click({ force: true });
    await second.getByRole('alert').filter({ hasText: 'changed in another tab' }).waitFor();
    assert.deepEqual(await second.evaluate(() => JSON.parse(localStorage.getItem('mochiread:vocab')).map(word => word.word)), ['学校']);
    await words.close();

    const page = await browser.newPage();
    await page.addInitScript(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (window.failSaves && key === 'mochiread:library') { window.failedWriteAttempts = (window.failedWriteAttempts || 0) + 1; throw new DOMException('Full', 'QuotaExceededError'); }
        return set.call(this, key, value);
      };
    });
    await page.goto(url);
    await page.getByRole('button', { name: 'Choose Chinese', exact: true }).click();
    await page.getByLabel('Open menu', { exact: true }).waitFor();
    await page.evaluate(() => { window.failSaves = true; });
    for (const text of ['这是第一篇尚未保存的文章。', '这是第二篇尚未保存的文章。']) {
      const attempts = await page.evaluate(() => window.failedWriteAttempts || 0);
      await edit(page, text);
      await page.waitForFunction((previous) => window.failedWriteAttempts > previous, attempts);
      await page.getByRole('alert').filter({ hasText: 'Changes couldn’t be saved' }).waitFor();
    }
    assert(await page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }), 'Unsaved changes must install a tab-close/reload guard');
    const unloadDialog = page.waitForEvent('dialog');
    const reload = page.reload().catch(() => null);
    const dialog = await unloadDialog;
    assert.equal(dialog.type(), 'beforeunload');
    await dialog.dismiss();
    await reload;
    await page.getByLabel('Open menu', { exact: true }).waitFor();
    await menu(page, 'Switch language');
    await page.getByText('Unsaved changes', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
    await menu(page, 'Backup & restore');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download backup', exact: true }).click()]);
    const backup = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    texts = JSON.parse(backup.data['mochiread:library']).map(entry => entry.text);
    assert(texts.includes('这是第一篇尚未保存的文章。') && texts.includes('这是第二篇尚未保存的文章。'));
    await page.getByText(/including unsaved changes from this tab/).waitFor();
    assert(!await page.evaluate(() => JSON.parse(localStorage.getItem('mochiread:library') || '[]').some(entry => entry.text === '这是第一篇尚未保存的文章。')), 'Export must work even when persistence still fails');
    await page.getByLabel('Back', { exact: true }).click();
    await menu(page, 'Switch language');
    await page.getByText('Unsaved changes', { exact: true }).waitFor();
    await page.evaluate(() => { window.failSaves = false; });
    await page.getByRole('button', { name: 'Save and switch', exact: true }).click();
    await page.getByRole('button', { name: 'Choose Chinese', exact: true }).click();
    await menu(page, 'Library');
    await page.getByText('这是第一篇尚未保存的文章。', { exact: true }).waitFor();
    await page.getByText('这是第二篇尚未保存的文章。', { exact: true }).waitFor();
    await page.getByLabel('Back', { exact: true }).click();
    await page.evaluate(() => { window.failSaves = true; });
    await edit(page, '这是明确放弃的文章。');
    await page.getByRole('alert').filter({ hasText: 'Changes couldn’t be saved' }).waitFor();
    await menu(page, 'Switch language');
    await page.getByRole('button', { name: 'Discard changes and switch', exact: true }).click();
    await page.evaluate(() => { window.failSaves = false; });
    await page.getByRole('button', { name: 'Choose Chinese', exact: true }).click();
    await menu(page, 'Library');
    assert.equal(await page.getByText('这是明确放弃的文章。', { exact: true }).count(), 0);
    await page.close();
    console.log('PASS: cross-tab library/vocabulary conflicts, latest-draft backup during quota failure, tab-close guard, keep/save/discard language switching.');
  } finally { await browser.close(); server.closeAllConnections(); server.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; server.closeAllConnections(); server.close(); });
