import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "./useAdmin";
import { useNavigate } from "react-router-dom";

export interface AdminNotification {
  id: string;
  type: 'insurance' | 'report' | 'adoption' | 'order';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link: string;
  data?: any;
}

export const useAdminNotifications = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin, loading: isLoading } = useAdmin();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addNotification = (notification: AdminNotification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Play sound
    const audio = new Audio('/notification.mp3'); // We might need to add this file or use a browser sound
    audio.play().catch(e => console.log('Audio play failed', e));

    toast({
      title: notification.title,
      description: notification.message,
      duration: 5000,
      onClick: () => navigate(notification.link),
    });
  };

  useEffect(() => {
    if (isLoading || isAdmin !== true) return;
    if (channelRef.current) return;

    const channel = supabase
      .channel("admin-global-notifications")
      // Insurance Leads
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "insurance_leads" },
        (payload) => {
          const lead = payload.new as any;
          addNotification({
            id: `ins-${lead.id}`,
            type: 'insurance',
            title: "🛡️ פניית ביטוח חדשה",
            message: `${lead.pet_name} (${lead.pet_type === 'dog' ? 'כלב' : 'חתול'}) - ${lead.phone}`,
            timestamp: new Date(),
            read: false,
            link: "/admin/pet-services",
            data: lead
          });
        }
      )
      // Content Reports
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "content_reports" },
        (payload) => {
          const report = payload.new as any;
          addNotification({
            id: `rep-${report.id}`,
            type: 'report',
            title: "🚩 דיווח תוכן חדש",
            message: `סיבה: ${report.reason}`,
            timestamp: new Date(),
            read: false,
            link: "/admin/reports",
            data: report
          });
        }
      )
      // Adoption Requests
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "adoption_requests" },
        (payload) => {
          const request = payload.new as any;
          addNotification({
            id: `adopt-${request.id}`,
            type: 'adoption',
            title: "🐾 בקשת אימוץ חדשה",
            message: `${request.full_name} מתעניין/ת באימוץ`,
            timestamp: new Date(),
            read: false,
            link: "/admin/adoption",
            data: request
          });
        }
      )
      // Orders
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const order = payload.new as any;
          addNotification({
            id: `ord-${order.id}`,
            type: 'order',
            title: "🛍️ הזמנה חדשה",
            message: `הזמנה #${order.id.slice(0, 8)} על סך ₪${order.total}`,
            timestamp: new Date(),
            read: false,
            link: "/admin/orders",
            data: order
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isAdmin, isLoading, toast, navigate]);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification
  };
};
