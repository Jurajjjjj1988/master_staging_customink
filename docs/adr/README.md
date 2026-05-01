# Architecture Decision Records

Each file in this directory captures one decision: the context, the options considered, the choice made, and what we accept by making it. ADRs are immutable once accepted — if a decision is later reversed, a new ADR is added that supersedes the old one.

The format is intentionally short. The goal is to leave a reader six months from now (or a senior reviewer ten minutes from now) able to answer: "why is it built this way?".

## Index

- [ADR-001 — POM only for real components, not for pages](001-no-base-page.md)
- [ADR-002 — Cross-cutting page-health fixture, auto and scope-aware](002-page-health-fixture.md)
- [ADR-003 — Custom-element selector for the header root](003-header-root-selector.md)
- [ADR-004 — Console / network allowlists are explicit, justified, and reviewed quarterly](004-allowlist-policy.md)
- [ADR-005 — Visual regression scoped to a single stable region](005-visual-regression-scope.md)
- [ADR-006 — Baseline pattern for known-offender regression tests](006-baseline-pattern.md)
