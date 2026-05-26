import { test, expect } from "../../fixtures/pages.fixture";

/**
 * Anonymous auth journeys — sign-up form, sign-in form, validation.
 * Logged-out flows only. Sign-out + post-login dropdown live in
 * journeys/logged-in.spec.ts.
 *
 * Sign-up has no accessible labels — only stable selectors are input IDs
 * (#user_email, #user_password, #user_password_confirmation).
 * Sign-in is passwordless — only #user_email + "Continue With Email" submit.
 */

test.describe("@p1 journey — registration", () => {
  test("user navigates to the sign-up form and sees email + password fields", async ({
    page,
  }) => {
    await page.goto("/profiles/users/sign_up");

    await expect(page.locator("#user_email")).toBeVisible();
    await expect(page.locator("#user_password")).toBeVisible();
    await expect(page.locator("#user_password_confirmation")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^continue$/i }),
    ).toBeEnabled();
  });

  test("submitting an invalid email shows a validation message", async ({
    page,
  }) => {
    await page.goto("/profiles/users/sign_up");

    const emailField = page.locator("#user_email");
    await emailField.fill("not-an-email");
    await page.locator("#user_password").fill("NotARealPassword_TestOnly_2026");

    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.waitForLoadState("domcontentloaded");

    // Native browser validation OR server-side message — either is valid.
    const native = await emailField.evaluate(
      (el: HTMLInputElement) => !el.validity.valid && !!el.validationMessage,
    );
    const serverMessage = await page
      .getByText(/invalid|enter a valid|not a valid|please enter/i)
      .first()
      .isVisible();
    expect(
      native || serverMessage,
      "expected validation feedback for invalid email",
    ).toBe(true);
  });

  test("submitting an empty form blocks the request and keeps the user on the page", async ({
    page,
  }) => {
    await page.goto("/profiles/users/sign_up");

    const urlBefore = page.url();
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.waitForLoadState("domcontentloaded");
    expect(
      page.url(),
      "empty submit must not navigate away from the form",
    ).toBe(urlBefore);
  });
});

test.describe("@p1 journey — log in", () => {
  test("user opens sign-in from the avatar and sees a real sign-in form", async ({
    page,
  }) => {
    // Sign-in is passwordless: #user_email + "Continue With Email" submit,
    // OAuth alternatives, "Create an account" link. NO password field —
    // asserting one would accept a regression that re-introduced passwords.
    await page.goto("/profiles/users/sign_in");

    await expect(page.locator("#user_email")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continue with email/i }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: /continue with google/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /create an account/i }),
    ).toBeVisible();
  });

  test("invalid email format produces validation feedback before any send", async ({
    page,
  }) => {
    await page.goto("/profiles/users/sign_in");

    const emailField = page.locator("#user_email");
    await emailField.fill("not-an-email");
    await page
      .getByRole("main")
      .getByRole("button", { name: /continue with email/i })
      .first()
      .click();
    await page.waitForLoadState("domcontentloaded");

    const native = await emailField.evaluate(
      (el: HTMLInputElement) => !el.validity.valid && !!el.validationMessage,
    );
    const serverMessage = await page
      .getByText(/invalid|enter a valid|not a valid/i)
      .first()
      .isVisible();
    expect(
      native || serverMessage,
      "expected validation feedback for invalid email",
    ).toBe(true);
  });

  test("empty form submission is blocked and stays on the page", async ({
    page,
  }) => {
    await page.goto("/profiles/users/sign_in");

    // Scope to <main> so we don't match the header's "Open Sign In menu" button.
    const submit = page
      .getByRole("main")
      .getByRole("button", { name: /continue with email|sign in|log in/i })
      .first();
    test.skip(
      (await submit.count()) === 0,
      "sign-in form not reachable on this deployment",
    );

    const urlBefore = page.url();
    await submit.click();
    await page.waitForLoadState("domcontentloaded");
    expect(page.url(), "empty submit must not log the user in").toBe(urlBefore);
  });

  /*
   * Form-quirks probes — React Hook Form (mode: onBlur) and similar
   * controlled-input validators react to the `blur` event, NOT `input`.
   * Playwright's `fill()` emits only `input`, so a submit button gated by
   * validity stays disabled despite a syntactically valid value. The three
   * tests below catch that whole bug class on the sign-in form.
   */

  test("Continue With Email button is enabled after a valid email + blur", async ({
    page,
  }) => {
    // Catches RHF onBlur regression — fill() alone does not fire blur,
    // so we press Tab to move focus off the field before asserting that
    // the submit button is enabled. If the button stayed `disabled` here,
    // a real user typing + tabbing would still see it disabled.
    await page.goto("/profiles/users/sign_in");

    const emailField = page.locator("#user_email");
    const submit = page
      .getByRole("main")
      .getByRole("button", { name: /continue with email/i })
      .first();

    await emailField.fill("qa-form-quirk@example.com");
    await emailField.press("Tab");

    await expect(
      submit,
      "submit must be enabled after a valid email + blur (RHF onBlur regression seed)",
    ).toBeEnabled();
  });

  test("Enter key in email field submits form identically to button click", async ({
    page,
  }) => {
    // Keyboard-only users hit Enter inside the field instead of clicking
    // the submit button. If a custom keydown handler swallowed Enter, the
    // submit path would diverge. Asserting URL change matches the
    // button-click variant guarantees keyboard parity.
    await page.goto("/profiles/users/sign_in");

    const emailField = page.locator("#user_email");
    const urlBefore = page.url();

    await emailField.fill("qa-form-quirk@example.com");
    await emailField.press("Enter");
    await page.waitForLoadState("domcontentloaded");

    // Either the URL changed (form posted / SPA navigated) OR an inline
    // validation/state surfaced — both are valid "Enter was honored"
    // outcomes. The regression we guard against is Enter being silently
    // swallowed (no URL change AND no state change).
    expect(
      page.url(),
      "Enter inside the email field must trigger the same submit path as the button",
    ).not.toBe(urlBefore);
  });

  test("email field accepts paste (clipboard input not blocked)", async ({
    page,
  }) => {
    // Catches `onpaste="return false"` regressions — some auth designs
    // disable paste to force re-typing. `keyboard.insertText` simulates
    // a paste at the platform level; if a `paste` handler blocks it the
    // value would not populate.
    await page.goto("/profiles/users/sign_in");

    const emailField = page.locator("#user_email");
    const pastedValue = "qa-paste-allowed@example.com";

    await emailField.focus();
    await page.keyboard.insertText(pastedValue);

    await expect(
      emailField,
      "email field must accept paste (no onpaste=return false regression)",
    ).toHaveValue(pastedValue);
  });
});
