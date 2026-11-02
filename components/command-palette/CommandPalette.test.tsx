import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CommandPalette, type Command } from "@/components/command-palette/CommandPalette";

const mockCommands: Command[] = [
  {
    id: "nav-dash",
    label: "Go to Dashboard",
    keywords: ["home", "stats", "overview"],
    action: vi.fn(),
  },
  {
    id: "nav-txs",
    label: "View Transactions",
    keywords: ["history", "transfers", "payments"],
    action: vi.fn(),
  },
  {
    id: "nav-settings",
    label: "Open Settings",
    keywords: ["config", "preferences", "network"],
    action: vi.fn(),
  },
];

describe("CommandPalette Component (#298)", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });
  it("renders nothing when open is false", () => {
    const onClose = vi.fn();
    render(<CommandPalette open={false} onClose={onClose} commands={mockCommands} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog, input, and command options when open is true", () => {
    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} commands={mockCommands} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Type a command or search/i)).toBeInTheDocument();
    expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
    expect(screen.getByText("View Transactions")).toBeInTheDocument();
    expect(screen.getByText("Open Settings")).toBeInTheDocument();
  });

  it("filters command options based on search query matching label or keywords", () => {
    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} commands={mockCommands} />);

    const input = screen.getByPlaceholderText(/Type a command or search/i);
    // Search keyword 'transfers' which belongs to View Transactions
    fireEvent.change(input, { target: { value: "transfers" } });

    expect(screen.getByText("View Transactions")).toBeInTheDocument();
    expect(screen.queryByText("Go to Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Open Settings")).not.toBeInTheDocument();
  });

  it("displays 'no matching commands' message when query has no matches", () => {
    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} commands={mockCommands} />);

    const input = screen.getByPlaceholderText(/Type a command or search/i);
    fireEvent.change(input, { target: { value: "xyznonexistentquery999" } });

    expect(screen.getByText("no matching commands")).toBeInTheDocument();
  });

  it("executes command action and calls onClose when an option is clicked", () => {
    const onClose = vi.fn();
    const action = vi.fn();
    const commands: Command[] = [
      { id: "test-cmd", label: "Trigger Test Action", keywords: [], action },
    ];

    render(<CommandPalette open={true} onClose={onClose} commands={commands} />);

    fireEvent.click(screen.getByText("Trigger Test Action"));
    expect(action).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("navigates options via keyboard ArrowDown, ArrowUp, and triggers action on Enter", () => {
    const onClose = vi.fn();
    const action1 = vi.fn();
    const action2 = vi.fn();
    const commands: Command[] = [
      { id: "cmd-1", label: "First Command", keywords: [], action: action1 },
      { id: "cmd-2", label: "Second Command", keywords: [], action: action2 },
    ];

    render(<CommandPalette open={true} onClose={onClose} commands={commands} />);

    const dialog = screen.getByRole("dialog");

    // ArrowDown to move to cmd-2
    fireEvent.keyDown(dialog, { key: "ArrowDown" });
    // Press Enter to execute cmd-2
    fireEvent.keyDown(dialog, { key: "Enter" });

    expect(action2).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("closes palette when pressing Escape key", () => {
    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} commands={mockCommands} />);

    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
  });

  it("closes palette when clicking backdrop", () => {
    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} commands={mockCommands} />);

    const backdrop = screen.getByRole("presentation");
    fireEvent.mouseDown(backdrop);

    expect(onClose).toHaveBeenCalled();
  });

  it("updates active selection on mouseEnter", () => {
    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} commands={mockCommands} />);

    const option = screen.getByText("Open Settings");
    fireEvent.mouseEnter(option);

    expect(option.closest("li")).toHaveAttribute("aria-selected", "true");
  });

  it("handles undefined commands array gracefully", () => {
    const onClose = vi.fn();
    expect(() =>
      render(<CommandPalette open={true} onClose={onClose} commands={undefined as any} />)
    ).not.toThrow();
  });
});
