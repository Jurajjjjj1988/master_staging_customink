import type { FollowUsLinkName } from "../pages/components/FooterComponent";

interface ExternalFollowUs {
  readonly name: FollowUsLinkName;
  readonly kind: "external";
  readonly expectedDomain: string;
}
interface InternalFollowUs {
  readonly name: FollowUsLinkName;
  readonly kind: "internal";
  readonly expectedPath: string;
}

export type FollowUsEntry = ExternalFollowUs | InternalFollowUs;

export const FOLLOW_US_LINKS: readonly FollowUsEntry[] = [
  { name: "Facebook", kind: "external", expectedDomain: "facebook.com" },
  { name: "LinkedIn", kind: "external", expectedDomain: "linkedin.com" },
  { name: "Pinterest", kind: "external", expectedDomain: "pinterest.com" },
  { name: "Instagram", kind: "external", expectedDomain: "instagram.com" },
  { name: "TikTok", kind: "external", expectedDomain: "tiktok.com" },
  { name: "Custom Ink Blog", kind: "internal", expectedPath: "/blog" },
];
