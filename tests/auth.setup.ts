import { existsSync } from "node:fs";
import { test as setup, expect } from "@playwright/test";

/**
 * One-shot setup that verifies a saved `storage/auth.json` is still usable
 * before the logged-in journey tests run. The file itself is produced
 * manually with `playwright codegen --save-storage=storage/auth.json`.
 *
 * If the file is absent the setup skips silently — the logged-in describe
 * block in `tests/user-journeys.spec.ts` already handles its own skip-with-
 * reason for this case, so we don't fail the run; we just don't verify.
 */

const AUTH_STATE_PATH = "storage/auth.json";

setup("verify saved auth state is usable", async ({ page }) => {
  setup.skip(
    !existsSync(AUTH_STATE_PATH),
    `Skipping auth verification: ${AUTH_STATE_PATH} not present (run \`npx playwright codegen --save-storage=${AUTH_STATE_PATH} <staging-url>\` once staging is healthy).`,
  );

  await page.goto("/", { timeout: 60_000 });

  // The logged-in header hides the "Sign In" link. If saved state expired
  // the link would be visible — that's the failure mode this catches.
  // (Avatar/My Account button accessible name varies by Web Component
  // hydration; absence of Sign In is the more reliable invariant.)
  await expect(
    page.getByRole("link", { name: /^sign in$/i }).first(),
    "saved auth state should hide the Sign In link",
  ).toBeHidden({ timeout: 15_000 });
});
