import type { APIRequestContext } from "@playwright/test";
import { checkLinkOk } from "./http-check";

/**
 * Per-run cache for external link probes.
 *
 * Why: external social platforms (Facebook, TikTok, LinkedIn) rate-limit
 * non-browser HEAD/GET. When the test suite runs across multiple workers and
 * shards, the same URL can be probed dozens of times in seconds — fast enough
 * to trigger rate limits and produce false negatives. We cache the first
 * response per URL for the lifetime of the worker process.
 *
 * The cache is process-local (one Map per worker) — that's intentional. Each
 * worker gets at most 1 probe per URL; across 4 PR shards we make at most 4
 * probes per URL per CI run, well under any reasonable rate-limit threshold.
 */

const cache = new Map<string, Promise<number>>();

export async function checkExternalLinkOnce(
  request: APIRequestContext,
  url: string,
): Promise<number> {
  const existing = cache.get(url);
  if (existing) return existing;
  const inflight = checkLinkOk(request, url);
  cache.set(url, inflight);
  // Don't cache failures forever: if probe rejects, drop the entry so a retry
  // at the next attempt can recover from a transient network error.
  inflight.catch(() => cache.delete(url));
  return inflight;
}

/** For tests of this helper. Not exported via barrel. */
export function __resetCacheForTesting(): void {
  cache.clear();
}
