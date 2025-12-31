import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ActivityStatusProps {
  userId: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ActivityStatus = ({ userId, showLabel = true, size = 'md' }: ActivityStatusProps) => {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3'
  };

  useEffect(() => {
    const fetchActivityStatus = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('last_seen_at, is_online')
          .eq('id', userId)
          .maybeSingle();

        if (profile) {
          setIsOnline(profile.is_online || false);
          setLastSeen(profile.last_seen_at ? new Date(profile.last_seen_at) : null);
        }
      } catch (error) {
        console.error('Error fetching activity status:', error);
      }
    };

    fetchActivityStatus();

    // Subscribe to changes
    const channel = supabase
      .channel(`activity-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload: any) => {
          if (payload.new) {
            setIsOnline(payload.new.is_online || false);
            setLastSeen(payload.new.last_seen_at ? new Date(payload.new.last_seen_at) : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const getLastSeenText = () => {
    if (!lastSeen) return '';
    
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'פעיל עכשיו';
    if (diffMins < 60) return `פעיל לפני ${diffMins} דקות`;
    if (diffHours < 24) return `פעיל לפני ${diffHours} שעות`;
    if (diffDays < 7) return `פעיל לפני ${diffDays} ימים`;
    return '';
  };

  // Check if recently active (within last 5 minutes)
  const isRecentlyActive = lastSeen && (new Date().getTime() - lastSeen.getTime()) < 300000;
  const showAsOnline = isOnline || isRecentlyActive;

  if (!showAsOnline && !showLabel) return null;

  return (
    <div className="flex items-center gap-1.5">
      <span 
        className={cn(
          "rounded-full",
          sizeClasses[size],
          showAsOnline 
            ? "bg-green-500 animate-pulse" 
            : "bg-muted-foreground/40"
        )}
      />
      {showLabel && showAsOnline && (
        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
          {getLastSeenText() || 'פעיל עכשיו'}
        </span>
      )}
    </div>
  );
};
