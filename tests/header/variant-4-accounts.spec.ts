import { existsSync } from "node:fs";
import { test, expect } from "../../fixtures/pages.fixture";
import { TIMEOUTS } from "../../helpers/timeouts";

/**
 * Variant 4 — Accounts header (logged-in). Doc §4.
 * Identity overlay swap vs V1: Sign In → My Account, D2 dropdown, cart count badge.
 *
 * Whole file skips if storage/auth.json is absent. Tests that require deeper
 * auth state (creds Test123 known unverified per doc §4.7) use `test.fixme`
 * to keep the spec executable as documentation.
 */

const AUTH_STATE_PATH = "storage/auth.json";
const hasAuthState = existsSync(AUTH_STATE_PATH);

test.describe("@p1 V4 Accounts header — logged-in chrome", () => {
  test.skip(
    !hasAuthState,
    `Skipping V4 tests: ${AUTH_STATE_PATH} not present.`,
  );
  test.setTimeout(90_000);

  test.beforeEach(async ({ page, headerV4 }) => {
    await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });
    // Fail fast at auth gate — if session expired, every downstream assertion
    // would fail with a misleading reason ("My Account button missing")
    // instead of the real one ("not logged in").
    await expect(
      headerV4.signInLink,
      "auth.json present but Sign In link visible — session expired",
    ).toBeHidden({ timeout: TIMEOUTS.ACTION });
    await expect(
      headerV4.accountMenuButton.first(),
      "auth.json present but no My Account button — session expired",
    ).toBeVisible({ timeout: TIMEOUTS.ACTION });
  });

  // V4.2 / V4.7 assertions below require an ACTIVE logged-in session, not
  // just storage/auth.json file presence. Doc §4.7 documents that test
  // credentials (Test123) fail to authenticate. Mark fixme until valid
  // creds land — the spec stays as executable documentation.
  //
  // Probe 2026-05-26: cookie-only mock (setting
  // `profiles-spa-client.*.is.authenticated=true` on .staging.customink.com)
  // does NOT swap header chrome on /, /products/clothes, or /ndx. Tried
  // three candidate names (no-segment / .staging / .production) and three
  // routes — Sign In link stayed visible in every combination. Rails Devise
  // / profiles-spa-client validates the session server-side, so a client-
  // side cookie alone cannot fake auth. A UI-only fixture is therefore not
  // viable; unblock requires a real session (working staging creds or a
  // shared service-account auth.json).

  test.fixme("V4.2 element #11 overlay — Sign In link replaced by My Account link", async ({
    headerV4,
  }) => {
    await expect(headerV4.signInLink).toHaveCount(0);
    await expect(headerV4.myAccountLink.first()).toBeVisible({
      timeout: TIMEOUTS.ACTION,
    });
    await expect(headerV4.myAccountLink.first()).toHaveAttribute(
      "data-testid",
      "my-account",
    );
  });

  test.fixme("V4.2 element #12 overlay — Open My Account menu button present", async ({
    headerV4,
  }) => {
    await expect(headerV4.openMyAccountMenuButton.first()).toBeVisible({
      timeout: TIMEOUTS.ACTION,
    });
  });

  test.fixme("V4.2 element #10 overlay — Favorites heart points at /account/favorites (NOT /products/favorites)", async ({
    headerV4,
  }) => {
    // Doc §4.3.1: account-scoped href. Test marked fixme — staging probe
    // could not reliably attach logged-in state to favorites observation.
    const href = await headerV4.favoritesAccountScoped.getAttribute("href");
    expect(href).toMatch(/\/account\/favorites/);
  });

  test.fixme("V4.4 D2 dropdown — opens with 9 documented items", async ({
    page,
    headerV4,
  }) => {
    // Doc §4.4.1: D2 has 9 items. Stencil hover + <ci-cart> pointer intercept
    // blocks reliable synthetic-event open. Real-mouse works — automation skip.
    await headerV4.openAccountDropdown();
    const items = page
      .locator('[role="menu"]')
      .filter({ hasText: /my designs|sign out/i })
      .getByRole("link");
    await expect(items).toHaveCount(9);
  });
});

test.describe("@p2 V4.7 Edge cases — testid recycling (no auth required)", () => {
  // Doc §4.7 bod 1: data-testid="my-account" is recycled across auth states
  // (Sign In link in guest, My Account link in logged-in). This invariant is
  // observable in BOTH states — no auth gate needed here.
  test('data-testid="my-account" exists in DOM (shared across guest + logged-in)', async ({
    page,
  }) => {
    await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });
    // Mobile + desktop slots may both carry the testid (doc §1.7 bod 6).
    await page
      .getByTestId("my-account")
      .first()
      .waitFor({ state: "attached", timeout: TIMEOUTS.HYDRATION });
  });
});
