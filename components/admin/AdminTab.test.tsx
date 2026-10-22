import "@testing-library/jest-dom/vitest";
import { afterEach, describe, it, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import { isSafeHttpUrl } from "./AdminTab";

afterEach(cleanup);

describe("isSafeHttpUrl", () => {
  it.each(["http://example.com", "https://example.com/path?q=1", "  https://example.com  "])(
    "accepts %s",
    (value) => {
      expect(isSafeHttpUrl(value)).toBe(true);
    }
  );

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "ftp://example.com",
    "not a url",
    "",
    "   ",
  ])("rejects %j", (value) => {
    expect(isSafeHttpUrl(value)).toBe(false);
  });

  it.each([undefined, null, 42, {}, []])("rejects non-string %j", (value) => {
    expect(isSafeHttpUrl(value)).toBe(false);
  });
});
