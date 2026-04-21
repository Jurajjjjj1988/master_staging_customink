import type { FooterSectionName } from "../pages/components/FooterComponent";

export interface FooterLink {
  readonly section: FooterSectionName;
  readonly name: string;
  readonly path: string;
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
  },
  {
    section: "Your Account",
    name: "Retrieve a Printed Proof",
    path: "/account/designs",
  },
  {
    section: "Your Account",
    name: "Track Your Order",
    path: "/account/orders",
  },
  { section: "Your Account", name: "Place a Reorder", path: "/account/orders" },
  { section: "Contact Us", name: "Send us an Email", path: "/contact" },
  { section: "Service Center", name: "Help Center", path: "/help_center" },
  { section: "Service Center", name: "Get a Quick Quote", path: "/quotes" },
  {
    section: "Service Center",
    name: "Content Guidelines",
    path: "/help_center/content-guidelines",
  },
  {
    section: "Service Center",
    name: "Our Commitment to Accessibility",
    path: "/help_center/our-commitment-to-accessibility",
  },
];
