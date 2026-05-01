import { test, expect } from "../fixtures/pages.fixture";

/**
 * Test #24 — Header LCP budget (nightly only).
 *
 * Largest Contentful Paint should occur within an acceptable budget. Threshold
 * is conservative (3s) because staging is intentionally not as fast as
 * production. The test is P3 — informational on PRs, blocking only nightly.
 */
test.describe("@p3 performance — header LCP", () => {
  test("should_render_header_within_lcp_budget", async ({ page }) => {
    await page.goto("/");

    const lcp = await page.evaluate<number>(
      () =>
        new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const last = entries[entries.length - 1] as PerformanceEntry & {
              startTime: number;
            };
            resolve(last.startTime);
          });
          observer.observe({
            type: "largest-contentful-paint",
            buffered: true,
          });
          // Safety bound: if no LCP entry is received in 8 seconds we treat the
          // test as a (very) failed budget rather than hanging the run.
          globalThis.setTimeout(() => resolve(Number.POSITIVE_INFINITY), 8_000);
        }),
    );

    expect(lcp, `LCP measured: ${lcp}ms`).toBeLessThan(3_000);
  });
});
