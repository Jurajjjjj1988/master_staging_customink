import { test, expect } from "../fixtures/pages.fixture";

/**
 * Tests #21 #22 — regression catchers.
 *
 *   #21 No empty / hash-only / `javascript:` href anywhere in header or footer.
 *       Catches CMS migrations and content drift that turn real links into dead links.
 *   #22 Footer copyright contains the current year. Catches "still says 2024 in 2026"
 *       regressions.
 */

test.describe("@p1 regression — link hygiene", () => {
  test("should_have_no_empty_hash_or_javascript_href_in_header_or_footer", async ({
    page,
  }) => {
    await page.goto("/");

    const offending = await page.evaluate(() => {
      // Allow the skip-link's intentional `#main-content` anchor.
      const ALLOWED = new Set(["#main-content"]);
      const links = globalThis.document.querySelectorAll<HTMLAnchorElement>(
        'ci-header-prerender a, ci-header a, [role="contentinfo"] a, ci-full-footer a',
      );
      return Array.from(links)
        .map((a) => a.getAttribute("href") ?? "")
        .filter(
          (h) =>
            !ALLOWED.has(h) &&
            (h === "" || h === "#" || h.startsWith("javascript:")),
        );
    });

    expect(
      offending,
      `bad hrefs in header/footer: ${JSON.stringify(offending)}`,
    ).toEqual([]);
  });
});

test.describe("@p2 regression — copyright year", () => {
  test("should_display_current_year_in_footer_copyright", async ({ page }) => {
    await page.goto("/");
    const currentYear = new Date().getFullYear();
    const copyright = page.getByRole("contentinfo").getByText(/©.*CustomInk/i);
    await expect(copyright).toContainText(String(currentYear));
  });
});
