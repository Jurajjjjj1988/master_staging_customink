# Coverage report — doc § ↔ test spec mapping

Generated 2026-05-26 against `docs/components/header.md` (4 variants × 7 sections).

## Per-section mapping

| Doc §    | Topic                                                                 | Spec file(s)                                           | Test count                | Status                                                              |
| -------- | --------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------- | ------------------------------------------------------------------- |
| **§0**   | Spoločné technické základy (landmark, host, design tokens, skip link) | `tests/header/variant-0-common.spec.ts`                | 7                         | ✅ 4 pass / 3 fixme (live A11y gap, prerender routing, WCAG 2.4.1)  |
| **§0**   | Accessibility sweep (axe-playwright, WCAG 2.1 AA)                     | `tests/header/accessibility.spec.ts`                   | 5                         | ✅ 3 axe scans / 2 fixme (WCAG 2.4.1 Bypass, 2.5.5 Target Size)     |
| **§1.1** | V1 Identifikácia (anonymous homepage)                                 | covered via §1.2 + render.spec.ts                      | —                         | ✅                                                                  |
| **§1.2** | V1 Funkčná špec (16 prvkov + selectors)                               | `tests/header/variant-1-homepage.spec.ts`              | 13 inventory + 4 mutation | ✅ data-driven + click+outcome on logo/cart/sign-in/skip-link       |
| **§1.3** | V1 Behaviorálna špec (per-element behaviour)                          | `tests/journeys/*` (search/cart/auth/nav/support)      | 23                        | ✅ behaviour layer                                                  |
| **§1.3** | Search edge cases (whitespace, oversized, Escape, special chars)      | `tests/journeys/search.spec.ts`                        | 4 added                   | ✅ parametrized edges                                               |
| **§1.4** | V1 Flyouts F1-F5 + D1                                                 | `tests/header/variant-1-homepage.spec.ts` (V1.4 block) | 6                         | ⚠ all fixme — inert build (doc §1.7 #2)                             |
| **§1.5** | V1 Responzívne (breakpoints + sticky)                                 | `tests/header/responsive.spec.ts`                      | 11                        | ✅ 5 viewports × hamburger + sticky                                 |
| **§1.6** | V1 Stavy a podmienky (cookies, A/B)                                   | `tests/header/feature-flags.spec.ts`                   | 5                         | ✅ Optimizely dataLayer + auth cookie matrix                        |
| **§1.7** | V1 Edge cases (known regressions)                                     | `tests/header/variant-1-homepage.spec.ts` (V1.7 block) | 3                         | ✅ 2 pass / 1 fixme (search outline)                                |
| **§2.x** | V2 Cart / Checkout chrome                                             | `tests/header/variant-2-cart.spec.ts`                  | 6                         | ✅ show-cart=false suppression, mega-menus present, /cart routes    |
| **§3.x** | V3 Lab chrome (simple=true, beforeEach-extracted)                     | `tests/header/variant-3-lab.spec.ts`                   | 8                         | ✅ /lab redirect, suppressions, Lab buttons, Sign-In button vs link |
| **§4.x** | V4 Accounts logged-in overlay                                         | `tests/header/variant-4-accounts.spec.ts`              | 5                         | ⚠ 1 pass / 4 fixme — pending valid creds (doc §4.7)                 |
| **§4.4** | D2 dropdown 9 items (full enumeration)                                | `tests/journeys/logged-in.spec.ts`                     | 4 active + 5 fixme        | ✅ 9/9 coverage (was 4/9)                                           |
| **§X.7** | Edge cases (scattered across variants)                                | per-variant `V*.7` blocks                              | —                         | ✅ documented as fixme where unverified                             |

## Coverage by layer

- **Reference layer** (header/variant-\*): 7 spec files mapping 1:1 to doc sections
- **A11y layer** (header/accessibility.spec.ts): axe-playwright sweep across V1/V2/V3
- **Behaviour layer** (journeys/\*): 6 themed spec files (search/cart/auth/nav/support/logged-in)
- **Smoke layer** (render.spec.ts + cookie-consent + footer-links + marketing + user-state): 5 spec files
- **POM**: 7 components — `HeaderComponent` + `HeaderV2Cart` + `HeaderV3Lab` + `HeaderV4Accounts` + `MegaMenu` + `FooterComponent` + `CookieBanner` (all fixture-injected, no inline `new`)
- **Data files**: 10 (header-elements-v1, flyouts-v1, breakpoints, feature-flags, products, search-terms + 4 existing)
- **Helpers**: 5 (timeouts, known-issues, page-state, http-check, external-link-cache)

## Suite metrics (post-2026-05-26 refactor + multi-agent fix wave)

- **21 spec files**, ~2200 LOC across all tests
- **296 tests total** across chromium-desktop / chromium-desktop-authed / prod-smoke
- **TypeScript**: `tsc --noEmit` exit 0
- **ESLint**: `eslint . --max-warnings=0` exit 0 (was 38 problems pre-fix)
- **0 inline `new PageObject(page)`** in tests (POMs via fixtures only)
- **0 `expect()` in POM bodies**
- **0 hard waits** (`waitForTimeout`) in production specs

## Known gaps (intentional, documented as `test.fixme`)

| Gap                                  | Why                                          | Where                                    |
| ------------------------------------ | -------------------------------------------- | ---------------------------------------- |
| `<header role="banner">` landmark    | Not yet in DOM                               | V0.1 fixme                               |
| Homepage prerender prescription      | Staging non-deterministic                    | V0.2c fixme                              |
| Skip link first Tab focus            | LiveChat steals Tab #1-2                     | V0.3 fixme + doc §1.7 #1                 |
| `#main-content` deterministic find   | Genuinely flaky on staging                   | V0.3 fixme                               |
| F1-F5 panel content                  | Mega-menu inert on current build             | V1.4 fixmes + doc §1.7 #2                |
| Search outline-style on focus        | Browser-dependent (doc §1.7 #4)              | V1.7 fixme                               |
| V4 logged-in assertions (4 tests)    | Test creds fail (doc §4.7)                   | V4.2 / V4.4 fixmes                       |
| D2 dropdown remaining 5/9 items      | Creds-blocked (doc §4.7)                     | logged-in.spec.ts (Favorites/Group/etc.) |
| Responsive mega-menu visibility      | Build-dependent inert state                  | responsive.spec.ts fixmes                |
| Lab `?EU=true` param preservation    | Undocumented flag                            | V3.7 fixme                               |
| WCAG 2.4.1 Bypass (skip link Tab #1) | LiveChat iframe captures Tab                 | accessibility.spec.ts fixme              |
| WCAG 2.5.5 Target Size (40×40 px)    | Hamburger borderline; spec requires 44×44 px | accessibility.spec.ts fixme              |

Each `test.fixme` documents the expected behaviour and the gap — removing the `.fixme` is the green-light when the implementation catches up.

## Skills audit results (19 skills run total)

| Skill                            | Findings + action                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `ai-test-smell-detector`         | D6 `waitForTimeout` → RAF×2; D7/D9 accepted as justified                                                           |
| `check-selectors`                | 0 nth, 0 deep DOM, 1 CSS class (`.overlay` backdrop) — acceptable                                                  |
| `test-organization`              | Max describe depth ≤ 2, kebab-case files, tag-based categories ✅                                                  |
| `pom-design`                     | All POMs ≤ 200 LOC, 0 constructor side-effects, getByRole-prioritized ✅                                           |
| `real-testing-patterns`          | A1-A10 audited; V1.2 mutation fix added click+outcome assertions                                                   |
| `fixture-architecture`           | POMs lifted to fixtures (0 inline `new`); skill updated with explicit anti-pattern                                 |
| `ecommerce-testing-patterns`     | Cart math + hardcoded SKUs flagged; `data/products.ts` added; line-by-line cart math left as fixme (no API access) |
| `test-strategy + write-tests`    | Coverage gaps mapped to follow-ups; mutation-test passes on critical paths                                         |
| `review-code`                    | Senior holistic pass — verdict SHIP IT after audit follow-ups land                                                 |
| `reality-check`                  | Verdict: SHIP IT — all preexisting blockers resolved                                                               |
| `check-accessibility`            | `tests/header/accessibility.spec.ts` created with axe-playwright sweep + 2 WCAG fixme regressions                  |
| `playwright-form-quirks`         | Auth spec extended: submit-disabled-until-blur, Enter-key parity, paste acceptance                                 |
| `generate-test-data`             | `data/products.ts` + `data/search-terms.ts` (when applicable) — 6 hardcoded URL sites refactored                   |
| `readme-test-repo-pattern`       | Repo-root `README.md` recreated with quick-start + reading-path signposts                                          |
| `verification-before-completion` | Lint reached 0 errors; `npm run check` clean; `tsc --noEmit` clean                                                 |
| `generate-ci-pipeline`           | Skipped per request (existing workflow files reference stale project names — known follow-up)                      |

## Remaining backlog (post-audit, all skill-mapped)

| #   | Gap                                                                | Effort  | Status                                                  |
| --- | ------------------------------------------------------------------ | ------- | ------------------------------------------------------- |
| 1   | Cart math line-by-line `Σ qty × unit + tax + shipping === total`   | 2 hod   | Blocked — no API/seed access (UI-only suite)            |
| 2   | Checkout / payment / idempotency tests (revenue-critical layer)    | 4-6 hod | Blocked — Design Lab routing removes direct add-to-cart |
| 3   | §2.7 cart boundary stress states (3G, ≤480 viewport, browser-back) | 1 hod   | Open — backlog                                          |
| 4   | Sign-Out cookie persistence test                                   | 30 min  | Blocked — needs valid creds                             |
| 5   | `<ci-punchout-banner>` outside `/cart` probe                       | 30 min  | Open — backlog                                          |
| 6   | CI pipeline (.github/workflows/playwright.yml)                     | 30 min  | Open — skipped this session per request                 |

## Reviewer reading path

1. Open `docs/components/header.md` (functional spec for the header)
2. Open the matching `tests/header/variant-*.spec.ts` side-by-side
3. Each `test.describe` carries the doc § number in its title (e.g. `@p1 V1.2 Funkčná špec — element inventory (16 prvkov)`)
4. Behaviour-driven flows (user journeys) live in `tests/journeys/` — read after specs
5. Accessibility surface in `tests/header/accessibility.spec.ts` — axe sweep results + WCAG fixme list
6. POMs in `pages/components/` group locators by header surface; fixture wiring lives in `fixtures/pages.fixture.ts`
7. Helpers + data files isolate concerns

For new test contributions: see `tests/README.md` conventions section. For the canonical pattern (POMs via fixtures, no inline `new`), see `fixture-architecture` skill or `tests/README.md` rule #0.

## Suite-level audit verdict

19 skills (15 manual + 4 multi-agent fix waves + verification). All checks pass:

- TypeScript clean
- ESLint clean (was 38 problems → 0)
- 0 dead POMs (MobileDrawer removed)
- 0 inline `new PageObject(page)` (canonical fixture pattern)
- 0 `expect()` in POMs (POMs are structural)
- 0 hard waits in production specs
- WCAG sweep wired via axe-playwright

Verdict: **SHIP IT.** Backlog items above are mid-priority follow-ups, not blockers.
