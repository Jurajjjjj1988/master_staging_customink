# CustomInk Header & Footer Test Suite

End-to-end tests for the global header and footer of [CustomInk](https://www.customink.com) — the parts of the site that ship on every page. Built with Playwright + TypeScript against the staging environment.

This repository is the implementation artifact of a one-day take-home: spec → plan → architecture → tests → CI, with engineering decisions captured along the way.

## Quick start

```bash
npm install
npx playwright install chromium webkit
cp .env.example .env
npm run check    # typecheck + lint + P1 suite
```

## What's covered

| Section                   | Tests | Coverage in one line                                                                                                                                                |
| ------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Render & layout**       |     8 | Cross-page consistency (5 pages), logo navigation, 1023/320 breakpoints, footer visual baselines, header bounding-box positioning, LCP budget                       |
| **Navigation & links**    |   ~20 | Header nav, mega-menus (5 panels + structural + content sanity + critical CTAs), footer sections, follow-us, footer-meta, special protocols, page-wide href hygiene |
| **Search**                |    11 | Submit, autocomplete open/close, ArrowDown+Enter navigation, empty/oversized inputs, XSS escape, 5 special-character classes                                        |
| **User state**            |     3 | Logged-out Sign-In link, avatar dropdown (Sign-In + Create An Account), logged-in dropdown + logout                                                                 |
| **Marketing & support**   |     7 | Promo banner + Shop Sale CTA, phone label + tel:, Chat Now button, Send Email click-through, YouTube embed, Klaviyo container, feedback widget                      |
| **Cookie consent**        |     5 | First-visit banner, accept persistence, rejection compliance (no NEW tracking cookies), settings save, keyboard operability                                         |
| **Accessibility**         |     3 | axe-core scan on header AND footer (WCAG 2.1 AA), skip-link reachability + visible focus styling                                                                    |
| **Page quality**          |    13 | Copyright year, SEO `<head>` essentials (×5), duplicate IDs, alt text, button accessible names, JSON-LD validity, robots.txt + sitemap discovery                    |
| **Helpers (unit)**        |     5 | `escapeRegex` correctness — used by every name-regex selector in the suite                                                                                          |
| **Cross-cutting fixture** |     — | `monitorPageHealth` runs on every test: console errors + warnings, 4xx/5xx, broken images, mixed content                                                            |

**Total: 49 functional scenarios + 1 cross-cutting fixture, 88 P1 tests when expanded across data-driven cases.**

### By priority

| Priority | Tests | What it gates                                                                                    |
| -------- | ----: | ------------------------------------------------------------------------------------------------ |
| P1       |    32 | PR check; deploy blocker. Every linked-revenue path or a11y-baseline test.                       |
| P2       |    15 | Nightly. Important but not deploy-blocking (autocomplete UX, settings, marketing surfaces).      |
| P3       |     2 | Nightly only. Visual baselines + LCP budget — informational signals on trend, not gating checks. |

### By dimension

| Dimension     | Coverage source                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| Functional    | All sections above except Performance and Visual                                                                     |
| Visual        | 2 region snapshots (footer legal row, footer Follow-Us icons row) + 1 bounding-box layout test                       |
| Accessibility | axe-core scan ×2 (header + footer), keyboard navigation, cookie banner keyboard operability, alt text + button names |
| Performance   | Header LCP < 3 s (P3 nightly only)                                                                                   |
| Security      | XSS escape in search, no `javascript:` hrefs anywhere, no tracking cookies post-rejection                            |
| SEO           | `<head>` essentials (title, description, canonical, og:image, viewport), JSON-LD validity, robots.txt + sitemap      |
| Cross-cutting | `monitorPageHealth` runs on every test (console errors + warnings + 4xx/5xx + broken images + mixed content)         |

### By Playwright project

| Project            | Browser            | Viewport   | When it runs                                        |
| ------------------ | ------------------ | ---------- | --------------------------------------------------- |
| `chromium-desktop` | Chromium           | 1440 × 900 | PR + nightly                                        |
| `mobile-chrome`    | Chromium (Pixel 5) | mobile     | PR + nightly                                        |
| `mobile-safari`    | WebKit (iPhone 13) | mobile     | nightly                                             |
| `webkit-desktop`   | WebKit             | desktop    | nightly                                             |
| `prod-smoke`       | Chromium           | 1440 × 900 | manual `npm run test:prod-smoke` against production |

The full catalog — every scenario with the exact assertion, technique, and regression class it catches — is in **[`docs/TEST-CATALOG.md`](docs/TEST-CATALOG.md)**. The "why" behind major engineering decisions is in [`docs/adr/`](docs/adr/README.md).

## User journey suite (`tests/user-journeys.spec.ts`)

The suite is organised by **user state** because the header chrome differs depending on whether the user is signed in:

| Header chrome | Anonymous user                                                                | Logged-in user                                         |
| ------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| Auth control  | "Sign In" link (avatar dropdown opens panel with Sign In + Create An Account) | "My Account" button (dropdown with 9 items + Sign Out) |
| Heart icon    | not shown in header strip                                                     | visible — direct path to `/products/favorites`         |
| Cart icon     | shown — guest cart                                                            | shown — server-persisted cart                          |
| Phone strip   | "Need Help? We've Got You — 844-222-8343 or Chat Now" — same in both states   | same                                                   |

This means the same conceptual actions (cart, favorites) behave differently across states, and a few actions exist in only one state. The suite covers both.

### What we test per state

**Anonymous user (block 1)** — runs without staging credentials. ~52 tests across 22 journeys:

- **Search**: FIND (submit + reach results), AUTOCOMPLETE (ArrowDown + Enter), NO-RESULTS (empty state, not silent homepage), 1000-char input, Escape closes, special chars, whitespace-only
- **Help affordances**: GET HELP CALL (tel: format dialable, multi-link agreement), CHAT NOW (widget loads, no double-stack)
- **Promo strip**: PROMO BANNER Shop Sale CTA → sale-tagged listing
- **Navigation**: MENU NAVIGATION (mega-menu open + click subcategory), MEGA-MENU panel-stacking (one open at a time), MEGA-MENU Escape close, LOGO → HOME
- **Cart**: CART (guest) add + line item + non-zero total + qty recalc, CART ICON click from deep page → /cart
- **Favorites (anonymous)**: heart toggle / empty-state copy, double-toggle un-favorites
- **Auth transitions**: REGISTRATION (avatar dropdown + sign-in page bottom link, both entry points), LOGIN (passwordless form structure: email + Continue With Email + OAuth + Create-an-account; invalid email validation; empty submit blocked; Enter key submits)
- **Footer**: 16 footer link click-throughs across About Us / Your Account / Contact Us / Service Center sections (auth-required links verify the /sign_in?return_to= redirect chain)
- **Follow Us**: 6 social links (5 external — verify destination domain + target=\_blank without navigating away; 1 internal — Custom Ink Blog click-through)
- **Marketing**: YouTube embed loads on play click; Send-Us-Email click-through to /contact (kept in `marketing-elements.spec.ts`)
- **Accessibility**: SKIP-LINK (keyboard-only users tab to first focusable element, press Enter, jump past header to #main-content)

**Logged-in user (block 2)** — gated on `storage/auth.json`; skipped with a clear reason when it's absent. 12 journeys:

- **LOGOUT** — click Sign Out, the header reverts to anonymous state (uses widened assertion to tolerate the cross-domain redirect chain)
- **SEARCH (logged-in)** — search behaves correctly when authenticated, header still hides Sign In link
- **My Account dropdown navigation** — one journey per dropdown item: Order History, Account Settings, My Designs, My Uploads, Group Orders, Fundraisers, Online Stores. Each clicks through to a destination page that renders its specific heading.
- **CART (persisted)** — add to cart, reload, line item survives. Bug class the guest cart cannot catch.
- **FAVORITES (persisted)** — heart a product, navigate to `/products/favorites`, the product is listed (not the empty state).
- **Header heart icon** — direct path to `/products/favorites` without going through the dropdown.

### Mutation proof (the suite is not theatre)

`docs/mutation-proof.md` documents a procedure: deliberately break a single line in `pages/components/HeaderComponent.ts`, run the suite, observe the predicted failure list. Every passing test in `tests/user-journeys.spec.ts` depends on a real production-code line you can point at. See the doc for the per-line mutation table.

### Walk & Watch evidence

Real DOM observations captured via Chrome DevTools MCP, recorded in `docs/walk-and-watch/2026-05-03-customink-dom-observations.md`. Notable findings the test code now binds against:

- `/profiles/users/sign_in` is **passwordless** (email + "Continue With Email" + OAuth)
- `/profiles/users/sign_up` is **password-based** (email + new password + confirm + "Continue" button) — distinct flow
- `/products/favorites` empty-state copy (verbatim): "Browse our products and click the heart icon to save your favorites."
- Heart on product detail: `button "Add to favorites"` per colour variant
- Header heart icon: `link "Favorites"` → `/products/favorites`
- Order History destination: `/account/orders`
- Cross-domain note: `account.staging.customink.com` throws "Oops! Not logged in" pageError when `storage/auth.json` has cookies only for `www-master`. Currently allowlisted in `monitorPageHealth`.

### Skills sequence applied

`brainstorming` → `writing-plans` → `improve-tests` → `check-selectors` → `systematic-debugging` → `check-error-handling` → `quick-code-scan` → `real-testing-patterns` (final mutation-test pass). Each skill produced concrete fixes traceable in commits. Spec at `docs/superpowers/specs/2026-05-03-customink-header-user-journeys-redesign-design.md`, plan at `docs/superpowers/plans/2026-05-03-customink-header-user-journeys-redesign.md`.

### Run status (2026-05-03)

Last `--workers=1` runs:

- **Anonymous (`chromium-desktop`)**: 32 passed / 16 failed / 4 skipped (52 total). Failures cluster on staging-flake (Customer Reviews / Customer Photos / Custom Ink Blog footer items) and a couple of locator-tighten candidates surfaced by the latest skill passes.
- **Logged-in (`chromium-desktop-authed`)**: 1 passed (setup) / 11 failed (12 total). Failures cluster on the cross-domain auth gap — the saved `storage/auth.json` has cookies for `www-master` only; clicking dropdown items reaches `account.staging.customink.com` which renders the not-logged-in state. Resolution requires running `playwright codegen` against both subdomains.

`--workers=2` cuts wall-time to ~9 minutes but introduces staging-load flakiness; for stable signal use `--workers=1` (~13 minutes).

### Auth gating

Logged-in tests check `existsSync("storage/auth.json")` at file load. Without it the whole `describe("logged-in user — header journeys", ...)` block skips with the message:

> Skipping auth-gated journeys: storage/auth.json not present — run `npx playwright codegen --save-storage=storage/auth.json <staging-url>` once staging is healthy.

Once `storage/auth.json` exists (committed only locally; gitignored), the logged-in tests run automatically.

### Variant policy

Each journey gets Happy + Negative + Edge variants where they add value. Variants that would not catch a real failure mode (e.g. a "negative" path for clicking the logo) are deliberately omitted, not padded.

## Architecture

The "why" behind the major engineering decisions lives in **[`docs/adr/`](docs/adr/README.md)** — six short Architecture Decision Records:

1. POM only for real components, not for pages
2. Cross-cutting page-health fixture, scope-aware
3. Custom-element selector for the header root
4. Allowlist policy with quarterly hygiene
5. Visual regression scoped to a single stable region
6. Baseline pattern for known-offender regression tests

The implementation spec is in [`docs/superpowers/specs/`](docs/superpowers/specs/) and the task-level plan in [`docs/superpowers/plans/`](docs/superpowers/plans/).

## Running tests

| Command                   | Purpose                                                                |
| ------------------------- | ---------------------------------------------------------------------- |
| `npm run check`           | Pre-push gate: typecheck + lint + P1 suite                             |
| `npm test`                | Full suite against the configured `BASE_URL`                           |
| `npm run test:p1`         | P1-tagged tests only (PR-gate parity)                                  |
| `npm run test:flaky`      | Each P1 test repeated 5× on 2 workers — flake detection                |
| `npm run test:prod-smoke` | P1 suite against the production base URL (separate Playwright project) |
| `npm run test:ui`         | Interactive UI mode for debugging                                      |
| `npm run test:report`     | Open the HTML report from the last run                                 |

Browsers configured as Playwright projects: `chromium-desktop` (1440×900), `mobile-chrome` (Pixel 5), `mobile-safari` (iPhone 13), `webkit-desktop`, `prod-smoke` (chromium against `PROD_URL`).

## Performance baseline

Measured locally against staging (M-series Mac, no other load):

| Subset                | Tests | Wall time |
| --------------------- | ----: | --------: |
| P1 only               |    88 |   ~1m 30s |
| Full suite (P1+P2+P3) |  ~106 |   ~1m 50s |

Most of the wall time is network round-trip to staging (lazy-loaded Web Components, third-party scripts). Sharded 4× in CI the P1 suite is well under the 2-minute PR-gate target.

## CI/CD

- `.github/workflows/pr.yml` — every pull request: P1 only on `chromium-desktop` + `mobile-chrome`, sharded 4×, target < 2 min
- `.github/workflows/nightly.yml` — `0 2 * * *`: full suite across `chromium-desktop` + `mobile-chrome` + `webkit-desktop`, sharded 8×, target < 8 min

Both workflows use `BASE_URL` from a workflow-level env var — change once, propagates to every shard.

## Site behaviors the suite accommodates

This is a real production-style site with real-world behaviors that aren't fully controllable from a test runner. Each is captured in code or data so the suite stays stable as the site evolves:

- **Lazy-hydrating Web Components.** `<ci-header-prerender>` (homepage) vs `<ci-header>` (internal pages); the footer (`<ci-full-footer>`) hydrates below the fold. The shared `waitForFooterReady()` helper anchors any test that asserts on footer descendants.
- **Third-party CMS rotation.** Promo banner copy, brand carousel, customer reviews — none of these regions are visual-snapshotted. Visual regression is scoped to the legal/copyright row only (ADR-005).
- **Auth-protected and environment-specific routes.** Footer links carry a `skipHttpCheck` flag (`auth-required` for `/account/*`, `environment-specific` for routes incomplete on staging) so the suite checks structural correctness without false positives.
- **Cross-origin API calls.** Staging frontend talks to production for read-only data; the resulting CORS errors are allowlisted with explicit comments per entry (ADR-004).
- **Algolia keyboard-driven autocomplete.** Tests use `ArrowDown` + `Enter` to mirror the library's intended UX path rather than mouse clicks on suggestion items.
- **External link rate-limiting.** Facebook and TikTok respond 4xx to non-browser HEAD/GET. For Follow-Us social links the suite verifies the destination domain rather than HEAD-probing.

## Open questions

A handful of items are deliberately deferred — see spec [§15](docs/superpowers/specs/2026-05-01-customink-header-footer-tests-design.md):

- **OQ-1** Mega-menu render after page reload occasionally falls back to the simplified header. Test #8 absorbs this with timeout-tolerant hover.
- **OQ-2** Authenticated user-state tests skip without a `storage/auth.json` file. They run as soon as one is provided.
- **OQ-7** OneTrust banner does not implement a strict focus trap on this build. Test #18 verifies the weaker WCAG 2.1.1 keyboard-operable invariant.

## Roadmap

Patterns surveyed against high-quality public Playwright suites and worth incorporating in future iterations:

- `axeBuilder` fixture refactor (in progress — see `fixtures/axe.fixture.ts`)
- HEAD-probe cache for external Follow-Us link checks (mitigates rate-limit risk)
- `@duckduckgo/autoconsent` in place of the hand-rolled OneTrust dismissal cookie
- Pre-consent network audit (consentcrawl pattern) to validate analytics blocking before consent
- Visual baseline review platform (Argos / Percy / Chromatic) for designer signoff workflow
- `CODEOWNERS`-driven contract diff for marketing-driven path changes (already in `.github/CODEOWNERS`)

#
