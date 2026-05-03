import { test, expect } from "../fixtures/pages.fixture";
import { waitForFooterReady } from "../helpers/page-state";

/**
 * Footer marketing affordances that exercise a real click-through and have
 * no equivalent in the user-journeys suite (header-scoped). Vanity
 * `toBeVisible` content-presence tests for promo banner, phone label,
 * Chat Now button, Klaviyo container, and feedback widget were removed —
 * the click-through equivalents now live in `tests/user-journeys.spec.ts`
 * (Shop Sale CTA, CALL, CHAT NOW). What remains here are the two
 * footer-only journeys that don't fit the header user-journeys file:
 * YouTube embed and the email-support contact link.
 */

test.describe("@p2 marketing — Watch our TV Commercial (YouTube embed)", () => {
  /**
   * The TV commercial section renders a poster `<div data-link="play">`; the
   * actual YouTube `<iframe>` is injected on click. We verify the click path
   * activates a YouTube embed (no preload — saves bandwidth on every visit).
   */
  test("clicking Play loads the YouTube embed iframe", async ({ page }) => {
    await page.goto("/", { timeout: 60_000 });
    await waitForFooterReady(page);

    const playPoster = page
      .locator(
        "ci-full-footer [data-link='play'], ci-full-footer .ci-FullFooterBodyCommercial-img",
      )
      .first();
    await expect(playPoster).toBeVisible();
    await playPoster.click();

    // The injected iframe points at YouTube's embed endpoint.
    const youtubeIframe = page.locator("iframe[src*='youtube.com/embed/']");
    await expect(youtubeIframe).toBeAttached({ timeout: 10_000 });
    const src = await youtubeIframe.first().getAttribute("src");
    expect(src).toMatch(/youtube\.com\/embed\/[\w-]+/);
  });
});

test.describe("@p1 support-block — email (Send us an Email)", () => {
  /**
   * Verify that clicking the email CTA actually navigates to the contact
   * page. This catches event-handler regressions that prevent default-click
   * and leave the user on the same page.
   */
  test('clicking "Send us an Email" navigates to /contact', async ({
    page,
  }) => {
    await page.goto("/", { timeout: 60_000 });
    await waitForFooterReady(page);
    const link = page
      .getByRole("contentinfo")
      .getByRole("link", { name: "Send us an Email" })
      .first();
    await expect(link).toHaveAttribute("href", /\/contact/);
    await link.click();
    await page.waitForURL(/\/contact/);
    expect(page.url()).toMatch(/\/contact/);
  });
});
