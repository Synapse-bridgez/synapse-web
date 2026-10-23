import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TxTimeline } from "./TxTimeline";

describe("TxTimeline", () => {
  it("renders the empty state when there are no events", () => {
    render(<TxTimeline events={[]} />);
    expect(screen.getByText("No lifecycle events recorded.")).toBeInTheDocument();
  });

  it("drops events without a usable status", () => {
    render(
      <TxTimeline
        events={[
          { status: undefined as any, timestamp: 1000 },
          { status: "PENDING", timestamp: 2000 },
        ]}
      />
    );
    expect(screen.getByText("PENDING")).toBeInTheDocument();
    expect(screen.queryByText("undefined")).not.toBeInTheDocument();
  });

  it("sorts events ascending by timestamp regardless of input order", () => {
    render(
      <TxTimeline
        events={[
          { status: "COMPLETED", timestamp: 3000 },
          { status: "PENDING", timestamp: 1000 },
          { status: "PROCESSING", timestamp: 2000 },
        ]}
      />
    );

    const labels = screen.getAllByText(/PENDING|PROCESSING|COMPLETED/);
    expect(labels.map((el) => el.textContent)).toEqual(["PENDING", "PROCESSING", "COMPLETED"]);
  });

  it("marks the first event as 'start'", () => {
    render(<TxTimeline events={[{ status: "PENDING", timestamp: 1000 }]} />);
    expect(screen.getByText("start")).toBeInTheDocument();
  });

  it("pushes events with missing/invalid timestamps to the end without crashing", () => {
    render(
      <TxTimeline
        events={[
          { status: "FAILED", timestamp: "not-a-date" },
          { status: "PENDING", timestamp: 1000 },
        ]}
      />
    );

    const labels = screen.getAllByText(/PENDING|FAILED/);
    expect(labels.map((el) => el.textContent)).toEqual(["PENDING", "FAILED"]);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders a dashed open-ended segment for the last event when inProgress is true", () => {
    const { container } = render(
      <TxTimeline
        events={[
          { status: "PENDING", timestamp: 1000 },
          { status: "PROCESSING", timestamp: 2000 },
        ]}
        inProgress
      />
    );

    expect(screen.getByText(/in progress/)).toBeInTheDocument();
    expect(container.innerHTML).toContain("repeating-linear-gradient");
  });

  it("does not mark the last event as in progress when inProgress is false", () => {
    render(
      <TxTimeline
        events={[
          { status: "PENDING", timestamp: 1000 },
          { status: "PROCESSING", timestamp: 2000 },
        ]}
        inProgress={false}
      />
    );

    expect(screen.queryByText(/in progress/)).not.toBeInTheDocument();
  });

  it("shows the elapsed duration from the previous stage for non-first events", () => {
    render(
      <TxTimeline
        events={[
          { status: "PENDING", timestamp: 0 },
          { status: "COMPLETED", timestamp: 60_000 },
        ]}
      />
    );

    expect(screen.getByText(/in previous stage/)).toBeInTheDocument();
  });
});
