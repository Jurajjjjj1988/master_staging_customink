/**
 * Centralised timeout constants. Use these instead of inline literals so the
 * suite has one place to tune wait windows when staging gets slower / faster.
 *
 * Calibrated 2026-05-25 against `www-master.staging.customink.com`:
 *   - Cold goto: 30-45s typical, hence `NAVIGATION` = 60s.
 *   - Stencil hydration class signal: <2s warm, up to 15s on cold loads.
 *   - Algolia autocomplete: 1-5s after typing ≥ 2 chars.
 */

export const TIMEOUTS = {
  /** Per-action default (click, fill). Matches Playwright config actionTimeout. */
  ACTION: 10_000,
  /** Page.goto and full navigations through cross-domain redirect chains. */
  NAVIGATION: 60_000,
  /** Stencil custom-element class="hydrated" arrival on cold load. */
  HYDRATION: 15_000,
  /** Lazy-rendered DOM (article#main-content, footer phone link). */
  LAZY_DOM: 30_000,
  /** Quick visibility/role assertion when the element should be ready. */
  QUICK: 5_000,
  /** Short probe — checking aria-expanded after hover. */
  PROBE: 2_000,
  /** URL waitForURL after a click. */
  URL_CHANGE: 15_000,
  /** Logged-in cross-domain redirect chain (account.staging → www-master). */
  CROSS_DOMAIN: 20_000,
} as const;

export type TimeoutKey = keyof typeof TIMEOUTS;
