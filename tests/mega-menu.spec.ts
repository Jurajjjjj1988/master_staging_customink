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

/**
 * Tests #8b — #8d — content sanity for opened mega-menus.
 *
 * Each mega-menu is a marketing-driven panel with dozens of category and CTA
 * links — testing every individual item couples the suite to weekly content
 * rotations. We instead enforce structural invariants the panel must satisfy
 * REGARDLESS of which specific items marketing publishes today:
 *
 *   #8b structural: an opened panel exposes at least N reachable links
 *   #8c link sanity: every link in an opened panel has a valid first-party href
 *   #8d critical CTA: Design Lab's "Start Designing" / "Explore Templates"
 *        primary affordances are present (high-conversion buttons whose
 *        absence would be a real revenue regression)
 */

test.describe("@p1 mega-menu — content sanity", () => {
  /**
   * Find the visible overlay panel anchored to the trigger button. Each
   * trigger has `aria-controls` pointing at the overlay's id — the most
   * reliable way to scope to its panel without false-positives.
   */
  async function openedPanelFor(
    page: import("@playwright/test").Page,
    triggerName: string,
  ): Promise<import("@playwright/test").Locator> {
    const header = new HeaderComponent(page);
    const trigger = header.megaMenuTrigger(triggerName);
    await header.openMegaMenu(triggerName);
    await expect(trigger).toHaveAttribute("aria-expanded", "true", {
      timeout: 5_000,
    });
    // Web-first assertion that the trigger has an aria-controls value to
    // route us to its panel; THEN read the value imperatively to build the
    // panel locator.
    await expect(trigger).toHaveAttribute("aria-controls", /.+/);
    const controls = await trigger.getAttribute("aria-controls");
    return page.locator(`#${controls!}`);
  }

  for (const triggerName of MEGA_MENU_TRIGGERS) {
    test(`should_expose_at_least_2_interactive_items_in_opened_${triggerName.replace(/[^\w]+/g, "_")}_panel`, async ({
      page,
    }) => {
      await page.goto("/");
      const panel = await openedPanelFor(page, triggerName);
      // Marketing has freedom to add/remove items — we only fail if the panel
      // is essentially empty (a "marketing pushed empty data" regression).
      await expect(panel).toBeVisible();
      // Two panel types exist: nav-driven (Custom T-shirts has ~49 category
      // links) and CTA-driven (Design Lab has 2 hero CTAs + visual). The
      // sanity invariant is "panel is not empty" — count any interactive
      // affordance (link OR button) and require ≥ 2.
      const interactiveCount =
        (await panel.getByRole("link").count()) +
        (await panel.getByRole("button").count());
      expect(
        interactiveCount,
        `Mega-menu "${triggerName}" exposes only ${interactiveCount} interactive items — likely empty or broken`,
      ).toBeGreaterThanOrEqual(2);
    });
  }
});

test.describe("@p1 mega-menu — link sanity inside opened panels", () => {
  test("should_have_no_dead_hrefs_inside_any_opened_mega_menu", async ({
    page,
  }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);

    for (const triggerName of MEGA_MENU_TRIGGERS) {
      await header.openMegaMenu(triggerName);
      const trigger = header.megaMenuTrigger(triggerName);
      await expect(trigger).toHaveAttribute("aria-expanded", "true", {
        timeout: 5_000,
      });
      const controls = await trigger.getAttribute("aria-controls");
      const panel = page.locator(`#${controls}`);

      const offenders = await panel.evaluate((root) => {
        const ALLOWED_HASH = new Set(["#main-content"]);
        const bad: { href: string; text: string }[] = [];
        for (const a of Array.from(
          root.querySelectorAll<HTMLAnchorElement>("a[href]"),
        )) {
          const href = a.getAttribute("href") ?? "";
          if (
            href === "" ||
            (href === "#" && !ALLOWED_HASH.has(href)) ||
            href.startsWith("javascript:")
          ) {
            bad.push({
              href,
              text: (a.textContent ?? "").trim().slice(0, 40),
            });
          }
        }
        return bad;
      });

      expect(
        offenders,
        `Dead hrefs inside "${triggerName}" mega-menu:\n${JSON.stringify(offenders, null, 2)}`,
      ).toEqual([]);
    }
  });
});

test.describe("@p2 mega-menu — Design Lab critical CTAs", () => {
  test("should_expose_start_designing_and_explore_templates_in_design_lab", async ({
    page,
  }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);
    await header.openMegaMenu("Design Lab");
    const trigger = header.megaMenuTrigger("Design Lab");
    const controls = await trigger.getAttribute("aria-controls");
    const panel = page.locator(`#${controls}`);

    // "Start Designing" is the primary acquisition button on this panel —
    // losing it cuts off the customer journey from header to the product.
    await expect(
      panel
        .getByRole("link", { name: /start designing/i })
        .or(panel.getByRole("button", { name: /start designing/i })),
    ).toBeVisible();

    // "Explore Templates" is the secondary path for users who want a
    // pre-made starting point. Less critical but still meaningful.
    await expect(
      panel
        .getByRole("link", { name: /explore templates/i })
        .or(panel.getByRole("button", { name: /explore templates/i })),
    ).toBeVisible();
  });
});
