# ADR-005 — Visual regression scoped to a single stable region

**Status:** Accepted
**Date:** 2026-05-01

## Context

Playwright supports `toHaveScreenshot()` for visual regression. The "right" amount of visual coverage on a marketing site is not "everything": the promo banner copy rotates weekly, the brand carousel changes seasonally, customer reviews refresh hourly. A visual baseline that captures any of these would either:

- Be regenerated every week (ceremonial work, no signal).
- Fail every week (noise that trains engineers to ignore visual failures).
- Require complex masking that itself becomes a maintenance burden.

A useful visual test catches CSS regressions that _functional_ tests miss: color shifts, padding changes, font-size regressions, layout breaks. These regressions, when they happen, occur on every region. So we don't need wide coverage — we need ONE baseline on a region where the content is genuinely stable.

## Options

1. **Visual regression on every spec page, masking dynamic regions.** High maintenance, low signal.
2. **No visual regression at all.** Misses CSS regressions.
3. **One visual snapshot of the most stable region.**

## Decision

Option 3. `tests/visual.spec.ts` captures a single `toHaveScreenshot` of the footer's legal/copyright row (Privacy Policy | California Privacy Notice | User Agreement | Cookie Settings + the © line). This row's content is stable: the year auto-updates once a year (covered by test #22), and the legal links rarely change.

The snapshot lives in `tests/visual.spec.ts-snapshots/footer-legal-row.png` and is committed to the repo. The first regenerate after a real CSS regression is a deliberate engineer action (designer signoff), not an automated update.

## Consequences

- We sacrifice the ability to catch a CSS regression that affects only the promo banner or the brand carousel (functional tests cover content presence; CSS visual breaks there are accepted).
- Maintenance burden is near zero: the legal row hasn't changed in years on the live site.
- When the test fails, the cause is usually real: a global typography change, a footer redesign, or a CSS bundle regression.

## Open follow-up

Filed as roadmap item: adopt Argos / Percy / Chromatic to support designer signoff workflow on baseline updates. Until then the baseline is committed by the engineer who made the visual change, with a PR comment explaining the diff.
