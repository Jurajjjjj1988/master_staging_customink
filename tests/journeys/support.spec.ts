import { test, expect } from "../../fixtures/pages.fixture";
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
      .getByRole("link", { name: /shop sale/i });
    // Promo strip is marketing-rotated (BACKLOG.md #4); when the campaign
    // is not active the CTA is absent. Skip rather than fail — same pattern
    // as variant-1-homepage.spec.ts:71.
    const count = await shopSale.count();
    test.skip(
      count === 0,
      "Promo Shop Sale CTA not active in current marketing rotation",
    );
    await expect(shopSale.first()).toBeVisible({ timeout: TIMEOUTS.ACTION });

    await Promise.all([
      page.waitForURL(/\/products\/(apparel|all-apparel|sale)/i, {
        timeout: TIMEOUTS.CROSS_DOMAIN,
      }),
      shopSale.first().click(),
    ]);
    await expect(page.getByRole("heading").first()).toBeVisible({
      timeout: TIMEOUTS.ACTION,
    });
  });
});

test.describe("@p1 journey — chat now", () => {
  // LiveChat vendor controls iframe visibility timing (BACKLOG.md #5 related)
  test.fixme("clicking Chat Now opens the LiveChat widget", async ({
    page,
  }) => {
    await page.goto("/");

    const chatTrigger = page
      .getByRole("button", { name: /^chat now$/i })
      .first();
    await expect(chatTrigger).toBeVisible();

    // LiveChat ships two iframes: a tiny `chat-widget-minimized` launcher
    // and `iframe#chat-widget` (the real widget, hidden until click).
    // The visibility flip of #chat-widget is the user-perceivable open
    // signal — but it is vendor-controlled and can race the click event
    // (the iframe is sometimes still loading when the click fires).
    // `toPass` retries the whole click→visible sequence so a one-off
    // vendor race doesn't flake the suite (BACKLOG.md #5 related).
    await expect(async () => {
      await chatTrigger.click();
      await expect(page.locator("iframe#chat-widget")).toBeVisible({
        timeout: TIMEOUTS.URL_CHANGE,
      });
    }).toPass({ timeout: TIMEOUTS.LAZY_DOM });
  });
});

test.describe("@p1 journey — favorites (guest)", () => {
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
