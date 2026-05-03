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

The full test catalog — every scenario, what it asserts, and which regression class it would catch — lives in **[`docs/TEST-CATALOG.md`](docs/TEST-CATALOG.md)**. It is the single source of truth, grouped by user-facing concern (Render, Navigation, Search, Accessibility, …) rather than by spec file.

High-level coverage:

- Render & layout consistency across 5 pages, including 1023px and 320px breakpoints
- Every internal link in header + footer + mega-menus has a valid `href` and a non-error status
- Search submit, autocomplete, XSS handling, special-character cases
- Cookie consent flows including the rejection-compliance contract
- Accessibility baseline via axe-core (WCAG 2.1 AA) plus keyboard-operability
- Marketing surface: promo banner, support phone/chat affordances, YouTube embed, Klaviyo signup container, feedback widget
- Page quality: duplicate IDs, alt text, button accessible names, JSON-LD structured data
- SEO essentials in `<head>` and discovery infrastructure (`robots.txt`, `sitemap.xml`)

A cross-cutting `monitorPageHealth` fixture runs on every test — see ADR-002.

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

## License

[MIT](LICENSE).
