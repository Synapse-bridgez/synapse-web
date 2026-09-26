"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import { AMBER, BG2, DIM, MONO } from "@/lib/constants";

export interface Toast {
  id: string;
  message: string;
  type?: "success" | "error" | "info";
  /** Optional action button rendered inside the toast (e.g. "Stay connected"). */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Optional override for the auto-dismiss delay in ms. */
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: Toast["type"], options?: { action?: Toast["action"]; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    (message: string, type: Toast["type"] = "success", options?: { action?: Toast["action"]; duration?: number }) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type, action: options?.action, duration: options?.duration }]);

      // Auto dismiss after 3 seconds (or a custom duration when provided)
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, options?.duration ?? 3000);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="assertive"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => {
          let typeColor = AMBER;
          let icon = "⬡";
          if (t.type === "success") {
            typeColor = "#66BB6A"; // COMPLETED green
            icon = "✓";
          } else if (t.type === "error") {
            typeColor = "#EF5350"; // FAILED red
            icon = "✗";
          } else if (t.type === "info") {
            typeColor = "#4FC3F7"; // PROCESSING blue
            icon = "ℹ";
          }

          return (
            <div
              key={t.id}
              className="animate-fade-in"
              style={{
                background: BG2,
                border: `1px solid ${typeColor}77`,
                boxShadow: `0 4px 12px rgba(0, 0, 0, 0.5), 0 0 8px ${typeColor}15`,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "#fff",
                fontFamily: MONO,
                fontSize: 11,
                minWidth: 260,
                pointerEvents: "auto",
                justifyContent: "space-between",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <span style={{ color: typeColor, fontWeight: 700 }}>{icon}</span>
                <span style={{ color: "#eee", wordBreak: "break-word" }}>{t.message}</span>
              </div>
              {t.action && (
                <button
                  onClick={() => {
                    t.action?.onClick();
                    removeToast(t.id);
                  }}
                  style={{
                    background: "none",
                    border: `1px solid ${typeColor}77`,
                    color: typeColor,
                    cursor: "pointer",
                    fontFamily: MONO,
                    fontSize: 10,
                    padding: "4px 8px",
                    marginLeft: 10,
                    whiteSpace: "nowrap",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = `${typeColor}22`)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  {t.action.label}
                </button>
              )}
              <button
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss notification"
                style={{
                  background: "none",
                  border: "none",
                  color: DIM,
                  cursor: "pointer",
                  fontSize: 12,
                  marginLeft: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 4,
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = DIM)}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
