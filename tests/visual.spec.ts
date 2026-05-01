import { test, expect } from "../fixtures/pages.fixture";

/**
 * Test #23 — visual regression for the footer's legal/copyright row.
 *
 * This is the only visual test in the suite. The footer's legal section is the
 * most stable region on the site (text and layout rarely change), so a snapshot
 * comparison there catches CSS regressions (color, padding, font-size, layout
 * breaks) that functional tests cannot detect, with low maintenance overhead.
 */
test.describe("@p3 visual — footer baselines (stable regions only)", () => {
  test("should_match_visual_baseline_for_footer_legal_section", async ({
    page,
  }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await footer.scrollIntoViewIfNeeded();

    const legalRow = footer
      .getByText(/©.*CustomInk/i)
      .locator("xpath=..")
      .first();
    await expect(legalRow).toBeVisible();
    await expect(legalRow).toHaveScreenshot("footer-legal-row.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("should_match_visual_baseline_for_follow_us_icons_row", async ({
    page,
  }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await footer.scrollIntoViewIfNeeded();

    // Anchor on the Facebook link's parent — the smallest stable container
    // that holds the full row of social-icon links. The icons themselves
    // change rarely (years between updates), so this is a low-noise snapshot.
    const followUsRow = footer
      .getByRole("link", { name: /Custom Ink on Facebook/i })
      .locator("xpath=..")
      .first();
    await expect(followUsRow).toBeVisible();
    await expect(followUsRow).toHaveScreenshot("footer-follow-us-row.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});

test.describe("@p1 layout — header positioning invariants", () => {
  /**
   * Bounding-box assertions catch layout regressions without pixel-fragile
   * snapshots: the logo lives in the left half of the header bar, the cart
   * lives in the right half, and the search input spans somewhere in
   * between. A regression that re-orders these fails this test instantly.
   */
  test("should_position_logo_left_search_center_cart_right", async ({
    page,
  }) => {
    await page.goto("/");
    const viewportWidth = page.viewportSize()?.width ?? 1440;

    const boxes = await Promise.all([
      page
        .locator("ci-header-prerender, ci-header")
        .first()
        .getByRole("link", { name: /customink logo/i })
        .first()
        .boundingBox(),
      page
        .locator("ci-header-prerender, ci-header")
        .first()
        .getByRole("searchbox", { name: /search/i })
        .first()
        .boundingBox(),
      page
        .locator("ci-header-prerender, ci-header")
        .first()
        .getByRole("link", { name: /^cart\b/i })
        .first()
        .boundingBox(),
    ]);

    const [logo, search, cart] = boxes;
    expect(logo, "logo bounding box must exist").not.toBeNull();
    expect(search, "search bounding box must exist").not.toBeNull();
    expect(cart, "cart bounding box must exist").not.toBeNull();

    const half = viewportWidth / 2;
    expect(logo!.x, "logo must sit in left half of viewport").toBeLessThan(
      half,
    );
    expect(
      cart!.x + cart!.width,
      "cart must sit in right half of viewport",
    ).toBeGreaterThan(half);
    // Search horizontal center should be between logo right edge and cart left edge.
    const searchCenter = search!.x + search!.width / 2;
    expect(
      searchCenter,
      "search must sit between logo and cart",
    ).toBeGreaterThan(logo!.x + logo!.width);
    expect(searchCenter, "search must sit between logo and cart").toBeLessThan(
      cart!.x,
    );
  });
});
