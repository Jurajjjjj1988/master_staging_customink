# ADR-003 — Custom-element selector for the header root

**Status:** Accepted
**Date:** 2026-05-01

## Context

Playwright's official guidance, and the project's own `check-selectors` rule, says: prefer `getByRole`. A `<header>` element exposes the implicit `role="banner"`, so the obvious header root is `page.getByRole("banner")`.

On this site that locator returns nothing. Two reasons:

1. The header is a Stencil-built Web Component (`<ci-header-prerender>` on the homepage, `<ci-header>` on internal pages). Neither element exposes `role="banner"`.
2. The wrapping shadow boundary keeps the inner `<header>` from being matched at the document level.

Tests need a single stable root locator. We picked one.

## Options

1. **`getByRole("banner")`.** Idiomatic. Returns nothing on this site.
2. **`page.locator("ci-header-prerender, ci-header")`.** Tag-based, tied to one specific implementation.
3. **Per-test ad-hoc locators.** No shared root; every test re-derives a header anchor.

## Decision

Option 2. The `HeaderComponent` constructor uses `page.locator("ci-header-prerender, ci-header").first()` and documents WHY in a docstring. If the site replaces both elements in a future migration, every header test fails loudly with a single root cause — and a one-line update fixes them.

## Consequences

- Selector strategy is "stable in practice", not "stable in spec". We accept that the canonical role-based pattern is unavailable.
- Test code is portable across header variants (homepage's prerendered version, internal pages' fully-hydrated version) via a single comma-combinator.
- If the platform team ships a new variant tag, the `HeaderComponent` constructor changes once; tests using `header.search`, `header.cart`, etc. don't change.

## Open follow-up

Filed as roadmap item: request `data-testid` instrumentation from the platform team. With explicit testIds we can revert this decision and use `getByTestId("site-header")` instead.
