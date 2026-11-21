"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BG2, BG3, BORDER, DIM, MONO } from "@/lib/constants";
import { useFocusTrap } from "@/components/ui/useFocusTrap";

export interface Command {
  id: string;
  label: string;
  keywords: string[];
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  commands: Command[];
}

// Ctrl/Cmd+K must not hijack typing in form fields.
function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export function CommandPalette({ open, onOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Stable so the focus trap does not re-run (and re-focus) on every parent render.
  const handleEscape = useCallback(() => onCloseRef.current(), []);
  useFocusTrap(dialogRef, { enabled: open, onEscape: handleEscape });

  useEffect(() => {
    if (open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return;
      if (isEditable(e.target)) return;
      e.preventDefault();
      onOpen();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpen]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  if (!open) return null;

  const needle = query.trim().toLowerCase();
  const matches = commands.filter((c) =>
    [c.label, ...c.keywords].some((s) => s.toLowerCase().includes(needle))
  );

  const run = (command: Command) => {
    onClose();
    command.action();
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(2px)",
          zIndex: 1000,
        }}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        tabIndex={-1}
        style={{
          position: "fixed",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1001,
          width: "min(520px, calc(100vw - 32px))",
          background: BG2,
          border: `1px solid ${BORDER}`,
          outline: "none",
          fontFamily: MONO,
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (matches[0]) run(matches[0]);
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command…"
            aria-label="Search commands"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px 16px",
              background: BG3,
              border: "none",
              borderBottom: `1px solid ${BORDER}`,
              color: "inherit",
              fontFamily: MONO,
              fontSize: 13,
              outline: "none",
            }}
          />
        </form>

        <ul style={{ listStyle: "none", margin: 0, padding: 6, maxHeight: 320, overflowY: "auto" }}>
          {matches.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => run(c)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  fontFamily: MONO,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {c.label}
              </button>
            </li>
          ))}
          {matches.length === 0 && (
            <li style={{ padding: "10px 12px", color: DIM, fontSize: 12 }}>No matching commands</li>
          )}
        </ul>
      </div>
    </>,
    document.body
  );
}
