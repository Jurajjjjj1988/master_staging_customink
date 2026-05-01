import { test, expect } from "../fixtures/pages.fixture";

/**
 * Tests #21 #22 — regression catchers.
 *
 *   #21 No empty / hash-only / `javascript:` href anywhere in header or footer.
 *       Catches CMS migrations and content drift that turn real links into dead links.
 *   #22 Footer copyright contains the current year. Catches "still says 2024 in 2026"
 *       regressions.
 */

test.describe("@p1 regression — link hygiene", () => {
  test("should_have_no_empty_hash_or_javascript_href_in_header_or_footer", async ({
    page,
  }) => {
    await page.goto("/");

    const offending = await page.evaluate(() => {
      // Allow the skip-link's intentional `#main-content` anchor.
      const ALLOWED = new Set(["#main-content"]);
      const links = globalThis.document.querySelectorAll<HTMLAnchorElement>(
        'ci-header-prerender a, ci-header a, [role="contentinfo"] a, ci-full-footer a',
      );
      return Array.from(links)
        .map((a) => a.getAttribute("href") ?? "")
        .filter(
          (h) =>
            !ALLOWED.has(h) &&
            (h === "" || h === "#" || h.startsWith("javascript:")),
        );
    });

    expect(
      offending,
      `bad hrefs in header/footer: ${JSON.stringify(offending)}`,
    ).toEqual([]);
  });
});

test.describe("@p1 regression — page-wide first-party link sanity", () => {
  /**
   * Every first-party `<a href>` on the homepage is checked for: (a) a non-empty
   * href, (b) no `#`/`javascript:` placeholder, (c) an allowed protocol. We do
   * NOT HEAD-probe every URL — page-wide that would be 100+ calls per run; tests
   * #2 and #3 cover status for curated link sets. Third-party widgets (LiveChat,
   * OneTrust, Optimizely, Klaviyo, any iframe) inject their own scaffolding —
   * those are excluded by ancestor selector. The test fails on dead links
   * inside the site's own markup, which is exactly the regression category
   * marketing/CMS edits routinely introduce.
   */
  test("should_have_structurally_valid_href_on_every_first_party_link", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const results = await page.evaluate(() => {
      const ALLOWED_HASH = new Set(["#main-content"]);
      const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "tel:", "mailto:"]);
      const THIRD_PARTY = [
        "[id^='onetrust-']",
        "[id^='ot-sdk']",
        "[id^='livechat']",
        "[class*='LiveChat' i]",
        "[id^='optimizely']",
        "[class^='optimizely']",
        "[class*='klaviyo-form']",
        "iframe",
      ].join(",");

      const offenders: {
        href: string;
        reason: string;
        text: string;
        parentClass: string;
      }[] = [];
      const links =
        globalThis.document.querySelectorAll<HTMLAnchorElement>("a[href]");
      for (const a of Array.from(links)) {
        if (a.closest(THIRD_PARTY)) continue;
        const href = a.getAttribute("href") ?? "";
        const text = (a.textContent ?? "").trim().slice(0, 40);
        const parentClass = (
          a.parentElement?.className?.toString() ?? ""
        ).slice(0, 60);
        const offender = (reason: string): void => {
          offenders.push({ href, reason, text, parentClass });
        };
        if (href === "") {
          offender("empty");
          continue;
        }
        if (href === "#" && !ALLOWED_HASH.has(href)) {
          offender("hash-only");
          continue;
        }
        if (href.startsWith("javascript:")) {
          offender("javascript-protocol");
          continue;
        }
        if (
          href.startsWith("/") ||
          href.startsWith("#") ||
          href.startsWith("?")
        ) {
          continue;
        }
        try {
          const url = new URL(href);
          if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
            offender(`protocol ${url.protocol}`);
          }
        } catch {
          offender("invalid URL");
        }
      }
      return offenders;
    });

    /*
     * Baseline pattern: the suite tracks the set of dead-href links that EXIST
     * today and asserts the live page exactly matches. Adding a new dead link
     * (e.g. a marketing edit ships with `href="#"` placeholder) fails the test
     * loudly with a precise diff. Removing one (the calendar gets wired up)
     * also fails — prompting maintainers to update the baseline. Neither side
     * of the diff is silently tolerated.
     */
    const BASELINE_KNOWN_OFFENDERS = new Set<string>([
      // Marketing module ships these as placeholder hash-anchors that get
      // upgraded to a calendar modal after a click handler attaches. Until
      // wiring is complete, both render as dead anchors at first paint.
      "View Delivery Calendar",
      "View Calendar",
    ]);

    const newOffenders = results.filter(
      (o) => !BASELINE_KNOWN_OFFENDERS.has(o.text),
    );
    const removedOffenders = [...BASELINE_KNOWN_OFFENDERS].filter(
      (text) => !results.some((o) => o.text === text),
    );

    expect(
      newOffenders,
      `New dead-href links (not in baseline):\n${JSON.stringify(newOffenders, null, 2)}`,
    ).toEqual([]);
    expect(
      removedOffenders,
      `Baseline contains entries no longer present — update BASELINE_KNOWN_OFFENDERS: ${removedOffenders.join(", ")}`,
    ).toEqual([]);
  });
});

test.describe("@p2 regression — copyright year", () => {
  test("should_display_current_year_in_footer_copyright", async ({ page }) => {
    await page.goto("/");
    const currentYear = new Date().getFullYear();
    const copyright = page.getByRole("contentinfo").getByText(/©.*CustomInk/i);
    await expect(copyright).toContainText(String(currentYear));
  });
});
