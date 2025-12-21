import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

interface ActivityStatusProps {
  userId: string;
  showText?: boolean;
  className?: string;
}

export const ActivityStatus = ({ userId, showText = true, className = "" }: ActivityStatusProps) => {
  const [status, setStatus] = useState<{
    isActive: boolean;
    lastActive: string | null;
    showStatus: boolean;
  }>({
    isActive: false,
    lastActive: null,
    showStatus: true
  });

  useEffect(() => {
    fetchStatus();
  }, [userId]);

  const fetchStatus = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('last_active_at, show_activity_status')
        .eq('id', userId)
        .single();

      if (data) {
        const lastActive = data.last_active_at ? new Date(data.last_active_at) : null;
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        setStatus({
          isActive: lastActive ? lastActive > fiveMinutesAgo : false,
          lastActive: data.last_active_at,
          showStatus: data.show_activity_status ?? true
        });
      }
    } catch (error) {
      console.error("Error fetching activity status:", error);
    }
  };

  if (!status.showStatus) return null;

  const getStatusText = () => {
    if (status.isActive) return "פעיל/ה עכשיו";
    if (!status.lastActive) return null;
    
    return `פעיל/ה ${formatDistanceToNow(new Date(status.lastActive), { 
      addSuffix: false, 
      locale: he 
    })}`;
  };

  const statusText = getStatusText();

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${
        status.isActive 
          ? "bg-green-500 animate-pulse" 
          : "bg-muted-foreground/50"
      }`} />
      {showText && statusText && (
        <span className="text-xs text-muted-foreground">{statusText}</span>
      )}
    </div>
  );
};

// Hook to update current user's activity status
export const useActivityStatus = () => {
  const updateActivity = async (userId: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error("Error updating activity status:", error);
    }
  };

  return { updateActivity };
};