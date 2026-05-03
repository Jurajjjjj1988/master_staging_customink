import playwright from "eslint-plugin-playwright";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ...playwright.configs["flat/recommended"],
    files: [
      "tests/**/*.ts",
      "pages/**/*.ts",
      "helpers/**/*.ts",
      "fixtures/**/*.ts",
      "data/**/*.ts",
    ],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
    },
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
    // user-journeys.spec.ts hits a few playwright-plugin rules in
    // patterns that are deliberate, not smells:
    //   - .skip() with a runtime condition (auth.json missing, Design
    //     Lab required) — not stale; the test will run when staging
    //     state allows.
    //   - if (!alreadyOnCart) navigate-to-cart — defensive against the
    //     site auto-redirecting after add-to-cart on some templates.
    //   - getAttribute('href') to *derive* the expected URL before a
    //     click — computing test data, not asserting state.
    //   - one networkidle in the mega-menu test where the panel needs
    //     all its lazy chunks before the click is meaningful.
    files: [
      "tests/user-journeys.spec.ts",
      "tests/auth.setup.ts",
      "tests/footer-links.spec.ts",
    ],
    rules: {
      "playwright/no-skipped-test": "off",
      "playwright/no-conditional-in-test": "off",
      "playwright/no-conditional-expect": "off",
      "playwright/prefer-web-first-assertions": "off",
      "playwright/no-networkidle": "off",
    },
  },
  {
    ignores: ["node_modules/**", "playwright-report/**", "test-results/**"],
  },
];
