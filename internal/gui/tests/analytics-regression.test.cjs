const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { test } = require('node:test');
const { chromium, webkit } = require('playwright');

for (const engine of (process.env.BROWSER ? [process.env.BROWSER] : ['chromium', 'webkit'])) {
  test(`${engine}: queued page visits survive usage opt-out`, async t => {
    const browser = await (engine === 'webkit' ? webkit.launch() : chromium.launch({ channel: 'chromium' }));
    t.after(() => browser.close());
    for (const initialUsageOff of [false, true]) {
      const page = await browser.newPage(), sent = [];
      let release, loaded;
      const held = new Promise(r => { release = r; });
      const requested = new Promise(r => { loaded = r; });
      t.after(release);
      const sdk = await fs.readFile(path.resolve(__dirname, '../testdata/umami/script.js'), 'utf8');
      await page.route('**/*', async route => {
        const u = new URL(route.request().url());
        if (u.hostname === 'umami.tu-zi.com' && u.pathname === '/script.js') {
          loaded(); await held;
          return route.fulfill({ contentType: 'text/javascript', body: sdk, headers: { 'Access-Control-Allow-Origin': '*' } });
        }
        if (u.hostname === 'umami.tu-zi.com' && u.pathname === '/api/send') {
          if (route.request().method() === 'POST') sent.push(route.request().postDataJSON().payload);
          return route.fulfill({ json: { cache: 'fixture' }, headers: { 'Access-Control-Allow-Origin': '*' } });
        }
        assert.equal(u.hostname, 'magpie.test');
        return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' });
      });
      await page.goto('http://magpie.test/?key=SECRET');
      await page.evaluate(usageOff => { window.bootPrefs = { analytics: { off: false, usageOff } }; }, initialUsageOff);
      await page.addScriptTag({ content: await fs.readFile(path.resolve(__dirname, '../assets/plugins/tuzi/analytics.js'), 'utf8') });
      await page.evaluate(() => { tuziAnalytics.page('agents'); tuziAnalytics.event('查看模型详情'); });
      await requested;
      await page.evaluate(() => {
        tuziAnalytics.settings({ noUsageStats: true });
        tuziAnalytics.settings({ noUsageStats: true });
        tuziAnalytics.page('agents');
      });
      release();
      await page.waitForFunction(() => !!window.umami);
      // Await a marker request: the earlier queued page flush has already called track.
      await page.evaluate(() => umami.track({ website: 'b2aa6cf4-3b4e-4e7a-bfd7-b5e675a975e4', url: '/settings' }));
      assert.deepEqual(sent.filter(p => p.url !== '/settings').map(p => ({ url: p.url, name: p.name })), [{ url: '/agents', name: undefined }]);
      assert(!JSON.stringify(sent).includes('SECRET'));
      await page.close();
    }
  });
  test(`${engine}: backend uncertain writes retain their outcome and original error`, async t => {
    const browser = await (engine === 'webkit' ? webkit.launch() : chromium.launch({ channel: 'chromium' }));
    t.after(() => browser.close());
    const page = await browser.newPage();
    await page.route('**/*', r => r.fulfill({ contentType: 'text/html', body: '<html></html>' }));
    await page.goto('http://magpie.test/');
    await page.evaluate(() => { window.bootPrefs = { analytics: { off: false } }; window.sent = []; window.umami = { track(p) { const clean = tuziAnalyticsBeforeSend('event', p); if (clean) sent.push(clean); } }; });
    await page.addScriptTag({ content: await fs.readFile(path.resolve(__dirname, '../assets/plugins/tuzi/analytics.js'), 'utf8') });
    const result = await page.evaluate(async () => {
      let preserved = true;
      for (const error of [{ code: 'invalid_response', outcomeUnknown: true }, { code: 'storage_failed', outcomeUnknown: true }, { code: 'invalid_token', outcomeUnknown: false }]) {
        try { await tuziAnalytics.operation('创建 API Key', async () => { throw error; }); } catch (caught) { preserved &&= caught === error; }
      }
      return { preserved, results: sent.filter(p => p.data.阶段 === '结果').map(p => p.data.结果) };
    });
    assert.equal(result.preserved, true);
    assert.deepEqual(result.results, ['待确认', '待确认', '失败']);
  });
  test(`${engine}: a changed remote SDK is rejected without blocking business operations`, async t => {
    const browser = await (engine === 'webkit' ? webkit.launch() : chromium.launch({ channel: 'chromium' }));
    t.after(() => browser.close());
    const page = await browser.newPage();
    await page.route('**/*', r => r.fulfill(r.request().url().includes('umami.tu-zi.com')
      ? { contentType: 'text/javascript', body: 'window.unexpectedSDK = true;', headers: { 'Access-Control-Allow-Origin': '*' } }
      : { contentType: 'text/html', body: '<html></html>' }));
    await page.goto('http://magpie.test/');
    await page.evaluate(() => { window.bootPrefs = { analytics: { off: false } }; });
    await page.addScriptTag({ content: await fs.readFile(path.resolve(__dirname, '../assets/plugins/tuzi/analytics.js'), 'utf8') });
    const result = await page.evaluate(async () => {
      const outcome = new Promise(resolve => {
        for (const name of ['load', 'error']) document.addEventListener(name, e => {
          if (e.target.src === 'https://umami.tu-zi.com/script.js') resolve(name);
        }, true);
      });
      tuziAnalytics.page('agents');
      const event = await outcome;
      return { event, executed: !!window.unexpectedSDK, value: await tuziAnalytics.operation('连接兔子账户', async () => 42) };
    });
    assert.deepEqual(result, { event: 'error', executed: false, value: 42 });
  });

}
