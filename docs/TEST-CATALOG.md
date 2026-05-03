# Test Catalog

Single source of truth for **what** the suite tests, **where** each test lives, **how** it asserts, and **why** the assertion matters. The catalog is grouped by user-facing concern — not by spec file — so a reviewer can answer "are search edge cases covered?" without grepping the codebase.

## How to read this catalog

Each row has:

- **#** — stable scenario identifier referenced in commits and ADRs
- **Test name** — `should_*` snake-case used in code
- **What** — one-sentence assertion in plain English
- **How** — the technique (selector strategy, fixture used)
- **Why** — the regression class this test would catch
- **File** — clickable link to the implementation
- **Priority** — `P1` runs on every PR; `P2` runs nightly; `P3` is informational

Cross-cutting infrastructure that is NOT a scenario lives in §99 at the bottom.

---

## 1. Render & layout

Goal: every page renders the global chrome and degrades gracefully across viewports.

| #   | Test                                                          | What                                                             | How                                                                     | Why                                                                         | File                                                | Pri |
| --- | ------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------- | --- |
| 1   | `should_render_header_and_footer_consistently_across_5_pages` | Header + footer present on home, product, blog, about, 404       | Data-driven over `PAGES_UNDER_TEST`; asserts logo, search, cart, footer | Catches partial deployments where one route silently breaks the layout      | [render.spec.ts](../tests/render.spec.ts)           | P1  |
| 26  | `should_navigate_to_home_when_logo_clicked_from_product_page` | Logo click from product page returns to /                        | `header.logo.click()` + `waitForURL`                                    | Verifies behavior, not just `href` (event-handler regressions)              | [render.spec.ts](../tests/render.spec.ts)           | P1  |
| 19  | `should_render_simplified_header_at_1023px_viewport`          | Below 1024px breakpoint mega-menu hides; logo/search/cart remain | Viewport override + visibility assertions                               | Catches CSS regressions that break the responsive collapse                  | [responsive.spec.ts](../tests/responsive.spec.ts)   | P1  |
| 20  | `should_have_no_horizontal_scroll_at_320px_viewport`          | At 320px viewport `clientWidth === 320` and no overflow          | `documentElement.scrollWidth - clientWidth <= 1`                        | Catches unconstrained-width elements that break smallest mobile             | [responsive.spec.ts](../tests/responsive.spec.ts)   | P2  |
| 23  | `should_match_visual_baseline_for_footer_legal_section`       | Footer legal/copyright row pixel-matches checked-in baseline     | `toHaveScreenshot` scoped to copyright element parent                   | Catches CSS regressions functional tests cannot (color, padding, font-size) | [visual.spec.ts](../tests/visual.spec.ts)           | P3  |
| 24  | `should_render_header_within_lcp_budget`                      | Largest Contentful Paint < 3s on homepage                        | `PerformanceObserver` for `largest-contentful-paint`                    | Catches major perf regressions; nightly only                                | [performance.spec.ts](../tests/performance.spec.ts) | P3  |

## 2. Navigation & links

Goal: every clickable affordance points where users expect AND the destination is reachable.

| #   | Test                                                               | What                                                                         | How                                                                                                  | Why                                                                                   | File                                                            | Pri |
| --- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --- |
| 2   | `should_navigate_to_expected_url_when_clicking_any_internal_link`  | Every header/footer/legal internal link points at the expected path + 200    | Data-driven over `HEADER_PRIMARY_NAV` + `FOOTER_LINKS` + `LEGAL_LINKS`; HEAD-with-GET-fallback probe | Catches CMS migrations that break the footer link surface                             | [links.spec.ts](../tests/links.spec.ts)                         | P1  |
| 2b  | `should_navigate_to_expected_url_when_clicking_footer-meta_*` (×4) | Custom Products / Promotional Items / Site Map / inline custom-t-shirts work | Data-driven over `FOOTER_META_LINKS`                                                                 | The bottom footer-meta row sits outside the section grid and was missed by spec #2    | [links.spec.ts](../tests/links.spec.ts)                         | P1  |
| 3   | `should_link_to_correct_destination_for_each_follow_us_link`       | All 6 Follow-Us links resolve correctly                                      | Data-driven over `FOLLOW_US_LINKS`; external = domain check, internal = HEAD                         | External platforms rate-limit bot HEAD/GET — we verify intent, not status, externally | [links.spec.ts](../tests/links.spec.ts)                         | P1  |
| 4   | `should_have_valid_protocol_for_special_links` (tel, skip-link)    | Phone uses `tel:` URI; skip-link `#main-content` target exists               | `toHaveAttribute` + `toBeAttached`                                                                   | Catches mobile click-to-call regressions and broken skip-link targets                 | [links.spec.ts](../tests/links.spec.ts)                         | P1  |
| 8   | `should_open_each_mega_menu_on_hover_*` (×5)                       | Each of 5 mega-menu triggers opens on hover (`aria-expanded=true`)           | `header.openMegaMenu(name)` falls back to button when no link sibling                                | Catches event-binding regressions on the dropdown UI                                  | [mega-menu.spec.ts](../tests/mega-menu.spec.ts)                 | P1  |
| 11a | `should_navigate_to_correct_page_for_*` (cart, favorites, sign-in) | Each header secondary action points at the expected route                    | Data-driven; `toHaveAttribute` regex                                                                 | Catches breakage when marketing renames cart route or moves auth flow                 | [secondary-actions.spec.ts](../tests/secondary-actions.spec.ts) | P1  |
| 11b | `should_open_chat_widget_iframe_when_chat_now_clicked`             | Clicking "Chat Now" opens the LiveChat iframe                                | `frameLocator(iframe[title*='LiveChat'])`                                                            | Verifies the integration point without testing third-party UI                         | [secondary-actions.spec.ts](../tests/secondary-actions.spec.ts) | P2  |
| 21  | `should_have_structurally_valid_href_on_every_first_party_link`    | No empty / `#`-only / `javascript:` href in first-party DOM                  | DOM scan + baseline pattern (ADR-006); excludes third-party widgets                                  | Catches CMS placeholder hrefs and JS-protocol XSS attempts                            | [regression.spec.ts](../tests/regression.spec.ts)               | P1  |

## 3. Search

Goal: the search affordance accepts user input, navigates correctly, and is hardened against bad input.

| #   | Test                                                                         | What                                                                         | How                                                      | Why                                                  | File                                      | Pri |
| --- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------- | --- |
| 5   | `should_navigate_to_results_when_search_submitted`                           | Enter on a valid query reaches a results URL                                 | `header.submitSearch(q)` + `waitForURL`                  | The simplest signal that search is alive             | [search.spec.ts](../tests/search.spec.ts) | P1  |
| 6   | `should_show_autocomplete_and_navigate_when_suggestion_clicked`              | Algolia listbox opens; ArrowDown+Enter navigates                             | `getByRole('listbox').getByRole('option')`; keyboard nav | Catches Algolia config regressions                   | [search.spec.ts](../tests/search.spec.ts) | P2  |
| 6a  | `should_open_listbox_when_user_types_into_search`                            | Suggestion list opens on any input                                           | Visibility on first option after `fill`                  | Lighter sanity than #6                               | [search.spec.ts](../tests/search.spec.ts) | P2  |
| 6b  | `should_close_listbox_when_escape_is_pressed`                                | Escape key dismisses suggestions                                             | `press("Escape")` + visibility assertion                 | Standard a11y / UX behavior for combobox             | [search.spec.ts](../tests/search.spec.ts) | P2  |
| 7a  | `should_handle_empty_and_oversized_search_input`                             | Empty submit doesn't navigate; 1000-char input doesn't crash                 | URL-stays + title-still-present                          | Boundary regressions                                 | [search.spec.ts](../tests/search.spec.ts) | P1  |
| 7b  | `should_escape_xss_payload_in_search_query`                                  | `<script>alert(1)</script>` is rejected OR percent-encoded; no script in DOM | Dialog listener + URL assertion + script-count           | XSS regression                                       | [search.spec.ts](../tests/search.spec.ts) | P1  |
| 7c  | `should_handle_*_safely` (×5: quotes, SQL-shape, `&?=`, unicode, whitespace) | Special-char queries don't fire dialogs or break the page                    | Dialog listener + title-still-present                    | Catches reflective injection across input categories | [search.spec.ts](../tests/search.spec.ts) | P1  |

## 4. User state

Goal: header reflects the user's auth state correctly.

| #   | Test                                                        | What                                                                | How                                           | Why                                                                | File                                              | Pri |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------- | --- |
| 9   | `should_show_signin_link_when_logged_out`                   | "Sign In" link visible and points at `/profiles/users/sign_in`      | `header.signInLink`                           | Auth-state regression                                              | [user-state.spec.ts](../tests/user-state.spec.ts) | P1  |
| 10  | `should_show_user_dropdown_and_allow_logout_when_logged_in` | Account menu visible (Sign-In hidden); logout returns to logged-out | `authenticated` fixture + `accountMenuButton` | Validates the round-trip; SKIPS without `storage/auth.json` (OQ-2) | [user-state.spec.ts](../tests/user-state.spec.ts) | P2  |

## 5. Marketing & support elements

Goal: the support/promo content surface stays user-reachable as marketing edits it.

| #   | Test                                                         | What                                                                     | How                                              | Why                                                                  | File                                                              | Pri |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------- | --- |
| 27  | `should_render_promo_banner_with_working_shop_sale_link`     | Announcement banner is visible with a working Shop Sale CTA              | `ci-announcement-banner` scope + HEAD probe      | Catches marketing CMS edits that ship dead CTAs                      | [marketing-elements.spec.ts](../tests/marketing-elements.spec.ts) | P2  |
| 28  | `should_expose_label_and_tel_link_for_phone_support`         | "Talk to a Real Person" label + `tel:` link both visible                 | Footer scope + text + tel-format regex           | Phone affordance is critical conversion path                         | [marketing-elements.spec.ts](../tests/marketing-elements.spec.ts) | P1  |
| 29  | `should_expose_chat_now_trigger_button`                      | "Chat Now" button is visible and enabled                                 | `getByRole('button', { name: /^chat now$/i })`   | Chat is the second highest-converting support channel                | [marketing-elements.spec.ts](../tests/marketing-elements.spec.ts) | P1  |
| 30  | `should_navigate_to_contact_page_when_send_us_email_clicked` | Footer "Send us an Email" click navigates to `/contact`                  | `link.click()` + `waitForURL(/contact/)`         | Click-through follow-up to #2 link integrity                         | [marketing-elements.spec.ts](../tests/marketing-elements.spec.ts) | P1  |
| 31  | `should_load_youtube_embed_when_play_clicked`                | TV-commercial poster click injects a YouTube iframe                      | Click `[data-link='play']`; iframe[src*=youtube] | Validates the lazy embed contract                                    | [marketing-elements.spec.ts](../tests/marketing-elements.spec.ts) | P2  |
| 32  | `should_have_klaviyo_signup_container_in_footer`             | Klaviyo container is present inside the newsletter section               | Class selector + ancestor closest()              | Confirms integration point exists; SDK init is environment-dependent | [marketing-elements.spec.ts](../tests/marketing-elements.spec.ts) | P2  |
| 32b | `should_render_rate_our_website_prompt_in_footer`            | "TELL US WHAT YOU THINK" heading + "rate our website" prompt are visible | Heading role + `getByText`                       | Catches feedback widget removal regressions                          | [marketing-elements.spec.ts](../tests/marketing-elements.spec.ts) | P2  |

## 6. Cookie consent

Goal: consent flows are correct, the rejection path doesn't leak tracking, and the banner is keyboard-operable.

| #   | Test                                                               | What                                                                    | How                                               | Why                                                                 | File                                                      | Pri |
| --- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------- | --- |
| 12  | `should_show_cookie_banner_on_first_visit`                         | Banner + Accept/Reject buttons are visible on first visit               | `dismissCookie: false`; visibility                | Sanity that the banner is wired up                                  | [cookie-consent.spec.ts](../tests/cookie-consent.spec.ts) | P1  |
| 13  | `should_persist_acceptance_and_set_analytics_cookies_after_reload` | Acceptance survives reload; OneTrust + analytics cookies appear         | `accept()` + reload + cookie name regex           | Catches consent persistence regressions                             | [cookie-consent.spec.ts](../tests/cookie-consent.spec.ts) | P1  |
| 14  | `should_persist_rejection_and_not_add_new_tracking_cookies`        | Rejection survives reload; no NEW tracking cookies added post-rejection | Diff cookie names before vs after reject + reload | Compliance contract: rejection must not silently re-enable tracking | [cookie-consent.spec.ts](../tests/cookie-consent.spec.ts) | P1  |
| 15  | `should_save_custom_preferences_via_cookie_settings`               | Settings dialog saves and dismisses the banner                          | `openSettings()` + Save button click              | Settings path is the third option users have                        | [cookie-consent.spec.ts](../tests/cookie-consent.spec.ts) | P2  |
| 18  | `should_expose_keyboard_operable_buttons_in_cookie_banner`         | All three banner action buttons are visible, enabled, tabbable          | Tabindex + visibility + enabled                   | WCAG 2.1.1 keyboard-operable invariant                              | [cookie-consent.spec.ts](../tests/cookie-consent.spec.ts) | P2  |

## 7. Accessibility

Goal: the suite enforces a WCAG 2.1 AA baseline on every PR.

| #   | Test                                                                | What                                                              | How                                                | Why                                      | File                                  | Pri |
| --- | ------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------- | ------------------------------------- | --- |
| 16  | `should_pass_axe_scan_on_*` (×2: header, footer)                    | axe-core finds 0 critical/serious violations in each region       | `makeAxeBuilder` fixture; data-driven over regions | Catches the most common a11y regressions | [a11y.spec.ts](../tests/a11y.spec.ts) | P1  |
| 17  | `should_traverse_header_and_footer_in_dom_order_with_visible_focus` | Skip-link is keyboard-focusable + site has visible :focus styling | `focus()` + stylesheet rule scan                   | WCAG 2.4.7 focus visibility              | [a11y.spec.ts](../tests/a11y.spec.ts) | P1  |

## 8. Page quality (HTML / a11y / SEO baselines)

Goal: catch the silent quality regressions that ship through CI but break the site for screen readers, search crawlers, or users on slow connections.

| #   | Test                                                                    | What                                                         | How                                                          | Why                                                                 | File                                                  | Pri |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------- | ----------------------------------------------------- | --- |
| 22  | `should_display_current_year_in_footer_copyright`                       | Footer © contains `new Date().getFullYear()`                 | `toContainText(currentYear)`                                 | Catches "still says 2024 in 2026" regressions                       | [regression.spec.ts](../tests/regression.spec.ts)     | P2  |
| 25  | `should_have_*` (×5: title, description, canonical, og:image, viewport) | `<head>` SEO essentials are present and well-formed          | `toHaveAttribute` with regex for length/format               | Direct revenue impact when broken (SERP / social previews / mobile) | [seo.spec.ts](../tests/seo.spec.ts)                   | P1  |
| 33  | `should_have_no_duplicate_id_attributes_on_homepage`                    | No `id` is reused twice                                      | DOM scan + count                                             | HTML validity AND a11y (`aria-labelledby` breaks)                   | [page-quality.spec.ts](../tests/page-quality.spec.ts) | P1  |
| 34  | `should_have_alt_text_on_every_image_in_header_or_footer`               | Every `<img>` in header/footer has `alt`                     | DOM scan inside scoped roots                                 | Image-without-alt is the most common a11y bug shipped               | [page-quality.spec.ts](../tests/page-quality.spec.ts) | P1  |
| 35  | `should_have_accessible_name_on_every_button_in_header_or_footer`       | Every button has aria-label / aria-labelledby / text / title | DOM scan; WAI-ARIA accessible name computation               | Buttons-without-name break screen reader users                      | [page-quality.spec.ts](../tests/page-quality.spec.ts) | P1  |
| 36  | `should_expose_at_least_one_jsonld_block_on_homepage`                   | At least one valid JSON-LD `<script>` block exists           | `script[type="application/ld+json"]` + `JSON.parse` validity | Structured data drives rich SERP results                            | [page-quality.spec.ts](../tests/page-quality.spec.ts) | P2  |

## 9. Helpers (unit-level)

Goal: shared test utilities are themselves correct.

| #     | Test                 | What                                                     | How                    | Why                                                                   | File                                                 | Pri |
| ----- | -------------------- | -------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------- | ---------------------------------------------------- | --- |
| H1–H5 | `escapeRegex.*` (×5) | Regex meta-characters are escaped for safe interpolation | Direct unit assertions | A bug in `escapeRegex` would silently break every name-regex selector | [\_unit/regex.test.ts](../tests/_unit/regex.test.ts) | P1  |

---

## 99. Cross-cutting infrastructure

These are not scenarios — they are guarantees the fixture stack provides on EVERY test. Documented here so a reviewer doesn't double-cover the same ground.

- **`monitorPageHealth`** (auto, scope-aware): captures console errors + warnings, page errors, 4xx/5xx network responses, broken images inside header/footer, mixed-content. Uses `expect.soft` so the original test failure remains primary. Allowlists are explicit and reviewed quarterly. See [ADR-002](adr/002-page-health-fixture.md), [ADR-004](adr/004-allowlist-policy.md).
- **`cookieDismissed`** (auto, opt-out via `test.use({ dismissCookie: false })`): adds the OneTrust dismissal cookie before the test navigates, so the banner doesn't intercept clicks. Cookie tests opt out at the file level.
- **`makeAxeBuilder`** (on-demand): pre-configured AxeBuilder with WCAG 2.1 AA tags. Use `await makeAxeBuilder().include('selector').analyze()`.
- **`authenticated`** (on-demand): a `Page` in a separate context loaded from `storage/auth.json`. Skips with a clear annotation when the file is absent (OQ-2).

## How to add a new test

1. Decide which section above the test belongs to — that is the spec file.
2. If the test is data-driven and the data isn't already in `data/`, add it there first; tests should never inline domain data.
3. Use the closest-fit POM component (`HeaderComponent`, `FooterComponent`, `CookieBanner`). Never reach into the DOM directly from a test.
4. Tag with `@p1` / `@p2` / `@p3`. Default to `@p2`; promote to `@p1` only if the failure is a deploy blocker.
5. Add a row to this catalog with one-line What/How/Why.
6. Run `npm run check` (typecheck + lint + P1) before pushing.
