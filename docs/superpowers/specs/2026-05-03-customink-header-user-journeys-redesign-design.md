# CustomInk header user-journeys — redesigned suite

**Goal:** Replace structural-check-heavy header tests with user-journey tests that survive senior review by actually verifying user value.

**Architecture:** Single file `tests/user-journeys.spec.ts` with **two** `test.describe` blocks aligned to the only two real states a user can be in — anonymous and logged-in. The header chrome changes between states (Sign In link vs. My Account dropdown + heart icon), so the suite covers everything reachable from the header in each state. LOGIN and REGISTRATION are anonymous journeys (the anonymous user clicks header affordances to reach those forms). CART and FAVORITES appear in both blocks because their behavior diverges by state (anonymous: guest cart / localStorage; logged-in: persisted server-side). Each journey gets Happy + Negative + Edge variants where they add value. Auth-gated tests skip with reason when `storage/auth.json` is absent.

**Tech Stack:** Playwright 1.59 + TypeScript, existing `HeaderComponent` POM, Chrome DevTools MCP for Walk & Watch DOM observation during fix work.

---

## Background

Senior reviewer Roman flagged the prior suite as "tests that don't really test — just a pile of code". During the review feedback the user surfaced 9 explicit user journeys ("imagine you're the user..."), then added mega-menu navigation as the 10th. Brainstorming retroactively expanded to 13 journeys to cover the full anonymous + logged-in user-state matrix — Roman's framing of "what the user does with the header" applies to both states.

Today's first run of the initial 26-test draft: 11 passed, 12 failed, 3 skipped (cart correctly skipped on Design Lab requirement). The systematic-debugging skill classified the 12 failures into 5 root-cause clusters; this redesign addresses all of them in the implementation plan that follows.

## Scope — journeys grouped by user state and auth transition

### Block 1: Anonymous user (9 journeys)

What a user without an account can do. Runs without `storage/auth.json`.

1. **FIND** — user submits a search and lands on results that reflect the query
2. **AUTOCOMPLETE** — user types a partial term and uses ArrowDown + Enter on suggestions
3. **NO-RESULTS SEARCH** — user searches for a nonexistent term and sees an empty state, not a silent homepage
4. **GET HELP CALL** — user finds the support phone in page chrome and the `tel:` link is dialable. NOTE per Walk & Watch: phone exists in **both** header strip ("Need Help? We've Got You — 844-222-8343") and footer.
5. **CHAT NOW** — user clicks Chat Now and the LiveChat widget loads
6. **MENU NAVIGATION** — user opens a mega-menu, clicks a subcategory link, and lands on the category page
7. **LOGO → HOME** — user clicks the logo from a deep page and returns to `/` (relocated from `render.spec.ts`)
8. **CART (guest)** — user adds a product to the guest cart and sees a line item with a non-zero total. Anonymous cart should persist in localStorage / cookie.
9. **FAVORITES (anonymous)** — user clicks the heart on a product. CustomInk's actual behavior unknown until Walk & Watch — either localStorage-based (heart toggles + persists in this browser) OR login-gated (clicking heart redirects to sign-in). Test verifies _whichever_ is the real behavior.

### Block 2: Authentication — sign-in & registration flows (2 journeys)

Transitions from anonymous to logged-in. Form-structure assertions only — magic link / OTP / email verification steps are out of automation scope and skip with reason.

10. **REGISTRATION** — user opens the signup form via the avatar dropdown ("Create An Account") OR via the sign-in page bottom link. Form renders, invalid-email validation works, empty submit blocked.
11. **LOGIN** — user opens the sign-in form via the avatar dropdown. Passwordless form renders (email field + "Continue With Email" button + OAuth alternatives + "Create an account" link). Invalid email validation works, empty submit blocked.

### Block 3: Logged-in user (12 journeys)

Auth-gated. Skip with reason when `storage/auth.json` absent. Tests run as soon as `npx playwright codegen --save-storage=storage/auth.json …` produces the state file.

The "My Account" dropdown observed via Walk & Watch (2026-05-03) exposes nine items plus a separated Sign Out. Every item is a journey — clicking it must take the user to a real, rendered destination. A regression that breaks any one of them silently kills part of the post-login UX, which is the bug class this block exists to catch.

#### Auth-state journeys

12. **LOGOUT** — logged-in user opens the avatar dropdown ("My Account"), clicks "Sign Out", and the header reverts to anonymous state (relocated from `user-state.spec.ts:87`)

#### My Account dropdown navigation (one journey per item)

13. **My Designs** — dropdown → "My Designs" → designs page renders (grid of saved designs OR empty-state copy)
14. **My Uploads** — dropdown → "My Uploads" → uploads page renders
15. **Order History** — dropdown → "Order History" → orders list OR empty-state
16. **Group Orders** — dropdown → "Group Orders" → group orders page renders
17. **Fundraisers** — dropdown → "Fundraisers" → fundraisers page renders
18. **Online Stores** — dropdown → "Online Stores" → stores page renders
19. **Account Settings** — dropdown → "Account Settings" → settings form renders

Each of 13–19 follows the same shape: open dropdown, click the item by accessible name, `waitForURL` for the corresponding path, assert the destination has rendered content (heading or main region). The "New" badge next to "Favorites" is marketing chrome and is **not asserted** — it disappears when the feature stops being new.

#### Dual-state journeys (anonymous + logged-in coverage)

20. **CART (persisted)** — logged-in user adds a product → reload → product still in cart. Differs from anonymous: persists across sessions, surfaces saved addresses / payment methods at checkout.
21. **FAVORITES (persisted)** — logged-in user clicks heart on a product → navigates to `/products/favorites` via the dropdown OR via the heart icon in the header strip → sees the product in the list (not empty-state). Differs from anonymous: persists server-side.

#### Header-icon journey (logged-in only)

22. **Heart icon in header strip** — when logged in, a heart icon appears in the header next to "My Account". Clicking it navigates directly to `/products/favorites` without going through the dropdown — alternative path users actually use.

#### What is NOT in Block 3

- Submenu items inside any account page (e.g. tabs inside Order History) — out of header-suite scope
- Cart drawer interactions — separate from the cart-page journey
- OAuth-driven sign-in (Google / Facebook continuation) — third-party auth, untestable from automation

### Total journey count

- Block 1 (anonymous): 9 journeys
- Block 2 (auth transitions): 2 journeys
- Block 3 (logged-in): 11 journeys (LOGOUT, 7 dropdown items, 2 dual-state, header heart icon)

= **22 journeys** total. With Happy / Negative / Edge variants where they add value (per the Test variant policy section above), the test count lands around 35–40 — auth-gated tests skip with reason until `storage/auth.json` is provided.

### Why CART and FAVORITES are in two blocks

Their behavior diverges by user state. Testing both states is the senior signal — the suite proves it knows the application has state-dependent behavior, not that it just ran the happy path twice.

| Concept   | Anonymous behavior                          | Logged-in behavior                            |
| --------- | ------------------------------------------- | --------------------------------------------- |
| Cart      | Guest cart in localStorage / cookie         | Persists server-side; surfaces saved info     |
| Favorites | localStorage-based OR login-prompt redirect | Persists server-side; appears in `/favorites` |

### Test variant policy

Each journey gets the variants that genuinely catch a user-perceivable failure mode:

- **Happy** — every journey
- **Negative** — only where the failure path is itself a feature (login error message visible, empty-cart empty-state copy, registration validation feedback)
- **Edge** — only where the boundary behavior is real (cart qty recalc, search whitespace handling, double-click chat stacking)

Skipped variants are skipped on purpose, not omitted by carelessness. Total expected: ~30 tests.

### Coverage principle — theoretical-coverage with documented skips

Every one of the 13 journeys has a test that **exists**. When a journey hits an automation wall, the test runs as far as it can and then skips with an explicit reason. The reader of the file always sees the full set of journeys, never a missing one.

Documented automation walls per journey:

- **LOGIN** — passwordless flow (see below). Test runs the form-structure assertions, then skips at the magic-link / OTP stage with reason: "out of automation scope without inbox access; cross-page logged-in state is asserted via the auth-gated describe block".
- **REGISTRATION** — submit may trigger reCAPTCHA / email verification. Test runs the form-structure assertions and the validation-feedback variants; skips after the submit-stage if anti-bot or email-verify intercepts.
- **LOGOUT, ACCOUNT MENU, FAVORITES (persisted), CART (persisted)** — skip without `storage/auth.json`. Test runs as soon as auth.json is provided.

The skip messages name the gating condition AND the path to unblock — Roman reads the file and sees every journey was thought through.

### LOGIN — passwordless flow (verified via Walk & Watch on 2026-05-03)

Observed sign-in form on `/profiles/users/sign_in`:

- Heading: "Sign In"
- Subhead: "Enter your email address or choose a different way to sign in to Custom Ink."
- Email field with label "Enter Email Address"
- Primary button: **"Continue With Email"** (not "Sign In" / "Log In")
- OAuth alternatives: "Continue With Google", "Continue With Facebook"
- Bottom link: "Create an account" (secondary entry into REGISTRATION)

Implications for the LOGIN tests:

1. **No password field exists on this form** — assertions for `getByLabel(/password/i)` are wrong. Remove.
2. **Submit button is "Continue With Email"** — locator must be `getByRole("button", { name: /continue with email/i })`, not `/sign in|log in/i`.
3. **Magic link / OTP step is unreachable from automation** without inbox or SMS interception. Tests stop at the "Continue With Email" click and skip the post-submit verification step with reason.
4. **REGISTRATION has two entry points** — the avatar dropdown ("Create An Account") _and_ the sign-in page bottom link ("Create an account"). The journey test uses the avatar dropdown (header-scoped); the sign-in page link is documented as an alternate path but not separately tested.

## Auth-gating mechanism

```ts
import { existsSync } from "node:fs";
const AUTH_STATE_PATH = "storage/auth.json";
const hasAuthState = existsSync(AUTH_STATE_PATH);

test.describe("logged-in user — header journeys", () => {
  test.skip(
    !hasAuthState,
    "Skipping auth-gated journey: storage/auth.json not present (staging credentials required).",
  );
  // tests…
});
```

Identical pattern to existing `user-state.spec.ts`. Tests run as soon as credentials are provided. No new auth abstraction.

## Fix strategy for today's 12 failing tests

| Cluster | Failures                     | Fix                                                                                                                                               |
| ------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| A       | CALL pos + edge (2)          | Add `await waitForFooterReady(page)` before phone locator — phone lives in lazy-hydrated `ci-full-footer`                                         |
| B       | CHAT pos + edge (2)          | Increase widget-attach timeout 10s → 15s; reduce parallel workers 4 → 2 so SDK init isn't starved                                                 |
| C       | FAVORITES + REGISTRATION (6) | **Walk & Watch via Chrome DevTools MCP** — observe real DOM, capture actual accessible names / labels / empty-state copy; replace guessed regexes |
| D       | LOGIN pos (1)                | Increase `page.goto` timeout 30s → 60s; rely on Playwright retries; reduce workers                                                                |
| E       | LOGIN edge (1)               | Scope submit-button selector via `page.getByRole("main").getByRole("button", …)` so the header avatar can't intercept the click                   |

**Cluster C is load-bearing** (6 of 12 failures). Walk & Watch is the canonical method (per user memory `feedback_walk_and_watch.md`); without observing the real DOM, regex guessing only repeats.

For the three new journeys (LOGO → HOME, LOGOUT, ACCOUNT MENU): write on the basis of Walk & Watch + cross-reference existing `render.spec.ts:46` (logo) and `user-state.spec.ts:87` (logout) — both are quality reference implementations already.

## Files affected

- `tests/user-journeys.spec.ts` — extended from 26 to ~30 tests, reorganized into two describe blocks
- `tests/render.spec.ts` — LOGO → HOME test moved out (or removed in cleanup phase)
- `tests/user-state.spec.ts` — LOGOUT click-through test moved out; the hover-only avatar dropdown tests stay (they cover panel structure, not the click-through)
- `tests/secondary-actions.spec.ts` — partial redundancy (cart, favorites, sign-in href checks); cleanup deferred to the post-call phase
- `tests/marketing-elements.spec.ts` — Chat Now duplicate; cleanup deferred similarly

## Out of scope (own files or out of brief)

- Cookie consent flow → `cookie-consent.spec.ts`
- Mobile hamburger menu → `responsive.spec.ts`
- Visual regression of header chrome → `visual.spec.ts`
- A11y axe scan → `a11y.spec.ts`
- Footer link hygiene → `links.spec.ts` (structural)
- SEO `<head>` essentials → `seo.spec.ts`
- Performance / LCP budget → `performance.spec.ts`
- Tests _inside_ the LiveChat iframe — third-party UI surface
- Mega-menu _every_ subcategory path — combinatorial Cartesian, not quality
- Real charge / order creation — out of staging scope

## Success criteria

1. When Roman opens `tests/user-journeys.spec.ts` and reads the test names, the file reads as a behavioral spec for what users do with the header — not a mechanical link-check loop.
2. `npx playwright test tests/user-journeys.spec.ts --project=chromium-desktop` produces zero failures. Skips for auth-gated journeys are acceptable and clearly annotated.
3. Each test passes the mutation thought-experiment: deleting the line of production code being tested makes the test fail.
4. Every scenario name is a verb phrase describing a user goal; no noun-phrase smells.
5. Two describe blocks make the anonymous / logged-in split visible at the file-structure level.

## Implementation order

1. **Walk & Watch session** — open staging in browser via Chrome DevTools MCP; capture real DOM for FAVORITES product page, `/products/favorites` empty state, REGISTRATION form (post-redirect), `/profiles/users/sign_in` form, ACCOUNT MENU dropdown items, LOGOUT control inside the dropdown (if auth available)
2. **improve-tests skill pass** — Before / After per failing test, scoped to the 12 failures plus any new selectors from Walk & Watch
3. **check-selectors skill pass** — review `HeaderComponent` and `FooterComponent` POMs for any added or changed selectors
4. **Add LOGO → HOME, LOGOUT, ACCOUNT MENU** — relocate existing tests where they exist; write new variants
5. **Run tests** — verify green or skips-with-reason; iterate on failures
6. **Cleanup phase (deferred to post-call)** — decide what to remove from `secondary-actions.spec.ts`, `render.spec.ts`, `marketing-elements.spec.ts` after Roman's feedback confirms the direction

The terminal state of this brainstorm is invoking the `writing-plans` skill to produce a step-by-step implementation plan from the order above.
