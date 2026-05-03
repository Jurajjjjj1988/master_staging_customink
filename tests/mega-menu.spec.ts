import { test, expect } from "../fixtures/pages.fixture";
import { HeaderComponent } from "../pages/components/HeaderComponent";
import { MEGA_MENU_TRIGGERS } from "../data/header-links";

/**
 * Test #8 — mega-menu hover. Each of the 5 primary nav buttons must open its
 * mega-menu on hover. Triggers are data-driven; one failed trigger localizes
 * the bug to a single nav item.
 *
 * Known issue: the homepage `ci-header-prerender` Web Component sometimes
 * hydrates without mega-menu items after a hard reload (OQ-1 in spec). Tests
 * are run on the homepage where the mega-menu is most reliably present.
 */
test.describe("@p1 mega-menu — hover open", () => {
  for (const triggerName of MEGA_MENU_TRIGGERS) {
    test(`should_open_mega_menu_when_hovering_${triggerName.replace(/[^\w]+/g, "_")}`, async ({
      page,
    }) => {
      await page.goto("/");
      const header = new HeaderComponent(page);
      const trigger = header.megaMenuTrigger(triggerName);

      await expect(trigger).toBeVisible({ timeout: 10_000 });
      await header.openMegaMenu(triggerName);
      await expect(trigger).toHaveAttribute("aria-expanded", "true", {
        timeout: 5_000,
      });
    });
  }
});
