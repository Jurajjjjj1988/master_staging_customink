# Tests

Playwright + TypeScript E2E suite for the global `header` of `customink.com`. The header has 4 variants (Homepage anonymous / Cart-Checkout / Design Lab / Accounts logged-in) — see `docs/components/header.md` for the full functional & behavioural specification.

**Scope rule:** every test in this suite must trace to a `docs/components/header.md` § statement. Off-doc smoke tests (footer integrity, marketing CMS, cookie-banner UI) have been intentionally removed — keep the suite signal:noise high.

## Folder structure

```
tests/
├── header/                       # Per-variant header specs (1:1 with doc §)
│   ├── variant-0-common.spec.ts      # §0  Spoločné technické základy
│   ├── variant-1-homepage.spec.ts    # §1  Anonymous homepage (16 prvkov + F1-F5 + D1)
│   ├── variant-2-cart.spec.ts        # §2  Cart / Checkout chrome diff
│   ├── variant-3-lab.spec.ts         # §3  Design Lab task-mode chrome
│   ├── variant-4-accounts.spec.ts    # §4  Logged-in overlay (My Account, D2)
│   ├── responsive.spec.ts            # §X.5 Breakpoint sweep across all variants
│   ├── feature-flags.spec.ts         # §X.6 Cookie / Optimizely A-B matrix
│   └── accessibility.spec.ts         # WCAG 2.1 AA sweep via axe-playwright + documented regressions
│
├── journeys/                     # Behaviour layer — user flows through the header
│   ├── search.spec.ts                # Find, autocomplete, no-results, edge cases (§1.3 #2)
│   ├── support.spec.ts               # Phone, chat, promo CTA, guest favorites (§1.2 #8/9/10/14)
│   ├── cart.spec.ts                  # Cart icon href + empty state landing (§1.2 #13 + §2.7)
│   ├── navigation.spec.ts            # Skip link, mega-menu hover→click, logo→home (§1.2 #1/3-7/15)
│   └── logged-in.spec.ts             # Auth-gated: D2 dropdown items, sign-out, heart → /account (§4)
│
└── auth.setup.ts                 # Auth fixture: validates storage/auth.json before logged-in tests
```

Supporting code (sibling folders):

```
fixtures/    # pages.fixture.ts — extended `test` with cookie auto-dismiss + health monitor
pages/components/  # POM per visible header surface (HeaderComponent + V2/V3/V4 + MegaMenu + Footer + Cookie)
helpers/     # known-issues.ts (allowlists), timeouts.ts (constants), page-state.ts (waits)
data/        # const-array test data (HEADER_V1_ELEMENTS, FLYOUTS_V1, BREAKPOINTS, AB_TESTS)
```

## Tag convention

| Tag   | Meaning                                              |
| ----- | ---------------------------------------------------- |
| `@p1` | Critical — blocks ship. Runs on smoke + full suites. |
| `@p2` | Important — fix this sprint. Runs on full suite.     |
| `@p3` | Edge / nice-to-have. Runs on full suite only.        |

The `prod-smoke` project filters to `@p1` only and points at `https://www.customink.com`. Use for production health checks.

Skipped tests use `test.fixme(...)` with a one-line reason — these document expected behaviour the implementation hasn't reached yet. Removing a `.fixme` is the green-light when the gap closes.

## Run commands

```bash
# Local default (chromium-desktop, anonymous, staging)
npx playwright test

# Single variant
npx playwright test tests/header/variant-1-homepage.spec.ts

# Single tag
npx playwright test --grep @p1

# Logged-in journeys (needs storage/auth.json; run codegen first)
npx playwright codegen --save-storage=storage/auth.json <staging-url>
npx playwright test --project=chromium-desktop-authed

# Production smoke (@p1 only)
npm run test:prod-smoke

# Single test file in list-only mode (sanity check)
npx playwright test tests/header/variant-0-common.spec.ts --list
```

## Conventions for new tests

0. **POMs via fixtures, never `new` in test bodies.** Page objects are injected from `fixtures/pages.fixture.ts` (`header`, `headerV2`, `headerV3`, `headerV4`, `megaMenu`, `footer`, `cookieBanner`). Destructure from the test signature: `test("...", async ({ page, header }) => { ... })`. The legacy `new HeaderComponent(page)` pattern is banned for new code.
1. **Locators.** `getByRole`, `getByLabel`, `getByTestId`, `getByPlaceholder` — in that order of preference. Never `nth()`. Never raw CSS classes as primary selectors. Use `.or()` only when the same logical element has known variants (e.g. `signInLink.or(myAccountLink)`).
2. **Timeouts.** Import from `helpers/timeouts.ts` (`TIMEOUTS.HYDRATION`, `TIMEOUTS.NAVIGATION`, …). Inline magic numbers are a smell.
3. **Allowlists.** Add a new known-issue regex to `helpers/known-issues.ts` only with an owner + ticket reference in the comment. Growth = signal we should fix the source, not silence.
4. **POM methods.** One-action methods (`submitSearch`, `openMegaMenu`) live in the POM. Tests stay short and read as user intent.
5. **Comments.** WHY only, max 1–3 lines. WHAT is in the code. Quoting CSS values or doc § numbers is fine; restating the assertion is not.
6. **`test.fixme` vs `test.skip`.** Use `fixme` when the test SHOULD pass once the implementation catches up. Use `skip` when the test doesn't apply in this environment (e.g. missing creds).

## Doc ↔ spec mapping

Every section of `docs/components/header.md` has a matching test file. Reviewer can read the doc and the spec side-by-side:

```
header.md §0      ↔  tests/header/variant-0-common.spec.ts
header.md §1.x    ↔  tests/header/variant-1-homepage.spec.ts
header.md §2.x    ↔  tests/header/variant-2-cart.spec.ts
header.md §3.x    ↔  tests/header/variant-3-lab.spec.ts
header.md §4.x    ↔  tests/header/variant-4-accounts.spec.ts
header.md §X.5    ↔  tests/header/responsive.spec.ts
header.md §X.6    ↔  tests/header/feature-flags.spec.ts
header.md §X.7    ↔  scattered across the variant files (one `describe` per edge case)
```

User-behavior journeys (not strictly per-element specs) live in `tests/journeys/` and map onto doc §1.3 / §1.4 (Behaviour and Flyouts) plus auth flows.
