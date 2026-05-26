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
