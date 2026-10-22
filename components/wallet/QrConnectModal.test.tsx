import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import QrConnectModal from "./QrConnectModal";

// Mock the wallet kit so tests never touch real WalletConnect infrastructure.
vi.mock("@/lib/wallet/kit", () => ({
  ensureWalletKitInitialized: vi.fn(),
  StellarWalletsKit: {
    init: vi.fn(),
    getAddress: vi.fn().mockResolvedValue({ address: "" }),
  },
}));

describe("QrConnectModal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders nothing when open=false", () => {
    const { container } = render(<QrConnectModal open={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the dialog when open=true", () => {
    render(<QrConnectModal open={true} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: /connect mobile wallet/i })).toBeDefined();
  });

  it("renders the QR code SVG in waiting state", () => {
    render(<QrConnectModal open={true} onClose={vi.fn()} />);
    expect(screen.getByRole("img", { name: /walletconnect pairing qr code/i })).toBeDefined();
  });

  it("shows the 'waiting' status copy on initial open", () => {
    render(<QrConnectModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText(/Waiting for your wallet to scan/i)).toBeDefined();
  });

  it("renders a manual pairing code", () => {
    render(<QrConnectModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText(/Can't scan/i)).toBeDefined();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<QrConnectModal open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close pairing modal/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows the expired/failed state and a regenerate button after 60 seconds", async () => {
    const { StellarWalletsKit } = await import("@/lib/wallet/kit");
    // Keep getAddress pending so the poll interval never resolves an address,
    // and we can test the timeout expiry path cleanly.
    vi.mocked(StellarWalletsKit.getAddress).mockReturnValue(new Promise(() => {}));

    render(<QrConnectModal open={true} onClose={vi.fn()} />);
    await act(async () => {
      // Advance past QR_TTL_MS (60_000ms). The interval fires at 1_500ms steps
      // but each call never resolves, so no state updates happen from the poll.
      await vi.advanceTimersByTimeAsync(60_001);
    });
    expect(screen.getByText(/Pairing failed or timed out/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Regenerate QR code/i })).toBeDefined();
  });

  it("regenerates a new pairing URI when 'Regenerate QR code' is clicked", async () => {
    const { StellarWalletsKit } = await import("@/lib/wallet/kit");
    vi.mocked(StellarWalletsKit.getAddress).mockReturnValue(new Promise(() => {}));

    render(<QrConnectModal open={true} onClose={vi.fn()} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_001);
    });
    expect(screen.getByRole("button", { name: /Regenerate QR code/i })).toBeDefined();
    // Grab the manual code before regenerating
    const codeEl = screen.getByRole("code") as HTMLElement;
    const oldCode = codeEl.textContent;

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Regenerate QR code/i }));
    });

    // After regeneration the status resets to waiting
    expect(screen.getByText(/Waiting for your wallet to scan/i)).toBeDefined();
    // The pairing code must be different from the expired one
    const newCode = (screen.getByRole("code") as HTMLElement).textContent;
    expect(newCode).not.toBe(oldCode);
  });

  it("transitions to connected state when the poll resolves an address", async () => {
    const { StellarWalletsKit } = await import("@/lib/wallet/kit");
    vi.mocked(StellarWalletsKit.getAddress).mockResolvedValue({
      address: "GBZXN7PIRZGNMHGA728RGRYA72R6UGRM6X8J73V2S8L7D2Z5V5P8K3M4",
    });
    const onConnected = vi.fn();

    await act(async () => {
      render(<QrConnectModal open={true} onClose={vi.fn()} onConnected={onConnected} />);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500);
    });

    expect(screen.getByText(/Wallet connected successfully/i)).toBeDefined();
    expect(onConnected).toHaveBeenCalledWith(
      "GBZXN7PIRZGNMHGA728RGRYA72R6UGRM6X8J73V2S8L7D2Z5V5P8K3M4"
    );
  });

  it("does not show the regenerate button while still waiting", () => {
    render(<QrConnectModal open={true} onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Regenerate/i })).toBeNull();
  });

  it("renders nothing again after being closed (open flips to false)", () => {
    const { rerender, container } = render(<QrConnectModal open={true} onClose={vi.fn()} />);
    expect(container.firstChild).not.toBeNull();
    rerender(<QrConnectModal open={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
