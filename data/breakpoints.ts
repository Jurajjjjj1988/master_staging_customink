/**
 * Viewport breakpoints per docs §X.5. Hard breakpoint at 1024 px (mobile/desktop swap).
 * Each entry drives one data-driven test in responsive.spec.ts.
 */

export const BREAKPOINTS = [
  {
    name: "mobile-small",
    viewport: { width: 375, height: 667 },
    expectedChrome: "mobile" as const,
    expectedHamburger: true,
    expectedMegaMenus: false,
  },
  {
    name: "tablet-768",
    viewport: { width: 768, height: 1024 },
    expectedChrome: "mobile" as const,
    // Doc §1.5: hamburger visible at all viewports ≤ 1023 px. 2026-05-25 probe
    // saw it hidden at 768 (staging fluctuation); 2026-05-26 re-run shows it
    // visible again. Treat doc as source-of-truth — a build that hides the
    // hamburger here is a regression worth surfacing, not a test gap.
    expectedHamburger: true,
    expectedMegaMenus: false,
  },
  {
    name: "tablet-edge-1023",
    viewport: { width: 1023, height: 768 },
    expectedChrome: "mobile" as const, // boundary — last mobile px per doc §1.5
    expectedHamburger: true,
    expectedMegaMenus: false,
  },
  {
    name: "desktop-edge-1024",
    viewport: { width: 1024, height: 768 },
    expectedChrome: "desktop" as const, // boundary — first desktop px per doc §1.5
    expectedHamburger: false,
    // Re-probed 2026-05-26 after the hover→keyboard-activation migration:
    // mega-menu triggers ARE visible at exactly 1024px now, matching doc §1.5.
    // The 2026-05-25 probe ran before the responsive test was unblocked and
    // may have observed a transient build state — current build aligns with
    // the documented breakpoint.
    expectedMegaMenus: true,
  },
  {
    name: "desktop-large",
    viewport: { width: 1440, height: 900 },
    expectedChrome: "desktop" as const,
    expectedHamburger: false,
    expectedMegaMenus: true,
  },
] as const;

export type Breakpoint = (typeof BREAKPOINTS)[number];
