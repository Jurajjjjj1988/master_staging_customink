# CustomInk staging — DOM observations 2026-05-21

Method: 3 parallel agents on the live site (`https://www.customink.com/`) via Playwright MCP. Two were authenticated (`juraj.kapusansky@gmail.com`), one anonymous mobile (375 px). Findings supersede / amend the 2026-05-03 log where noted. These observations are the source for the 2026-05-21 change-log entries in [docs/components/header.md §15](../components/header.md).

> Use this log as a dated reference. Move durable findings into the header spec (§5 / §10); leave point-in-time observations (specific phone numbers, "New" badges) here.

---

## Sign-in flow correction — IS two-step, NOT passwordless

The 2026-05-03 log labelled `/profiles/users/sign_in` as "passwordless". That was only true of **step 1**. The real flow:

1. **`/profiles/users/sign_in`** (step 1) — email field + "Continue With Email" submit + Google / Facebook OAuth + "Create an account." link. NO password field on this page.
2. Submit valid email → server redirects to **`/profiles/users/sign_in_password`** (step 2) — password field + submit + a `"Sign in with a one-time code"` link (the actual passwordless opt-in).
3. Submit `Test123` → server redirects to `/account/overview` with heading "Welcome back, juraj.kapusansky!".

Implication for tests: the LOGIN journey should split into step-1 form-structure assertions and step-2 credential assertions. The "no password field" assertion is still valid for step 1; broad "passwordless flow" framing is wrong.

---

## Header phone — changed from 844 to 855

| Observed date | Header phone   | Footer pool                            |
| ------------- | -------------- | -------------------------------------- |
| 2026-05-03    | `844-222-8343` | `855-271-2660`, `855-256-1652`         |
| 2026-05-21    | `855-256-1652` | `855-256-1652` (header + footer agree) |

The earlier "header phone differs from footer pool" assertion no longer holds. Assert format `\d{3}-\d{3}-\d{4}`, not value. Cross-surface divergence is an OPTIONAL signal.

---

## Favorites href — state-aware

- Guest empty-state lives at `/products/favorites` (still).
- Logged-in header heart points to **`/account/favorites`** (NOT `/products/favorites`).

State-aware regex for href: `/\/(account|products)\/favorites/`.

---

## Account menu — both shapes coexist when logged-in

The logged-in identity surface renders **two adjacent elements**, not one or the other:

- `<a>` link `My Account` &nbsp;·&nbsp; `data-testid="my-account"` &nbsp;·&nbsp; `href="/account"`
- `<button>` `Open My Account menu` &nbsp;·&nbsp; `aria-haspopup="true"` &nbsp;·&nbsp; opens the dropdown

The POM's `.or().or()` chain still works. For new tests prefer `data-testid="my-account"` — the only `data-testid` exposed by the header so far.

---

## My Account dropdown — full destination URLs (sidebar-verified)

The dropdown could not be opened under Playwright MCP (Stencil hover semantics + `<ci-cart>` pointer interception). Items cross-validated against the sidebar nav on `/account/overview`:

| #   | Accessible name              | Destination                                                       |
| --- | ---------------------------- | ----------------------------------------------------------------- |
| 1   | My Designs                   | `/account/designs`                                                |
| 2   | My Uploads                   | `/account/arts`                                                   |
| 3   | Favorites _(New badge)_      | `/account/favorites`                                              |
| 4   | Order History                | `/account/orders`                                                 |
| 5   | Group Orders                 | `/account/group_orders`                                           |
| 6   | **Fundraising** _(singular)_ | `https://customink.com/fundraising/dashboard` _(cross-subdomain)_ |
| 7   | Online Stores                | `/account/stores`                                                 |
| 8   | Account Settings             | `/account/settings`                                               |
| 9   | Sign Out                     | server logout endpoint (dropdown-only, not in sidebar)            |

**Correction:** earlier "Fundraisers" was an observation error — actual label is **"Fundraising"**.

---

## Design Lab (`/lab` → `/ndx/`) — logged-in delta

- `ci-header[simple="true"]` root unchanged.
- `Sign In` / `Open Sign In menu` disappear.
- `My Account` link + `Open My Account menu` button appear (same pattern as global header).
- `My Designs` button label unchanged.
- `Untitled design` button unchanged for this account (no saved designs to test the rename).
- Cart href unchanged: `/checkout/summary?cart_source=header`.
- **NEW:** a `Help` button (`aria-label="Help"`) renders alongside `Chat` (`aria-label="Chat"`) inside `ciHeader-subNav`. Not seen on the 2026-05-21 guest probe — possibly logged-in-only (unverified).
- Account-menu dropdown could not be opened (same Stencil hover issue).
- URL fragment is `#/welcomeBack` when logged-in vs `#/welcome` when guest.

---

## Cart route `/cart` — empty cart redirects to /

- Hitting `/cart` with an empty cart bounces to `/` before chrome can settle.
- During the brief render, `<ci-header>` carries a new `show-cart="false"` attribute. This is the clearest "/cart route active" signal.
- Condensed-chrome element inventory (Continue Shopping, order summary in band, etc.) remains **unverified** because the redirect prevented a stable observation. A seeded-cart probe is needed.

---

## Mobile breakpoint (375 px, guest homepage)

Surprise findings — see [docs/components/header.md §5.11](../components/header.md):

- **No hamburger menu.** Primary nav reflows into `<main>` as a flat link list.
- Primary nav anchor names **differ from desktop**: `Apparel` (desktop: `Custom Apparel`), `Design Templates`, `Check Prices`, `Your Account`, `Fundraising`, `About Us`. Treat mobile nav as a separate set.
- Search collapsed behind an icon-button combobox with the same placeholder.
- Utility strip reduced to phone only (no Chat in header — floats as iframe widget instead).
- **`Favorites` + `My Account` visible inline at GUEST state on mobile.** This contradicts the desktop matrix; could be optimistic UI / session bleed / genuine divergence. Flagged for re-verification with clean cookies.

---

## Still-needed observations

- LiveChat widget iframe — actual `title` attribute when loaded.
- My Account dropdown order from a **real-mouse hover** (cross-check the 2026-05-03 dropdown ordering against the sidebar-derived one above).
- Cart-page chrome with a **non-empty cart** — requires a seeded cart via Design Lab.
- Lab account-menu dropdown — 9-item parity with global header.
- Lab `Help` button — does it require logged-in, or was the 2026-05-21 guest probe just incomplete?
- Lab design-name button when an actual design is saved (label switch?).
- Mobile probes on `/products/*`, `/cart`, `/ndx/` — does `ci-mobile-subnav` render there?
- Mobile Favorites/My-Account-inline finding — re-verify with a clean cookie jar.
- Promo strip — content-management lifecycle.
