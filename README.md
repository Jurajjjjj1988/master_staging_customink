# CustomInk Header & Footer Test Suite

End-to-end tests for the global header and footer of [CustomInk](https://www.customink.com) — the parts of the site that ship on every page. Playwright + TypeScript against staging.

## Quick start

```bash
npm install
npx playwright install chromium
cp .env.example .env
npm run test:p1
```

## What we test per state

The suite is organised by **user state** because the header chrome differs depending on whether the user is signed in:

| Header chrome | Anonymous user                                                                | Logged-in user                                         |
| ------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| Auth control  | "Sign In" link (avatar dropdown opens panel with Sign In + Create An Account) | "My Account" button (dropdown with 9 items + Sign Out) |
| Heart icon    | not shown in header strip                                                     | visible — direct path to `/products/favorites`         |
| Cart icon     | shown — guest cart                                                            | shown — server-persisted cart                          |
| Phone strip   | "Need Help? — 844-222-8343 or Chat Now" — same in both states                 | same                                                   |

The same conceptual actions (cart, favorites) behave differently across states; a few exist in only one state. The suite covers both.

**Anonymous user (block 1)** — runs without staging credentials, ~30 tests across 22 journeys:

- **Search**: FIND, AUTOCOMPLETE, NO-RESULTS, oversized input, Escape closes, special chars, whitespace-only
- **Help affordances**: GET HELP CALL, CHAT NOW
- **Promo strip**: PROMO BANNER Shop Sale CTA
- **Navigation**: MENU NAVIGATION, MEGA-MENU panel-stacking, MEGA-MENU Escape, LOGO → HOME
- **Cart**: CART (guest) add + line-item + non-zero total + qty recalc, CART ICON click from deep page
- **Favorites**: heart toggle / empty-state, double-toggle un-favorites
- **Auth transitions**: REGISTRATION (2 entries), LOGIN (passwordless form, invalid email, empty submit, Enter)
- **Footer**: 16 link click-throughs (auth-required links verify the `/sign_in?return_to=` chain)
- **Follow Us**: 6 social links (5 external — domain + target=\_blank check; 1 internal — Custom Ink Blog)
- **Marketing**: YouTube embed loads on play; Send-Us-Email click-through to /contact
- **Accessibility**: SKIP-LINK (Tab to first focusable, Enter, jump past header to `#main-content`)

**Logged-in user (block 2)** — gated on `storage/auth.json`, 9 journeys:

- **LOGOUT** — click Sign Out, header reverts to anonymous (widened assertion for cross-domain redirect)
- **SEARCH (logged-in)** — search behaves correctly when authenticated
- **My Account dropdown** — one journey per item (Order History, Account Settings, My Designs, My Uploads)
- **CART (persisted)** — add, reload, line item survives (bug class guest cart can't catch)
- **FAVORITES (persisted)** — heart product, navigate to `/products/favorites`, item listed (not empty state)
- **Header heart icon** — direct path to `/products/favorites` without the dropdown

## Pivot 1 — Journey × state × surface

The same conceptual journey can touch header / footer, and behave differently per user state.

| Journey                         |       State        | Header | Footer |  Cross-page  |
| ------------------------------- | :----------------: | :----: | :----: | :----------: |
| FIND (search submit)            | Guest<br>Logged-in |   ✓    |        |              |
| AUTOCOMPLETE                    | Guest<br>Logged-in |   ✓    |        |              |
| NO-RESULTS                      | Guest<br>Logged-in |   ✓    |        |              |
| GET HELP CALL (tel: link)       | Guest<br>Logged-in |   ✓    |   ✓    |              |
| CHAT NOW (LiveChat widget)      | Guest<br>Logged-in |   ✓    |        |              |
| MENU NAVIGATION (mega-menu)     | Guest<br>Logged-in |   ✓    |        |              |
| LOGO → HOME                     | Guest<br>Logged-in |   ✓    |        |              |
| CART (guest)                    |       Guest        |   ✓    |        |              |
| CART (persisted)                |     Logged-in      |   ✓    |        |              |
| FAVORITES                       |       Guest        |   ✓    |        |              |
| FAVORITES (persisted)           |     Logged-in      |   ✓    |        |              |
| Header heart icon               |     Logged-in      |   ✓    |        |              |
| REGISTRATION                    |       Guest        |   ✓    |        |              |
| LOGIN (passwordless)            |       Guest        |   ✓    |        |              |
| LOGOUT                          |     Logged-in      |   ✓    |        |              |
| ACCOUNT DROPDOWN (×4 items)     |     Logged-in      |   ✓    |        |              |
| SEARCH (authenticated context)  |     Logged-in      |   ✓    |        |              |
| FOOTER LINKS (×16 destinations) | Guest<br>Logged-in |        |   ✓    |              |
| FOLLOW US (×6 socials)          | Guest<br>Logged-in |        |   ✓    |              |
| SKIP-LINK (a11y)                | Guest<br>Logged-in |   ✓    |        |              |
| RENDER consistency              | Guest<br>Logged-in |        |        | ✓ (5 routes) |
| COOKIE BANNER                   | Guest<br>Logged-in |        |        | ✓ (3 tests)  |

## Pivot 2 — Journey × variant × state × bug-class caught

What bug would slip into production if this test didn't exist? Variant column makes happy / failure / boundary paths scannable at a glance.

| Journey                        | Variant  |       State        | Bug-class caught                                      | Asserted via                                                |
| ------------------------------ | :------: | :----------------: | ----------------------------------------------------- | ----------------------------------------------------------- |
| FIND                           | **POS**  | Guest<br>Logged-in | Algolia returns 0 hits but route resolves OK          | `productLinks.count() > 2` on `/products/t-shirts/` href    |
| FIND                           | **NEG**  | Guest<br>Logged-in | Empty submit silently navigates user away             | `page.url()` unchanged after Enter                          |
| AUTOCOMPLETE                   | **POS**  | Guest<br>Logged-in | Suggestions don't open / keyboard nav broken          | first option visible + `waitForURL` after ArrowDown+Enter   |
| NO-RESULTS                     | **POS**  | Guest<br>Logged-in | Wrong query silently lands on homepage                | `toHaveURL(NONEXISTENT)` + empty-state copy                 |
| GET HELP CALL                  | **POS**  | Guest<br>Logged-in | Phone link unclickable / wrong dialer format          | `toHaveAttribute('href', /^tel:.../)` + `toBeEnabled`       |
| PROMO BANNER                   | **POS**  | Guest<br>Logged-in | Shop Sale CTA dead                                    | `waitForURL` + sale-tagged result visible                   |
| MENU NAVIGATION (mega-menu)    | **POS**  | Guest<br>Logged-in | Panel renders marketing CTAs only, no real categories | `[href*="/products/"]` filter + URL match                   |
| MENU NAVIGATION (mega-menu)    | **EDGE** | Guest<br>Logged-in | Two panels open simultaneously (focus-trap bug)       | `aria-expanded` toggle on triggers                          |
| LOGO → HOME                    | **POS**  | Guest<br>Logged-in | Logo click broken                                     | `page.url()` is `/` after click                             |
| CART ICON → /cart              | **POS**  |       Guest        | Cart icon dead from a deep page                       | `waitForURL(/\/cart/)` + cart heading visible               |
| CART (guest)                   | **POS**  |       Guest        | Total shows $0.00 with items                          | `/\$[1-9]\d*/` regex on total                               |
| CART (guest)                   | **NEG**  |       Guest        | Empty cart silently shows zero items, no copy         | empty-state copy visible on `/cart`                         |
| CART (guest)                   | **EDGE** |       Guest        | Total stays static when qty changes                   | `textContent` before/after qty `+`                          |
| CART (persisted)               | **POS**  |     Logged-in      | Server-side cart state lost on reload                 | line item visible after `page.reload()`                     |
| FAVORITES                      | **POS**  |       Guest        | Heart toggle dead / empty page                        | favorites list / empty-state copy                           |
| FAVORITES                      | **NEG**  |       Guest        | No empty-state copy for empty favorites               | empty-state text visible                                    |
| FAVORITES (persisted)          | **POS**  |     Logged-in      | Server-side favorite lost across sessions             | item visible on `/products/favorites` after add             |
| Header heart icon              | **POS**  |     Logged-in      | Direct path to `/products/favorites` broken           | URL match after click                                       |
| REGISTRATION                   | **POS**  |       Guest        | Sign-up form ships without proper fields              | email + password + confirm fields visible                   |
| REGISTRATION                   | **NEG**  |       Guest        | Form ships without invalid-email validation           | submit invalid → validation feedback visible                |
| REGISTRATION                   | **EDGE** |       Guest        | Empty form submission accepted                        | submit blocked, stays on `/sign_up`                         |
| LOGIN                          | **POS**  |       Guest        | Form regresses from passwordless to password-based    | "Continue With Email" + OAuth + "Create an account" visible |
| LOGIN                          | **NEG**  |       Guest        | No invalid-email validation feedback                  | validation feedback visible                                 |
| LOGIN                          | **EDGE** |       Guest        | Empty submit accepted                                 | stays on `/sign_in`                                         |
| LOGOUT                         | **POS**  |     Logged-in      | Header doesn't revert to anonymous after sign-out     | `accountMenuButton` hidden + `signInLink` visible           |
| ACCOUNT DROPDOWN (×4 items)    | **POS**  |     Logged-in      | Dropdown nav items dead                               | each item: click → destination heading visible              |
| SEARCH (logged-in)             | **POS**  |     Logged-in      | Search behaves differently when authenticated         | results visible + Sign In hidden                            |
| CHAT NOW                       | **POS**  | Guest<br>Logged-in | LiveChat widget never opens                           | iframe `[title*="LiveChat"]` attached                       |
| SKIP-LINK (a11y)               | **POS**  | Guest<br>Logged-in | Keyboard users trapped behind header                  | URL contains `#main-content` after Tab+Enter                |
| FOOTER LINK (×14 normal)       | **POS**  | Guest<br>Logged-in | Link wired to `/foo` but `/foo` is 200-OK custom 404  | heading visible + `not.toHaveText(/page not found\|^404/)`  |
| FOOTER LINK (×4 auth-required) | **POS**  |       Guest        | Auth-required redirect chain broken                   | `waitForURL(/sign_in/)` + sign-in heading visible           |
| FOLLOW US (×5 external)        | **POS**  | Guest<br>Logged-in | Wrong destination domain                              | `URL.hostname` contains expected + `target=_blank`          |
| FOLLOW US (×1 internal Blog)   | **POS**  | Guest<br>Logged-in | Blog destination broken                               | click + destination heading visible                         |
| RENDER consistency (×5 routes) | **POS**  | Guest<br>Logged-in | Header / footer missing on a primary route            | both visible after each `goto`                              |
| COOKIE BANNER (first visit)    | **POS**  | Guest<br>Logged-in | Banner missing on first visit                         | banner visible                                              |
| COOKIE BANNER (acceptance)     | **POS**  | Guest<br>Logged-in | Acceptance lost on reload                             | banner hidden after reload                                  |
| COOKIE BANNER (settings)       | **POS**  | Guest<br>Logged-in | Settings dialog broken                                | save closes banner                                          |

## Pivot 3 — Test × layer / technique

Tests aren't all driven through the slowest UI layer. This shows technique depth.

| Layer / technique                                           | Tests         | Where                                                    |
| ----------------------------------------------------------- | ------------- | -------------------------------------------------------- |
| `[POM]` Page-object actions                                 | most          | `HeaderComponent` + `FooterComponent`                    |
| `[FIX]` Cookie auto-dismiss (per-context cookie)            | all anon      | `pages.fixture.ts` `cookieDismissed`                     |
| `[FIX]` `page.goto` default `waitUntil: domcontentloaded`   | all           | `pages.fixture.ts` `page` override                       |
| `[STO]` `storageState: storage/auth.json`                   | logged-in (9) | `chromium-desktop-authed` project                        |
| `[NET]` `Promise.all([waitForURL, click])` (URL as outcome) | ~25           | nav-after-click pattern across journeys                  |
| `[A11Y]` `aria-expanded` state                              | 4             | mega-menu open/close + replace                           |
| `[ALLOWLIST]` console / pageError / request allowlist       | cross-cutting | `pages.fixture.ts` `monitorPageHealth` + per-pattern why |
| Cross-domain redirect (account.staging → www-master)        | 1             | LOGOUT cross-domain hop                                  |

## Known failures

A handful of tests currently fail with speculative locators against unobserved DOM regions. Walk & Watch via Chrome DevTools MCP is the canonical fix path: record observed DOM, replace each guess with a real selector, re-run.

| Failure pattern              | Tests affected | Root-cause hypothesis                                                 |
| ---------------------------- | -------------: | --------------------------------------------------------------------- |
| Element-not-visible 30s+     |              5 | Call support, Promo banner, Cart icon, Skip-link, Chat Now            |
| Auth-required redirect chain |              5 | `waitForURL(/sign_in/)` regex doesn't match actual redirect           |
| Form locators stale          |              5 | Reg + Login pos+edge + Cart positive — DOM changed since last W&W     |
| Mega-menu locator            |              2 | menu-nav pos+edge — `/products/` filter still incomplete              |
| Favorites pos+neg            |              2 | Heart icon + empty-state copy speculative                             |
| User-state hover dropdown    |              1 | Avatar dropdown items locator broken                                  |
| External "Custom Ink Blog"   |              2 | Classified as internal in `data/footer-links.ts`, behaves as external |

## Variant policy

Each journey gets Happy + Negative + Edge variants where they add value. Variants that wouldn't catch a real failure mode (e.g. a "negative" path for clicking the logo) are deliberately omitted, not padded.

## Auth gating

Logged-in tests check `existsSync("storage/auth.json")` at file load. Without it the whole `describe("logged-in user — header journeys", ...)` block skips with:

> Skipping auth-gated journeys: storage/auth.json not present — run `npx playwright codegen --save-storage=storage/auth.json <staging-url>` once staging is healthy.

Once `storage/auth.json` exists (gitignored), the logged-in tests run automatically.

## Architecture

Four short Architecture Decision Records in [`docs/adr/`](docs/adr/README.md):

1. POM only for real components, not for pages
2. Cross-cutting page-health fixture, scope-aware
3. Custom-element selector for the header root
4. Allowlist policy with quarterly hygiene

The implementation spec is in [`docs/superpowers/specs/`](docs/superpowers/specs/), the task-level plan in [`docs/superpowers/plans/`](docs/superpowers/plans/).

## Running tests

| Command                   | Purpose                                                 |
| ------------------------- | ------------------------------------------------------- |
| `npm run check`           | Pre-push gate: typecheck + lint + P1 suite              |
| `npm test`                | Full suite against the configured `BASE_URL`            |
| `npm run test:p1`         | P1-tagged tests only (PR-gate parity)                   |
| `npm run test:flaky`      | Each P1 test repeated 5× on 2 workers — flake detection |
| `npm run test:prod-smoke` | P1 suite against the production base URL                |
| `npm run test:ui`         | Interactive UI mode for debugging                       |
| `npm run test:report`     | Open the HTML report from the last run                  |

## CI/CD

- `.github/workflows/pr.yml` — every pull request: P1 only, sharded 4×, target < 2 min
- `.github/workflows/nightly.yml` — `0 2 * * *`: full suite, sharded 8×, target < 8 min

Both workflows use `BASE_URL` from a workflow-level env var — change once, propagates to every shard.

## Site behaviors the suite accommodates

This is a real production-style site with real-world behaviors that aren't fully controllable from a test runner. Each is captured in code or data so the suite stays stable as the site evolves:

- **Lazy-hydrating Web Components.** `<ci-header-prerender>` (homepage) vs `<ci-header>` (internal pages); `<ci-full-footer>` hydrates below the fold. Shared `waitForFooterReady()` helper anchors footer-asserting tests.
- **Default `waitUntil: domcontentloaded`.** Long-tail third-party requests (CMS rotation, CORS-blocked production fetches per allowlist, lazy WC) keep the `load` event from ever firing — `domcontentloaded` is the right anchor (overridden in `pages.fixture.ts`).
- **Third-party CMS rotation.** Promo banner copy, brand carousel, customer reviews — content-asserting tests bind to invariants (the affordance, the destination URL), not the rotated copy.
- **Auth-protected and environment-specific routes.** Footer links carry a `skipHttpCheck` flag (`auth-required` for `/account/*`, `environment-specific` for routes incomplete on staging) so the suite checks structural correctness without false positives.
- **Cross-origin API calls.** Staging frontend talks to production for read-only data; CORS errors are allowlisted with explicit per-entry comments (ADR-004).
- **Algolia keyboard-driven autocomplete.** Tests use `ArrowDown` + `Enter` to mirror the library's intended UX path rather than mouse clicks on suggestion items.
- **External link rate-limiting.** Facebook and TikTok respond 4xx to non-browser HEAD/GET. For Follow Us social links the suite verifies the destination domain rather than HEAD-probing.

## Open questions

- **OQ-1** Mega-menu render after page reload occasionally falls back to the simplified header. The mega-menu navigation test absorbs this with timeout-tolerant hover.
- **OQ-2** Authenticated user-state tests skip without a `storage/auth.json` file. They run as soon as one is provided.
- **OQ-7** OneTrust banner does not implement a strict focus trap on this build. Cookie-consent tests verify the weaker WCAG 2.1.1 keyboard-operable invariant.

## Roadmap

- HEAD-probe cache for external Follow-Us link checks (mitigates rate-limit risk)
- `@duckduckgo/autoconsent` in place of the hand-rolled OneTrust dismissal cookie
- `CODEOWNERS`-driven contract diff for marketing-driven path changes (already in `.github/CODEOWNERS`)

## Possible future additions (currently out of scope)

| Dimension     |    Tests | Cut? | Rationale for re-adding                                                 |
| ------------- | -------: | ---- | ----------------------------------------------------------------------- |
| Visual        |        3 | NIE  | Stable region snapshots, low-flake risk, real layout regression catcher |
| Accessibility |        3 | NIE  | Senior signal, real WCAG bugs catcher                                   |
| Security      |       ~6 | NIE  | Real CVE / GDPR coverage                                                |
| Cross-cutting | — (auto) | NIE  | Free bug detection across whole suite                                   |
