"use client";
import { useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { AMBER, BG2, BG3, BORDER, DIM, STATUS_META } from "@/lib/constants";
import { ActionButton } from "./ActionButton";

interface ConfirmDialogProps {
  /** Dialog heading */
  title: string;
  /** Descriptive body text shown under the title */
  message: string;
  /** If provided, user must retype this exact value before confirming */
  retypeValue?: string;
  /** Placeholder shown in the retype input */
  retypePlaceholder?: string;
  /** Color used for the confirm button and accent strip */
  accentColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  retypeValue,
  retypePlaceholder,
  accentColor = STATUS_META.FAILED.color,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const needsRetype = Boolean(retypeValue);
  const canConfirm = needsRetype ? typed === retypeValue : true;

  // Focus the retype input (or the cancel button) when the dialog mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  const mono: CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(2px)",
          zIndex: 1000,
        }}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1001,
          width: "min(480px, calc(100vw - 32px))",
          background: BG2,
          border: `1px solid ${accentColor}55`,
          ...mono,
        }}
      >
        {/* Accent strip */}
        <div style={{ height: 2, background: accentColor, opacity: 0.85 }} />

        <div style={{ padding: "20px 22px 22px" }}>
          {/* Title */}
          <div
            id="confirm-dialog-title"
            style={{
              fontSize: 11, fontWeight: 700,
              letterSpacing: "0.12em",
              color: accentColor,
              marginBottom: 10,
            }}
          >
            ⚠ {title}
          </div>

          {/* Message */}
          <p style={{
            fontSize: 12, lineHeight: 1.65,
            color: "rgba(255,255,255,0.65)",
            margin: "0 0 18px",
            ...mono,
          }}>
            {message}
          </p>

          {/* Retype confirmation input */}
          {needsRetype && (
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: "block",
                fontSize: 10, letterSpacing: "0.1em",
                color: DIM, marginBottom: 6,
              }}>
                TYPE THE ADDRESS BELOW TO CONFIRM
              </label>
              <input
                ref={inputRef}
                type="text"
                value={typed}
                onChange={e => setTyped(e.target.value)}
                placeholder={retypePlaceholder ?? retypeValue}
                spellCheck={false}
                autoComplete="off"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "9px 12px",
                  background: BG3,
                  border: `1px solid ${typed === retypeValue ? accentColor + "99" : BORDER}`,
                  color: typed === retypeValue ? accentColor : "rgba(255,255,255,0.8)",
                  fontSize: 11,
                  outline: "none",
                  transition: "border-color 0.15s, color 0.15s",
                  ...mono,
                }}
              />
              {typed.length > 0 && typed !== retypeValue && (
                <div style={{
                  fontSize: 10, color: STATUS_META.FAILED.color,
                  marginTop: 5, letterSpacing: "0.04em",
                }}>
                  address mismatch
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <ActionButton
              label="CANCEL"
              color={DIM.replace("0.35", "0.55")}
              onClick={onCancel}
            />
            <ActionButton
              label="CONFIRM →"
              color={canConfirm ? accentColor : DIM}
              onClick={() => { if (canConfirm) onConfirm(); }}
            />
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
