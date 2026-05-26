# Backlog — non-test work surfaced by the suite

Items here are NOT test gaps. They are real product / infra blockers the test
suite has documented as `test.fixme` and which need owner action.

Each entry lists: **what blocks**, **how many tests are gated**, **owner**, **how to verify the fix**.

---

## 1 — WCAG 2.4.1 Bypass Blocks regression — skip link is not Tab #1

**Blocks:** 1 fixme test (`tests/header/accessibility.spec.ts:92`) + part of skip-link journey coverage.

**Symptom:** Tab #1 and Tab #2 fokus stays inside the LiveChat warm-mount iframe (`secure.livechatinc.com`). The `<a class="skip-link" href="#main-content">` becomes reachable only on Tab #3. Doc §1.7 #1 documents this — observed on staging probe 2026-05-21.

**Why it matters:** WCAG 2.1 SC 2.4.1 (Bypass Blocks, Level A) requires the skip link to be the first interactive element a keyboard user can focus. Failing this is a Level-A a11y blocker, not a nice-to-have.

**Owner:** Front-end + LiveChat integration. Likely fix paths:

- Add `tabindex="-1"` to the LiveChat iframe wrapper until the widget is opened, OR
- Lazy-mount LiveChat after user-intent (current warm-mount happens at page load), OR
- Move the iframe outside the natural Tab order via container `inert` until activation.

**How to verify the fix:** Remove `test.fixme` from `accessibility.spec.ts:92`. The test fokuses fresh page, presses Tab once, asserts focused element matches the skip-link href `#main-content`.

---

## 2 — WCAG 2.5.5 Target Size regression — hamburger is 40×40 px

**Blocks:** 1 fixme test (`tests/header/accessibility.spec.ts:106`).

**Symptom:** `#menuButton` (mobile hamburger, prvok 16 v doc §1.3) má computed `width: 40px; height: 40px`. WCAG 2.1 SC 2.5.5 (Target Size, Level AAA) requires ≥ 44 × 44 CSS px. Borderline — also fails 2.5.8 (Target Size Minimum, Level AA, ≥ 24 × 24 px is met, but 2.5.5 Level AAA is not).

**Why it matters:** Mobile accessibility — users with motor impairments or thumb-only operation mis-tap 40 × 40 targets at a higher rate. Doc §1.7 boundary conditions section flags this.

**Owner:** Front-end (CSS rule on `.ciHeader-mobile-menu-btn`). Pure width/height bump (or padding-tweak that grows the click target without shifting layout). No backend coupling.

**How to verify the fix:** Remove `test.fixme` from `accessibility.spec.ts:106`. Test asserts both axes are ≥ 44 px.

---

## 3 — V4 (logged-in) creds — service account needed

**Blocks:** 9 fixme tests across:

- `tests/header/variant-4-accounts.spec.ts` — 4 fixme (Sign In → My Account swap, Open My Account button, Favorites → /account, D2 dropdown 9-item enumeration).
- `tests/journeys/logged-in.spec.ts` — 5 fixme inside the D2 remaining-items loop (Favorites / Group Orders / Fundraising / Online Stores / Sign Out).

**Symptom:** Probe agent 2026-05-25 nepodarilo sa prihlásiť s poskytnutými test credentials — buď je password invalid, alebo aggressive auto-redirect (cookie `interactions`) preruší password submit pred dokončením. Žiadny logged-in capture sa nevytvoril.

**Why it matters:** Variant 4 je 25 % povrchu hlavičky (D2 dropdown, identity swap, cart count badge, favorites cieľ `/account/favorites`). Bez logged-in coverage je celý variant „blackbox".

**Owner:** QA + DevOps. Treba:

1. Service account na staging s plnými D2 entitlements (Order History, Group Orders, Fundraising enrollment, Online Stores access).
2. Stable email/password pair, ideálne v `.env` (gitignored) — NIE inline v `auth.setup.ts`.
3. Možno aj OAuth bypass / sudo path pre testovacie účty, ak production-grade auto-redirect nemožno vypnúť cez cookie `interactions=false`.

**How to verify the fix:**

1. `npx playwright codegen --save-storage=storage/auth.json https://www-master.staging.customink.com`, login s service accountom.
2. `npx playwright test --project=chromium-desktop-authed` — všetkých 9 fixme testov by malo prejsť (po `test.fixme` removal).

---

## 4 — Promo strip lifecycle nie je dokumentovaný

**Blocks:** 1 test je „soft skip" (`tests/header/variant-1-homepage.spec.ts:71`) — keď Promo CTA `Shop Sale` nie je v aktuálnej marketing rotácii, test sa `test.skip()`-uje.

**Symptom:** `<ci-announcement-banner>` element je hydrated v DOM-e ale `0 × 0 px` keď nie je aktívna kampaň (pozorované 2026-05-25). Conditions na suppress per session, A/B variants, rotation cadence nie sú dokumentované.

**Why it matters:** Promo strip je vždy navštevovaný marketing surface — visibility regression by neprešla cez aktuálne pokrytie (lebo test sa skipuje). Bez doc nemôžeme distinguish „kampaň skončila" od „banner sa rozbil".

**Owner:** Marketing Operations + FE. Treba:

- Doc kde sa kampaň konfiguruje (CMS slot? feature flag? Optimizely?).
- Cadence (always-on default vs conditional).
- Test fixture-mode toggle (forced render via cookie alebo URL param) na deterministic E2E.

---

## 5 — Mega-menu inert na automation

**Blocks:** Nie je to fixme blocker (testy bežia cez `focus()+Enter` keyboard activation), ale debt.

**Symptom:** Caret button `<button class="ciHeader-link-menu-icon">` má computed `pointer-events: none` + sibling `<a>` overlay zachytáva pointer events. Synthetic Playwright hover / click / mouse.move zlyháva s "subtree intercepts pointer events" alebo neflipne `aria-expanded`. Real-mouse + keyboard funguje.

**Why it matters:**

- WCAG 2.5.7 (Dragging Movements, Level AA) — pointer-only affordance je teoreticky borderline (panel je accessible cez keyboard, takže fail neni absolútny).
- Test debt: každý mega-menu test musí ísť cez keyboard path namiesto user-like mouse.

**Owner:** FE. Riešenie: presmerovať pointer-events tak aby caret samostatne mohol byť kliknutý (bez sibling `<a>` interception). Alebo: zlúčiť caret + link do jedného affordance kde `<a>` je primárny target.

**How to verify the fix:** V `pages/components/HeaderComponent.ts:108` zmeniť `openMegaMenu` z `focus()+Enter` na `trigger.click()`. F1-F5 testy by mali pokračovať v pass-e.

---

## Priorita

| #   | Priorita | Effort  | Unblocks                 |
| --- | -------- | ------- | ------------------------ |
| 3   | P0       | 30 min  | 9 tests + V4 coverage    |
| 2   | P1       | 15 min  | 1 test + a11y compliance |
| 1   | P1       | 1-2 h   | 1 test + WCAG Level A    |
| 4   | P2       | 1 h doc | observability            |
| 5   | P3       | 2 h     | code quality / a11y AA   |

---

## Investigation notes — 2026-05-26 failures

Two failing tests from the run on 2026-05-26 — root causes analyzed from `test-results/*/error-context.md`, screenshots, and POM / doc cross-reference. Read-only investigation; no test files were modified.

### Finding A — V3 Lab a11y: axe `listitem` violation is a genuine product bug

- **Test:** `tests/header/accessibility.spec.ts:63` — _"V3 lab header has no WCAG 2.1 AA violations"_
- **Symptom:** axe reports 2 nodes failing rule `listitem` (impact: serious, tags `wcag2a`, `wcag131`). Both nodes are MUI list items: `<li class="MuiListItem-root … css-1yuwiqh">` and `<li … data-testid="sign-out">`. Error message: _"List item does not have a `<ul>`, `<ol>` parent element"_.
- **Hypothesis matched:** **Genuine product regression**, not axe misconfiguration. Evidence:
  - The `<li data-testid="sign-out">` element comes from the Lab account-menu dropdown — that dropdown is part of the V3 Lab chrome (doc §3, line 812 mentions "Lab account-menu dropdown 9-item parita s globálnym headerom — unverified"). The dropdown is wired into the `<ci-header>` host element, so axe's `.include("ci-header-prerender, ci-header")` correctly scopes them in.
  - The `MuiListItem` markup style is Material UI — that means the Lab account dropdown is rendered with raw `<li>` siblings without a wrapping `<ul role="menu">`. This is a real WCAG 1.3.1 Info & Relationships (Level A) violation: a screen reader announces orphaned list items with no group context, and assistive tech cannot navigate them as a list.
  - The screenshot (`test-failed-1.png`) confirms the Lab task-mode chrome rendered correctly (My Designs + Untitled design + identity strip visible), so the page itself is in the right state — only the markup is malformed.
- **Why this is NOT an axe-allowlist case:** Adding `.disableRules(["listitem"])` would mask the same bug if it surfaces in V1/V2/V4. The rule is WCAG Level A and impact "serious" — it should fail the build, not be silenced.
- **Recommended action:**
  1. **Product:** Open FE ticket against the Lab account dropdown component — wrap its `<li>` siblings in `<ul role="menu">` (or `<ol>` if order matters). Add `role="menuitem"` to each `<li>` per WAI-ARIA Authoring Practices.
  2. **Test:** No code change. Keep the test failing until FE ships the fix — it's catching exactly the regression it was designed to catch.
  3. **BACKLOG:** Promote this to a new top-level BACKLOG entry (e.g. "Lab account dropdown — WCAG 1.3.1 listitem violation") with owner = FE Lab team, priority P1 (Level-A blocker, same tier as item #1).

### Finding B — Guest favorites journey: hidden duplicate-slot favorites link, NOT hydration race

- **Test:** `tests/journeys/support.spec.ts:81` — _"clicking favorites in the header without anything saved shows the empty state"_
- **Symptom:** `expect(header.favorites).toBeVisible()` fails after 10s. Locator resolved 14 times to `<a data-testid="favorites-global-header" class="ghf-icon-button ciHeader-favorites-icon-button" href=".../products/favorites">` — same element each retry, all hidden. Screenshot shows a heart icon IS visible in the rendered viewport (in the meganav band).
- **Hypothesis evaluated:**
  - **#1 Viewport mismatch:** _PARTIAL match._ The viewport itself was correct (chromium-desktop 1440×900, screenshot proves desktop chrome rendered). But the root cause is related — see #2.
  - **#2 CSS regression:** _NO._ No evidence of a new `display: none` rule in the trace. The duplicate-slot pattern is documented as long-standing.
  - **#3 Hydration race:** _UNLIKELY._ A hydration race would produce flickering (some polls visible, some hidden). Here all 14 polls returned the SAME element as hidden — consistent CSS state, not a race.
  - **The actual root cause (documented but missed in POM):** Doc `docs/components/header.md` line 200 and line 510 explicitly note: _"DOM má duplicate cart/favorites instances (mobile + desktop slot, jeden visible podľa breakpointu) — scope cez `:visible` filter alebo `viewport.width < 1024` switching, NIE cez tag samotný."_ Translation: the header renders TWO favorites `<a>` elements (mobile slot + desktop slot); the breakpoint media query hides one via `display: none`. The POM at `pages/components/HeaderComponent.ts:66-69` does `.getByRole("link", { name: /^favorites$/i }).or(getByLabel(/favorites/i)).first()` — `.first()` resolves by DOM order, not visibility, and happens to land on the hidden slot (mobile slot rendered first in markup, hidden on desktop).
- **Evidence corroboration:**
  - The error log's "14 × resolved to … hidden" with identical element attributes across all polls confirms a stable hidden element, not a hydration transient.
  - The page snapshot in `error-context.md` lines 102-105 lists the meganav-band favorites at ref `e73` as a visible `link "Favorites"` — confirming a SECOND, visible favorites link exists in DOM. The POM's `.first()` resolved to the WRONG one.
  - The screenshot shows the heart icon visually present in the top-right — confirming desktop chrome rendered fully, hydration completed.
- **Recommended action:**
  1. **Test/POM fix (high-priority, P1):** Change `HeaderComponent.ts:66-69` so `favorites` filters for visible only. Two options:
     - `this.favorites = this.root.getByRole("link", { name: /^favorites$/i }).or(this.root.getByLabel(/favorites/i)).locator("visible=true").first();` — explicit `:visible` filter (Playwright's own visible engine).
     - Or scope by data-testid + visibility: `this.root.locator('a[data-testid="favorites-global-header"]:visible').first()`.
  2. **Optional defensive guard:** Add `await header.root.waitFor()` at top of the test — cheap insurance against hydration races on slow staging, even though that wasn't the cause here.
  3. **Apply same fix to the cart locator** at `HeaderComponent.ts:48` — doc explicitly notes cart has the same dual-slot pattern. Pre-emptive.
  4. **No FE ticket needed** — the dual-slot pattern is intentional responsive design; only the POM was wrong.

### Cross-cutting observations

- Both failures highlight POM/test-suite contracts that need a stronger "visible-only" default for components with documented dual-slot rendering (favorites, cart, possibly Chat Now). Consider adding a lint or convention in `pages/components/*` to always chain `:visible` for elements documented in `header.md` §1.7 line 510 as duplicate-slot.
- Failure A confirms the a11y test in its current shape works as a regression detector — DO NOT relax it with `.disableRules()`.

---

## Investigation notes — 2026-05-26 follow-up (workers=3 verification)

Three hard failures from the workers=3 verification run analyzed read-only.
Live trace artifacts in `test-results/*/error-context.md` were partially overwritten
by a subsequent in-progress run; the V1 a11y error-context was captured before
overwrite, the other two are reasoned from test source + POM + helper code +
the documented workers=3 throttling hypothesis already encoded in
`playwright.config.ts:13-18` ("3 workers shaved wall time 39% but tripled the
flake rate by triggering per-IP request budget throttling").

### Finding C — V1 homepage a11y: staging returned 503, not a real WCAG regression

- **Test:** `tests/header/accessibility.spec.ts:23` — _"V1 homepage header + skip link has no WCAG 2.1 AA violations"_
- **Symptom:** `locator('ci-header-prerender, ci-header').first().first()` waitFor times out after 15s (`TIMEOUTS.HYDRATION`). The captured `error-context.md` page snapshot shows ONLY: `heading "503 Service Temporarily Unavailable" [level=1]`. The header host element never rendered because the response body was a 503 error page from the staging edge.
- **Hypothesis matched:** **Workers=3 hydration race / per-IP throttling.** This is exactly the mode described in `playwright.config.ts:13-18` — under workers=3 against staging, concurrent goto() bursts trip the per-IP request budget; the edge returns 503 instead of the homepage HTML. axe never runs because the precondition (header attached) is never met. Note the test was PASSING at workers=2 baseline, which corroborates per-IP throttling as the cause (lower concurrency stays under the budget).
- **Classification:** **(c) flake masquerading as failure** — triggered by infrastructure throttling, not by a product bug. The test code is correct; the test environment was the wrong shape.
- **Why this is NOT a real product regression:** The 503 came BEFORE any header HTML, so axe never inspected the DOM. No WCAG rule was actually evaluated. There is no signal here about WCAG compliance, only about staging availability under concurrent load.
- **Why this is NOT a test bug:** The test correctly waits for the header to attach before scanning. The 15s `TIMEOUTS.HYDRATION` budget is appropriate for normal hydration; a 503 is the wrong response shape, not a slow response.
- **Recommended action:**
  1. **No FE ticket** — staging 503 is infra-level and load-induced, not a product defect.
  2. **No test fix** — restoring `workers: 2` (already done in the pending diff on `playwright.config.ts`) resolves the symptom. Confirmed by inspection: current config now sets `workers: process.env.CI ? 4 : 2`.
  3. **Re-run at workers=2** — under Playwright's default retry budget (`retries: 1` locally, `2` in CI), this class of edge-503 is absorbed without surfacing. If it surfaces again at workers=2 baseline, escalate as a staging stability issue (not as a WCAG regression).
  4. **Optional hardening (not applied):** add a `goto` response check that fails fast on 5xx with a clear message ("staging returned 503 — likely throttling, retry") so the failure mode is self-explanatory in CI logs. Out of scope for this read-only investigation.

### Finding D — Mobile-small (375×667) responsive: same staging 503 / hydration starvation under workers=3

- **Test:** `tests/header/responsive.spec.ts:23` (test body), described at `:20` for the `mobile-small` breakpoint defined in `data/breakpoints.ts:7-13` (`{ width: 375, height: 667 }`).
- **Symptom:** Test was passing or borderline-flaky at workers=2; became a consistent fail under workers=3. The live trace artifact was overwritten by a subsequent run before I could capture it, but the failure mode is fully explained by the in-tree evidence.
- **Hypothesis matched:** **Workers=3 per-IP throttling, same root cause as Finding C.** Evidence:
  - The file-level comment block at `tests/header/responsive.spec.ts:12-17` (currently committed) names the exact failure mode: _"viewport-switching sweep across many breakpoints hammers a single staging endpoint with back-to-back goto() + hydration waits. Parallel mode across workers triggers per-IP budget throttling and intermittently fails the late-hydration assertions."_ This file is now configured `test.describe.configure({ mode: "serial" })` precisely to mitigate this — but per-file serial only stops `responsive.spec.ts` from racing itself; it does NOT prevent OTHER spec files from racing it on a 3rd worker.
  - At 375×667 the test asserts the hamburger is visible (`expectedHamburger: true` per `data/breakpoints.ts:11`). Under starved hydration the `#menuButton:visible` count stays at 0 because the breakpoint-driven CSS / WC hydration didn't complete before `TIMEOUTS.LAZY_DOM`.
  - The test uses `expect(async () => …).toPass()` to absorb single-paint hydration races. That gracefully absorbs the 1-paint race at 1023px (the documented edge case). It does NOT absorb a 503 or a hydration starvation that lasts the whole 15s window.
  - Crucially, this is the SAME root cause as Finding C: workers=3 + staging per-IP budget = degraded responses on whichever spec rolls in third. The mobile-small test was simply the unlucky one this run.
- **Classification:** **(c) flake masquerading as failure** — under workers=3 it's deterministic-looking (consistent fail) but goes away at workers=2. That's the textbook throttling signature, not a real responsive regression at 375px.
- **Why this is NOT a real responsive regression:** No evidence the 375px breakpoint itself changed. The `mobile-small` config (`expectedHamburger: true`) matches doc §1.4.8 and was already passing at workers=2. The build between runs is the staging build — same FE artifact for both configs.
- **Why this is NOT a test/POM bug:** The test code already uses the right pattern (`#menuButton:visible` with `toPass` retry inside `TIMEOUTS.LAZY_DOM`). The POM doesn't even enter the picture for this assertion — it's a raw `page.locator()`. The only test-side mitigation would be cross-spec serialization, which is too heavy-handed for a workers-count knob fix.
- **Recommended action:**
  1. **No FE ticket** — same as Finding C, this is infrastructure throttling, not a product defect.
  2. **No test fix** — `workers: 2` baseline (already restored in the pending config diff) is the intended resolution.
  3. **Do NOT increase retries** beyond the current `1 local / 2 CI` budget to mask this. Retries should absorb single transient flakes, not paper over a systematic throttling regime. If workers=3 is required for wall-time reasons in the future, the right fix is per-spec rate-limiting (or a dedicated staging IP), not retry inflation.
  4. **Optional follow-up (not applied):** if the team revisits workers=3, add a global `route` interceptor counting requests/sec and assert a soft ceiling to surface throttling at suite start rather than mid-run.

### Finding E — Phone affordance: real test bug — wrong DOM scope (footer instead of header utility strip)

- **Test:** `tests/journeys/support.spec.ts:12` — _"phone affordance is dialable in the format the OS dialer accepts"_
- **Symptom:** Pre-existing failure, NOT introduced by workers=3 (was failing at both workers=2 and workers=3). Trace artifact overwritten; reasoning from source.
- **Test body:** Calls `await waitForFooterReady(page)` (which scopes to and scrolls in `ci-full-footer, [role='contentinfo']` — see `helpers/page-state.ts:9-13`), then queries `page.locator('a[href^="tel:"]').first()` at the PAGE scope.
- **Hypothesis matched:** **Wrong-location test bug.** The test comment on `support.spec.ts:16` says _"Phone link lives in lazy-hydrated `ci-full-footer` — wait or race the hydration"_, but per doc §1.3 prvok 8 the canonical phone link lives in the HEADER utility strip (`.banner-container`), NOT in the footer. Corroborating evidence in-tree:
  - `pages/components/HeaderComponent.ts:34-39` documents the header support phone explicitly: _"Header support phone (`tel:` link). Lives in the 'Need Help? We've Got You' support strip when shown — observed on staging 2026-05-03 (e.g. 844-222-8343). Distinct from the footer phone; CALL edge tests assert both agree on format."_
  - `pages/components/HeaderComponent.ts:80` exposes a ready-to-use locator: `this.headerPhone = this.root.locator('a[href^="tel:"]').first();` — the header-scoped equivalent the test SHOULD be using.
  - The test's `page.locator('a[href^="tel:"]').first()` resolves in DOM order across the whole document. After `waitForFooterReady` has scrolled the footer into view, the first-encountered `tel:` link can be either header or footer depending on hydration ordering — non-deterministic, and the header utility strip phone link is the documented authoritative one.
- **Secondary issue:** even within the footer, `ci-full-footer` lazy-hydrates, and `waitForFooterReady` only waits for `attached` + `scrollIntoView`, not for inner content (the tel link inside the footer) to render. So when the test happens to bind to a footer tel link, it races the lazy descendant hydration. This is the racing condition the task description hypothesized; it compounds the wrong-scope bug.
- **Classification:** **(b) test/POM bug.** Wrong location + wrong helper (footer-readiness gate for a header element). NOT a flake (deterministic when the page renders both phone link variants in the wrong DOM order, deterministic-fail when the footer phone takes longer than the header phone to appear).
- **Why this is NOT a real product bug:** The header utility strip phone link IS present on the live site (per the POM doc comment + staging probe 2026-05-03). The test is just not querying it.
- **Why this is NOT a flake:** The failure is reproducible across workers configurations and across runs — it predates the workers=3 change. Increasing retries would not help because the fundamental query is wrong.
- **Recommended action (NOT applied — investigation is read-only):**
  1. **Test fix (proposed only):** Re-scope the query to the header utility strip and use the POM's existing `header.headerPhone`. Concretely, the test fixture already injects `header` (the `HeaderComponent` instance) — add `header` to the destructured fixtures on `support.spec.ts:13`, drop the `waitForFooterReady` call (or replace with `header.root.first().waitFor({ state: "attached" })`), and query `header.headerPhone` instead of the page-scoped `a[href^="tel:"]`. The format regex on `support.spec.ts:24` and the "talk to a real person / customer service / call us / need help" text assertion on `:30` can stay — both apply to the header support strip content.
  2. **No FE ticket** — the header utility strip phone link already exists in production.
  3. **No retry change** — retries do not fix a wrong query.
  4. **Adjacent question for the test author:** is there ALSO a footer phone link that should be covered (the POM comment on `HeaderComponent.ts:39` says "CALL edge tests assert both agree on format")? If yes, a second test should scope to the footer explicitly via `page.locator('ci-full-footer a[href^="tel:"]')` after a stronger footer readiness gate (wait on the descendant, not just on the host).

### Summary table

| Finding | Test                                                | Classification                                                          | Recommended action                                                                                 |
| ------- | --------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| C       | `tests/header/accessibility.spec.ts:23`             | (c) flake — staging 503 under workers=3                                 | Run at workers=2 baseline (already restored in pending config diff). No FE ticket. No test change. |
| D       | `tests/header/responsive.spec.ts:23` (mobile-small) | (c) flake — same workers=3 throttling root cause                        | Run at workers=2. No FE ticket. No retry inflation.                                                |
| E       | `tests/journeys/support.spec.ts:12`                 | (b) test bug — wrong DOM scope (footer instead of header utility strip) | Re-scope to `header.headerPhone` (POM locator already exists). No FE ticket.                       |

### Cross-cutting note

Findings C and D share a single root cause: workers=3 + staging per-IP request budget = 503 / hydration starvation. The empirical comment block already in `playwright.config.ts:13-18` predicted this exactly — the verification run is the data point that confirms the prediction. Hold the line at workers=2 locally; if a future need for higher concurrency arises, invest in either a dedicated staging IP / bypass or per-spec rate-limiting before bumping workers.

Finding E is independent — a pre-existing test correctness gap unrelated to the workers knob. Fix it in a separate change so the diff stays attributable.
