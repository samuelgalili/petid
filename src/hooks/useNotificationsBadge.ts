import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { getMyUnreadNotificationCount } from "@/lib/mipoApi";

export const useNotificationsBadge = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setUnreadCount(await getMyUnreadNotificationCount());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();

    const handleChange = () => fetchUnreadCount();
    window.addEventListener("mipo:notifications-changed", handleChange);
    const interval = window.setInterval(fetchUnreadCount, 30000);

    return () => {
      window.removeEventListener("mipo:notifications-changed", handleChange);
      window.clearInterval(interval);
    };
  }, [fetchUnreadCount]);

  return { unreadCount, loading };
};
