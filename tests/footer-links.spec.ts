import { test, expect } from "../fixtures/pages.fixture";
import { waitForFooterReady } from "../helpers/page-state";
import { FOOTER_LINKS } from "../data/footer-links";
import { FOLLOW_US_LINKS } from "../data/follow-us-links";
import { FooterComponent } from "../pages/components/FooterComponent";

/**
 * Footer click-through journeys — extracted from `user-journeys.spec.ts`
 * because the parameterized loops over FOOTER_LINKS (16 entries) and
 * FOLLOW_US_LINKS (6 entries) generate 22 tests on their own and are
 * structurally independent of the per-state header journeys.
 *
 * The footer is the user's secondary navigation surface (About, Account,
 * Contact, Service Center). Each link is its own journey: click → arrive
 * on the destination → page renders. Auth-required `/account/*` links
 * fall through to a 200-OK empty shell on this site (Walk & Watch
 * 2026-04-23 confirmed) — for those we verify the href only.
 */

test.describe("@p1 journey — footer link click-through", () => {
  for (const link of FOOTER_LINKS) {
    test(`positive: user clicks footer ${link.section} > ${link.name} and lands on the right destination`, async ({
      page,
    }) => {
      await page.goto("/", { timeout: 60_000 });
      await waitForFooterReady(page);

      const footer = new FooterComponent(page);
      const item = footer
        .section(link.section)
        .getByRole("link", { name: link.name })
        .first();
      await expect(item).toBeVisible({ timeout: 10_000 });

      if (
        link.skipHttpCheck === "auth-required" ||
        link.skipHttpCheck === "environment-specific"
      ) {
        // Walk & Watch on 2026-04-23: this site does NOT redirect anonymous
        // users from /account/* to /sign_in. The protected pages return
        // 200 OK with an empty content shell (header + footer + nothing).
        // Same pattern for environment-specific routes (Help Center on
        // staging). For both we only verify the href targets the right
        // path without firing a click that lands on the empty shell.
        const href = await item.getAttribute("href");
        const pathname = new URL(href ?? "", page.url()).pathname;
        expect(pathname).toBe(link.path);
      } else {
        // Normal click — must navigate and render real content. Use
        // pathname.startsWith to tolerate trailing-slash and redirect
        // chains that land on a child path (e.g. /contact -> /contact/us);
        // strict equality was causing false-fail on every link with a
        // server-side redirect.
        await Promise.all([
          page.waitForURL(
            (url) => {
              const actual = new URL(url.toString()).pathname.replace(
                /\/$/,
                "",
              );
              const expected = link.path.replace(/\/$/, "");
              return actual.startsWith(expected);
            },
            { timeout: 20_000 },
          ),
          item.click(),
        ]);
        // Destination must render — heading or main element.
        const heading = page
          .getByRole("heading")
          .or(page.getByRole("main"))
          .first();
        await expect(heading).toBeVisible({ timeout: 10_000 });
        // Defense against "wired to /about but /about is a 200-OK custom
        // 404 page" — the heading must NOT be a not-found marker. Without
        // this the URL-match alone passes when the page is technically
        // routed but content-broken.
        await expect(heading).not.toHaveText(
          /page not found|^404|not\s+found|page (is )?no longer/i,
        );
      }
    });
  }
});

test.describe("@p1 journey — Follow Us social links", () => {
  for (const entry of FOLLOW_US_LINKS) {
    test(`positive: user can follow CustomInk on ${entry.name}`, async ({
      page,
    }) => {
      await page.goto("/", { timeout: 60_000 });
      await waitForFooterReady(page);

      const footer = new FooterComponent(page);
      const link = footer.followUsLink(entry.name);
      await expect(link).toBeVisible({ timeout: 10_000 });

      if (entry.kind === "external") {
        // Don't navigate away — verify the destination domain + that the
        // link opens in a new tab (the user's expected pattern).
        const href = await link.getAttribute("href");
        const url = new URL(href ?? "", page.url());
        expect(url.hostname).toContain(entry.expectedDomain);
        await expect(link).toHaveAttribute("target", /_blank|new/i);
      } else {
        // Internal (Custom Ink Blog) — click and verify destination.
        // Normalize trailing slash before comparing — staging serves /blog/
        // (with slash) for the path data file lists as /blog. waitUntil
        // explicitly set to domcontentloaded — blog subdomain has long-tail
        // third-party requests that prevent the "load" event from firing.
        await Promise.all([
          page.waitForURL(
            (url) => {
              const actual = new URL(url.toString()).pathname.replace(
                /\/$/,
                "",
              );
              const expected = entry.expectedPath.replace(/\/$/, "");
              return actual === expected;
            },
            { timeout: 20_000, waitUntil: "domcontentloaded" },
          ),
          link.click(),
        ]);
        await expect(page.getByRole("heading").first()).toBeVisible({
          timeout: 10_000,
        });
      }
    });
  }
});
