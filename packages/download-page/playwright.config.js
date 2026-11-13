import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4197", trace: "retain-on-failure" },
  webServer: {
    command: "npm run dev -- --port 4197 --strictPort",
    url: "http://127.0.0.1:4197/tuzi-magpie/",
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        ...(process.env.CHROME_PATH
          ? { launchOptions: { executablePath: process.env.CHROME_PATH } }
          : {}),
      },
    },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
