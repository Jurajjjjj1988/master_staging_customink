import { test, expect } from "../fixtures/pages.fixture";

/**
 * Tests #37 #38 — SEO discovery infrastructure.
 *
 * `robots.txt` and `sitemap.xml` are not "header or footer" content per se
 * but they ARE the contract between the site and search-engine crawlers.
 * A misconfigured robots that disallows the homepage, or a sitemap that
 * 404s, both produce silent organic-traffic loss for weeks before anyone
 * notices. These two checks add ten seconds to a nightly run and would
 * have caught both of those incidents historically at every site I've seen.
 */

test.describe("@p2 seo-discovery — robots.txt", () => {
  test("should_serve_robots_txt_with_user_agent_rules", async ({ page }) => {
    const response = await page.request.get("/robots.txt");
    expect(response.status(), "robots.txt must be reachable").toBe(200);
    const body = await response.text();
    // A sane robots.txt at minimum names a User-agent. We don't assert the
    // specific allow/disallow rules — those are policy that legitimately
    // changes — but the file should not be empty or HTML.
    expect(body, "robots.txt body must contain User-agent").toMatch(
      /User-agent:/i,
    );
    expect(
      body.toLowerCase().startsWith("<!doctype"),
      "robots.txt returned HTML — likely a 404 page misrouted",
    ).toBe(false);
  });

  test("should_either_declare_sitemap_or_intentionally_block_crawling", async ({
    page,
  }) => {
    /*
     * Two acceptable outcomes:
     *   (a) Production-style robots.txt declares `Sitemap: https://…`
     *   (b) Staging-style robots.txt has `Disallow: /` to keep the env
     *       out of search indexes — declaring a Sitemap there would be
     *       counter-productive.
     * Failing this test means the file is in a third, broken state.
     */
    const response = await page.request.get("/robots.txt");
    const body = await response.text();
    const declaresSitemap = /Sitemap:\s*https?:\/\//i.test(body);
    const blocksAll = /Disallow:\s*\/\s*$/m.test(body);
    expect(
      declaresSitemap || blocksAll,
      `robots.txt is in an unexpected state — neither declares a Sitemap nor blocks all crawling:\n${body}`,
    ).toBe(true);
  });
});

test.describe("@p2 seo-discovery — sitemap.xml", () => {
  /*
   * Conventional locations: `/sitemap.xml`, `/sitemap_index.xml`. The site may
   * use either; we accept whichever is reachable.
   */
  test("should_serve_a_reachable_sitemap_at_a_conventional_path", async ({
    page,
  }) => {
    const candidates = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap"];
    const results: { path: string; status: number }[] = [];
    for (const path of candidates) {
      const r = await page.request.get(path, { failOnStatusCode: false });
      results.push({ path, status: r.status() });
    }
    const reachable = results.find((r) => r.status >= 200 && r.status < 400);
    expect(
      reachable,
      `No sitemap reachable at conventional paths: ${JSON.stringify(results)}`,
    ).toBeDefined();
  });
});
