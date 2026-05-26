import type { Page, Locator } from "@playwright/test";
import { HeaderComponent } from "./HeaderComponent";

/**
 * Variant 2 — Cart / Checkout header. Doc §2.
 * `<ci-header show-cart="false">` — cart icon suppressed, mega-menus stay.
 */
export class HeaderV2Cart extends HeaderComponent {
  /** Default-empty container; populates only in B2B punchout session. */
  readonly punchoutBanner: Locator;

  constructor(page: Page) {
    super(page);
    this.punchoutBanner = page.locator("ci-punchout-banner");
  }

  /** Host has `show-cart="false"` attribute. (Getter; test does the assertion.) */
  async isCartSuppressed(): Promise<boolean> {
    return (await this.root.getAttribute("show-cart")) === "false";
  }
}
