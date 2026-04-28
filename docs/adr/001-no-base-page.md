# ADR-001 — POM only for real components, not for pages

**Status:** Accepted
**Date:** 2026-05-01

## Context

The original spec proposed a classic Page Object Model hierarchy: `BasePage` abstract class, then `HomePage`, `ProductPage`, `BlogPage`, `AboutPage`, `NotFoundPage` extending it. Each subclass would declare its `path` constant.

Reviewing the design before implementation surfaced a question: what behavior actually lives on these page classes? The answer was: a `path` string. Nothing else. The header and footer behavior all lives in components. Subclasses became wrappers around a single string.

## Options

1. **Keep BasePage + 5 subclasses.** Familiar pattern; future-proof if pages grow behavior.
2. **Drop BasePage and per-page POMs entirely.** Pages become entries in a typed array; tests do `page.goto(PAGES.home)` directly.
3. **Hybrid: keep BasePage with `navigate()` + component getters; drop subclasses.**

## Decision

Option 2. Pages live in `data/pages-under-test.ts` as a typed `as const` array. Components (Header, Footer, CookieBanner) are the only POMs because they are the only things with real behavior worth abstracting.

## Consequences

- One fewer indirection layer between test and the thing being asserted.
- New page can be added by appending one line to the data file rather than a new class file.
- If a page later acquires non-trivial flow logic (e.g. multi-step wizard), it will become a POM at THAT moment — adding the abstraction lazily, when there is something to abstract.
- We pay the cost of NOT having a place to hang shared `navigate()` / `dismissOverlay()` helpers. We accept this because cookie dismissal is handled by an auto-fixture (ADR-002) and `page.goto(path)` is already concise.

## Cross-references

- ADR-002 explains why `BasePage.dismissOverlay()` was unnecessary.
