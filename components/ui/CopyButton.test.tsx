import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CopyButton } from "./CopyButton";

const toastMock = vi.fn();

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

describe("CopyButton", () => {
  beforeEach(() => {
    toastMock.mockClear();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders with the default label", () => {
    render(<CopyButton value="abc123" />);
    expect(screen.getByRole("button", { name: "Copy Value" })).toBeInTheDocument();
  });

  it("renders with a custom label", () => {
    render(<CopyButton value="abc123" label="Hash" />);
    expect(screen.getByRole("button", { name: "Copy Hash" })).toBeInTheDocument();
  });

  it("copies the value to the clipboard and shows a success toast on click", async () => {
    render(<CopyButton value="abc123" label="Hash" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy Hash" }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("abc123");
    await vi.waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith("Hash copied to clipboard", "success");
    });
  });

  it("does nothing when the value is empty", () => {
    render(<CopyButton value="" label="Hash" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy Hash" }));

    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("shows an error toast when the clipboard write fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("denied")),
      },
    });

    render(<CopyButton value="abc123" label="Hash" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy Hash" }));

    await vi.waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith("Failed to copy to clipboard", "error");
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("stops the click event from propagating to parent handlers", () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <CopyButton value="abc123" />
      </div>
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy Value" }));

    expect(parentClick).not.toHaveBeenCalled();
  });

  it("merges a custom style prop onto the button", () => {
    render(<CopyButton value="abc123" style={{ color: "red" }} />);
    expect(screen.getByRole("button", { name: "Copy Value" })).toHaveStyle({ color: "red" });
  });
});
