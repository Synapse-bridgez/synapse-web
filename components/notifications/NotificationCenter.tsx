"use client";

import { useEffect, useRef, useState } from "react";
import { announce } from "@/lib/a11y/announce";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { useNotifications } from "@/lib/notifications/NotificationStore";
import { BG1, BORDER, DIM, MONO } from "@/lib/constants";
import { NotificationItem } from "./NotificationItem";

export function NotificationCenter() {
  const t = useTranslations("Notifications");
  const { notifications, unreadCount, markAllRead, dismiss, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  // Seeded with the mount-time count so the initial render never announces.
  const previousUnread = useRef(unreadCount);

  useEffect(() => {
    if (unreadCount > previousUnread.current) {
      announce(unreadCount === 1 ? t("unreadOne") : t("unreadOther", { count: unreadCount }));
    }
    previousUnread.current = unreadCount;
  }, [unreadCount, t]);

  const toggle = () => {
    if (!open) markAllRead();
    setOpen(!open);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        style={{ background: "none", border: `1px solid ${BORDER}`, color: DIM, fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", padding: "4px 6px", cursor: "pointer" }}
      >
        {t("label")}
        {unreadCount > 0 && ` (${unreadCount})`}
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "100%", width: 300, maxHeight: 360, overflowY: "auto", background: BG1, border: `1px solid ${BORDER}`, zIndex: 50 }}>
          {notifications.length === 0 ? (
            <div style={{ padding: "10px 14px", fontSize: 10, color: DIM, fontFamily: MONO }}>{t("empty")}</div>
          ) : (
            <>
              <div role="list" aria-label={t("panelLabel")}>
                {notifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} onDismiss={dismiss} />
                ))}
              </div>
              <button type="button" onClick={clearAll} style={{ width: "100%", background: "none", border: "none", color: DIM, fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", padding: "8px 14px", cursor: "pointer", textAlign: "right" }}>
                {t("clear")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
