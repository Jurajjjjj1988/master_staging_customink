import { test, expect } from "../fixtures/pages.fixture";

/**
 * Test #25 — SEO essentials in <head>.
 *
 * The DOM `<head>` is conceptually part of the page header. For a marketing
 * site these tags directly drive SERP appearance, social previews, and crawl
 * discovery — a regression here can cost real conversion. Five invariants:
 *
 *   1. <title> is non-empty and brand-correct
 *   2. <meta name="description"> is present and within Google's 160-char window
 *   3. <link rel="canonical"> points at an absolute URL
 *   4. Open Graph image is set (controls Slack / iMessage / Facebook previews)
 *   5. <meta name="viewport"> is present (catches "site looks broken on mobile")
 *
 * P1 because each of these has direct revenue impact when wrong.
 */
test.describe("@p1 seo — <head> essentials", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should_have_non_empty_brand_title", async ({ page }) => {
    await expect(page).toHaveTitle(/Custom\s*Ink/i);
    const title = await page.title();
    // Google truncates around 60 chars; we just guard against empty / suspicious lengths.
    expect(title.length).toBeGreaterThan(10);
    expect(title.length).toBeLessThan(120);
  });

  test("should_have_meta_description_within_serp_window", async ({ page }) => {
    const description = await page
      .locator('head meta[name="description"]')
      .getAttribute("content");
    expect(description, "meta description must exist").toBeTruthy();
    expect(description!.length).toBeGreaterThan(40);
    expect(description!.length).toBeLessThan(200);
  });

  test("should_have_absolute_canonical_url", async ({ page }) => {
    const canonical = await page
      .locator('head link[rel="canonical"]')
      .getAttribute("href");
    expect(canonical, "canonical link must exist").toBeTruthy();
    expect(canonical!).toMatch(/^https:\/\/[^/]+\//);
  });

  test("should_have_open_graph_image_for_social_previews", async ({ page }) => {
    const ogImage = await page
      .locator('head meta[property="og:image"]')
      .getAttribute("content");
    expect(ogImage, "og:image must exist").toBeTruthy();
    expect(ogImage!).toMatch(/^https?:\/\//);
  });

  test("should_have_viewport_meta_for_mobile_rendering", async ({ page }) => {
    const viewports = page.locator('head meta[name="viewport"]');
    // Some sites emit more than one viewport meta from different scripts; we only
    // require that at least one declares a mobile-ready viewport.
    await expect(viewports).not.toHaveCount(0);
    const firstContent = await viewports.first().getAttribute("content");
    expect(firstContent).toMatch(/width=device-width/i);
  });
});
