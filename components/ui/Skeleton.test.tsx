import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("renders a single hidden placeholder by default", () => {
    const { container } = render(<Skeleton />);
    const spans = container.querySelectorAll("span");
    expect(spans).toHaveLength(1);
    expect(spans[0]).toHaveAttribute("aria-hidden", "true");
  });

  it("renders `count` placeholders when given one greater than 1", () => {
    const { container } = render(<Skeleton count={3} />);
    expect(container.querySelectorAll("span")).toHaveLength(3);
  });

  it("falls back to a single placeholder when count is 0 or negative", () => {
    const { container } = render(<Skeleton count={0} />);
    expect(container.querySelectorAll("span")).toHaveLength(1);
  });

  it.each([
    ["block", { height: "16px", borderRadius: "4px" }],
    ["text", { height: "10px", borderRadius: "3px" }],
    ["row", { height: "14px", borderRadius: "3px" }],
  ] as const)("applies the %s variant's base height and radius", (variant, style) => {
    const { container } = render(<Skeleton variant={variant} />);
    expect(container.querySelector("span")).toHaveStyle(style);
  });

  it("defaults to full width and overrides it with an explicit width", () => {
    const { container, rerender } = render(<Skeleton />);
    expect(container.querySelector("span")).toHaveStyle({ width: "100%" });

    rerender(<Skeleton width={120} />);
    expect(container.querySelector("span")).toHaveStyle({ width: "120px" });
  });

  it("lets an explicit height and radius override the variant's defaults", () => {
    const { container } = render(<Skeleton variant="text" height={40} radius={8} />);
    expect(container.querySelector("span")).toHaveStyle({
      height: "40px",
      borderRadius: "8px",
    });
  });

  it("merges a custom style on top of everything else", () => {
    const { container } = render(<Skeleton style={{ marginTop: 6 }} />);
    expect(container.querySelector("span")).toHaveStyle({ marginTop: "6px" });
  });
});
