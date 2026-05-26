/**
 * Variant 1 — flyouts F1-F5 (mega-menus) + D1 (Sign In dropdown).
 * Item counts per docs §1.4. First/last href provided as integrity anchors —
 * full lists are in the doc, tests only assert count + boundary items.
 */

export const FLYOUTS_V1 = [
  {
    id: "F1",
    triggerName: "Custom T-shirts",
    expectedItemCount: 10,
    firstItemHref: /\/products\/t-shirts\/short-sleeve/,
    lastItemHref: /\/products\/t-shirts\/\d/, // "View All Custom T-shirts → /products/t-shirts/4"
  },
  {
    id: "F2",
    triggerName: "Custom Apparel",
    expectedItemCount: 16,
    firstItemHref: /\/products\/sweatshirts\/hoodies/,
    lastItemHref: /\/products\/accessories/,
  },
  {
    id: "F3",
    triggerName: "Promotional Products",
    expectedItemCount: 20,
    firstItemHref: /\/products\/drinkware\/water-bottles/,
    lastItemHref: /\/products\/health-personal-care/,
  },
  {
    id: "F4",
    triggerName: "Design Lab",
    expectedItemCount: 2, // marketing card with 2 CTAs
    firstItemHref: /\/lab/,
    lastItemHref: /\/inspiration/,
  },
  {
    id: "F5",
    triggerName: "Groups & Events",
    expectedItemCount: 14, // 3 sections, 14 items total
    firstItemHref: /\/ink\/group-order-form/,
    lastItemHref: /\/ink\/k12/,
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
