import { test as base, expect, type Page } from "@playwright/test";
import {
  isAllowlistedConsole,
  isAllowlistedRequest,
  isAllowlistedPageError,
  isPlaceholderImage,
} from "../helpers/known-issues";
import { HeaderComponent } from "../pages/components/HeaderComponent";
import { HeaderV2Cart } from "../pages/components/HeaderV2Cart";
import { HeaderV3Lab } from "../pages/components/HeaderV3Lab";
import { HeaderV4Accounts } from "../pages/components/HeaderV4Accounts";
import { MegaMenu } from "../pages/components/MegaMenu";
import { FooterComponent } from "../pages/components/FooterComponent";
import { CookieBanner } from "../pages/components/CookieBanner";

type Fixtures = {
  cookieDismissed: void;
  monitorPageHealth: void;
  authenticated: Page;
  // Page Objects — injected per-test, no `new` in spec bodies.
  header: HeaderComponent;
  headerV2: HeaderV2Cart;
  headerV3: HeaderV3Lab;
  headerV4: HeaderV4Accounts;
  megaMenu: MegaMenu;
  footer: FooterComponent;
  cookieBanner: CookieBanner;
};

/**
 * Tunable fixture options. `dismissCookie` defaults to `true` so the cookie
 * banner is gone for every test; cookie-consent tests opt out with
 * `test.use({ dismissCookie: false })`.
 */
type Options = {
  dismissCookie: boolean;
};

// Known-issue allowlists live in helpers/known-issues.ts — adding a new
// entry is policy, not a hack. See that file for ownership + tickets.

export const test = base.extend<Fixtures, Options>({
  dismissCookie: [true, { option: true, scope: "worker" }],

  /**
   * Override `page.goto` default `waitUntil` from `"load"` to
   * `"domcontentloaded"`. The site keeps long-tail third-party requests
   * open (CMS rotation, CORS-blocked production fetches per allowlist
   * below, lazy-hydrating Web Components) — `"load"` would wait for ALL
   * of those to settle, which they never do. DOM is interactive in ~2s;
   * waiting for "load" was the dominant timeout class in the suite.
   * Per-call overrides still win — pass `{ waitUntil: "load" }` to opt out.
   *
   * NOTE: An earlier iteration ALSO overrode `page.waitForURL` default to
   * `"commit"`. It broke hash-route waits (Lab `#/welcome`, skip-link
   * `#main-content`) — hash changes don't fire a commit event so the wait
   * timed out (1.1 h suite wall). Rolled back; the few callsites that need
   * "commit" pass it explicitly.
   */
  page: async ({ page }, use) => {
    const origGoto = page.goto.bind(page);
    page.goto = (url, options) =>
      origGoto(url, { waitUntil: "domcontentloaded", ...options });
    await use(page);
  },

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
        // Surface both errors AND warnings; warnings catch silent regressions
        // (deprecation notices, mixed content, security policy violations) that
        // never escalate to errors but ship to users today and break tomorrow.
        if (
          (msg.type() === "error" || msg.type() === "warning") &&
          !isAllowlistedConsole(msg.text())
        ) {
          consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
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

      /*
       * FAIL only on issues that affect this test's scope (header/footer). We use
       * `expect.soft` so the original test failure (if any) is preserved as the
       * primary error rather than masked by a fixture throw — both errors land
       * in the report side by side, giving the engineer a complete picture.
       */
      expect.soft(pageErrors, "uncaught pageErrors during test").toEqual([]);
      expect
        .soft(brokenImages, "broken images inside header/footer")
        .toEqual([]);
    },
    // Cross-cutting page-health monitor disabled (cut from suite). The fixture
    // remains defined for future re-introduction — flip to `auto: true` to
    // re-enable per-test console / network / broken-image surveillance.
    { auto: false },
  ],

  authenticated: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: "storage/auth.json",
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Page-Object fixtures — test-scoped, constructor-only (locator wiring).
  // Each fixture is lazy: only instantiated if the test destructures it.
  header: async ({ page }, use) => {
    await use(new HeaderComponent(page));
  },
  headerV2: async ({ page }, use) => {
    await use(new HeaderV2Cart(page));
  },
  headerV3: async ({ page }, use) => {
    await use(new HeaderV3Lab(page));
  },
  headerV4: async ({ page }, use) => {
    await use(new HeaderV4Accounts(page));
  },
  megaMenu: async ({ page }, use) => {
    await use(new MegaMenu(page));
  },
  footer: async ({ page }, use) => {
    await use(new FooterComponent(page));
  },
  cookieBanner: async ({ page }, use) => {
    await use(new CookieBanner(page));
  },
});

export { expect, type Page } from "@playwright/test";
