import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AdminNotification {
  id: string;
  type: 'order' | 'user' | 'alert' | 'system' | 'task' | 'lead';
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
  href?: string;
  data?: any;
}

export const useAdminNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();
    
    // Subscribe to realtime notifications
    const channel = supabase
      .channel('admin_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, (payload) => {
        const newNotification: AdminNotification = {
          id: payload.new.id,
          type: payload.new.type || 'system',
          title: payload.new.title,
          message: payload.new.message || '',
          read: false,
          timestamp: new Date(payload.new.created_at),
          data: payload.new.data,
        };
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      const mapped: AdminNotification[] = data.map(n => ({
        id: n.id,
        type: (n.type as AdminNotification['type']) || 'system',
        title: n.title,
        message: n.message || '',
        read: n.is_read || false,
        timestamp: new Date(n.created_at),
      }));
      setNotifications(mapped);
      setUnreadCount(mapped.filter(n => !n.read).length);
    }
  };

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(async () => {
    await supabase.from('notifications').delete().neq('id', '');
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    refresh: fetchNotifications,
  };
};
