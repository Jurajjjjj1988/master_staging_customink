# ADR-004 — Allowlists are explicit, justified, and reviewed quarterly

**Status:** Accepted
**Date:** 2026-05-01

## Context

`monitorPageHealth` (ADR-002) catches console errors, page errors, and 4xx/5xx network responses. On a real production-style site some of these are unavoidable noise:

- Cross-origin API calls from staging frontend to production backend produce CORS errors that are expected for the environment.
- A third-party UA-sniff library accesses `navigator.userAgentData.safari`, which is undefined in Chromium 120+ and produces a `TypeError` on every visit.
- Optimizely's SDK logs an "ERROR — Feature key … is not in datafile" entry when a feature flag isn't configured for the current account.

If we fail the test on these, every test fails on every run for reasons unrelated to the code under test. If we silently swallow them, real regressions slip through.

## Options

1. **Empty allowlist; fail on any console or network noise.** Tests are unrunnable.
2. **Generic "ignore everything" allowlist.** Tests pass; suite catches nothing.
3. **Explicit per-pattern allowlist with inline justifications and a quarterly review process.**

## Decision

Option 3. Three allowlists live in `fixtures/pages.fixture.ts`:

- `CONSOLE_ALLOWLIST` (RegExp[])
- `REQUEST_ALLOWLIST` (RegExp[])
- `PAGE_ERROR_ALLOWLIST` (RegExp[])

Each entry has an inline comment explaining (a) what produces the noise, (b) why it's expected on this environment, (c) which team owns it.

The README's "Quarterly allowlist hygiene" section documents the review process: once a quarter, comment out each entry, re-run the P1 suite, and delete entries that no longer fire.

## Consequences

- The cost of adding a new entry is intentional friction: you must write a comment that another engineer can defend in code review.
- An allowlist that "just grows" is a smell — the quarterly process catches it.
- New developers don't have to wonder why test errors are suppressed; the file is short and every line has a reason.

## Cross-references

- ADR-002 — the fixture that consumes these lists.
