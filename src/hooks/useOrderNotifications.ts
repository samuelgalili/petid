import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface OrderNotification {
  id: string;
  order_number: string;
  status: string;
  title: string;
  message: string;
  created_at: string;
}

/**
 * Hook for real-time order status notifications
 */
export const useOrderNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '📦';
      case 'shipped': return '🚚';
      case 'delivered': return '✅';
      case 'cancelled': return '❌';
      default: return '📋';
    }
  };

  const getStatusTitle = (status: string) => {
    switch (status) {
      case 'pending': return 'הזמנה ממתינה';
      case 'processing': return 'ההזמנה בהכנה';
      case 'shipped': return 'ההזמנה נשלחה!';
      case 'delivered': return 'ההזמנה נמסרה!';
      case 'cancelled': return 'ההזמנה בוטלה';
      default: return 'עדכון הזמנה';
    }
  };

  const showNotification = useCallback((notification: OrderNotification) => {
    const emoji = getStatusEmoji(notification.status);
    
    toast({
      title: `${emoji} ${notification.title}`,
      description: notification.message,
      duration: 5000,
    });

    // Also try to show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: notification.id,
      });
    }
  }, [toast]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to order changes for this user
    const channel = supabase
      .channel(`orders-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const order = payload.new as any;
          const oldOrder = payload.old as any;

          // Only notify if status changed
          if (order.status !== oldOrder.status) {
            const notification: OrderNotification = {
              id: order.id,
              order_number: order.order_number,
              status: order.status,
              title: getStatusTitle(order.status),
              message: `הזמנה ${order.order_number} - ${getStatusTitle(order.status)}`,
              created_at: new Date().toISOString(),
            };

            setNotifications(prev => [notification, ...prev].slice(0, 20));
            showNotification(notification);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, showNotification]);

  // Subscribe to notifications table for this user
  useEffect(() => {
    if (!user) return;

    const notificationsChannel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as any;
          
          if (notification.type === 'order_status') {
            toast({
              title: notification.title,
              description: notification.message,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
    };
  }, [user, toast]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  return {
    notifications,
    unreadCount: notifications.filter((n: any) => !n.read).length,
    clearNotifications,
    markAsRead,
  };
};

export default useOrderNotifications;
