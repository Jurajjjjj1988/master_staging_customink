import type { Page, Locator } from "@playwright/test";
import { escapeRegex } from "../../helpers/regex";

export type FooterSectionName =
  | "About Us"
  | "Your Account"
  | "Contact Us"
  | "Service Center";

export type FollowUsLinkName =
  | "Facebook"
  | "LinkedIn"
  | "Pinterest"
  | "Instagram"
  | "TikTok"
  | "Custom Ink Blog";

export type LegalLinkName =
  | "Privacy Policy"
  | "California Privacy Notice"
  | "User Agreement";

export class FooterComponent {
  readonly root: Locator;
  readonly copyright: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByRole("contentinfo");
    this.copyright = this.root.getByText(/©.*CustomInk/i);
  }

  section(name: FooterSectionName): Locator {
    return this.root.getByRole("navigation").filter({
      has: this.page.getByRole("heading", {
        name: new RegExp(`^${escapeRegex(name)}$`, "i"),
      }),
    });
  }

  followUsLink(name: FollowUsLinkName): Locator {
    const accessibleName =
      name === "Custom Ink Blog" ? name : `Custom Ink on ${name}`;
    return this.root.getByRole("link", {
      name: new RegExp(`^${escapeRegex(accessibleName)}$`, "i"),
    });
  }

  legalLink(name: LegalLinkName): Locator {
    return this.root.getByRole("link", { name });
  }
}
