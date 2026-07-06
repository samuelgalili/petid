import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "./useAuth";
import {
  getMyNotifications,
  getMyUnreadNotificationCount,
  markAllMyNotificationsRead,
  markMyNotificationRead,
  type MipoNotification,
} from "@/lib/mipoApi";

export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<MipoNotification[]>([]);
  const [hasNewGlow, setHasNewGlow] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    setUnreadCount(await getMyUnreadNotificationCount());
  }, [user]);

  const refreshNotifications = useCallback(async ({ notifyNew = false } = {}) => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      seenIdsRef.current = new Set();
      return;
    }

    const result = await getMyNotifications({ limit: 100 });
    const incoming = result.notifications;
    if (notifyNew && seenIdsRef.current.size > 0) {
      const fresh = incoming.find((item) => !seenIdsRef.current.has(item.id));
      if (fresh) {
        toast.success(fresh.message, {
          description: fresh.title,
          duration: 5000,
        });
        setHasNewGlow(true);
        setTimeout(() => setHasNewGlow(false), 3000);
      }
    }

    seenIdsRef.current = new Set(incoming.map((item) => item.id));
    setNotifications(incoming);
    setUnreadCount(result.unread_count);
  }, [user]);

  useEffect(() => {
    refreshNotifications();

    const handleChange = () => refreshNotifications();
    window.addEventListener("mipo:notifications-changed", handleChange);

    const interval = window.setInterval(() => {
      refreshNotifications({ notifyNew: true });
    }, 30000);

    return () => {
      window.removeEventListener("mipo:notifications-changed", handleChange);
      window.clearInterval(interval);
    };
  }, [refreshNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    await markMyNotificationRead(notificationId, true);
    setNotifications((current) => current.map((item) => (
      item.id === notificationId ? { ...item, is_read: true } : item
    )));
    setUnreadCount((current) => Math.max(0, current - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await markAllMyNotificationsRead();
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    setUnreadCount(0);
  }, []);

  return {
    unreadCount,
    notifications,
    hasNewGlow,
    markAsRead,
    markAllAsRead,
    refreshUnreadCount,
    clearGlow: () => setHasNewGlow(false),
  };
};
