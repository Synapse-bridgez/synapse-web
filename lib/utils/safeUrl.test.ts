import { describe, it, expect } from "vitest";
import { isSafeHttpUrl } from "./safeUrl";

describe("isSafeHttpUrl", () => {
  it("accepts absolute http and https URLs", () => {
    expect(isSafeHttpUrl("http://example.com")).toBe(true);
    expect(isSafeHttpUrl("https://example.com/path?q=1#hash")).toBe(true);
    expect(isSafeHttpUrl("https://localhost:3000")).toBe(true);
  });

  it("accepts uppercase schemes and surrounding whitespace", () => {
    expect(isSafeHttpUrl("HTTPS://EXAMPLE.COM")).toBe(true);
    expect(isSafeHttpUrl("  https://example.com  ")).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "ftp://example.com",
    "mailto:a@b.com",
  ])("rejects unsafe scheme %s", (value) => {
    expect(isSafeHttpUrl(value)).toBe(false);
  });

  it("rejects empty and whitespace-only strings", () => {
    expect(isSafeHttpUrl("")).toBe(false);
    expect(isSafeHttpUrl("   ")).toBe(false);
  });

  it("rejects relative and malformed URLs", () => {
    expect(isSafeHttpUrl("/relative/path")).toBe(false);
    expect(isSafeHttpUrl("example.com")).toBe(false);
    expect(isSafeHttpUrl("http://")).toBe(false);
    expect(isSafeHttpUrl("not a url")).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(isSafeHttpUrl(undefined)).toBe(false);
    expect(isSafeHttpUrl(null)).toBe(false);
    expect(isSafeHttpUrl(42)).toBe(false);
    expect(isSafeHttpUrl({})).toBe(false);
    expect(isSafeHttpUrl(["https://example.com"])).toBe(false);
  });
});
