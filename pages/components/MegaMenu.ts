import type { Page, Locator } from "@playwright/test";

/**
 * Mega-menu (F1-F5) + dropdown (D1, D2) interaction layer. Doc §X.4.
 *
 * Stateless wrapper over the active header host. Hover-opens trigger by
 * accessible-name role match; panel is located by ARIA `aria-controls`
 * relationship from the trigger (no CSS class fallback — class names are
 * volatile build artefacts).
 */
export class MegaMenu {
  constructor(private readonly page: Page) {}

  /**
   * Open the trigger matching the human-readable category name.
   *
   * Uses keyboard activation (focus + Enter) — hover is inert on the current
   * condensed-desktop build because the caret button has `pointer-events:none`
   * and is overlaid by a sibling `<a>`. See HeaderComponent.openMegaMenu for
   * the full probe log. Keyboard activation is the deterministic open path
   * and exercises WCAG 2.1.1 at the same time.
   */
  async open(triggerName: string): Promise<void> {
    const trigger = this.page.getByRole("button", {
      name: new RegExp(`Open ${this.escape(triggerName)} menu`, "i"),
    });
    await trigger.first().focus();
    await this.page.keyboard.press("Enter");
  }

  /**
   * Panel locator derived from the trigger's `aria-controls` reference.
   * Requires {@link open} to have been called for the same trigger first.
   */
  async panel(triggerName: string): Promise<Locator> {
    const trigger = this.page.getByRole("button", {
      name: new RegExp(`Open ${this.escape(triggerName)} menu`, "i"),
    });
    const controls = await trigger.first().getAttribute("aria-controls");
    if (!controls) {
      throw new Error(
        `Trigger "${triggerName}" has no aria-controls — panel not addressable.`,
      );
    }
    return this.page.locator(`#${controls}`);
  }

  /** Escape regex metacharacters in a category name for safe RegExp interpolation. */
  private escape(s: string): string {
    return s.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  }
}
