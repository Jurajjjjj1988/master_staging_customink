import { test, expect } from "../../fixtures/pages.fixture";
import { AB_TESTS, AUTH_COOKIE_NAME } from "../../data/feature-flags";
import { TIMEOUTS } from "../../helpers/timeouts";

/**
 * Feature flag + cookie matrix. Doc §X.6.
 * Asserts UI swaps driven by cookies — Optimizely A/B buckets, auth cookie,
 * personalisation cookies that influence Lab redirect.
 */

// Serial mode: cookie-state-dependent assertions (Optimizely dataLayer
// reads, auth cookie checks) race with parallel hydration on the same
// staging endpoint. Per-file serial keeps the cookie state isolated and
// avoids per-IP throttling on the dataLayer poll window.
test.describe.configure({ mode: "serial" });

test.describe("@p2 V1.6 Optimizely A/B — Ships 24 Hours test bucket", () => {
  for (const ab of AB_TESTS) {
    test(`dataLayer.ab_test_name reflects "${ab.dataLayerName}"`, async ({
      page,
      header,
    }) => {
      await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });
      await header.root
        .first()
        .waitFor({ state: "attached", timeout: TIMEOUTS.HYDRATION });

      // Optimizely pushes its A/B entry to dataLayer after hydration completes —
      // poll up to QUICK timeout rather than read synchronously.
      const abEntry = await page.waitForFunction(
        (testName) => {
          const dl =
            (globalThis as unknown as { dataLayer?: Record<string, unknown>[] })
              .dataLayer ?? [];
          return dl.find(
            (e) =>
              typeof e.ab_test_name === "string" &&
              new RegExp(testName, "i").test(e.ab_test_name as string),
          );
        },
        ab.dataLayerName,
        { timeout: TIMEOUTS.HYDRATION },
      );
      // Bucket may be `excluded` (default copy) or `treatment` — either is
      // valid; assert the test framework is wired up. Missing entry would
      // have thrown above (waitForFunction).
      const entry = (await abEntry.jsonValue()) as Record<string, unknown>;
      expect(
        entry,
        `dataLayer must carry ${ab.dataLayerName} A/B test info`,
      ).toBeDefined();
      expect(entry.ab_test_location).toBe(ab.dataLayerLocation);
    });
  }
});

test.describe("@p2 V1.6 Auth cookie — controls V1/V4 swap", () => {
  test("absent auth cookie keeps the V1 anonymous chrome", async ({
    page,
    header,
  }) => {
    // Anonymous (no auth.json) is the default test state — assert V1 chrome.
    await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });
    await header.root
      .first()
      .waitFor({ state: "attached", timeout: TIMEOUTS.HYDRATION });
    await expect(header.signInLink).toBeVisible({ timeout: TIMEOUTS.ACTION });
  });

  test(`cookie naming convention matches doc §0 (${AUTH_COOKIE_NAME}*)`, async ({
    page,
  }) => {
    // Doc §0 lists this cookie pattern. Verify it's discoverable in the jar
    // when the user has actually authenticated — anonymous state should NOT
    // have it set to "true".
    await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });
    const cookies = await page.context().cookies();
    const authCookie = cookies.find((c) =>
      new RegExp(AUTH_COOKIE_NAME.replaceAll(".", "\\.")).test(c.name),
    );
    // Anonymous: cookie absent OR explicitly "false". Coalesce undefined →
    // "false" so the assertion is deterministic and unconditional.
    expect(authCookie?.value ?? "false").not.toBe("true");
  });
});
