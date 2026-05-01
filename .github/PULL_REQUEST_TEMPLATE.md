# Summary

<!-- One sentence describing what this PR changes and why. -->

## Type of change

- [ ] New test scenario (catalog row added under matching section in `docs/TEST-CATALOG.md`)
- [ ] Test refactor (POM, fixture, helper)
- [ ] Test data change (`data/*.ts`)
- [ ] Allowlist change (`fixtures/pages.fixture.ts`) — see ADR-004
- [ ] Architecture Decision Record (`docs/adr/`)
- [ ] Tooling / CI / dependency update
- [ ] Documentation only

## Pre-merge checklist

- [ ] `npm run check` passes locally (typecheck + lint + P1 suite)
- [ ] If a new scenario was added: row appended to `docs/TEST-CATALOG.md` with What / How / Why / Priority
- [ ] If a selector was added: it follows ADR-003 priority order (`getByRole` > `getByLabel` > … > tag-name with documented rationale)
- [ ] If an allowlist entry was added: inline justification comment names the third-party noise source AND the team that owns it
- [ ] If a `test.fail()` or baseline-pattern offender was added: linked to a tracking ticket in the comment
- [ ] If a visual baseline was regenerated: the diff was reviewed (designer signoff for marketing surfaces)

## Test plan

<!-- How did you verify this change? What did you run, against which env? -->
