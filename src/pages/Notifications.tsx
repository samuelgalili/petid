import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { ChevronRight, Syringe, ShoppingBag, Shield, Heart, Bell, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { isToday, isYesterday, isThisWeek } from "date-fns";
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
  category?: string;
  data?: {
    user_id?: string;
    user_name?: string;
    user_avatar?: string;
    post_id?: string;
    post_image?: string;
    pet_id?: string;
    pet_name?: string;
    trigger?: string;
    [key: string]: any;
  };
}

type FilterTab = 'all' | 'care' | 'shop' | 'insurance';

const FILTER_TABS: { key: FilterTab; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'all', label: 'הכל', icon: Inbox, color: 'text-foreground' },
  { key: 'care', label: 'טיפול', icon: Heart, color: 'text-pink-500' },
  { key: 'shop', label: 'חנות', icon: ShoppingBag, color: 'text-amber-500' },
  { key: 'insurance', label: 'ביטוח', icon: Shield, color: 'text-blue-500' },
];

const getCategoryIcon = (category?: string, type?: string) => {
  switch (category || type) {
    case 'medical': return { icon: Syringe, color: 'text-red-500', bg: 'bg-red-500/10' };
    case 'insurance': return { icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10' };
    case 'shop': return { icon: ShoppingBag, color: 'text-amber-500', bg: 'bg-amber-500/10' };
    case 'care': return { icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/10' };
    default: return { icon: Bell, color: 'text-primary', bg: 'bg-primary/10' };
  }
};

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
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
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
      console.error("Error fetching notifications:", error);
      toast({ title: "שגיאה", description: "לא ניתן לטעון התראות", variant: "destructive" });
    } else {
      setNotifications((data || []) as unknown as NotificationItem[]);
      if (data && data.length > 0) markAllNotificationsAsRead();
    }
    setLoading(false);
  };

  const handleFollowBack = async (userId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("user_follows")
      .insert({ follower_id: user.id, following_id: userId });
    if (!error) toast({ description: "עוקב בהצלחה" });
  };

  const getTimeAgo = (date: string) => timeAgo(date);

  // Filter notifications by active tab
  const filteredNotifications = activeFilter === 'all'
    ? notifications
    : notifications.filter(n => {
        const cat = n.category || n.type;
        if (activeFilter === 'care') return cat === 'care' || cat === 'medical';
        return cat === activeFilter;
      });

  // Group by time period
  const groupNotifications = () => {
    const today: NotificationItem[] = [];
    const yesterday: NotificationItem[] = [];
    const thisWeek: NotificationItem[] = [];
    const older: NotificationItem[] = [];

    filteredNotifications.forEach((notification) => {
      const date = new Date(notification.created_at);
      if (isToday(date)) today.push(notification);
      else if (isYesterday(date)) yesterday.push(notification);
      else if (isThisWeek(date)) thisWeek.push(notification);
      else older.push(notification);
    });

    return { today, yesterday, thisWeek, older };
  };

  const { today, yesterday, thisWeek, older } = groupNotifications();

  const NotificationRow = ({ notification }: { notification: NotificationItem }) => {
    const isFollowType = notification.type === "follow" || notification.type === "new_follower";
    const hasPostImage = notification.data?.post_image;
    const hasUserAvatar = notification.data?.user_avatar;
    const catInfo = getCategoryIcon(notification.category, notification.type);
    const CatIcon = catInfo.icon;

    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={`flex items-center gap-3 py-3 px-4 hover:bg-muted/30 transition-colors cursor-pointer ${!notification.is_read ? 'bg-primary/5' : ''}`}
        onClick={() => {
          if (notification.data?.post_id) navigate(`/post/${notification.data.post_id}`);
          else if (notification.data?.user_id) navigate(`/user/${notification.data.user_id}`);
          else if (notification.data?.pet_id) navigate(`/pet/${notification.data.pet_id}`);
        }}
      >
        {hasUserAvatar ? (
          <Avatar className="w-11 h-11 shrink-0">
            <AvatarImage src={notification.data?.user_avatar} />
            <AvatarFallback className="bg-muted text-sm font-medium">
              {notification.data?.user_name?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className={`w-11 h-11 shrink-0 rounded-full ${catInfo.bg} flex items-center justify-center`}>
            <CatIcon className={`w-5 h-5 ${catInfo.color}`} strokeWidth={1.5} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground leading-snug">
            {notification.data?.user_name && (
              <span className="font-semibold">{notification.data.user_name} </span>
            )}
            <span className="text-foreground/90">{notification.message}</span>
            {" "}
            <span className="text-muted-foreground">{getTimeAgo(notification.created_at)}</span>
          </p>
        </div>

        {isFollowType ? (
          <Button
            size="sm"
            className="rounded-lg px-4 h-8 text-xs font-semibold bg-primary hover:bg-primary/90"
            onClick={(e) => {
              e.stopPropagation();
              if (notification.data?.user_id) handleFollowBack(notification.data.user_id);
            }}
          >
            עקוב בחזרה
          </Button>
        ) : hasPostImage ? (
          <div className="w-11 h-11 rounded-md overflow-hidden shrink-0">
            <img src={notification.data?.post_image} alt="" className="w-full h-full object-cover" />
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
        {/* Header */}
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

          {/* Category Filter Tabs */}
          <div className="max-w-lg mx-auto px-3 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
            {FILTER_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Notifications List */}
        <div className="pt-2">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <span className="text-4xl">❤️</span>
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-1">
                {activeFilter === 'all' ? 'אין התראות' : 'אין התראות בקטגוריה זו'}
              </h2>
              <p className="text-sm text-muted-foreground text-center">
                {activeFilter === 'all'
                  ? 'כשמישהו יאהב או יגיב על התוכן שלך, זה יופיע כאן'
                  : 'התראות חדשות יופיעו כאן בזמן אמת'}
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
