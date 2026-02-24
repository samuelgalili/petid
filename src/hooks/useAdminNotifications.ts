import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "./useAdmin";
import { useNavigate } from "react-router-dom";

export interface AdminAlert {
  id: string;
  title: string;
  description: string | null;
  category: string;
  alert_type: string;
  is_read: boolean;
  created_at: string;
  metadata: any;
}

export const useAdminNotifications = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin, loading: isLoading } = useAdmin();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [notifications, setNotifications] = useState<AdminAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch initial state
  useEffect(() => {
    if (isLoading || isAdmin !== true) return;

    const fetchAlerts = async () => {
      const { data } = await supabase
        .from("admin_data_alerts")
        .select("*")
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (data) {
        setNotifications(data as AdminAlert[]);
        setUnreadCount(data.length);
      }
    };

    fetchAlerts();
  }, [isAdmin, isLoading]);

  // Realtime subscription
  useEffect(() => {
    if (isLoading || isAdmin !== true) return;
    if (channelRef.current) return;

    const channel = supabase
      .channel("admin-alerts-subscription")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_data_alerts" },
        (payload) => {
          const newAlert = payload.new as AdminAlert;
          
          setNotifications(prev => [newAlert, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Determine link based on category
          let link = "/admin/notifications";
          if (newAlert.category === 'insurance') link = "/admin/pet-services";
          if (newAlert.category === 'moderation') link = "/admin/reports";
          if (newAlert.category === 'adoption') link = "/admin/adoption";
          if (newAlert.category === 'sales') link = "/admin/orders";

          toast({
            title: newAlert.title,
            description: newAlert.description,
            duration: 5000,
            onClick: () => navigate(link),
          });
          
          // Play notification sound
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {});
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

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));

    await supabase
      .from("admin_data_alerts")
      .update({ is_read: true })
      .eq("id", id);
  };

  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications([]);
    setUnreadCount(0);

    await supabase
      .from("admin_data_alerts")
      .update({ is_read: true })
      .eq("is_read", false);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
};
