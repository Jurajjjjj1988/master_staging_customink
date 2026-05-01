import type { Page } from "@playwright/test";

/**
 * Wait until the footer Web Component (`<ci-full-footer>`) has hydrated and is
 * scrolled into view. Necessary on this site because the footer lazy-loads:
 * any test that asserts on footer descendants (phone link, social row, legal
 * row) must call this first to avoid race conditions.
 */
export async function waitForFooterReady(page: Page): Promise<void> {
  const footer = page.locator("ci-full-footer, [role='contentinfo']").first();
  await footer.waitFor({ state: "attached", timeout: 15_000 });
  await footer.scrollIntoViewIfNeeded();
}
