import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { he } from "date-fns/locale";
import { timeAgo } from "@/utils/timeAgo";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SEO } from "@/components/SEO";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: {
    user_id?: string;
    user_name?: string;
    user_avatar?: string;
    post_id?: string;
    post_image?: string;
  };
}

const Notifications = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { 
    markAsRead: markNotificationAsRead, 
    markAllAsRead: markAllNotificationsAsRead 
  } = useRealtimeNotifications();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchNotifications();
  }, [user, authLoading]);

  const fetchNotifications = async () => {
    setLoading(true);
    
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון התראות",
        variant: "destructive",
      });
    } else {
      setNotifications(data || []);
      // Mark all as read when viewing
      if (data && data.length > 0) {
        markAllNotificationsAsRead();
      }
    }
    
    setLoading(false);
  };

  const handleFollowBack = async (userId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from("user_follows")
      .insert({ follower_id: user.id, following_id: userId });
    
    if (!error) {
      toast({ description: "עוקב בהצלחה" });
    }
  };

  const getTimeAgo = (date: string) => timeAgo(date);

  // Group notifications by time period
  const groupNotifications = () => {
    const today: NotificationItem[] = [];
    const yesterday: NotificationItem[] = [];
    const thisWeek: NotificationItem[] = [];
    const older: NotificationItem[] = [];

    notifications.forEach((notification) => {
      const date = new Date(notification.created_at);
      if (isToday(date)) {
        today.push(notification);
      } else if (isYesterday(date)) {
        yesterday.push(notification);
      } else if (isThisWeek(date)) {
        thisWeek.push(notification);
      } else {
        older.push(notification);
      }
    });

    return { today, yesterday, thisWeek, older };
  };

  const { today, yesterday, thisWeek, older } = groupNotifications();

  const NotificationRow = ({ notification }: { notification: NotificationItem }) => {
    const isFollowType = notification.type === "follow" || notification.type === "new_follower";
    const hasPostImage = notification.data?.post_image;
    
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 py-3 px-4 hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => {
          if (notification.data?.post_id) {
            navigate(`/post/${notification.data.post_id}`);
          } else if (notification.data?.user_id) {
            navigate(`/user/${notification.data.user_id}`);
          }
        }}
      >
        {/* User Avatar */}
        <Avatar className="w-11 h-11 shrink-0">
          <AvatarImage src={notification.data?.user_avatar} />
          <AvatarFallback className="bg-muted text-sm font-medium">
            {notification.data?.user_name?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground leading-snug">
            <span className="font-semibold">{notification.data?.user_name || "משתמש"}</span>
            {" "}
            <span className="text-foreground/90">{notification.message}</span>
            {" "}
            <span className="text-muted-foreground">{getTimeAgo(notification.created_at)}</span>
          </p>
        </div>

        {/* Right side - Follow button or Post thumbnail */}
        {isFollowType ? (
          <Button
            size="sm"
            className="rounded-lg px-4 h-8 text-xs font-semibold bg-primary hover:bg-primary/90"
            onClick={(e) => {
              e.stopPropagation();
              if (notification.data?.user_id) {
                handleFollowBack(notification.data.user_id);
              }
            }}
          >
            עקוב בחזרה
          </Button>
        ) : hasPostImage ? (
          <div className="w-11 h-11 rounded-md overflow-hidden shrink-0">
            <img 
              src={notification.data?.post_image} 
              alt="" 
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}
      </motion.div>
    );
  };

  const NotificationSection = ({ title, items }: { title: string; items: NotificationItem[] }) => {
    if (items.length === 0) return null;
    
    return (
      <div className="mb-2">
        <h2 className="text-base font-semibold text-foreground px-4 py-3">{title}</h2>
        <div className="divide-y divide-border/30">
          {items.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} />
          ))}
        </div>
        <div className="h-px bg-border/50 mx-4" />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="px-4 py-4 border-b">
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="space-y-1 p-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="w-11 h-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="w-10 h-10 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden" dir="rtl">
      <SEO title="התראות" description="התראות ועדכונים על הפעילות שלכם" url="/notifications" noIndex={true} />
      <div className="h-full overflow-y-auto pb-[70px]">
      {/* Instagram-style Header */}
      <motion.div 
        className="sticky top-0 z-20 bg-background/98 backdrop-blur-xl border-b border-border/40"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-muted/60 transition-all active:scale-95"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">התראות</h1>
          </div>
        </div>
      </motion.div>

      {/* Notifications List - Grouped by Time */}
      <div className="pt-2">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-4xl">❤️</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">פעילות</h2>
            <p className="text-sm text-muted-foreground text-center">
              כשמישהו יאהב או יגיב על התוכן שלך, זה יופיע כאן
            </p>
          </div>
        ) : (
          <>
            <NotificationSection title="היום" items={today} />
            <NotificationSection title="אתמול" items={yesterday} />
            <NotificationSection title="השבוע" items={thisWeek} />
            <NotificationSection title="מוקדם יותר" items={older} />
          </>
        )}
      </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Notifications;
