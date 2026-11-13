const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { test } = require('node:test');
const { chromium, webkit } = require('playwright');
const { serveAnalytics } = require('./analytics-fixture.cjs');
const assets = path.resolve(__dirname, '../assets');
for (const engine of (process.env.BROWSER ? [process.env.BROWSER] : ['chromium', 'webkit'])) {
  test(`${engine}: Chinese analytics, navigation, privacy and operation outcomes`, async t => {
    const browser = await (engine === 'webkit' ? webkit.launch() : chromium.launch({ channel: 'chromium' }));
    t.after(() => browser.close());
    for (const lang of ['zh', 'en', 'zh-TW', 'ja', 'de']) {
      const page = await browser.newPage();
      let sdkLoads = 0, holdSDK, releaseSDK;
      const ready = new Promise(resolve => { holdSDK = resolve; });
      const held = new Promise(resolve => { releaseSDK = resolve; });
      await page.route('**/*', async route => {
        const u = new URL(route.request().url());
        if (u.hostname === 'umami.tu-zi.com') {
          if (u.pathname === '/script.js') { sdkLoads++; holdSDK(); await held; }
          return serveAnalytics(route);
        }
        assert.equal(u.hostname, 'magpie.test');
        if (u.pathname === '/boot.js') return route.fulfill({ contentType: 'text/javascript', body: `window.bootPrefs={lang:${JSON.stringify(lang)},web:true,analytics:{off:false,blocked:false,usageOff:false,version:'v0.1.0-beta.1',os:'darwin'}};` });
        if (u.pathname === '/api/state') return route.fulfill({ json: { agents: [], profiles: [], settings: { lang } } });
        if (u.pathname === '/api/providers') return route.fulfill({ json: { providers: [], presets: [], excluded: [] } });
        if (u.pathname === '/api/usage/quotas') return route.fulfill({ json: [] });
        if (u.pathname.startsWith('/api/')) return route.fulfill({ json: {} });
        try { return await route.fulfill({ body: await fs.readFile(path.join(assets, u.pathname === '/' ? 'index.html' : u.pathname)), contentType: u.pathname.endsWith('.js') ? 'text/javascript' : u.pathname.endsWith('.css') ? 'text/css' : u.pathname === '/' ? 'text/html' : undefined }); } catch { return route.fulfill({ status: 404, body: '' }); }
      });
      await page.goto('http://magpie.test/?view=agents&key=SECRET#PRIVATE', { waitUntil: 'domcontentloaded' });
      await ready;
      await page.evaluate(async () => { await show('providers'); await show('providers'); });
      releaseSDK();
      await page.waitForFunction(() => window.recorded?.length >= 2);
      assert.deepEqual(await page.evaluate(() => recorded.filter(x => !x.name).map(x => x.url)), ['/agents', '/providers']);
      await page.evaluate(async () => {
        await api('agents/connect/codex', {});
        await api('agents/disconnect/omp#PRIVATE', {});
        await tuziAnalytics.operation('添加服务商', async () => ({ existing: true, token: 'SECRET' }), { 入口: '模型市场', token: 'SECRET' });
        try { await tuziAnalytics.operation('创建 API Key', async () => { throw { code: 'outcome_unknown', message: 'SECRET' }; }); } catch {}
        tuziAnalytics.event('查看模型详情', { model: 'SECRET', 错误码: 'SECRET' });
      });
      const events = await page.evaluate(() => recorded);
      assert.equal(events.filter(x => x.name === '接入智能体').length, 2);
      assert.equal(events.find(x => x.name === '断开智能体').data.智能体, '其他');
      assert.equal(events.find(x => x.data.服务商).data.服务商, '复用');
      assert.equal(events.find(x => x.name === '创建 API Key' && x.data.阶段 === '结果').data.结果, '待确认');
      assert(!JSON.stringify(events).includes('SECRET'));
      assert(!JSON.stringify(events).includes('PRIVATE'));
      assert(events.every(x => x.data.版本 === 'v0.1.0-beta.1'));
      assert(events.every(x => x.hostname === 'tuzi-magpie' && x.referrer === '' && x.title));
      const count = events.length;
      await page.evaluate(() => { tuziAnalytics.settings({ noStats: true }); tuziAnalytics.event('查看模型详情'); tuziAnalytics.page('settings'); });
      assert.equal(await page.evaluate(() => recorded.length), count);
      await page.evaluate(() => { tuziAnalytics.settings({ noUsageStats: true }); tuziAnalytics.event('查看模型详情'); tuziAnalytics.page('settings'); });
      assert.equal(await page.evaluate(() => recorded.length), count + 1);
      assert.equal(sdkLoads, 1);
      await page.close();
    }
  });
  test(`${engine}: opt-outs never load SDK and failures preserve business operations`, async t => {
    const browser = await (engine === 'webkit' ? webkit.launch() : chromium.launch({ channel: 'chromium' }));
    t.after(() => browser.close());
    const source = await fs.readFile(path.join(assets, 'plugins/tuzi/analytics.js'), 'utf8');
    for (const condition of ['missing', 'off', 'env', 'dnt', 'panel', 'failure']) {
      const page = await browser.newPage(); let loads = 0;
      await page.route('**/*', route => { if (route.request().url().includes('umami.tu-zi.com')) { loads++; return route.abort(); } return route.fulfill({ contentType: 'text/html', body: '<html><head></head><body></body></html>' }); });
      await page.goto('http://magpie.test/' + (condition === 'panel' ? '?mode=panel' : ''));
      await page.evaluate(c => { window.bootPrefs = c === 'missing' ? {} : { analytics: { off: c === 'off', blocked: c === 'env' } }; if(c === 'dnt') Object.defineProperty(navigator, 'doNotTrack', {value:'1'}); }, condition);
      await page.addScriptTag({ content: source });
      assert.equal(await page.evaluate(async () => { tuziAnalytics.page('agents'); return tuziAnalytics.operation('连接兔子账户', async () => 42); }), 42);
      await page.waitForTimeout(100);
      assert.equal(loads, condition === 'failure' ? 1 : 0, condition);
      await page.close();
    }
  });
}
