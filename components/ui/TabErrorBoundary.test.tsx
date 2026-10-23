import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TabErrorBoundary } from "./TabErrorBoundary";
import { reportError } from "@/lib/telemetry";

vi.mock("@/lib/telemetry", () => ({
  reportError: vi.fn(),
}));

function Boom(): React.ReactNode {
  throw new Error("boom");
}

describe("TabErrorBoundary", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // React logs the caught error to console; keep test output clean.
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders its children when nothing has thrown", () => {
    render(
      <TabErrorBoundary>
        <div>tab content</div>
      </TabErrorBoundary>,
    );
    expect(screen.getByText("tab content")).toBeInTheDocument();
  });

  it("renders the fallback UI when a child throws", () => {
    render(
      <TabErrorBoundary>
        <Boom />
      </TabErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("reports the error with tab, wallet and contract context", () => {
    render(
      <TabErrorBoundary
        tabName="analytics"
        walletConnected={true}
        walletAddress="GABC123"
        contractId="CCONTRACT123"
      >
        <Boom />
      </TabErrorBoundary>,
    );

    expect(reportError).toHaveBeenCalledTimes(1);
    const [error, context] = (reportError as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(context).toMatchObject({
      tabName: "analytics",
      walletConnected: true,
      walletAddress: "GABC123",
      contractId: "CCONTRACT123",
    });
    expect(context.componentStack).toBeDefined();
  });

  it("reports undefined context fields when none are passed", () => {
    render(
      <TabErrorBoundary>
        <Boom />
      </TabErrorBoundary>,
    );

    expect(reportError).toHaveBeenCalledTimes(1);
    const [, context] = (reportError as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(context).toMatchObject({
      tabName: undefined,
      walletConnected: undefined,
      walletAddress: undefined,
      contractId: undefined,
    });
  });

  it("clears the error state when 'Try again' is clicked", () => {
    let shouldThrow = true;
    function MaybeBoom(): React.ReactNode {
      if (shouldThrow) throw new Error("boom");
      return <div>recovered</div>;
    }

    const { rerender } = render(
      <TabErrorBoundary>
        <MaybeBoom />
      </TabErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    rerender(
      <TabErrorBoundary>
        <MaybeBoom />
      </TabErrorBoundary>,
    );

    expect(screen.getByText("recovered")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });
});
