import { test, expect, type Page } from "../fixtures/pages.fixture";
import { HeaderComponent } from "../pages/components/HeaderComponent";
import { FooterComponent } from "../pages/components/FooterComponent";
import { HEADER_PRIMARY_NAV } from "../data/header-links";
import { FOOTER_LINKS } from "../data/footer-links";
import { LEGAL_LINKS } from "../data/legal-links";
import { FOLLOW_US_LINKS } from "../data/follow-us-links";
import { checkLinkOk } from "../helpers/http-check";

/**
 * Tests #2 #3 #4 — link integrity for the entire header + footer link surface.
 * Three tests cover ALL clickable links: internal navigation (#2), Follow Us
 * social + blog (#3), special protocol links such as tel: and skip-link (#4).
 */

interface InternalLinkCase {
  readonly source: "header" | "footer-section" | "footer-legal";
  readonly section?: string;
  readonly name: string;
  readonly expectedPath: string;
  readonly skipHttpCheck?: "auth-required" | "staging-broken";
}

const HEADER_CASES: InternalLinkCase[] = HEADER_PRIMARY_NAV.map((n) => ({
  source: "header",
  name: n.name,
  expectedPath: n.expectedPath,
}));

const FOOTER_SECTION_CASES: InternalLinkCase[] = FOOTER_LINKS.map((l) => ({
  source: "footer-section",
  section: l.section,
  name: l.name,
  expectedPath: l.path,
  skipHttpCheck: l.skipHttpCheck,
}));

const FOOTER_LEGAL_CASES: InternalLinkCase[] = LEGAL_LINKS.map((l) => ({
  source: "footer-legal",
  name: l.name,
  expectedPath: l.path,
}));

const ALL_INTERNAL_LINKS: InternalLinkCase[] = [
  ...HEADER_CASES,
  ...FOOTER_SECTION_CASES,
  ...FOOTER_LEGAL_CASES,
];

function locateLink(page: Page, c: InternalLinkCase) {
  if (c.source === "header") {
    return new HeaderComponent(page).navItem(c.name);
  }
  const footer = new FooterComponent(page);
  if (c.source === "footer-legal") {
    return footer.legalLink(c.name as never);
  }
  return footer.section(c.section as never).getByRole("link", { name: c.name });
}

const slug = (s: string): string => s.replace(/[^\w]+/g, "_");

test.describe("@p1 links — internal link integrity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  for (const c of ALL_INTERNAL_LINKS) {
    test(`should_navigate_to_expected_url_when_clicking_${c.source}_${slug(c.name)}`, async ({
      page,
    }) => {
      const link = locateLink(page, c);
      const href = await link.first().getAttribute("href");

      await test.step(`href is non-empty and not a placeholder`, () => {
        expect(href, "must have href").toBeTruthy();
        expect(href!, "no placeholder href").not.toMatch(/^(#|javascript:|$)/);
      });

      await test.step(`href matches expected path`, () => {
        const url = new URL(href!, page.url());
        // Accept trailing slash variants (Rails apps often canonicalize either way).
        const normalize = (p: string): string => p.replace(/\/$/, "") || "/";
        expect(normalize(url.pathname)).toBe(normalize(c.expectedPath));
      });

      if (c.skipHttpCheck) {
        await test.step(`HTTP status check skipped (${c.skipHttpCheck})`, () => {
          // Documented exception — see data file for justification.
        });
      } else {
        await test.step(`URL ${href} returns < 400`, async () => {
          const url = new URL(href!, page.url());
          const status = await checkLinkOk(page.request, url.toString());
          expect(status).toBeLessThan(400);
        });
      }
    });
  }
});

test.describe("@p1 links — Follow-Us destinations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  for (const entry of FOLLOW_US_LINKS) {
    test(`should_link_to_correct_destination_for_${slug(entry.name)}`, async ({
      page,
    }) => {
      const link = new FooterComponent(page).followUsLink(entry.name);
      const href = await link.getAttribute("href");
      expect(href).toBeTruthy();
      const url = new URL(href!, page.url());

      if (entry.kind === "external") {
        // External social platforms aggressively block bot HEAD/GET (Facebook, TikTok return
        // 400/404 to non-browser UAs). For external links we verify only the destination
        // domain — the link being present and pointing at the right brand is the test.
        expect(url.hostname).toContain(entry.expectedDomain);
      } else {
        const normalize = (p: string): string => p.replace(/\/$/, "") || "/";
        expect(normalize(url.pathname)).toBe(normalize(entry.expectedPath));
        const status = await checkLinkOk(page.request, url.toString());
        expect(status).toBeLessThan(400);
      }
    });
  }
});

test.describe("@p1 links — special protocols", () => {
  test("should_have_valid_tel_protocol_on_phone_link", async ({ page }) => {
    await page.goto("/");
    const phoneLink = new FooterComponent(page).root.getByRole("link", {
      name: /855-271-2660/,
    });
    const href = await phoneLink.first().getAttribute("href");
    expect(href).toBe("tel:855-271-2660");
  });

  test("should_have_existing_target_for_skip_link", async ({ page }) => {
    await page.goto("/");
    const skipLink = page.getByRole("link", { name: /skip to main content/i });
    const href = await skipLink.first().getAttribute("href");
    expect(href).toBe("#main-content");
    await expect(page.locator("#main-content")).toBeAttached();
  });
});
