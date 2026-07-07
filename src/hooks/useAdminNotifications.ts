import { useCallback, useState } from "react";

export interface AdminAlert {
  id: string;
  title: string;
  description: string | null;
  category: string;
  alert_type: string;
  is_read: boolean;
  created_at: string;
  metadata: unknown;
}

export const useAdminNotifications = () => {
  const [notifications, setNotifications] = useState<AdminAlert[]>([]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    unreadCount: notifications.filter((item) => !item.is_read).length,
    markAsRead,
    markAllAsRead,
  };
};
