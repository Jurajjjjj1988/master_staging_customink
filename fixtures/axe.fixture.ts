import AxeBuilder from "@axe-core/playwright";
import { test as base } from "./pages.fixture";

type AxeFixture = {
  /**
   * Pre-configured AxeBuilder. Tests call `.include(selector)` then `.analyze()`.
   * The shared config sets WCAG 2.1 AA tags and enables only stable rule sets so
   * tests don't drift apart in coverage. To extend coverage globally (e.g. add
   * `wcag22aa` once axe-core supports it), update this fixture once.
   */
  makeAxeBuilder: () => AxeBuilder;
};

export const test = base.extend<AxeFixture>({
  makeAxeBuilder: async ({ page }, use) => {
    const builder = (): AxeBuilder =>
      new AxeBuilder({ page }).withTags([
        "wcag2a",
        "wcag2aa",
        "wcag21a",
        "wcag21aa",
      ]);
    await use(builder);
  },
});

export { expect } from "./pages.fixture";
