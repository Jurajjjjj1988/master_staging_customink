/** Header items with a direct link target — used by test #2 (link integrity). */
export const HEADER_PRIMARY_NAV = [
  { name: "Custom T-shirts", expectedPath: "/products/t-shirts/4" },
  { name: "Custom Apparel", expectedPath: "/products/apparel/857" },
  {
    name: "Promotional Products",
    expectedPath: "/products/promotional-products/218",
  },
  { name: "Design Lab", expectedPath: "/lab" },
] as const;

/** Mega-menu trigger names — used by test #8 (hover open). */
export const MEGA_MENU_TRIGGERS = [
  "Custom T-shirts",
  "Custom Apparel",
  "Promotional Products",
  "Design Lab",
  "Groups & Events",
] as const;

export type HeaderNavItem = (typeof HEADER_PRIMARY_NAV)[number];
export type MegaMenuTrigger = (typeof MEGA_MENU_TRIGGERS)[number];
