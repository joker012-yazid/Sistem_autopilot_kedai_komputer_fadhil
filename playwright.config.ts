import { defineConfig, devices } from "@playwright/test";

const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "1";
const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:4000";
const webBaseUrl = process.env.WEB_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  globalSetup: './tests/e2e/global-setup.ts',
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: webBaseUrl,
    trace: "on-first-retry"
  },
  webServer: skipWebServer
    ? undefined
    : [
        {
          command: "corepack pnpm dev:api",
          url: new URL("/health", apiBaseUrl).toString(),
          reuseExistingServer: true,
          timeout: 120_000
        },
        {
          command: "corepack pnpm dev:web",
          url: webBaseUrl,
          reuseExistingServer: true,
          timeout: 120_000
        }
      ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] }
    }
  ]
});

