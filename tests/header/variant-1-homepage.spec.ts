import { test, expect } from "../../fixtures/pages.fixture";
import { HEADER_V1_ELEMENTS } from "../../data/header-elements-v1";
import { FLYOUTS_V1, DROPDOWNS_V1 } from "../../data/flyouts-v1";
import { TIMEOUTS } from "../../helpers/timeouts";

/**
 * Variant 1 — Homepage header (anonymous). Doc §1.
 *
 * Coverage map:
 *   §1.1 Identifikácia variantu      → covered indirectly via §1.2 + §1.7 probes
 *   §1.2 Funkčná špec (16 prvkov)    → V1.2 — data-driven per element
 *   §1.3 Behaviorálna špec           → covered by tests/journeys/* (user behaviour layer)
 *   §1.4 Flyouts + dropdowns         → V1.4 — F1-F5 count + first/last href
 *   §1.5 Responzívne                  → covered by tests/header/responsive.spec.ts
 *   §1.6 Stavy a podmienky            → covered by tests/header/feature-flags.spec.ts
 *   §1.7 Edge cases                   → V1.7 — known regressions + open questions
 */

test.describe("@p1 V1.2 Functional spec — element inventory (16 elements)", () => {
  // Filter to elements visible on desktop in anonymous (guest) state.
  // Element #14 (Promo "Shop Sale") is marketing-rotated — handled below as
  // a soft check rather than failing when marketing rotation hides it.
  const desktopVisible = HEADER_V1_ELEMENTS.filter(
    (el) =>
      el.visibility !== "mobile" &&
      el.visibility !== "tab-focus-only" &&
      el.num !== 14,
  );

  for (const el of desktopVisible) {
    test(`#${el.num} ${el.name} renders with correct role + accessible name`, async ({
      page,
      header,
    }) => {
      await page.goto("/");
      await expect(header.root.first()).toBeVisible({
        timeout: TIMEOUTS.HYDRATION,
      });

      // Build the locator from declarative metadata. Element entries have
      // either a `role` (most) or a raw `selector` (e.g. #menuButton).
      const elWithRole = el as typeof el & {
        role?: string;
        selector?: string;
        accessibleName?: RegExp;
      };
      let locator;
      if (elWithRole.role && elWithRole.accessibleName) {
        locator = header.root.getByRole(
          elWithRole.role as Parameters<typeof header.root.getByRole>[0],
          { name: elWithRole.accessibleName },
        );
      } else if (elWithRole.selector) {
        locator = page.locator(elWithRole.selector);
      } else {
        throw new Error(`Element #${el.num} has no role or selector`);
      }

      await expect(locator.first()).toBeVisible({ timeout: TIMEOUTS.ACTION });

      if ("hrefPattern" in el && el.hrefPattern) {
        await expect(locator.first()).toHaveAttribute("href", el.hrefPattern);
      }
      if ("testId" in el && el.testId) {
        // Stable testid attribute is documented in doc §1.2 — assert presence.
        await expect(locator.first()).toHaveAttribute("data-testid", el.testId);
      }
    });
  }

  test("#14 Promo CTA 'Shop Sale' renders when marketing rotation is active (soft check)", async ({
    page,
    header,
  }) => {
    // Promo strip is marketing-rotated; CTA copy varies and may be empty.
    // When present, "Shop Sale" link must be visible and have an href.
    await page.goto("/");
    await expect(header.root.first()).toBeVisible({
      timeout: TIMEOUTS.HYDRATION,
    });

    const promo = header.root.getByRole("link", { name: /shop sale/i });
    const count = await promo.count();
    test.skip(
      count === 0,
      "Promo Shop Sale CTA not active in current marketing rotation",
    );
    await expect(promo.first()).toBeVisible({ timeout: TIMEOUTS.ACTION });
    await expect(promo.first()).toHaveAttribute("href", /.+/);
  });

  test("element #13 Cart icon href includes cart_source=header tracking", async ({
    page,
    header,
  }) => {
    // Doc §1.2: cart href format = "/cart/?cart_source=header" (anonymous V1).
    // The tracking param is critical for marketing attribution.
    await page.goto("/");
    const cartHref = await header.cart.getAttribute("href");
    expect(cartHref).toMatch(/cart_source=header/);
  });

  test("element #11 Sign In link is visible (guest-only)", async ({
    page,
    header,
  }) => {
    await page.goto("/");
    await expect(header.signInLink).toBeVisible({ timeout: TIMEOUTS.ACTION });
  });

  /*
   * Behaviour-affordance probes — the data-driven loop above only verifies
   * static DOM (visible + href pattern). A header element can be visible AND
   * carry the right href AND still be broken (intercepted click handler,
   * wrong destination on click, missing tracking param). The next 4 tests
   * exercise the user-facing affordance so a mutation in the click/keyboard
   * handler is caught — "would this fail if the affordance broke? YES".
   */

  test("logo click navigates to homepage /", async ({ page, header }) => {
    // Mutation-test seed: regressions where logo `<a>` is hijacked by a
    // wrapping click handler that prevents default (observed twice on
    // marketing redesigns). Asserting URL after click — not just href — is
    // the only way to detect that class of bug.
    await page.goto("/account-help");
    await expect(header.logo).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await header.logo.click();
    await page.waitForURL((url) => new URL(url).pathname === "/", {
      timeout: TIMEOUTS.URL_CHANGE,
    });
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("cart icon href targets /cart family AND carries cart_source=header tracking", async ({
    page,
    header,
  }) => {
    // Doc §1.2: cart href = "/cart/?cart_source=header" — both the route
    // family AND the tracking param matter (marketing attribution drops if
    // the param is stripped). Loop only checks the href pattern; this test
    // splits the two assertions so a future bug that keeps the route but
    // drops the param fails loudly with a clear message.
    await page.goto("/");
    // Two distinct assertions on the same attribute — auto-retrying via
    // toHaveAttribute (eslint-plugin-playwright prefers this form over
    // get+toMatch). Both must hold; a regression on either fails the test.
    await expect(
      header.cart,
      "cart href must target /cart family",
    ).toHaveAttribute("href", /\/cart\b/);
    await expect(
      header.cart,
      "cart href must carry cart_source=header tracking param",
    ).toHaveAttribute("href", /[?&]cart_source=header\b/);
  });

  test("Sign In link click navigates to /profiles/users/sign_in", async ({
    page,
    header,
  }) => {
    // Mutation-test seed: Sign-In <a> could keep its href but be intercepted
    // by an in-page auth modal handler (common on A/B experiments).
    // Asserting URL after click guarantees the link still navigates.
    await page.goto("/");
    await expect(header.signInLink).toBeVisible({ timeout: TIMEOUTS.ACTION });
    await expect(
      header.signInLink,
      "Sign In href must match /profiles/users/sign_in",
    ).toHaveAttribute("href", /\/profiles\/users\/sign_in/);
    await header.signInLink.click();
    await page.waitForURL(/\/profiles\/users\/sign_in/, {
      timeout: TIMEOUTS.URL_CHANGE,
    });
    expect(page.url()).toMatch(/\/profiles\/users\/sign_in/);
  });

  test("Skip link Enter key updates URL hash to #main-content", async ({
    page,
  }) => {
    // WCAG 2.4.1 Bypass Blocks — the skip link must move focus / hash to
    // #main-content when activated via keyboard. The static probe in V0.3
    // only checks href; this test exercises the keyboard activation path,
    // which is the way assistive-tech users hit it. Fails if a future
    // refactor turns the <a href="#main-content"> into a button with no
    // hash update (regression class observed on competitor sites).
    await page.goto("/");
    const skipLink = page.getByRole("link", { name: /skip to main content/i });
    await expect(skipLink).toHaveCount(1);
    await skipLink.focus();
    await skipLink.press("Enter");
    await page.waitForURL(/#main-content$/, { timeout: TIMEOUTS.URL_CHANGE });
    expect(page.url()).toMatch(/#main-content$/);
  });
});

test.describe("@p1 V1.4 Flyouty F1-F5 — panel structure", () => {
  for (const flyout of FLYOUTS_V1) {
    // Each flyout: open trigger via keyboard activation, assert panel opens
    // with link items. Hover is inert on the condensed-desktop build (caret
    // button has pointer-events:none + a sibling <a> overlay intercepts the
    // cursor); focus+Enter is the deterministic open path. See
    // HeaderComponent.openMegaMenu for the full probe log.
    test(`${flyout.id} "${flyout.triggerName}" opens with ${flyout.expectedItemCount} items`, async ({
      page,
      header,
    }) => {
      await page.goto("/");
      await header.openMegaMenu(flyout.triggerName);

      const trigger = header.megaMenuTrigger(flyout.triggerName);
      await expect(trigger).toHaveAttribute("aria-expanded", "true", {
        timeout: TIMEOUTS.QUICK,
      });

      const controls = await trigger.getAttribute("aria-controls");
      expect(controls).toBeTruthy();
      // IDs are NOT unique on this build — both `ci-header-prerender` and
      // `ci-header` emit a panel with the same id (e.g. `#solutionsOverlay`
      // appears twice on the F5 trigger). Scope to the header host that owns
      // the focused trigger so item counts match the documented spec.
      const panel = header.root.locator(`#${controls}`).first();
      const items = panel.locator("a[href]");
      await expect(items).toHaveCount(flyout.expectedItemCount);
    });
  }
});

test.describe("@p1 V1.4 Dropdowny D1 — Sign In", () => {
  for (const dropdown of DROPDOWNS_V1) {
    test(`${dropdown.id} dropdown opens via caret button`, async ({ page }) => {
      // The accounts caret button is a sibling of `<ci-cart>` which intercepts
      // pointer events for `.click()` (same pointer-events trap as the mega-menu
      // caret). Use the keyboard activation path — focus+Enter — which the
      // probe (2026-05-26) confirmed reveals the dropdown items. The trigger
      // exposes `aria-haspopup="true"` but no aria-controls/aria-expanded, so
      // we assert by item visibility, not attribute state.
      await page.goto("/");
      const trigger = page
        .getByRole("button", { name: dropdown.triggerAccessibleName })
        .first();
      await trigger.focus();
      await page.keyboard.press("Enter");
      // After open, the documented item names must appear.
      for (const itemText of dropdown.expectedItems) {
        await expect(
          page.getByRole("link", { name: new RegExp(itemText, "i") }).first(),
        ).toBeVisible({ timeout: TIMEOUTS.QUICK });
      }
    });
  }
});

test.describe("@p1 V1.7 Known edge cases", () => {
  test("logo accessible name is reachable via getByRole (tolerant regex)", async ({
    page,
    header,
  }) => {
    // Doc §1.7 bod 3: logo accessible name may include "- inky" mascot suffix.
    // Tests must use a tolerant regex; exact match "customink logo" would fail.
    await page.goto("/");
    await expect(header.logo).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  });

  test("cart icon is reachable via stable testid after hydration", async ({
    page,
    header,
  }) => {
    // Doc §1.7 bod 6: header renders both slot variants in DOM; one visible
    // per breakpoint. Wait for hydration then assert testid is queryable.
    await page.goto("/");
    await header.root
      .first()
      .waitFor({ state: "attached", timeout: TIMEOUTS.HYDRATION });
    await page
      .getByTestId("cart-global-header")
      .first()
      .waitFor({ state: "attached", timeout: TIMEOUTS.HYDRATION });
  });

  test.fixme("search input outline-style is visible on focus (no transparent ring regression)", async ({
    page,
    header,
  }) => {
    // Doc §1.7 bod 4: search field computed `outline-style: none` in some
    // Chromium builds despite `outline: 3px` rule — focus ring may be invisible.
    await page.goto("/");
    await header.search.focus();
    const outline = await header.search.evaluate(
      (el) => globalThis.getComputedStyle(el).outlineStyle,
    );
    expect(outline).not.toBe("none");
  });
});
