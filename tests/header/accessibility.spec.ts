import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "../../fixtures/pages.fixture";
import { TIMEOUTS } from "../../helpers/timeouts";

/**
 * A11y sweep across all three header chrome variants. Doc §1.7 / §2.7 / §3.7.
 *
 * Scope is intentionally narrowed to the header DOM + skip link via
 * `.include(...)` so page-body violations (marketing CMS, third-party widgets)
 * don't drown out header regressions. WCAG 2.1 AA only — A and AA tags filter
 * out best-practice noise that isn't shippable-blocking.
 */

// WCAG levels we treat as actionable. AAA + best-practice rules excluded by
// design — they generate noise that drowns shippable A/AA regressions.
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21aa"] as const;

// Mobile viewport for Target Size probe. 390×844 matches iPhone 13/14 portrait
// and is the dominant mobile bucket per CustomInk analytics (doc §1.5).
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

test.describe("@p2 A11y — header chrome variants", () => {
  test("V1 homepage header + skip link has no WCAG 2.1 AA violations", async ({
    page,
    header,
  }) => {
    await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });
    await header.root
      .first()
      .waitFor({ state: "attached", timeout: TIMEOUTS.HYDRATION });

    const results = await new AxeBuilder({ page })
      .include("ci-header-prerender, ci-header")
      .include(".skip-link")
      .withTags([...WCAG_TAGS])
      .analyze();

    expect
      .soft(results.violations, "WCAG 2.1 AA violations in V1 homepage header")
      .toEqual([]);
  });

  test("V2 cart header has no WCAG 2.1 AA violations", async ({
    page,
    headerV2,
  }) => {
    await page.goto("/cart", { timeout: TIMEOUTS.NAVIGATION });
    await headerV2.root
      .first()
      .waitFor({ state: "attached", timeout: TIMEOUTS.HYDRATION });

    const results = await new AxeBuilder({ page })
      .include("ci-header-prerender, ci-header")
      .include(".skip-link")
      .withTags([...WCAG_TAGS])
      .analyze();

    expect
      .soft(results.violations, "WCAG 2.1 AA violations in V2 cart header")
      .toEqual([]);
  });

  test("V3 lab header has no WCAG 2.1 AA violations", async ({
    page,
    headerV3,
  }) => {
    await page.goto("/lab", { timeout: TIMEOUTS.NAVIGATION });
    // /lab redirects to /ndx hash routes — wait for redirect before scanning
    // so axe sees the Lab task-mode chrome, not the transient pre-redirect DOM.
    await page.waitForURL(/\/ndx|#\/welcome/i, {
      timeout: TIMEOUTS.URL_CHANGE,
    });
    await headerV3.root
      .first()
      .waitFor({ state: "attached", timeout: TIMEOUTS.HYDRATION });

    const results = await new AxeBuilder({ page })
      .include("ci-header-prerender, ci-header")
      .include(".skip-link")
      .withTags([...WCAG_TAGS])
      .analyze();

    expect
      .soft(results.violations, "WCAG 2.1 AA violations in V3 lab header")
      .toEqual([]);
  });
});

test.describe("@p2 A11y — documented regressions (doc §1.7)", () => {
  // Doc §1.7 #1: LiveChat iframe captures Tab #1 and Tab #2; skip link
  // reaches focus only on Tab #3. WCAG 2.1 SC 2.4.1 (Bypass Blocks).
  test.fixme("skip link is the first Tab target (WCAG 2.4.1 Bypass Blocks)", async ({
    page,
  }) => {
    await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? (el.className ?? "") + "|" + (el.tagName ?? "") : "";
    });
    expect(focused).toMatch(/skip-link/);
  });

  // Doc §1.7: hamburger `#menuButton` measures 40×40 px — borderline.
  // WCAG 2.5.5 (Target Size minimum) requires 44×44 CSS px.
  test.fixme("hamburger #menuButton meets WCAG 2.5.5 Target Size (≥ 44×44 px)", async ({
    page,
  }) => {
    await page.setViewportSize({
      width: MOBILE_VIEWPORT.width,
      height: MOBILE_VIEWPORT.height,
    });
    await page.goto("/", { timeout: TIMEOUTS.NAVIGATION });
    const box = await page.locator("#menuButton").first().boundingBox();
    expect(
      box,
      "hamburger #menuButton must render a bounding box",
    ).not.toBeNull();
    expect.soft(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect.soft(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});
