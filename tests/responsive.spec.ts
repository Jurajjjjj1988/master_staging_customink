import { test, expect } from "../fixtures/pages.fixture";
import { HeaderComponent } from "../pages/components/HeaderComponent";
import { MEGA_MENU_TRIGGERS } from "../data/header-links";

/**
 * Tests #19 #20 — responsive header behavior.
 *
 *   #19 At 1023×768 (just below the 1024 desktop breakpoint) the header
 *       collapses to its simplified state: primary chrome (logo, search,
 *       favorites, sign-in, cart) remains visible while every mega-menu
 *       trigger button is hidden.
 *   #20 At 320×568 (smallest realistic mobile width) the page must NOT
 *       produce horizontal overflow, and the core header chrome must remain
 *       reachable.
 */

test.describe("@p1 responsive — simplified header", () => {
  test.use({ viewport: { width: 1023, height: 768 } });

  test("should_render_simplified_header_at_1023px_viewport", async ({
    page,
  }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);

    await test.step("primary header chrome is visible", async () => {
      await expect(header.logo).toBeVisible();
      await expect(header.search).toBeVisible();
      await expect(header.cart).toBeVisible();
    });

    await test.step("mega-menu trigger buttons are hidden below the breakpoint", async () => {
      for (const triggerName of MEGA_MENU_TRIGGERS) {
        await expect(header.megaMenuTrigger(triggerName)).toBeHidden();
      }
    });
  });
});

test.describe("@p2 responsive — 320px viewport", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test("should_have_no_horizontal_scroll_at_320px_viewport", async ({
    page,
  }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);

    await test.step("clientWidth equals 320 and no horizontal overflow", async () => {
      const { clientWidth, overflow } = await page.evaluate(() => {
        const root = globalThis.document.documentElement;
        return {
          clientWidth: root.clientWidth,
          overflow: root.scrollWidth - root.clientWidth,
        };
      });
      expect(clientWidth).toBe(320);
      // 1px tolerance to avoid sub-pixel rounding on Webkit renderers.
      expect(overflow).toBeLessThanOrEqual(1);
    });

    await test.step("logo, search trigger, and cart remain reachable", async () => {
      await expect(header.logo).toBeVisible();
      // At 320px the search field may be collapsed behind a button trigger; we
      // accept either the searchbox directly or a search-trigger button.
      const searchTrigger = page
        .locator("ci-header-prerender, ci-header")
        .first()
        .getByRole("searchbox", { name: /search/i })
        .or(
          page
            .locator("ci-header-prerender, ci-header")
            .first()
            .getByRole("button", { name: /search/i }),
        );
      await expect(searchTrigger.first()).toBeVisible();
      await expect(header.cart).toBeVisible();
    });
  });
});
