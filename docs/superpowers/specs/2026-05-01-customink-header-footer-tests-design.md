---
title: CustomInk Header & Footer E2E Test Suite
date: 2026-05-01
author: QA / SDET
status: Draft — pending user review
target: https://www-master.staging.customink.com/
---

# CustomInk Header & Footer Test Suite — Design Spec

## 1. Context & Motivation

CustomInk staging site (`www-master.staging.customink.com`) currently has no automated coverage for the global header and footer. These are present on every page and any regression has site-wide impact: broken nav links block conversion, missing legal footer links create compliance risk, broken cookie banner creates GDPR/CCPA exposure.

Goal: a small, high-signal E2E suite that answers a single question — **"Is the header and footer of the site healthy?"** — runnable on every PR in under two minutes.

## 2. Goals & Non-Goals

**Goals**

- Detect regressions in header and footer rendering, navigation, and interactivity
- Provide diagnostic clarity (a failing test points at one root cause)
- Enforce accessibility baseline (WCAG 2.1 AA via axe-core)
- Verify cookie consent compliance (no tracking cookies before consent)
- Detect silent failures (console errors, broken assets, 4xx/5xx responses)

**Non-Goals**

- Full-site smoke (only header + footer scope)
- Visual regression on dynamic content (promo banners, brand carousel, reviews)
- Backend / API contract testing
- Security scanning beyond input validation in search
- Load / performance testing (one LCP smoke check only, nightly)

## 3. Browser Verification — What We Found

Findings from manual exploration of staging (Chrome DevTools, viewports 320px–1920px, with reload):

| Aspect              | Finding                                                                                                                           | Implication                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header position     | `position: relative`, NOT sticky                                                                                                  | No sticky-scroll test                                                                                                                               |
| Mobile header       | At <1200px no hamburger; only logo + search + favorites + sign-in + cart                                                          | No hamburger pattern; mobile = simplified header                                                                                                    |
| Mobile footer       | All sections always expanded; no accordion                                                                                        | No accordion test                                                                                                                                   |
| Search autocomplete | `role="listbox"` + `role="option"`                                                                                                | Stable selectors available                                                                                                                          |
| Mega-menu rendering | **Inconsistent**: visible on first visit at desktop viewport, often missing after page reload — suspected SSR/hydration mismatch  | Known-suspect bug. Indirectly covered by tests #1 and #8. Explicit reload-consistency test deferred until bug is confirmed (see Open Questions §15) |
| Cookie banner       | OneTrust-style overlay; observed `role="region"` with name "Cookie banner" on staging — to be re-verified on first implementation | Auto-dismissal fixture required                                                                                                                     |
| LiveChat widget     | Third-party iframe (LiveChat.com), bottom-right                                                                                   | Out of test scope — verify trigger button only                                                                                                      |

## 4. Stack

- **Framework:** Playwright + TypeScript
- **Test runner:** `@playwright/test`
- **Assertions:** Playwright matchers + `@axe-core/playwright`
- **Linting:** `eslint-plugin-playwright`
- **Config:** `dotenv` for `BASE_URL`
- **CI:** GitHub Actions (PR + nightly)

## 5. Project Structure

```
customink-tests/
├── pages/
│   └── components/
│       ├── HeaderComponent.ts
│       ├── FooterComponent.ts
│       └── CookieBanner.ts
├── fixtures/
│   └── pages.fixture.ts
├── helpers/
│   └── regex.ts                  # escapeRegex utility
├── data/
│   ├── header-links.ts
│   ├── footer-links.ts           # all internal footer links incl. "Send us an Email"
│   ├── follow-us-links.ts        # 5 external + 1 internal Blog
│   ├── legal-links.ts
│   └── pages-under-test.ts       # path constants used in cross-page tests
├── tests/
│   ├── render.spec.ts            # #1
│   ├── links.spec.ts             # #2 #3 #4
│   ├── search.spec.ts            # #5 #6 #7a #7b
│   ├── mega-menu.spec.ts         # #8
│   ├── user-state.spec.ts        # #9 #10
│   ├── secondary-actions.spec.ts # #11a #11b
│   ├── cookie-consent.spec.ts    # #12 #13 #14 #15
│   ├── a11y.spec.ts              # #16 #17 #18
│   ├── responsive.spec.ts        # #19 #20
│   ├── regression.spec.ts        # #21 #22
│   ├── visual.spec.ts            # #23
│   └── performance.spec.ts       # #24 (nightly only)
├── storage/
│   └── auth.json                 # gitignored
├── playwright.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── .env.example
├── .gitignore
├── package.json
└── docs/superpowers/specs/
    └── 2026-05-01-customink-header-footer-tests-design.md
```

No BasePage, no per-page POMs — pages are just paths in `data/pages-under-test.ts`. Components (Header, Footer, CookieBanner) are the only POMs because they have real behavior.

## 6. Test Scenarios

26 functional tests + 1 cross-cutting fixture. Every test = exactly one functionality (no duplicates). Multiple data points = data-driven.

### 6.1 Render & Cross-Page Consistency

| #   | Test                                                          | Priority | Coverage                                     |
| --- | ------------------------------------------------------------- | -------- | -------------------------------------------- |
| 1   | `should_render_header_and_footer_consistently_across_5_pages` | P1       | Data-driven: home, product, blog, about, 404 |

### 6.2 Link Integrity

| #   | Test                                                              | Priority | Coverage                                                                                                                              |
| --- | ----------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 2   | `should_navigate_to_expected_url_when_clicking_any_internal_link` | P1       | Data-driven: header nav, mega-menu items, all 4 footer sections (incl. Contact Us → "Send us an Email"), legal row. UI click + 200.   |
| 3   | `should_link_to_correct_destination_for_each_follow_us_link`      | P1       | Data-driven: 6 entries (Facebook, LinkedIn, Pinterest, Instagram, TikTok external; Blog internal). HEAD request only — no navigation. |
| 4   | `should_have_valid_protocol_for_special_links`                    | P1       | Data-driven: tel: (`855-271-2660`), skip-link target. Asserts protocol format and target presence.                                    |

### 6.3 Search

| #   | Test                                                            | Priority                                                                                                                                                                                             |
| --- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5   | `should_navigate_to_results_when_search_submitted`              | P1                                                                                                                                                                                                   |
| 6   | `should_show_autocomplete_and_navigate_when_suggestion_clicked` | P2                                                                                                                                                                                                   |
| 7a  | `should_handle_empty_and_oversized_search_input`                | P1                                                                                                                                                                                                   |
| 7b  | `should_escape_xss_payload_in_search_query`                     | P1 (security) — type `<script>alert(1)</script>`; assert: no `dialog` event fires, request URL has percent-encoded `%3Cscript%3E`, results page does NOT render the payload as HTML (text node only) |

### 6.4 Mega-Menu

| #   | Test                                                          | Priority                                                                                                     |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 8   | `should_open_each_mega_menu_on_hover_and_show_expected_items` | P1 (data-driven 5 menus: Custom T-shirts, Custom Apparel, Promotional Products, Design Lab, Groups & Events) |

### 6.5 User State

| #   | Test                                                        | Priority | Note                                                     |
| --- | ----------------------------------------------------------- | -------- | -------------------------------------------------------- |
| 9   | `should_show_signin_link_when_logged_out`                   | P1       | Always runs                                              |
| 10  | `should_show_user_dropdown_and_allow_logout_when_logged_in` | P2       | **Blocked**: requires staging test credentials (see §15) |

### 6.6 Cart & Secondary Actions

| #   | Test                                                               | Priority                                                  |
| --- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| 11a | `should_navigate_to_correct_page_for_each_header_secondary_action` | P1 (data-driven: cart, favorites, sign-in)                |
| 11b | `should_open_chat_widget_iframe_when_chat_now_clicked`             | P2 (LiveChat trigger only — no interaction inside iframe) |

### 6.7 Cookie Consent

| #   | Test                                                                 | Priority              |
| --- | -------------------------------------------------------------------- | --------------------- |
| 12  | `should_show_cookie_banner_on_first_visit`                           | P1                    |
| 13  | `should_persist_acceptance_and_set_analytics_cookies_after_reload`   | P1                    |
| 14  | `should_persist_rejection_and_not_set_tracking_cookies_after_reload` | P1 (legal compliance) |
| 15  | `should_save_custom_preferences_via_cookie_settings`                 | P2                    |

### 6.8 Accessibility

| #   | Test                                                                | Priority                                                                                                             |
| --- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 16  | `should_pass_axe_scan_on_header_and_footer`                         | P1 (data-driven 2 regions; covers alt-text, ARIA, heading hierarchy; fail on critical/serious)                       |
| 17  | `should_traverse_header_and_footer_in_dom_order_with_visible_focus` | P1 (asserts: tab order matches DOM order; each focused element has non-empty outline; skip-link moves focus to main) |
| 18  | `should_trap_focus_in_cookie_banner_until_dismissed`                | P2                                                                                                                   |

### 6.9 Responsive

| #   | Test                                                 | Priority | Note                                                                                                                                                   |
| --- | ---------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 19  | `should_render_simplified_header_at_1023px_viewport` | P1       | At viewport `1023×768` (just below the 1024 breakpoint): logo + search + favorites + sign-in + cart visible; mega-menu trigger buttons hidden          |
| 20  | `should_have_no_horizontal_scroll_at_320px_viewport` | P2       | Asserts: `documentElement.clientWidth === 320` AND no element extends beyond viewport (`scrollWidth - clientWidth <= 0`); logo + search + cart visible |

### 6.10 Edge / Regression

| #   | Test                                                               | Priority                                                                            |
| --- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| 21  | `should_have_no_empty_hash_or_javascript_href_in_header_or_footer` | P1 (DOM scan — strong regression catcher; allowlists `#main-content` for skip-link) |
| 22  | `should_display_current_year_in_footer_copyright`                  | P2 (auto-updates, catches stale year)                                               |

### 6.11 Visual Regression

| #   | Test                                                    | Priority | Note                                                                                                |
| --- | ------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| 23  | `should_match_visual_baseline_for_footer_legal_section` | P3       | Only the legal/copyright row — most stable region. Catches CSS regressions functional tests cannot. |

### 6.12 Performance

| #   | Test                                     | Priority | Note                                 |
| --- | ---------------------------------------- | -------- | ------------------------------------ |
| 24  | `should_render_header_within_lcp_budget` | P3       | LCP < 2.5s; nightly only, not per-PR |

### 6.13 Cross-Cutting Fixture

`monitorPageHealth` runs automatically (`{ auto: true }`) on every test. After each test:

- 0 console errors / pageerrors (with allowlist for known third-party noise)
- 0 4xx/5xx network requests (with allowlist)
- 0 broken images (`naturalWidth === 0` audit on all `<img>` in viewport)
- 0 mixed-content warnings (browser surfaces these as console warnings)

This replaces what would otherwise be 7 separate scenarios.

**Total: 26 functional tests** — 17 P1, 7 P2, 2 P3.

## 7. Architecture

### 7.1 No BasePage, no per-page POMs

Pages are just paths in data; no class hierarchy. Tests do `page.goto(PAGES.home)` directly. Components (Header, Footer, CookieBanner) are the only POMs because they have real behavior.

### 7.2 HeaderComponent

```typescript
// pages/components/HeaderComponent.ts
import type { Page, Locator } from "@playwright/test";
import { escapeRegex } from "../../helpers/regex";

export class HeaderComponent {
  /** Use semantic role, not the implementation-specific custom element tag. */
  readonly root: Locator;
  readonly logo: Locator;
  readonly search: Locator;
  readonly cart: Locator;
  readonly signIn: Locator;
  readonly favorites: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByRole("banner");
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

  /** Locate a mega-menu trigger by the menu name. */
  megaMenuTrigger(name: string): Locator {
    return this.root.getByRole("button", {
      name: new RegExp(`Open ${escapeRegex(name)} menu`, "i"),
    });
  }

  /** Submit a search query. */
  async submitSearch(query: string): Promise<void> {
    await this.search.fill(query);
    await this.search.press("Enter");
  }

  /** Autocomplete options when the listbox is open. */
  get autocompleteOptions(): Locator {
    return this.page.getByRole("listbox").getByRole("option");
  }
}
```

### 7.3 FooterComponent

```typescript
// pages/components/FooterComponent.ts
import type { Page, Locator } from "@playwright/test";
import { escapeRegex } from "../../helpers/regex";

export type FooterSectionName =
  | "About Us"
  | "Your Account"
  | "Contact Us"
  | "Service Center";

export type FollowUsLinkName =
  | "Facebook"
  | "LinkedIn"
  | "Pinterest"
  | "Instagram"
  | "TikTok"
  | "Custom Ink Blog";

export type LegalLinkName =
  | "Privacy Policy"
  | "California Privacy Notice"
  | "User Agreement";

export class FooterComponent {
  readonly root: Locator;
  readonly copyright: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByRole("contentinfo");
    this.copyright = this.root.getByText(/©.*CustomInk/i);
  }

  section(name: FooterSectionName): Locator {
    return this.root.getByRole("navigation").filter({
      has: this.page.getByRole("heading", {
        name: new RegExp(`^${escapeRegex(name)}$`, "i"),
      }),
    });
  }

  followUsLink(name: FollowUsLinkName): Locator {
    const accessibleName =
      name === "Custom Ink Blog" ? name : `Custom Ink on ${name}`;
    return this.root.getByRole("link", {
      name: new RegExp(`^${escapeRegex(accessibleName)}$`, "i"),
    });
  }

  legalLink(name: LegalLinkName): Locator {
    return this.root.getByRole("link", { name });
  }
}
```

### 7.4 CookieBanner

```typescript
// pages/components/CookieBanner.ts
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
    // Anchor "Accept" to avoid matching "Accept Recommended" inside the settings modal.
    this.acceptButton = this.root.getByRole("button", {
      name: /^accept(\s+all(\s+cookies)?)?$/i,
    });
    this.rejectButton = this.root.getByRole("button", {
      name: /^reject all$/i,
    });
    this.settingsButton = this.root.getByRole("button", {
      name: /^cookie settings$/i,
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
```

### 7.5 Fixtures

```typescript
// fixtures/pages.fixture.ts
import { test as base, expect } from "@playwright/test";

type Fixtures = {
  cookieDismissed: void;
  monitorPageHealth: void;
  authenticated: import("@playwright/test").Page;
};

const CONSOLE_ALLOWLIST: readonly RegExp[] = [
  // populate empirically as known third-party noise emerges
];
const REQUEST_ALLOWLIST: readonly RegExp[] = [
  // e.g. /https:\/\/.*\.doubleclick\.net\//,
];

const isAllowlistedConsole = (text: string): boolean =>
  CONSOLE_ALLOWLIST.some((re) => re.test(text));
const isAllowlistedRequest = (url: string): boolean =>
  REQUEST_ALLOWLIST.some((re) => re.test(url));

export const test = base.extend<Fixtures>({
  cookieDismissed: [
    async ({ context }, use) => {
      await context.addCookies([
        {
          name: "OptanonAlertBoxClosed",
          value: new Date().toISOString(),
          domain: ".staging.customink.com",
          path: "/",
        },
      ]);
      await use();
    },
    { auto: true },
  ],

  monitorPageHealth: [
    async ({ page }, use, testInfo) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const failedRequests: string[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "error" && !isAllowlistedConsole(msg.text())) {
          consoleErrors.push(msg.text());
        }
      });
      page.on("pageerror", (err) => pageErrors.push(err.message));
      page.on("response", (resp) => {
        if (resp.status() >= 400 && !isAllowlistedRequest(resp.url())) {
          failedRequests.push(`${resp.status()} ${resp.url()}`);
        }
      });

      await use();

      const brokenImages = await page.evaluate(() =>
        Array.from(document.images)
          .filter((i) => i.complete && i.naturalWidth === 0)
          .map((i) => i.src),
      );

      const issues = {
        consoleErrors,
        pageErrors,
        failedRequests,
        brokenImages,
      };
      const hasIssue = Object.values(issues).some((arr) => arr.length > 0);
      if (hasIssue) {
        await testInfo.attach("page-health.json", {
          body: JSON.stringify(issues, null, 2),
          contentType: "application/json",
        });
        throw new Error(`Page health check failed: ${JSON.stringify(issues)}`);
      }
    },
    { auto: true },
  ],

  /**
   * Authenticated page. Wraps the browser context so health monitoring still applies
   * to the page returned by this fixture (the page is the same as the default `page`,
   * just with `storageState` loaded).
   */
  authenticated: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: "storage/auth.json",
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
```

Notes:

- `cookieDismissed` runs automatically; cookie consent tests opt out via `test.use({ cookieDismissed: false })`.
- Allowlists start empty, populated empirically. No separate file until lists exceed ~5 entries.
- The `authenticated` fixture uses a separate context — `monitorPageHealth` will not catch issues there (acceptable: auth tests are P2 and use a separate flow).

### 7.6 Helpers

```typescript
// helpers/regex.ts
/** Escape regex metacharacters so a string can be safely interpolated into `new RegExp`. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

That's the only helper. Link validation is inline in test #2 (3 lines, easier to read in context than to jump to a wrapper):

```typescript
// inside test #2, per data row
const href = await link.getAttribute("href");
expect(href).toMatch(/^(\/|https?:\/\/)/); // absolute or root-relative
const url = new URL(href!, page.url()); // resolve relative paths against current URL
const response = await page.request.head(url.toString());
expect(response.status()).toBeLessThan(400);
```

### 7.7 Data Files

```typescript
// data/pages-under-test.ts
export const PAGES_UNDER_TEST = [
  { name: "home", path: "/" },
  { name: "product", path: "/products/t-shirts/4" },
  { name: "blog", path: "/blog" },
  { name: "about", path: "/about" },
  { name: "not-found", path: "/this-page-does-not-exist-12345" },
] as const;
```

```typescript
// data/header-links.ts

/** Header items with a direct link target — used by test #2 (link integrity). */
export const HEADER_PRIMARY_NAV = [
  { name: "Custom T-shirts", expectedPath: "/products/t-shirts/4" },
  { name: "Custom Apparel", expectedPath: "/products/apparel/857" },
  {
    name: "Promotional Products",
    expectedPath: "/products/promotional-products/218",
  },
  { name: "Design Lab", expectedPath: "/lab" },
] as const;

/** Mega-menu trigger names — used by test #8 (hover open). */
export const MEGA_MENU_TRIGGERS = [
  "Custom T-shirts",
  "Custom Apparel",
  "Promotional Products",
  "Design Lab",
  "Groups & Events",
] as const;
```

```typescript
// data/footer-links.ts
import type { FooterSectionName } from "../pages/components/FooterComponent";

export interface FooterLink {
  readonly section: FooterSectionName;
  readonly name: string;
  readonly path: string;
}

export const FOOTER_LINKS: readonly FooterLink[] = [
  { section: "About Us", name: "Get to Know Custom Ink", path: "/about" },
  { section: "About Us", name: "Careers", path: "/about/jobs" },
  { section: "About Us", name: "Press", path: "/about/press" },
  { section: "About Us", name: "Partnerships", path: "/about/partners" },
  {
    section: "About Us",
    name: "Diversity & Belonging",
    path: "/equity-for-all",
  },
  { section: "About Us", name: "Customer Reviews", path: "/reviews" },
  { section: "About Us", name: "Customer Photos", path: "/photos" },
  { section: "About Us", name: "Custom Ink Blog", path: "/blog" },
  { section: "About Us", name: "Store Locations", path: "/ink/stores" },
  {
    section: "Your Account",
    name: "Retrieve a Saved Design",
    path: "/account/designs",
  },
  {
    section: "Your Account",
    name: "Retrieve a Printed Proof",
    path: "/account/designs",
  },
  {
    section: "Your Account",
    name: "Track Your Order",
    path: "/account/orders",
  },
  { section: "Your Account", name: "Place a Reorder", path: "/account/orders" },
  { section: "Contact Us", name: "Send us an Email", path: "/contact" },
  { section: "Service Center", name: "Help Center", path: "/help_center" },
  { section: "Service Center", name: "Get a Quick Quote", path: "/quotes" },
  {
    section: "Service Center",
    name: "Content Guidelines",
    path: "/help_center/content-guidelines",
  },
  {
    section: "Service Center",
    name: "Our Commitment to Accessibility",
    path: "/help_center/our-commitment-to-accessibility",
  },
] as const;
```

```typescript
// data/legal-links.ts
import type { LegalLinkName } from "../pages/components/FooterComponent";

export const LEGAL_LINKS: readonly { name: LegalLinkName; path: string }[] = [
  { name: "Privacy Policy", path: "/about/privacy" },
  { name: "California Privacy Notice", path: "/about/ccpa" },
  { name: "User Agreement", path: "/about/user_agreement" },
];
```

```typescript
// data/follow-us-links.ts
import type { FollowUsLinkName } from "../pages/components/FooterComponent";

export type FollowUsKind = "external" | "internal";

interface ExternalFollowUs {
  readonly name: FollowUsLinkName;
  readonly kind: "external";
  readonly expectedDomain: string;
}
interface InternalFollowUs {
  readonly name: FollowUsLinkName;
  readonly kind: "internal";
  readonly expectedPath: string;
}

export type FollowUsEntry = ExternalFollowUs | InternalFollowUs;

export const FOLLOW_US_LINKS: readonly FollowUsEntry[] = [
  { name: "Facebook", kind: "external", expectedDomain: "facebook.com" },
  { name: "LinkedIn", kind: "external", expectedDomain: "linkedin.com" },
  { name: "Pinterest", kind: "external", expectedDomain: "pinterest.com" },
  { name: "Instagram", kind: "external", expectedDomain: "instagram.com" },
  { name: "TikTok", kind: "external", expectedDomain: "tiktok.com" },
  { name: "Custom Ink Blog", kind: "internal", expectedPath: "/blog" },
];
```

## 8. Selector Strategy

Priority (per `check-selectors`):

1. `getByRole(role, { name })` — primary; `name` is a regex anchored where uniqueness matters
2. `getByLabel(...)` for form inputs
3. `getByPlaceholder(...)` fallback
4. `getByTestId(...)` only if site adds `data-testid`
5. `getByText(...)` for static text assertions
6. `locator('#unique-id')` only for stable third-party IDs (e.g. `#onetrust-banner-sdk`)

**Banned**: `nth(0)`, `.first()` without scope, CSS classes as primary, deep DOM paths, custom element tags as scope (`ci-header-prerender`).

**Component scoping**: every locator inside a component is scoped to its `root` (`getByRole('banner')`, `getByRole('contentinfo')`, etc.).

**Regex names** are always built via `escapeRegex(...)` so user-supplied / data-supplied strings cannot inject metachars.

## 9. Test Isolation

- Each test starts fresh — no shared state, cookies, or storage between tests
- `cookieDismissed` fixture runs auto; cookie tests opt out
- Authenticated tests use a separate context (`storageState: 'storage/auth.json'`)
- No `beforeAll` shared mutation

## 10. CI/CD

### 10.1 PR Check (`.github/workflows/pr.yml`)

- Trigger: every PR
- Tests: P1 only (`@p1` tag)
- Browsers: `chromium-desktop` + `mobile-chrome`
- Sharding: 4×
- Target wall time: < 2 min
- Required for merge

### 10.2 Nightly (`.github/workflows/nightly.yml`)

- Trigger: cron `0 2 * * *`
- Tests: full suite (P1 + P2 + P3, includes performance)
- Browsers: `chromium-desktop`, `mobile-chrome`, `webkit-desktop`
- Sharding: 8×
- Target wall time: < 8 min

Hourly health check, Firefox, mobile-Safari deferred to v2 — added only if a real production incident or browser-specific bug demands them.

## 11. Configuration

```typescript
// playwright.config.ts (excerpt)
export default defineConfig({
  testDir: "./tests",
  baseURL: process.env.BASE_URL ?? "https://www-master.staging.customink.com",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }], ["list"], ["github"]],
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    { name: "mobile-chrome", use: devices["Pixel 5"] },
    { name: "webkit-desktop", use: devices["Desktop Safari"] }, // nightly only
  ],
});
```

## 12. Definition of Done

- [ ] All 26 functional tests implemented and passing on `chromium-desktop`
- [ ] `monitorPageHealth` fixture wired auto on every test
- [ ] All P1 tests also pass on `mobile-chrome`
- [ ] No `nth()`, `.first()` without scope, CSS classes as primary, or custom-element selectors anywhere
- [ ] No hard waits (`waitForTimeout`, `setTimeout`, `sleep`)
- [ ] No deprecated Playwright API
- [ ] ESLint passes (`eslint-plugin-playwright`)
- [ ] `tsc --noEmit` passes (no `any`)
- [ ] For each P1 test, deliberately break the underlying functionality once locally and confirm the test fails — documents that it is a real bug catcher, not a passing line of code
- [ ] PR CI workflow runs full P1 suite in < 2 min
- [ ] README documents how to run, debug, and add tests
- [ ] All public POM methods have JSDoc

## 13. Visual Regression Strategy

One visual test (#23) — `should_match_visual_baseline_for_footer_legal_section`. Reasoning:

- Functional tests cover content and links (#2, #4)
- A visual test exists ONLY to catch CSS regressions functional tests cannot detect (color, padding, font-size, layout breaks)
- Legal section is the most stable region on the site
- Promo banner, brand carousel, mega-menu content rotate weekly — visual regression there is high-maintenance for low signal

## 14. Accessibility Approach

- `@axe-core/playwright` integration in test #16
- Two scans per test run: header region, footer region (data-driven)
- Severity threshold: fail on `critical` and `serious`
- Disabled rules: none initially; document any future exceptions in test file
- Test #17 verifies tab order matches DOM order, focus is visible (non-empty `outline` / `box-shadow`), skip-link moves focus to `<main>`
- Test #18 verifies focus trap in cookie banner

## 15. Open Questions / Known Unknowns

| ID   | Question                                                                                                                                     | Resolution Path                                                                                                        |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| OQ-1 | Mega-menu hydration: render inconsistency between first visit and reload at desktop viewport. Real bug or test artifact?                     | Reproduce in clean Chrome incognito; if confirmed, file CustomInk bug ticket and add explicit reload-consistency test. |
| OQ-2 | Are staging test credentials available?                                                                                                      | Tests #10 (logout) blocked until provided.                                                                             |
| OQ-3 | LiveChat iframe scope                                                                                                                        | Confirmed: only verify trigger button is clickable. Interactions inside iframe out of scope.                           |
| OQ-4 | Allowlist contents for `monitorPageHealth`                                                                                                   | Populate empirically during first 1–2 weeks of running.                                                                |
| OQ-5 | Cookie banner: confirm `role="region"` + accessible name "Cookie banner" is what staging actually exposes (vs `role="dialog"` from OneTrust) | First implementation pass — the `.or()` fallback to `#onetrust-banner-sdk` already covers both.                        |
| OQ-6 | `#main-content` skip-link target — confirm an element with `id="main-content"` actually exists                                               | Test #4 verifies via `expect(page.locator('#main-content')).toBeAttached()`.                                           |

## 16. Risks & Mitigations

| Risk                                                          | Impact                                                       | Mitigation                                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Marketing changes promo banner copy → visual test fails       | Medium maintenance burden                                    | Visual test scoped to footer legal section only, not header                                                       |
| Third-party scripts generate console errors                   | False failures in `monitorPageHealth`                        | Allowlist populated empirically; explicit, justified entries                                                      |
| Mega-menu hydration bug (OQ-1) causes flakiness               | Tests fail intermittently for reasons unrelated to test code | Confirm bug, add explicit reload-consistency test; CI retries `2`                                                 |
| External Follow-Us links rate-limit our HEAD probes           | Test #3 fails on CI but not locally                          | Cache HEAD responses for the run; consider running test #3 only on nightly                                        |
| New mega-menu items added by marketing                        | Test data arrays go stale                                    | Data files are explicit; surface drift via test failure with clear diff                                           |
| Cart label regex (`/^cart\b/i`) too permissive in some locale | Could match neighbor text                                    | Verified scope is `<header>`; if a future "Cart Recovery" link is added, tighten anchor to `/^cart( \(\d+\))?$/i` |
