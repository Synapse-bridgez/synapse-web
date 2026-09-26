"use client";

import { useEffect, useRef } from "react";

/**
 * A single row in the diff-style preview shown before a state-changing action.
 * `before`/`after` are rendered as `before → after` when both are present.
 */
export interface PreviewDiffRow {
  label: string;
  before?: string;
  after?: string;
  /** When true, render the row as a warning (e.g. would-revert reason). */
  danger?: boolean;
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Optional short description of the action being confirmed. */
  description?: string;
  /** Diff-style preview rows (e.g. "admin: GABC... → GXYZ..."). */
  preview?: PreviewDiffRow[];
  /** Estimated fee for the simulated call, already formatted for display. */
  estimatedFee?: string;
  /** Simulation failure / would-revert reason. Blocks confirmation when set. */
  error?: string | null;
  /** True while the simulation is still running. */
  simulating?: boolean;
  /** True while the real signed submission is in flight. */
  submitting?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Shared confirmation surface for the simulate → preview → confirm → submit flow.
 *
 * When `error` is set (simulation would revert) the confirm action is disabled so
 * submission cannot proceed silently; the revert reason is surfaced instead.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  preview,
  estimatedFee,
  error,
  simulating = false,
  submitting = false,
  confirmLabel = "Confirm & Sign",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && !error && !simulating) {
      confirmRef.current?.focus();
    }
  }, [open, error, simulating]);

  if (!open) return null;

  const blocked = Boolean(error) || simulating || submitting;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-neutral-900">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {title}
        </h2>

        {description ? (
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            {description}
          </p>
        ) : null}

        {simulating ? (
          <p className="mt-4 text-sm text-neutral-500">Simulating transaction…</p>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
          >
            <p className="font-medium">Simulation failed — submission blocked</p>
            <p className="mt-1 break-words font-mono text-xs">{error}</p>
          </div>
        ) : null}

        {!error && preview && preview.length > 0 ? (
          <dl className="mt-4 space-y-2 rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800">
            {preview.map((row, i) => (
              <div key={`${row.label}-${i}`} className="flex flex-wrap items-baseline gap-2">
                <dt className="font-medium text-neutral-700 dark:text-neutral-300">
                  {row.label}:
                </dt>
                <dd
                  className={
                    row.danger
                      ? "font-mono text-xs text-red-600 dark:text-red-400"
                      : "font-mono text-xs text-neutral-900 dark:text-neutral-100"
                  }
                >
                  {row.before !== undefined && row.after !== undefined
                    ? `${row.before} → ${row.after}`
                    : row.after ?? row.before ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {!error && estimatedFee ? (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            Estimated fee:{" "}
            <span className="font-mono text-neutral-900 dark:text-neutral-100">
              {estimatedFee}
            </span>
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={blocked}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
