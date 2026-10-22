import { describe, it, expect, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BulkActionBar, type BulkActionItem } from "./BulkActionBar";

type RunResult = { ok: boolean; skipped?: boolean; message?: string };

/** A promise whose resolution the test controls, to observe in-flight states. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function rowFor(label: string) {
  return screen.getByText(label).closest("li") as HTMLElement;
}

describe("BulkActionBar", () => {
  it("renders the idle state with the action label and selection count", () => {
    render(
      <BulkActionBar actionLabel="Fail transaction" selectedIds={["a", "b"]} onRunItem={vi.fn()} />
    );

    expect(screen.getByText("Bulk action: Fail transaction")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run on 2 selected" })).toBeEnabled();
    expect(screen.getByText(/Each item requires its own wallet signature/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("disables the run button when nothing is selected", () => {
    render(<BulkActionBar actionLabel="Retry" selectedIds={[]} onRunItem={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Run on 0 selected" })).toBeDisabled();
  });

  it("disables the run button when the disabled prop is set", () => {
    render(<BulkActionBar actionLabel="Retry" selectedIds={["a"]} onRunItem={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: "Run on 1 selected" })).toBeDisabled();
  });

  it("runs items sequentially and reports success, failure, skip and thrown errors", async () => {
    const user = userEvent.setup();
    const results: Record<string, RunResult | Error> = {
      a: { ok: true, message: "Signed" },
      b: { ok: false },
      c: { ok: false, skipped: true },
      d: new Error("Wallet rejected"),
    };
    const order: string[] = [];
    const onRunItem = vi.fn(async (id: string) => {
      order.push(id);
      const r = results[id];
      if (r instanceof Error) throw r;
      return r;
    });
    const onComplete = vi.fn();

    render(
      <BulkActionBar
        actionLabel="Fail transaction"
        selectedIds={["a", "b", "c", "d"]}
        getLabel={(id) => `Tx ${id.toUpperCase()}`}
        onRunItem={onRunItem}
        onComplete={onComplete}
      />
    );

    await user.click(screen.getByRole("button", { name: "Run on 4 selected" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));

    expect(order).toEqual(["a", "b", "c", "d"]);

    expect(within(rowFor("Tx A")).getByText("Success")).toBeInTheDocument();
    expect(within(rowFor("Tx A")).getByText("Signed")).toBeInTheDocument();
    expect(within(rowFor("Tx B")).getByText("Failed")).toBeInTheDocument();
    expect(within(rowFor("Tx B")).getByText("Action failed.")).toBeInTheDocument();
    expect(within(rowFor("Tx C")).getByText("Skipped")).toBeInTheDocument();
    expect(within(rowFor("Tx C")).getByText("No longer eligible — skipped.")).toBeInTheDocument();
    expect(within(rowFor("Tx D")).getByText("Failed")).toBeInTheDocument();
    expect(within(rowFor("Tx D")).getByText("Wallet rejected")).toBeInTheDocument();

    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "100");

    const finalItems = onComplete.mock.calls[0][0] as BulkActionItem[];
    expect(finalItems.map((i) => i.status)).toEqual(["success", "failed", "skipped", "failed"]);
    expect(screen.queryByText(/Batch cancelled/)).not.toBeInTheDocument();
  });

  it("falls back to the id when no label resolver is given", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(
      <BulkActionBar
        actionLabel="Retry"
        selectedIds={["tx-123"]}
        onRunItem={async () => ({ ok: true })}
        onComplete={onComplete}
      />
    );

    await user.click(screen.getByRole("button", { name: "Run on 1 selected" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(screen.getByText("tx-123")).toBeInTheDocument();
  });

  it("shows the signing state and a Cancel button while an item is in flight", async () => {
    const user = userEvent.setup();
    const pending = deferred<RunResult>();
    const onComplete = vi.fn();

    render(
      <BulkActionBar
        actionLabel="Retry"
        selectedIds={["a", "b"]}
        onRunItem={() => pending.promise}
        onComplete={onComplete}
      />
    );

    await user.click(screen.getByRole("button", { name: "Run on 2 selected" }));

    expect(await screen.findByText("Signing…")).toBeInTheDocument();
    expect(within(rowFor("a")).getByText("Signing…")).toBeInTheDocument();
    expect(within(rowFor("b")).getByText("Pending")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Run on/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();

    pending.resolve({ ok: true });
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });

  it("stops between items on cancel, leaving the rest pending and resumable", async () => {
    const user = userEvent.setup();
    const first = deferred<RunResult>();
    const onRunItem = vi.fn((id: string) =>
      id === "a" ? first.promise : Promise.resolve({ ok: true })
    );
    const onComplete = vi.fn();

    render(
      <BulkActionBar
        actionLabel="Retry"
        selectedIds={["a", "b", "c"]}
        onRunItem={onRunItem}
        onComplete={onComplete}
      />
    );

    await user.click(screen.getByRole("button", { name: "Run on 3 selected" }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    // The in-flight signature finishes cleanly; nothing after it starts.
    first.resolve({ ok: true });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));

    expect(onRunItem).toHaveBeenCalledTimes(1);
    expect(within(rowFor("a")).getByText("Success")).toBeInTheDocument();
    expect(within(rowFor("b")).getByText("Pending")).toBeInTheDocument();
    expect(within(rowFor("c")).getByText("Pending")).toBeInTheDocument();
    expect(
      screen.getByText(/Batch cancelled — 1 of 3 processed\. You can re-run to resume/)
    ).toBeInTheDocument();

    // Re-running after a cancel processes the full batch again.
    await user.click(screen.getByRole("button", { name: "Run on 3 selected" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(2));
    expect(onRunItem).toHaveBeenCalledTimes(4);
    const rerun = onComplete.mock.calls[1][0] as BulkActionItem[];
    expect(rerun.map((i) => i.status)).toEqual(["success", "success", "success"]);
    expect(screen.queryByText(/Batch cancelled/)).not.toBeInTheDocument();
  });

  it("clears the progress list back to the idle state", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(
      <BulkActionBar
        actionLabel="Retry"
        selectedIds={["a"]}
        onRunItem={async () => ({ ok: true })}
        onComplete={onComplete}
      />
    );

    await user.click(screen.getByRole("button", { name: "Run on 1 selected" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(screen.getByRole("list")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
    expect(screen.getByText(/Each item requires its own wallet signature/)).toBeInTheDocument();
  });
});
