import type { Page, Locator } from "@playwright/test";
import { HeaderComponent } from "./HeaderComponent";

/**
 * Variant 3 — Design Lab header. Doc §3.
 * `<ci-header simple="true">` — task-mode chrome. Search, 5 mega-menus, promo
 * strip, Favorites all suppressed. Adds Lab-specific buttons.
 */
export class HeaderV3Lab extends HeaderComponent {
  readonly myDesignsButton: Locator;
  readonly untitledDesignButton: Locator;
  readonly helpButton: Locator;
  /** Sign In is a button (opens new tab via window.open), NOT a same-tab link. */
  readonly signInButton: Locator;

  constructor(page: Page) {
    super(page);
    this.myDesignsButton = this.root.getByRole("button", {
      name: /my designs/i,
    });
    this.untitledDesignButton = this.root.getByRole("button", {
      name: /untitled design/i,
    });
    this.helpButton = this.root.getByRole("button", { name: /^help$/i });
    this.signInButton = this.root.getByRole("button", { name: /^sign in$/i });
  }

  /** Host has `simple="true"` attribute (Lab task-mode marker). Getter; test asserts. */
  async isSimpleMode(): Promise<boolean> {
    return (await this.root.getAttribute("simple")) === "true";
  }
}
