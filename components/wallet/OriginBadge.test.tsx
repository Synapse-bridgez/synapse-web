import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SigningOriginNote } from "./OriginBadge";
import type { OriginState } from "@/lib/wallet/origin";

/**
 * All tests pass an explicit `state` prop so they bypass the
 * `useSyncExternalStore` hook and the module-level cache entirely —
 * consistent in both browser and happy-dom environments.
 */
function makeState(
  classification: OriginState["classification"],
  hostname = "synapse.example.com",
  origin = "https://synapse.example.com"
): OriginState {
  return {
    classification,
    hostname,
    origin,
    isHttps: true,
    framed: classification === "framed",
    allowedOrigins: ["https://synapse.example.com"],
  };
}

describe("SigningOriginNote", () => {
  it("renders the muted confirmation message for genuine origin", () => {
    render(<SigningOriginNote state={makeState("genuine")} />);
    const note = screen.getByText(/Signing on https:\/\/synapse\.example\.com/i);
    expect(note).toBeDefined();
    expect(note.textContent).toMatch(/confirm this host against the address bar/i);
  });

  it("renders the muted confirmation message for dev origin", () => {
    render(<SigningOriginNote state={makeState("dev", "localhost", "http://localhost:3000")} />);
    const note = screen.getByText(/Signing on http:\/\/localhost:3000/i);
    expect(note).toBeDefined();
  });

  it("renders the loud warning for unknown origin", () => {
    render(<SigningOriginNote state={makeState("unknown", "evil.example.com")} />);
    const note = screen.getByText(/UNVERIFIED ORIGIN/i);
    expect(note).toBeDefined();
    expect(note.textContent).toMatch(/Check the address bar/i);
  });

  it("renders the loudest warning for framed origin", () => {
    render(<SigningOriginNote state={makeState("framed", "synapse.example.com")} />);
    const note = screen.getByText(/EMBEDDED · DO NOT SIGN/i);
    expect(note).toBeDefined();
    expect(note.textContent).toMatch(/running inside another page/i);
  });

  it("sets data-origin-classification=genuine for genuine state", () => {
    const { container } = render(<SigningOriginNote state={makeState("genuine")} />);
    const div = container.querySelector("[data-origin-classification]");
    expect(div?.getAttribute("data-origin-classification")).toBe("genuine");
  });

  it("sets data-origin-classification=unknown for unknown state", () => {
    const { container } = render(
      <SigningOriginNote state={makeState("unknown", "evil.example.com")} />
    );
    const div = container.querySelector("[data-origin-classification]");
    expect(div?.getAttribute("data-origin-classification")).toBe("unknown");
  });

  it("genuine note does not show the UNVERIFIED label", () => {
    render(<SigningOriginNote state={makeState("genuine")} />);
    expect(screen.queryByText(/UNVERIFIED ORIGIN/i)).toBeNull();
    expect(screen.queryByText(/EMBEDDED/i)).toBeNull();
  });

  it("unknown note shows the full label+hint inline (not the muted format)", () => {
    render(
      <SigningOriginNote state={makeState("unknown", "attacker.io", "https://attacker.io")} />
    );
    // The muted "Signing on <origin>" copy only appears for genuine/dev.
    const note = screen.getByText(/UNVERIFIED ORIGIN/i);
    expect(note.textContent).not.toMatch(/^Signing on /);
  });
});
