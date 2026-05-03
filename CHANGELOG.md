# Changelog

All notable changes to this test suite are documented here.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] — 2026-05-01

Initial release. Suite is CI-ready against the CustomInk staging site.

### Tests

- 36 functional test scenarios + 1 cross-cutting page-health fixture, organized into 13 spec files
- Coverage: render, link integrity (header / footer / Follow-Us / legal / footer-meta / special protocols), search (submit / autocomplete / boundaries / XSS / special chars), mega-menu, user state, secondary nav actions, cookie consent (with quarterly compliance assertions), accessibility (axe-core), responsive (1023px and 320px breakpoints), regression catchers, visual baseline, performance budget, marketing & support elements, page quality (HTML uniqueness, alt text, JSON-LD)
- 80 P1 tests; full suite runs in ~1m 30s on a single chromium-desktop project

### Architecture

- Page Object Model scoped to real components (`HeaderComponent`, `FooterComponent`, `CookieBanner`); pages are typed string constants — no `BasePage` (ADR-001)
- Cross-cutting `monitorPageHealth` fixture: scope-aware, uses `expect.soft`, tracks console errors + warnings + 4xx/5xx + broken images + mixed content (ADR-002)
- Custom-element root selector for the header (`ci-header-prerender, ci-header`) with documented rationale (ADR-003)
- Three-tier explicit allowlist (console, network, pageError) with quarterly hygiene runbook (ADR-004)
- Visual regression scoped to a single stable region (footer legal row) (ADR-005)
- Baseline pattern for known-offender regression tests — drift fails in either direction (ADR-006)

### Tooling

- Playwright 1.49+ with TypeScript 5.6+ strict mode
- ESLint 9 flat config with `eslint-plugin-playwright` + `@typescript-eslint/parser`
- `@axe-core/playwright` integrated via dedicated `axe.fixture.ts` builder
- `dotenv` for `BASE_URL` configuration
- GitHub Actions workflows: `pr.yml` (P1 only, 4 shards, < 2 min target) and `nightly.yml` (full suite, 3 browsers × 8 shards, < 8 min target)

### Documentation

- Spec at `docs/superpowers/specs/2026-05-01-customink-header-footer-tests-design.md` — design rationale, test scenario table, open questions
- Plan at `docs/superpowers/plans/2026-05-01-customink-header-footer-tests.md` — task-by-task implementation plan
- 6 Architecture Decision Records in `docs/adr/`
- README with quick-start, project layout, contributing guide, debugging, roadmap
