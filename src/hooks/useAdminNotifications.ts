import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "./useAdmin";

export const useAdminNotifications = () => {
  const { toast } = useToast();
  const { isAdmin, loading: isLoading } = useAdmin();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Don't set up subscription while loading or if not admin
    if (isLoading || isAdmin !== true) {
      return;
    }

    // Prevent duplicate subscriptions
    if (channelRef.current) {
      return;
    }

    console.log("Admin notifications: Setting up realtime subscription");

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
          console.log("New order received:", payload);
          const newOrder = payload.new as any;
          toast({
            title: "🎉 New Order Received!",
            description: `Order #${newOrder.id.slice(0, 8)} - Total: ₪${parseFloat(newOrder.total).toFixed(2)}`,
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
          console.log("Order updated:", payload);
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
              title: `${statusEmojis[updatedOrder.status] || "📦"} Order Status Updated`,
              description: `Order #${updatedOrder.id.slice(0, 8)} is now ${updatedOrder.status}`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.log("Admin notifications subscription status:", status);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log("Admin notifications: Cleaning up realtime subscription");
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isAdmin, isLoading, toast]);
};
