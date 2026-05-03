import { test, expect } from "../fixtures/pages.fixture";
import { HeaderComponent } from "../pages/components/HeaderComponent";

/**
 * Tests #5 #6 #7a #7b — search behavior.
 *  - #5  happy path: a valid query reaches results
 *  - #6  autocomplete suggestions appear and a click navigates
 *  - #7a empty / oversized input is handled gracefully
 *  - #7b XSS payload is escaped (security regression catcher)
 */

test.describe("@p1 search — submit valid query", () => {
  test("should_navigate_to_results_when_search_submitted", async ({ page }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);
    await header.submitSearch("tshirt");
    await page.waitForURL((url) => /tshirt/.test(url.toString()), {
      timeout: 15_000,
    });
    expect(page.url()).toMatch(/tshirt/i);
  });
});

test.describe("@p2 search — autocomplete", () => {
  test("should_show_autocomplete_and_navigate_when_suggestion_clicked", async ({
    page,
  }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);
    await header.search.fill("tshi");
    await expect(header.autocompleteOptions.first()).toBeVisible();

    const startUrl = page.url();
    // Algolia Autocomplete (`aa-Autocomplete`) is keyboard-driven; mouse clicks on
    // suggestion items don't always register on the underlying focus model.
    // Using ArrowDown + Enter mirrors the library's intended UX path.
    await header.search.press("ArrowDown");
    await header.search.press("Enter");
    await page.waitForURL((url) => url.toString() !== startUrl, {
      timeout: 12_000,
    });
    expect(page.url()).not.toBe(startUrl);
  });
});

test.describe("@p1 search — input boundaries", () => {
  test("should_handle_empty_and_oversized_search_input", async ({ page }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);
    const startUrl = page.url();

    await test.step("empty submit does not navigate", async () => {
      await header.search.fill("");
      await header.search.press("Enter");
      // Negative-test: assert URL did NOT change. We give the page a brief
      // settle window via load state (DOM-content) and then assert URL parity;
      // a real navigation would have flipped the URL well before this point.
      await page.waitForLoadState("domcontentloaded");
      expect(page.url()).toBe(startUrl);
    });

    await test.step("oversized input (1000 chars) does not crash the page", async () => {
      const big = "a".repeat(1000);
      await header.search.fill(big);
      await header.search.press("Enter");
      await page.waitForLoadState("domcontentloaded");
      // The page must still be alive — title is the cheapest health check.
      await expect(page).toHaveTitle(/.+/);
    });
  });
});

test.describe("@p2 search — autocomplete UX surface", () => {
  /*
   * Reality check from probing staging: the Algolia autocomplete (`.aa-Input`)
   * returns the same set of "popular" suggestions regardless of typed input
   * on this deployment. Query-relevance scoring is therefore tested by a
   * separate search-quality suite (out of header/footer scope). Here we
   * assert only the surface that IS reliable: the listbox opens on input
   * and closes on Escape.
   */

  test("should_open_listbox_when_user_types_into_search", async ({ page }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);
    await header.search.fill("tshi");
    await expect(header.autocompleteOptions.first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("should_close_listbox_when_escape_is_pressed", async ({ page }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);
    await header.search.fill("tshi");
    await expect(header.autocompleteOptions.first()).toBeVisible();
    await header.search.press("Escape");
    await expect(header.autocompleteOptions.first()).toBeHidden();
  });
});

test.describe("@p1 search — special character handling", () => {
  /**
   * Verify search submit doesn't crash on punctuation, quotes, or SQL-shaped
   * input. We only check that (a) the page survives, (b) no JS dialog fires
   * (covers reflected XSS in the results page too).
   */
  const CASES = [
    { label: "quotes_and_apostrophe", query: `tom's "shirt"` },
    { label: "sql_injection_shape", query: `' OR 1=1 --` },
    { label: "ampersand_and_querystring", query: `a&b=c?d` },
    { label: "unicode_and_emoji", query: `tričko 👕` },
    { label: "leading_trailing_whitespace", query: `   tshirt   ` },
  ];

  for (const c of CASES) {
    test(`should_handle_${c.label}_safely`, async ({ page }) => {
      let dialogFired = false;
      page.on("dialog", async (d) => {
        dialogFired = true;
        await d.dismiss();
      });

      await page.goto("/");
      const header = new HeaderComponent(page);
      await header.submitSearch(c.query);
      await page.waitForLoadState("domcontentloaded");

      expect(dialogFired, `dialog fired for query: ${c.query}`).toBe(false);
      // Page is still alive — title remains non-empty
      await expect(page).toHaveTitle(/.+/);
    });
  }
});

test.describe("@p1 search — XSS escape", () => {
  test("should_escape_xss_payload_in_search_query", async ({ page }) => {
    let dialogFired = false;
    page.on("dialog", async (d) => {
      dialogFired = true;
      await d.dismiss();
    });

    await page.goto("/");
    const startUrl = page.url();
    const header = new HeaderComponent(page);
    await header.submitSearch("<script>alert(1)</script>");
    await page.waitForLoadState("domcontentloaded");

    await test.step("no dialog fired (the payload did not execute)", () => {
      expect(dialogFired).toBe(false);
    });

    /**
     * Two acceptable behaviors here, both safe:
     *   (a) the site rejected the input client-side and we stayed on the same URL
     *   (b) the site navigated to a results page with the payload percent-encoded
     * What is NOT safe is the payload appearing as a live <script> element.
     */
    await test.step("input was either rejected OR percent-encoded in URL", () => {
      const stayed = page.url() === startUrl;
      const encoded = /%3Cscript%3E|%3cscript%3e/i.test(page.url());
      expect(stayed || encoded, `url after submit: ${page.url()}`).toBe(true);
    });

    await test.step("DOM does not contain an executable inline <script> from the query", async () => {
      const scriptCount = page
        .locator("script")
        .filter({ hasText: "alert(1)" });
      await expect(scriptCount).toHaveCount(0);
    });
  });
});
