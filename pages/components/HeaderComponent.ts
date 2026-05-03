import type { Page, Locator } from "@playwright/test";
import { escapeRegex } from "../../helpers/regex";

export class HeaderComponent {
  /**
   * Header root. The site's custom Web Components do NOT expose `role="banner"`.
   * Two variants are used in production:
   *   - `ci-header-prerender` on the homepage (server-side prerendered for fast paint)
   *   - `ci-header` on internal pages (full client-side component)
   * We match either via comma combinator. Verified stable across staging routes;
   * if a future migration replaces both, all header tests fail loudly and this
   * one-line update fixes them.
   */
  readonly root: Locator;
  readonly logo: Locator;
  readonly search: Locator;
  readonly cart: Locator;
  readonly signIn: Locator;
  readonly favorites: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator("ci-header-prerender, ci-header").first();
    this.logo = this.root.getByRole("link", { name: /customink logo/i });
    this.search = this.root.getByRole("combobox", { name: /search/i });
    // Cart label may include a count badge ("Cart (3)") when items exist.
    this.cart = this.root.getByRole("link", { name: /^cart\b/i });
    this.signIn = this.root.getByRole("link", { name: /^sign in$/i });
    this.favorites = this.root.getByRole("link", { name: /^favorites$/i });
  }

  /** Locate any header nav link by its accessible name. */
  navItem(name: string): Locator {
    return this.root.getByRole("link", { name });
  }

  /** Locate a mega-menu trigger button by the menu name. */
  megaMenuTrigger(name: string): Locator {
    return this.root.getByRole("button", {
      name: new RegExp(`Open ${escapeRegex(name)} menu`, "i"),
    });
  }

  /** Submit a search query and let navigation occur. */
  async submitSearch(query: string): Promise<void> {
    await this.search.fill(query);
    await this.search.press("Enter");
  }

  /** Autocomplete options when the listbox is open. */
  get autocompleteOptions(): Locator {
    return this.page.getByRole("listbox").getByRole("option");
  }
}
