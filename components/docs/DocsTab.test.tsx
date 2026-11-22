import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const endpoints = vi.hoisted(() => ({ list: [] as Array<Record<string, unknown>> }));

// lib/constants.ts is mocked so the test controls the ABI data.
vi.mock("@/lib/constants", () => ({
  get ABI_ENDPOINTS() {
    return endpoints.list;
  },
  AMBER: "#F5A623",
  BG2: "#111",
  BORDER: "#333",
  DIM: "#888",
  MONO: "monospace",
}));

vi.mock("./EndpointPlayground", () => ({
  EndpointPlayground: ({ endpoint }: { endpoint: { name: string } }) => (
    <div data-testid="playground">{endpoint.name}</div>
  ),
}));

import { DocsTab } from "./DocsTab";

describe("DocsTab", () => {
  beforeEach(() => {
    endpoints.list = [
      { name: "get_tx", sig: "get_tx(id: String)", access: "public", desc: "Read a transaction.", params: [] },
      { name: "set_admin", sig: "set_admin(a: Address)", access: "admin", desc: "Change admin.", params: [] },
    ];
  });

  it("renders name, signature, access and description for every endpoint", () => {
    render(<DocsTab />);
    expect(screen.getByText("get_tx")).toBeInTheDocument();
    expect(screen.getByText("set_admin(a: Address)")).toBeInTheDocument();
    expect(screen.getByText("public")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("Change admin.")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no endpoints", () => {
    endpoints.list = [];
    render(<DocsTab />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("toggles the playground for one endpoint at a time", () => {
    render(<DocsTab />);
    const [first, second] = screen.getAllByRole("button", { name: "TRY IT" });
    fireEvent.click(first);
    expect(screen.getByTestId("playground")).toHaveTextContent("get_tx");
    expect(first).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(second);
    expect(screen.getAllByTestId("playground")).toHaveLength(1);
    expect(screen.getByTestId("playground")).toHaveTextContent("set_admin");

    fireEvent.click(screen.getByRole("button", { name: "HIDE PLAYGROUND" }));
    expect(screen.queryByTestId("playground")).not.toBeInTheDocument();
  });

  it("renders endpoints with an unknown access level", () => {
    endpoints.list = [{ name: "x", sig: "x()", access: "mystery", desc: "d", params: [] }];
    render(<DocsTab />);
    expect(screen.getByText("mystery")).toBeInTheDocument();
  });
});
