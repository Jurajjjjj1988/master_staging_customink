import { test as base, expect, type Page } from "@playwright/test";

type Fixtures = {
  cookieDismissed: void;
  monitorPageHealth: void;
  authenticated: Page;
};

const CONSOLE_ALLOWLIST: readonly RegExp[] = [
  // populate empirically as known third-party noise emerges
];
const REQUEST_ALLOWLIST: readonly RegExp[] = [
  // e.g. /https:\/\/.*\.doubleclick\.net\//,
];

const isAllowlistedConsole = (text: string): boolean =>
  CONSOLE_ALLOWLIST.some((re) => re.test(text));
const isAllowlistedRequest = (url: string): boolean =>
  REQUEST_ALLOWLIST.some((re) => re.test(url));

export const test = base.extend<Fixtures>({
  cookieDismissed: [
    async ({ context }, use) => {
      await context.addCookies([
        {
          name: "OptanonAlertBoxClosed",
          value: new Date().toISOString(),
          domain: ".staging.customink.com",
          path: "/",
        },
      ]);
      await use();
    },
    { auto: true },
  ],

  monitorPageHealth: [
    async ({ page }, use, testInfo) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const failedRequests: string[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "error" && !isAllowlistedConsole(msg.text())) {
          consoleErrors.push(msg.text());
        }
      });
      page.on("pageerror", (err) => pageErrors.push(err.message));
      page.on("response", (resp) => {
        if (resp.status() >= 400 && !isAllowlistedRequest(resp.url())) {
          failedRequests.push(`${resp.status()} ${resp.url()}`);
        }
      });

      await use();

      const brokenImages = await page.evaluate(() =>
        Array.from(document.images)
          .filter((i) => i.complete && i.naturalWidth === 0)
          .map((i) => i.src),
      );

      const issues = {
        consoleErrors,
        pageErrors,
        failedRequests,
        brokenImages,
      };
      const hasIssue = Object.values(issues).some((arr) => arr.length > 0);
      if (hasIssue) {
        await testInfo.attach("page-health.json", {
          body: JSON.stringify(issues, null, 2),
          contentType: "application/json",
        });
        throw new Error(`Page health check failed: ${JSON.stringify(issues)}`);
      }
    },
    { auto: true },
  ],

  authenticated: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: "storage/auth.json",
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
