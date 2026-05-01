import { existsSync } from "node:fs";
import { test, expect } from "../fixtures/pages.fixture";
import { HeaderComponent } from "../pages/components/HeaderComponent";

const AUTH_STATE_PATH = "storage/auth.json";
const hasAuthState = existsSync(AUTH_STATE_PATH);

/**
 * Tests #9 #10 — header user state.
 *   #9  logged-out: Sign In is visible and points at the sign-in route
 *   #10 logged-in:  user dropdown visible (Sign In hidden), logout works
 *
 * Test #10 is gated by the presence of `storage/auth.json` (see OQ-2 in spec).
 * Without staging credentials it skips with a clear annotation rather than
 * silently passing.
 */

test.describe("@p1 user-state — logged out", () => {
  test("should_show_signin_link_when_logged_out", async ({ page }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);
    await expect(header.signInLink).toBeVisible();
    await expect(header.signInLink).toHaveAttribute(
      "href",
      /\/profiles\/users\/sign_in/,
    );
  });

  /**
   * Test #38 — avatar dropdown for logged-out users.
   *
   * Hovering the Sign-In affordance opens a panel with a heading, a
   * descriptive sentence, and TWO actions: "Sign In" (existing user) and
   * "Create An Account" (new user). The Create-An-Account path is the only
   * onboarding entry from the global header — losing it would cut off the
   * primary acquisition funnel without anyone noticing in functional tests
   * that target the top-level Sign-In link.
   */
  test("should_open_avatar_dropdown_with_signin_and_create_account_when_signin_hovered", async ({
    page,
  }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);

    await test.step("hovering Sign-In opens the panel", async () => {
      await header.signInLink.hover();
      // Both buttons live in a panel that animates in — wait for the
      // distinctive "Create An Account" affordance as the panel anchor.
      await expect(
        page
          .getByRole("link", { name: /create an account/i })
          .or(page.getByRole("button", { name: /create an account/i })),
      ).toBeVisible({ timeout: 5_000 });
    });

    await test.step("panel exposes Sign In and Create An Account actions", async () => {
      const signInAction = page
        .getByRole("link", { name: /^sign in$/i })
        .or(page.getByRole("button", { name: /^sign in$/i }));
      const createAccount = page
        .getByRole("link", { name: /create an account/i })
        .or(page.getByRole("button", { name: /create an account/i }));

      await expect(signInAction.first()).toBeVisible();
      await expect(createAccount.first()).toBeVisible();

      // Sign-In action navigates to the existing-user flow.
      const signInHref = await signInAction.first().getAttribute("href");
      expect(signInHref).toMatch(/\/profiles\/users\/sign_in/);

      // Create-An-Account action navigates to the new-user registration flow.
      const createHref = await createAccount.first().getAttribute("href");
      expect(createHref).toMatch(/sign_up|register|new|create/i);
    });
  });
});

test.describe("@p2 user-state — logged in", () => {
  // Conditional skip on environment readiness (auth state file). Once
  // `storage/auth.json` is provided (OQ-2), this branch becomes a real test.
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(
    !hasAuthState,
    `Skipping authenticated test: ${AUTH_STATE_PATH} not present (OQ-2 — staging credentials required).`,
  );

  test("should_show_user_dropdown_and_allow_logout_when_logged_in", async ({
    authenticated,
  }) => {
    const page = authenticated;
    await page.goto("/");
    const header = new HeaderComponent(page);

    await test.step("account menu is visible and Sign-In link is replaced", async () => {
      await expect(header.signInLink).toBeHidden();
      await expect(header.accountMenuButton.first()).toBeVisible();
    });

    await test.step("logout link signs the user out", async () => {
      await header.accountMenuButton.first().click();
      const signOut = page.getByRole("link", { name: /sign out|log out/i });
      await signOut.first().click();
      await expect(header.signInLink).toBeVisible();
    });
  });
});
