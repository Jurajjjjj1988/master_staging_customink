# ADR-006 — Baseline pattern for known-offender regression tests

**Status:** Accepted
**Date:** 2026-05-01

## Context

Some regression tests check global invariants that the live site doesn't fully satisfy today. The page-wide first-party link sanity test (`tests/regression.spec.ts` #21) is the canonical case: at the time of writing the homepage has two `<a href="#">` placeholder links ("View Delivery Calendar" and "View Calendar") wired up by a marketing module that intends to upgrade them to a calendar modal but ships in placeholder state.

Two failure modes exist:

1. **A new dead link is introduced.** The test should fail loudly and name the offender.
2. **An existing dead link is fixed.** The test should also fail — to prompt removing the now-irrelevant exception.

A naive "allow these strings" approach satisfies (1) but silently loses signal for (2): the exception sits in the codebase forever, even after the underlying issue is resolved.

## Options

1. **Make the test assert empty.** It fails on every CI run today; CI red is unhelpful for current-state.
2. **Allowlist the known offenders permanently.** Catches new breakage but drifts: the allowlist outlives the bug.
3. **Baseline pattern: assert exact equality between live state and a checked-in `BASELINE` constant.** Drift in either direction fails the test.

## Decision

Option 3. The test computes the live offender set, then performs two assertions:

- `newOffenders` (live − baseline) must be empty (catches new regressions).
- `removedOffenders` (baseline − live) must be empty (catches stale baseline).

The `BASELINE_KNOWN_OFFENDERS` constant lives inline in the test with a comment naming each entry and the reason it exists. When a marketing fix lands and one of those links is wired up, the test fails with "baseline contains entries no longer present" — a clear, scriptable signal that the constant needs trimming.

## Consequences

- The failure message tells the maintainer which direction the drift went and exactly what to update.
- Known-issue clutter never silently grows.
- A fix in production is celebrated by the test demanding its own simplification — a good kind of failure.

## Where this pattern is used

- `tests/regression.spec.ts` — page-wide first-party link sanity (#21).

The pattern is general; future tests that guard against drift in either direction (HTML structure, JSON-LD shape, CSP header set) can apply it without modification.
