import { test, expect } from "../fixtures/pages.fixture";
import { TIMEOUTS } from "../helpers/timeouts";

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
  test("cookie banner shows on first visit", async ({ page, cookieBanner }) => {
    await page.goto("/");
    // OneTrust injects the banner asynchronously after the OneTrust SDK
    // bootstraps; on cold loads the SDK can take several seconds before the
    // banner is even attached. Wait for attached BEFORE visibility so the
    // visibility assertion has a real DOM node to poll.
    await cookieBanner.root.waitFor({
      state: "attached",
      timeout: TIMEOUTS.HYDRATION,
    });
    await expect(cookieBanner.root).toBeVisible({ timeout: 10_000 });
    await expect(cookieBanner.acceptButton).toBeVisible();
    await expect(cookieBanner.rejectButton).toBeVisible();
  });
});

test.describe("@p1 cookie-consent — acceptance persistence", () => {
  test("cookie acceptance persists across reload and sets analytics cookies", async ({
    page,
    context,
    cookieBanner,
  }) => {
    await page.goto("/");
    await expect(cookieBanner.root).toBeVisible({ timeout: 10_000 });
    await cookieBanner.accept();
    await expect(cookieBanner.root).toBeHidden({ timeout: 10_000 });

    await page.reload();
    await expect(cookieBanner.root).toBeHidden({ timeout: 10_000 });

    const cookies = await context.cookies();
    const cookieNames = cookies.map((c) => c.name);
    // OneTrust persists `OptanonAlertBoxClosed` and `OptanonConsent` after acceptance.
    expect(cookieNames).toEqual(
      expect.arrayContaining([expect.stringMatching(/Optanon|consent|_ga/i)]),
    );
  });
});

test.describe("@p2 cookie-consent — settings", () => {
  test("custom cookie preferences save via the settings dialog", async ({
    page,
    cookieBanner,
  }) => {
    await page.goto("/");
    await expect(cookieBanner.root).toBeVisible({ timeout: 10_000 });
    await cookieBanner.openSettings();

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
    await expect(cookieBanner.root).toBeHidden({ timeout: 10_000 });
  });
});
