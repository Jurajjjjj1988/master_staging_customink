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
    await expect(header.signIn).toBeVisible();
    await expect(header.signIn).toHaveAttribute(
      "href",
      /\/profiles\/users\/sign_in/,
    );
  });
});

test.describe("@p2 user-state — logged in", () => {
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

    await test.step("user dropdown is visible (Sign In is replaced)", async () => {
      await expect(header.signIn).toBeHidden();
      const userDropdown = page.getByRole("button", {
        name: /open .* menu|account|user/i,
      });
      await expect(userDropdown.first()).toBeVisible();
    });

    await test.step("logout link signs the user out", async () => {
      const userDropdown = page.getByRole("button", {
        name: /open .* menu|account|user/i,
      });
      await userDropdown.first().click();
      const signOut = page.getByRole("link", { name: /sign out|log out/i });
      await signOut.first().click();
      await expect(header.signIn).toBeVisible();
    });
  });
});
