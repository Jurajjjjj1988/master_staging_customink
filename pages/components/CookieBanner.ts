import type { Page, Locator } from "@playwright/test";

export class CookieBanner {
  /**
   * OneTrust banner. Primary selector is semantic; fallback to the stable OneTrust ID
   * (`#onetrust-banner-sdk`) if the `region` role is absent in production markup.
   */
  readonly root: Locator;
  readonly acceptButton: Locator;
  readonly rejectButton: Locator;
  readonly settingsButton: Locator;

  constructor(page: Page) {
    this.root = page
      .getByRole("region", { name: /cookie banner/i })
      .or(page.locator("#onetrust-banner-sdk"));
    // CustomInk's OneTrust banner uses "Accept Cookies" / "Reject All" / "Cookie Settings".
    // Regexes are anchored to avoid matching "Accept Recommended" inside the preference center.
    this.acceptButton = this.root.getByRole("button", {
      name: /^accept(\s+(all|cookies|all\s+cookies))?$/i,
    });
    this.rejectButton = this.root.getByRole("button", {
      name: /^reject(\s+all)?$/i,
    });
    this.settingsButton = this.root.getByRole("button", {
      name: /^(cookie\s+)?settings$/i,
    });
  }

  async accept(): Promise<void> {
    await this.acceptButton.click();
  }
  async reject(): Promise<void> {
    await this.rejectButton.click();
  }
  async openSettings(): Promise<void> {
    await this.settingsButton.click();
  }
}
