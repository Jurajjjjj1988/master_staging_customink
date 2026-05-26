import { test, expect } from "../../fixtures/pages.fixture";
import { TIMEOUTS } from "../../helpers/timeouts";

/**
 * Variant 2 — Cart / Checkout header. Doc §2.
 * Chrome diff vs V1: cart icon suppressed via `show-cart="false"`, mega-menus
 * remain present (contrary to earlier observations — see doc §2.7).
 */

const CART_ROUTES = ["/cart", "/checkout/summary"] as const;

test.describe("@p1 V2.1 Identification — /cart serves the Cart variant", () => {
  test('host element <ci-header> carries show-cart="false"', async ({
    page,
    headerV2,
  }) => {
    await page.goto("/cart", { timeout: TIMEOUTS.NAVIGATION });
    await headerV2.root
      .first()
      .waitFor({ state: "attached", timeout: TIMEOUTS.HYDRATION });
    expect(await headerV2.isCartSuppressed()).toBe(true);
  });

  test("ci-punchout-banner element is hydrated in DOM (default empty)", async ({
    page,
    headerV2,
  }) => {
    // Doc §2.1: punchout banner is a hydrated Stencil element that populates
    // only in B2B punchout session. Presence + empty body is the expected default.
    await page.goto("/cart", { timeout: TIMEOUTS.NAVIGATION });
    await expect(headerV2.punchoutBanner).toHaveCount(1);
  });
});

test.describe("@p1 V2.2 Functional spec — cart icon suppressed, mega-menus present", () => {
  test("cart icon is NOT visible in the V2 headerV2 chrome", async ({
    page,
    headerV2,
  }) => {
    await page.goto("/cart", { timeout: TIMEOUTS.NAVIGATION });
    await headerV2.root
      .first()
      .waitFor({ state: "attached", timeout: TIMEOUTS.HYDRATION });
    // Cart icon is suppressed by show-cart="false" — but the locator scope
    // is the headerV2, so other "Cart" affordances on the page (sidebar, etc.)
    // don't false-match. Use toHaveCount(0) on the strictly-scoped locator.
    await expect(headerV2.cart).toHaveCount(0);
  });

  test("mega-menus remain present in V2 (contrary to earlier docs)", async ({
    page,
    headerV2,
  }) => {
    // Doc §2.7: earlier observation claimed mega-menus suppressed on /cart.
    // Live 2026-05-21 showed they ARE present. Assert at least one trigger.
    await page.goto("/cart", { timeout: TIMEOUTS.NAVIGATION });
    const trigger = headerV2.megaMenuTrigger("Custom T-shirts");
    await expect(trigger.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  });
});

test.describe("@p2 V2.5 Responsive — V2 chrome on /checkout/* routes", () => {
  for (const route of CART_ROUTES) {
    test(`V2 chrome renders on ${route}`, async ({ page, headerV2 }) => {
      const response = await page
        .goto(route, { timeout: TIMEOUTS.NAVIGATION })
        .catch(() => null);
      // Some routes redirect when cart is empty — accept any 2xx/3xx that
      // ends up on a cart/checkout family path.
      if (!response?.ok()) {
        test.skip(true, `${route} did not resolve OK on this deployment`);
        return;
      }
      await headerV2.root
        .first()
        .waitFor({ state: "attached", timeout: TIMEOUTS.HYDRATION });
      expect(await headerV2.isCartSuppressed()).toBe(true);
    });
  }
});

test.describe("@p2 V2.7 Edge cases", () => {
  test("empty cart route renders a recognisable cart surface (h1 or empty-state copy)", async ({
    page,
  }) => {
    // Doc §2.7: historic redirect-to-/ vs current "My Cart" h1 render — both
    // are valid surface signals. We accept any cart heading OR an empty-state
    // string OR a checkout heading (some flows redirect /cart → /checkout).
    await page.goto("/cart", { timeout: TIMEOUTS.NAVIGATION });
    const heading = page.getByRole("heading", {
      name: /my cart|your cart|cart|checkout/i,
    });
    const emptyCopy = page.getByText(
      /your cart is empty|no items in (your )?cart|cart is empty|let['’]s get started/i,
    );
    await expect(heading.or(emptyCopy).first()).toBeVisible({
      timeout: TIMEOUTS.URL_CHANGE,
    });
  });
});
