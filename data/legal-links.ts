import type { LegalLinkName } from "../pages/components/FooterComponent";

export const LEGAL_LINKS: readonly { name: LegalLinkName; path: string }[] = [
  { name: "Privacy Policy", path: "/about/privacy" },
  { name: "California Privacy Notice", path: "/about/ccpa" },
  { name: "User Agreement", path: "/about/user_agreement" },
];
