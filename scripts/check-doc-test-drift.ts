/**
 * Doc <-> test drift detector.
 *
 * Verifies that every `V<major>.<minor>` reference in a `test.describe(...)` title
 * points at a real `##` / `###` section in `docs/components/header.md`, and that
 * every numbered doc section is referenced by at least one test (allowlist aside).
 *
 * Exit code:
 *   0 — no drift
 *   1 — at least one orphan ref or untested section
 *
 * Usage: `npm run check:drift`
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { argv, cwd, exit, stdout } from "node:process";

interface DocSection {
  id: string;
  heading: string;
  line: number;
  body: string;
}

interface TestRef {
  id: string;
  file: string;
  line: number;
  describe: string;
}

/**
 * Sections that are intentionally not 1:1 test-mapped.
 *
 *   1.1 / 2.1 / 3.1 / 4.1 — "Identifikácia variantu" reference snapshots; identity
 *     info is covered via the inventory tests in §X.2, no separate describe needed.
 *   1.3 — Behaviorálna špecifikácia umbrella section; behaviour is covered by
 *     `tests/journeys/*` whose describe titles use "@p1 journey — ..." pattern,
 *     not literal `V1.3`. README §"Doc <-> spec mapping" notes this.
 *   2.6 — V2 Stavy a podmienky; body explicitly says "Hlavička samotná zostáva
 *     rovnaká" — header unchanged from V1, so the V1.6 cookie/auth tests cover it.
 *   3.4 / 3.5 / 3.6 — Lab-specific; My Designs panel + Save modal not openable
 *     in automation (Stencil hover + pointer interception). Tracked in BACKLOG #5.
 *   4.5 — V4 responsive; body says "Plná chrome ako variant 1 + identity overlay
 *     swap" — behaviour is delegated to V1.5 + V4.2/V4.4 overlays.
 */
const UNTESTED_ALLOWLIST: ReadonlySet<string> = new Set([
  "1.1",
  "1.3",
  "2.1",
  "2.6",
  "3.1",
  "3.4",
  "3.5",
  "3.6",
  "4.1",
  "4.5",
]);

/**
 * Body-text triggers that mark a section as a "delegated variant overlay" — the
 * section explicitly defers its behaviour to V1, so V1's tests cover it and a
 * dedicated test would be redundant. Detected case-insensitively against the
 * raw body text between this `##` heading and the next.
 */
const DELEGATION_PHRASES: readonly string[] = [
  "identické s variant",
  "identické s V1",
  "identical with V1",
  "identical with variant 1",
];

/**
 * Test refs that point at the common-chapter shorthand `V0.x`. The doc uses unnumbered
 * `##` headings for §0 (Spoločné technické základy), so V0.x cannot be matched against
 * a literal section ID. README.md §"Doc <-> spec mapping" maps these explicitly:
 *   V0.1 = HTML semantic landmark struktura
 *   V0.2 = Technicky stack (host elements)
 *   V0.3 = HTML semantic landmark struktura (skip link)
 *   V0.4 = Dizajnove tokeny
 */
const ORPHAN_REF_ALLOWLIST: ReadonlySet<string> = new Set([
  "0.1",
  "0.2",
  "0.3",
  "0.4",
]);

const DOC_PATH = "docs/components/header.md";
const TEST_DIRS: readonly string[] = ["tests/header", "tests/journeys"];

/** Matches a heading like `## 1.4 Flyouty ...` or `### 1.5 ...` — first capture is the X.Y id. */
const DOC_HEADING_RE = /^(?:##|###)\s+(\d+\.\d+)\b/;

/** Matches any `## ` heading line — used to delimit section bodies. */
const ANY_H2_RE = /^##\s+/;

/** Matches references like `V1.4`, `V2.7` inside any string in test source. */
const TEST_REF_RE = /\bV(\d+\.\d+)\b/g;

/**
 * Captures the first-line title of a `test.describe(...)`, `test(...)`, or
 * `test.fixme(...)` call. Each is a place a reviewer might write `V<X.Y>`.
 */
const TEST_TITLE_RE =
  /test(?:\.(?:describe|fixme|skip))?\(\s*([`'"])((?:\\.|(?!\1).)*?)\1/;

function readDocSections(repoRoot: string): DocSection[] {
  const file = resolve(repoRoot, DOC_PATH);
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const out: DocSection[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = DOC_HEADING_RE.exec(lines[i] ?? "");
    if (!match?.[1]) continue;
    // Walk forward to the next `## ` heading (or EOF) and collect the body.
    // `### ` sub-headings stay part of the parent §X.Y body — they're not
    // delimiters at this granularity.
    const bodyLines: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      if (ANY_H2_RE.test(lines[j] ?? "")) break;
      bodyLines.push(lines[j] ?? "");
    }
    out.push({
      id: match[1],
      heading: lines[i] ?? "",
      line: i + 1,
      body: bodyLines.join("\n"),
    });
  }
  return out;
}

/**
 * True iff the body text contains any of the {@link DELEGATION_PHRASES} (case-insensitive).
 * Used to auto-allowlist variant-overlay sections that defer behaviour to V1.
 */
function isDelegatedToV1(body: string): boolean {
  const haystack = body.toLowerCase();
  for (const phrase of DELEGATION_PHRASES) {
    if (haystack.includes(phrase.toLowerCase())) return true;
  }
  return false;
}

function listSpecFiles(repoRoot: string): string[] {
  const out: string[] = [];
  for (const dir of TEST_DIRS) {
    const abs = resolve(repoRoot, dir);
    let entries: string[];
    try {
      entries = readdirSync(abs);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (!name.endsWith(".spec.ts")) continue;
      const full = join(abs, name);
      const st = statSync(full);
      if (st.isFile()) out.push(full);
    }
  }
  return out.sort();
}

function readTestRefs(specFiles: readonly string[]): TestRef[] {
  const refs: TestRef[] = [];
  for (const file of specFiles) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const titleMatch = TEST_TITLE_RE.exec(line);
      if (!titleMatch) continue;
      const title = titleMatch[2] ?? "";
      TEST_REF_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = TEST_REF_RE.exec(title)) !== null) {
        const id = m[1];
        if (id) refs.push({ id, file, line: i + 1, describe: title });
      }
    }
  }
  return refs;
}

function formatRelative(repoRoot: string, file: string): string {
  const root = repoRoot.endsWith("/") ? repoRoot : `${repoRoot}/`;
  return file.startsWith(root) ? file.slice(root.length) : file;
}

function printSection(title: string): void {
  stdout.write(`\n${title}\n${"-".repeat(title.length)}\n`);
}

function main(): void {
  const repoRoot = resolve(argv[2] ?? cwd());

  const docSections = readDocSections(repoRoot);
  const docIds = new Set<string>(docSections.map((s) => s.id));

  const specFiles = listSpecFiles(repoRoot);
  const testRefs = readTestRefs(specFiles);
  const testRefIds = new Set<string>(testRefs.map((r) => r.id));

  const orphans = testRefs.filter(
    (r) => !docIds.has(r.id) && !ORPHAN_REF_ALLOWLIST.has(r.id),
  );

  // Runtime allowlist: sections whose body explicitly delegates to V1 (variant
  // overlays). Computed from doc body, separate from the static
  // UNTESTED_ALLOWLIST (which only covers reference-snapshot §X.1 sections).
  const autoAllowlisted = docSections.filter(
    (s) =>
      !testRefIds.has(s.id) &&
      !UNTESTED_ALLOWLIST.has(s.id) &&
      isDelegatedToV1(s.body),
  );
  const autoAllowlistIds = new Set<string>(autoAllowlisted.map((s) => s.id));

  const untested = docSections.filter(
    (s) =>
      !testRefIds.has(s.id) &&
      !UNTESTED_ALLOWLIST.has(s.id) &&
      !autoAllowlistIds.has(s.id),
  );

  stdout.write(
    `Doc:    ${formatRelative(repoRoot, resolve(repoRoot, DOC_PATH))}\n`,
  );
  stdout.write(
    `Tests:  ${specFiles.length} spec file(s) across ${TEST_DIRS.join(", ")}\n`,
  );
  stdout.write(
    `Doc sections: ${docSections.length}  |  Test refs: ${testRefs.length}  (unique: ${testRefIds.size})\n`,
  );
  stdout.write(
    `Allowlist:  untested=${[...UNTESTED_ALLOWLIST].join(",")}  orphan=${[...ORPHAN_REF_ALLOWLIST].join(",")}\n`,
  );

  printSection(
    `(a) Orphan test refs - describe says V<id> but doc has no section <id>`,
  );
  if (orphans.length === 0) {
    stdout.write("  (none)\n");
  } else {
    for (const r of orphans) {
      const rel = formatRelative(repoRoot, r.file);
      stdout.write(`  V${r.id}  ${rel}:${r.line}  "${r.describe}"\n`);
    }
  }

  printSection(
    `(auto-allowlist) Sections delegating to V1 - skipped on "identical with variant 1" body rule`,
  );
  if (autoAllowlisted.length === 0) {
    stdout.write("  (none)\n");
  } else {
    for (const s of autoAllowlisted) {
      stdout.write(
        `  ${s.id}  ${formatRelative(repoRoot, resolve(repoRoot, DOC_PATH))}:${s.line}  "${s.heading.trim()}"\n`,
      );
    }
  }

  printSection(
    `(b) Untested doc sections - section <id> exists but no test references it`,
  );
  if (untested.length === 0) {
    stdout.write("  (none)\n");
  } else {
    for (const s of untested) {
      stdout.write(
        `  ${s.id}  ${formatRelative(repoRoot, resolve(repoRoot, DOC_PATH))}:${s.line}  "${s.heading.trim()}"\n`,
      );
    }
  }

  const drift = orphans.length + untested.length;
  printSection("Summary");
  stdout.write(
    `  Orphan refs:       ${orphans.length}\n` +
      `  Untested sections: ${untested.length}\n` +
      `  Auto-allowlisted:  ${autoAllowlisted.length} (delegated-to-V1)\n`,
  );

  if (drift === 0) {
    stdout.write("\nOK - doc and tests are aligned.\n");
    exit(0);
  }
  stdout.write(`\nDRIFT - ${drift} issue(s) found. See report above.\n`);
  exit(1);
}

main();
