// Run with Node's test runner and Playwright on the module path; see README.md.
// The header's logo and name: in `magpie web` they're shown whatever the
// machine, since a browser tab has no title bar of the app's to show them
// (they were hidden everywhere but a Mac or Linux window); in the Windows
// window they stay hidden, its title bar already has them.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { test } = require("node:test");
const { chromium, webkit } = require("playwright");

const assets = process.env.MAGPIE_BRAND_ASSETS || path.resolve(__dirname, "../assets");
const brandName = process.env.MAGPIE_BRAND_NAME || "tuzi-magpie";

function serve(web) {
  const providers = { providers: [], presets: [], excluded: [], gateway: { running: true, window: true } };
  const state = { agents: [], profiles: [], settings: { lang: "en", theme: "light" } };
  return async (route) => {
    const url = new URL(route.request().url());
    const json = (data) => route.fulfill({ json: data });
    if (url.pathname === "/boot.js") return route.fulfill({ contentType: "text/javascript", body: `window.bootPrefs = {lang:"en",theme:"light",web:${web}};` });
    if (url.pathname === "/wails/runtime.js") return route.fulfill({ contentType: "text/javascript", body: "export const Window = {};" });
    if (url.pathname === "/api/state") return json(state);
    if (url.pathname === "/api/providers") return json(providers);
    if (url.pathname === "/api/groups") return json({ groups: [] });
    if (url.pathname.startsWith("/api/")) return json({});
    const file = path.join(assets, url.pathname === "/" ? "index.html" : url.pathname);
    const contentType = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" }[path.extname(file)];
    await route.fulfill({ body: await fs.readFile(file), contentType });
  };
}

const cases = [
  { web: true, platform: "Win32", shown: true },
  { web: true, platform: "MacIntel", shown: true },
  { web: true, platform: "Linux x86_64", shown: true },
  { web: false, platform: "Win32", shown: false },
  { web: false, platform: "MacIntel", shown: true },
];

for (const engine of (process.env.BROWSER ? [process.env.BROWSER] : ["chromium", "webkit"])) {
  test(`${engine}: the logo and name in the header`, async (t) => {
    const browser = await (engine === "webkit" ? webkit.launch() : chromium.launch({ channel: "chromium" }));
    t.after(() => browser.close());
    // in the header's row, and at the sidebar's top when the window is wide
    for (const width of [860, 1100]) for (const c of cases) {
      const context = await browser.newContext({ viewport: { width, height: 700 }, reducedMotion: "reduce" });
      await context.addInitScript((p) => Object.defineProperty(Navigator.prototype, "platform", { get: () => p }), c.platform);
      const page = await context.newPage();
      page.setDefaultTimeout(5000);
      page.setDefaultNavigationTimeout(60000);
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("**/*", serve(c.web));
      await page.goto("http://magpie.test/");
      await page.waitForSelector("#nav button.on");
      const where = `${c.web ? "web" : "window"} on ${c.platform} at ${width}px`;
      const side = width >= 1024;
      const brand = page.locator(side ? "#side .side-top .brand" : ".top .brand");
      assert.equal(await brand.isVisible(), c.shown, where);
      if (c.shown) {
        assert.ok(await brand.locator(".logo svg").isVisible(), `${where}: logo`);
        // a header short of room keeps the logo only (fitTop's tight)
        const tight = !side && await page.locator(".top.tight").count();
        if (!tight) assert.ok(await brand.getByText(brandName, { exact: true }).isVisible(), `${where}: name`);
        // beside the tabs, not under them; above the sidebar's pages
        const [b, n] = [await brand.boundingBox(), await page.locator("#nav").boundingBox()];
        if (side) assert.ok(b.y + b.height <= n.y, `${where}: ${JSON.stringify(b)} overlaps the pages ${JSON.stringify(n)}`);
        else assert.ok(b.x + b.width <= n.x, `${where}: ${JSON.stringify(b)} overlaps the tabs ${JSON.stringify(n)}`);
      }
      if (process.env.ARTIFACT_DIR && width === 860 && !c.web && c.platform === "MacIntel") {
        await fs.mkdir(process.env.ARTIFACT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.ARTIFACT_DIR, engine + "-native-860.png") });
        const layout = await page.evaluate(() => ({ top: document.querySelector(".top").className,
          brand: document.querySelector(".brand").getBoundingClientRect().toJSON(),
          nav: document.querySelector("#nav").getBoundingClientRect().toJSON() }));
        await fs.writeFile(path.join(process.env.ARTIFACT_DIR, engine + "-native-860.json"), JSON.stringify(layout, null, 2));
      }
      if (brandName === "tuzi-magpie" && !c.web && c.platform === "MacIntel") {
        const account = page.locator('#nav button[data-view="tuzi"]');
        if (side) assert(await account.locator("#tuziNavLabel").isVisible(), "the sidebar retains the full new label");
        else for (const lang of ["en", "zh", "zh-TW", "ja", "de"]) {
          const label = await page.evaluate((lang) => { setLocale(lang); return t("Tuzi account"); }, lang);
          assert(await page.getByRole("button", { name: label, exact: true }).isVisible(), `${lang}: account remains accessible by its translated name`);
          assert.equal(await account.getAttribute("title"), label, `${lang}: translated hover title`);
          assert(!(await account.locator("#tuziNavLabel").isVisible()), `${lang}: only the new header label is hidden`);
          assert(await account.locator(".nav-ic").isVisible(), `${lang}: the new entry keeps its existing icon`);
        }
      }
      assert.deepEqual(errors, [], where);
      await context.close();
    }
  });
}
