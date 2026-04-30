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

The full catalog — every scenario with the exact assertion, technique, and regression class it catches — is in **[`docs/TEST-CATALOG.md`](docs/TEST-CATALOG.md)**. The "why" behind major engineering decisions is in [`docs/adr/`](docs/adr/README.md).

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
