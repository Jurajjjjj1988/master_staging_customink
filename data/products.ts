/**
 * Product URLs used by cart, favorites, and account journeys.
 *
 * WHY a static `as const` array (not a fixture-seeded factory):
 * this is a UI-only black-box suite — we don't own the CustomInk
 * backend, so we cannot seed catalog rows via API or DB. The site's
 * own catalog IDs are the ground truth, and a small curated set
 * pinned here is the most faithful contract we can express.
 *
 * `requiresDesignLab: true` flags entries whose product detail page
 * routes through the Design Lab (no inline add-to-cart) — tests use
 * this hint to skip with a concrete reason instead of failing on a
 * missing affordance.
 */
export const PRODUCT_URLS = [
  {
    name: "T-Shirts category page",
    category: "t-shirts",
    path: "/products/t-shirts/4",
    requiresDesignLab: true,
  },
  {
    name: "Hanes Authentic Tee (deep PDP)",
    category: "t-shirts",
    path: "/products/t-shirts/short-sleeve-t-shirts/hanes-authentic-t-shirt/116200",
    requiresDesignLab: true,
  },
] as const;

export type ProductUrl = (typeof PRODUCT_URLS)[number];
