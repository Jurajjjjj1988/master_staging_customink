import type { Page, Locator } from "@playwright/test";

// Escape regex metacharacters so a category name like "Custom T-shirts (Pro)"
// can be safely interpolated into `new RegExp`. Inline (one-line body) keeps
// the POM self-contained.
const escapeRegex = (s: string): string =>
  s.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

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
    // Doc §1.7 #10: the DOM emits TWO cart instances (mobile slot + desktop
    // slot, toggled via CSS `display: none` at the breakpoint). A plain role
    // match — or `.first()` — resolves to the hidden mobile slot on desktop
    // viewports, causing visibility-gated assertions and `.click()` to fail.
    // `.filter({ visible: true })` collapses to the breakpoint-visible slot.
    this.cart = this.root
      .getByRole("link", { name: /^cart\b/i })
      .filter({ visible: true });
    this.signInLink = this.root.getByRole("link", { name: /^sign in$/i });
    // "My Account" may render outside ci-header* (page-level) or as a link
    // not a button — try button-in-root, button-page-wide, link-page-wide.
    this.accountMenuButton = this.root
      .getByRole("button", {
        name: /^my account$|open\s+(sign in|account|user)\s+menu/i,
      })
      .or(
        page.getByRole("button", {
          name: /^my account$|open\s+(sign in|account|user)\s+menu/i,
        }),
      )
      .or(page.getByRole("link", { name: /^my account$/i }));
    // The favorites <a> has BOTH accessible name "Favorites" AND
    // aria-label="Favorites", AND doc §1.7 #10 documents the dual-slot DOM
    // pattern (mobile + desktop instances, breakpoint-toggled via CSS).
    // `.first()` lands on the hidden mobile slot on desktop viewports, so
    // visibility-gated assertions (e.g. guest empty-state) fail.
    // `.filter({ visible: true })` collapses both the role/label duplicate
    // AND the dual-slot duplicate to one node per viewport.
    this.favorites = this.root
      .getByRole("link", { name: /^favorites$/i })
      .or(this.root.getByLabel(/favorites/i))
      .filter({ visible: true });
    this.headerPhone = this.root.locator('a[href^="tel:"]').first();
  }

  /** Locate any header nav link by its accessible name. */
  navItem(name: string): Locator {
    return this.root.getByRole("link", { name });
  }

  /**
   * Locate a mega-menu trigger button by the menu name (carries
   * `aria-expanded`). The header hydration model emits two host elements
   * (`ci-header-prerender` and `ci-header`) and Stencil scopes the inner
   * trigger twice during the swap, so the role lookup can match 2+ elements
   * mid-hydration. `.first()` collapses to the canonical one — required so
   * the focused element and the polled-on element are the same node when
   * `openMegaMenu` activates and a follow-up `toHaveAttribute` asserts.
   */
  megaMenuTrigger(name: string): Locator {
    return this.root
      .getByRole("button", {
        name: new RegExp(`Open ${escapeRegex(name)} menu`, "i"),
      })
      .first();
  }

  /**
   * Open a mega-menu via keyboard activation on the caret `<button>`.
   *
   * Why not hover: on the current condensed-desktop build the caret button has
   * computed `pointer-events: none` AND a sibling `<a class="ciHeader-subNav-link">`
   * overlays the same area, so Playwright's hover refuses with
   * "subtree intercepts pointer events". Live probe (2026-05-26) confirmed:
   *   - hover / hover{force} / dispatchEvent pointerenter / mouse.move all leave
   *     aria-expanded="false".
   *   - focus() + Enter flips aria-expanded="true" and renders the panel.
   * Keyboard activation also matches the WCAG 2.1.1 keyboard-accessibility path,
   * so this POM mirrors the assistive-tech user, not just a mouse user.
   */
  async openMegaMenu(name: string): Promise<void> {
    const trigger = this.megaMenuTrigger(name);
    await trigger.focus();
    await this.page.keyboard.press("Enter");
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
