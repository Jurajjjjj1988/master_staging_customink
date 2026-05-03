import { test, expect } from "../fixtures/pages.fixture";

/**
 * Test #23 — visual regression for the footer's legal/copyright row.
 *
 * This is the only visual test in the suite. The footer's legal section is the
 * most stable region on the site (text and layout rarely change), so a snapshot
 * comparison there catches CSS regressions (color, padding, font-size, layout
 * breaks) that functional tests cannot detect, with low maintenance overhead.
 */
test.describe("@p3 visual — footer legal section baseline", () => {
  test("should_match_visual_baseline_for_footer_legal_section", async ({
    page,
  }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await footer.scrollIntoViewIfNeeded();
    await page.waitForLoadState("networkidle");

    // Privacy Policy and friends are not wrapped in a <navigation> on this site;
    // they sit as siblings of the copyright text. Anchor the snapshot on the
    // copyright element's parent — the smallest stable container that holds both
    // the legal links and the copyright line.
    const legalRow = footer
      .getByText(/©.*CustomInk/i)
      .locator("xpath=..")
      .first();
    await expect(legalRow).toBeVisible();
    await expect(legalRow).toHaveScreenshot("footer-legal-row.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});
