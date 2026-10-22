import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import WatchAddressEntry, { isValidStellarAddress } from "./WatchAddressEntry";

// ---------------------------------------------------------------------------
// Mock WalletProvider — WalletProvider.tsx is empty; tests own the context shape
// ---------------------------------------------------------------------------
const mockWatchAddress = vi.fn();
const mockDisconnect = vi.fn();

let mockMode: "none" | "connected" | "watch" = "none";

vi.mock("@/lib/wallet/WalletProvider", () => ({
  useWallet: () => ({
    mode: mockMode,
    watchAddress: mockWatchAddress,
    disconnect: mockDisconnect,
  }),
}));

// ---------------------------------------------------------------------------
// A valid 56-char Stellar public key (G + 55 uppercase base32 chars [A-Z2-7])
// ---------------------------------------------------------------------------
const VALID_KEY = "G" + "ABCDEFGABCDEFGABCDEFGABCDEFGABCDEFGABCDEFGABCDEFGABCDEF";

// ---------------------------------------------------------------------------
// isValidStellarAddress (#325)
// ---------------------------------------------------------------------------
describe("isValidStellarAddress (#325)", () => {
  it("returns true for a valid Stellar public key", () => {
    expect(isValidStellarAddress(VALID_KEY)).toBe(true);
  });

  it("returns true for another valid key at the boundary (56 chars)", () => {
    // 'G' + 55 uppercase base32 chars
    const key = "G" + "A".repeat(55);
    expect(isValidStellarAddress(key)).toBe(true);
  });

  it("allows the digits 2-7 in positions 2-56", () => {
    // trailing portion uses all valid base32 chars including 2-7
    const trailing = "ABCDE2345672345672345672345672345672345672345672345672AB";
    const k = "G" + trailing.slice(0, 55);
    expect(k.length).toBe(56);
    expect(isValidStellarAddress(k)).toBe(true);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(isValidStellarAddress(`  ${VALID_KEY}  `)).toBe(true);
  });

  it("returns false for an empty string", () => {
    expect(isValidStellarAddress("")).toBe(false);
  });

  it("returns false for a key that starts with a lowercase g", () => {
    expect(isValidStellarAddress("g" + VALID_KEY.slice(1))).toBe(false);
  });

  it("returns false for a key that starts with S (secret key prefix)", () => {
    expect(isValidStellarAddress("S" + "A".repeat(55))).toBe(false);
  });

  it("returns false for a key shorter than 56 characters", () => {
    expect(isValidStellarAddress(VALID_KEY.slice(0, 55))).toBe(false);
  });

  it("returns false for a key longer than 56 characters", () => {
    expect(isValidStellarAddress(VALID_KEY + "A")).toBe(false);
  });

  it("returns false when the key contains lowercase letters", () => {
    const lower = "G" + "a".repeat(55);
    expect(isValidStellarAddress(lower)).toBe(false);
  });

  it("returns false when the key contains digits 0, 1, 8, or 9", () => {
    const withZero = "G" + "0" + "A".repeat(54);
    const withOne = "G" + "1" + "A".repeat(54);
    const withEight = "G" + "8" + "A".repeat(54);
    const withNine = "G" + "9" + "A".repeat(54);
    expect(isValidStellarAddress(withZero)).toBe(false);
    expect(isValidStellarAddress(withOne)).toBe(false);
    expect(isValidStellarAddress(withEight)).toBe(false);
    expect(isValidStellarAddress(withNine)).toBe(false);
  });

  it("returns false for a random non-key string", () => {
    expect(isValidStellarAddress("not-a-stellar-address")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// WatchAddressEntry (#326)
// ---------------------------------------------------------------------------
describe("WatchAddressEntry (#326)", () => {
  beforeEach(() => {
    mockMode = "none";
    mockWatchAddress.mockClear();
    mockDisconnect.mockClear();
  });

  describe("entry form (mode !== 'watch')", () => {
    it("renders the watch address form by default", () => {
      render(<WatchAddressEntry />);
      expect(screen.getByLabelText(/watch an address/i)).toBeDefined();
      expect(screen.getByPlaceholderText("G...")).toBeDefined();
      expect(screen.getByRole("button", { name: /watch/i })).toBeDefined();
    });

    it("Watch button is disabled when the input is empty", () => {
      render(<WatchAddressEntry />);
      const btn = screen.getByRole("button", { name: /watch/i }) as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it("Watch button is disabled when input is invalid", () => {
      render(<WatchAddressEntry />);
      const input = screen.getByPlaceholderText("G...");
      fireEvent.change(input, { target: { value: "invalid-key" } });
      const btn = screen.getByRole("button", { name: /watch/i }) as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it("Watch button is enabled when input is a valid Stellar key", () => {
      render(<WatchAddressEntry />);
      const input = screen.getByPlaceholderText("G...");
      fireEvent.change(input, { target: { value: VALID_KEY } });
      const btn = screen.getByRole("button", { name: /watch/i }) as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });

    it("shows a validation error when submitting an invalid address", () => {
      render(<WatchAddressEntry />);
      const input = screen.getByPlaceholderText("G...");
      fireEvent.change(input, { target: { value: "BADKEY" } });

      // Submit via form (button is disabled for invalid input)
      const form = input.closest("form") as HTMLFormElement;
      fireEvent.submit(form);

      expect(screen.getByText(/valid stellar public key/i)).toBeDefined();
    });

    it("does not show an error message on initial render", () => {
      render(<WatchAddressEntry />);
      expect(screen.queryByText(/valid stellar public key/i)).toBeNull();
    });

    it("clears the error when the user changes the input after an error", () => {
      render(<WatchAddressEntry />);
      const input = screen.getByPlaceholderText("G...");
      fireEvent.change(input, { target: { value: "BAD" } });
      const form = input.closest("form") as HTMLFormElement;
      fireEvent.submit(form);

      // Error should be visible
      expect(screen.getByText(/valid stellar public key/i)).toBeDefined();

      // Typing clears the error
      fireEvent.change(input, { target: { value: "G" } });
      expect(screen.queryByText(/valid stellar public key/i)).toBeNull();
    });

    it("calls watchAddress with the trimmed address on valid submit", () => {
      render(<WatchAddressEntry />);
      const input = screen.getByPlaceholderText("G...");
      fireEvent.change(input, { target: { value: `  ${VALID_KEY}  ` } });

      const form = input.closest("form") as HTMLFormElement;
      fireEvent.submit(form);

      expect(mockWatchAddress).toHaveBeenCalledTimes(1);
      expect(mockWatchAddress).toHaveBeenCalledWith(VALID_KEY);
    });
  });

  describe("watch-only banner (mode === 'watch')", () => {
    beforeEach(() => {
      mockMode = "watch";
    });

    it("renders the watch-only mode banner instead of the form", () => {
      render(<WatchAddressEntry />);
      expect(screen.getByText(/watch-only mode/i)).toBeDefined();
      expect(screen.queryByPlaceholderText("G...")).toBeNull();
    });

    it("shows the Exit watch mode button", () => {
      render(<WatchAddressEntry />);
      expect(screen.getByRole("button", { name: /exit watch mode/i })).toBeDefined();
    });

    it("calls disconnect when Exit watch mode is clicked", () => {
      render(<WatchAddressEntry />);
      const exitBtn = screen.getByRole("button", { name: /exit watch mode/i });
      fireEvent.click(exitBtn);
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it("renders read-only session description text", () => {
      render(<WatchAddressEntry />);
      expect(screen.getByText(/read-only session/i)).toBeDefined();
    });
  });
});
