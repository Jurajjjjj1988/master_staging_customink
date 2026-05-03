# CustomInk Header & Footer E2E Tests

End-to-end Playwright + TypeScript suite that exercises the global header and footer of CustomInk's staging site (`www-master.staging.customink.com`). Twenty-six functional tests across twelve spec files plus a single cross-cutting page-health fixture, designed to answer one question on every PR: _is the chrome around the page healthy?_ The suite is intentionally small, opinionated, and component-scoped — it is a portfolio piece, so structure, selector hygiene, and signal-to-noise were prioritized over coverage breadth.

---

## Why this suite exists

The header and footer are the two components that ship on every page of the site. When they break, the blast radius is the whole property: navigation dies, search dies, legal links 404, and consent banners trap focus. This suite gives a fast, deterministic answer to:

- Do the header and footer **render** on every key page (home, design lab, products, help)?
- Do all advertised **links** resolve to a 2xx (no soft 404s, no broken CDN chunks)?
- Does the **search** flow produce results and survive empty / unicode / very long input?
- Does the **mega-menu** open, expose the right items, and close cleanly?
- Is the **logged-out / logged-in** chrome correct?
- Does the **cookie banner** behave like a real consent gate (no pre-consent tracking, accessible, dismissible)?
- Are there any **page-health regressions** — console errors, 4xx/5xx, broken images, mixed content — on the routes we touch?

Anything that is not the header or footer is explicitly out of scope.

---

## Quick start

```bash
npm install
npx playwright install --with-deps
cp .env.example .env
npm test                 # full suite, all 3 projects
npm run test:p1          # P1 smoke only, < 2 min
```

`.env` only needs `BASE_URL` (defaults to staging if omitted). No login is required for the public-facing tests; the one signed-in test (`user-state` #10) reads `storage/auth.json` and skips cleanly when it is absent.

---

## Architecture

The suite is deliberately flat. There is no inheritance hierarchy, no per-page POM, no custom test runner.

- **Component-only POM.** `HeaderComponent`, `FooterComponent`, and `CookieBanner` live under `pages/components/`. They wrap the only DOM that the suite cares about. There is no `BasePage` and no `HomePage` / `ProductPage` etc. — those would be empty shells, since every test exercises the same global chrome on different URLs.
- **One cross-cutting fixture.** `monitorPageHealth` is auto-applied via `fixtures/pages.fixture.ts`. Every test gets console/network/image monitoring for free; an assertion in `afterEach` fails the test if anything in the watchlist tripped (with an explicit allowlist for known third-party noise).
- **Data-driven over copy-paste.** Link inventories live in `data/*.ts` and feed `test.describe.parallel` loops. Adding a footer link is a one-line data change.
- **No homemade abstractions over Playwright.** No `step()` wrappers, no custom `waitFor`, no env-loader files. `dotenv` is imported directly in `playwright.config.ts`.

---

## Running tests

| Command               | What it does                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm test`            | Full suite, all three projects (chromium-desktop, mobile-chrome, webkit-desktop).                     |
| `npm run test:p1`     | P1-tagged tests only — the smoke set used on every PR. Target: under two minutes.                     |
| `npm run test:headed` | Same as `npm test`, with browsers visible. Useful when a selector behaves differently under load.     |
| `npm run test:ui`     | Playwright UI mode — pick tests, time-travel, inspect locators, watch traces inline.                  |
| `npm run test:report` | Serves the last HTML report (traces, videos, screenshots) at `localhost:9323`.                        |
| `npm run lint`        | ESLint (with `eslint-plugin-playwright`). Catches `nth()`, missing awaits, conditional `expect`, etc. |
| `npm run typecheck`   | `tsc --noEmit`. Strict mode. No `any` allowed in this codebase.                                       |

Filtering further:

```bash
npx playwright test --project=chromium-desktop          # one project
npx playwright test tests/links.spec.ts                  # one file
npx playwright test --grep "@p1.*footer"                 # tag + pattern
```

---

## Project layout

```
customink-tests/
├── pages/components/        # Component POMs — the only POM layer
├── fixtures/                # pages.fixture.ts — extends test() with monitorPageHealth
├── helpers/                 # http-check, regex — pure utilities, no state
├── data/                    # Link inventories, page lists, follow-us links
├── tests/                   # 12 spec files, 26 tests
├── tests/_unit/             # Helper unit tests (pure-fn level)
├── .github/workflows/       # pr.yml (P1, sharded) — nightly job lives alongside
├── playwright.config.ts     # 3 projects, HTML+list+GitHub reporters
└── docs/superpowers/        # Spec + plan that drove this build
```

| Path                                                                                             | Purpose                                                     |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `pages/components/HeaderComponent.ts`                                                            | Logo, nav, search, account menu, mobile drawer.             |
| `pages/components/FooterComponent.ts`                                                            | Column links, follow-us, legal row, country selector.       |
| `pages/components/CookieBanner.ts`                                                               | OneTrust banner — accept / reject / preferences.            |
| `fixtures/pages.fixture.ts`                                                                      | Auto-applied `monitorPageHealth` + component instantiation. |
| `helpers/http-check.ts`                                                                          | `request.head()` wrapper used by link-coverage tests.       |
| `data/header-links.ts`, `data/footer-links.ts`, `data/legal-links.ts`, `data/follow-us-links.ts` | Source of truth for link-coverage tests.                    |
| `data/pages-under-test.ts`                                                                       | Routes the render/health tests iterate over.                |

---

## Adding a new test

A short checklist — in order:

1. **Can it be data-driven?** If it loops over links, products, or pages, add the row to `data/*.ts` and let an existing `for…of` test pick it up. Do not write a new spec for it.
2. **Use the components.** Reach for `HeaderComponent` / `FooterComponent` / `CookieBanner` first. Only touch `page` directly for navigation and asserts that aren't header/footer-specific.
3. **Stable selectors only.** `getByRole`, `getByLabel`, `getByPlaceholder`, `getByTestId`. No `nth()`, no CSS classes as primary selectors, no XPath. The `check-selectors` skill exists precisely to enforce this.
4. **Tag it.** Every test gets `@p1`, `@p2`, or `@p3` in the title. P1 = breaks-the-site smoke, P2 = important behaviour, P3 = nice-to-have / deep checks.
5. **No hard waits.** `waitForTimeout`, `setTimeout`, `sleep` are banned. Wait on a state — a role, a URL, a network response — not on the wall clock.
6. **Run lint + typecheck before pushing.** `npm run lint && npm run typecheck && npm run test:p1`. CI runs all three; failing locally first is faster.

---

## Selector strategy

Used (in order of preference):

- `page.getByRole('link', { name: 'Help Center' })`
- `page.getByLabel('Search')`
- `page.getByPlaceholder('Search products…')`
- `page.getByTestId('header-account-menu')` — only where the site already exposes a stable `data-testid`.
- `page.getByText('…', { exact: true })` — last resort for marketing copy that isn't a heading or label.

Banned:

- `.nth(n)` — index-based selection breaks the moment the DOM order changes.
- CSS classes as primary selectors (`.cta-primary`, `.menu__item--active`) — these are styling hooks, not contract.
- Deep descendant chains (`div > div > a:nth-of-type(2)`) — same problem, harder to debug.
- XPath — there is no case in this codebase where it beats a role/label query.

ESLint (`eslint-plugin-playwright`) blocks the obvious offenders; `check-selectors` covers the rest in code review.

---

## Cross-cutting page health

`monitorPageHealth` is wired into the test fixture and runs on **every** test, no opt-in needed. It watches:

- **Console errors.** Any `page.on('console')` event with `type === 'error'` — except entries on the allowlist.
- **Network failures.** Any response with status >= 400 on a request that wasn't aborted by us. Third-party analytics endpoints are allowlisted.
- **Broken images.** `naturalWidth === 0` after load — catches CDN 404s that don't show up as console errors.
- **Mixed content.** Any `http://` request emitted from an `https://` page.

The allowlist is an explicit array in `fixtures/pages.fixture.ts`. Adding to it requires a comment with a Jira / GitHub link explaining why; otherwise the noise creeps back in within a sprint.

If the assertion fails, the test report shows the offending event(s) with full URL and stack — the failing test message itself names which check tripped.

### Quarterly allowlist hygiene

Allowlist entries rot silently — a third-party script gets fixed, removed, or renamed, and the regex sits in the file forever, swallowing future regressions in nearby code. Once per quarter:

1. Skim `CONSOLE_ALLOWLIST`, `REQUEST_ALLOWLIST`, `PAGE_ERROR_ALLOWLIST` in `fixtures/pages.fixture.ts`.
2. For each entry, read the comment that justifies it. If the original ticket is closed or the third-party noted as removed, comment out the entry and run `npm run test:p1`.
3. If P1 stays green, delete the entry. If it fails, the noise is real — keep the entry and refresh the comment with the latest reference.
4. Commit the cleanup separately so the diff is reviewable.

This is the only way the allowlist stays an asset rather than an alibi.

---

## Site behaviors the suite accommodates

Building tests against a real production-style site means accommodating real-world behaviors that aren't always controllable from the test runner. Each of these is captured explicitly in code or data so the suite stays stable as the site evolves:

- **Lazy-hydrating Web Components.** `<ci-header-prerender>` (homepage) and `<ci-header>` (internal pages) are different elements; the footer (`<ci-full-footer>`) hydrates below the fold. The shared `waitForFooterReady()` helper anchors any test that asserts on footer descendants.
- **Third-party CMS rotation.** Promo banners, brand carousel, and customer reviews change daily — none of these regions are visual-snapshotted. Visual regression is scoped to the legal/copyright row only.
- **Auth-protected and environment-specific routes.** Footer links are tagged in `data/footer-links.ts` with a `skipHttpCheck` flag (`auth-required` or `environment-specific`) so the suite checks structural correctness without generating false positives on routes that aren't logged-out-accessible or aren't deployed to staging.
- **Cross-origin API calls.** Staging frontend talks to the production API for read-only data; the resulting CORS preflights surface as console errors. Allowlisted with explicit regex + comment in `fixtures/pages.fixture.ts`.
- **Algolia Autocomplete keyboard model.** The search autocomplete uses arrow-key navigation rather than mouse-click activation; tests use `ArrowDown` + `Enter` to mirror the library's intended UX path.
- **External link rate-limiting.** Facebook and TikTok respond 4xx to non-browser HEAD/GET. For Follow-Us social links the suite verifies the destination domain rather than HEAD probing the external host.

---

## Open questions / pending input

See `docs/superpowers/specs/2026-05-01-customink-header-footer-tests-design.md` §15 for the full list. Active items:

- **OQ-1 — Mega-menu render after reload.** Some reloads of the homepage at desktop viewport render the simplified header instead of the full mega-menu nav. The suite's mega-menu test uses an explicit hover trigger and timeout that absorbs this; if the underlying reason is identified later (likely SSR/CSR data sync), the timeout can be reduced.
- **OQ-2 — `storage/auth.json` not provided.** The signed-in user-state test (`user-state.spec.ts` #10) needs a saved storage state. Until a stable staging test account is shared, this test skips with an explicit reason. The suite is green either way.

---

## CI/CD

Two workflows under `.github/workflows/`:

**`pr.yml` — every PR.**

- Runs `npm run lint && npm run typecheck && npm run test:p1`.
- Sharded 4-way (`--shard 1/4`, `2/4`, …) across `chromium-desktop` and `mobile-chrome`.
- Target wall-clock: under two minutes.
- HTML report uploaded as artifact on failure.

**Nightly — full suite.**

- Runs the entire suite on `main`, sharded 8-way, plus `webkit-desktop`.
- Target wall-clock: under eight minutes.
- Failures open (or update) a GitHub issue tagged `nightly-fail`; the issue body links to the failing trace.

Both workflows pin the Playwright browser cache by `package-lock.json` hash — installs are warm after the first run on a given lockfile.

---

## Performance baseline

Measured on a single MacBook (M-series, no other load) against the live staging environment:

| Subset                | Tests | Wall time |
| --------------------- | ----: | --------: |
| P1 only               |    80 |   ~1m 25s |
| Full suite (P1+P2+P3) |   ~99 |   ~1m 50s |

Most of the wall time is network round-trip to staging (cold-CDN paint, lazy-loaded Web Components, third-party scripts), not test execution. Sharded across 4 CI runners the P1 suite is well under the 2-minute PR-gate target documented in spec §10.1.

## Architecture decisions

The "why" behind the major engineering decisions on this project lives in [`docs/adr/`](docs/adr/README.md) — six short Architecture Decision Records covering POM scope, the cross-cutting page-health fixture, the custom-element selector, the allowlist policy, the visual regression scope, and the baseline pattern for known-offender tests. They are the document I'd hand to the next engineer who joins the project.

## Roadmap

Patterns surveyed against high-quality public Playwright suites and worth incorporating in future iterations:

**Small, high-value:**

- **`axeBuilder` fixture** (replace inline axe in test #16). Shared `withTags`/`exclude` config, ~30 min. Reference: Playwright official a11y docs.
- **Issue-typed test annotations** on every `test.fail()`. `test.info().annotations.push({ type: "issue", description: "OQ-8" })` renders as a clickable link in the HTML report.
- **HEAD probe cache + concurrency limit** for external Follow-Us link checks (test #3). Mitigates Facebook / TikTok rate-limit risk documented in spec §16.

**Medium, defer to v2:**

- **`@duckduckgo/autoconsent`** in place of the hand-rolled `OptanonAlertBoxClosed` cookie hack. Survives banner ID changes for free; supports 100+ CMPs.
- **Pre-consent network audit** (consentcrawl pattern). Assert that GA / Facebook pixel / Optimizely network requests do NOT fire before consent. Stronger than the cookie-only check in test #14b.
- **Argos / Percy / Chromatic** for visual baseline review (test #23). Designer signoff workflow built-in; replaces committing PNGs to git.
- **`CODEOWNERS` for `data/*.ts`** + contract diff that surfaces marketing-driven path changes as a clear PR signal. Currently no public repo solves this elegantly.

**Dead ends (avoid):**

- **Mutation testing on the test suite itself.** Stryker does not support the Playwright runner. Mutation on shared helpers (e.g. `helpers/regex.ts`) is technically possible but offers little signal for a 5-line file.

## Debugging a failing test

1. **Re-run the single test with the browser visible:**
   ```bash
   npx playwright test tests/search.spec.ts --headed --project=chromium-desktop
   ```
2. **Step through it:**
   ```bash
   npx playwright test tests/search.spec.ts --debug
   ```
   Opens the Playwright Inspector, pauses on every action, lets you tweak selectors live.
3. **Open the last HTML report:**
   ```bash
   npm run test:report
   ```
   Traces, videos, screenshots, console logs, and network are all there. Click the failing test, then "View trace".
4. **Where the artifacts live.** Configured in `playwright.config.ts`:
   - `trace: 'on-first-retry'` — `test-results/<test-name>/trace.zip`
   - `screenshot: 'only-on-failure'` — same folder, `test-failed-1.png`
   - `video: 'retain-on-failure'` — same folder, `video.webm`
5. **CI failure?** Download the `playwright-report` artifact from the workflow run, unzip, and open `index.html` locally — same UI as `test:report`.

If the test fails because `monitorPageHealth` tripped (not the test's own assertion), the failure message names the URL and the event class. Triage path: reproduce in `--headed`, open DevTools, confirm the event, then either fix the bug or extend the allowlist with a linked ticket.
