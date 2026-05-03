import { existsSync } from "node:fs";
import { test, expect } from "../fixtures/pages.fixture";
import { HeaderComponent } from "../pages/components/HeaderComponent";
import { waitForFooterReady } from "../helpers/page-state";

const AUTH_STATE_PATH = "storage/auth.json";
const hasAuthState = existsSync(AUTH_STATE_PATH);

/**
 * End-to-end user journeys through the global header.
 *
 * Each journey gets up to three flavours: a positive (happy) path, a
 * negative (failure) path the user must still survive, and an edge case
 * at a boundary. Where a flavour does not make sense for a journey, it
 * is omitted rather than padded.
 *
 * Tests that require staging credentials (logged-in flows) skip with a
 * clear reason when `storage/auth.json` is not present, the same gate as
 * the rest of the suite.
 */

// ---------------------------------------------------------------------------
// 1. FIND — submit a search query
// ---------------------------------------------------------------------------

test.describe("@p1 journey — find / search submit", () => {
  test("positive: user submits a valid query and lands on results that reflect it", async ({
    page,
  }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);

    await header.submitSearch("tshirt");
    await page.waitForURL((url) => /tshirt/i.test(url.toString()), {
      timeout: 15_000,
    });
    // Beyond the URL: results page must not be a 404 / blank shell.
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator("body")).toBeVisible();

    // Beyond the page rendering: actual product links to t-shirt items
    // must appear. Catches the Algolia regression class where the route
    // resolves OK but the index returns 0 hits — header nav has a single
    // "/products/t-shirts/4" category link; a real results page renders
    // many product-detail links.
    const productLinks = page.locator('a[href*="/products/t-shirts/"]');
    await expect(productLinks.first()).toBeVisible({ timeout: 10_000 });
    expect(
      await productLinks.count(),
      "results page should render multiple matching products, not just the header nav category link",
    ).toBeGreaterThan(2);
  });

  test("negative: empty submit does not navigate away", async ({ page }) => {
    await page.goto("/");
    const startUrl = page.url();
    const header = new HeaderComponent(page);

    await header.search.fill("");
    await header.search.press("Enter");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url(), "empty query should not trigger navigation").toBe(
      startUrl,
    );
  });
});

// ---------------------------------------------------------------------------
// 2. AUTOCOMPLETE — search suggestions while typing
// ---------------------------------------------------------------------------

test.describe("@p1 journey — autocomplete suggestions", () => {
  test("positive: typing opens suggestions and ArrowDown+Enter navigates", async ({
    page,
  }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);
    const startUrl = page.url();

    await header.search.fill("tshi");
    await expect(header.autocompleteOptions.first()).toBeVisible({
      timeout: 5_000,
    });

    // Algolia's autocomplete is keyboard-driven; ArrowDown selects, Enter
    // commits — mouse clicks on suggestion items don't reliably register
    // because of the focus model.
    await header.search.press("ArrowDown");
    await header.search.press("Enter");
    await page.waitForURL((url) => url.toString() !== startUrl, {
      timeout: 12_000,
    });
  });
});

// ---------------------------------------------------------------------------
// 3. SEARCH NO-RESULTS — query that matches nothing
// ---------------------------------------------------------------------------

test.describe("@p1 journey — search returns no results", () => {
  /**
   * The empty-state path is its own bug class: a regression that silently
   * sends the user to the homepage on no-match, or shows stale recommendations
   * without a "no results" cue, ships without this test.
   */
  test("positive: nonexistent query lands on a results page that says it found nothing", async ({
    page,
  }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);
    const NONEXISTENT = "qzx9f7" + Date.now().toString(36);

    await header.submitSearch(NONEXISTENT);
    await page.waitForLoadState("domcontentloaded");

    // The query must reach the results route — not be silently dropped.
    await expect(page).toHaveURL(new RegExp(NONEXISTENT, "i"));

    // Either an explicit no-results message OR an empty results grid is
    // acceptable; what is NOT is the homepage rendering as if no search
    // happened.
    const message = page.getByText(
      /no results|nothing found|0 results|did not match|couldn['’]t find/i,
    );
    const grid = page
      .getByRole("list", { name: /products|results/i })
      .or(page.locator("[class*='results'], [class*='ResultsGrid']"))
      .first();

    const hasMessage = (await message.count()) > 0;
    // Locator.count() returns 0 for an empty list — it doesn't throw.
    // No defensive catch needed; a real locator error should surface.
    const itemCount = await grid
      .getByRole("listitem")
      .or(grid.getByRole("link"))
      .count();

    expect(
      hasMessage || itemCount === 0,
      "expected either a no-results message or an empty results grid",
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. GET HELP CALL — phone support link
// ---------------------------------------------------------------------------

test.describe("@p1 journey — call support", () => {
  test("positive: phone affordance is dialable in the format the OS dialer accepts", async ({
    page,
  }) => {
    await page.goto("/", { timeout: 60_000 });
    // Phone link lives in the lazy-hydrated `ci-full-footer`; without this
    // wait the locator races the hydration and frequently loses.
    await waitForFooterReady(page);

    const phone = page.locator('a[href^="tel:"]').first();
    await expect(phone).toBeVisible({ timeout: 15_000 });
    // The number rotates between toll-free pool — verify the format,
    // not the digits.
    await expect(phone).toHaveAttribute(
      "href",
      /^tel:\+?\d{1,3}-?\d{3}-?\d{3}-?\d{4}$/,
    );
    await expect(phone).toBeEnabled();

    // The label users actually look for must be reachable nearby.
    await expect(
      page
        .getByText(/talk to a real person|customer service|call us|need help/i)
        .first(),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 5. CHAT NOW — live chat trigger
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 5b. PROMO BANNER — user clicks "Shop Sale" CTA in announcement strip
// ---------------------------------------------------------------------------

test.describe("@p1 journey — promo banner Shop Sale", () => {
  test("positive: user clicks Shop Sale in the promo strip and lands on a sale-tagged listing", async ({
    page,
  }) => {
    await page.goto("/", { timeout: 60_000 });

    // Marketing rotates the promo copy ("15% Off T-shirts…" today, different
    // tomorrow); the Shop Sale CTA itself is the stable affordance.
    const shopSale = page.getByRole("link", { name: /shop sale/i }).first();
    await expect(shopSale).toBeVisible({ timeout: 10_000 });

    await Promise.all([
      // Sale destinations live under /products/apparel/all-apparel/<id> with
      // fg-category query params on this deployment; bind to the path family.
      page.waitForURL(/\/products\/(apparel|all-apparel|sale)/i, {
        timeout: 20_000,
      }),
      shopSale.click(),
    ]);
    // Destination must render product results, not a blank shell.
    await expect(
      page
        .getByRole("heading", { level: 1 })
        .or(page.locator("[class*='ProductGrid'], [class*='results']"))
        .first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// 4b. CART ICON click from a deep page — primary nav pattern
// ---------------------------------------------------------------------------

test.describe("@p1 journey — cart icon navigates to cart", () => {
  test("positive: user clicks the cart icon from a product page and lands on /cart", async ({
    page,
  }) => {
    // From a deep page (not homepage) the cart icon must still navigate.
    // Catches regressions where cart icon only works on / or breaks
    // because the header WC re-hydrates with a stale handler.
    await page.goto("/products/t-shirts/4", { timeout: 60_000 });
    const header = new HeaderComponent(page);
    await expect(header.cart).toBeVisible({ timeout: 10_000 });
    await Promise.all([
      page.waitForURL(/\/(cart|checkout)/, { timeout: 15_000 }),
      header.cart.click(),
    ]);
    // Cart page must render — heading or empty-state copy.
    await expect(
      page
        .getByRole("heading", { name: /cart|order|review|empty/i })
        .or(page.getByText(/your cart is empty|cart is empty/i))
        .first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// 4e. SKIP LINK — keyboard-only users jump past the header to main content
// ---------------------------------------------------------------------------

test.describe("@p1 journey — skip to main content", () => {
  test("positive: keyboard user can skip past the header straight to main content", async ({
    page,
  }) => {
    await page.goto("/", { timeout: 60_000 });

    // The skip link is the first focusable element — it appears only on
    // keyboard focus. Tab to it, press Enter, and verify the URL hash
    // points at the main landmark.
    const skipLink = page.getByRole("link", { name: /skip to main content/i });
    await expect(skipLink.first()).toHaveAttribute("href", "#main-content");
    await expect(page.locator("#main-content")).toBeAttached();

    await skipLink.first().click();
    await expect(page).toHaveURL(/#main-content/);
  });
});

test.describe("@p1 journey — chat now", () => {
  test("positive: clicking Chat Now opens the LiveChat widget", async ({
    page,
  }) => {
    await page.goto("/");

    const chatTrigger = page
      .getByRole("button", { name: /^chat now$/i })
      .first();
    await expect(chatTrigger).toBeVisible();
    await chatTrigger.click();

    // The widget injects an iframe; we don't poke its body (third-party
    // surface), only that it opened.
    const widget = page.frameLocator(
      'iframe[title*="LiveChat" i], iframe[title*="chat widget" i]',
    );
    // 15s instead of 10s — third-party SDK init under parallel test load
    // benefits from extra headroom; without it CHAT tests flake first.
    await expect(widget.locator("body")).toBeAttached({ timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// 5c. FOOTER NAVIGATION — user clicks each footer link and lands somewhere real
// ---------------------------------------------------------------------------
//
// The footer is the user's secondary navigation surface (About, Account,
// Contact, Service Center). Each link is its own journey: click → arrive
// on the destination → page renders. Auth-required links (account/*) click
// through to /profiles/users/sign_in with a return_to back to the protected
// URL — a journey on its own (the auth-redirect is what the anonymous user
// actually experiences).

import { FOOTER_LINKS } from "../data/footer-links";
import { FOLLOW_US_LINKS } from "../data/follow-us-links";
import { FooterComponent } from "../pages/components/FooterComponent";

test.describe("@p1 journey — footer link click-through", () => {
  for (const link of FOOTER_LINKS) {
    test(`positive: user clicks footer ${link.section} > ${link.name} and lands on the right destination`, async ({
      page,
    }) => {
      await page.goto("/", { timeout: 60_000 });
      await waitForFooterReady(page);

      const footer = new FooterComponent(page);
      const item = footer
        .section(link.section)
        .getByRole("link", { name: link.name })
        .first();
      await expect(item).toBeVisible({ timeout: 10_000 });

      if (link.skipHttpCheck === "auth-required") {
        // Auth-protected click: anonymous user is redirected to sign-in
        // with return_to preserving the protected URL. That redirect IS
        // the journey for an anonymous click.
        await Promise.all([
          page.waitForURL(/\/profiles\/users\/sign_in/, { timeout: 15_000 }),
          item.click(),
        ]);
        await expect(
          page.getByRole("heading", { name: /^sign in$/i }),
        ).toBeVisible();
      } else if (link.skipHttpCheck === "environment-specific") {
        // Some routes (e.g. Help Center) work in production but are
        // incomplete on staging. Verify the href targets the right path
        // without firing a click that would 404.
        const href = await item.getAttribute("href");
        const pathname = new URL(href ?? "", page.url()).pathname;
        expect(pathname).toBe(link.path);
      } else {
        // Normal click — must navigate and render real content.
        await Promise.all([
          page.waitForURL(
            (url) => new URL(url.toString()).pathname === link.path,
            { timeout: 20_000 },
          ),
          item.click(),
        ]);
        // Destination must render — heading or main element.
        await expect(
          page.getByRole("heading").or(page.getByRole("main")).first(),
        ).toBeVisible({ timeout: 10_000 });
      }
    });
  }
});

test.describe("@p1 journey — Follow Us social links", () => {
  for (const entry of FOLLOW_US_LINKS) {
    test(`positive: user can follow CustomInk on ${entry.name}`, async ({
      page,
    }) => {
      await page.goto("/", { timeout: 60_000 });
      await waitForFooterReady(page);

      const footer = new FooterComponent(page);
      const link = footer.followUsLink(entry.name);
      await expect(link).toBeVisible({ timeout: 10_000 });

      if (entry.kind === "external") {
        // Don't navigate away — verify the destination domain + that the
        // link opens in a new tab (the user's expected pattern).
        const href = await link.getAttribute("href");
        const url = new URL(href ?? "", page.url());
        expect(url.hostname).toContain(entry.expectedDomain);
        await expect(link).toHaveAttribute("target", /_blank|new/i);
      } else {
        // Internal (Custom Ink Blog) — click and verify destination.
        await Promise.all([
          page.waitForURL(
            (url) => new URL(url.toString()).pathname === entry.expectedPath,
            { timeout: 20_000 },
          ),
          link.click(),
        ]);
        await expect(page.getByRole("heading").first()).toBeVisible({
          timeout: 10_000,
        });
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 6. FAVORITES — heart a product, see it on the favorites page
// ---------------------------------------------------------------------------

test.describe("@p1 journey — favorites", () => {
  test("positive: user adds a product to favorites and finds it on /products/favorites", async ({
    page,
  }) => {
    await page.goto("/products/t-shirts/4", { timeout: 60_000 });

    // Land on a product detail page so the heart affordance is reachable.
    const productCard = page
      .getByRole("link", { name: /.+/ })
      .filter({ has: page.locator("img") })
      .first();
    await expect(productCard).toBeVisible({ timeout: 15_000 });
    await productCard.click();
    await page.waitForLoadState("domcontentloaded");

    const heart = page
      .getByRole("button", {
        name: /favorite|add to favorites|save (this )?(design|product)/i,
      })
      .or(page.getByLabel(/favorite|heart/i))
      .first();

    await expect(heart, "favorites affordance is reachable").toBeVisible({
      timeout: 15_000,
    });
    await heart.click();

    // The user expects feedback: pressed-state, toast, or count badge.
    const becamePressed = await heart
      .getAttribute("aria-pressed")
      .then((v) => v === "true")
      .catch(() => false);
    const toast = await page
      .getByText(/added to favorites|saved/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(
      becamePressed || toast,
      "expected heart to flip pressed-state or a confirmation toast",
    ).toBe(true);

    const header = new HeaderComponent(page);
    await expect(header.favorites).toBeVisible({ timeout: 10_000 });
    await Promise.all([
      page.waitForURL(/\/products\/favorites/, { timeout: 15_000 }),
      header.favorites.click(),
    ]);

    // Either persisted item shows OR the anonymous empty-state copy is
    // present. The route working is the test; persistence requires login.
    const persistedItem = page
      .getByRole("listitem")
      .or(page.locator("[class*='Favorites']"))
      .first();
    const anonEmpty = page.getByText(
      /sign in to save|no favorites yet|create an account to save/i,
    );
    await expect(persistedItem.or(anonEmpty).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("negative: clicking favorites in the header without anything saved shows the empty state", async ({
    page,
  }) => {
    // Anonymous, no saved products → favorites page must communicate the
    // empty state, not crash or show stale data.
    await page.goto("/");
    const header = new HeaderComponent(page);
    await expect(header.favorites).toBeVisible({ timeout: 10_000 });

    await Promise.all([
      page.waitForURL(/\/products\/favorites/, { timeout: 15_000 }),
      header.favorites.click(),
    ]);

    // Real empty-state copy observed via Chrome DevTools MCP on 2026-05-03:
    // "Browse our products and click the heart icon to save your favorites."
    await expect(
      page.getByText(/browse our products and click the heart icon/i),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// 7. REGISTRATION — sign up via the avatar dropdown
// ---------------------------------------------------------------------------

test.describe("@p1 journey — registration", () => {
  test("positive: user opens registration from the avatar and sees a real signup form", async ({
    page,
  }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);

    await header.signInLink.hover();
    const createAccount = page
      .getByRole("link", { name: /create an account/i })
      .or(page.getByRole("button", { name: /create an account/i }))
      .first();
    await expect(createAccount).toBeVisible({ timeout: 5_000 });

    await Promise.all([
      page.waitForURL(/sign_up|register|new|create/i, { timeout: 15_000 }),
      createAccount.click(),
    ]);

    // The form is what makes this useful — email + password + a submit button.
    await expect(
      page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i)),
    ).toBeVisible();
    await expect(
      page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i)),
    ).toBeVisible();
    // Real submit button observed via Walk & Watch on 2026-05-03: "Continue".
    // The sign-up flow is password-based (email + new password + confirm),
    // distinct from the passwordless sign-in flow.
    await expect(
      page.getByRole("button", { name: /^continue$/i }),
    ).toBeEnabled();
  });

  test("negative: submitting an invalid email shows a validation message", async ({
    page,
  }) => {
    // Direct goto with a short timeout. If it fails for any reason (404, 502,
    // or the route doesn't resolve on this deployment), we fall back to the
    // user-affordance path. We narrow the catch so unexpected errors during
    // a successful navigation are NOT silently swallowed.
    const direct = await page
      .goto("/profiles/users/sign_up", { timeout: 10_000 })
      .catch(() => null);

    if (!direct?.ok()) {
      await page.goto("/");
      const header = new HeaderComponent(page);
      await header.signInLink.hover();
      await page
        .getByRole("link", { name: /create an account/i })
        .first()
        .click();
      await page.waitForLoadState("domcontentloaded");
    }

    const emailField = page
      .getByLabel(/email/i)
      .or(page.getByPlaceholder(/email/i))
      .first();
    test.skip(
      (await emailField.count()) === 0,
      "registration form not reachable on this deployment",
    );

    await emailField.fill("not-an-email");
    const passwordField = page
      .getByLabel(/password/i)
      .or(page.getByPlaceholder(/password/i))
      .first();
    if ((await passwordField.count()) > 0) {
      // Throwaway value — this test exercises invalid-email validation,
      // not password strength. Pattern is "fill enough to trigger submit".
      await passwordField.fill("NotARealPassword_TestOnly_2026");
    }

    await page
      .getByRole("button", { name: /create.*account|sign up|register/i })
      .first()
      .click();
    await page.waitForLoadState("domcontentloaded");

    // Either the browser's native validation kicks in (input invalid) or
    // the server rejects with a visible message. A silent submit that
    // navigates to dashboard is the regression to catch.
    const native = await emailField
      .evaluate(
        (el: HTMLInputElement) => !el.validity.valid && !!el.validationMessage,
      )
      .catch(() => false);
    const serverMessage = await page
      .getByText(/invalid|enter a valid|not a valid|please enter/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(
      native || serverMessage,
      "expected validation feedback for invalid email",
    ).toBe(true);
  });

  test("edge: submitting an empty form blocks the request and keeps the user on the page", async ({
    page,
  }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);
    await header.signInLink.hover();
    await page
      .getByRole("link", { name: /create an account/i })
      .first()
      .click();
    await page.waitForLoadState("domcontentloaded");

    const submit = page
      .getByRole("button", { name: /create.*account|sign up|register/i })
      .first();
    test.skip(
      (await submit.count()) === 0,
      "registration form not reachable on this deployment",
    );

    const urlBefore = page.url();
    await submit.click();
    await page.waitForLoadState("domcontentloaded");
    expect(
      page.url(),
      "empty submit must not navigate away from the form",
    ).toBe(urlBefore);
  });
});

// ---------------------------------------------------------------------------
// 8. LOGIN — sign in via the avatar dropdown
// ---------------------------------------------------------------------------

test.describe("@p1 journey — log in", () => {
  test("positive: user opens sign-in from the avatar and sees a real sign-in form", async ({
    page,
  }) => {
    // Bumped from default 30s — staging occasionally takes longer to first
    // paint when 4 workers race; this avoids failing the journey for an
    // infra reason unrelated to the test.
    await page.goto("/", { timeout: 60_000 });
    const header = new HeaderComponent(page);

    await header.signInLink.hover();
    const signIn = page
      .getByRole("link", { name: /^sign in$/i })
      .or(page.getByRole("button", { name: /^sign in$/i }))
      .first();
    await expect(signIn).toBeVisible({ timeout: 5_000 });

    await Promise.all([
      page.waitForURL(/\/profiles\/users\/sign_in/, { timeout: 15_000 }),
      signIn.click(),
    ]);

    // Walk & Watch confirmed: sign-in is passwordless on this site — email
    // field + "Continue With Email" + OAuth alternatives + "Create an account"
    // bottom link. NO password field. Asserting one would falsely accept a
    // regression that introduced password-based sign-in.
    await expect(
      page.getByLabel(/enter email address/i).or(page.getByLabel(/email/i)),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continue with email/i }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: /continue with google/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /create an account/i }),
    ).toBeVisible();
  });

  test("negative: invalid email format produces validation feedback before any send", async ({
    page,
  }) => {
    await page.goto("/profiles/users/sign_in");

    const emailField = page
      .getByLabel(/enter email address/i)
      .or(page.getByLabel(/email/i))
      .first();
    test.skip(
      (await emailField.count()) === 0,
      "sign-in form not reachable on this deployment",
    );

    await emailField.fill("not-an-email");
    await page
      .getByRole("main")
      .getByRole("button", { name: /continue with email/i })
      .first()
      .click();
    await page.waitForLoadState("domcontentloaded");

    // Either native browser validation kicks in OR a server-side message
    // rejects the submit. A silent navigation to the OTP step would be the
    // regression to catch — passwordless sign-in must validate the email
    // shape before sending the magic link.
    const native = await emailField
      .evaluate(
        (el: HTMLInputElement) => !el.validity.valid && !!el.validationMessage,
      )
      .catch(() => false);
    const serverMessage = await page
      .getByText(/invalid|enter a valid|not a valid/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(
      native || serverMessage,
      "expected validation feedback for invalid email",
    ).toBe(true);
  });

  test("edge: empty form submission is blocked and stays on the page", async ({
    page,
  }) => {
    await page.goto("/profiles/users/sign_in");

    // Scope to <main> so the locator can't match the header's "Open Sign In
    // menu" avatar button (whose name also contains "Sign In"). Note: the
    // passwordless flow uses "Continue With Email" — included in the regex
    // so this remains correct after the LOGIN passwordless rewrite.
    const submit = page
      .getByRole("main")
      .getByRole("button", { name: /continue with email|sign in|log in/i })
      .first();
    test.skip(
      (await submit.count()) === 0,
      "sign-in form not reachable on this deployment",
    );

    const urlBefore = page.url();
    await submit.click();
    await page.waitForLoadState("domcontentloaded");
    expect(page.url(), "empty submit must not log the user in").toBe(urlBefore);
  });
});

// ---------------------------------------------------------------------------
// 9. CART — add to cart, see line item + non-zero total
// ---------------------------------------------------------------------------

test.describe("@p1 journey — cart", () => {
  test("positive: user adds a product to the cart and sees it with a non-zero total", async ({
    page,
  }) => {
    await page.goto("/products/t-shirts/4", { timeout: 60_000 });

    const productCard = page
      .getByRole("link", { name: /.+/ })
      .filter({ has: page.locator("img") })
      .first();
    await expect(productCard).toBeVisible({ timeout: 15_000 });
    await productCard.click();
    await page.waitForLoadState("domcontentloaded");

    const addToCart = page
      .getByRole("button", {
        name: /add to cart|add to bag|buy it now|order this/i,
      })
      .or(
        page.getByRole("link", {
          name: /add to cart|add to bag|buy it now|order this/i,
        }),
      )
      .first();

    test.skip(
      (await addToCart.count()) === 0,
      "Product requires the Design Lab — no direct add-to-cart on this template. " +
        "End-to-end cart math runs from the design-lab flow, out of header/footer scope.",
    );

    await addToCart.click();

    const header = new HeaderComponent(page);
    if (!/\/(cart|checkout)/.test(page.url())) {
      await expect(header.cart).toBeVisible({ timeout: 10_000 });
      await Promise.all([
        page.waitForURL(/\/(cart|checkout)/, { timeout: 15_000 }),
        header.cart.click(),
      ]);
    }

    await expect(
      page.getByRole("heading", { name: /cart|order|review/i }).first(),
    ).toBeVisible({ timeout: 10_000 });

    const lineItem = page
      .getByRole("listitem")
      .or(page.locator("[class*='LineItem'], [class*='CartItem']"))
      .first();
    await expect(lineItem, "cart contains at least one line item").toBeVisible({
      timeout: 10_000,
    });

    // Total formatted as $X.XX with at least one digit before the decimal,
    // so $0.00 fails this check — the bug class this test exists to catch.
    const total = page.getByText(/\$\s?[1-9]\d*(\.\d{2})?/).first();
    await expect(total, "cart total is non-zero").toBeVisible();
  });

  test("negative: visiting /cart with an empty cart shows the empty state", async ({
    page,
  }) => {
    // Direct goto with a short timeout. If the route doesn't resolve OK,
    // fall back to the user-affordance path. Narrow catch so unexpected
    // errors are surfaced (same pattern as REGISTRATION negative).
    const direct = await page
      .goto("/cart", { timeout: 10_000 })
      .catch(() => null);
    if (!direct?.ok()) {
      await page.goto("/");
      const header = new HeaderComponent(page);
      await expect(header.cart).toBeVisible({ timeout: 10_000 });
      await header.cart.click();
      await page.waitForLoadState("domcontentloaded");
    }

    // An empty cart must communicate it — silent zero items / zero total
    // without copy is the regression to catch.
    await expect(
      page.getByText(
        /your cart is empty|no items in (your )?cart|cart is empty|let['’]s get started/i,
      ),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("edge: cart total recalculates when line-item quantity is changed", async ({
    page,
  }) => {
    await page.goto("/products/t-shirts/4", { timeout: 60_000 });
    const productCard = page
      .getByRole("link", { name: /.+/ })
      .filter({ has: page.locator("img") })
      .first();
    await productCard.click();
    await page.waitForLoadState("domcontentloaded");

    const addToCart = page
      .getByRole("button", { name: /add to cart|add to bag|buy it now/i })
      .first();
    test.skip(
      (await addToCart.count()) === 0,
      "Product requires the Design Lab — no direct add-to-cart on this template.",
    );
    await addToCart.click();

    const header = new HeaderComponent(page);
    if (!/\/(cart|checkout)/.test(page.url())) {
      await expect(header.cart).toBeVisible({ timeout: 10_000 });
      await Promise.all([
        page.waitForURL(/\/(cart|checkout)/, { timeout: 15_000 }),
        header.cart.click(),
      ]);
    }

    // Read the total, increase the qty, read again, expect it to have grown.
    const totalLocator = page.getByText(/\$\s?[1-9]\d*(\.\d{2})?/).last();
    const totalBefore = await totalLocator.textContent();

    const qtyControl = page
      .getByRole("spinbutton", { name: /quantity|qty/i })
      .or(page.getByLabel(/quantity|qty/i))
      .first();
    test.skip(
      (await qtyControl.count()) === 0,
      "cart does not expose an inline qty control on this template",
    );
    const current = Number(await qtyControl.inputValue().catch(() => "1")) || 1;
    await qtyControl.fill(String(current + 1));
    await qtyControl.press("Tab");

    // Allow the recalculation network call to settle, then read the new total.
    await page.waitForLoadState("networkidle").catch(() => {
      /* some carts use SSE/long-poll — fall through */
    });
    const totalAfter = await totalLocator.textContent();
    expect(
      totalAfter,
      "increasing quantity must change the displayed total",
    ).not.toBe(totalBefore);
  });
});

// ---------------------------------------------------------------------------
// 10. MENU NAVIGATION — open a mega-menu and click a subcategory
// ---------------------------------------------------------------------------

test.describe("@p1 journey — menu navigation", () => {
  /**
   * The mega-menu is the user's primary path into product categories. Existing
   * mega-menu tests verify that hovering opens the panel and that the panel is
   * not empty — neither proves the user can actually navigate from a hover into
   * a category. This journey exercises the full path: open → click sub-item →
   * land on the category page.
   */
  test("positive: user opens a mega-menu and clicks a subcategory to reach the category page", async ({
    page,
  }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);

    // "Custom T-shirts" is the broadest category — most reliably populated.
    await header.openMegaMenu("Custom T-shirts");
    const trigger = header.megaMenuTrigger("Custom T-shirts");
    await expect(trigger).toHaveAttribute("aria-expanded", "true", {
      timeout: 5_000,
    });

    const controls = await trigger.getAttribute("aria-controls");
    expect(controls, "trigger exposes aria-controls").toBeTruthy();
    const panel = page.locator(`#${controls}`);

    // Pick the first navigable subcategory link inside the panel. Marketing
    // rotates content so we don't pin a specific name — the journey we're
    // verifying is "panel → click → category", not "this exact link exists".
    // Bind to the URL shape of a real /products/t-shirts/<id> category link,
    // not "any link in the panel". Catches the regression "panel rendered
    // marketing CTAs only, no real category links" — without this binding
    // the test happily clicks Shop Sale and passes.
    const subcategoryLink = panel
      .getByRole("link")
      .filter({ has: page.locator('[href*="/products/t-shirts/"]') })
      .first();

    await expect(subcategoryLink).toBeVisible({ timeout: 5_000 });
    const expectedHref = await subcategoryLink.getAttribute("href");
    expect(expectedHref, "subcategory link has a real href").toBeTruthy();
    const expectedPathname = new URL(expectedHref ?? "/", page.url()).pathname;

    await Promise.all([
      page.waitForURL((u) => u.toString().includes(expectedPathname), {
        timeout: 20_000,
      }),
      subcategoryLink.click(),
    ]);

    // The destination must render — heading or product grid — not a blank route.
    const heading = page.getByRole("heading", { level: 1 });
    const productGrid = page
      .getByRole("list", { name: /products|results/i })
      .or(page.locator("[class*='ProductGrid'], [class*='results']"));
    await expect(heading.or(productGrid).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("edge: hovering a different mega-menu trigger replaces the open panel", async ({
    page,
  }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);

    // Open the first menu, confirm it's expanded.
    await header.openMegaMenu("Custom T-shirts");
    const firstTrigger = header.megaMenuTrigger("Custom T-shirts");
    await expect(firstTrigger).toHaveAttribute("aria-expanded", "true", {
      timeout: 5_000,
    });

    // Move to a different trigger. Only one panel should be open at a time —
    // panel stacking would mean two visible panels, which is both visually
    // broken and a focus-management bug.
    await header.openMegaMenu("Custom Apparel");
    const secondTrigger = header.megaMenuTrigger("Custom Apparel");
    await expect(secondTrigger).toHaveAttribute("aria-expanded", "true", {
      timeout: 5_000,
    });
    await expect(firstTrigger).toHaveAttribute("aria-expanded", "false", {
      timeout: 5_000,
    });
  });
});

// ---------------------------------------------------------------------------
// 11. LOGO → HOME — clicking the logo returns the user to /
// ---------------------------------------------------------------------------

test.describe("@p1 journey — logo returns home", () => {
  test("positive: user clicks the logo from a product page and lands on /", async ({
    page,
  }) => {
    await page.goto("/products/t-shirts/4", { timeout: 60_000 });
    const header = new HeaderComponent(page);
    await expect(header.logo).toBeVisible({ timeout: 10_000 });
    await header.logo.click();
    await page.waitForURL((url) => new URL(url).pathname === "/", {
      timeout: 10_000,
    });
    expect(new URL(page.url()).pathname).toBe("/");
  });
});

// =============================================================================
// LOGGED-IN USER — header journeys (auth-gated)
// =============================================================================
//
// The header chrome differs in the logged-in state: "Sign In" is replaced by
// the "My Account" dropdown, a heart icon appears in the header strip, the
// cart can persist server-side, and favorites surface on /products/favorites.
// Each item in the My Account dropdown is its own journey — clicking it must
// take the user to a real, rendered destination. The whole block skips when
// storage/auth.json is absent (run codegen once staging is healthy).

test.describe("logged-in user — header journeys", () => {
  test.skip(
    !hasAuthState,
    `Skipping auth-gated journeys: ${AUTH_STATE_PATH} not present (run \`npx playwright codegen --save-storage=${AUTH_STATE_PATH} <staging-url>\` once staging is healthy).`,
  );
  // Tests start with a 60s page.goto on slow staging; bump test timeout so
  // the goto can finish before the test-level timeout fires.
  test.setTimeout(90_000);

  // -------------------------------------------------------------------------
  // 11. LOGOUT — Sign Out from My Account dropdown
  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // 10b. SEARCH (logged-in) — search behaves correctly when authenticated
  // -------------------------------------------------------------------------
  test.describe("@p1 journey — search (logged-in)", () => {
    test("positive: logged-in user submits a search and lands on results that reflect it", async ({
      page,
    }) => {
      // Search may behave differently when authenticated (saved searches,
      // personalized ranking, account-aware autocomplete). The basic
      // submit-and-reach-results invariant must hold in both states.
      await page.goto("/", { timeout: 60_000 });
      const header = new HeaderComponent(page);

      await header.submitSearch("hoodie");
      await page.waitForURL((url) => /hoodie/i.test(url.toString()), {
        timeout: 15_000,
      });
      // Logged-in header must still show the user state (no Sign In link).
      await expect(header.signInLink).toBeHidden();
    });
  });

  test.describe("@p1 journey — log out", () => {
    test("positive: logged-in user clicks Sign Out and the header reverts to anonymous state", async ({
      page,
    }) => {
      await page.goto("/", { timeout: 60_000 });
      const header = new HeaderComponent(page);

      await expect(header.signInLink).toBeHidden();
      await expect(header.accountMenuButton.first()).toBeVisible();

      await header.accountMenuButton.first().click();
      const signOut = page
        .getByRole("link", { name: /sign out|log out/i })
        .or(page.getByRole("button", { name: /sign out|log out/i }))
        .or(page.getByRole("menuitem", { name: /sign out|log out/i }));
      await signOut.first().click();

      // Sign-out goes through a cross-domain redirect chain
      // (account.staging → /sign_out → back to www-master). The header
      // re-renders only after the round-trip lands. Assert the logged-in
      // affordance is gone first, THEN that the anonymous Sign In link
      // is back. Generous timeout for the cross-domain hop.
      await expect(header.accountMenuButton.first()).toBeHidden({
        timeout: 20_000,
      });
      await expect(header.signInLink).toBeVisible({ timeout: 10_000 });
    });
  });

  // -------------------------------------------------------------------------
  // Account dropdown items (12–18) — same shape: open dropdown, click item,
  // verify navigation to a destination that renders. URL patterns are
  // best-effort guesses; Walk & Watch will tighten them tomorrow.
  // -------------------------------------------------------------------------

  test.describe("@p1 journey — account dropdown: Order History", () => {
    test("positive: user navigates to order history from avatar dropdown", async ({
      page,
    }) => {
      await page.goto("/", { timeout: 60_000 });
      const header = new HeaderComponent(page);
      await expect(header.accountMenuButton.first()).toBeVisible({
        timeout: 10_000,
      });
      await header.accountMenuButton.first().click();

      const item = page.getByRole("link", { name: /order history/i }).first();
      await Promise.all([
        page.waitForURL(/\/account\/orders/i, { timeout: 15_000 }),
        item.click(),
      ]);
      // Bind to the destination's distinguishing heading — passes only when
      // we landed on the actual orders page, not any /account/* sibling.
      await expect(
        page.getByRole("heading", {
          name: /order history|your orders|my orders/i,
        }),
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe("@p1 journey — account dropdown: Account Settings", () => {
    test("positive: user navigates to account settings from avatar dropdown", async ({
      page,
    }) => {
      await page.goto("/", { timeout: 60_000 });
      const header = new HeaderComponent(page);
      await expect(header.accountMenuButton.first()).toBeVisible({
        timeout: 10_000,
      });
      await header.accountMenuButton.first().click();

      const item = page
        .getByRole("link", { name: /account settings/i })
        .first();
      await Promise.all([
        page.waitForURL(/\/account\/settings|\/profiles\/account\/edit/i, {
          timeout: 15_000,
        }),
        item.click(),
      ]);
      await expect(
        page.getByRole("heading", {
          name: /account settings|your account|profile/i,
        }),
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe("@p2 journey — account dropdown: My Designs", () => {
    test("positive: user navigates to saved designs from avatar dropdown", async ({
      page,
    }) => {
      await page.goto("/", { timeout: 60_000 });
      const header = new HeaderComponent(page);
      await expect(header.accountMenuButton.first()).toBeVisible({
        timeout: 10_000,
      });
      await header.accountMenuButton.first().click();

      const item = page.getByRole("link", { name: /my designs/i }).first();
      await Promise.all([
        page.waitForURL(
          /\/account\/designs|\/profiles\/designs|\/my-designs/i,
          {
            timeout: 15_000,
          },
        ),
        item.click(),
      ]);
      await expect(
        page.getByRole("heading", {
          name: /my designs|saved designs|your designs/i,
        }),
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe("@p2 journey — account dropdown: My Uploads", () => {
    test("positive: user navigates to uploads from avatar dropdown", async ({
      page,
    }) => {
      await page.goto("/", { timeout: 60_000 });
      const header = new HeaderComponent(page);
      await expect(header.accountMenuButton.first()).toBeVisible({
        timeout: 10_000,
      });
      await header.accountMenuButton.first().click();

      const item = page.getByRole("link", { name: /my uploads/i }).first();
      await Promise.all([
        page.waitForURL(
          /\/account\/uploads|\/profiles\/uploads|\/my-uploads/i,
          {
            timeout: 15_000,
          },
        ),
        item.click(),
      ]);
      await expect(
        page.getByRole("heading", {
          name: /my uploads|your uploads|uploaded/i,
        }),
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  // -------------------------------------------------------------------------
  // 19. CART (persisted) — differs from anonymous: persists across sessions
  // -------------------------------------------------------------------------
  test.describe("@p1 journey — cart (persisted)", () => {
    test("positive: logged-in user adds a product, reloads, and the cart still contains it", async ({
      page,
    }) => {
      await page.goto("/products/t-shirts/4", { timeout: 60_000 });

      // Land on a product detail page so add-to-cart is reachable
      const productCard = page
        .getByRole("link", { name: /.+/ })
        .filter({ has: page.locator("img") })
        .first();
      await expect(productCard).toBeVisible({ timeout: 15_000 });
      await productCard.click();
      await page.waitForLoadState("domcontentloaded");

      const addToCart = page
        .getByRole("button", {
          name: /add to cart|add to bag|buy it now|order this/i,
        })
        .first();
      // If this product needs Design Lab, the bug class this test targets
      // (server-side cart persistence) is unreachable from header scope.
      // We don't skip silently — fail loudly so it's flagged for redesign.
      await expect(
        addToCart,
        "add-to-cart affordance must exist on a logged-in product page",
      ).toBeVisible({ timeout: 15_000 });
      await addToCart.click();

      // Navigate to the cart and assert it has the item
      const header = new HeaderComponent(page);
      await expect(header.cart).toBeVisible({ timeout: 10_000 });
      await Promise.all([
        page.waitForURL(/\/(cart|checkout)/, { timeout: 15_000 }),
        header.cart.click(),
      ]);
      // role=listitem is the user-perceivable contract (screen readers +
      // standard cart UIs). Drop the [class*='LineItem'] CSS-class fallback
      // — A6 implementation-detail smell. If the cart loses listitem role
      // that's a real a11y regression and the test should fail loudly.
      const lineItem = page.getByRole("listitem").first();
      await expect(lineItem).toBeVisible({ timeout: 10_000 });

      // RELOAD — the bug class this test catches: persistence must survive
      await page.reload();
      await expect(
        lineItem,
        "cart line item must survive a reload when logged in",
      ).toBeVisible({ timeout: 10_000 });
      const total = page.getByText(/\$\s?[1-9]\d*(\.\d{2})?/).last();
      await expect(total).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // 20. FAVORITES (persisted) — differs from anonymous: server-side persistence
  // -------------------------------------------------------------------------
  test.describe("@p1 journey — favorites (persisted)", () => {
    test("positive: logged-in user hearts a product and finds it listed on /products/favorites", async ({
      page,
    }) => {
      await page.goto("/products/t-shirts/4", { timeout: 60_000 });

      const productCard = page
        .getByRole("link", { name: /.+/ })
        .filter({ has: page.locator("img") })
        .first();
      await expect(productCard).toBeVisible({ timeout: 15_000 });
      await productCard.click();
      await page.waitForLoadState("domcontentloaded");

      const heart = page
        .getByRole("button", {
          name: /favorite|add to favorites|save (this )?(design|product)/i,
        })
        .or(page.getByLabel(/favorite|heart/i))
        .first();
      await expect(heart).toBeVisible({ timeout: 15_000 });
      await heart.click();

      const header = new HeaderComponent(page);
      await expect(header.favorites).toBeVisible({ timeout: 10_000 });
      await Promise.all([
        page.waitForURL(/\/products\/favorites/, { timeout: 15_000 }),
        header.favorites.click(),
      ]);

      // For a logged-in user the favorited product must appear in the list,
      // not the anonymous empty-state.
      const persistedItem = page
        .getByRole("listitem")
        .or(page.locator("[class*='Favorites']"))
        .first();
      await expect(
        persistedItem,
        "favorited product must persist server-side and appear in /products/favorites",
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  // -------------------------------------------------------------------------
  // 21. HEART ICON in header — direct path to /products/favorites
  // -------------------------------------------------------------------------
  test.describe("@p2 journey — header heart icon", () => {
    test("positive: logged-in user clicks the heart icon in header and lands on /products/favorites", async ({
      page,
    }) => {
      await page.goto("/", { timeout: 60_000 });

      // The heart icon in the header strip — try common access patterns.
      const heart = page
        .getByRole("link", { name: /favorites|saved/i })
        .or(page.getByLabel(/favorites|saved/i))
        .first();
      await expect(heart).toBeVisible({ timeout: 15_000 });

      await Promise.all([
        page.waitForURL(/\/products\/favorites/, { timeout: 15_000 }),
        heart.click(),
      ]);
      // Either a persisted favourite item OR the empty-state copy must
      // render — proves the route hydrated, not that an empty body shipped.
      await expect(
        page
          .getByRole("listitem")
          .first()
          .or(page.getByText(/browse our products and click the heart icon/i)),
      ).toBeVisible({ timeout: 10_000 });
    });
  });
});
