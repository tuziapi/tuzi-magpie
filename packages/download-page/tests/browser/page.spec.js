import { test, expect } from "@playwright/test";
import {
  formats,
  fromGithub,
  assetUrl,
  releasesUrl,
} from "../../src/release.js";
const tag = "v1.2.3";
const manifest = fromGithub({
  tag_name: tag,
  draft: false,
  prerelease: false,
  published_at: "2026-11-01T00:00:00Z",
  html_url: `${releasesUrl}/tag/${tag}`,
  assets: formats.map((f) => ({
    name: `tuzi-magpie-${tag}-${f.suffix}`,
    state: "uploaded",
    size: 1234,
    digest: `sha256:${"a".repeat(64)}`,
    browser_download_url: assetUrl(tag, `tuzi-magpie-${tag}-${f.suffix}`),
  })),
});
// All network remains local; synthetic release metadata is only a test fixture,
// never copied into public/ or used by production builds.
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  await page.route("**/release.json", (route) =>
    route.fulfill({ json: manifest }),
  );
});
for (const width of [390, 1440])
  test(`layout, themes, screenshots, six packages and keyboard at ${width}px`, async ({
    page,
    browserName,
  }, info) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() =>
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 Windows NT 10.0",
        configurable: true,
      }),
    );
    await page.goto("/tuzi-magpie/");
    await expect(page.getByText(`${tag} · 正式版本`)).toBeVisible();
    await expect(page.locator(".download-button")).toHaveAttribute(
      "href",
      assetUrl(tag, `tuzi-magpie-${tag}-windows-amd64-setup.exe`),
    );
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    for (const label of ["模型目录", "服务商配置", "兔子账户"]) {
      const button = page.getByRole("button", { name: label, exact: true });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator(".screen-image img")).toHaveJSProperty(
        "naturalWidth",
        1200,
      );
    }
    const theme = page.getByRole("button", { name: /主题：/ });
    await theme.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await theme.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.screenshot({
      path: `test-results/${info.project.name}-${width}-dark.png`,
      fullPage: true,
    });
    await theme.click();
    await theme.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    for (const platform of ["macos", "windows", "linux"]) {
      await page
        .getByRole("button", {
          name: { macos: "macOS", windows: "Windows", linux: "Linux" }[
            platform
          ],
          exact: true,
        })
        .click();
      const defaultSuffix = {
        macos: "macos-arm64.dmg",
        windows: "windows-amd64-setup.exe",
        linux: "linux-amd64.deb",
      }[platform];
      await expect(page.locator(".download-button")).toHaveAttribute(
        "href",
        assetUrl(tag, `tuzi-magpie-${tag}-${defaultSuffix}`),
      );
      await expect(
        page.locator('.architectures [aria-pressed="true"]'),
      ).toHaveCount(1);
      for (const f of formats.filter((f) => f.platform === platform)) {
        await page
          .getByRole("button", { name: `${f.label} ${f.format}`, exact: true })
          .click();
        await expect(page.locator(".download-button")).toHaveAttribute(
          "href",
          assetUrl(tag, `tuzi-magpie-${tag}-${f.suffix}`),
        );
      }
    }
    await page.locator(".checksum summary").click();
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (value) => {
            window.testCopied = value;
          },
        },
      });
    });
    await page
      .getByRole("button", { name: "复制 SHA-256", exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText("SHA-256 已复制");
    expect(await page.evaluate(() => window.testCopied)).toBe("a".repeat(64));
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw Error("denied");
          },
        },
      });
    });
    await page
      .getByRole("button", { name: "复制 SHA-256", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("复制失败");
    await page
      .locator(".questions summary")
      .filter({ hasText: "需要兔子账户才能使用吗？" })
      .click();
    await expect(
      page.getByText("页面浏览和下载无需登录。", { exact: false }),
    ).toBeVisible();
    await page.goto("/tuzi-magpie/");
    // WebKit on macOS uses Option-Tab to include links in keyboard navigation.
    await page.keyboard.press(
      browserName === "webkit" && process.platform === "darwin"
        ? "Alt+Tab"
        : "Tab",
    );
    await expect(
      page.getByRole("link", { name: "跳到下载区域" }),
    ).toBeFocused();
    expect(
      await page
        .getByRole("link", { name: "跳到下载区域" })
        .evaluate((e) => getComputedStyle(e).outlineStyle),
    ).toBe("solid");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#downloads$/);
    await page.screenshot({
      path: `test-results/${info.project.name}-${width}-downloads.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
test("metadata HTTP failure, malformed data, retry and no unsafe download link", async ({
  page,
}) => {
  await page.route("**/release.json", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.goto("/tuzi-magpie/");
  await expect(page.getByRole("alert")).toContainText("暂时无法读取");
  await expect(page.locator("a.download-button")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "打开正式 Releases ↗" }),
  ).toHaveAttribute("href", releasesUrl);
  await page.route("**/release.json", (route) =>
    route.fulfill({ json: { ...manifest, repository: "yetone/magpie" } }),
  );
  await page.getByRole("button", { name: "重试加载" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.route("**/release.json", (route) =>
    route.fulfill({ json: manifest }),
  );
  await page.getByRole("button", { name: "重试加载" }).click();
  await expect(page.getByText(`${tag} · 正式版本`)).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("native Chromium clipboard receives the checksum", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "WebKit clipboard permission is tested via success/failure adapters above",
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/tuzi-magpie/");
  await page.getByRole("button", { name: "macOS", exact: true }).click();
  await page
    .getByRole("button", { name: "Apple Silicon DMG", exact: true })
    .press("Enter");
  await page.locator(".checksum summary").click();
  await page.getByRole("button", { name: "复制 SHA-256", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("a".repeat(64));
});

test("smallest mobile and tablet widths do not overflow", async ({ page }) => {
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/tuzi-magpie/");
    await page.getByRole("button", { name: "Windows", exact: true }).click();
    await page
      .getByRole("button", { name: "ARM64 便携版 ZIP", exact: true })
      .press("Space");
    await expect(page.locator(".download-button")).toHaveAttribute(
      "href",
      /windows-arm64-portable.zip$/,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});

test("Magpie branding and platform installation commands, including clipboard errors", async ({
  page,
}) => {
  await page.goto("/tuzi-magpie/");
  await expect(page.locator(".brand img")).toHaveAttribute(
    "src",
    "/tuzi-magpie/magpie.png",
  );
  await expect(page.locator("link[rel=icon]")).toHaveAttribute(
    "href",
    "/tuzi-magpie/magpie.png",
  );
  await expect(page.locator('img[src$="rabbit.png"]')).toHaveCount(0);
  for (const [platform, name, filename, prefix] of [
    ["macos", "macOS", "install.sh", "curl -fsSL"],
    ["windows", "Windows", "install.ps1", "irm"],
    ["linux", "Linux", "install.sh", "curl -fsSL"],
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    const command = page.locator(".install-command code");
    await expect(command).toContainText(
      prefix +
        " https://raw.githubusercontent.com/tuziapi/tuzi-magpie/main/scripts/tuzi-magpie/" +
        filename,
    );
    await expect(
      page.getByRole("link", { name: "查看安装脚本 ↗" }),
    ).toHaveAttribute(
      "href",
      "https://raw.githubusercontent.com/tuziapi/tuzi-magpie/main/scripts/tuzi-magpie/" +
        filename,
    );
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (value) => {
            window.testCopied = value;
          },
        },
      });
    });
    await page.getByRole("button", { name: "复制命令", exact: true }).click();
    await expect(page.locator(".install-command [role=status]")).toHaveText(
      "安装命令已复制",
    );
    expect(await page.evaluate(() => window.testCopied)).toBe(
      await command.textContent(),
    );
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw Error("denied");
          },
        },
      });
    });
    await page.getByRole("button", { name: "复制命令", exact: true }).click();
    await expect(page.locator(".install-command [role=status]")).toContainText(
      "复制失败",
    );
  }
});
