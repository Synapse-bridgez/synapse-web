import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";
import { STATUS_META } from "@/lib/constants";
import type { TxStatus } from "@/lib/types";

describe("Badge", () => {
  it.each(Object.keys(STATUS_META) as TxStatus[])("renders the label for %s", (status) => {
    render(<Badge status={status} />);
    expect(screen.getByText(STATUS_META[status].label)).toBeInTheDocument();
  });

  it("colors the badge using the status's color token", () => {
    render(<Badge status="FAILED" />);
    const badge = screen.getByText(STATUS_META.FAILED.label);
    expect(badge).toHaveStyle({ color: STATUS_META.FAILED.color });
  });
});
