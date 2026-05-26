import { test, expect } from "../../fixtures/pages.fixture";
import { BREAKPOINTS } from "../../data/breakpoints";
import { TIMEOUTS } from "../../helpers/timeouts";

/**
 * Responsive breakpoint sweep across all variants. Doc §X.5.
 * Hard breakpoint at 1024 px (mobile/desktop swap). Tablet edge at 1023 px is
 * still mobile chrome; 1024 px is first desktop. Data table drives each
 * viewport assertion — extend by adding to `data/breakpoints.ts`.
 */

for (const bp of BREAKPOINTS) {
  test.describe(`@p1 V1.5 Responsive — ${bp.name} (${bp.viewport.width}×${bp.viewport.height})`, () => {
    test.use({ viewport: bp.viewport });

    test(`homepage renders ${bp.expectedChrome} chrome`, async ({
      page,
      header,
    }) => {
      await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });
      await header.root
        .first()
        .waitFor({ state: "attached", timeout: TIMEOUTS.HYDRATION });
      // Settle viewport-driven CSS — responsive media-query reflow happens
      // ~one frame after hydration. requestAnimationFrame ×2 is the
      // deterministic next-paint signal.
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );

      // Visibility-by-count: locator filtered by :visible pseudo. Resolves to
      // 1 when the hamburger is rendered visibly, 0 when hidden via CSS
      // (display:none / visibility:hidden at this breakpoint). Single
      // `toHaveCount` assertion keeps the test linear (no conditional
      // toBeVisible / toBeHidden branch).
      //
      // Tablet-edge (1023 px) on cold loads can take longer than the default
      // assertion window for the media query to flip after RAF×2 settles —
      // `toPass` graceful retry inside the test absorbs that without
      // depending on Playwright's retry budget.
      const visibleHamburger = page.locator("#menuButton:visible");
      await expect(async () => {
        await expect(
          visibleHamburger,
          `hamburger at ${bp.viewport.width}px — expected ${bp.expectedHamburger ? "visible" : "hidden"}`,
        ).toHaveCount(bp.expectedHamburger ? 1 : 0);
      }).toPass({ timeout: TIMEOUTS.LAZY_DOM });
    });

    // Visibility check only — the trigger button itself, not its expanded
    // panel. Opening the panel is a separate concern (covered in V1.4 tests
    // via the keyboard-activation path; hover is inert on this build, see
    // HeaderComponent.openMegaMenu).
    test(`mega-menus ${bp.expectedMegaMenus ? "are" : "are NOT"} visible`, async ({
      page,
      header,
    }) => {
      await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });
      await header.root
        .first()
        .waitFor({ state: "attached", timeout: TIMEOUTS.HYDRATION });
      // Next-paint sync — responsive media query applies one frame after hydration.
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );

      // Trigger lives inside `<ci-navigation>` shadow DOM, so a top-document
      // `querySelectorAll` would miss it; Playwright's `getByRole` pierces
      // shadow roots. DOM duplicates the trigger across mobile/desktop slots
      // (doc §1.7 #6) — `.first()` collapses to the canonical one.
      // `expect.poll` absorbs the late-hydration race at desktop breakpoints
      // without a hard wait (the underlying lazy Web Component sometimes
      // boots one or two paints after the `attached` signal).
      const trigger = page
        .getByRole("button", { name: /Open Custom T-shirts menu/i })
        .first();
      await expect
        .poll(async () => trigger.isVisible().catch(() => false), {
          message: `mega-menu trigger at ${bp.viewport.width}px — expected ${bp.expectedMegaMenus ? "visible" : "hidden"}`,
          timeout: TIMEOUTS.LAZY_DOM,
        })
        .toBe(bp.expectedMegaMenus);
    });
  });
}

test.describe("@p1 V1.5 Sticky behaviour — header is NOT sticky", () => {
  // Doc §1.1: computed `position: relative` at all scroll-Y; no fixed/sticky.
  test("header position remains relative across scroll positions", async ({
    page,
    header,
  }) => {
    await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });
    await header.root
      .first()
      .waitFor({ state: "attached", timeout: TIMEOUTS.HYDRATION });

    const samplePositions = [0, 500, 1500];
    for (const y of samplePositions) {
      await page.evaluate((scrollY) => globalThis.scrollTo(0, scrollY), y);
      const position = await header.root
        .first()
        .evaluate((el) => globalThis.getComputedStyle(el).position);
      // Either relative or static (the host element + its parent both qualify
      // as non-sticky). Catch the regression where CSS adds position: sticky.
      expect(position, `scroll-Y ${y}: header must not be sticky`).not.toMatch(
        /sticky|fixed/,
      );
    }
  });
});
