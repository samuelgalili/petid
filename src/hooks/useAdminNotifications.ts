import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "./useAdmin";

export const useAdminNotifications = () => {
  const { toast } = useToast();
  const { isAdmin, loading: isLoading } = useAdmin();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    // Don't set up subscription while loading or if not admin
    if (isLoading || isAdmin !== true) {
      return;
    }

    // Prevent duplicate subscriptions
    if (channelRef.current) {
      return;
    }

    // Stop retrying after max attempts
    if (retryCount >= maxRetries) {
      return;
    }

    const channel = supabase
      .channel("admin-order-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const newOrder = payload.new as any;
          toast({
            title: "🎉 הזמנה חדשה!",
            description: `הזמנה #${newOrder.id?.slice(0, 8)} - סה"כ: ₪${parseFloat(newOrder.total || 0).toFixed(2)}`,
            duration: 5000,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const updatedOrder = payload.new as any;
          const oldOrder = payload.old as any;

          // Only notify if status changed
          if (updatedOrder.status !== oldOrder.status) {
            const statusEmojis: Record<string, string> = {
              pending: "⏳",
              processing: "🔄",
              shipped: "🚚",
              delivered: "✅",
              cancelled: "❌",
            };

            toast({
              title: `${statusEmojis[updatedOrder.status] || "📦"} סטטוס הזמנה עודכן`,
              description: `הזמנה #${updatedOrder.id?.slice(0, 8)} - ${updatedOrder.status}`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Silently handle subscription failures - realtime may not be enabled for this table
          setRetryCount(prev => prev + 1);
          if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
          }
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isAdmin, isLoading, toast, retryCount]);
};
