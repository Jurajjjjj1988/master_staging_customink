# CustomInk staging — DOM observations from Walk & Watch

Date: 2026-05-03. Method: user-supplied screenshots; no automated MCP probe yet.

These observations replace speculative locators in `tests/user-journeys.spec.ts`. Update this file as more screens are observed.

---

## Sign-in form (`/profiles/users/sign_in`)

Passwordless / progressive auth flow.

- Heading: "Sign In"
- Subhead: "Enter your email address or choose a different way to sign in to Custom Ink."
- Email field — label "Enter Email Address"
- Primary submit button — accessible name "Continue With Email" (NOT "Sign In" / "Log In")
- OAuth alternatives: "Continue With Google", "Continue With Facebook"
- Bottom link: "Create an account" — secondary entry into REGISTRATION
- **No password field on this form.**

Implications:

- Existing tests that expect a password field are wrong; remove those assertions.
- Submit button locator must be `getByRole("button", { name: /continue with email/i })`.
- Magic link / OTP step (after submit) is unreachable from automation without inbox access. Tests stop at the form-structure assertions.
- REGISTRATION has two entry points (avatar dropdown AND this bottom link).

---

## Header — logged-in state

(Screenshot: top of page when authenticated.)

Top utility strip:

- "Need Help? We've Got You"
- Phone link: "844-222-8343" — **shown in HEADER**, not only in footer. Format `\d{3}-\d{3}-\d{4}` consistent with footer pool but the prefix `844` is new (footer pool seen so far: 855-271-2660, 855-256-1652).
- "Chat Now" link (orange)

Header right-side icons / buttons:

- Heart icon (favorites — possibly button or link, requires more observation)
- **"My Account" button** with user-avatar icon — REPLACES the "Sign In" affordance from the logged-out state. Visible accessible name appears to be `My Account` (button, expandable; renders the dropdown below)
- Cart icon (`<ci-cart>`)

Implications:

- The CALL journey may have a header tel: link in addition to the footer one. Update the "multiple tel: links agree on format" edge test — header phone is real, not flake.
- The accessible-name regex on the avatar button changes in logged-in state. Existing `accountMenuButton` locator (`/open\s+(sign in|account|user)\s+menu/i`) needs to also match "My Account".

---

## Account Menu (My Account dropdown when logged in)

Items in observed order:

1. **My Designs**
2. **My Uploads**
3. **Favorites** — with a `New` badge next to the label
4. **Order History**
5. **Group Orders**
6. **Fundraisers**
7. **Online Stores**
8. **Account Settings**
9. **Sign Out** — separated by a divider above; preceded by an exit-door icon

Implications:

- ACCOUNT MENU journey can pick any stable item; "Order History" or "Account Settings" are the most likely persistent ones across product cycles.
- Each menu item is a candidate journey for the logged-in describe block (see "Deferred logged-in journeys" below).
- The "New" badge on Favorites is a marketing element — **do not assert on it** (it will disappear when the feature stops being new).
- LOGOUT clicks "Sign Out" — accessible name regex `/sign out|log out/i` already covers this.

---

## Deferred logged-in journeys to consider tomorrow

Each menu item under "My Account" is a potential journey. Sorted by likely test value:

| #   | Item               | Journey shape                                                                   | Priority                            |
| --- | ------------------ | ------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | Order History      | logged-in user opens dropdown → clicks Order History → list/empty-state renders | P1                                  |
| 2   | Account Settings   | logged-in user opens dropdown → clicks Account Settings → form renders          | P1                                  |
| 3   | My Designs         | dropdown → My Designs → designs grid OR empty-state                             | P2                                  |
| 4   | My Uploads         | dropdown → My Uploads → uploads list OR empty-state                             | P2                                  |
| 5   | Favorites (header) | dropdown → Favorites → /products/favorites OR direct heart icon                 | P1 (covered by FAVORITES persisted) |
| 6   | Sign Out           | dropdown → Sign Out → header reverts to anonymous                               | P1 (covered by LOGOUT)              |
| 7   | Group Orders       | dropdown → Group Orders → page renders                                          | P2                                  |
| 8   | Fundraisers        | dropdown → Fundraisers → page renders                                           | P3                                  |
| 9   | Online Stores      | dropdown → Online Stores → page renders                                         | P3                                  |

**Tomorrow's decision**: implement P1 (Order History, Account Settings — already implicit in ACCOUNT MENU journey), defer P2/P3 unless Roman flags them.

---

## Still-needed observations (not yet captured)

When staging recovers from 502, run Walk & Watch on:

- **REGISTRATION form** — avatar → "Create An Account" → destination URL, form fields, submit button name, validation behavior, captcha presence
- **`/products/favorites` anonymous** — empty-state copy + CTA
- **Heart affordance on a product detail page** — accessible name, pressed-state attribute, anonymous visibility
- **LiveChat widget iframe** — actual `title` attribute when loaded
- **Cart drawer / page** — line-item structure, total formatting, qty control accessible name
