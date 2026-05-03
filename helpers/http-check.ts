import type { APIRequestContext } from "@playwright/test";

/**
 * Check that a URL returns a non-error status code.
 *
 * Uses HEAD first (cheap), falls back to GET on 404/405 since some servers
 * (notably Rails apps without explicit HEAD routes) return 404/405 to HEAD
 * even when GET succeeds. Returns the status of whichever request was final.
 */
export async function checkLinkOk(
  request: APIRequestContext,
  url: string,
): Promise<number> {
  const head = await request.head(url, { failOnStatusCode: false });
  if (head.status() !== 404 && head.status() !== 405) {
    return head.status();
  }
  const get = await request.get(url, { failOnStatusCode: false });
  return get.status();
}
