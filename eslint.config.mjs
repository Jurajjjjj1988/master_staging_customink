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
