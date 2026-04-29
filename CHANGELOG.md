# Changelog

All notable changes to this test suite are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-05-01

Initial release. The suite is CI-ready against the CustomInk staging environment.

### Added

- 49 functional test scenarios + 1 cross-cutting page-health fixture across 16 spec files. Full catalog at [`docs/TEST-CATALOG.md`](docs/TEST-CATALOG.md).
- Page Object Model scoped to real components only: `HeaderComponent`, `FooterComponent`, `CookieBanner`. No `BasePage` (see ADR-001).
- Cross-cutting `monitorPageHealth` fixture: scope-aware, uses `expect.soft`, tracks console errors + warnings + 4xx/5xx + broken images + mixed content (ADR-002).
- Custom-element root selector for the header (`ci-header-prerender, ci-header`) with documented rationale (ADR-003).
- Three-tier explicit allowlists (console, network, pageError) with a quarterly hygiene runbook (ADR-004).
- Visual regression scoped to a single stable region — the footer legal/copyright row (ADR-005).
- Baseline pattern for known-offender regression tests; drift fails in either direction (ADR-006).
- `axeBuilder` fixture (Playwright official pattern) for WCAG 2.1 AA scans.
- `waitForFooterReady` helper for tests that assert on the lazy-hydrating footer Web Component.
- Five Playwright projects: `chromium-desktop`, `mobile-chrome`, `mobile-safari`, `webkit-desktop`, `prod-smoke`.
- GitHub Actions workflows: `pr.yml` (P1 only, 4 shards, < 2 min target) and `nightly.yml` (full suite, 3 browsers × 8 shards, < 8 min target).
- npm scripts: `check`, `test:p1`, `test:flaky`, `test:prod-smoke`, `lint:fix`.
- Architecture documentation: 6 ADRs in [`docs/adr/`](docs/adr/), design spec, implementation plan.
- Pull-request template, `CODEOWNERS`, `LICENSE`.

### Engineering decisions of note

- **Page-health fixture uses `expect.soft`.** When a test fails AND the fixture detects a health issue, both errors land in the report side-by-side rather than the fixture masking the original failure. No public Playwright reference repo I surveyed had this pattern.
- **Header root selector is tag-based, not role-based.** The site's Web Components do not expose `role="banner"`. `getByRole('banner')` returns nothing; `page.locator('ci-header-prerender, ci-header')` is the stable root with a one-line update path if the platform team renames the elements.
- **Visual regression is intentionally narrow.** A baseline that captures the promo banner or brand carousel would fail every week as marketing rotates content. Scoping to the footer legal row catches CSS regressions on a region that is genuinely stable.

### Known limitations

- Authenticated user-state test (#10) skips without a `storage/auth.json` (OQ-2 in the design spec).
- The OneTrust banner does not implement a strict focus trap on the current build — test #18 verifies the weaker keyboard-operability invariant (OQ-7).
- The mega-menu hydration occasionally falls back to the simplified header on hard reload at desktop viewport — test #8 absorbs this via timeout-tolerant hover (OQ-1).
- Visual baselines are committed without designer signoff. Roadmap item: adopt Argos / Percy / Chromatic.
