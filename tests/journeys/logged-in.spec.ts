import { existsSync } from "node:fs";
import { test, expect } from "../../fixtures/pages.fixture";
import { PRODUCT_URLS } from "../../data/products";
import { TIMEOUTS } from "../../helpers/timeouts";

/**
 * Auth-gated header journeys. The header chrome differs in logged-in
 * state: Sign In → My Account dropdown, heart icon in strip, persisted
 * cart + favorites, account dropdown items each route to their own
 * destination. The whole file skips when storage/auth.json is absent.
 */

const AUTH_STATE_PATH = "storage/auth.json";
const hasAuthState = existsSync(AUTH_STATE_PATH);

test.describe("logged-in user — header journeys", () => {
  test.skip(
    !hasAuthState,
    `Skipping auth-gated journeys: ${AUTH_STATE_PATH} not present (run \`npx playwright codegen --save-storage=${AUTH_STATE_PATH} <staging-url>\` once staging is healthy).`,
  );
  // Goto can take 60s on slow staging; bump test timeout so it can finish.
  test.setTimeout(90_000);

  // Fail fast at the auth gate — if session expired, every test below
  // would fail with a misleading reason ("Order History not visible")
  // instead of the real one ("you're not logged in").
  test.beforeEach(async ({ page, header }) => {
    await page.goto("/");
    await expect(
      header.signInLink,
      "auth.json present but Sign In link visible — session expired, re-run codegen",
    ).toBeHidden({ timeout: TIMEOUTS.ACTION });
    await expect(
      header.accountMenuButton.first(),
      "auth.json present but no My Account button — session expired",
    ).toBeVisible({ timeout: TIMEOUTS.ACTION });
  });

  test.describe("@p1 journey — search (logged-in)", () => {
    test("logged-in user submits a search and lands on results that reflect it", async ({
      page,
      header,
    }) => {
      await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });

      await header.submitSearch("hoodie");
      await page.waitForURL((url) => /hoodie/i.test(url.toString()), {
        timeout: TIMEOUTS.URL_CHANGE,
      });
      await expect(header.signInLink).toBeHidden();
    });
  });

  test.describe("@p1 journey — log out", () => {
    test("logged-in user clicks Sign Out and the header reverts to anonymous state", async ({
      page,
      header,
    }) => {
      await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });

      await expect(header.signInLink).toBeHidden();
      await expect(header.accountMenuButton.first()).toBeVisible();

      await header.accountMenuButton.first().click();
      const signOut = page
        .getByRole("link", { name: /sign out|log out/i })
        .or(page.getByRole("button", { name: /sign out|log out/i }))
        .or(page.getByRole("menuitem", { name: /sign out|log out/i }));
      await signOut.first().click();

      // Sign-out is a cross-domain redirect chain; header re-renders after
      // the round-trip. Assert My Account vanishes first, then Sign In returns.
      await expect(header.accountMenuButton.first()).toBeHidden({
        timeout: TIMEOUTS.CROSS_DOMAIN,
      });
      await expect(header.signInLink).toBeVisible({ timeout: TIMEOUTS.ACTION });
    });
  });

  test.describe("@p1 journey — account dropdown: Order History", () => {
    test("user navigates to order history from avatar dropdown", async ({
      page,
      header,
    }) => {
      await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });
      await expect(header.accountMenuButton.first()).toBeVisible({
        timeout: TIMEOUTS.ACTION,
      });
      await header.accountMenuButton.first().click();

      const item = page.getByRole("link", { name: /order history/i }).first();
      await Promise.all([
        page.waitForURL(/\/account\/orders/i, { timeout: TIMEOUTS.URL_CHANGE }),
        item.click(),
      ]);
      await expect(
        page.getByRole("heading", {
          name: /order history|your orders|my orders/i,
        }),
      ).toBeVisible({ timeout: TIMEOUTS.ACTION });
    });
  });

  test.describe("@p1 journey — account dropdown: Account Settings", () => {
    test("user navigates to account settings from avatar dropdown", async ({
      page,
      header,
    }) => {
      await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });
      await expect(header.accountMenuButton.first()).toBeVisible({
        timeout: TIMEOUTS.ACTION,
      });
      await header.accountMenuButton.first().click();

      const item = page
        .getByRole("link", { name: /account settings/i })
        .first();
      await Promise.all([
        page.waitForURL(/\/account\/settings|\/profiles\/account\/edit/i, {
          timeout: TIMEOUTS.URL_CHANGE,
        }),
        item.click(),
      ]);
      await expect(
        page.getByRole("heading", {
          name: /account settings|your account|profile/i,
        }),
      ).toBeVisible({ timeout: TIMEOUTS.ACTION });
    });
  });

  test.describe("@p2 journey — account dropdown: My Designs", () => {
    test("user navigates to saved designs from avatar dropdown", async ({
      page,
      header,
    }) => {
      await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });
      await expect(header.accountMenuButton.first()).toBeVisible({
        timeout: TIMEOUTS.ACTION,
      });
      await header.accountMenuButton.first().click();

      const item = page.getByRole("link", { name: /my designs/i }).first();
      await Promise.all([
        page.waitForURL(
          /\/account\/designs|\/profiles\/designs|\/my-designs/i,
          { timeout: TIMEOUTS.URL_CHANGE },
        ),
        item.click(),
      ]);
      await expect(
        page.getByRole("heading", {
          name: /my designs|saved designs|your designs/i,
        }),
      ).toBeVisible({ timeout: TIMEOUTS.ACTION });
    });
  });

  test.describe("@p2 journey — account dropdown: My Uploads", () => {
    test("user navigates to uploads from avatar dropdown", async ({
      page,
      header,
    }) => {
      await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });
      await expect(header.accountMenuButton.first()).toBeVisible({
        timeout: TIMEOUTS.ACTION,
      });
      await header.accountMenuButton.first().click();

      const item = page.getByRole("link", { name: /my uploads/i }).first();
      await Promise.all([
        page.waitForURL(
          /\/account\/uploads|\/profiles\/uploads|\/my-uploads/i,
          { timeout: TIMEOUTS.URL_CHANGE },
        ),
        item.click(),
      ]);
      await expect(
        page.getByRole("heading", {
          name: /my uploads|your uploads|uploaded/i,
        }),
      ).toBeVisible({ timeout: TIMEOUTS.ACTION });
    });
  });

  // D2 dropdown — 5 remaining items from doc §4.4.1 (9 total).
  // The other 4 (Order History, Settings, My Designs, My Uploads) are
  // covered above as full journeys. These 5 are creds-blocked until a
  // service account with the right entitlements exists.
  const D2_REMAINING_ITEMS = [
    {
      label: "Favorites",
      linkName: /favorites/i,
      urlPattern: /\/account\/favorites/i,
      headingPattern: /favorites|saved/i,
    },
    {
      label: "Group Orders",
      linkName: /group orders/i,
      urlPattern: /\/account\/group_orders/i,
      headingPattern: /group orders/i,
    },
    {
      label: "Fundraising",
      linkName: /fundraising/i,
      urlPattern: /customink\.com\/fundraising\/dashboard/i,
      headingPattern: /fundraising/i,
    },
    {
      label: "Online Stores",
      linkName: /online stores/i,
      urlPattern: /\/account\/stores/i,
      headingPattern: /online stores|your stores/i,
    },
    {
      label: "Sign Out",
      linkName: /sign out|log out/i,
      urlPattern: /\/profiles\/users\/sign_out|\/$/i,
      headingPattern: /sign in|welcome|customink/i,
    },
  ] as const;

  for (const item of D2_REMAINING_ITEMS) {
    test.describe(`@p2 journey — account dropdown: ${item.label}`, () => {
      test.fixme(
        true,
        "creds-blocked per doc §4.7 — needs service account with full D2 entitlements",
      );

      test(`user navigates to ${item.label} from avatar dropdown`, async ({
        page,
        header,
      }) => {
        await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });
        await expect(header.accountMenuButton.first()).toBeVisible({
          timeout: TIMEOUTS.ACTION,
        });
        await header.accountMenuButton.first().click();

        const link = page.getByRole("link", { name: item.linkName }).first();
        await Promise.all([
          page.waitForURL(item.urlPattern, { timeout: TIMEOUTS.URL_CHANGE }),
          link.click(),
        ]);
        await expect(
          page.getByRole("heading", { name: item.headingPattern }).first(),
        ).toBeVisible({ timeout: TIMEOUTS.ACTION });
      });
    });
  }

  test.describe("@p1 journey — cart (persisted)", () => {
    test("logged-in user adds a product, reloads, and the cart still contains it", async ({
      page,
      header,
    }) => {
      await page.goto(PRODUCT_URLS[0].path, { timeout: TIMEOUTS.NAVIGATION });

      const productCard = page
        .getByRole("link", { name: /.+/ })
        .filter({ has: page.locator("img") })
        .first();
      await expect(productCard).toBeVisible({ timeout: TIMEOUTS.URL_CHANGE });
      await productCard.click();
      await page.waitForLoadState("domcontentloaded");

      const addToCart = page
        .getByRole("button", {
          name: /add to cart|add to bag|buy it now|order this/i,
        })
        .first();
      // Fail loudly if add-to-cart is missing — server persistence is the
      // bug class this test targets; missing affordance is a real regression.
      await expect(
        addToCart,
        "add-to-cart affordance must exist on a logged-in product page",
      ).toBeVisible({ timeout: TIMEOUTS.URL_CHANGE });
      await addToCart.click();
      await expect(header.cart).toBeVisible({ timeout: TIMEOUTS.ACTION });
      await Promise.all([
        page.waitForURL(/\/(cart|checkout)/, { timeout: TIMEOUTS.URL_CHANGE }),
        header.cart.click(),
      ]);

      const lineItem = page.getByRole("listitem").first();
      await expect(lineItem).toBeVisible({ timeout: TIMEOUTS.ACTION });

      // The actual assertion: persistence must survive a reload.
      await page.reload();
      await expect(
        lineItem,
        "cart line item must survive a reload when logged in",
      ).toBeVisible({ timeout: TIMEOUTS.ACTION });
      const total = page.getByText(/\$\s?[1-9]\d*(\.\d{2})?/).last();
      await expect(total).toBeVisible();
    });
  });

  test.describe("@p1 journey — favorites (persisted)", () => {
    test("logged-in user hearts a product and finds it listed on /products/favorites", async ({
      page,
      header,
    }) => {
      await page.goto(PRODUCT_URLS[0].path, { timeout: TIMEOUTS.NAVIGATION });

      const productCard = page
        .getByRole("link", { name: /.+/ })
        .filter({ has: page.locator("img") })
        .first();
      await expect(productCard).toBeVisible({ timeout: TIMEOUTS.URL_CHANGE });
      await productCard.click();
      await page.waitForLoadState("domcontentloaded");

      const heart = page
        .getByRole("button", {
          name: /favorite|add to favorites|save (this )?(design|product)/i,
        })
        .or(page.getByLabel(/favorite|heart/i))
        .first();
      await expect(heart).toBeVisible({ timeout: TIMEOUTS.URL_CHANGE });
      await heart.click();
      await expect(header.favorites).toBeVisible({ timeout: TIMEOUTS.ACTION });
      await Promise.all([
        page.waitForURL(/\/products\/favorites/, {
          timeout: TIMEOUTS.URL_CHANGE,
        }),
        header.favorites.click(),
      ]);

      // Logged-in must see the persisted product, NOT the anonymous empty-state.
      const persistedItem = page.getByRole("listitem").first();
      await expect(
        persistedItem,
        "favorited product must persist server-side and appear in /products/favorites",
      ).toBeVisible({ timeout: TIMEOUTS.ACTION });
    });
  });

  test.describe("@p2 journey — header heart icon", () => {
    test("logged-in user clicks the heart icon in header and lands on /products/favorites", async ({
      page,
    }) => {
      await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });

      const heart = page
        .getByRole("link", { name: /favorites|saved/i })
        .or(page.getByLabel(/favorites|saved/i))
        .first();
      await expect(heart).toBeVisible({ timeout: TIMEOUTS.URL_CHANGE });

      await Promise.all([
        page.waitForURL(/\/products\/favorites/, {
          timeout: TIMEOUTS.URL_CHANGE,
        }),
        heart.click(),
      ]);
      await expect(
        page
          .getByRole("listitem")
          .first()
          .or(page.getByText(/browse our products and click the heart icon/i)),
      ).toBeVisible({ timeout: TIMEOUTS.ACTION });
    });
  });
});
