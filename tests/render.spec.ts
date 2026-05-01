import { test, expect } from "../fixtures/pages.fixture";
import { HeaderComponent } from "../pages/components/HeaderComponent";
import { FooterComponent } from "../pages/components/FooterComponent";
import { PAGES_UNDER_TEST } from "../data/pages-under-test";

/**
 * Test #1 — Cross-page consistency: every page on the site must render
 * the same global header and footer. Catches partial deployments where
 * one route silently breaks the layout.
 */
test.describe("@p1 render — header & footer cross-page consistency", () => {
  for (const pageDef of PAGES_UNDER_TEST) {
    test(`should_render_header_and_footer_on_${pageDef.name}_page`, async ({
      page,
    }) => {
      await test.step(`navigate to ${pageDef.path}`, async () => {
        await page.goto(pageDef.path);
      });

      const header = new HeaderComponent(page);
      const footer = new FooterComponent(page);

      await test.step("header is visible with logo, search, cart", async () => {
        await expect(header.root).toBeVisible();
        await expect(header.logo).toBeVisible();
        await expect(header.search).toBeVisible();
        await expect(header.cart).toBeVisible();
      });

      await test.step("footer is visible with copyright", async () => {
        await expect(footer.root).toBeVisible();
        await expect(footer.copyright).toBeVisible();
      });
    });
  }
});

/**
 * Test #26 — Logo as a "go home" affordance.
 *
 * The logo's primary purpose is to return the user to the homepage from
 * anywhere in the site. We assert the click actually navigates rather than
 * just verifying the href (covered by the link integrity suite).
 */
test.describe("@p1 render — logo navigation", () => {
  test("should_navigate_to_home_when_logo_clicked_from_product_page", async ({
    page,
  }) => {
    await page.goto("/products/t-shirts/4");
    const header = new HeaderComponent(page);
    await header.logo.click();
    await page.waitForURL((url) => new URL(url).pathname === "/", {
      timeout: 10_000,
    });
    expect(new URL(page.url()).pathname).toBe("/");
  });
});
