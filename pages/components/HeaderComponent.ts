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
  /** Sign-In link visible to logged-out users; hidden once the user logs in. */
  readonly signInLink: Locator;
  /**
   * Account dropdown trigger. The Web Component renders this caret button next
   * to the Sign-In link for logged-out users and as a standalone account menu
   * for logged-in users.
   */
  readonly accountMenuButton: Locator;
  /** Backwards-compat alias — prefer `signInLink` for new tests. */
  readonly signIn: Locator;
  readonly favorites: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator("ci-header-prerender, ci-header").first();
    this.logo = this.root.getByRole("link", { name: /customink logo/i });
    // The visible search field has role="searchbox" inside a role="combobox" wrapper;
    // we want the inner input element so `fill()` works.
    this.search = this.root.getByRole("searchbox", { name: /search/i });
    // Cart label may include a count badge ("Cart (3)") when items exist.
    this.cart = this.root.getByRole("link", { name: /^cart\b/i });
    this.signInLink = this.root.getByRole("link", { name: /^sign in$/i });
    this.accountMenuButton = this.root.getByRole("button", {
      name: /open\s+(sign in|account|user)\s+menu/i,
    });
    this.signIn = this.signInLink;
    this.favorites = this.root.getByRole("link", { name: /^favorites$/i });
  }

  /** Locate any header nav link by its accessible name. */
  navItem(name: string): Locator {
    return this.root.getByRole("link", { name });
  }

  /** Locate a mega-menu trigger button by the menu name (carries `aria-expanded`). */
  megaMenuTrigger(name: string): Locator {
    return this.root.getByRole("button", {
      name: new RegExp(`Open ${escapeRegex(name)} menu`, "i"),
    });
  }

  /**
   * Open a mega-menu by hovering the primary nav element. Most items render as a
   * clickable `<a>` plus an adjacent caret `<button>` — hovering the link mirrors
   * the user path (the caret is intercepted by the link). Some items, notably
   * "Groups & Events", render as a single `<button>` with no link companion;
   * for those we hover the button directly.
   */
  async openMegaMenu(name: string): Promise<void> {
    const namePattern = new RegExp(`^${escapeRegex(name)}$`, "i");
    const link = this.root.getByRole("link", { name: namePattern }).first();
    if ((await link.count()) > 0) {
      await link.hover();
      return;
    }
    await this.root.getByRole("button", { name: namePattern }).first().hover();
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
