import type { Page, Locator } from "@playwright/test";
import { HeaderComponent } from "./HeaderComponent";

/**
 * Variant 4 — Accounts header (logged-in). Doc §4.
 * Identity overlay swap vs V1:
 *   Sign In → My Account (same testid, different text + href)
 *   Open Sign In menu → Open My Account menu (opens D2)
 *   Cart count badge "Cart (N)" appears
 *   Favorites → /account/favorites (NOT /products/favorites)
 */
export class HeaderV4Accounts extends HeaderComponent {
  readonly myAccountLink: Locator;
  readonly openMyAccountMenuButton: Locator;
  /** D2 dropdown — 9 items per doc §4.4.1. */
  readonly accountDropdown: Locator;
  readonly favoritesAccountScoped: Locator;

  constructor(page: Page) {
    super(page);
    this.myAccountLink = this.root
      .getByTestId("my-account")
      .filter({ hasText: /^my account$/i });
    this.openMyAccountMenuButton = this.root.getByRole("button", {
      name: /Open My Account menu/i,
    });
    this.accountDropdown = page.locator('[role="menu"]').filter({
      hasText: /my designs|my account|sign out/i,
    });
    // Doc §1.7 #10 dual-slot DOM (mobile + desktop instances, breakpoint-
    // toggled via CSS). `.first()` resolves to the hidden mobile slot on
    // desktop viewports — use `.filter({ visible: true })` to collapse to
    // the breakpoint-visible one.
    this.favoritesAccountScoped = this.root
      .getByRole("link", { name: /^Favorites$/i })
      .filter({ visible: true });
  }

  async openAccountDropdown(): Promise<void> {
    await this.openMyAccountMenuButton.click();
  }
}
