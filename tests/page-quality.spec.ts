import { test, expect } from "../fixtures/pages.fixture";

/**
 * Tests #33 — #36 — page-quality regression catchers.
 *
 * Each of these tests is a low-cost, high-signal sanity check that a normal
 * person would never think to write but a senior catches in code review.
 * They guard the kinds of HTML-quality bugs that ship silently and only
 * surface as "the site feels broken" weeks later.
 *
 *   #33 No duplicate `id` attributes (HTML validity + a11y impact)
 *   #34 Every `<img>` in header/footer has alt text (a11y baseline)
 *   #35 No `<button>` in header/footer is keyboardable but unlabeled
 *   #36 Page exposes JSON-LD structured data (SEO discoverability)
 */

test.describe("@p1 page-quality — HTML uniqueness and integrity", () => {
  test("should_have_no_duplicate_id_attributes_on_homepage", async ({
    page,
  }) => {
    await page.goto("/");

    const dupIds = await page.evaluate(() => {
      const counts = new Map<string, number>();
      for (const el of Array.from(
        globalThis.document.querySelectorAll("[id]"),
      )) {
        const id = el.id;
        if (!id) continue;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      return Array.from(counts.entries())
        .filter(([, n]) => n > 1)
        .map(([id, n]) => ({ id, count: n }));
    });

    expect(
      dupIds,
      `Duplicate IDs found:\n${JSON.stringify(dupIds, null, 2)}`,
    ).toEqual([]);
  });
});

test.describe("@p1 page-quality — accessibility baseline (header/footer)", () => {
  test("should_have_alt_text_on_every_image_in_header_or_footer", async ({
    page,
  }) => {
    await page.goto("/");

    const offenders = await page.evaluate(() => {
      const scopes = [
        ...globalThis.document.querySelectorAll(
          "ci-header-prerender, ci-header",
        ),
        ...globalThis.document.querySelectorAll("ci-full-footer, footer"),
      ];
      const bad: { src: string; reason: string }[] = [];
      for (const scope of scopes) {
        for (const img of Array.from(scope.querySelectorAll("img"))) {
          if (img.getAttribute("aria-hidden") === "true") continue;
          if (img.getAttribute("role") === "presentation") continue;
          const alt = img.getAttribute("alt");
          if (alt === null) {
            bad.push({ src: img.src.slice(0, 80), reason: "missing alt" });
          }
        }
      }
      return bad;
    });

    expect(
      offenders,
      `Images without alt in header/footer:\n${JSON.stringify(offenders, null, 2)}`,
    ).toEqual([]);
  });

  test("should_have_accessible_name_on_every_button_in_header_or_footer", async ({
    page,
  }) => {
    await page.goto("/");

    const offenders = await page.evaluate(() => {
      const scopes = [
        ...globalThis.document.querySelectorAll(
          "ci-header-prerender, ci-header",
        ),
        ...globalThis.document.querySelectorAll("ci-full-footer, footer"),
      ];
      const bad: { html: string }[] = [];
      for (const scope of scopes) {
        for (const btn of Array.from(scope.querySelectorAll("button"))) {
          if (btn.getAttribute("aria-hidden") === "true") continue;
          // WAI-ARIA accessible name computation: aria-labelledby > aria-label
          // > visible text > title. We accept any non-empty source.
          const ariaLabel = btn.getAttribute("aria-label")?.trim();
          const labelledBy = btn.getAttribute("aria-labelledby")?.trim();
          const text = btn.textContent?.trim();
          const title = btn.getAttribute("title")?.trim();
          if (!ariaLabel && !labelledBy && !text && !title) {
            bad.push({ html: btn.outerHTML.slice(0, 200) });
          }
        }
      }
      return bad;
    });

    expect(
      offenders,
      `Buttons with no accessible name:\n${JSON.stringify(offenders, null, 2)}`,
    ).toEqual([]);
  });
});

test.describe("@p2 page-quality — SEO structured data", () => {
  test("should_expose_at_least_one_jsonld_block_on_homepage", async ({
    page,
  }) => {
    await page.goto("/");

    const blocks = await page.evaluate(() => {
      const scripts = globalThis.document.querySelectorAll(
        'script[type="application/ld+json"]',
      );
      const parsed: { ok: boolean; type: string | null; raw: string }[] = [];
      for (const s of Array.from(scripts)) {
        const raw = (s.textContent ?? "").slice(0, 200);
        try {
          const json = JSON.parse(s.textContent ?? "");
          const t =
            (json && typeof json === "object" && "@type" in json
              ? String(json["@type"])
              : null) ?? null;
          parsed.push({ ok: true, type: t, raw });
        } catch {
          parsed.push({ ok: false, type: null, raw });
        }
      }
      return parsed;
    });

    expect(
      blocks.length,
      "no JSON-LD structured data found on homepage",
    ).toBeGreaterThan(0);
    for (const b of blocks) {
      expect(b.ok, `invalid JSON-LD block: ${b.raw}`).toBe(true);
    }
  });
});
