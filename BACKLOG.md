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
