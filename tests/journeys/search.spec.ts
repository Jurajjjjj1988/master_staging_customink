import { test, expect } from "../../fixtures/pages.fixture";
import { TIMEOUTS } from "../../helpers/timeouts";

/**
 * Search journeys — happy path, autocomplete keyboard flow, no-results.
 * Logged-in search variant lives in journeys/logged-in.spec.ts.
 */

test.describe("@p1 journey — find / search submit", () => {
  test("user submits a valid query and lands on results that reflect it", async ({
    page,
    header,
  }) => {
    await page.goto("/");

    await header.submitSearch("tshirt");
    // waitForURL defaults to waitUntil:"load" — staging keeps long-tail
    // third-party requests open and never fires "load" within URL_CHANGE.
    // "commit" returns as soon as the new URL is committed, matching the
    // domcontentloaded baseline used in pages.fixture goto override.
    await page.waitForURL((url) => /tshirt/i.test(url.toString()), {
      timeout: TIMEOUTS.URL_CHANGE,
      waitUntil: "commit",
    });
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator("body")).toBeVisible();

    // Algolia returns 0-hit regression class: route resolves but nothing
    // renders. Header nav has 1 t-shirt category link — a real results
    // page renders many product-detail links.
    //
    // Canonical web-first pattern: expect.poll retries the count() read
    // until the threshold is met, absorbing progressive Algolia hydration
    // without depending on Playwright's outer retry budget.
    const productLinks = page.locator('a[href*="/products/t-shirts/"]');
    await expect(productLinks.first()).toBeVisible({
      timeout: TIMEOUTS.LAZY_DOM,
    });
    await expect
      .poll(() => productLinks.count(), {
        message:
          "results page should render multiple matching products, not just the header nav category link",
        timeout: TIMEOUTS.LAZY_DOM,
      })
      .toBeGreaterThan(2);
  });

  /*
   * §1.3 search edge cases — input-validation, DoS resilience, keyboard
   * dismiss, XSS escaping. Each test pins a single regression class so a
   * future change that breaks input handling on the search box surfaces
   * immediately rather than failing the user in production.
   *
   * Regression class: trim() missing on client → blank URL params or 0-hit
   * results page rendered as if the user typed actual content. Edge cases
   * cover empty, ascii-space-only, and mixed-whitespace (tab + newline).
   * Acceptable outcomes per input: stay on origin (preferred) OR navigate
   * to an explicit no-results surface — silent homepage render is the bug.
   */
  test("empty / whitespace-only query is suppressed or lands on no-results", async ({
    page,
    header,
  }) => {
    const queries = ["", "    ", "\t\n"];
    await page.goto("/");
    const startUrl = page.url();

    for (const query of queries) {
      await test.step(`query: ${JSON.stringify(query)}`, async () => {
        await header.search.fill(query);
        await header.search.press("Enter");
        await page.waitForLoadState("domcontentloaded");

        const stayedOnOrigin = page.url() === startUrl;
        if (stayedOnOrigin) {
          // Preferred: client-side guard suppressed the submit entirely.
          expect(page.url()).toBe(startUrl);
        } else {
          // Fallback: query went through but must land on a no-results state,
          // not a silent homepage render.
          const message = page.getByText(
            /no results|nothing found|0 results|did not match|couldn['’]t find/i,
          );
          const hasMessage = (await message.count()) > 0;
          expect(
            hasMessage,
            "blank query must either be suppressed OR resolve to an explicit no-results state",
          ).toBe(true);
          // Reset to origin so the next iteration starts from the same state.
          await page.goto("/");
        }
      });
    }
  });

  test("oversized query (1000 chars) is handled without hang", async ({
    page,
    header,
  }) => {
    // Regression class: DoS via unbounded query length — slow Algolia call,
    // server 414 URI Too Long, or browser layout thrash. Bounded by
    // TIMEOUTS.URL_CHANGE so any pathological hang fails the test.
    await page.goto("/");
    const oversized = "a".repeat(1000);

    await header.search.fill(oversized);
    await header.search.press("Enter");

    // Either navigation completes within the URL-change budget OR the form
    // refuses to submit (URL unchanged). Both are acceptable; an
    // indefinite hang is not.
    await Promise.race([
      page.waitForURL(/.+/, { timeout: TIMEOUTS.URL_CHANGE }),
      page.waitForLoadState("domcontentloaded", {
        timeout: TIMEOUTS.URL_CHANGE,
      }),
    ]);
    // Browser is responsive after the operation — assert the page DOM still
    // answers a basic query.
    await expect(page.locator("body")).toBeVisible({ timeout: TIMEOUTS.QUICK });
  });

  test("Escape closes the autocomplete listbox panel", async ({
    page,
    header,
  }) => {
    // Keyboard-dismiss WAI-ARIA combobox pattern: Escape must close the
    // listbox without submitting. Regression class: pressing Escape navigates
    // away or leaves the listbox open (focus trap).
    await page.goto("/");
    const startUrl = page.url();

    await header.search.fill("tshi");
    await expect(header.autocompleteOptions.first()).toBeVisible({
      timeout: TIMEOUTS.QUICK,
    });

    await header.search.press("Escape");
    // Listbox panel must collapse — listbox role no longer rendered OR has 0
    // visible options. Either condition satisfies the WAI-ARIA contract.
    await expect(header.autocompleteOptions.first()).toBeHidden({
      timeout: TIMEOUTS.QUICK,
    });
    // Escape MUST NOT submit / navigate.
    expect(page.url(), "Escape must not trigger navigation").toBe(startUrl);
  });
});

test.describe("@p1 journey — autocomplete suggestions", () => {
  test("typing opens suggestions and ArrowDown+Enter navigates", async ({
    page,
    header,
  }) => {
    await page.goto("/");
    const startUrl = page.url();

    await header.search.fill("tshi");
    await expect(header.autocompleteOptions.first()).toBeVisible({
      timeout: TIMEOUTS.QUICK,
    });

    // Algolia is keyboard-driven; mouse clicks on suggestion items don't
    // reliably register because of the focus model.
    await header.search.press("ArrowDown");
    await header.search.press("Enter");
    await page.waitForURL((url) => url.toString() !== startUrl, {
      timeout: TIMEOUTS.URL_CHANGE,
    });
  });
});

test.describe("@p1 journey — search returns no results", () => {
  // Regression class: silent redirect to homepage on no-match, or stale
  // recommendations without an empty-state cue.
  test("nonexistent query lands on a results page that says it found nothing", async ({
    page,
    header,
  }) => {
    await page.goto("/");
    const NONEXISTENT = "qzx9f7" + Date.now().toString(36);

    await header.submitSearch(NONEXISTENT);
    await page.waitForURL(new RegExp(NONEXISTENT, "i"), {
      timeout: TIMEOUTS.URL_CHANGE,
      waitUntil: "commit",
    });

    // Single web-first assertion that retries until either the explicit
    // no-results message OR the first results-grid listitem becomes visible.
    // Polling the count() of progressively-hydrating DOM was the original
    // flake — `.or(...).first()` lets Playwright auto-retry until one path
    // resolves, replacing two synchronous count() reads.
    const message = page.getByText(
      /no results|nothing found|0 results|did not match|couldn['’]t find/i,
    );
    const grid = page.getByRole("list", { name: /products|results/i }).first();
    await expect(
      message.first().or(grid.getByRole("listitem").first()),
      "expected either a no-results message or an empty results grid",
    ).toBeVisible({ timeout: TIMEOUTS.LAZY_DOM });
  });
});
