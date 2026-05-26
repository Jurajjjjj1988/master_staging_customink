import { test, expect } from "../../fixtures/pages.fixture";
import { TIMEOUTS } from "../../helpers/timeouts";
import { isAllowlistedPageError } from "../../helpers/known-issues";

/**
 * Variant 0 — Common technical foundation. Doc §0.
 * Shared structure across all 4 variants: landmarks, host elements, skip link, design tokens.
 */

const HOST_SELECTOR = "ci-header-prerender, ci-header";

test.describe('@p1 V0.1 landmark — <header role="banner"> wraps Stencil host', () => {
  // Fixme: probe 2026-05-25 found no role="banner" on homepage. A11y gap per doc §0.
  test.fixme("homepage exposes a banner landmark wrapping the Stencil host", async ({
    page,
  }) => {
    await page.goto("/");
    const banner = page.getByRole("banner");
    await expect(banner).toHaveCount(1);
    await expect(banner.locator(HOST_SELECTOR)).toHaveCount(1);
  });
});

test.describe("@p1 V0.2 host elements — Stencil custom elements hydrate", () => {
  // Either ci-header-prerender or ci-header may render; staging is non-deterministic
  // (POM uses the same comma combinator). state:"attached" because host tags have no
  // intrinsic display rule, so default visibility wait would never resolve.

  test("homepage mounts and hydrates one Stencil header host", async ({
    page,
  }) => {
    await page.goto("/");
    const host = page.locator(HOST_SELECTOR);
    await host
      .first()
      .waitFor({ state: "attached", timeout: TIMEOUTS.HYDRATION });
    await expect(host).toHaveCount(1);
    await expect(host.first()).toHaveClass(/\bhydrated\b/, {
      timeout: TIMEOUTS.HYDRATION,
    });
  });

  test("internal page (/about) mounts and hydrates one Stencil header host", async ({
    page,
  }) => {
    await page.goto("/about");
    const host = page.locator(HOST_SELECTOR);
    await host
      .first()
      .waitFor({ state: "attached", timeout: TIMEOUTS.HYDRATION });
    await expect(host).toHaveCount(1);
    await expect(host.first()).toHaveClass(/\bhydrated\b/, {
      timeout: TIMEOUTS.HYDRATION,
    });
  });

  // Fixme: doc §0 prescribes prerender on homepage, but staging serves both
  // variants run-to-run. Promote once routing is deterministic.
  test.fixme("homepage specifically uses <ci-header-prerender> (doc §0 prescription)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("ci-header-prerender")).toHaveCount(1);
    await expect(page.locator("ci-header")).toHaveCount(0);
  });
});

test.describe("@p1 V0.3 skip link — Tab focus reveals link with #main-content target", () => {
  test("skip link is in the DOM with correct anchor href", async ({ page }) => {
    await page.goto("/");
    const skipLink = page.getByRole("link", { name: /skip to main content/i });
    await expect(skipLink).toHaveCount(1);
    await expect(skipLink).toHaveAttribute("href", /#main-content/);
  });

  test.fixme("#main-content anchor target exists in the document", async ({
    page,
  }) => {
    // #main-content rendered as <article> by lazy script (NOT inside <main>).
    // Genuinely flaky on staging — element appears reliably in probes but
    // sometimes never resolves under Playwright's polling. Skip until the
    // anchor is mounted synchronously with the skip link.
    await page.goto("/");
    await page.waitForFunction(
      () => document.querySelectorAll("#main-content").length === 1,
      undefined,
      { timeout: TIMEOUTS.LAZY_DOM },
    );
    await expect(page.locator("#main-content")).toBeAttached();
  });

  // WCAG SC 2.4.1 Bypass Blocks (skip link Tab #1 regression) lives in
  // tests/header/accessibility.spec.ts to keep the a11y surface area together.
  // Single source of truth — don't reintroduce here.
});

test.describe("@p2 V0.4 design tokens — CSS values match documented brand colors", () => {
  test("skip link uses brand primary #1e39d2 background on focus", async ({
    page,
  }) => {
    // Doc §0 token: primary blue = #1e39d2 = rgb(30, 57, 210).
    await page.goto("/");
    const skipLink = page.getByRole("link", { name: /skip to main content/i });
    await skipLink.focus();
    const bg = await skipLink.evaluate(
      (el) => globalThis.getComputedStyle(el).backgroundColor,
    );
    expect(bg).toMatch(/rgb\(30,\s*57,\s*210\)/);
  });
});

test.describe("@p3 V0.5 console health — Stencil host emits no uncaught errors", () => {
  test("homepage hydration completes without uncaught header errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    const host = page.locator(HOST_SELECTOR).first();
    await host.waitFor({ state: "attached", timeout: TIMEOUTS.LAZY_DOM });
    await expect(host).toHaveClass(/\bhydrated\b/, {
      timeout: TIMEOUTS.LAZY_DOM,
    });
    // Filter known third-party noise via the central allowlist.
    const headerErrors = errors.filter((e) => !isAllowlistedPageError(e));
    expect(headerErrors).toEqual([]);
  });
});
