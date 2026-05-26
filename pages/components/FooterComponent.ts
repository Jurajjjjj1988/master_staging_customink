import type { Page, Locator } from "@playwright/test";

// Escape regex metacharacters so a section/link name can be safely
// interpolated into `new RegExp`. Inline (one-line body) keeps the POM
// self-contained.
const escapeRegex = (s: string): string =>
  s.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

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

  /**
   * Locate a footer section by name. Uses `hasText` (not a strict heading filter)
   * because section labels are inconsistent across breakpoints — mobile uses a
   * proper `<h6>` heading while desktop renders some labels (e.g. "Talk to a Real
   * Person") as plain text. We accept both the canonical name passed in and the
   * known desktop variant for "Contact Us".
   */
  section(name: FooterSectionName): Locator {
    // Mobile renders the section name as a proper <h6> while desktop sometimes uses
    // styled static text. We try the heading first (most specific), then fall back
    // to a navigation that simply contains the section name as text.
    const variants =
      name === "Contact Us" ? [name, "Talk to a Real Person"] : [name];
    const pattern = variants.map((v) => escapeRegex(v)).join("|");
    const re = new RegExp(`(${pattern})`, "i");
    const byHeading = this.root.getByRole("navigation").filter({
      has: this.page.getByRole("heading", { name: re }),
    });
    const byText = this.root.getByRole("navigation").filter({ hasText: re });
    return byHeading.or(byText).first();
  }

  /**
   * The Blog link appears twice in the footer (About Us section + Follow Us icon row).
   * The Follow Us variant is the only one with `aria-label`, so we use that to disambiguate.
   */
  followUsLink(name: FollowUsLinkName): Locator {
    const accessibleName =
      name === "Custom Ink Blog" ? name : `Custom Ink on ${name}`;
    return this.root.getByLabel(
      new RegExp(`^${escapeRegex(accessibleName)}$`, "i"),
    );
  }

  legalLink(name: LegalLinkName): Locator {
    return this.root.getByRole("link", { name });
  }
}
