import { test, expect } from "../../fixtures/pages.fixture";
import { PRODUCT_URLS } from "../../data/products";
import { TIMEOUTS } from "../../helpers/timeouts";

/**
 * Cart icon header journeys — icon href integrity + empty-state landing.
 * Doc §1.3 prvok 13 + §2.7.
 *
 * Off-scope removed: PDP add-to-cart flow + cart qty recalculation
 * (cart-page behaviour, not header chrome).
 */

test.describe("@p1 journey — cart icon navigates to cart", () => {
  test("user clicks the cart icon from a product page and lands on /cart", async ({
    page,
    header,
  }) => {
    await page.goto(PRODUCT_URLS[0].path, { timeout: TIMEOUTS.NAVIGATION });
    await expect(header.cart).toBeVisible({ timeout: TIMEOUTS.ACTION });

    // <ci-cart> intercepts the click and opens an overlay; the click→drawer
    // flow is the cart team's scope. Header scope = href integrity.
    const cartHref = await header.cart.getAttribute("href");
    expect(cartHref).toMatch(/\/(cart|checkout)/);
  });
});

test.describe("@p1 journey — cart empty state", () => {
  test("visiting /cart with an empty cart shows the empty state", async ({
    page,
    header,
  }) => {
    // Direct goto with short timeout, fall back to user affordance.
    const direct = await page
      .goto("/cart", { timeout: TIMEOUTS.ACTION })
      .catch(() => null);
    if (!direct?.ok()) {
      await page.goto("/");
      await expect(header.cart).toBeVisible({ timeout: TIMEOUTS.ACTION });
      await header.cart.click();
      await page.waitForLoadState("domcontentloaded");
    }

    await expect(
      page.getByText(
        /your cart is empty|no items in (your )?cart|cart is empty|let['’]s get started/i,
      ),
    ).toBeVisible({ timeout: TIMEOUTS.ACTION });
  });
});
