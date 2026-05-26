/**
 * Variant 1 (Homepage anonymous) — 16 header elements per docs §1.2.
 * Stable selectors per docs §1.2 "Stabilné selectory per prvok".
 * Each element drives one data-driven test in variant-1-homepage.spec.ts.
 */

export const HEADER_V1_ELEMENTS = [
  {
    num: 1,
    name: "Logo",
    role: "link" as const,
    accessibleName: /customink logo/i, // tolerant — accessible name contains "- inky" mascot
    hrefPattern: /^\/$|customink\.com\/?$/,
    visibility: "always" as const,
  },
  {
    num: 2,
    name: "Search field",
    role: "searchbox" as const,
    accessibleName: /search/i,
    visibility: "always" as const,
  },
  {
    num: 3,
    name: "Custom T-shirts",
    role: "button" as const,
    accessibleName: /Open Custom T-Shirts menu/i,
    opensFlyout: "F1" as const,
    visibility: "desktop" as const, // ≥ 1024 px
  },
  {
    num: 4,
    name: "Custom Apparel",
    role: "button" as const,
    accessibleName: /Open Custom Apparel menu/i,
    opensFlyout: "F2" as const,
    visibility: "desktop" as const,
  },
  {
    num: 5,
    name: "Promotional Products",
    role: "button" as const,
    accessibleName: /Open Promotional Products menu/i,
    opensFlyout: "F3" as const,
    visibility: "desktop" as const,
  },
  {
    num: 6,
    name: "Design Lab",
    role: "button" as const,
    accessibleName: /Open Design Lab menu/i,
    opensFlyout: "F4" as const,
    visibility: "desktop" as const,
  },
  {
    num: 7,
    name: "Groups & Events",
    role: "button" as const,
    accessibleName: /Open Groups & Events menu/i,
    opensFlyout: "F5" as const,
    visibility: "desktop" as const,
  },
  {
    num: 8,
    name: "Phone link",
    role: "link" as const,
    accessibleName: /^Call /i, // aria-label="Call 1-800-…"
    hrefPattern: /^tel:/,
    visibility: "always" as const,
  },
  {
    num: 10,
    name: "Favorites heart",
    role: "link" as const,
    accessibleName: /^Favorites$/i,
    hrefPattern: /\/products\/favorites/,
    visibility: "always" as const,
  },
  {
    num: 11,
    name: "Sign In link",
    role: "link" as const,
    accessibleName: /^Sign In$/i,
    testId: "my-account", // shared with V4 My Account — distinguish by text
    hrefPattern: /\/profiles\/users\/sign_in/,
    visibility: "guest-only" as const,
  },
  {
    num: 13,
    name: "Cart icon",
    role: "link" as const,
    accessibleName: /^cart\b/i,
    testId: "cart-global-header",
    hrefPattern: /cart_source=header/,
    visibility: "always" as const,
  },
  {
    num: 14,
    name: 'Promo CTA "Shop Sale"',
    role: "link" as const,
    accessibleName: /shop sale/i,
    visibility: "always" as const, // when promo strip is active
  },
  {
    num: 15,
    name: "Skip link",
    role: "link" as const,
    accessibleName: /skip to main content/i,
    hrefPattern: /#main-content/,
    visibility: "tab-focus-only" as const,
  },
  {
    num: 16,
    name: "Hamburger",
    selector: "#menuButton",
    accessibleName: /menu/i,
    visibility: "mobile" as const, // ≤ 1023 px
  },
] as const;

export type HeaderV1Element = (typeof HEADER_V1_ELEMENTS)[number];
