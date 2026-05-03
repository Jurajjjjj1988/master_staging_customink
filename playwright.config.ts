import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv();

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Local: 2 workers — staging gets unhappy under 4 concurrent sessions.
  // CI: 4 workers (sharded via --shard, so per-shard concurrency is ≤ 4).
  workers: process.env.CI ? 4 : 2,
  reporter: [["html", { open: "never" }], ["list"], ["github"]],
  // Default test timeout (30s) is shorter than navigationTimeout (60s) —
  // raise it to 90s so a slow staging cold-load goto + a few subsequent
  // assertions don't run out of test budget.
  timeout: 90_000,
  use: {
    baseURL: process.env.BASE_URL ?? "https://www-master.staging.customink.com",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    // Bumped from 30s — staging chrome (lazy-hydrating Web Components +
    // marketing CMS) routinely takes 30-45s on cold loads; the previous
    // ceiling was the dominant fail class across the suite.
    navigationTimeout: 60_000,
  },
  projects: [
    {
      // Verifies storage/auth.json is still usable before logged-in tests run.
      // Skips silently when storage/auth.json is absent — the logged-in
      // describe block in user-journeys.spec.ts handles that case itself.
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { storageState: "storage/auth.json" },
    },
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
      // Anonymous user state — exclude logged-in journeys (those run on
      // chromium-desktop-authed with storageState).
      grepInvert: /logged-in user/,
    },
    {
      // Same as chromium-desktop but with the saved auth state attached and
      // gated by the setup project. Use when running logged-in journeys
      // explicitly: `npx playwright test --project=chromium-desktop-authed`.
      name: "chromium-desktop-authed",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        storageState: "storage/auth.json",
      },
      dependencies: ["setup"],
      testMatch: /user-journeys\.spec\.ts/,
      grep: /logged-in user/,
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-safari",
      // iOS user share for apparel e-commerce is meaningful — first-class project
      // rather than a nightly-only afterthought.
      use: { ...devices["iPhone 13"] },
    },
    {
      name: "webkit-desktop",
      use: { ...devices["Desktop Safari"] },
    },
    {
      // Production smoke: same suite, different baseURL. Run with
      // `npm run test:prod-smoke` to validate the suite against
      // production-routed pages (P1 only; gated by tag).
      name: "prod-smoke",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        baseURL: process.env.PROD_URL ?? "https://www.customink.com",
      },
      grep: /@p1/,
    },
  ],
});
