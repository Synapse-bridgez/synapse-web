import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { deriveAuthorization, SessionAuditPanel } from "./SessionAuditPanel";

// ─── Provider mocks ────────────────────────────────────────────────────────

const mockUseWallet = vi.fn();
const mockUseLiveContractInfo = vi.fn();

vi.mock("@/lib/wallet/WalletProvider", () => ({
  useWallet: (...args: unknown[]) => mockUseWallet(...args),
}));

vi.mock("@/lib/soroban/useLiveContractInfo", () => ({
  useLiveContractInfo: (...args: unknown[]) => mockUseLiveContractInfo(...args),
}));

// shortId is used for display; mock to return a stable truncated string.
vi.mock("@/lib/utils", () => ({
  shortId: (id: string) => (id ? `${id.slice(0, 4)}…` : ""),
}));

// ─── deriveAuthorization unit tests ───────────────────────────────────────

describe("deriveAuthorization", () => {
  const ADMIN = "GADMIN111111111111111111111111111111111111111111111111111";
  const RELAY = "GRELAY111111111111111111111111111111111111111111111111111";
  const OTHER = "GOTHER111111111111111111111111111111111111111111111111111";

  it("returns all false when address is null", () => {
    expect(deriveAuthorization(null, ADMIN, RELAY)).toEqual({
      isAdmin: false,
      isRelaySigner: false,
      canSignAdminActions: false,
    });
  });

  it("returns all false when admin and relay are null", () => {
    expect(deriveAuthorization(OTHER, null, null)).toEqual({
      isAdmin: false,
      isRelaySigner: false,
      canSignAdminActions: false,
    });
  });

  it("identifies admin match correctly", () => {
    const result = deriveAuthorization(ADMIN, ADMIN, RELAY);
    expect(result.isAdmin).toBe(true);
    expect(result.isRelaySigner).toBe(false);
    expect(result.canSignAdminActions).toBe(true);
  });

  it("identifies relay signer match correctly", () => {
    const result = deriveAuthorization(RELAY, ADMIN, RELAY);
    expect(result.isAdmin).toBe(false);
    expect(result.isRelaySigner).toBe(true);
    expect(result.canSignAdminActions).toBe(true);
  });

  it("returns false for all when address does not match either", () => {
    const result = deriveAuthorization(OTHER, ADMIN, RELAY);
    expect(result.isAdmin).toBe(false);
    expect(result.isRelaySigner).toBe(false);
    expect(result.canSignAdminActions).toBe(false);
  });

  it("handles undefined admin gracefully", () => {
    const result = deriveAuthorization(ADMIN, undefined, RELAY);
    expect(result.isAdmin).toBe(false);
    expect(result.canSignAdminActions).toBe(false);
  });

  it("handles undefined relay signer gracefully", () => {
    const result = deriveAuthorization(RELAY, ADMIN, undefined);
    expect(result.isRelaySigner).toBe(false);
    expect(result.canSignAdminActions).toBe(false);
  });

  it("canSignAdminActions is true when address matches both admin and relay", () => {
    const result = deriveAuthorization(ADMIN, ADMIN, ADMIN);
    expect(result.isAdmin).toBe(true);
    expect(result.isRelaySigner).toBe(true);
    expect(result.canSignAdminActions).toBe(true);
  });
});

// ─── SessionAuditPanel component tests ────────────────────────────────────

const ADMIN_ADDR = "GADMIN111111111111111111111111111111111111111111111111111";
const OTHER_ADDR = "GOTHER111111111111111111111111111111111111111111111111111";

function setupMocks({
  address = OTHER_ADDR,
  provider = "freighter",
  network = "testnet",
  admin = ADMIN_ADDR,
  relaySigner = null as string | null,
} = {}) {
  mockUseWallet.mockReturnValue({ address, provider, network });
  mockUseLiveContractInfo.mockReturnValue({
    info: admin !== null || relaySigner !== null ? { admin, relay_signer: relaySigner } : null,
  });
}

describe("SessionAuditPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing when no wallet is connected (address is null)", () => {
    mockUseWallet.mockReturnValue({ address: null, provider: null, network: null });
    mockUseLiveContractInfo.mockReturnValue({ info: null });
    const { container } = render(<SessionAuditPanel />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the scope toggle button when wallet is connected", () => {
    setupMocks();
    render(<SessionAuditPanel />);
    expect(screen.getByRole("button", { name: /wallet session audit/i })).toBeDefined();
  });

  it("shows VIEW-ONLY label when address cannot sign admin actions", () => {
    setupMocks({ address: OTHER_ADDR, admin: ADMIN_ADDR });
    render(<SessionAuditPanel />);
    expect(screen.getByText("VIEW-ONLY")).toBeDefined();
  });

  it("shows CAN SIGN ADMIN ACTIONS label when address matches admin", () => {
    setupMocks({ address: ADMIN_ADDR, admin: ADMIN_ADDR });
    render(<SessionAuditPanel />);
    expect(screen.getByText("CAN SIGN ADMIN ACTIONS")).toBeDefined();
  });

  it("shows CAN SIGN ADMIN ACTIONS label when address matches relay signer", () => {
    setupMocks({ address: OTHER_ADDR, admin: ADMIN_ADDR, relaySigner: OTHER_ADDR });
    render(<SessionAuditPanel />);
    expect(screen.getByText("CAN SIGN ADMIN ACTIONS")).toBeDefined();
  });

  it("panel is collapsed by default (detail dialog not rendered)", () => {
    setupMocks();
    render(<SessionAuditPanel />);
    expect(screen.queryByRole("dialog", { name: /wallet session details/i })).toBeNull();
  });

  it("expands the detail panel on button click", () => {
    setupMocks();
    render(<SessionAuditPanel />);
    fireEvent.click(screen.getByRole("button", { name: /wallet session audit/i }));
    expect(screen.getByRole("dialog", { name: /wallet session details/i })).toBeDefined();
  });

  it("collapses the detail panel on second click (toggle)", () => {
    setupMocks();
    render(<SessionAuditPanel />);
    const btn = screen.getByRole("button", { name: /wallet session audit/i });
    fireEvent.click(btn);
    expect(screen.getByRole("dialog", { name: /wallet session details/i })).toBeDefined();
    fireEvent.click(btn);
    expect(screen.queryByRole("dialog", { name: /wallet session details/i })).toBeNull();
  });

  it("shows provider and network in expanded panel", () => {
    setupMocks({ provider: "freighter", network: "testnet" });
    render(<SessionAuditPanel />);
    fireEvent.click(screen.getByRole("button", { name: /wallet session audit/i }));
    expect(screen.getByText("freighter")).toBeDefined();
    expect(screen.getByText("testnet")).toBeDefined();
  });

  it("shows view-only summary text in expanded panel when not authorized", () => {
    setupMocks({ address: OTHER_ADDR, admin: ADMIN_ADDR });
    render(<SessionAuditPanel />);
    fireEvent.click(screen.getByRole("button", { name: /wallet session audit/i }));
    expect(screen.getByText(/view-only; it cannot sign admin actions/i)).toBeDefined();
  });

  it("shows admin-capable summary text in expanded panel when authorized as admin", () => {
    setupMocks({ address: ADMIN_ADDR, admin: ADMIN_ADDR });
    render(<SessionAuditPanel />);
    fireEvent.click(screen.getByRole("button", { name: /wallet session audit/i }));
    expect(screen.getByText(/This session can sign admin actions/i)).toBeDefined();
  });

  it("sets aria-expanded=true on the button when panel is open", () => {
    setupMocks();
    render(<SessionAuditPanel />);
    const btn = screen.getByRole("button", { name: /wallet session audit/i });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });
});
