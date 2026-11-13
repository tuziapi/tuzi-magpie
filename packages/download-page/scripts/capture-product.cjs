// Real application assets, synthetic data only. Reuses the MIT-licensed fixture
// from internal/gui/tests/tuzi-account.test.cjs (Copyright 2026 yetone).
const fs = require("node:fs/promises");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "../../..");
(async () => {
  const testPath = path.join(root, "internal/gui/tests/tuzi-account.test.cjs");
  const text = await fs.readFile(testPath, "utf8");
  const start = text.indexOf("const key =");
  const end = text.indexOf("async function click(");
  assert.ok(start > 0 && end > start, "fixture boundaries remain available");
  const sandbox = {
    fs,
    path,
    assert,
    URL,
    structuredClone,
    assets: path.join(root, "internal/gui/assets"),
  };
  vm.createContext(sandbox);
  vm.runInContext(
    text.slice(start, end) + "\nthis.makeFixture = fixture;",
    sandbox,
  );
  const fixture = sandbox.makeFixture("zh", "light");
  fixture.setState({
    status: "connected",
    generation: 1,
    identity: {
      userId: "7",
      username: "demo",
      displayName: "演示账户（合成）",
      connectionId: "synthetic",
    },
    error: null,
  });
  const browser = await chromium.launch(
    process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  );
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 800 },
      locale: "zh-CN",
      reducedMotion: "reduce",
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.host !== "magpie.test")
        return route.fulfill({
          status: 403,
          body: "No external requests in screenshot fixture",
        });
      if (url.pathname === "/api/providers")
        return route.fulfill({
          json: {
            providers: [
              [
                "tuzi-demo",
                "兔子 Coding · 演示",
                "tuzi-rabbit",
                "https://example.invalid/coding",
                "gpt-demo",
              ],
              [
                "openai-demo",
                "OpenAI · 演示",
                "openai",
                "https://example.invalid/v1",
                "gpt-demo",
              ],
              [
                "anthropic-demo",
                "Anthropic · 演示",
                "claude-color",
                "https://example.invalid",
                "claude-demo",
              ],
            ].map(([id, name, icon, chat, model]) => ({
              id,
              name,
              icon,
              chat,
              host: "example.invalid",
              key: { set: true, masked: "•••• 演示" },
              models: [{ id: model, name: model, on: true }],
              agents: [],
              keyList: [],
              fallback: [],
              headers: {},
            })),
            presets: [],
            excluded: [],
            discovered: [],
            gateway: {
              running: false,
              window: true,
              mine: true,
              url: "http://127.0.0.1:18343",
              calls: [],
              groups: [],
            },
          },
        });
      return fixture.handler(route);
    });
    await page.goto("http://magpie.test/?view=tuzi");
    await page.locator(".tuzi-metrics").waitFor();
    await page.evaluate(() => document.fonts.ready);
    const output = path.join(__dirname, "../public/screenshots");
    await fs.mkdir(output, { recursive: true });
    await page.screenshot({ path: path.join(output, "account.png") });
    const title = await page.evaluate(() => t("Model marketplace"));
    await page.getByRole("tab", { name: title, exact: true }).click();
    await page.locator(".tuzi-model").waitFor();
    await page.screenshot({ path: path.join(output, "models.png") });
    await page.goto("http://magpie.test/?view=providers");
    await page.getByText("兔子 Coding · 演示", { exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(output, "providers.png") });
    assert.deepEqual(errors, []);
    console.log(
      "Captured 3 real UI screenshots with isolated synthetic data; no runtime errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
