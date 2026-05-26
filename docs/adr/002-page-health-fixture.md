# ADR-002 — Cross-cutting page-health fixture, auto and scope-aware

**Status:** Accepted
**Date:** 2026-05-01

## Context

A naive list of "things to check on every test" looked like:

- console errors / warnings are zero
- no 4xx/5xx network responses
- no broken images
- no mixed-content warnings

The first draft had each of these as a separate test scenario. That gave four tests doing the same thing on every page — eight variants once you considered which page each ran against. None of them were the test the engineer wrote; they were noise around it.

A second consideration: when these checks are global (page-wide), they fire on issues outside the test's scope. A broken JS chunk on a product-page hero is a real bug, but if the test under writing is "the cart link in the header navigates", a fixture that fails the test for the body issue obscures the actual signal.

## Options

1. **Six standalone scenarios.** Verbose, repetitive, and runs the same checks N times.
2. **Single auto-fixture, fail on any issue page-wide.** Compact but noisy: every test fails on unrelated body issues.
3. **Auto-fixture, scope-aware: fatal only for header/footer issues, informational for the rest.** Compact AND scoped to test purpose.

## Decision

Option 3. `monitorPageHealth` is an `auto: true` fixture in `fixtures/pages.fixture.ts`. It captures four signals and:

- ATTACHES the full diagnostic JSON to every test that has any issue (always visible in the report).
- USES `expect.soft` to fail the test on issues _inside the header/footer DOM_ — never throws directly. The original test failure (if any) remains the primary error and the soft-failure adds context without obscuring it.
- Treats out-of-scope issues (broken chunk on product body, third-party iframe errors) as informational only.

## Consequences

- Tests stay focused: a header test fails for a header reason.
- Engineers reading a failure see both the test's primary assertion AND any health signal that fired around it.
- The fixture is the only place that knows about allowlists (ADR-004). Tests don't reason about noise.
- The cost: one engineer can be surprised by the implicit assertion (test fails for "broken image" they didn't write). The README's "Cross-cutting page health" section documents what the fixture does, so the surprise resolves to "now I know what guards me".

## Cross-references

- ADR-004 — allowlist policy.
- ADR-006 — the baseline pattern is used for similar known-state guards in tests rather than the fixture.
