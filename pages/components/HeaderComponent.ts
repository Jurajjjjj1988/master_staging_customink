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
   * Account dropdown trigger. Logged-out users see a caret button next to the
   * Sign-In link with accessible name "Open Sign In menu" (or similar).
   * Logged-in users see a standalone "My Account" button — observed on
   * staging 2026-05-03. The regex covers both states.
   */
  readonly accountMenuButton: Locator;
  /** Header favorites link. Anonymous: hidden / Sign-In gated. Logged-in: heart icon in the header strip linking to /products/favorites. */
  readonly favorites: Locator;
  /**
   * Header support phone (`tel:` link). Lives in the "Need Help? We've Got You"
   * support strip when shown — observed on staging 2026-05-03 (e.g. 844-222-8343).
   * Distinct from the footer phone; CALL edge tests assert both agree on format.
   */
  readonly headerPhone: Locator;

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
      name: /^my account$|open\s+(sign in|account|user)\s+menu/i,
    });
    this.favorites = this.root
      .getByRole("link", { name: /^favorites$/i })
      .or(this.root.getByLabel(/favorites/i));
    this.headerPhone = this.root.locator('a[href^="tel:"]').first();
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
