import { test, expect, type Page } from "../fixtures/pages.fixture";
import { HeaderComponent } from "../pages/components/HeaderComponent";

/**
 * Tests #11a #11b — secondary header actions.
 *  - #11a navigation actions: cart, favorites, sign-in (data-driven)
 *  - #11b LiveChat trigger: opens a third-party iframe; we verify only the
 *        toggle works, never interact with the widget body (out of scope).
 */

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
    // Staging uses `/cart/` while the older route `/checkout/summary` may also appear;
    // accept either to avoid coupling to a single deployment's routing.
    expectedPathFragment: /\/(cart|checkout\/summary)/,
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
      const href = await link.first().getAttribute("href");
      expect(href).toBeTruthy();
      expect(href!).toMatch(action.expectedPathFragment);
    });
  }
});

test.describe("@p2 secondary-actions — chat widget trigger", () => {
  test("should_open_chat_widget_iframe_when_chat_now_clicked", async ({
    page,
  }) => {
    await page.goto("/");
    const chatTrigger = page.getByRole("button", { name: /^chat now$/i });
    await expect(chatTrigger).toBeVisible();
    await chatTrigger.click();

    // We only verify the LiveChat iframe is present and reachable. Anything
    // inside the iframe is third-party UI — out of our test surface.
    const livechatFrame = page.frameLocator(
      'iframe[title*="LiveChat" i], iframe[title*="chat widget" i]',
    );
    await expect(livechatFrame.locator("body")).toBeAttached({
      timeout: 10_000,
    });
  });
});
