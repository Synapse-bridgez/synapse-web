import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SorobanTip } from "./SorobanTip";

describe("SorobanTip", () => {
  it("renders the SOROBAN label", () => {
    render(<SorobanTip>Some tip text</SorobanTip>);
    expect(screen.getByText("⬡ SOROBAN:")).toBeInTheDocument();
  });

  it("renders its children as the tip body", () => {
    render(<SorobanTip>Allowances expire and must be refreshed.</SorobanTip>);
    expect(screen.getByText("Allowances expire and must be refreshed.")).toBeInTheDocument();
  });

  it("renders rich children, not just plain text", () => {
    render(
      <SorobanTip>
        <strong>Note:</strong> refresh the allowance.
      </SorobanTip>,
    );
    expect(screen.getByText("Note:")).toBeInTheDocument();
    expect(screen.getByText(/refresh the allowance\./)).toBeInTheDocument();
  });
});
