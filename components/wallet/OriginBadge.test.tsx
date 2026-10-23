import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OriginBadge, SigningOriginNote } from "./OriginBadge";
import type { OriginState } from "@/lib/wallet/origin";

function state(overrides: Partial<OriginState>): OriginState {
  return {
    origin: "https://synapse.example.com",
    hostname: "synapse.example.com",
    isHttps: true,
    classification: "genuine",
    framed: false,
    allowedOrigins: ["https://synapse.example.com"],
    ...overrides,
  };
}

describe("OriginBadge", () => {
  it("renders the genuine origin state in green with its hostname", () => {
    render(<OriginBadge state={state({ classification: "genuine" })} />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("GENUINE ORIGIN");
    expect(badge).toHaveTextContent("synapse.example.com");
    expect(badge).toHaveAttribute("data-origin-classification", "genuine");
    expect(badge).toHaveAttribute("data-origin-hostname", "synapse.example.com");
  });

  it("renders the local dev state", () => {
    render(
      <OriginBadge
        state={state({ classification: "dev", hostname: "localhost", origin: "http://localhost:3000" })}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("LOCAL DEV");
  });

  it("renders the unverified origin state", () => {
    render(
      <OriginBadge
        state={state({
          classification: "unknown",
          hostname: "evil-clone.example",
          origin: "https://evil-clone.example",
        })}
      />,
    );
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("UNVERIFIED ORIGIN");
    expect(badge).toHaveTextContent("evil-clone.example");
  });

  it("renders the embedded/framed state", () => {
    render(<OriginBadge state={state({ classification: "framed", framed: true })} />);
    expect(screen.getByRole("status")).toHaveTextContent("EMBEDDED · DO NOT SIGN");
  });

  it("includes the hint as the element's title", () => {
    render(<OriginBadge state={state({ classification: "unknown" })} />);
    expect(screen.getByRole("status")).toHaveAttribute(
      "title",
      expect.stringContaining("Check the address bar"),
    );
  });

  it("falls back to the live origin and renders the real hostname when no override is given", () => {
    render(<OriginBadge />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveAttribute("data-origin-hostname", window.location.hostname);
  });
});

describe("SigningOriginNote", () => {
  it("shows a muted confirm-and-sign message for a genuine origin", () => {
    render(<SigningOriginNote state={state({ classification: "genuine" })} />);
    expect(screen.getByText(/confirm this host against the address bar/i)).toBeInTheDocument();
  });

  it("shows a muted confirm-and-sign message for a dev origin", () => {
    render(<SigningOriginNote state={state({ classification: "dev", origin: "http://localhost:3000" })} />);
    expect(screen.getByText(/confirm this host against the address bar/i)).toBeInTheDocument();
  });

  it("shows the loud label and hint for an unverified origin", () => {
    render(<SigningOriginNote state={state({ classification: "unknown" })} />);
    expect(screen.getByText(/UNVERIFIED ORIGIN/)).toBeInTheDocument();
    expect(screen.getByText(/Do not proceed if the host looks wrong\./)).toBeInTheDocument();
  });

  it("shows the loud label and hint for a framed origin", () => {
    render(<SigningOriginNote state={state({ classification: "framed", framed: true })} />);
    expect(screen.getByText(/EMBEDDED · DO NOT SIGN/)).toBeInTheDocument();
  });

  it("renders the muted confirmation message for genuine origin", () => {
    render(<SigningOriginNote state={state({ classification: "genuine" })} />);
    const note = screen.getByText(/Signing on https:\/\/synapse\.example\.com/i);
    expect(note).toBeDefined();
    expect(note.textContent).toMatch(/confirm this host against the address bar/i);
  });

  it("renders the muted confirmation message for dev origin", () => {
    render(<SigningOriginNote state={state({ classification: "dev", hostname: "localhost", origin: "http://localhost:3000" })} />);
    const note = screen.getByText(/Signing on http:\/\/localhost:3000/i);
    expect(note).toBeDefined();
  });

  it("renders the loud warning for unknown origin", () => {
    render(<SigningOriginNote state={state({ classification: "unknown", hostname: "evil.example.com" })} />);
    const note = screen.getByText(/UNVERIFIED ORIGIN/i);
    expect(note).toBeDefined();
    expect(note.textContent).toMatch(/Check the address bar/i);
  });

  it("renders the loudest warning for framed origin", () => {
    render(<SigningOriginNote state={state({ classification: "framed", hostname: "synapse.example.com" })} />);
    const note = screen.getByText(/EMBEDDED · DO NOT SIGN/i);
    expect(note).toBeDefined();
    expect(note.textContent).toMatch(/running inside another page/i);
  });

  it("sets data-origin-classification=genuine for genuine state", () => {
    const { container } = render(<SigningOriginNote state={state({ classification: "genuine" })} />);
    const div = container.querySelector("[data-origin-classification]");
    expect(div?.getAttribute("data-origin-classification")).toBe("genuine");
  });

  it("sets data-origin-classification=unknown for unknown state", () => {
    const { container } = render(
      <SigningOriginNote state={state({ classification: "unknown", hostname: "evil.example.com" })} />
    );
    const div = container.querySelector("[data-origin-classification]");
    expect(div?.getAttribute("data-origin-classification")).toBe("unknown");
  });

  it("genuine note does not show the UNVERIFIED label", () => {
    render(<SigningOriginNote state={state({ classification: "genuine" })} />);
    expect(screen.queryByText(/UNVERIFIED ORIGIN/i)).toBeNull();
    expect(screen.queryByText(/EMBEDDED/i)).toBeNull();
  });

  it("unknown note shows the full label+hint inline (not the muted format)", () => {
    render(
      <SigningOriginNote state={state({ classification: "unknown", hostname: "attacker.io", origin: "https://attacker.io" })} />
    );
    // The muted "Signing on <origin>" copy only appears for genuine/dev.
    const note = screen.getByText(/UNVERIFIED ORIGIN/i);
    expect(note.textContent).not.toMatch(/^Signing on /);
  });
});
