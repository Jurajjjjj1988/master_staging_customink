import { test, expect } from "../fixtures/pages.fixture";
import { checkLinkOk } from "../helpers/http-check";
import { waitForFooterReady } from "../helpers/page-state";

/**
 * Tests #27 — #30 — marketing & support elements visible on every page.
 *
 *   #27 announcement (promo) banner renders + Shop Sale CTA reaches a 200
 *   #28 phone support block exposes both the label and the tel: link
 *   #29 chat support block exposes the label and a working Chat Now trigger
 *   #30 footer feedback widget asks "How would you rate our website?"
 *
 * These are content-presence assertions — light by design. Marketing rotates
 * the promo banner copy, so we match on stable structural cues (the Shop Sale
 * CTA link, the visible Talk-to-Real-Person label) rather than exact strings.
 */

test.describe("@p2 announcement-banner — promo + Shop Sale CTA", () => {
  test("should_render_promo_banner_with_working_shop_sale_link", async ({
    page,
  }) => {
    await page.goto("/");
    const promo = page.locator("ci-announcement-banner");
    await expect(promo).toBeVisible();

    const shopSale = promo.getByRole("link", { name: /shop sale/i });
    await expect(shopSale).toBeVisible();
    await expect(shopSale).toHaveAttribute("href", /.+/);
    // We need the URL string for the HEAD probe — read imperatively after the
    // web-first assertion has confirmed the attribute exists.
    // eslint-disable-next-line playwright/prefer-web-first-assertions
    const href = await shopSale.getAttribute("href");
    const status = await checkLinkOk(
      page.request,
      new URL(href!, page.url()).toString(),
    );
    expect(status).toBeLessThan(400);
  });
});

test.describe("@p1 support-block — phone (Talk to a Real Person)", () => {
  test("should_expose_label_and_tel_link_for_phone_support", async ({
    page,
  }) => {
    await page.goto("/");
    // The label and the number live in the footer's Contact Us section; that
    // Web Component hydrates lazily so we wait for it before querying.
    await waitForFooterReady(page);
    await expect(
      page.getByText(/talk to a real person/i).first(),
    ).toBeVisible();
    const phoneLink = page.getByRole("link", { name: /855-271-2660/ }).first();
    await expect(phoneLink).toBeVisible();
    await expect(phoneLink).toHaveAttribute("href", "tel:855-271-2660");
  });
});

test.describe("@p1 support-block — live chat (Chat Now)", () => {
  /**
   * The "Chat with a Real Person" copy is breakpoint-specific (visible at
   * 1200-1399px, hidden at 1440px+ where space is consumed by other chrome).
   * The action affordance — the "Chat Now" button — is the stable invariant
   * across breakpoints, so we test that.
   */
  test("should_expose_chat_now_trigger_button", async ({ page }) => {
    await page.goto("/");
    const chatTrigger = page
      .getByRole("button", { name: /^chat now$/i })
      .first();
    await expect(chatTrigger).toBeVisible();
    await expect(chatTrigger).toBeEnabled();
  });
});

test.describe("@p2 marketing — Watch our TV Commercial (YouTube embed)", () => {
  /**
   * The TV commercial section renders a poster `<div data-link="play">`; the
   * actual YouTube `<iframe>` is injected on click. We verify the click path
   * activates a YouTube embed (no preload — saves bandwidth on every visit).
   */
  test("should_load_youtube_embed_when_play_clicked", async ({ page }) => {
    await page.goto("/");
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

test.describe("@p2 marketing — newsletter signup (Klaviyo)", () => {
  /**
   * The footer renders a Klaviyo signup container (`<div class="klaviyo-form-…">`)
   * which Klaviyo's CDN script populates with the actual form fields. SDK
   * initialization timing varies (consent banners, ad-blockers, environment) —
   * we assert what the site's own markup is responsible for: the container
   * exists with the expected class hook and sits inside the newsletter section.
   */
  test("should_have_klaviyo_signup_container_in_footer", async ({ page }) => {
    await page.goto("/");
    await waitForFooterReady(page);

    const klaviyoContainer = page
      .locator("ci-full-footer [class^='klaviyo-form-']")
      .first();
    await expect(klaviyoContainer).toBeAttached();

    const inNewsletterSection = await klaviyoContainer.evaluate(
      (el) => !!el.closest("[id*='newsletter-signup'], [class*='Newsletter']"),
    );
    expect(
      inNewsletterSection,
      "Klaviyo container is not inside newsletter section",
    ).toBe(true);
  });
});

test.describe("@p1 support-block — email (Send us an Email)", () => {
  /**
   * Beyond the structural href check (covered by test #2), verify that
   * clicking the email CTA actually navigates to the contact page. This
   * catches event-handler regressions that prevent default-click and
   * leave the user on the same page.
   */
  test("should_navigate_to_contact_page_when_send_us_email_clicked", async ({
    page,
  }) => {
    await page.goto("/");
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

test.describe("@p2 feedback-widget — site rating prompt", () => {
  test("should_render_rate_our_website_prompt_in_footer", async ({ page }) => {
    await page.goto("/");
    await waitForFooterReady(page);

    const footer = page.getByRole("contentinfo");
    // The widget heading is uppercase via CSS — name is case-insensitive.
    await expect(
      footer.getByRole("heading", { name: /tell us what you think/i }),
    ).toBeVisible();
    // The rating prompt is split across multiple text nodes in the DOM; match
    // a portion that's reliably present together.
    await expect(footer.getByText(/rate our website/i).first()).toBeVisible();
  });
});
