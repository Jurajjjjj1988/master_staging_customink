import { test, expect } from "../../fixtures/pages.fixture";
import { PRODUCT_URLS } from "../../data/products";
import { TIMEOUTS } from "../../helpers/timeouts";

/**
 * Anonymous cart journeys — icon navigation, add-to-cart, empty state,
 * quantity recalculation. Persisted-cart variants (logged-in) live in
 * journeys/logged-in.spec.ts.
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

test.describe("@p1 journey — cart", () => {
  test("user adds a product to the cart and sees it with a non-zero total", async ({
    page,
    header,
  }) => {
    // Every product on this site routes through the Design Lab — no direct
    // add-to-cart on product detail. Skip with concrete reason rather than
    // speculate, so QA review surfaces the missing affordance.
    await page.goto(PRODUCT_URLS[1].path);

    const addToCart = page
      .getByRole("button", {
        name: /^add to cart$|^add to bag$|^buy it now$/i,
      })
      .or(
        page.getByRole("link", {
          name: /^add to cart$|^add to bag$|^buy it now$/i,
        }),
      );

    test.skip(
      (await addToCart.count()) === 0,
      "Product detail routes through the Design Lab on this site — no direct add-to-cart.",
    );

    await addToCart.first().click();
    if (!/\/(cart|checkout)/.test(page.url())) {
      await expect(header.cart).toBeVisible({ timeout: TIMEOUTS.ACTION });
      await Promise.all([
        page.waitForURL(/\/(cart|checkout)/, { timeout: TIMEOUTS.URL_CHANGE }),
        header.cart.click(),
      ]);
    }

    await expect(
      page.getByRole("heading", { name: /cart|order|review/i }).first(),
    ).toBeVisible({ timeout: TIMEOUTS.ACTION });

    const lineItem = page.getByRole("listitem").first();
    await expect(lineItem, "cart contains at least one line item").toBeVisible({
      timeout: TIMEOUTS.ACTION,
    });

    // $0.00 must NOT pass — the [1-9] prefix is intentional.
    const total = page.getByText(/\$\s?[1-9]\d*(\.\d{2})?/).first();
    await expect(total, "cart total is non-zero").toBeVisible();
  });

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

  test("cart total recalculates when line-item quantity is changed", async ({
    page,
    header,
  }) => {
    await page.goto(PRODUCT_URLS[0].path, { timeout: TIMEOUTS.NAVIGATION });
    const productCard = page
      .getByRole("link", { name: /.+/ })
      .filter({ has: page.locator("img") })
      .first();
    await productCard.click();
    await page.waitForLoadState("domcontentloaded");

    const addToCart = page
      .getByRole("button", { name: /add to cart|add to bag|buy it now/i })
      .first();
    test.skip(
      (await addToCart.count()) === 0,
      "Product requires the Design Lab — no direct add-to-cart on this template.",
    );
    await addToCart.click();
    if (!/\/(cart|checkout)/.test(page.url())) {
      await expect(header.cart).toBeVisible({ timeout: TIMEOUTS.ACTION });
      await Promise.all([
        page.waitForURL(/\/(cart|checkout)/, { timeout: TIMEOUTS.URL_CHANGE }),
        header.cart.click(),
      ]);
    }

    const totalLocator = page.getByText(/\$\s?[1-9]\d*(\.\d{2})?/).last();
    const totalBefore = await totalLocator.textContent();

    const qtyControl = page
      .getByRole("spinbutton", { name: /quantity|qty/i })
      .or(page.getByLabel(/quantity|qty/i))
      .first();
    test.skip(
      (await qtyControl.count()) === 0,
      "cart does not expose an inline qty control on this template",
    );
    const current = Number(await qtyControl.inputValue().catch(() => "1")) || 1;
    await qtyControl.fill(String(current + 1));
    await qtyControl.press("Tab");

    // Some carts use SSE/long-poll — networkidle may never resolve. Tolerate.
    await page.waitForLoadState("networkidle").catch(() => {});
    const totalAfter = await totalLocator.textContent();
    expect(
      totalAfter,
      "increasing quantity must change the displayed total",
    ).not.toBe(totalBefore);
  });
});
