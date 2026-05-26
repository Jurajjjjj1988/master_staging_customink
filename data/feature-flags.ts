/**
 * Feature flags / cookies that affect header rendering per docs §0 + §1.6.
 * Used in feature-flags.spec.ts to assert UI swap behaviour.
 */

export const AUTH_COOKIE_NAME = "profiles-spa-client.is.authenticated";

export const AB_TESTS = [
  {
    cookieName: "feature_ships_24_hours_test_v2",
    bucket: "excluded" as const, // default
    dataLayerName: "2026 04 01 Ships 24 Hours",
    dataLayerLocation: "header",
  },
] as const;

export const LAB_REDIRECT_COOKIES = [
  "page_tests",
  "session_token",
  "interactions",
] as const;

export type AbTest = (typeof AB_TESTS)[number];
