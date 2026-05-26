import { test, expect } from "../../fixtures/pages.fixture";
import { TIMEOUTS } from "../../helpers/timeouts";
import { PRODUCT_URLS } from "../../data/products";

/**
 * Header navigation journeys — keyboard skip link, logo→home, mega-menu
 * hover→click→category, mutual exclusivity of open panels.
 */

test.describe("@p1 journey — skip to main content", () => {
  test("keyboard user can skip past the header straight to main content", async ({
    page,
  }) => {
    await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });

    const skipLink = page
      .getByRole("link", { name: /skip to main content/i })
      .first();
    await expect(skipLink).toHaveAttribute("href", /#main-content$/);
    await expect(page.locator("#main-content")).toBeAttached();

    // Skip link is hidden until focus — `.focus()` mirrors the keyboard-only user.
    await skipLink.focus();
    await skipLink.press("Enter");
    await expect(page).toHaveURL(/#main-content/);
  });
});

test.describe("@p1 journey — menu navigation", () => {
  // Mega-menu open uses keyboard activation (focus+Enter) because hover is
  // inert on the condensed-desktop build — see HeaderComponent.openMegaMenu.
  test("user opens a mega-menu and clicks a subcategory to reach the category page", async ({
    page,
    header,
  }) => {
    await page.goto("/");

    const trigger = header.megaMenuTrigger("Custom T-shirts");
    await header.openMegaMenu("Custom T-shirts");
    await expect(trigger).toHaveAttribute("aria-expanded", "true", {
      timeout: TIMEOUTS.QUICK,
    });

    const controls = await trigger.getAttribute("aria-controls");
    expect(controls, "trigger exposes aria-controls").toBeTruthy();
    // Scope to header host — IDs are duplicated across prerender/hydrated
    // header copies on this build (see variant-1-homepage.spec.ts F1-F5).
    const panel = header.root.locator(`#${controls}`).first();

    // Bind to /products/ URL shape, not "any link in the panel" — without
    // this binding the test happily clicks Shop Sale and false-passes.
    // `.filter({ has: ... })` requires the link to have a descendant matching
    // the selector — a link is its own href owner, so use the link locator
    // with an href attribute substring directly.
    const subcategoryLink = panel.locator('a[href*="/products/"]').first();

    await expect(subcategoryLink).toBeVisible({ timeout: TIMEOUTS.QUICK });
    const expectedHref = await subcategoryLink.getAttribute("href");
    expect(expectedHref, "subcategory link has a real href").toBeTruthy();
    const expectedPathname = new URL(expectedHref ?? "/", page.url()).pathname;

    await Promise.all([
      page.waitForURL((u) => u.toString().includes(expectedPathname), {
        timeout: TIMEOUTS.CROSS_DOMAIN,
      }),
      subcategoryLink.click(),
    ]);

    const heading = page.getByRole("heading", { level: 1 });
    const productGrid = page.getByRole("list", { name: /products|results/i });
    await expect(heading.or(productGrid).first()).toBeVisible({
      timeout: TIMEOUTS.ACTION,
    });
  });

  // Activation uses keyboard path — hover is inert on the condensed-desktop
  // build; see HeaderComponent.openMegaMenu for the full investigation.
  test("opening a different mega-menu trigger replaces the open panel", async ({
    page,
    header,
  }) => {
    await page.goto("/");

    const firstTrigger = header.megaMenuTrigger("Custom T-shirts");
    await header.openMegaMenu("Custom T-shirts");
    await expect(firstTrigger).toHaveAttribute("aria-expanded", "true", {
      timeout: TIMEOUTS.QUICK,
    });

    // Only one panel may be open at a time — stacking is both visually
    // broken and a focus-management bug.
    await header.openMegaMenu("Custom Apparel");
    const secondTrigger = header.megaMenuTrigger("Custom Apparel");
    await expect(secondTrigger).toHaveAttribute("aria-expanded", "true", {
      timeout: TIMEOUTS.QUICK,
    });
    await expect(firstTrigger).toHaveAttribute("aria-expanded", "false", {
      timeout: TIMEOUTS.QUICK,
    });
  });
});

test.describe("@p1 journey — logo returns home", () => {
  test("user clicks the logo from a product page and lands on /", async ({
    page,
    header,
  }) => {
    await page.goto(PRODUCT_URLS[0].path, { timeout: TIMEOUTS.NAVIGATION });
    await expect(header.logo).toBeVisible({ timeout: TIMEOUTS.ACTION });
    await header.logo.click();
    await page.waitForURL((url) => new URL(url).pathname === "/", {
      timeout: TIMEOUTS.ACTION,
    });
    expect(new URL(page.url()).pathname).toBe("/");
  });
});
