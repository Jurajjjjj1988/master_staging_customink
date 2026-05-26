/**
 * Allowlists for known third-party noise and out-of-scope failures. Every
 * regex below has a ticket / team owner and a reason — adding without one
 * defeats the safety value of the health monitor.
 *
 * Growth of any list is a signal we should fix the root cause, not silence it.
 */

/** Console error / warning patterns we accept as noise. */
export const CONSOLE_ALLOWLIST: readonly RegExp[] = [
  // CORS: staging frontend calls production API (www.customink.com).
  // Expected on staging — production has matching CORS headers.
  /Access to fetch at 'https:\/\/www\.customink\.com.*has been blocked by CORS/i,
  /Failed to load resource: net::ERR_FAILED/,
  // Header Web Component swallows the catalog feature-flag fetch failure
  // (downstream of CORS above).
  /Failed to fetch Catalog feature flag/i,
  // Third-party UA-sniff in `ci-header-prerender` reads
  // `navigator.userAgentData.safari` (undefined in Chromium 120+).
  // Tracked separately — header team.
  /Cannot read properties of undefined \(reading 'safari'\)/,
  // Optimizely SDK warns about unconfigured feature keys — marketing-owned.
  /\[OPTIMIZELY\].*ERROR.*Feature key.*is not in datafile/i,
  // Generic 404 line that always pairs with a failedRequest entry — dedup.
  /Failed to load resource: the server responded with a status of 404/i,
];

/** Network request URL patterns we accept as expected failures. */
export const REQUEST_ALLOWLIST: readonly RegExp[] = [
  // Same CORS-blocked production API.
  /https:\/\/www\.customink\.com\/(api|products)\//,
];

/** Uncaught JS exception patterns we accept (higher bar — these usually break the page). */
export const PAGE_ERROR_ALLOWLIST: readonly RegExp[] = [
  // `ci-header-prerender` navigator.userAgentData.safari — same root cause as
  // the console entry. Header team.
  /Cannot read properties of undefined \(reading 'safari'\)/,
  // The search-results page throws `ApiError` from its API client.
  // Out of header/footer scope — search team.
  /^ApiError\b/i,
  // The /about page (Next.js next-frontend-web micro-frontend) emits a
  // minified React #418 hydration warning on this build. Page renders
  // correctly — next-frontend-web team.
  /Minified React error #418/,
  // account.staging.customink.com micro-frontend throws when storage/auth.json
  // has cookies only for the www-master host. Cross-domain auth setup pending.
  /Oops! It looks like you're not logged in/i,
];

export const isAllowlistedConsole = (text: string): boolean =>
  CONSOLE_ALLOWLIST.some((re) => re.test(text));
export const isAllowlistedRequest = (url: string): boolean =>
  REQUEST_ALLOWLIST.some((re) => re.test(url));
export const isAllowlistedPageError = (text: string): boolean =>
  PAGE_ERROR_ALLOWLIST.some((re) => re.test(text));

/**
 * Placeholder image sources that are intentional (lazy-loaded `<img>` slots
 * before the real src arrives). Filter out — not regressions.
 */
export const isPlaceholderImage = (src: string): boolean =>
  src === "" || src.endsWith("//:0") || src === "data:,";
