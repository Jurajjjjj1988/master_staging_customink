import { test, expect } from "@playwright/test";
import { escapeRegex } from "../../helpers/regex";

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
