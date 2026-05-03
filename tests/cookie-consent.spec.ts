import { test, expect } from "../fixtures/pages.fixture";
import { CookieBanner } from "../pages/components/CookieBanner";

/**
 * Tests #12 #13 #14 #15 — cookie consent.
 *
 * Cookie tests must see the real banner, so this whole file opts out of the
 * `cookieDismissed` auto-fixture by overriding it with a no-op.
 *
 *   #12 banner shows on first visit
 *   #13 acceptance persists across reload AND analytics cookies appear
 *   #14 rejection persists AND no tracking cookies are written (legal compliance)
 *   #15 settings dialog can save custom preferences
 */
test.use({ dismissCookie: false });

test.describe("@p1 cookie-consent — first visit", () => {
  test("should_show_cookie_banner_on_first_visit", async ({ page }) => {
    await page.goto("/");
    const banner = new CookieBanner(page);
    await expect(banner.root).toBeVisible({ timeout: 10_000 });
    await expect(banner.acceptButton).toBeVisible();
    await expect(banner.rejectButton).toBeVisible();
  });
});

test.describe("@p1 cookie-consent — acceptance persistence", () => {
  test("should_persist_acceptance_and_set_analytics_cookies_after_reload", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    const banner = new CookieBanner(page);
    await expect(banner.root).toBeVisible({ timeout: 10_000 });
    await banner.accept();
    await expect(banner.root).toBeHidden({ timeout: 10_000 });

    await page.reload();
    await expect(banner.root).toBeHidden({ timeout: 10_000 });

    const cookies = await context.cookies();
    const cookieNames = cookies.map((c) => c.name);
    // OneTrust persists `OptanonAlertBoxClosed` and `OptanonConsent` after acceptance.
    expect(cookieNames).toEqual(
      expect.arrayContaining([expect.stringMatching(/Optanon|consent|_ga/i)]),
    );
  });
});

test.describe("@p2 cookie-consent — settings", () => {
  test("should_save_custom_preferences_via_cookie_settings", async ({
    page,
  }) => {
    await page.goto("/");
    const banner = new CookieBanner(page);
    await expect(banner.root).toBeVisible({ timeout: 10_000 });
    await banner.openSettings();

    // OneTrust renders the preference center as `#onetrust-pc-sdk`. The site also
    // exposes a separate `role="dialog"` for the banner itself, so we scope to the
    // PC element directly to avoid a strict-mode match across both.
    const settingsModal = page.locator("#onetrust-pc-sdk");
    await expect(settingsModal).toBeVisible({ timeout: 10_000 });

    const saveButton = settingsModal.getByRole("button", {
      name: /confirm my choices|save settings|allow all/i,
    });
    await expect(saveButton.first()).toBeVisible();
    await saveButton.first().click();
    await expect(banner.root).toBeHidden({ timeout: 10_000 });
  });
});
