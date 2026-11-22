"use client";

import { useState } from "react";
import { AMBER, BG1, BORDER, DIM, MONO } from "@/lib/constants";
import { useNotifications } from "@/lib/notifications/NotificationStore";
import { NotificationItem } from "./NotificationItem";

export function NotificationCenter() {
  const { notifications, unreadCount, markAllRead, dismiss, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        style={{ background: "none", border: `1px solid ${BORDER}`, color: DIM, cursor: "pointer", fontFamily: MONO, fontSize: 10, padding: "4px 6px", position: "relative" }}
      >
        🔔
        {unreadCount > 0 && (
          <span data-testid="notification-badge" style={{ position: "absolute", top: -4, right: -4, minWidth: 14, height: 14, borderRadius: 7, background: AMBER, color: BG1, fontSize: 8, fontFamily: MONO, lineHeight: "14px", textAlign: "center" }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div role="region" aria-label="Notifications" style={{ position: "absolute", top: "100%", right: 0, width: 300, maxHeight: 360, overflowY: "auto", background: BG1, border: `1px solid ${BORDER}`, zIndex: 50 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderBottom: `1px solid ${BORDER}` }}>
            <button onClick={markAllRead} disabled={unreadCount === 0} style={{ background: "none", border: "none", color: DIM, cursor: "pointer", fontFamily: MONO, fontSize: 9 }}>
              Mark all read
            </button>
            <button onClick={clearAll} disabled={notifications.length === 0} style={{ background: "none", border: "none", color: DIM, cursor: "pointer", fontFamily: MONO, fontSize: 9 }}>
              Clear all
            </button>
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: "16px 14px", fontSize: 9, color: DIM, fontFamily: MONO }}>No notifications</div>
          ) : (
            <div role="list">
              {notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} onDismiss={dismiss} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
