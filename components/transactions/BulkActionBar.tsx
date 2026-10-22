"use client";
import { useCallback, useRef, useState } from "react";

export type BulkItemStatus = "pending" | "signing" | "success" | "failed" | "skipped";

export interface BulkActionItem {
  id: string;
  label: string;
  status: BulkItemStatus;
  message?: string;
}

export interface BulkActionBarProps {
  /** Human readable name of the lifecycle action, e.g. "Fail transaction". */
  actionLabel: string;
  /** Selected transaction ids, in the order they should be processed. */
  selectedIds: string[];
  /** Optional label resolver for rendering each item in the progress list. */
  getLabel?: (id: string) => string;
  /**
   * Sequentially sign-and-submit the lifecycle action for a single item.
   * Must throw (or return { ok: false }) when the item is ineligible so the
   * bar can mark it as skipped instead of failed.
   */
  onRunItem: (id: string) => Promise<{ ok: boolean; skipped?: boolean; message?: string }>;
  /** Called once the batch finishes (fully or partially). */
  onComplete?: (items: BulkActionItem[]) => void;
  /** Clears the current selection after a batch completes. */
  onClearSelection?: () => void;
  disabled?: boolean;
}

const STATUS_LABEL: Record<BulkItemStatus, string> = {
  pending: "Pending",
  signing: "Signing…",
  success: "Success",
  failed: "Failed",
  skipped: "Skipped",
};

/**
 * BulkActionBar orchestrates a sequential sign-and-submit loop across a set of
 * selected transactions. Each item still requires its own wallet signature —
 * there is no signature batching shortcut. Per-item status is tracked and
 * rendered as a progress list, and the batch can be cancelled mid-run leaving a
 * resumable partial-completion state.
 */
export function BulkActionBar({
  actionLabel,
  selectedIds,
  getLabel,
  onRunItem,
  onComplete,
  onClearSelection,
  disabled = false,
}: BulkActionBarProps) {
  const [items, setItems] = useState<BulkActionItem[]>([]);
  const [running, setRunning] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  // Read by the async loop so it can observe cancellation between items.
  const cancelledRef = useRef(false);

  const reset = useCallback(() => {
    setItems([]);
    setCancelled(false);
    cancelledRef.current = false;
  }, []);

  const start = useCallback(async () => {
    if (running || selectedIds.length === 0) return;

    setRunning(true);
    setCancelled(false);
    cancelledRef.current = false;

    const initial: BulkActionItem[] = selectedIds.map((id) => ({
      id,
      label: getLabel ? getLabel(id) : id,
      status: "pending",
    }));
    setItems(initial);

    let working = initial;
    let wasCancelled = false;

    for (let i = 0; i < working.length; i += 1) {
      // Cancellation is checked between items so the in-flight signature can
      // finish cleanly and the remaining items stay pending (resumable).
      if (wasCancelled) break;

      working = working.map((item, idx) =>
        idx === i ? { ...item, status: "signing", message: undefined } : item
      );
      setItems(working);

      try {
        const result = await onRunItem(working[i].id);
        working = working.map((item, idx) => {
          if (idx !== i) return item;
          if (result.skipped) {
            return {
              ...item,
              status: "skipped",
              message: result.message ?? "No longer eligible — skipped.",
            };
          }
          if (result.ok) {
            return { ...item, status: "success", message: result.message };
          }
          return {
            ...item,
            status: "failed",
            message: result.message ?? "Action failed.",
          };
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unexpected error while signing.";
        working = working.map((item, idx) =>
          idx === i ? { ...item, status: "failed", message } : item
        );
      }

      setItems(working);

      // Allow the user to cancel between items.
      if (cancelledRef.current) {
        wasCancelled = true;
      }
    }

    setRunning(false);
    setCancelled(wasCancelled);
    onComplete?.(working);
  }, [getLabel, onComplete, onRunItem, running, selectedIds]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setCancelled(true);
  }, []);

  const completed = items.filter(
    (item) => item.status === "success" || item.status === "failed" || item.status === "skipped"
  ).length;
  const progress = items.length === 0 ? 0 : Math.round((completed / items.length) * 100);
  const hasPartial = cancelled && completed < items.length;

  return (
    <section className="rounded-md border border-dashed" aria-label={`Bulk action: ${actionLabel}`}>
      <header className="flex flex-row items-center justify-between gap-4 p-4">
        <h3 className="text-sm font-medium">Bulk action: {actionLabel}</h3>
        <div className="flex items-center gap-2">
          {running ? (
            <button type="button" onClick={cancel}>
              Cancel
            </button>
          ) : (
            <button type="button" onClick={start} disabled={disabled || selectedIds.length === 0}>
              Run on {selectedIds.length} selected
            </button>
          )}
          {!running && items.length > 0 && (
            <button type="button" onClick={reset}>
              Clear
            </button>
          )}
        </div>
      </header>
      <div className="space-y-3 px-4 pb-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Select one or more pending transactions to run this action. Each item requires its own
            wallet signature.
          </p>
        ) : (
          <>
            <progress
              className="w-full"
              max={100}
              value={progress}
              aria-label={`${completed} of ${items.length} processed`}
            />
            {hasPartial && (
              <p className="text-sm text-amber-600">
                Batch cancelled — {completed} of {items.length} processed. You can re-run to resume
                the remaining items.
              </p>
            )}
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  data-status={item.status}
                  className="flex items-start justify-between gap-3 rounded-md border p-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.label}</p>
                    {item.message && (
                      <p
                        className={
                          item.status === "failed"
                            ? "text-xs text-destructive"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        {item.message}
                      </p>
                    )}
                  </div>
                  <span className="text-xs">{STATUS_LABEL[item.status]}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

export default BulkActionBar;
