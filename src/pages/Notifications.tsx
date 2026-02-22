/**
 * Premium Notification Center
 * Luxury inbox with glassmorphism cards, pet grouping, actionable items,
 * and a sleeping pet empty state.
 */
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, Syringe, ShoppingBag, Shield, Heart, Bell,
  PawPrint, UserPlus, MessageCircle, Sparkles, CheckCheck, Dog, Cat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { isToday, isYesterday, isThisWeek } from "date-fns";
import { timeAgo } from "@/utils/timeAgo";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useOverlayNav } from "@/contexts/OverlayNavContext";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SEO } from "@/components/SEO";
import { haptic } from "@/lib/haptics";

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
    pet_avatar?: string;
    pet_type?: string;
    product_id?: string;
    trigger?: string;
    [key: string]: any;
  };
}

type FilterTab = "all" | "social" | "care" | "shop";

const FILTER_TABS: { key: FilterTab; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "הכל", icon: Bell },
  { key: "social", label: "חברתי", icon: Heart },
  { key: "care", label: "טיפול", icon: PawPrint },
  { key: "shop", label: "חנות", icon: ShoppingBag },
];

const getCategoryMeta = (category?: string, type?: string) => {
  const t = category || type || "";
  if (t === "follow" || t === "new_follower") return { icon: UserPlus, gradient: "from-violet-500/20 to-fuchsia-500/20", accent: "text-violet-500" };
  if (t === "like" || t === "paw") return { icon: Heart, gradient: "from-rose-500/20 to-pink-500/20", accent: "text-rose-500" };
  if (t === "comment" || t === "message") return { icon: MessageCircle, gradient: "from-sky-500/20 to-blue-500/20", accent: "text-sky-500" };
  if (t === "medical" || t === "care") return { icon: Syringe, gradient: "from-emerald-500/20 to-teal-500/20", accent: "text-emerald-500" };
  if (t === "insurance") return { icon: Shield, gradient: "from-blue-500/20 to-indigo-500/20", accent: "text-blue-500" };
  if (t === "shop" || t === "product" || t === "scientist") return { icon: Sparkles, gradient: "from-amber-500/20 to-orange-500/20", accent: "text-amber-500" };
  return { icon: Bell, gradient: "from-primary/20 to-primary/10", accent: "text-primary" };
};

const filterMatch = (n: NotificationItem, tab: FilterTab) => {
  if (tab === "all") return true;
  const t = n.category || n.type || "";
  if (tab === "social") return ["follow", "new_follower", "like", "paw", "comment", "message"].includes(t);
  if (tab === "care") return ["medical", "care", "insurance", "vaccination"].includes(t);
  if (tab === "shop") return ["shop", "product", "scientist", "order"].includes(t);
  return true;
};

/* ══════════ Main Component ══════════ */
const Notifications = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { openPublicPet } = useOverlayNav();
  const {
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
  } = useRealtimeNotifications();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

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

    if (!error) {
      setNotifications((data || []) as unknown as NotificationItem[]);
      if (data && data.length > 0) markAllNotificationsAsRead();
    }
    setLoading(false);
  };

  const handleFollowBack = async (userId: string) => {
    if (!user) return;
    haptic("success");
    await supabase.from("user_follows").insert({ follower_id: user.id, following_id: userId });
  };

  const filtered = useMemo(
    () => notifications.filter((n) => filterMatch(n, activeFilter)),
    [notifications, activeFilter],
  );

  // Group by time
  const groups = useMemo(() => {
    const today: NotificationItem[] = [];
    const yesterday: NotificationItem[] = [];
    const week: NotificationItem[] = [];
    const older: NotificationItem[] = [];
    filtered.forEach((n) => {
      const d = new Date(n.created_at);
      if (isToday(d)) today.push(n);
      else if (isYesterday(d)) yesterday.push(n);
      else if (isThisWeek(d)) week.push(n);
      else older.push(n);
    });
    return [
      { label: "היום", items: today },
      { label: "אתמול", items: yesterday },
      { label: "השבוע", items: week },
      { label: "מוקדם יותר", items: older },
    ].filter((g) => g.items.length > 0);
  }, [filtered]);

  /* ── Handle notification tap ── */
  const handleTap = (n: NotificationItem) => {
    haptic("light");
    markNotificationAsRead(n.id);

    const t = n.category || n.type || "";

    // Follow → open public pet profile
    if ((t === "follow" || t === "new_follower") && n.data?.pet_id) {
      openPublicPet(n.data.pet_id);
      return;
    }
    // Follower without pet → user profile
    if ((t === "follow" || t === "new_follower") && n.data?.user_id) {
      navigate(`/user/${n.data.user_id}`);
      return;
    }
    // Scientist / product → shop product
    if ((t === "scientist" || t === "product" || t === "shop") && n.data?.product_id) {
      navigate(`/product/${n.data.product_id}`);
      return;
    }
    // Post-related
    if (n.data?.post_id) {
      navigate(`/post/${n.data.post_id}`);
      return;
    }
    // Pet-related
    if (n.data?.pet_id) {
      openPublicPet(n.data.pet_id);
      return;
    }
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="px-4 py-5">
          <Skeleton className="h-7 w-28 mb-4" />
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-16 rounded-full" />)}
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="w-12 h-12 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden" dir="rtl">
      <SEO title="התראות" description="מרכז ההתראות שלכם" url="/notifications" noIndex />

      <div className="h-full overflow-y-auto pb-[80px]">
        {/* ── Header ── */}
        <motion.div
          className="sticky top-0 z-20 bg-background/80 backdrop-blur-2xl border-b border-border/20"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-xl hover:bg-muted/60 transition-all active:scale-95"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
              <h1 className="text-lg font-bold text-foreground">התראות</h1>
            </div>

            {notifications.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { haptic("light"); markAllNotificationsAsRead(); }}
                className="flex items-center gap-1.5 text-xs font-medium text-primary px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                סמן הכל
              </motion.button>
            )}
          </div>

          {/* ── Filter Pills ── */}
          <div className="max-w-lg mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {FILTER_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeFilter === tab.key;
              return (
                <motion.button
                  key={tab.key}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => { haptic("selection"); setActiveFilter(tab.key); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-muted/40 backdrop-blur-md text-muted-foreground hover:bg-muted/60 border border-border/20"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={isActive ? 2.2 : 1.5} />
                  {tab.label}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Notification List ── */}
        <div className="max-w-lg mx-auto px-4 pt-3">
          {groups.length === 0 ? (
            <EmptyState />
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-5">
                <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider mb-2 px-1">
                  {group.label}
                </p>
                <div className="space-y-2">
                  {group.items.map((n, i) => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      index={i}
                      onTap={handleTap}
                      onFollowBack={handleFollowBack}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

/* ══════════ Notification Card ══════════ */
function NotificationCard({
  notification: n,
  index,
  onTap,
  onFollowBack,
}: {
  notification: NotificationItem;
  index: number;
  onTap: (n: NotificationItem) => void;
  onFollowBack: (userId: string) => void;
}) {
  const meta = getCategoryMeta(n.category, n.type);
  const CatIcon = meta.icon;
  const isFollowType = n.type === "follow" || n.type === "new_follower";
  const hasPet = !!n.data?.pet_name;
  const PetIcon = n.data?.pet_type === "cat" ? Cat : Dog;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onTap(n)}
      className={`relative flex items-start gap-3 p-3.5 rounded-2xl cursor-pointer transition-all
        bg-gradient-to-br ${meta.gradient} backdrop-blur-xl
        border border-white/10 dark:border-white/5
        ${!n.is_read ? "shadow-md shadow-primary/10" : "opacity-80"}
      `}
    >
      {/* Unread dot */}
      {!n.is_read && (
        <span className="absolute top-3 left-3 w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/50" />
      )}

      {/* Avatar / Icon */}
      {n.data?.user_avatar ? (
        <div className="relative shrink-0">
          <Avatar className="w-12 h-12 border-2 border-background/50">
            <AvatarImage src={n.data.user_avatar} />
            <AvatarFallback className="bg-muted text-sm font-medium">
              {n.data.user_name?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          {/* Pet badge */}
          {hasPet && n.data?.pet_avatar && (
            <Avatar className="absolute -bottom-1 -right-1 w-5 h-5 border border-background">
              <AvatarImage src={n.data.pet_avatar} />
              <AvatarFallback className="bg-muted">
                <PetIcon className="w-3 h-3" />
              </AvatarFallback>
            </Avatar>
          )}
          {hasPet && !n.data?.pet_avatar && (
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center">
              <PetIcon className="w-3 h-3 text-muted-foreground" />
            </span>
          )}
        </div>
      ) : (
        <div className={`w-12 h-12 rounded-2xl bg-background/60 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/10`}>
          <CatIcon className={`w-5 h-5 ${meta.accent}`} strokeWidth={1.5} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm text-foreground leading-relaxed">
          {n.data?.user_name && (
            <span className="font-bold">{n.data.user_name} </span>
          )}
          <span className="text-foreground/80">{n.message}</span>
        </p>

        {/* Pet context line */}
        {hasPet && (
          <p className="text-xs text-muted-foreground/70 mt-0.5 flex items-center gap-1">
            <PawPrint className="w-3 h-3" />
            {n.data!.pet_name}
          </p>
        )}

        <span className="text-[11px] text-muted-foreground/50 mt-1 block">
          {timeAgo(n.created_at)}
        </span>
      </div>

      {/* Action / Thumbnail */}
      {isFollowType ? (
        <Button
          size="sm"
          className="rounded-xl px-4 h-8 text-xs font-bold bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 self-center shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            if (n.data?.user_id) onFollowBack(n.data.user_id);
          }}
        >
          עקוב
        </Button>
      ) : n.data?.post_image ? (
        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 self-center border border-white/10">
          <img src={n.data.post_image} alt="" className="w-full h-full object-cover" />
        </div>
      ) : null}
    </motion.div>
  );
}

/* ══════════ Empty State — Sleeping Pet ══════════ */
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="flex flex-col items-center justify-center py-24 px-6"
    >
      {/* Sleeping pet illustration */}
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative mb-6"
      >
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-muted/80 to-muted/40 backdrop-blur-xl flex items-center justify-center border border-border/20">
          <span className="text-6xl select-none">🐾</span>
        </div>
        {/* Zzz */}
        <motion.span
          animate={{ opacity: [0, 1, 0], y: [0, -12, -24] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
          className="absolute -top-2 -left-1 text-lg text-muted-foreground/40 font-bold"
        >
          z
        </motion.span>
        <motion.span
          animate={{ opacity: [0, 1, 0], y: [0, -10, -20] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 1.2 }}
          className="absolute -top-4 left-4 text-sm text-muted-foreground/30 font-bold"
        >
          z
        </motion.span>
        <motion.span
          animate={{ opacity: [0, 1, 0], y: [0, -8, -16] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 1.8 }}
          className="absolute -top-1 left-8 text-xs text-muted-foreground/20 font-bold"
        >
          z
        </motion.span>
      </motion.div>

      <h3 className="text-lg font-bold text-foreground mb-1.5">הכל שקט לעת עתה</h3>
      <p className="text-sm text-muted-foreground/60 text-center leading-relaxed max-w-[240px]">
        תהנו מהשקט! התראות חדשות יופיעו כאן ברגע שיגיעו 🌙
      </p>
    </motion.div>
  );
}

export default Notifications;
