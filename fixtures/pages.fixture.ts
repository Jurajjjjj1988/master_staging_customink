import { test as base, type Page } from "@playwright/test";

type Fixtures = {
  cookieDismissed: void;
  monitorPageHealth: void;
  authenticated: Page;
};

/**
 * Tunable fixture options. `dismissCookie` defaults to `true` so the cookie
 * banner is gone for every test; cookie-consent tests opt out with
 * `test.use({ dismissCookie: false })`.
 */
type Options = {
  dismissCookie: boolean;
};

/**
 * Console messages we tolerate. Justified entries only — every entry has a reason.
 * Keep this list small; growth signals real bugs we should fix instead of silencing.
 */
const CONSOLE_ALLOWLIST: readonly RegExp[] = [
  // CORS: staging frontend calls production API (www.customink.com) — expected on staging env.
  /Access to fetch at 'https:\/\/www\.customink\.com.*has been blocked by CORS/i,
  /Failed to load resource: net::ERR_FAILED/,
  // Header Web Component swallows the catalog feature-flag fetch failure (downstream of CORS above).
  /Failed to fetch Catalog feature flag/i,
  // Third-party UA-sniff in `ci-header-prerender` accesses `navigator.userAgentData.safari`
  // which is undefined in Chromium 120+. Tracked separately; not a regression introduced here.
  /Cannot read properties of undefined \(reading 'safari'\)/,
  // Optimizely third-party SDK warns about unconfigured feature keys — tracked by marketing, not us.
  /\[OPTIMIZELY\].*ERROR.*Feature key.*is not in datafile/i,
  // Generic 404 console line that always pairs with an actual failedRequest entry — dedup.
  /Failed to load resource: the server responded with a status of 404/i,
];

/**
 * Network requests we tolerate.
 */
const REQUEST_ALLOWLIST: readonly RegExp[] = [
  // Same CORS-blocked production API (network layer surfaces these as failures).
  /https:\/\/www\.customink\.com\/(api|products)\//,
];

/**
 * Uncaught JavaScript exceptions we tolerate. Even higher bar than console errors:
 * pageErrors usually break the page, so every entry here must be a known third-party
 * issue we have decided to live with.
 */
const PAGE_ERROR_ALLOWLIST: readonly RegExp[] = [
  // `ci-header-prerender` calls `navigator.userAgentData.safari` which is undefined
  // in Chromium 120+. Tracked by header team; does not affect rendered output.
  /Cannot read properties of undefined \(reading 'safari'\)/,
  // The search-results page (a separate app) throws ApiError objects from its API
  // client. Out of header/footer scope; tracked by the search team.
  /^ApiError\b/i,
];

const isAllowlistedConsole = (text: string): boolean =>
  CONSOLE_ALLOWLIST.some((re) => re.test(text));
const isAllowlistedRequest = (url: string): boolean =>
  REQUEST_ALLOWLIST.some((re) => re.test(url));
const isAllowlistedPageError = (text: string): boolean =>
  PAGE_ERROR_ALLOWLIST.some((re) => re.test(text));

/**
 * `//:0` is a common React/Next placeholder that resolves to `naturalWidth === 0`
 * but is intentional (used for lazy-loaded `<img>` slots before the real src arrives).
 * Filter these out — they are not regressions.
 */
const isPlaceholderImage = (src: string): boolean =>
  src === "" || src.endsWith("//:0") || src === "data:,";

export const test = base.extend<Fixtures, Options>({
  dismissCookie: [true, { option: true, scope: "worker" }],

  cookieDismissed: [
    async ({ context, dismissCookie }, use) => {
      if (dismissCookie) {
        await context.addCookies([
          {
            name: "OptanonAlertBoxClosed",
            value: new Date().toISOString(),
            domain: ".staging.customink.com",
            path: "/",
          },
        ]);
      }
      await use();
    },
    { auto: true },
  ],

  /**
   * Page-health monitor — auto-applied to every test.
   *
   * Strategy: scope-aware. We FAIL the test only for issues that block the area being
   * tested (uncaught JS exceptions, broken images inside header/footer). Everything
   * else is captured as a structured testInfo annotation so it remains visible in
   * the HTML report without derailing scope-correct tests. This is the right balance
   * for a marketing site where the page body has independent failure modes
   * (e.g. a broken CDN chunk on a product page is a real bug — but not OUR bug).
   */
  monitorPageHealth: [
    async ({ page }, use, testInfo) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const failedRequests: string[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "error" && !isAllowlistedConsole(msg.text())) {
          consoleErrors.push(msg.text());
        }
      });
      page.on("pageerror", (err) => {
        // Some pageErrors come from non-Error throws (e.g. third-party libs throwing
        // plain objects). Compose the most informative string we can so triage is possible.
        const parts = [
          err.name && err.name !== "Error" ? err.name : null,
          err.message,
          err.stack ? err.stack.split("\n").slice(0, 3).join(" | ") : null,
        ].filter(Boolean);
        const text =
          parts.length > 0 ? parts.join(" :: ") : JSON.stringify(err);
        if (!isAllowlistedPageError(text)) {
          pageErrors.push(text);
        }
      });
      page.on("response", (resp) => {
        if (resp.status() >= 400 && !isAllowlistedRequest(resp.url())) {
          failedRequests.push(`${resp.status()} ${resp.url()}`);
        }
      });

      await use();

      // Scope broken-image audit to the header + footer DOM only.
      const brokenImagesInScope = await page.evaluate(() => {
        const scopes = [
          ...document.querySelectorAll("ci-header-prerender"),
          ...document.querySelectorAll('[role="contentinfo"]'),
        ];
        const results: string[] = [];
        for (const scope of scopes) {
          for (const img of scope.querySelectorAll("img")) {
            if (img.complete && img.naturalWidth === 0) {
              results.push(img.src);
            }
          }
        }
        return results;
      });
      const brokenImages = brokenImagesInScope.filter(
        (src) => !isPlaceholderImage(src),
      );

      const allIssues = {
        consoleErrors,
        pageErrors,
        failedRequests,
        brokenImages,
      };
      const hasAnyIssue = Object.values(allIssues).some(
        (arr) => arr.length > 0,
      );
      if (hasAnyIssue) {
        await testInfo.attach("page-health.json", {
          body: JSON.stringify(allIssues, null, 2),
          contentType: "application/json",
        });
      }

      // FAIL only on issues that affect this test's scope (header/footer).
      const fatal = {
        pageErrors,
        brokenImagesInHeaderFooter: brokenImages,
      };
      const isFatal = Object.values(fatal).some((arr) => arr.length > 0);
      if (isFatal) {
        throw new Error(
          `Page health (scoped to header/footer) failed: ${JSON.stringify(fatal)}`,
        );
      }
    },
    { auto: true },
  ],

  authenticated: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: "storage/auth.json",
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect, type Page } from "@playwright/test";
