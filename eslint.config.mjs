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
    // These files use playwright-plugin rules in deliberate ways:
    //   - .skip(condition, reason) — runtime gate (env / auth.json absent /
    //     Design Lab routing) per README §6 convention.
    //   - if (!alreadyOnCart) — fallback when /cart redirects unpredictably.
    //   - getAttribute('href') to derive expected URL before a click —
    //     computing test data, not asserting state.
    //   - one networkidle in cart qty recalc — site uses long-poll for
    //     totals; no DOM signal to await.
    //   - .skip(true, reason) in V2 route loop — explicit no-op when staging
    //     route doesn't resolve, with a concrete reason string.
    files: [
      "tests/auth.setup.ts",
      "tests/journeys/cart.spec.ts",
      "tests/journeys/navigation.spec.ts",
      "tests/journeys/logged-in.spec.ts",
      "tests/journeys/search.spec.ts",
      "tests/journeys/support.spec.ts",
      "tests/header/variant-1-homepage.spec.ts",
      "tests/header/variant-2-cart.spec.ts",
      "tests/header/variant-4-accounts.spec.ts",
    ],
    rules: {
      "playwright/no-skipped-test": "off",
      "playwright/no-conditional-in-test": "off",
      "playwright/no-conditional-expect": "off",
      "playwright/prefer-web-first-assertions": "off",
      "playwright/no-networkidle": "off",
      "playwright/expect-expect": "off",
    },
  },
  {
    ignores: ["node_modules/**", "playwright-report/**", "test-results/**"],
  },
];
