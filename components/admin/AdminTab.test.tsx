import "@testing-library/jest-dom/vitest";
import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DefaultAdminTab, { AdminTab, SafeUrlLink, isSafeHttpUrl } from "./AdminTab";

afterEach(cleanup);

const UNSAFE_URLS = [
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "vbscript:msgbox(1)",
  "file:///etc/passwd",
  "ftp://example.com/file",
];

describe("isSafeHttpUrl", () => {
  it.each(["http://example.com", "https://example.com/cb?x=1", "  https://example.com  "])(
    "accepts %s",
    (url) => {
      expect(isSafeHttpUrl(url)).toBe(true);
    }
  );

  it.each(UNSAFE_URLS)("rejects %s", (url) => {
    expect(isSafeHttpUrl(url)).toBe(false);
  });

  it.each([
    ["empty string", ""],
    ["whitespace", "   "],
    ["relative path", "/callback"],
    ["garbage", "not a url"],
    ["undefined", undefined],
    ["null", null],
    ["number", 42],
    ["object", { href: "https://example.com" }],
  ])("rejects %s", (_label, value) => {
    expect(isSafeHttpUrl(value)).toBe(false);
  });
});

describe("SafeUrlLink", () => {
  it("renders an http(s) URL as an external link with safe rel attributes", () => {
    render(<SafeUrlLink url="https://hooks.example.com/cb" className="link" />);

    const link = screen.getByRole("link", { name: "https://hooks.example.com/cb" });
    expect(link).toHaveAttribute("href", "https://hooks.example.com/cb");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).t
    expect(isSafeHttpUrl(value)).toBe(false);
  });
});

describe("SafeUrlLink", () => {
  it("renders an http(s) URL as an external link with safe rel attributes", () => {
    render(<SafeUrlLink url="https://hooks.example.com/cb" className="link" />);

    const link = screen.getByRole("link", { name: "https://hooks.example.com/cb" });
    expect(link).toHaveAttribute("href", "https://hooks.example.com/cb");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow");
    expect(link).toHaveClass("link");
  });

  it.each(UNSAFE_URLS)("renders %s as inert text, never as a link", (url) => {
    const { container } = render(<SafeUrlLink url={url} className="link" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(container.querySelector("[href]")).toBeNull();
    const span = container.querySelector("span.link");
    expect(span).not.toBeNull();
    expect(span).toHaveTextContent(url);
  });

  it("renders an empty span for non-string values", () => {
    const { container } = render(<SafeUrlLink url={{ evil: true }} />);
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span).toBeEmptyDOMElement();
  });
});

describe("AdminTab", () => {
  it("exposes the same component as both named and default export", () => {
    expect(DefaultAdminTab).toBe(AdminTab);
  });

  it("renders both sections with no props", () => {
    const { container } = render(<AdminTab />);

    expect(screen.getByRole("heading", { name: "Callback URL" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Address Label" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(container.querySelector(".admin-tab__address-label-preview")).toBeEmptyDOMElement();
  });

  it("renders a safe callback URL as a clickable link", () => {
    render(<AdminTab callbackUrl="https://hooks.example.com/cb" />);

    const link = screen.getByRole("link", { name: "https://hooks.example.com/cb" });
    expect(link).toHaveAttribute("href", "https://hooks.example.com/cb");
    expect(link).toHaveClass("admin-tab__callback-url");
  });

  it("renders an unsafe callback URL as inert text", () => {
    const { container } = render(<AdminTab callbackUrl="javascript:alert(document.cookie)" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(container.querySelector("[href]")).toBeNull();
    expect(container.querySelector(".admin-tab__callback-url")).toHaveTextContent(
      "javascript:alert(document.cookie)"
    );
  });

  it("seeds the label input and preview from addressLabel", () => {
    const { container } = render(<AdminTab addressLabel="Treasury" />);

    expect(screen.getByRole("textbox")).toHaveValue("Treasury");
    expect(container.querySelector(".admin-tab__address-label-preview")).toHaveTextContent(
      "Treasury"
    );
  });

  it("updates the preview as the label is edited", async () => {
    const user = userEvent.setup();
    const { container } = render(<AdminTab addressLabel="Old" />);
    const input = screen.getByRole("textbox");

    await user.clear(input);
    await user.type(input, "Hot wallet");

    expect(input).toHaveValue("Hot wallet");
    expect(container.querySelector(".admin-tab__address-label-preview")).toHaveTextContent(
      "Hot wallet"
    );
  });

  it("renders HTML typed into the label as plain text", async () => {
    const user = userEvent.setup();
    const { container } = render(<AdminTab />);
    const payload = '<img src=x onerror="alert(1)">';

    await user.type(screen.getByRole("textbox"), payload);

    const preview = container.querySelector(".admin-tab__address-label-preview")!;
    expect(preview).toHaveTextContent(payload);
    expect(preview.querySelector("img")).toBeNull();
    expect(preview.children).toHaveLength(0);
  });
});
  });
});
