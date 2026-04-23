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
    expect(await header.autocompleteOptions.count()).toBeGreaterThan(0);

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
      // Negative-test: assert URL did NOT change. Short wait window is acceptable;
      // a real navigation would trigger within 500ms.
      await page.waitForLoadState("networkidle");
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
      const scriptCount = await page
        .locator("script")
        .filter({ hasText: "alert(1)" })
        .count();
      expect(scriptCount).toBe(0);
    });
  });
});
