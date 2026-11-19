import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NotificationCenter } from "./NotificationCenter";
import type { AppNotification } from "@/lib/notifications/NotificationStore";

// Mock store state and handlers
const mockMarkAllRead = vi.fn();
const mockDismiss = vi.fn();
const mockClearAll = vi.fn();

let mockStoreData = {
  notifications: [] as AppNotification[],
  unreadCount: 0,
  markAllRead: mockMarkAllRead,
  dismiss: mockDismiss,
  clearAll: mockClearAll,
};

vi.mock("@/lib/notifications/NotificationStore", () => ({
  useNotifications: () => mockStoreData,
}));

describe("NotificationCenter Component (#305)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreData = {
      notifications: [],
      unreadCount: 0,
      markAllRead: mockMarkAllRead,
      dismiss: mockDismiss,
      clearAll: mockClearAll,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Bell button & badge rendering", () => {
    it("renders bell button with aria-expanded=false when closed", () => {
      render(<NotificationCenter />);
      const bellButton = screen.getByRole("button", { name: "Notifications" });
      expect(bellButton).toBeInTheDocument();
      expect(bellButton).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByTestId("unread-badge")).not.toBeInTheDocument();
      expect(screen.queryByTestId("notification-panel")).not.toBeInTheDocument();
    });

    it("displays unread count badge and updates aria-label when unreadCount > 0", () => {
      mockStoreData.unreadCount = 5;
      render(<NotificationCenter />);

      const bellButton = screen.getByRole("button", { name: /Notifications, 5 unread/i });
      expect(bellButton).toBeInTheDocument();

      const badge = screen.getByTestId("unread-badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("5");
    });

    it("displays 99+ when unreadCount exceeds 99", () => {
      mockStoreData.unreadCount = 150;
      render(<NotificationCenter />);

      const badge = screen.getByTestId("unread-badge");
      expect(badge).toHaveTextContent("99+");
    });
  });

  describe("Panel opening, empty state, and closing", () => {
    it("opens panel and calls markAllRead when bell button is clicked", () => {
      mockStoreData.unreadCount = 2;
      render(<NotificationCenter />);

      const bellButton = screen.getByRole("button", { name: /Notifications, 2 unread/i });
      fireEvent.click(bellButton);

      expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("notification-panel")).toBeInTheDocument();
      expect(bellButton).toHaveAttribute("aria-expanded", "true");
    });

    it("displays empty state message when there are no notifications", () => {
      mockStoreData.notifications = [];
      render(<NotificationCenter defaultOpen={true} />);

      expect(screen.getByTestId("empty-notifications")).toHaveTextContent("No notifications yet");
      expect(screen.queryByTestId("clear-all-button")).not.toBeInTheDocument();
      expect(screen.getByText(/Local session only · last 0 events/i)).toBeInTheDocument();
    });

    it("closes panel when clicking outside", () => {
      render(
        <div>
          <div data-testid="outside-element">Outside</div>
          <NotificationCenter defaultOpen={true} />
        </div>
      );

      expect(screen.getByTestId("notification-panel")).toBeInTheDocument();
      fireEvent.mouseDown(screen.getByTestId("outside-element"));
      expect(screen.queryByTestId("notification-panel")).not.toBeInTheDocument();
    });

    it("closes panel and restores focus to bell button on Escape key", () => {
      render(<NotificationCenter defaultOpen={true} />);

      const bellButton = screen.getByTestId("notification-bell-button");
      const focusSpy = vi.spyOn(bellButton, "focus");

      expect(screen.getByTestId("notification-panel")).toBeInTheDocument();
      fireEvent.keyDown(document, { key: "Escape" });

      expect(screen.queryByTestId("notification-panel")).not.toBeInTheDocument();
      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe("Notification items list and actions", () => {
    const mockNotifications: AppNotification[] = [
      {
        id: "notif-1",
        message: "Transaction registered on Soroban network",
        timestamp: Date.now() - 30000, // 30s ago
        read: false,
        toStatus: "pending" as any,
      },
      {
        id: "notif-2",
        message: "Transaction COMPLETED successfully",
        timestamp: Date.now() - 120000, // 2m ago
        read: true,
        toStatus: "completed" as any,
      },
    ];

    it("renders list of notification items and footer event summary", () => {
      mockStoreData.notifications = mockNotifications;
      render(<NotificationCenter defaultOpen={true} />);

      expect(screen.getByText("NOTIFICATIONS")).toBeInTheDocument();
      expect(screen.getByTestId("clear-all-button")).toBeInTheDocument();

      const items = screen.getAllByTestId("notification-item");
      expect(items.length).toBe(2);
      expect(screen.getByText("Transaction registered on Soroban network")).toBeInTheDocument();
      expect(screen.getByText("Transaction COMPLETED successfully")).toBeInTheDocument();
      expect(screen.getByText(/Local session only · last 2 events/i)).toBeInTheDocument();
    });

    it("calls clearAll when CLEAR ALL button is clicked", () => {
      mockStoreData.notifications = mockNotifications;
      render(<NotificationCenter defaultOpen={true} />);

      const clearAllBtn = screen.getByTestId("clear-all-button");
      fireEvent.click(clearAllBtn);

      expect(mockClearAll).toHaveBeenCalledTimes(1);
    });

    it("calls dismiss with notification ID when item dismiss button is clicked", () => {
      mockStoreData.notifications = mockNotifications;
      render(<NotificationCenter defaultOpen={true} />);

      const dismissButtons = screen.getAllByRole("button", { name: "Dismiss notification" });
      expect(dismissButtons.length).toBe(2);

      fireEvent.click(dismissButtons[0]!);
      expect(mockDismiss).toHaveBeenCalledWith("notif-1");
    });
  });
});
