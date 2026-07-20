"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AMBER, BG1, BG2, BORDER, DIM } from "@/lib/constants";

type Props = {
  children: ReactNode;
  title?: string;
};

type State = {
  hasError: boolean;
};

export class TabErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("TabErrorBoundary caught an error", error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <section
          style={{
            minHeight: 280,
            display: "grid",
            placeItems: "center",
            padding: 24,
            border: `1px solid ${BORDER}`,
            background: `linear-gradient(180deg, ${BG2}, ${BG1})`,
            borderRadius: 12,
          }}
        >
          <div style={{ maxWidth: 520, width: "100%" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 10px",
                border: `1px solid ${BORDER}`,
                background: "rgba(245,166,35,0.08)",
                color: AMBER,
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Recovery screen
            </div>

            <h2 style={{ margin: "16px 0 10px", fontSize: 24, color: "#fff" }}>
              {this.props.title ?? "This tab is unavailable"}
            </h2>

            <p style={{ margin: 0, color: DIM, lineHeight: 1.6 }}>
              An unexpected error stopped this panel from rendering. You can retry the
              tab without losing the rest of the shell.
            </p>

            <button
              onClick={this.reset}
              style={{
                marginTop: 18,
                padding: "10px 16px",
                background: AMBER,
                color: "#0A0B0D",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontFamily: "'IBM Plex Mono', monospace",
                letterSpacing: "0.08em",
              }}
            >
              Try again
            </button>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
