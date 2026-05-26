/**
 * Variant 1 — flyouts F1-F5 (mega-menus) + D1 (Sign In dropdown).
 * Item counts per docs §1.4. First/last href provided as content-drift
 * anchors — RegExp form survives trailing-slash variants; specific enough
 * that a swapped destination (e.g. "Short Sleeve" → "Long Sleeve") fails.
 */

export const FLYOUTS_V1 = [
  {
    id: "F1",
    triggerName: "Custom T-shirts",
    expectedItemCount: 10,
    // First: Short Sleeve T-shirts → /products/t-shirts/short-sleeve-t-shirts/16
    firstItemHref: /\/products\/t-shirts\/short-sleeve-t-shirts\/16\b/,
    // Last: View All Custom T-shirts → /products/t-shirts/4
    lastItemHref: /\/products\/t-shirts\/4(?:\/|$|\?)/,
  },
  {
    id: "F2",
    triggerName: "Custom Apparel",
    expectedItemCount: 16,
    // First: Hoodies → /products/sweatshirts/hoodies/71
    firstItemHref: /\/products\/sweatshirts\/hoodies\/71\b/,
    // Last: Accessories → /products/accessories/574
    lastItemHref: /\/products\/accessories\/574\b/,
  },
  {
    id: "F3",
    triggerName: "Promotional Products",
    expectedItemCount: 20,
    // First: Water Bottles → /products/drinkware/water-bottles/43
    firstItemHref: /\/products\/drinkware\/water-bottles\/43\b/,
    // Last: Health & Personal Care → /products/health-personal-care/576
    lastItemHref: /\/products\/health-personal-care\/576\b/,
  },
  {
    id: "F4",
    triggerName: "Design Lab",
    expectedItemCount: 2, // marketing card with 2 CTAs
    // First: Start Designing → /lab
    firstItemHref: /\/lab(?:\/|$|\?)/,
    // Last: Explore Templates → /inspiration
    lastItemHref: /\/inspiration(?:\/|$|\?)/,
  },
  {
    id: "F5",
    triggerName: "Groups & Events",
    expectedItemCount: 14, // 3 sections, 14 items total
    // First: Group Ordering → /ink/group-order-form
    firstItemHref: /\/ink\/group-order-form(?:\/|$|\?)/,
    // Last: For Activities & Celebrations → /products/activities-celebrations/310
    lastItemHref: /\/products\/activities-celebrations\/310\b/,
  },
] as const;

export const DROPDOWNS_V1 = [
  {
    id: "D1",
    triggerAccessibleName: /Open Sign In menu/i,
    expectedItems: ["Sign In", "Create an Account"] as const,
    visibility: "guest-only" as const,
  },
] as const;

export type FlyoutV1 = (typeof FLYOUTS_V1)[number];
export type DropdownV1 = (typeof DROPDOWNS_V1)[number];
