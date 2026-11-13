// Serve the reviewed SDK without reaching Umami. Keep the production integrity
// check active, and observe its actual before-send callback for synchronous assertions.
const fs = require('node:fs/promises');
const path = require('node:path');
async function serveAnalytics(route, record = 'recorded') {
  const url = new URL(route.request().url());
  if (url.hostname !== 'umami.tu-zi.com') return false;
  if (url.pathname === '/script.js') {
    await route.request().frame().page().evaluate(key => {
      window[key] = [];
      const before = window.tuziAnalyticsBeforeSend;
      window.tuziAnalyticsBeforeSend = (type, payload) => {
        const clean = before(type, payload);
        if (clean) window[key].push(clean);
        return clean;
      };
    }, record);
    await route.fulfill({ contentType: 'text/javascript', body: await fs.readFile(path.resolve(__dirname, '../testdata/umami/script.js')), headers: { 'Access-Control-Allow-Origin': '*' } });
  } else if (url.pathname === '/api/send') {
    await route.fulfill({ json: { cache: 'fixture' }, headers: { 'Access-Control-Allow-Origin': '*' } });
  } else {
    throw new Error('Unexpected analytics fixture path: ' + url.pathname);
  }
  return true;
}
module.exports = { serveAnalytics };
