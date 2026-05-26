import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv();

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Staging is intermittent (A/B routing, lazy hydration races, intermittent CMS).
  // 1 local retry catches the common single-flake class without masking real bugs.
  retries: process.env.CI ? 2 : 1,
  // Local: 2 workers — staging gets unhappy under 3+ concurrent sessions
  // (verified empirically — 3 workers shaved wall time 39% but tripled the
  // flake rate by triggering per-IP request budget throttling). 2 = baseline
  // known-good. CI stays at 4 (sharded via --shard, so per-shard concurrency
  // is ≤ 4 against a different CI IP).
  workers: process.env.CI ? 4 : 2,
  reporter: [["html", { open: "never" }], ["list"], ["github"]],
  // Default 30s test timeout is shorter than navigationTimeout (60s) — bump
  // to 60s so a slow staging cold-load goto + a few subsequent assertions
  // don't run out of test budget. Tests with deep journeys (cart positive,
  // mega-menu) override per-describe to 90s.
  timeout: 60_000,
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
      // describe block in journeys/logged-in.spec.ts handles that case itself.
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
      // Auth-gated tests live in `tests/journeys/logged-in.spec.ts` (the
      // theme file after the user-journeys monolith split). Strict match
      // by path + describe-block name.
      testMatch: /journeys\/logged-in\.spec\.ts/,
      grep: /logged-in user/,
    },
    // Mobile (Pixel 5 / iPhone 13) and webkit-desktop projects intentionally
    // omitted: the suite has no mobile-specific assertions yet (no hamburger
    // drawer journey, no responsive-breakpoint differences). Re-add when a
    // first mobile-perceivable journey lands; running desktop tests on a
    // smaller viewport without different selectors would be vanity coverage.
    {
      // Production smoke: header chrome + journey health-checks against prod.
      // Excludes staging-specific surfaces (Lab redirect / Optimizely cookie
      // bucketing / WCAG axe sweep which expects staging build) and the
      // variant specs that mostly contain documented-gap markers and add
      // noise on a healthy production baseline. Scope = "is the header
      // rendering and clickable on prod?".
      name: "prod-smoke",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        baseURL: process.env.PROD_URL ?? "https://www.customink.com",
      },
      grep: /@p1/,
      testIgnore: [
        /header\/accessibility\.spec\.ts/,
        /header\/feature-flags\.spec\.ts/,
        /header\/variant-0-common\.spec\.ts/,
        /header\/variant-2-cart\.spec\.ts/,
        /header\/variant-3-lab\.spec\.ts/,
        /header\/variant-4-accounts\.spec\.ts/,
        /journeys\/logged-in\.spec\.ts/,
      ],
    },
  ],
});
