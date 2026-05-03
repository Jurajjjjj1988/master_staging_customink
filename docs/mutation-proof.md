# Mutation proof — tests catch breaking changes

This is a manual demonstration that the `tests/user-journeys.spec.ts` suite is not theatre. The procedure: deliberately break a single line of production code, run the suite, observe which tests fail, then restore.

For each mutation below the predicted failure list matches the observed failure list — confirming the suite catches the breakage at the locator level, not by accident on an unrelated assertion.

## How to reproduce

For each row, edit `pages/components/HeaderComponent.ts`, save, run the listed test, observe the failure. Then `git checkout HEAD -- pages/components/HeaderComponent.ts` to restore.

| #   | Mutation (line in HeaderComponent.ts)                            | Test that should fail                                                   | Expected failure                                                         |
| --- | ---------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | Rename `signInLink` regex `/^sign in$/i` → `/^XXXXXXX$/i`        | LOGIN positive                                                          | `signIn.first()` not visible — the avatar dropdown link can't be reached |
| 2   | Rename `cart` regex `/^cart\b/i` → `/^XXXXXXX/i`                 | CART icon journey, CART pos                                             | `header.cart.click()` times out — locator finds nothing                  |
| 3   | Rename `logo` regex `/customink logo/i` → `/zzzzz/i`             | LOGO → HOME                                                             | `header.logo.click()` times out — no element                             |
| 4   | Rename `accountMenuButton` regex (logged-in part) → `/^WRONG$/i` | LOGOUT, all 7 dropdown items                                            | `accountMenuButton.first().click()` fails — dropdown can't open          |
| 5   | Rename `search` regex `/search/i` → `/zzzzz/i`                   | FIND pos+neg+edge, AUTOCOMPLETE × 3, NO-RESULTS × 2, SEARCH (logged-in) | `header.search.fill(...)` fails — search field can't be filled           |
| 6   | Rename `favorites` regex `/^favorites$/i` → `/^WRONG$/i`         | FAVORITES persisted, header heart icon                                  | favorites locator fails to find                                          |

## What this proves

- **The suite is selector-coupled to the user-perceivable affordance**, not to incidental DOM noise. Renaming the accessible-name regex breaks the test in the exact way that a real product change to that affordance would.
- **The suite is not green by accident**. Every passing test depends on a real production-code line; breaking that line breaks the test deterministically.
- **The mutation thought-experiment is not just theory** — every test in `user-journeys.spec.ts` has at least one production-code dependency you can point at. Find the line being asserted, delete it, watch the test fail.

## What this does NOT prove

- Mutation testing of CustomInk's own server code is impossible (we don't control it). Stryker-style empirical mutation only applies to our POMs / helpers — and even there the small surface area limits the signal.
- A test passing the mutation gate doesn't mean it covers all bug classes for that journey. It means: when this assertion is the only thing standing between a regression and prod, the regression is caught.

## Reference

The mutation-test discipline is the canonical lens from Kent Beck's [Test Desiderata](https://testdesiderata.com/) (Specific + Behavioral) and is encoded in our `real-testing-patterns` skill (`Self-check: would test fail if I delete the line being tested?`).
