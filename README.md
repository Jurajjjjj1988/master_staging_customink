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

## What we test per state

The suite is organised by **user state** because the header chrome differs depending on whether the user is signed in:

| Header chrome | Anonymous user                                                                | Logged-in user                                         |
| ------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| Auth control  | "Sign In" link (avatar dropdown opens panel with Sign In + Create An Account) | "My Account" button (dropdown with 9 items + Sign Out) |
| Heart icon    | not shown in header strip                                                     | visible — direct path to `/products/favorites`         |
| Cart icon     | shown — guest cart                                                            | shown — server-persisted cart                          |
| Phone strip   | "Need Help? We've Got You — 844-222-8343 or Chat Now" — same in both states   | same                                                   |

This means the same conceptual actions (cart, favorites) behave differently across states, and a few actions exist in only one state. The suite covers both.

**Anonymous user (block 1)** — runs without staging credentials. ~30 tests across 22 journeys:

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

**Logged-in user (block 2)** — gated on `storage/auth.json`; skipped with a clear reason when it's absent. 9 journeys:

- **LOGOUT** — click Sign Out, the header reverts to anonymous state (uses widened assertion to tolerate the cross-domain redirect chain)
- **SEARCH (logged-in)** — search behaves correctly when authenticated, header still hides Sign In link
- **My Account dropdown navigation** — one journey per dropdown item: Order History, Account Settings, My Designs, My Uploads, Group Orders, Fundraisers, Online Stores. Each clicks through to a destination page that renders its specific heading.
- **CART (persisted)** — add to cart, reload, line item survives. Bug class the guest cart cannot catch.
- **FAVORITES (persisted)** — heart a product, navigate to `/products/favorites`, the product is listed (not the empty state).
- **Header heart icon** — direct path to `/products/favorites` without going through the dropdown.

## By chrome surface (header vs footer)

| Surface                   | Tests | Examples                                                                                                                                                      |
| ------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Header**                |   ~50 | Search, autocomplete, mega-menu open + Escape, logo, cart icon, registration (2 entries), login, account dropdown (7 items + LOGOUT), header heart, skip-link |
| **Footer**                |   ~24 | All About Us / Your Account (auth-redirect) / Contact / Service Center links, Follow Us socials (5 external + Blog), YouTube embed, Send-Us-Email             |
| **Header AND footer**     |    ~5 | Cross-page render consistency — both must appear on every primary route                                                                                       |
| **Cross-cutting / other** |    ~4 | Cookie consent banner (3), auth.setup (1)                                                                                                                     |

## What's covered

| Section                       | File                               | Tests | Coverage in one line                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------- | ---------------------------------- | ----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User journeys (anonymous)** | `tests/user-journeys.spec.ts`      |   ~30 | Search (FIND, AUTOCOMPLETE, no-results), call support, chat now, promo banner Shop Sale, menu navigation, logo → home, cart (guest + icon click), favorites anonymous, registration (form + invalid email + empty submit), login (passwordless form + invalid email + empty submit), footer link click-through (16 links incl. auth-redirect for /account/\*), Follow Us (6 socials), skip-link |
| **User journeys (logged-in)** | `tests/user-journeys.spec.ts`      |     9 | LOGOUT, search logged-in, 4 My-Account dropdown items (Order History, Account Settings, My Designs, My Uploads), CART persisted, FAVORITES persisted, header heart icon — gated on `storage/auth.json`                                                                                                                                                                                          |
| **Search depth**              | `tests/search.spec.ts`             |     5 | Submit, autocomplete open/close, ArrowDown+Enter, empty/oversized inputs                                                                                                                                                                                                                                                                                                                        |
| **User-state baseline**       | `tests/user-state.spec.ts`         |     2 | Anonymous Sign-In link visibility + avatar hover dropdown structure                                                                                                                                                                                                                                                                                                                             |
| **Footer marketing**          | `tests/marketing-elements.spec.ts` |     2 | YouTube embed loads on play click + Send-Us-Email click-through to /contact                                                                                                                                                                                                                                                                                                                     |
| **Auth setup**                | `tests/auth.setup.ts`              |     1 | Verifies `storage/auth.json` is still usable before logged-in tests run                                                                                                                                                                                                                                                                                                                         |
| **Render**                    | `tests/render.spec.ts`             |     5 | Cross-page consistency — header + footer render on every primary route                                                                                                                                                                                                                                                                                                                          |
| **Cookie consent**            | `tests/cookie-consent.spec.ts`     |     3 | First-visit banner, accept persistence, settings save                                                                                                                                                                                                                                                                                                                                           |

**Total: ~57 tests across the suite (single browser project).** Auth-gated logged-in journeys skip without `storage/auth.json`. Run sharded across browsers in CI.

### By priority

| Priority | Tests | What it gates                                                                                                                                  |
| -------- | ----: | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       |   ~45 | PR check; deploy blocker. Every revenue-path user journey (cart, login, registration, search, footer links).                                   |
| P2       |   ~12 | Nightly. Important but not deploy-blocking (autocomplete UX, mega-menu Escape, account dropdown items My Designs / My Uploads / Group Orders). |

### By dimension

| Dimension  | Coverage source                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------- |
| Functional | `user-journeys.spec.ts` (~30 anon + 9 logged-in journeys), `search.spec.ts` (oversized inputs, autocomplete UX) |

### By Playwright project

| Project            | Browser            | Viewport   | When it runs                                        |
| ------------------ | ------------------ | ---------- | --------------------------------------------------- |
| `chromium-desktop` | Chromium           | 1440 × 900 | PR + nightly                                        |
| `mobile-chrome`    | Chromium (Pixel 5) | mobile     | PR + nightly                                        |
| `mobile-safari`    | WebKit (iPhone 13) | mobile     | nightly                                             |
| `webkit-desktop`   | WebKit             | desktop    | nightly                                             |
| `prod-smoke`       | Chromium           | 1440 × 900 | manual `npm run test:prod-smoke` against production |

The full catalog — every scenario with the exact assertion, technique, and regression class it catches — is in **[`docs/TEST-CATALOG.md`](docs/TEST-CATALOG.md)**. The "why" behind major engineering decisions is in [`docs/adr/`](docs/adr/README.md).

## Auth gating

Logged-in tests check `existsSync("storage/auth.json")` at file load. Without it the whole `describe("logged-in user — header journeys", ...)` block skips with the message:

> Skipping auth-gated journeys: storage/auth.json not present — run `npx playwright codegen --save-storage=storage/auth.json <staging-url>` once staging is healthy.

Once `storage/auth.json` exists (committed only locally; gitignored), the logged-in tests run automatically.

## Variant policy

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

## Wall-time baseline

Measured locally against staging (M-series Mac):

| Subset                                     | Workers | Wall time | Notes                                   |
| ------------------------------------------ | ------: | --------: | --------------------------------------- |
| Full suite (anonymous + logged-in)         |       1 |     ~13 m | Stable signal — no staging-load flake   |
| Full suite (anonymous + logged-in)         |       2 |      ~9 m | Faster but introduces sporadic flake    |
| Anonymous only (`chromium-desktop`)        |       1 |     ~13 m | 32 / 52 currently passing (workers=1)   |
| Logged-in only (`chromium-desktop-authed`) |       1 |      ~7 m | Cross-domain auth gap blocks most tests |

Most of the wall time is network round-trip to staging (lazy-loaded Web Components, third-party scripts). Sharded 4× in CI the suite hits the ~2-minute PR-gate target.

## CI/CD

- `.github/workflows/pr.yml` — every pull request: P1 only on `chromium-desktop` + `mobile-chrome`, sharded 4×, target < 2 min
- `.github/workflows/nightly.yml` — `0 2 * * *`: full suite across `chromium-desktop` + `mobile-chrome` + `webkit-desktop`, sharded 8×, target < 8 min

Both workflows use `BASE_URL` from a workflow-level env var — change once, propagates to every shard.

## Site behaviors the suite accommodates

This is a real production-style site with real-world behaviors that aren't fully controllable from a test runner. Each is captured in code or data so the suite stays stable as the site evolves:

- **Lazy-hydrating Web Components.** `<ci-header-prerender>` (homepage) vs `<ci-header>` (internal pages); the footer (`<ci-full-footer>`) hydrates below the fold. The shared `waitForFooterReady()` helper anchors any test that asserts on footer descendants.
- **Third-party CMS rotation.** Promo banner copy, brand carousel, customer reviews — content-asserting tests bind to invariants (the affordance, the destination URL), not the rotated copy itself.
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

- HEAD-probe cache for external Follow-Us link checks (mitigates rate-limit risk)
- `@duckduckgo/autoconsent` in place of the hand-rolled OneTrust dismissal cookie
- `CODEOWNERS`-driven contract diff for marketing-driven path changes (already in `.github/CODEOWNERS`)

## Possible future additions (currently out of scope)

The current suite focuses on user-perceivable journeys through header & footer. The following dimensions were considered and deferred — each is a worthwhile addition once the journey suite stabilises:

| Dimension     |    Tests | Cut? | Rationale for re-adding                                                 |
| ------------- | -------: | ---- | ----------------------------------------------------------------------- |
| Visual        |        3 | NIE  | Stable region snapshots, low-flake risk, real layout regression catcher |
| Accessibility |        3 | NIE  | Senior signal, real WCAG bugs catcher                                   |
| Security      |       ~6 | NIE  | Real CVE / GDPR coverage, no senior would throw it out                  |
| Cross-cutting | — (auto) | NIE  | Free bug detection across whole suite                                   |
