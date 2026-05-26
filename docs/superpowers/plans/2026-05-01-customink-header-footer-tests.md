# CustomInk Header & Footer Test Suite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Playwright + TypeScript E2E test suite that covers the CustomInk staging site's global header and footer with 26 high-signal tests + 1 cross-cutting page-health fixture, runnable in CI on every PR in under two minutes.

**Architecture:** Component-scoped Page Object Model (HeaderComponent, FooterComponent, CookieBanner only — no BasePage, no per-page POMs). Data-driven tests for link integrity. Cross-cutting `monitorPageHealth` fixture (auto on every test) for silent regressions. Visual regression limited to a single stable region. axe-core for a11y baseline.

**Tech Stack:** Playwright 1.49+ • TypeScript 5.6+ • `@playwright/test` • `@axe-core/playwright` • `dotenv` • `eslint-plugin-playwright` • GitHub Actions

**Spec:** [`docs/superpowers/specs/2026-05-01-customink-header-footer-tests-design.md`](../specs/2026-05-01-customink-header-footer-tests-design.md)

---

## File Structure

```
customink-tests/
├── pages/components/
│   ├── HeaderComponent.ts          # Header POM (Task 13)
│   ├── FooterComponent.ts          # Footer POM, exports types (Task 14)
│   └── CookieBanner.ts             # Cookie banner POM (Task 15)
├── fixtures/
│   └── pages.fixture.ts            # cookieDismissed, monitorPageHealth, authenticated (Task 16)
├── helpers/
│   └── regex.ts                    # escapeRegex (Task 7)
├── data/
│   ├── pages-under-test.ts         # 5 page paths (Task 8)
│   ├── header-links.ts             # HEADER_PRIMARY_NAV, MEGA_MENU_TRIGGERS (Task 9)
│   ├── footer-links.ts             # FOOTER_LINKS array (Task 10)
│   ├── follow-us-links.ts          # FOLLOW_US_LINKS (Task 11)
│   └── legal-links.ts              # LEGAL_LINKS (Task 12)
├── tests/
│   ├── render.spec.ts              # #1 (Task 17)
│   ├── links.spec.ts               # #2 #3 #4 (Tasks 18-20)
│   ├── search.spec.ts              # #5 #6 #7a #7b (Tasks 21-24)
│   ├── mega-menu.spec.ts           # #8 (Task 25)
│   ├── user-state.spec.ts          # #9 #10 (Tasks 26-27)
│   ├── secondary-actions.spec.ts   # #11a #11b (Tasks 28-29)
│   ├── cookie-consent.spec.ts      # #12 #13 #14 #15 (Tasks 30-33)
│   ├── a11y.spec.ts                # #16 #17 #18 (Tasks 34-36)
│   ├── responsive.spec.ts          # #19 #20 (Tasks 37-38)
│   ├── regression.spec.ts          # #21 #22 (Tasks 39-40)
│   ├── visual.spec.ts              # #23 (Task 41)
│   └── performance.spec.ts         # #24 (Task 42)
├── .github/workflows/
│   ├── pr.yml                      # Task 43
│   └── nightly.yml                 # Task 44
├── storage/                        # gitignored, holds auth.json when available
├── playwright.config.ts            # Task 4
├── tsconfig.json                   # Task 3
├── eslint.config.mjs               # Task 5
├── .env.example                    # Task 6
├── .gitignore                      # Task 6
├── package.json                    # Task 2
└── README.md                       # Task 45
```

---

## Phase 1 — Project Bootstrap

### Task 1: Initialize git repository

**Files:**

- Create: `customink-tests/.git/`

- [ ] **Step 1: Initialize repo**

```bash
cd /Users/kapusansky/DEV/customink-tests
git init
git checkout -b main
```

- [ ] **Step 2: Verify**

Run: `git status`
Expected: `On branch main / No commits yet`

---

### Task 2: Create package.json

**Files:**

- Create: `customink-tests/package.json`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "customink-tests",
  "version": "0.1.0",
  "private": true,
  "description": "E2E tests for CustomInk header & footer (staging)",
  "scripts": {
    "test": "playwright test",
    "test:p1": "playwright test --grep @p1",
    "test:headed": "playwright test --headed",
    "test:ui": "playwright test --ui",
    "test:report": "playwright show-report",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@axe-core/playwright": "^4.10.0",
    "@playwright/test": "^1.49.0",
    "@types/node": "^22.0.0",
    "dotenv": "^16.4.5",
    "eslint": "^9.13.0",
    "eslint-plugin-playwright": "^2.0.1",
    "typescript": "^5.6.3"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: lockfile created, `node_modules/` populated, no errors.

- [ ] **Step 3: Install Playwright browsers**

Run: `npx playwright install chromium webkit`
Expected: browsers downloaded.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: initialize package.json with playwright and tooling"
```

---

### Task 3: TypeScript configuration

**Files:**

- Create: `customink-tests/tsconfig.json`

- [ ] **Step 1: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "playwright-report", "test-results"]
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output (no `.ts` files yet — passes vacuously).

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: add strict typescript config"
```

---

### Task 4: Playwright configuration

**Files:**

- Create: `customink-tests/playwright.config.ts`

- [ ] **Step 1: Write playwright.config.ts**

```typescript
import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv();

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [["html", { open: "never" }], ["list"], ["github"]],
  use: {
    baseURL: process.env.BASE_URL ?? "https://www-master.staging.customink.com",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "webkit-desktop",
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
```

- [ ] **Step 2: Verify config parses**

Run: `npx playwright test --list`
Expected: `Total: 0 tests` (no test files yet — config is valid).

- [ ] **Step 3: Commit**

```bash
git add playwright.config.ts
git commit -m "chore: add playwright config with 3 projects and dotenv"
```

---

### Task 5: ESLint configuration

**Files:**

- Create: `customink-tests/eslint.config.mjs`

- [ ] **Step 1: Write eslint.config.mjs**

```javascript
import playwright from "eslint-plugin-playwright";

export default [
  {
    ...playwright.configs["flat/recommended"],
    files: ["tests/**/*.ts"],
    rules: {
      ...playwright.configs["flat/recommended"].rules,
      "playwright/expect-expect": "error",
      "playwright/no-conditional-in-test": "error",
      "playwright/no-skipped-test": "error",
      "playwright/no-wait-for-timeout": "error",
      "playwright/no-force-option": "error",
      "playwright/prefer-web-first-assertions": "error",
    },
  },
  {
    ignores: ["node_modules/**", "playwright-report/**", "test-results/**"],
  },
];
```

- [ ] **Step 2: Verify**

Run: `npx eslint .`
Expected: `0 problems` (no test files yet).

- [ ] **Step 3: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore: add eslint with playwright plugin"
```

---

### Task 6: Environment & ignore files

**Files:**

- Create: `customink-tests/.env.example`
- Create: `customink-tests/.gitignore`

- [ ] **Step 1: Write .env.example**

```
BASE_URL=https://www-master.staging.customink.com
```

- [ ] **Step 2: Write .gitignore**

```
# Dependencies
node_modules/

# Test artifacts
playwright-report/
test-results/
*.zip

# Storage state with auth tokens
storage/auth.json

# Local env
.env
.env.local

# IDE
.vscode/
.idea/
.DS_Store

# Logs
*.log
```

- [ ] **Step 3: Copy example to local .env**

```bash
cp .env.example .env
```

- [ ] **Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add .env.example and .gitignore"
```

---

## Phase 2 — Core Utilities

### Task 7: escapeRegex helper

**Files:**

- Create: `customink-tests/helpers/regex.ts`
- Create: `customink-tests/helpers/regex.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// helpers/regex.test.ts
import { test, expect } from "@playwright/test";
import { escapeRegex } from "./regex";

test.describe("escapeRegex", () => {
  test("escapes regex metacharacters", () => {
    expect(escapeRegex("a.b+c")).toBe("a\\.b\\+c");
  });

  test("escapes parentheses and brackets", () => {
    expect(escapeRegex("(test)[1]")).toBe("\\(test\\)\\[1\\]");
  });

  test("escapes backslashes", () => {
    expect(escapeRegex("a\\b")).toBe("a\\\\b");
  });

  test("returns unchanged plain string", () => {
    expect(escapeRegex("plain text")).toBe("plain text");
  });

  test("escaped string is safe to interpolate into RegExp", () => {
    const dangerous = "Open Custom T-shirts (Pro) menu";
    const re = new RegExp(escapeRegex(dangerous));
    expect(re.test(dangerous)).toBe(true);
    expect(re.test("Open Custom T-shirts XYZ menu")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx playwright test helpers/regex.test.ts --reporter=list`
Expected: FAIL with module-not-found / `escapeRegex is not a function`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// helpers/regex.ts
/** Escape regex metacharacters so a string can be safely interpolated into `new RegExp`. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx playwright test helpers/regex.test.ts --reporter=list`
Expected: 5 passed.

- [ ] **Step 5: Update playwright config to include helpers tests**

The default `testDir: "./tests"` excludes the helper test. Move/rename so it's picked up:

```bash
mkdir -p tests/_unit
mv helpers/regex.test.ts tests/_unit/regex.test.ts
```

Update import in `tests/_unit/regex.test.ts`:

```typescript
import { escapeRegex } from "../../helpers/regex";
```

Run again: `npx playwright test _unit/regex.test.ts --reporter=list`
Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add helpers/regex.ts tests/_unit/regex.test.ts
git commit -m "feat(helpers): add escapeRegex with unit tests"
```

---

## Phase 3 — Data Files

### Task 8: pages-under-test.ts

**Files:**

- Create: `customink-tests/data/pages-under-test.ts`

- [ ] **Step 1: Write the data file**

```typescript
// data/pages-under-test.ts
export const PAGES_UNDER_TEST = [
  { name: "home", path: "/" },
  { name: "product", path: "/products/t-shirts/4" },
  { name: "blog", path: "/blog" },
  { name: "about", path: "/about" },
  { name: "not-found", path: "/this-page-does-not-exist-12345" },
] as const;

export type PageUnderTest = (typeof PAGES_UNDER_TEST)[number];
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add data/pages-under-test.ts
git commit -m "feat(data): add pages-under-test list for cross-page coverage"
```

---

### Task 9: header-links.ts

**Files:**

- Create: `customink-tests/data/header-links.ts`

- [ ] **Step 1: Write the data file**

```typescript
// data/header-links.ts

/** Header items with a direct link target — used by test #2 (link integrity). */
export const HEADER_PRIMARY_NAV = [
  { name: "Custom T-shirts", expectedPath: "/products/t-shirts/4" },
  { name: "Custom Apparel", expectedPath: "/products/apparel/857" },
  {
    name: "Promotional Products",
    expectedPath: "/products/promotional-products/218",
  },
  { name: "Design Lab", expectedPath: "/lab" },
] as const;

/** Mega-menu trigger names — used by test #8 (hover open). */
export const MEGA_MENU_TRIGGERS = [
  "Custom T-shirts",
  "Custom Apparel",
  "Promotional Products",
  "Design Lab",
  "Groups & Events",
] as const;

export type HeaderNavItem = (typeof HEADER_PRIMARY_NAV)[number];
export type MegaMenuTrigger = (typeof MEGA_MENU_TRIGGERS)[number];
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add data/header-links.ts
git commit -m "feat(data): add header nav and mega-menu trigger data"
```

---

### Task 10: footer-links.ts

**Files:**

- Create: `customink-tests/data/footer-links.ts`

- [ ] **Step 1: Write the data file**

```typescript
// data/footer-links.ts
import type { FooterSectionName } from "../pages/components/FooterComponent";

export interface FooterLink {
  readonly section: FooterSectionName;
  readonly name: string;
  readonly path: string;
}

export const FOOTER_LINKS: readonly FooterLink[] = [
  { section: "About Us", name: "Get to Know Custom Ink", path: "/about" },
  { section: "About Us", name: "Careers", path: "/about/jobs" },
  { section: "About Us", name: "Press", path: "/about/press" },
  { section: "About Us", name: "Partnerships", path: "/about/partners" },
  {
    section: "About Us",
    name: "Diversity & Belonging",
    path: "/equity-for-all",
  },
  { section: "About Us", name: "Customer Reviews", path: "/reviews" },
  { section: "About Us", name: "Customer Photos", path: "/photos" },
  { section: "About Us", name: "Custom Ink Blog", path: "/blog" },
  { section: "About Us", name: "Store Locations", path: "/ink/stores" },
  {
    section: "Your Account",
    name: "Retrieve a Saved Design",
    path: "/account/designs",
  },
  {
    section: "Your Account",
    name: "Retrieve a Printed Proof",
    path: "/account/designs",
  },
  {
    section: "Your Account",
    name: "Track Your Order",
    path: "/account/orders",
  },
  { section: "Your Account", name: "Place a Reorder", path: "/account/orders" },
  { section: "Contact Us", name: "Send us an Email", path: "/contact" },
  { section: "Service Center", name: "Help Center", path: "/help_center" },
  { section: "Service Center", name: "Get a Quick Quote", path: "/quotes" },
  {
    section: "Service Center",
    name: "Content Guidelines",
    path: "/help_center/content-guidelines",
  },
  {
    section: "Service Center",
    name: "Our Commitment to Accessibility",
    path: "/help_center/our-commitment-to-accessibility",
  },
];
```

- [ ] **Step 2: Note — file references types from FooterComponent which doesn't exist yet**

Typecheck will fail until Task 14 creates `FooterComponent.ts` with the type exports. This is intentional — the data files declare their dependency on the component's types.

Run: `npx tsc --noEmit`
Expected: error `Cannot find module '../pages/components/FooterComponent'` — this is expected and will resolve in Task 14.

- [ ] **Step 3: Commit**

```bash
git add data/footer-links.ts
git commit -m "feat(data): add footer-links data (18 entries)"
```

---

### Task 11: follow-us-links.ts

**Files:**

- Create: `customink-tests/data/follow-us-links.ts`

- [ ] **Step 1: Write the data file**

```typescript
// data/follow-us-links.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add data/follow-us-links.ts
git commit -m "feat(data): add follow-us-links (5 external + 1 internal blog)"
```

---

### Task 12: legal-links.ts

**Files:**

- Create: `customink-tests/data/legal-links.ts`

- [ ] **Step 1: Write the data file**

```typescript
// data/legal-links.ts
import type { LegalLinkName } from "../pages/components/FooterComponent";

export const LEGAL_LINKS: readonly { name: LegalLinkName; path: string }[] = [
  { name: "Privacy Policy", path: "/about/privacy" },
  { name: "California Privacy Notice", path: "/about/ccpa" },
  { name: "User Agreement", path: "/about/user_agreement" },
];
```

- [ ] **Step 2: Commit**

```bash
git add data/legal-links.ts
git commit -m "feat(data): add legal-links"
```

---

## Phase 4 — POM Components

### Task 13: HeaderComponent

**Files:**

- Create: `customink-tests/pages/components/HeaderComponent.ts`

- [ ] **Step 1: Write HeaderComponent.ts**

```typescript
// pages/components/HeaderComponent.ts
import type { Page, Locator } from "@playwright/test";
import { escapeRegex } from "../../helpers/regex";

export class HeaderComponent {
  /** Use semantic role, not the implementation-specific custom element tag. */
  readonly root: Locator;
  readonly logo: Locator;
  readonly search: Locator;
  readonly cart: Locator;
  readonly signIn: Locator;
  readonly favorites: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByRole("banner");
    this.logo = this.root.getByRole("link", { name: /customink logo/i });
    this.search = this.root.getByRole("combobox", { name: /search/i });
    // Cart label may include a count badge ("Cart (3)") when items exist.
    this.cart = this.root.getByRole("link", { name: /^cart\b/i });
    this.signIn = this.root.getByRole("link", { name: /^sign in$/i });
    this.favorites = this.root.getByRole("link", { name: /^favorites$/i });
  }

  /** Locate any header nav link by its accessible name. */
  navItem(name: string): Locator {
    return this.root.getByRole("link", { name });
  }

  /** Locate a mega-menu trigger button by the menu name. */
  megaMenuTrigger(name: string): Locator {
    return this.root.getByRole("button", {
      name: new RegExp(`Open ${escapeRegex(name)} menu`, "i"),
    });
  }

  /** Submit a search query and let navigation occur. */
  async submitSearch(query: string): Promise<void> {
    await this.search.fill(query);
    await this.search.press("Enter");
  }

  /** Autocomplete options when the listbox is open. */
  get autocompleteOptions(): Locator {
    return this.page.getByRole("listbox").getByRole("option");
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors specific to this file (footer-links / follow-us-links / legal-links errors persist until Task 14).

- [ ] **Step 3: Commit**

```bash
git add pages/components/HeaderComponent.ts
git commit -m "feat(pom): add HeaderComponent with role-based locators"
```

---

### Task 14: FooterComponent (with type exports)

**Files:**

- Create: `customink-tests/pages/components/FooterComponent.ts`

- [ ] **Step 1: Write FooterComponent.ts**

```typescript
// pages/components/FooterComponent.ts
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
```

- [ ] **Step 2: Typecheck — should now fully pass**

Run: `npx tsc --noEmit`
Expected: no errors. Data files (Tasks 10, 11, 12) now resolve their type imports.

- [ ] **Step 3: Lint**

Run: `npx eslint .`
Expected: 0 problems.

- [ ] **Step 4: Commit**

```bash
git add pages/components/FooterComponent.ts
git commit -m "feat(pom): add FooterComponent with type exports for data files"
```

---

### Task 15: CookieBanner

**Files:**

- Create: `customink-tests/pages/components/CookieBanner.ts`

- [ ] **Step 1: Write CookieBanner.ts**

```typescript
// pages/components/CookieBanner.ts
import type { Page, Locator } from "@playwright/test";

export class CookieBanner {
  /**
   * OneTrust banner. Primary selector is semantic; fallback to the stable OneTrust ID
   * (`#onetrust-banner-sdk`) if the `region` role is absent in production markup.
   */
  readonly root: Locator;
  readonly acceptButton: Locator;
  readonly rejectButton: Locator;
  readonly settingsButton: Locator;

  constructor(page: Page) {
    this.root = page
      .getByRole("region", { name: /cookie banner/i })
      .or(page.locator("#onetrust-banner-sdk"));
    // Anchor "Accept" to avoid matching "Accept Recommended" inside the settings modal.
    this.acceptButton = this.root.getByRole("button", {
      name: /^accept(\s+all(\s+cookies)?)?$/i,
    });
    this.rejectButton = this.root.getByRole("button", {
      name: /^reject all$/i,
    });
    this.settingsButton = this.root.getByRole("button", {
      name: /^cookie settings$/i,
    });
  }

  async accept(): Promise<void> {
    await this.acceptButton.click();
  }
  async reject(): Promise<void> {
    await this.rejectButton.click();
  }
  async openSettings(): Promise<void> {
    await this.settingsButton.click();
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add pages/components/CookieBanner.ts
git commit -m "feat(pom): add CookieBanner with role + ID fallback"
```

---

## Phase 5 — Fixtures

### Task 16: pages.fixture.ts

**Files:**

- Create: `customink-tests/fixtures/pages.fixture.ts`

- [ ] **Step 1: Write the fixture**

```typescript
// fixtures/pages.fixture.ts
import { test as base, expect, type Page } from "@playwright/test";

type Fixtures = {
  cookieDismissed: void;
  monitorPageHealth: void;
  authenticated: Page;
};

const CONSOLE_ALLOWLIST: readonly RegExp[] = [
  // populate empirically as known third-party noise emerges
];
const REQUEST_ALLOWLIST: readonly RegExp[] = [
  // e.g. /https:\/\/.*\.doubleclick\.net\//,
];

const isAllowlistedConsole = (text: string): boolean =>
  CONSOLE_ALLOWLIST.some((re) => re.test(text));
const isAllowlistedRequest = (url: string): boolean =>
  REQUEST_ALLOWLIST.some((re) => re.test(url));

export const test = base.extend<Fixtures>({
  cookieDismissed: [
    async ({ context }, use) => {
      await context.addCookies([
        {
          name: "OptanonAlertBoxClosed",
          value: new Date().toISOString(),
          domain: ".staging.customink.com",
          path: "/",
        },
      ]);
      await use();
    },
    { auto: true },
  ],

  monitorPageHealth: [
    async ({ page }, use, testInfo) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const failedRequests: string[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "error" && !isAllowlistedConsole(msg.text())) {
          consoleErrors.push(msg.text());
        }
      });
      page.on("pageerror", (err) => pageErrors.push(err.message));
      page.on("response", (resp) => {
        if (resp.status() >= 400 && !isAllowlistedRequest(resp.url())) {
          failedRequests.push(`${resp.status()} ${resp.url()}`);
        }
      });

      await use();

      const brokenImages = await page.evaluate(() =>
        Array.from(document.images)
          .filter((i) => i.complete && i.naturalWidth === 0)
          .map((i) => i.src),
      );

      const issues = {
        consoleErrors,
        pageErrors,
        failedRequests,
        brokenImages,
      };
      const hasIssue = Object.values(issues).some((arr) => arr.length > 0);
      if (hasIssue) {
        await testInfo.attach("page-health.json", {
          body: JSON.stringify(issues, null, 2),
          contentType: "application/json",
        });
        throw new Error(`Page health check failed: ${JSON.stringify(issues)}`);
      }
    },
    { auto: true },
  ],

  authenticated: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: "storage/auth.json",
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Lint**

Run: `npx eslint .`
Expected: 0 problems.

- [ ] **Step 4: Commit**

```bash
git add fixtures/pages.fixture.ts
git commit -m "feat(fixtures): add cookieDismissed, monitorPageHealth, authenticated"
```

---

## Phase 6 — Tests

> Tag convention: `@p1`, `@p2`, `@p3` on each test for CI grep filtering. Tests run against staging via `BASE_URL`.

### Task 17: Test #1 — render & cross-page consistency

**Files:**

- Create: `customink-tests/tests/render.spec.ts`

- [ ] **Step 1: Write the spec**

```typescript
// tests/render.spec.ts
import { test, expect } from "../fixtures/pages.fixture";
import { HeaderComponent } from "../pages/components/HeaderComponent";
import { FooterComponent } from "../pages/components/FooterComponent";
import { PAGES_UNDER_TEST } from "../data/pages-under-test";

test.describe("@p1 render — header & footer cross-page consistency", () => {
  for (const pageDef of PAGES_UNDER_TEST) {
    test(`should_render_header_and_footer_on_${pageDef.name}_page`, async ({
      page,
    }) => {
      await test.step(`navigate to ${pageDef.path}`, async () => {
        await page.goto(pageDef.path);
      });

      const header = new HeaderComponent(page);
      const footer = new FooterComponent(page);

      await test.step("header is visible with logo, search, cart", async () => {
        await expect(header.root).toBeVisible();
        await expect(header.logo).toBeVisible();
        await expect(header.search).toBeVisible();
        await expect(header.cart).toBeVisible();
      });

      await test.step("footer is visible with copyright", async () => {
        await expect(footer.root).toBeVisible();
        await expect(footer.copyright).toBeVisible();
      });
    });
  }
});
```

- [ ] **Step 2: Run the spec**

Run: `npx playwright test render.spec.ts --project=chromium-desktop --reporter=list`
Expected: 5 passed (one per page in `PAGES_UNDER_TEST`).

- [ ] **Step 3: Commit**

```bash
git add tests/render.spec.ts
git commit -m "test: #1 render header and footer consistently across 5 pages"
```

---

### Task 18: Test #2 — internal link integrity

**Files:**

- Create: `customink-tests/tests/links.spec.ts` (will be extended in Tasks 19, 20)

- [ ] **Step 1: Write test #2**

```typescript
// tests/links.spec.ts
import { test, expect, type Page } from "../fixtures/pages.fixture";
import { HeaderComponent } from "../pages/components/HeaderComponent";
import { FooterComponent } from "../pages/components/FooterComponent";
import { HEADER_PRIMARY_NAV } from "../data/header-links";
import { FOOTER_LINKS } from "../data/footer-links";
import { LEGAL_LINKS } from "../data/legal-links";

interface InternalLinkCase {
  readonly source: "header" | "footer-section" | "footer-legal";
  readonly section?: string;
  readonly name: string;
  readonly expectedPath: string;
}

const HEADER_CASES: InternalLinkCase[] = HEADER_PRIMARY_NAV.map((n) => ({
  source: "header" as const,
  name: n.name,
  expectedPath: n.expectedPath,
}));

const FOOTER_SECTION_CASES: InternalLinkCase[] = FOOTER_LINKS.map((l) => ({
  source: "footer-section" as const,
  section: l.section,
  name: l.name,
  expectedPath: l.path,
}));

const FOOTER_LEGAL_CASES: InternalLinkCase[] = LEGAL_LINKS.map((l) => ({
  source: "footer-legal" as const,
  name: l.name,
  expectedPath: l.path,
}));

const ALL_INTERNAL_LINKS: InternalLinkCase[] = [
  ...HEADER_CASES,
  ...FOOTER_SECTION_CASES,
  ...FOOTER_LEGAL_CASES,
];

async function locateLink(page: Page, c: InternalLinkCase) {
  if (c.source === "header") return new HeaderComponent(page).navItem(c.name);
  if (c.source === "footer-legal")
    return new FooterComponent(page).legalLink(c.name as never);
  return new FooterComponent(page)
    .section(c.section as never)
    .getByRole("link", { name: c.name });
}

test.describe("@p1 links — internal link integrity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  for (const c of ALL_INTERNAL_LINKS) {
    const label = `${c.source}${c.section ? `/${c.section}` : ""}/${c.name}`;
    test(`should_navigate_to_expected_url_when_clicking_${c.source}_${c.name.replace(/[^\w]+/g, "_")}`, async ({
      page,
    }) => {
      const link = await locateLink(page, c);
      const href = await link.first().getAttribute("href");

      await test.step(`${label}: href is non-empty and not a placeholder`, () => {
        expect(href, "must have href").toBeTruthy();
        expect(href, "no placeholder href").not.toMatch(/^(#|javascript:|$)/);
      });

      await test.step(`${label}: HEAD ${href} returns < 400`, async () => {
        const url = new URL(href!, page.url());
        const response = await page.request.head(url.toString());
        expect(response.status()).toBeLessThan(400);
      });

      await test.step(`${label}: href matches expected path`, () => {
        const url = new URL(href!, page.url());
        expect(url.pathname).toBe(c.expectedPath);
      });
    });
  }
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test links.spec.ts --project=chromium-desktop --reporter=list`
Expected: ~25 passed (4 header + 18 footer + 3 legal). Note: header tests may fail if mega-menu hydration bug (OQ-1) is active — they will pass on first visit.

- [ ] **Step 3: Commit**

```bash
git add tests/links.spec.ts
git commit -m "test: #2 internal link integrity (header + footer sections + legal)"
```

---

### Task 19: Test #3 — Follow-Us link destinations

**Files:**

- Modify: `customink-tests/tests/links.spec.ts`

- [ ] **Step 1: Append test #3 to links.spec.ts**

Add at the bottom of `tests/links.spec.ts`:

```typescript
import { FOLLOW_US_LINKS } from "../data/follow-us-links";

test.describe("@p1 links — Follow-Us destinations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  for (const entry of FOLLOW_US_LINKS) {
    test(`should_link_to_correct_destination_for_${entry.name.replace(/[^\w]+/g, "_")}`, async ({
      page,
    }) => {
      const link = new FooterComponent(page).followUsLink(entry.name);
      const href = await link.getAttribute("href");
      expect(href).toBeTruthy();
      const url = new URL(href!, page.url());

      if (entry.kind === "external") {
        expect(url.hostname).toContain(entry.expectedDomain);
      } else {
        expect(url.pathname).toBe(entry.expectedPath);
      }

      const response = await page.request.head(url.toString());
      expect(response.status()).toBeLessThan(400);
    });
  }
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test links.spec.ts --project=chromium-desktop --reporter=list`
Expected: 6 additional tests pass (Facebook, LinkedIn, Pinterest, Instagram, TikTok, Blog).

- [ ] **Step 3: Commit**

```bash
git add tests/links.spec.ts
git commit -m "test: #3 follow-us link destinations (5 external + 1 internal blog)"
```

---

### Task 20: Test #4 — special protocol links (tel:, skip-link)

**Files:**

- Modify: `customink-tests/tests/links.spec.ts`

- [ ] **Step 1: Append test #4**

Add at the bottom:

```typescript
test.describe("@p1 links — special protocols", () => {
  test("should_have_valid_tel_protocol_on_phone_link", async ({ page }) => {
    await page.goto("/");
    const phoneLink = page
      .getByRole("contentinfo")
      .getByRole("link", { name: /855-271-2660/ });
    const href = await phoneLink.getAttribute("href");
    expect(href).toBe("tel:855-271-2660");
  });

  test("should_have_existing_target_for_skip_link", async ({ page }) => {
    await page.goto("/");
    const skipLink = page.getByRole("link", { name: /skip to main content/i });
    const href = await skipLink.getAttribute("href");
    expect(href).toBe("#main-content");
    await expect(page.locator("#main-content")).toBeAttached();
  });
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test links.spec.ts --project=chromium-desktop --reporter=list`
Expected: 2 additional tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/links.spec.ts
git commit -m "test: #4 valid protocol on tel: and skip-link"
```

---

### Task 21: Test #5 — search submit

**Files:**

- Create: `customink-tests/tests/search.spec.ts`

- [ ] **Step 1: Write test #5**

```typescript
// tests/search.spec.ts
import { test, expect } from "../fixtures/pages.fixture";
import { HeaderComponent } from "../pages/components/HeaderComponent";

test.describe("@p1 search — submit valid query", () => {
  test("should_navigate_to_results_when_search_submitted", async ({ page }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);
    await header.submitSearch("tshirt");
    await page.waitForURL(/[?&]q=tshirt|search/);
    await expect(page).toHaveURL(/tshirt/);
  });
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test search.spec.ts --project=chromium-desktop --reporter=list`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add tests/search.spec.ts
git commit -m "test: #5 search submits and navigates to results"
```

---

### Task 22: Test #6 — search autocomplete

**Files:**

- Modify: `customink-tests/tests/search.spec.ts`

- [ ] **Step 1: Append test #6**

```typescript
test.describe("@p2 search — autocomplete", () => {
  test("should_show_autocomplete_and_navigate_when_suggestion_clicked", async ({
    page,
  }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);
    await header.search.fill("tshi");
    const suggestions = header.autocompleteOptions;
    await expect(suggestions.first()).toBeVisible();
    const count = await suggestions.count();
    expect(count).toBeGreaterThan(0);

    const startUrl = page.url();
    await suggestions.first().click();
    await page.waitForURL((url) => url.toString() !== startUrl);
    expect(page.url()).not.toBe(startUrl);
  });
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test search.spec.ts --project=chromium-desktop --reporter=list`
Expected: 2 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/search.spec.ts
git commit -m "test: #6 search autocomplete shows suggestions and navigates"
```

---

### Task 23: Test #7a — empty / oversized search input

**Files:**

- Modify: `customink-tests/tests/search.spec.ts`

- [ ] **Step 1: Append test #7a**

```typescript
test.describe("@p1 search — input boundaries", () => {
  test("should_handle_empty_and_oversized_search_input", async ({ page }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);
    const startUrl = page.url();

    await test.step("empty submit does not navigate", async () => {
      await header.search.fill("");
      await header.search.press("Enter");
      // Wait briefly to confirm no navigation occurred
      await page.waitForTimeout(500); // eslint-disable-line playwright/no-wait-for-timeout
      expect(page.url()).toBe(startUrl);
    });

    await test.step("oversized input (1000 chars) does not crash and navigates", async () => {
      const big = "a".repeat(1000);
      await header.search.fill(big);
      await header.search.press("Enter");
      await page.waitForLoadState("domcontentloaded");
      // Page must still respond — assert title is present
      await expect(page).toHaveTitle(/.+/);
    });
  });
});
```

> Note: the `waitForTimeout(500)` in the empty-submit step is a deliberate negative-test pattern — we are asserting the URL did NOT change. Disabling the lint rule once with the inline comment is acceptable here. If the team prefers, replace with `page.waitForURL(() => false, { timeout: 500 }).catch(() => {})` and assert URL unchanged.

- [ ] **Step 2: Run**

Run: `npx playwright test search.spec.ts --project=chromium-desktop --reporter=list`
Expected: 3 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/search.spec.ts
git commit -m "test: #7a search handles empty and oversized input"
```

---

### Task 24: Test #7b — XSS escape

**Files:**

- Modify: `customink-tests/tests/search.spec.ts`

- [ ] **Step 1: Append test #7b**

```typescript
test.describe("@p1 search — XSS escape", () => {
  test("should_escape_xss_payload_in_search_query", async ({ page }) => {
    let dialogFired = false;
    page.on("dialog", async (d) => {
      dialogFired = true;
      await d.dismiss();
    });

    await page.goto("/");
    const header = new HeaderComponent(page);
    await header.submitSearch("<script>alert(1)</script>");
    await page.waitForLoadState("domcontentloaded");

    await test.step("no dialog fired (script did not execute)", () => {
      expect(dialogFired).toBe(false);
    });

    await test.step("URL contains percent-encoded payload", () => {
      expect(page.url()).toMatch(/%3Cscript%3E|%3cscript%3e/i);
    });

    await test.step("DOM does not contain unescaped <script> from query", async () => {
      const scriptCount = await page
        .locator("script")
        .filter({ hasText: "alert(1)" })
        .count();
      expect(scriptCount).toBe(0);
    });
  });
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test search.spec.ts --project=chromium-desktop --reporter=list`
Expected: 4 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/search.spec.ts
git commit -m "test: #7b search escapes XSS payload (no dialog, encoded URL, no inline script)"
```

---

### Task 25: Test #8 — mega-menu hover

**Files:**

- Create: `customink-tests/tests/mega-menu.spec.ts`

- [ ] **Step 1: Write the spec**

```typescript
// tests/mega-menu.spec.ts
import { test, expect } from "../fixtures/pages.fixture";
import { HeaderComponent } from "../pages/components/HeaderComponent";
import { MEGA_MENU_TRIGGERS } from "../data/header-links";

test.describe("@p1 mega-menu — hover open", () => {
  for (const triggerName of MEGA_MENU_TRIGGERS) {
    test(`should_open_mega_menu_when_hovering_${triggerName.replace(/[^\w]+/g, "_")}`, async ({
      page,
    }) => {
      await page.goto("/");
      const header = new HeaderComponent(page);
      const trigger = header.megaMenuTrigger(triggerName);

      await expect(trigger).toBeVisible();
      await trigger.hover();
      // After hover, the trigger's aria-expanded should flip to "true"
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
    });
  }
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test mega-menu.spec.ts --project=chromium-desktop --reporter=list`
Expected: 5 passed (one per trigger). If failures appear, OQ-1 (hydration bug) is active — file the bug and add reload-consistency test.

- [ ] **Step 3: Commit**

```bash
git add tests/mega-menu.spec.ts
git commit -m "test: #8 mega-menu opens on hover for all 5 triggers"
```

---

### Task 26: Test #9 — Sign In visible (logged-out)

**Files:**

- Create: `customink-tests/tests/user-state.spec.ts`

- [ ] **Step 1: Write test #9**

```typescript
// tests/user-state.spec.ts
import { test, expect } from "../fixtures/pages.fixture";
import { HeaderComponent } from "../pages/components/HeaderComponent";

test.describe("@p1 user-state — logged out", () => {
  test("should_show_signin_link_when_logged_out", async ({ page }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);
    await expect(header.signIn).toBeVisible();
    await expect(header.signIn).toHaveAttribute(
      "href",
      /\/profiles\/users\/sign_in/,
    );
  });
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test user-state.spec.ts --project=chromium-desktop --reporter=list`
Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/user-state.spec.ts
git commit -m "test: #9 sign in link visible when logged out"
```

---

### Task 27: Test #10 — logged-in dropdown + logout (BLOCKED until creds available)

**Files:**

- Modify: `customink-tests/tests/user-state.spec.ts`

- [ ] **Step 1: Add the test, gated by storage state existence**

```typescript
import * as fs from "node:fs";

const AUTH_STATE = "storage/auth.json";
const hasAuth = fs.existsSync(AUTH_STATE);

test.describe("@p2 user-state — logged in", () => {
  test.skip(
    !hasAuth,
    `${AUTH_STATE} not present — skipping authenticated test (OQ-2 in spec)`,
  );

  test("should_show_user_dropdown_and_allow_logout_when_logged_in", async ({
    authenticated,
  }) => {
    const page = authenticated;
    await page.goto("/");
    const header = new HeaderComponent(page);

    await test.step("user dropdown visible (Sign In is hidden)", async () => {
      await expect(header.signIn).toBeHidden();
      const userDropdown = page.getByRole("button", {
        name: /open .* menu|account|user/i,
      });
      await expect(userDropdown).toBeVisible();
    });

    await test.step("logout link works", async () => {
      const userDropdown = page.getByRole("button", {
        name: /open .* menu|account|user/i,
      });
      await userDropdown.click();
      const signOut = page.getByRole("link", { name: /sign out|log out/i });
      await signOut.click();
      await expect(header.signIn).toBeVisible();
    });
  });
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test user-state.spec.ts --project=chromium-desktop --reporter=list`
Expected: #9 pass, #10 skipped (auth.json not present yet — see OQ-2).

- [ ] **Step 3: Commit**

```bash
git add tests/user-state.spec.ts
git commit -m "test: #10 logged-in user dropdown and logout (skipped until creds)"
```

---

### Task 28: Test #11a — secondary nav actions

**Files:**

- Create: `customink-tests/tests/secondary-actions.spec.ts`

- [ ] **Step 1: Write test #11a**

```typescript
// tests/secondary-actions.spec.ts
import { test, expect, type Page } from "../fixtures/pages.fixture";
import { HeaderComponent } from "../pages/components/HeaderComponent";

interface SecondaryActionCase {
  readonly name: string;
  readonly resolve: (
    h: HeaderComponent,
  ) => ReturnType<HeaderComponent["navItem"]>;
  readonly expectedPathFragment: RegExp;
}

const SECONDARY_ACTIONS: readonly SecondaryActionCase[] = [
  {
    name: "cart",
    resolve: (h) => h.cart,
    expectedPathFragment: /\/checkout\/summary/,
  },
  {
    name: "favorites",
    resolve: (h) => h.favorites,
    expectedPathFragment: /\/products\/favorites/,
  },
  {
    name: "sign-in",
    resolve: (h) => h.signIn,
    expectedPathFragment: /\/profiles\/users\/sign_in/,
  },
];

test.describe("@p1 secondary-actions — header navigation", () => {
  for (const action of SECONDARY_ACTIONS) {
    test(`should_navigate_to_correct_page_for_${action.name}`, async ({
      page,
    }: {
      page: Page;
    }) => {
      await page.goto("/");
      const header = new HeaderComponent(page);
      const link = action.resolve(header);
      const href = await link.getAttribute("href");
      expect(href).toBeTruthy();
      expect(href!).toMatch(action.expectedPathFragment);
    });
  }
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test secondary-actions.spec.ts --project=chromium-desktop --reporter=list`
Expected: 3 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/secondary-actions.spec.ts
git commit -m "test: #11a secondary nav actions (cart, favorites, sign-in)"
```

---

### Task 29: Test #11b — chat widget trigger

**Files:**

- Modify: `customink-tests/tests/secondary-actions.spec.ts`

- [ ] **Step 1: Append test #11b**

```typescript
test.describe("@p2 secondary-actions — chat widget trigger", () => {
  test("should_open_chat_widget_iframe_when_chat_now_clicked", async ({
    page,
  }) => {
    await page.goto("/");
    const chatTrigger = page.getByRole("button", { name: /^chat now$/i });
    await expect(chatTrigger).toBeVisible();
    await chatTrigger.click();
    // LiveChat iframe should be present (we don't interact inside)
    const livechatFrame = page.frameLocator(
      'iframe[title*="LiveChat" i], iframe[title*="chat widget" i]',
    );
    await expect(livechatFrame.locator("body")).toBeVisible();
  });
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test secondary-actions.spec.ts --project=chromium-desktop --reporter=list`
Expected: 4 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/secondary-actions.spec.ts
git commit -m "test: #11b chat widget iframe opens on Chat Now click"
```

---

### Task 30: Test #12 — cookie banner first visit

**Files:**

- Create: `customink-tests/tests/cookie-consent.spec.ts`

- [ ] **Step 1: Write test #12 (opt out of cookieDismissed for this whole file)**

```typescript
// tests/cookie-consent.spec.ts
import { test, expect } from "../fixtures/pages.fixture";
import { CookieBanner } from "../pages/components/CookieBanner";

// Cookie tests must see the real banner — disable the auto-dismiss fixture for this file.
test.use({ cookieDismissed: undefined as never });

test.describe("@p1 cookie-consent — first visit", () => {
  test("should_show_cookie_banner_on_first_visit", async ({ page }) => {
    await page.goto("/");
    const banner = new CookieBanner(page);
    await expect(banner.root).toBeVisible();
    await expect(banner.acceptButton).toBeVisible();
    await expect(banner.rejectButton).toBeVisible();
  });
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test cookie-consent.spec.ts --project=chromium-desktop --reporter=list`
Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/cookie-consent.spec.ts
git commit -m "test: #12 cookie banner shows on first visit"
```

---

### Task 31: Test #13 — accept persists + sets cookies

**Files:**

- Modify: `customink-tests/tests/cookie-consent.spec.ts`

- [ ] **Step 1: Append test #13**

```typescript
test.describe("@p1 cookie-consent — acceptance persistence", () => {
  test("should_persist_acceptance_and_set_analytics_cookies_after_reload", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    const banner = new CookieBanner(page);
    await banner.accept();
    await expect(banner.root).toBeHidden();

    await page.reload();
    await expect(banner.root).toBeHidden();

    const cookies = await context.cookies();
    const cookieNames = cookies.map((c) => c.name);
    expect(cookieNames).toEqual(
      expect.arrayContaining([expect.stringMatching(/optanon|consent|_ga/i)]),
    );
  });
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test cookie-consent.spec.ts --project=chromium-desktop --reporter=list`
Expected: 2 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/cookie-consent.spec.ts
git commit -m "test: #13 accept persists across reload and sets analytics cookies"
```

---

### Task 32: Test #14 — reject persists + no tracking cookies

**Files:**

- Modify: `customink-tests/tests/cookie-consent.spec.ts`

- [ ] **Step 1: Append test #14**

```typescript
test.describe("@p1 cookie-consent — rejection compliance", () => {
  test("should_persist_rejection_and_not_set_tracking_cookies_after_reload", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    const banner = new CookieBanner(page);
    await banner.reject();
    await expect(banner.root).toBeHidden();

    await page.reload();
    await expect(banner.root).toBeHidden();

    const cookies = await context.cookies();
    const trackingNames = cookies
      .map((c) => c.name)
      .filter((n) => /_ga|_gid|_fbp|_gcl|doubleclick/i.test(n));
    expect(trackingNames).toEqual([]);
  });
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test cookie-consent.spec.ts --project=chromium-desktop --reporter=list`
Expected: 3 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/cookie-consent.spec.ts
git commit -m "test: #14 reject persists across reload and tracking cookies absent (legal compliance)"
```

---

### Task 33: Test #15 — cookie settings save preferences

**Files:**

- Modify: `customink-tests/tests/cookie-consent.spec.ts`

- [ ] **Step 1: Append test #15**

```typescript
test.describe("@p2 cookie-consent — settings", () => {
  test("should_save_custom_preferences_via_cookie_settings", async ({
    page,
  }) => {
    await page.goto("/");
    const banner = new CookieBanner(page);
    await banner.openSettings();
    const settingsModal = page
      .getByRole("dialog")
      .or(page.locator("#onetrust-pc-sdk"));
    await expect(settingsModal).toBeVisible();
    const saveButton = settingsModal.getByRole("button", {
      name: /confirm my choices|save settings/i,
    });
    await saveButton.click();
    await expect(banner.root).toBeHidden();
  });
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test cookie-consent.spec.ts --project=chromium-desktop --reporter=list`
Expected: 4 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/cookie-consent.spec.ts
git commit -m "test: #15 save custom preferences via cookie settings"
```

---

### Task 34: Test #16 — axe-core scan

**Files:**

- Create: `customink-tests/tests/a11y.spec.ts`

- [ ] **Step 1: Write test #16**

```typescript
// tests/a11y.spec.ts
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "../fixtures/pages.fixture";

const REGIONS = [
  { name: "header", include: '[role="banner"]' },
  { name: "footer", include: '[role="contentinfo"]' },
] as const;

test.describe("@p1 a11y — axe scan", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  for (const region of REGIONS) {
    test(`should_pass_axe_scan_on_${region.name}`, async ({ page }) => {
      const results = await new AxeBuilder({ page })
        .include(region.include)
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(
        blocking,
        `axe violations on ${region.name}: ${JSON.stringify(blocking, null, 2)}`,
      ).toEqual([]);
    });
  }
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test a11y.spec.ts --project=chromium-desktop --reporter=list`
Expected: 2 passed (or fail listing concrete a11y issues — file bug if so).

- [ ] **Step 3: Commit**

```bash
git add tests/a11y.spec.ts
git commit -m "test: #16 axe-core scan on header and footer (no critical/serious violations)"
```

---

### Task 35: Test #17 — keyboard traversal & focus visibility

**Files:**

- Modify: `customink-tests/tests/a11y.spec.ts`

- [ ] **Step 1: Append test #17**

```typescript
test.describe("@p1 a11y — keyboard navigation", () => {
  test("should_traverse_header_and_footer_in_dom_order_with_visible_focus", async ({
    page,
  }) => {
    await page.goto("/");

    // Skip-link is the first focusable element; pressing Enter should move focus to <main>
    await page.keyboard.press("Tab");
    const skipFocused = await page.evaluate(() =>
      document.activeElement?.textContent?.trim(),
    );
    expect(skipFocused).toMatch(/skip to main content/i);

    await page.keyboard.press("Enter");
    const mainFocused = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.id === "main-content" || el?.closest("#main-content") !== null;
    });
    expect(mainFocused).toBe(true);

    // Focus has a non-empty outline (visible focus indicator) on a sample interactive element.
    await page.goto("/");
    await page.keyboard.press("Tab"); // skip
    await page.keyboard.press("Tab"); // first nav item
    const outline = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return "";
      const cs = window.getComputedStyle(el);
      return cs.outlineStyle === "none"
        ? cs.boxShadow !== "none"
          ? "shadow"
          : ""
        : cs.outlineStyle;
    });
    expect(outline).not.toBe("");
  });
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test a11y.spec.ts --project=chromium-desktop --reporter=list`
Expected: 3 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/a11y.spec.ts
git commit -m "test: #17 keyboard traversal in DOM order with visible focus"
```

---

### Task 36: Test #18 — focus trap in cookie banner

**Files:**

- Modify: `customink-tests/tests/a11y.spec.ts`

- [ ] **Step 1: Append test #18 (opts out of cookieDismissed)**

```typescript
test.describe("@p2 a11y — focus trap", () => {
  test.use({ cookieDismissed: undefined as never });

  test("should_trap_focus_in_cookie_banner_until_dismissed", async ({
    page,
  }) => {
    await page.goto("/");
    const banner = page
      .getByRole("region", { name: /cookie banner/i })
      .or(page.locator("#onetrust-banner-sdk"));
    await expect(banner).toBeVisible();

    // Tab through 20 times — focus should always remain inside the banner.
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
      const insideBanner = await page.evaluate(() => {
        const el = document.activeElement;
        return (
          el?.closest('[role="region"][aria-label*="cookie" i]') !== null ||
          el?.closest("#onetrust-banner-sdk") !== null
        );
      });
      expect(insideBanner, `iteration ${i}: focus left banner`).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test a11y.spec.ts --project=chromium-desktop --reporter=list`
Expected: 4 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/a11y.spec.ts
git commit -m "test: #18 focus trap in cookie banner until dismissed"
```

---

### Task 37: Test #19 — simplified header at 1023px

**Files:**

- Create: `customink-tests/tests/responsive.spec.ts`

- [ ] **Step 1: Write test #19**

```typescript
// tests/responsive.spec.ts
import { test, expect } from "../fixtures/pages.fixture";
import { HeaderComponent } from "../pages/components/HeaderComponent";

test.describe("@p1 responsive — simplified header", () => {
  test.use({ viewport: { width: 1023, height: 768 } });

  test("should_render_simplified_header_at_1023px_viewport", async ({
    page,
  }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);

    await test.step("primary header chrome visible", async () => {
      await expect(header.logo).toBeVisible();
      await expect(header.search).toBeVisible();
      await expect(header.cart).toBeVisible();
      await expect(header.signIn).toBeVisible();
      await expect(header.favorites).toBeVisible();
    });

    await test.step("mega-menu trigger buttons hidden", async () => {
      await expect(header.megaMenuTrigger("Custom T-shirts")).toBeHidden();
      await expect(header.megaMenuTrigger("Custom Apparel")).toBeHidden();
      await expect(header.megaMenuTrigger("Promotional Products")).toBeHidden();
      await expect(header.megaMenuTrigger("Design Lab")).toBeHidden();
      await expect(header.megaMenuTrigger("Groups & Events")).toBeHidden();
    });
  });
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test responsive.spec.ts --project=chromium-desktop --reporter=list`
Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/responsive.spec.ts
git commit -m "test: #19 simplified header at 1023px (mega-menu hidden)"
```

---

### Task 38: Test #20 — no horizontal scroll at 320px

**Files:**

- Modify: `customink-tests/tests/responsive.spec.ts`

- [ ] **Step 1: Append test #20**

```typescript
test.describe("@p2 responsive — 320px viewport", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test("should_have_no_horizontal_scroll_at_320px_viewport", async ({
    page,
  }) => {
    await page.goto("/");
    const header = new HeaderComponent(page);

    await test.step("clientWidth equals viewport (no horizontal scroll)", async () => {
      const clientWidth = await page.evaluate(
        () => document.documentElement.clientWidth,
      );
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(clientWidth).toBe(320);
      expect(overflow).toBeLessThanOrEqual(0);
    });

    await test.step("logo, search, cart still visible", async () => {
      await expect(header.logo).toBeVisible();
      await expect(header.search).toBeVisible();
      await expect(header.cart).toBeVisible();
    });
  });
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test responsive.spec.ts --project=chromium-desktop --reporter=list`
Expected: 2 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/responsive.spec.ts
git commit -m "test: #20 no horizontal scroll at 320px viewport"
```

---

### Task 39: Test #21 — no empty/hash/javascript hrefs

**Files:**

- Create: `customink-tests/tests/regression.spec.ts`

- [ ] **Step 1: Write test #21**

```typescript
// tests/regression.spec.ts
import { test, expect } from "../fixtures/pages.fixture";

test.describe("@p1 regression — link hygiene", () => {
  test("should_have_no_empty_hash_or_javascript_href_in_header_or_footer", async ({
    page,
  }) => {
    await page.goto("/");

    const offending = await page.evaluate(() => {
      const ALLOWLIST = new Set(["#main-content"]);
      const root = document.querySelectorAll(
        '[role="banner"] a, [role="contentinfo"] a',
      );
      return Array.from(root)
        .map((a) => a.getAttribute("href") ?? "")
        .filter(
          (h) =>
            !ALLOWLIST.has(h) &&
            (h === "" || h === "#" || h.startsWith("javascript:")),
        );
    });

    expect(offending, `bad hrefs: ${JSON.stringify(offending)}`).toEqual([]);
  });
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test regression.spec.ts --project=chromium-desktop --reporter=list`
Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/regression.spec.ts
git commit -m "test: #21 no empty/hash/javascript href in header or footer"
```

---

### Task 40: Test #22 — copyright current year

**Files:**

- Modify: `customink-tests/tests/regression.spec.ts`

- [ ] **Step 1: Append test #22**

```typescript
test.describe("@p2 regression — copyright year", () => {
  test("should_display_current_year_in_footer_copyright", async ({ page }) => {
    await page.goto("/");
    const currentYear = new Date().getFullYear();
    const copyright = page.getByRole("contentinfo").getByText(/©.*CustomInk/i);
    await expect(copyright).toContainText(String(currentYear));
  });
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test regression.spec.ts --project=chromium-desktop --reporter=list`
Expected: 2 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/regression.spec.ts
git commit -m "test: #22 footer copyright shows current year"
```

---

### Task 41: Test #23 — visual baseline for footer legal section

**Files:**

- Create: `customink-tests/tests/visual.spec.ts`

- [ ] **Step 1: Write the spec**

```typescript
// tests/visual.spec.ts
import { test, expect } from "../fixtures/pages.fixture";

test.describe("@p3 visual — footer legal section baseline", () => {
  test("should_match_visual_baseline_for_footer_legal_section", async ({
    page,
  }) => {
    await page.goto("/");
    // Scroll footer into view, wait for stability
    const footer = page.getByRole("contentinfo");
    await footer.scrollIntoViewIfNeeded();
    await page.waitForLoadState("networkidle");

    const legalLinks = footer.getByRole("link", {
      name: /privacy policy|california privacy|user agreement/i,
    });
    await expect(legalLinks.first()).toBeVisible();

    // Snapshot the legal row only (parent of these links)
    const legalRow = page
      .locator(":has(a[href*='/about/privacy'])")
      .filter({ has: page.locator("a[href*='/about/user_agreement']") })
      .first();

    await expect(legalRow).toHaveScreenshot("footer-legal-row.png", {
      maxDiffPixelRatio: 0.01,
    });
  });
});
```

- [ ] **Step 2: Generate baseline (first run will create the snapshot)**

Run: `npx playwright test visual.spec.ts --project=chromium-desktop --reporter=list --update-snapshots`
Expected: passes after baseline written.

- [ ] **Step 3: Re-run to verify**

Run: `npx playwright test visual.spec.ts --project=chromium-desktop --reporter=list`
Expected: 1 passed.

- [ ] **Step 4: Commit (include the baseline image)**

```bash
git add tests/visual.spec.ts tests/visual.spec.ts-snapshots/
git commit -m "test: #23 visual baseline for footer legal section"
```

---

### Task 42: Test #24 — header LCP budget (nightly)

**Files:**

- Create: `customink-tests/tests/performance.spec.ts`

- [ ] **Step 1: Write the spec**

```typescript
// tests/performance.spec.ts
import { test, expect } from "../fixtures/pages.fixture";

test.describe("@p3 performance — header LCP", () => {
  test("should_render_header_within_lcp_budget", async ({ page }) => {
    await page.goto("/");
    // Capture LCP via PerformanceObserver
    const lcp = await page.evaluate<number>(
      () =>
        new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const last = entries[entries.length - 1] as PerformanceEntry & {
              startTime: number;
            };
            resolve(last.startTime);
          });
          observer.observe({
            type: "largest-contentful-paint",
            buffered: true,
          });
          // Safety timeout
          setTimeout(() => resolve(Number.POSITIVE_INFINITY), 6_000);
        }),
    );

    expect(lcp).toBeLessThan(2500);
  });
});
```

- [ ] **Step 2: Run (warning: nightly-grade test, may exceed budget on cold staging)**

Run: `npx playwright test performance.spec.ts --project=chromium-desktop --reporter=list`
Expected: 1 passed (or fail with concrete LCP number — investigate if so).

- [ ] **Step 3: Commit**

```bash
git add tests/performance.spec.ts
git commit -m "test: #24 header LCP under 2.5s budget (nightly)"
```

---

## Phase 7 — CI/CD

### Task 43: PR workflow (P1 only)

**Files:**

- Create: `customink-tests/.github/workflows/pr.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: PR — P1 tests

on:
  pull_request:
    branches: [main]

jobs:
  test:
    name: P1 / shard ${{ matrix.shard }}/4
    runs-on: ubuntu-latest
    timeout-minutes: 5
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --grep @p1 --project=chromium-desktop --project=mobile-chrome --shard=${{ matrix.shard }}/4
        env:
          BASE_URL: https://www-master.staging.customink.com
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-shard-${{ matrix.shard }}
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/pr.yml
git commit -m "ci: PR workflow runs P1 tests in 4 shards on chromium + mobile-chrome"
```

---

### Task 44: Nightly workflow (full suite, all browsers)

**Files:**

- Create: `customink-tests/.github/workflows/nightly.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: Nightly — full suite

on:
  schedule:
    - cron: "0 2 * * *"
  workflow_dispatch:

jobs:
  test:
    name: Full / ${{ matrix.project }} / shard ${{ matrix.shard }}/8
    runs-on: ubuntu-latest
    timeout-minutes: 12
    strategy:
      fail-fast: false
      matrix:
        project: [chromium-desktop, mobile-chrome, webkit-desktop]
        shard: [1, 2, 3, 4, 5, 6, 7, 8]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps ${{ matrix.project == 'webkit-desktop' && 'webkit' || 'chromium' }}
      - run: npx playwright test --project=${{ matrix.project }} --shard=${{ matrix.shard }}/8
        env:
          BASE_URL: https://www-master.staging.customink.com
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: nightly-report-${{ matrix.project }}-${{ matrix.shard }}
          path: playwright-report/
          retention-days: 14
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/nightly.yml
git commit -m "ci: nightly workflow runs full suite across 3 browsers in 8 shards"
```

---

## Phase 8 — Documentation

### Task 45: README

**Files:**

- Create: `customink-tests/README.md`

- [ ] **Step 1: Write README**

````markdown
# CustomInk Header & Footer Tests

E2E tests for the CustomInk staging site (`www-master.staging.customink.com`) covering the global header and footer. Playwright + TypeScript.

## Setup

```bash
npm install
npx playwright install chromium webkit
cp .env.example .env
```

## Run

```bash
# Full suite (chromium-desktop)
npm test

# P1 only (CI parity)
npm run test:p1

# Headed (debug locally)
npm run test:headed

# UI mode (interactive)
npm run test:ui

# Lint + typecheck
npm run lint
npm run typecheck
```

## Project Layout

- `pages/components/` — Page Object components (Header, Footer, CookieBanner)
- `fixtures/pages.fixture.ts` — `cookieDismissed`, `monitorPageHealth` (auto), `authenticated`
- `helpers/regex.ts` — `escapeRegex` utility
- `data/` — link / page data driving the tests
- `tests/` — Playwright spec files
- `tests/_unit/` — unit tests for helpers

## Adding a Test

1. Decide which spec file fits (one functionality = one test). If the new test is data-driven, extend the existing `data/` array.
2. Use `HeaderComponent`, `FooterComponent`, `CookieBanner` — never reach into the DOM directly.
3. Tag with `@p1` / `@p2` / `@p3` so CI can filter.
4. Use `getByRole`, `getByLabel`, `getByPlaceholder` — never `nth()` or CSS classes as primary selectors.
5. Run `npm run lint && npm run typecheck && npm test` before pushing.

## Debugging a Failing Test

```bash
# Run a single test in headed mode with trace
npx playwright test path/to/file.spec.ts --headed --debug

# Open the last HTML report
npm run test:report
```

## Open Questions

See [`docs/superpowers/specs/2026-05-01-customink-header-footer-tests-design.md`](docs/superpowers/specs/2026-05-01-customink-header-footer-tests-design.md) §15 for known unknowns and gating items (e.g. `storage/auth.json` for logged-in tests).
````

- [ ] **Step 2: Final lint + typecheck + full test run**

```bash
npm run lint
npm run typecheck
npx playwright test --project=chromium-desktop --reporter=list
```

Expected: All P1 tests pass; P2 mostly pass; #10 skipped (creds blocked); P3 visual + perf pass.

- [ ] **Step 3: Final commit**

```bash
git add README.md
git commit -m "docs: add README with setup, run, and contribution guide"
```

---

## Self-Review Checklist (before declaring done)

Manually verify each item:

- [ ] All 26 spec scenarios have corresponding tasks (#1 → Task 17, #2 → 18, ..., #24 → 42)
- [ ] All 26 tests pass on `chromium-desktop` against staging (or are explicitly skipped with reason — only #10 is allowed to skip)
- [ ] All P1 tests pass on `mobile-chrome` (`npx playwright test --grep @p1 --project=mobile-chrome`)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] Grep the codebase for banned patterns: `nth(`, `.first()` (without scope inside `<>`), `waitForTimeout`, `setTimeout(`, `force: true`, `: any`, custom-element selector — fix any findings (the search-input `waitForTimeout` is the only allowed instance, marked with eslint-disable comment)
- [ ] PR workflow `pr.yml` runs in under 2 min on a representative test PR
- [ ] For each P1 test, deliberately break the underlying functionality once locally (e.g. delete the cart link from DOM via DevTools and rerun) and confirm the test fails — documents that each test is a real bug catcher
- [ ] README has setup, run, and add-a-test sections

If any item fails, return to the relevant task and fix before declaring complete.
