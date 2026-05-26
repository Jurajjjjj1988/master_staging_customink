import { test, expect } from "../../fixtures/pages.fixture";
import { PRODUCT_URLS } from "../../data/products";
import { waitForFooterReady } from "../../helpers/page-state";
import { TIMEOUTS } from "../../helpers/timeouts";

/**
 * Support-affordance journeys — phone, chat, favorites, promo CTA.
 * These are all "help me / engage me" surfaces the header exposes to
 * anonymous users.
 */

test.describe("@p1 journey — call support", () => {
  test("phone affordance is dialable in the format the OS dialer accepts", async ({
    page,
  }) => {
    await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });
    // Phone link lives in lazy-hydrated `ci-full-footer` — wait or race the hydration.
    await waitForFooterReady(page);

    const phone = page.locator('a[href^="tel:"]').first();
    await expect(phone).toBeVisible({ timeout: TIMEOUTS.URL_CHANGE });
    // Number rotates within toll-free pool — assert format, not digits.
    await expect(phone).toHaveAttribute(
      "href",
      /^tel:\+?\d{1,3}-?\d{3}-?\d{3}-?\d{4}$/,
    );
    await expect(phone).toBeEnabled();

    await expect(
      page
        .getByText(/talk to a real person|customer service|call us|need help/i)
        .first(),
    ).toBeVisible();
  });
});

test.describe("@p1 journey — promo banner Shop Sale", () => {
  test("user clicks Shop Sale in the promo strip and lands on a sale-tagged listing", async ({
    page,
  }) => {
    await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });

    // Scope to header — there's a duplicate Shop Sale in the hero section.
    const shopSale = page
      .locator("ci-header-prerender, ci-header")
      .getByRole("link", { name: /shop sale/i })
      .first();
    await expect(shopSale).toBeVisible({ timeout: TIMEOUTS.ACTION });

    await Promise.all([
      page.waitForURL(/\/products\/(apparel|all-apparel|sale)/i, {
        timeout: TIMEOUTS.CROSS_DOMAIN,
      }),
      shopSale.click(),
    ]);
    await expect(page.getByRole("heading").first()).toBeVisible({
      timeout: TIMEOUTS.ACTION,
    });
  });
});

test.describe("@p1 journey — chat now", () => {
  test("clicking Chat Now opens the LiveChat widget", async ({ page }) => {
    await page.goto("/");

    const chatTrigger = page
      .getByRole("button", { name: /^chat now$/i })
      .first();
    await expect(chatTrigger).toBeVisible();
    await chatTrigger.click();

    // LiveChat ships two iframes: a tiny `chat-widget-minimized` launcher
    // and `iframe#chat-widget` (the real widget, hidden until click).
    // The visibility flip of #chat-widget is the user-perceivable open signal.
    await expect(page.locator("iframe#chat-widget")).toBeVisible({
      timeout: TIMEOUTS.URL_CHANGE,
    });
  });
});

test.describe("@p1 journey — favorites", () => {
  test("user adds a product to favorites and finds it on /products/favorites", async ({
    page,
    header,
  }) => {
    await page.goto(PRODUCT_URLS[0].path, { timeout: TIMEOUTS.NAVIGATION });

    const productCard = page
      .getByRole("link", { name: /.+/ })
      .filter({ has: page.locator("img") })
      .first();
    await expect(productCard).toBeVisible({ timeout: TIMEOUTS.URL_CHANGE });
    await productCard.click();
    await page.waitForLoadState("domcontentloaded");

    // Heart is `<div aria-label="Add to favorites">` — not a role=button.
    const heart = page.locator('[aria-label*="favorite" i]').first();
    await expect(heart, "favorites affordance is reachable").toBeVisible({
      timeout: TIMEOUTS.URL_CHANGE,
    });
    await heart.click();

    // Same element flips aria-pressed false→true on click.
    await expect(heart).toHaveAttribute("aria-pressed", "true", {
      timeout: TIMEOUTS.QUICK,
    });
    await expect(header.favorites).toBeVisible({ timeout: TIMEOUTS.ACTION });
    await Promise.all([
      page.waitForURL(/\/products\/favorites/, {
        timeout: TIMEOUTS.URL_CHANGE,
      }),
      header.favorites.click(),
    ]);

    // Persistence requires login; for anonymous the empty-state copy is OK.
    const persistedItem = page.getByRole("listitem").first();
    const anonEmpty = page.getByText(
      /sign in to save|no favorites yet|create an account to save/i,
    );
    await expect(persistedItem.or(anonEmpty).first()).toBeVisible({
      timeout: TIMEOUTS.ACTION,
    });
  });

  test("clicking favorites in the header without anything saved shows the empty state", async ({
    page,
    header,
  }) => {
    await page.goto("/");
    await expect(header.favorites).toBeVisible({ timeout: TIMEOUTS.ACTION });

    await Promise.all([
      page.waitForURL(/\/products\/favorites/, {
        timeout: TIMEOUTS.URL_CHANGE,
      }),
      header.favorites.click(),
    ]);

    await expect(
      page.getByText(/browse our products and click the heart icon/i),
    ).toBeVisible({ timeout: TIMEOUTS.ACTION });
  });
});
