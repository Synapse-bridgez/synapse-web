import { describe, it, expect } from "vitest";
import { isSafeHttpUrl, toSafeHttpUrl, toSafeUrlLabel } from "./safeUrl";

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

describe("toSafeHttpUrl", () => {
  it("returns the URL for safe http and https values", () => {
    expect(toSafeHttpUrl("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    expect(toSafeHttpUrl("http://example.com")).toBe("http://example.com");
  });

  it("returns the trimmed value", () => {
    expect(toSafeHttpUrl("  https://example.com  ")).toBe("https://example.com");
  });

  it("returns undefined for unsafe schemes", () => {
    expect(toSafeHttpUrl("javascript:alert(1)")).toBeUndefined();
    expect(toSafeHttpUrl("data:text/html,hi")).toBeUndefined();
    expect(toSafeHttpUrl("file:///etc/passwd")).toBeUndefined();
  });

  it("returns undefined for empty, relative, and malformed values", () => {
    expect(toSafeHttpUrl("")).toBeUndefined();
    expect(toSafeHttpUrl("   ")).toBeUndefined();
    expect(toSafeHttpUrl("/relative")).toBeUndefined();
    expect(toSafeHttpUrl("not a url")).toBeUndefined();
  });

  it("returns undefined for non-string input", () => {
    expect(toSafeHttpUrl(undefined)).toBeUndefined();
    expect(toSafeHttpUrl(null)).toBeUndefined();
    expect(toSafeHttpUrl(123)).toBeUndefined();
    expect(toSafeHttpUrl({})).toBeUndefined();
  });
});

describe("toSafeUrlLabel", () => {
  it("returns the trimmed string for safe URLs", () => {
    expect(toSafeUrlLabel("https://example.com")).toBe("https://example.com");
    expect(toSafeUrlLabel("  https://example.com  ")).toBe("https://example.com");
  });

  it("returns unsafe values as-is (trimmed) so they remain visible as text", () => {
    expect(toSafeUrlLabel("javascript:alert(1)")).toBe("javascript:alert(1)");
    expect(toSafeUrlLabel("  data:text/html,hi ")).toBe("data:text/html,hi");
  });

  it("returns an empty string for empty or whitespace-only input", () => {
    expect(toSafeUrlLabel("")).toBe("");
    expect(toSafeUrlLabel("   ")).toBe("");
  });

  it("returns an empty string for non-string input", () => {
    expect(toSafeUrlLabel(undefined)).toBe("");
    expect(toSafeUrlLabel(null)).toBe("");
    expect(toSafeUrlLabel(42)).toBe("");
    expect(toSafeUrlLabel({})).toBe("");
  });
});
