import { test, expect } from "../fixtures/pages.fixture";
import { FooterComponent } from "../pages/components/FooterComponent";
import { PAGES_UNDER_TEST } from "../data/pages-under-test";

/**
 * Test #1 — Cross-page consistency: every page on the site must render
 * the same global header and footer. Catches partial deployments where
 * one route silently breaks the layout.
 */
test.describe("@p1 render — header & footer cross-page consistency", () => {
  for (const pageDef of PAGES_UNDER_TEST) {
    test(`header and footer render on the ${pageDef.name} page`, async ({
      page,
      header,
    }) => {
      await test.step(`navigate to ${pageDef.path}`, async () => {
        await page.goto(pageDef.path);
      });

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

// Logo-as-go-home journey relocated to `tests/user-journeys.spec.ts`
// ("@p1 journey — logo returns home") so all header user-journeys live in
// one file as a behavioral spec.
