import { test, expect } from "../fixtures/pages.fixture";
import { HeaderComponent } from "../pages/components/HeaderComponent";

/**
 * Anonymous user header chrome. Logged-in equivalent (LOGOUT, account
 * dropdown items) lives in `tests/user-journeys.spec.ts` under the
 * "logged-in user — header journeys" describe block.
 *
 * Walk & Watch on 2026-04-23: this site does NOT expose a hover dropdown
 * with "Create An Account" from the Sign In affordance — registration
 * lives behind the standalone /sign_up route, reached via the bottom-of-
 * page link inside /sign_in. The previous "hovering the avatar" test
 * asserted a panel that doesn't exist on this build; deleted as
 * speculative-locator theatre.
 */
test.describe("@p1 user-state — logged out", () => {
  test("anonymous user sees the Sign In link in the header", async ({
    page,
  }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);
    await expect(header.signInLink).toBeVisible();
    await expect(header.signInLink).toHaveAttribute(
      "href",
      /\/profiles\/users\/sign_in/,
    );
  });
});
