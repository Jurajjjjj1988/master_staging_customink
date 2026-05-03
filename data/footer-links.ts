import type { FooterSectionName } from "../pages/components/FooterComponent";

export interface FooterLink {
  readonly section: FooterSectionName;
  readonly name: string;
  readonly path: string;
  /**
   * Skip the HTTP status assertion when set. Document the reason inline so
   * future maintainers can decide whether the exception is still warranted.
   *   - "auth-required" — URL behind login wall; staging returns 404 to logged-out users
   *   - "environment-specific" — URL works on production but staging deploy is incomplete
   */
  readonly skipHttpCheck?: "auth-required" | "environment-specific";
}

export const FOOTER_LINKS: readonly FooterLink[] = [
  { section: "About Us", name: "Get to Know Custom Ink", path: "/about" },
  { section: "About Us", name: "Careers", path: "/about/jobs" },
  { section: "About Us", name: "Press", path: "/about/press" },
  { section: "About Us", name: "Partnerships", path: "/about/partners" },
  {
    section: "About Us",
    name: "Diversity & Belonging",
    path: "/equity-for-all",
  },
  { section: "About Us", name: "Customer Reviews", path: "/reviews" },
  { section: "About Us", name: "Customer Photos", path: "/photos" },
  { section: "About Us", name: "Custom Ink Blog", path: "/blog" },
  { section: "About Us", name: "Store Locations", path: "/ink/stores" },
  {
    section: "Your Account",
    name: "Retrieve a Saved Design",
    path: "/account/designs",
    skipHttpCheck: "auth-required",
  },
  {
    section: "Your Account",
    name: "Retrieve a Printed Proof",
    path: "/account/designs",
    skipHttpCheck: "auth-required",
  },
  {
    section: "Your Account",
    name: "Track Your Order",
    path: "/account/orders",
    skipHttpCheck: "auth-required",
  },
  {
    section: "Your Account",
    name: "Place a Reorder",
    path: "/account/orders",
    skipHttpCheck: "auth-required",
  },
  { section: "Contact Us", name: "Send us an Email", path: "/contact" },
  {
    section: "Service Center",
    name: "Help Center",
    path: "/help_center",
    skipHttpCheck: "environment-specific",
  },
  { section: "Service Center", name: "Get a Quick Quote", path: "/quotes" },
  {
    section: "Service Center",
    name: "Content Guidelines",
    path: "/help_center/content-guidelines",
    skipHttpCheck: "environment-specific",
  },
  {
    section: "Service Center",
    name: "Our Commitment to Accessibility",
    path: "/help_center/our-commitment-to-accessibility",
    skipHttpCheck: "environment-specific",
  },
];
