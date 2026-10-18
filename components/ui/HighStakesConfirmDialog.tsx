/**
 * HighStakesConfirmDialog
 *
 * A purpose-built confirmation modal for genuinely irreversible, high-severity
 * admin actions (e.g. transfer_admin).  Unlike the general ConfirmDialog, this
 * component:
 *
 *  • Always requires the user to retype the exact confirmation value — there is
 *    no way to render it without a mandatory typed-match step.
 *  • The Confirm button is DISABLED at the DOM level (not merely styled dimly)
 *    until the entry matches exactly, preventing keyboard-shortcut / click-through
 *    bypass.
 *  • Displays a prominent, unmissable danger banner with explicit irreversibility
 *    language.
 *  • Has an accessible role="alertdialog" (not just "dialog") so screen-readers
 *    announce the alert context immediately.
 *
 * Risk assessment — actions that should use this component:
 *
 *   ✅ transfer_admin   — irreversible; wrong address = permanent lock-out
 *   ❌ set_relay_signer — reversible (admin can call again); use ConfirmDialog
 *   ❌ initialize       — one-shot but not destructive; standard flow is fine
 *
 * If a new action is added, document the risk assessment in a comment next to
 * the <HighStakesConfirmDialog> usage before deciding which dialog to use.
 */
"use client";

import { useState, useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { BG2, BG3, BORDER, DIM, MONO, STATUS_META } from "@/lib/constants";
import { ActionButton } from "./ActionButton";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface HighStakesConfirmDialogProps {
  /** Dialog heading (shown in accent colour, all-caps) */
  title: string;
  /**
   * Descriptive body text explaining what will happen and why it is
   * irreversible.  Must be present and meaningful — do not pass an empty string.
   */
  message: string;
  /**
   * The exact string the user must type before the Confirm button becomes
   * enabled.  Typically the destination address or another value that proves
   * the user has read and understood what they are confirming.
   */
  confirmValue: string;
  /**
   * Short label shown above the retype input (defaults to a generic phrase).
   * Customise to match the field semantics, e.g. "TYPE THE NEW ADMIN ADDRESS".
   */
  confirmLabel?: string;
  /** Called only when typed entry matches confirmValue exactly. */
  onConfirm: () => void;
  /** Called on cancel or Escape key. */
  onCancel: () => void;
  /** Optional extra content rendered between the message and the input. */
  children?: ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DANGER = STATUS_META.FAILED.color; // #EF5350

export function HighStakesConfirmDialog({
  title,
  message,
  confirmValue,
  confirmLabel = "TYPE THE VALUE BELOW EXACTLY TO CONFIRM",
  onConfirm,
  onCancel,
  children,
}: HighStakesConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const matched = typed === confirmValue;

  // Focus the input immediately so keyboard users don't have to tab to it.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  const mono: CSSProperties = { fontFamily: MONO };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        data-testid="hsc-backdrop"
        role="button"
        tabIndex={0}
        aria-label="Cancel confirmation"
        onClick={onCancel}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onCancel();
          }
        }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.80)",
          backdropFilter: "blur(3px)",
          zIndex: 1000,
        }}
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="hsc-title"
        aria-describedby="hsc-message"
        data-testid="hsc-dialog"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1001,
          width: "min(520px, calc(100vw - 32px))",
          background: BG2,
          border: `1px solid ${DANGER}88`,
          ...mono,
        }}
      >
        {/* Thick accent strip — red to signal danger */}
        <div style={{ height: 4, background: DANGER }} />

        <div style={{ padding: "20px 22px 24px" }}>
          {/* Title */}
          <div
            id="hsc-title"
            data-testid="hsc-title"
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: DANGER,
              marginBottom: 12,
            }}
          >
            ⛔ {title}
          </div>

          {/* Danger banner */}
          <div
            data-testid="hsc-danger-banner"
            style={{
              background: `${DANGER}12`,
              border: `1px solid ${DANGER}55`,
              padding: "10px 14px",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontSize: 10,
                letterSpacing: "0.08em",
                color: DANGER,
                display: "block",
                marginBottom: 4,
              }}
            >
              ⚠ THIS ACTION IS IRREVERSIBLE
            </span>
            <p
              id="hsc-message"
              data-testid="hsc-message"
              style={{
                fontSize: 12,
                lineHeight: 1.65,
                color: "rgba(255,255,255,0.70)",
                margin: 0,
                ...mono,
              }}
            >
              {message}
            </p>
          </div>

          {/* Optional extra content slot */}
          {children}

          {/* Typed-confirmation input */}
          <div style={{ marginBottom: 22 }}>
            <label
              htmlFor="hsc-input"
              style={{
                display: "block",
                fontSize: 10,
                letterSpacing: "0.1em",
                color: DIM,
                marginBottom: 6,
              }}
            >
              {confirmLabel}
            </label>
            <input
              id="hsc-input"
              data-testid="hsc-input"
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmValue}
              spellCheck={false}
              autoComplete="off"
              aria-describedby="hsc-match-feedback"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "9px 12px",
                background: BG3,
                border: `1px solid ${matched ? DANGER + "99" : BORDER}`,
                color: matched ? DANGER : "rgba(255,255,255,0.8)",
                fontSize: 11,
                outline: "none",
                transition: "border-color 0.15s, color 0.15s",
                ...mono,
              }}
            />
            {/* Live feedback — only shown once user starts typing */}
            <div
              id="hsc-match-feedback"
              data-testid="hsc-feedback"
              aria-live="polite"
              style={{
                fontSize: 10,
                marginTop: 5,
                letterSpacing: "0.04em",
                minHeight: 16,
                color: matched ? "#66BB6A" : DANGER,
              }}
            >
              {typed.length > 0 && !matched && "value mismatch — confirm button remains locked"}
              {matched && "✓ match confirmed"}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <ActionButton label="CANCEL" color={DIM.replace("0.35", "0.55")} onClick={onCancel} />
            {/*
             * The button is disabled at the DOM level via ActionButton's own
             * `disabled` prop, which sets disabled on the underlying <button>
             * element.  This prevents submission via keyboard, click, or
             * assistive technology when the typed value does not match.
             *
             * We also add a data-testid wrapper span for test targeting (a span
             * is valid around a button and carries the aria-disabled state).
             */}
            <span
              data-testid="hsc-confirm-btn"
              aria-disabled={!matched}
              // Propagate the disabled state so tests can query it via the span
              {...(!matched ? { "data-disabled": "true" } : {})}
              style={{ display: "inline-block" }}
            >
              <ActionButton
                label="CONFIRM IRREVERSIBLE ACTION →"
                color={matched ? DANGER : "rgba(100,100,100,0.5)"}
                disabled={!matched}
                onClick={() => {
                  if (matched) onConfirm();
                }}
              />
            </span>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
