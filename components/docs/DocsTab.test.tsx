import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DocsTab, ACCESS_COLORS } from "./DocsTab";
import { ABI_ENDPOINTS } from "@/lib/constants";

describe("DocsTab Component (#304)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Access colors configuration", () => {
    it("defines distinct colors for each access tier", () => {
      expect(ACCESS_COLORS["one-time"]).toBeDefined();
      expect(ACCESS_COLORS.relay_signer).toBeDefined();
      expect(ACCESS_COLORS.admin).toBeDefined();
      expect(ACCESS_COLORS.public).toBeDefined();
    });
  });

  describe("Loading, error, and empty states", () => {
    it("renders loading message with role=status when loading=true", () => {
      render(<DocsTab loading={true} />);
      const status = screen.getByRole("status");
      expect(status).toBeInTheDocument();
      expect(status).toHaveTextContent("Loading contract documentation…");
    });

    it("renders error alert with role=alert when error message is supplied", () => {
      render(<DocsTab error="Failed to fetch ABI metadata" />);
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent("Unable to load contract documentation: Failed to fetch ABI metadata");
    });

    it("renders empty state message when endpoints list is empty", () => {
      render(<DocsTab endpoints={[]} />);
      expect(screen.getByText("No contract endpoints are documented yet.")).toBeInTheDocument();
    });
  });

  describe("Primary documentation view & interactions", () => {
    it("renders ABI reference intro header and access level legends", () => {
      render(<DocsTab />);
      expect(screen.getByTestId("docs-intro")).toBeInTheDocument();
      expect(screen.getByText(/CONTRACT ABI REFERENCE · SYNAPSE CORE v0.1.0/i)).toBeInTheDocument();
      expect(screen.getByTestId("access-legend-one-time")).toHaveTextContent("one-time");
      expect(screen.getByTestId("access-legend-relay_signer")).toHaveTextContent("relay_signer");
      expect(screen.getByTestId("access-legend-admin")).toHaveTextContent("admin");
      expect(screen.getByTestId("access-legend-public")).toHaveTextContent("public");
    });

    it("renders all predefined endpoints from ABI_ENDPOINTS", () => {
      render(<DocsTab />);
      expect(ABI_ENDPOINTS.length).toBeGreaterThan(0);

      // Verify key endpoints are rendered
      expect(screen.getByTestId("endpoint-row-initialize")).toBeInTheDocument();
      expect(screen.getByTestId("endpoint-row-register_transaction")).toBeInTheDocument();
      expect(screen.getByTestId("endpoint-row-complete_transaction")).toBeInTheDocument();
      expect(screen.getByTestId("endpoint-row-health")).toBeInTheDocument();

      // Verify signatures and descriptions
      expect(screen.getByText(/initialize\(admin: Address, relay_signer: Address\)/i)).toBeInTheDocument();
      expect(screen.getByTestId("access-badge-initialize")).toHaveTextContent("one-time");
      expect(screen.getByTestId("access-badge-health")).toHaveTextContent("public");
    });

    it("toggles EndpointPlayground when clicking TRY IT / CLOSE PLAYGROUND", () => {
      render(<DocsTab />);

      const tryButton = screen.getByTestId("try-button-health");
      expect(tryButton).toHaveTextContent("TRY IT");
      expect(tryButton).toHaveAttribute("aria-expanded", "false");

      // Click to open playground
      fireEvent.click(tryButton);
      expect(tryButton).toHaveTextContent("CLOSE PLAYGROUND");
      expect(tryButton).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("button", { name: /SIMULATE/i })).toBeInTheDocument();

      // Click again to close
      fireEvent.click(tryButton);
      expect(tryButton).toHaveTextContent("TRY IT");
      expect(tryButton).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("button", { name: /SIMULATE/i })).not.toBeInTheDocument();
    });
  });
});
