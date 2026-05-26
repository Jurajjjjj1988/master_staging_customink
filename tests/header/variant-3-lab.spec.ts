import { test, expect } from "../../fixtures/pages.fixture";
import { TIMEOUTS } from "../../helpers/timeouts";

/**
 * Variant 3 — Design Lab header. Doc §3.
 * Chrome diff vs V1: `<ci-header simple="true">` task-mode. Search, 5 mega-menus,
 * promo strip, Favorites all suppressed. Adds My Designs / Untitled / Help / Sign In buttons.
 */

test.describe("@p1 V3.1 Identification — /lab redirects to /ndx", () => {
  test.beforeEach(async ({ page }) => {
    // Shared Lab landing: hit /lab and wait for the /ndx redirect chain
    // before each spec exercises its own assertion. Extracting this here
    // removes 2x duplicated lines per test in this describe.
    await page.goto("/lab", { timeout: TIMEOUTS.NAVIGATION });
    await page.waitForURL(/\/ndx|#\/welcome/i, {
      timeout: TIMEOUTS.URL_CHANGE,
    });
  });

  test("anonymous user landing on /lab is redirected to a /ndx route", async ({
    page,
  }) => {
    // /lab is the entry — Lab serves the actual surface under /ndx hash routes.
    expect(page.url()).toMatch(/\/ndx|#\/welcome/i);
  });

  test('host element <ci-header> carries simple="true"', async ({
    headerV3,
  }) => {
    await headerV3.root
      .first()
      .waitFor({ state: "attached", timeout: TIMEOUTS.HYDRATION });
    expect(await headerV3.isSimpleMode()).toBe(true);
  });
});

test.describe("@p1 V3.2 Functional spec — suppressed elements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/lab", { timeout: TIMEOUTS.NAVIGATION });
    await page.waitForURL(/\/ndx|#\/welcome/i, {
      timeout: TIMEOUTS.URL_CHANGE,
    });
  });

  test("search field is suppressed (role=searchbox not present)", async ({
    headerV3,
  }) => {
    await headerV3.root
      .first()
      .waitFor({ state: "attached", timeout: TIMEOUTS.HYDRATION });
    await expect(headerV3.search).toHaveCount(0);
  });

  test("Favorites heart is absent in V3", async ({ headerV3 }) => {
    await headerV3.root
      .first()
      .waitFor({ state: "attached", timeout: TIMEOUTS.HYDRATION });
    await expect(headerV3.favorites).toHaveCount(0);
  });

  test("Mega-menu triggers are suppressed in V3", async ({ headerV3 }) => {
    await headerV3.root
      .first()
      .waitFor({ state: "attached", timeout: TIMEOUTS.HYDRATION });
    // All 5 mega-menu trigger buttons should be gone.
    const triggers = [
      "Custom T-shirts",
      "Custom Apparel",
      "Promotional Products",
      "Design Lab",
      "Groups & Events",
    ];
    for (const name of triggers) {
      await expect(headerV3.megaMenuTrigger(name)).toHaveCount(0);
    }
  });
});

test.describe("@p1 V3.2 Functional spec — Lab-specific buttons", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/lab", { timeout: TIMEOUTS.NAVIGATION });
    await page.waitForURL(/\/ndx|#\/welcome/i, {
      timeout: TIMEOUTS.URL_CHANGE,
    });
  });

  test("My Designs button is visible", async ({ headerV3 }) => {
    await expect(headerV3.myDesignsButton.first()).toBeVisible({
      timeout: TIMEOUTS.HYDRATION,
    });
  });

  test("Untitled design (rename) button is visible", async ({ headerV3 }) => {
    await expect(headerV3.untitledDesignButton.first()).toBeVisible({
      timeout: TIMEOUTS.HYDRATION,
    });
  });

  test("Sign In is a BUTTON (NOT a link) in V3 — opens window.open new tab", async ({
    headerV3,
  }) => {
    // Doc §3.2 distinguishing marker: in V3 the Sign In affordance is a
    // <button> (opens new tab via window.open), unlike V1 which is a <link>.
    await expect(headerV3.signInButton.first()).toBeVisible({
      timeout: TIMEOUTS.HYDRATION,
    });
    // The V1 anonymous link must NOT be present (it was the link variant).
    await expect(headerV3.signInLink).toHaveCount(0);
  });
});

test.describe("@p2 V3.7 Edge cases", () => {
  test("Lab /ndx final URL carries EU=true&SK&PK staging-injected params", async ({
    page,
  }) => {
    /*
     * Doc §3.7 bod 3 originally flagged ?EU=true as an undocumented flag.
     * Probed 2026-05-26 on www-master.staging — observed behaviour:
     *
     *   1. /lab            → /ndx/?EU=true&SK=176100&PK=176100#/welcome
     *   2. /lab?EU=true    → /ndx/?EU=true&SK=176100&PK=176100#/welcomeBack
     *   3. /lab?BOGUS=x    → /ndx/?EU=true&SK=176100&PK=176100#/welcomeBack  (custom params STRIPPED)
     *
     * Conclusion: EU=true is NOT a user-controlled flag on staging — the
     * redirect chain always injects EU=true + SK + PK regardless of input.
     * The original assertion (URL contains EU=true) is still observable and
     * meaningful (it would catch a future change where staging stops auto-
     * injecting), so we un-skip and run it. The fragment moves to
     * #/welcomeBack when any query string is present, which is unrelated
     * to EU but observed for completeness.
     *
     * If a real EU-pricing flow ever lands, this test should be expanded to
     * assert UI signals (currency, VAT, region banner) — none of which were
     * observable in the probe.
     */
    await page.goto("/lab?EU=true", { timeout: TIMEOUTS.NAVIGATION });
    await page.waitForURL(/\/ndx|#\/welcome/i, {
      timeout: TIMEOUTS.URL_CHANGE,
    });
    expect(page.url()).toMatch(/EU=true/);
    // Bundled staging-injected params travel together — assert all three so
    // the test fails loudly if staging drops the redirect bundle.
    expect(page.url()).toMatch(/SK=\d+/);
    expect(page.url()).toMatch(/PK=\d+/);
  });
});
