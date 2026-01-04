import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Bell, Check, Trash2, Flame, Trophy, User, ChevronLeft, Star, Gift, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Progress } from "@/components/ui/progress";

const Notifications = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    unreadCount, 
    markAsRead: markNotificationAsRead, 
    markAllAsRead: markAllNotificationsAsRead 
  } = useRealtimeNotifications();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [activeChallenges, setActiveChallenges] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchNotifications();
    fetchProfileCompletion();
    fetchDailyStreak();
    fetchActiveChallenges();
  }, [user]);

  const fetchProfileCompletion = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, bio")
      .eq("id", user.id)
      .single();
    
    const { data: pets } = await supabase
      .from("pets")
      .select("id")
      .eq("user_id", user.id)
      .eq("archived", false);
    
    let completion = 0;
    if (profile?.full_name) completion += 25;
    if (profile?.avatar_url) completion += 25;
    if (profile?.bio) completion += 25;
    if (pets && pets.length > 0) completion += 25;
    
    setProfileCompletion(completion);
  };

  const fetchDailyStreak = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("daily_training_sessions")
      .select("streak_day")
      .eq("user_id", user.id)
      .order("session_date", { ascending: false })
      .limit(1)
      .single();
    
    setDailyStreak(data?.streak_day || 0);
  };

  const fetchActiveChallenges = async () => {
    const { data } = await supabase
      .from("challenges")
      .select("id, title_he, hashtag, participant_count")
      .eq("is_active", true)
      .order("participant_count", { ascending: false })
      .limit(2);
    
    setActiveChallenges(data || []);
  };

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
    }
    
    setLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    setNotifications(notifications.map(n => 
      n.id === notificationId ? { ...n, is_read: true } : n
    ));
  };

  const markAllAsRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    toast({
      title: "הצלחה",
      description: "כל ההתראות סומנו כנקראו",
    });
  };

  const deleteNotification = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) {
      toast({
        title: "שגיאה",
        description: "לא ניתן למחוק התראה",
        variant: "destructive",
      });
    } else {
      setNotifications(notifications.filter(n => n.id !== notificationId));
      toast({
        title: "הצלחה",
        description: "ההתראה נמחקה",
      });
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "story_view":
        return "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30";
      case "success":
        return "bg-green-500/10 border-green-500/30";
      case "warning":
        return "bg-amber-500/10 border-amber-500/30";
      case "error":
        return "bg-destructive/10 border-destructive/30";
      default:
        return "bg-primary/10 border-primary/30";
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "story_view":
        return "👁️";
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      default:
        return "🔔";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      <AppHeader 
        title="התראות" 
        showBackButton={true}
        showMenuButton={false}
        extraAction={notifications.some(n => !n.is_read) ? {
          icon: Check,
          onClick: markAllAsRead
        } : undefined}
      />
      
      <div className="px-4 pt-4 space-y-4">
        {/* Profile Completion CTA */}
        {profileCompletion < 100 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-4 border border-primary/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-sm">השלם את הפרופיל שלך</h3>
                <p className="text-xs text-muted-foreground">{profileCompletion}% הושלם</p>
              </div>
              <Button
                size="sm"
                variant="default"
                className="rounded-full text-xs"
                onClick={() => navigate("/edit-profile")}
              >
                השלם עכשיו
              </Button>
            </div>
            <Progress value={profileCompletion} className="h-2" />
          </motion.div>
        )}

        {/* Daily Streak CTA */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-2xl p-4 border border-amber-500/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground text-sm">סטריק יומי</h3>
              <p className="text-xs text-muted-foreground">
                {dailyStreak > 0 ? `${dailyStreak} ימים רצופים! 🔥` : "התחל את הסטריק שלך היום"}
              </p>
            </div>
            <div className="flex items-center gap-1 text-amber-500 font-bold text-lg">
              {dailyStreak}
              <Zap className="w-4 h-4" />
            </div>
          </div>
        </motion.div>

        {/* Active Challenges CTA */}
        {activeChallenges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 rounded-2xl p-4 border border-purple-500/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-sm">אתגרים פעילים</h3>
                <p className="text-xs text-muted-foreground">הצטרף ותזכה בנקודות</p>
              </div>
            </div>
            <div className="space-y-2">
              {activeChallenges.map((challenge) => (
                <div 
                  key={challenge.id}
                  className="flex items-center justify-between bg-card/50 rounded-xl p-3 cursor-pointer hover:bg-card transition-colors"
                  onClick={() => navigate("/")}
                >
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium">#{challenge.hashtag}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{challenge.participant_count} משתתפים</span>
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Rewards Progress CTA */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-2xl p-4 border border-emerald-500/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Gift className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground text-sm">תגמולים והטבות</h3>
              <p className="text-xs text-muted-foreground">צבור נקודות וקבל הטבות בלעדיות</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full text-xs border-emerald-500/30 text-emerald-600"
              onClick={() => navigate("/rewards")}
            >
              לתגמולים
            </Button>
          </div>
        </motion.div>

        {unreadCount > 0 && (
          <p className="text-sm font-semibold text-muted-foreground">{unreadCount} התראות חדשות</p>
        )}
      </div>

      {/* Notifications List */}
      <div className="p-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-card rounded-2xl p-8 text-center border border-border shadow-soft">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-primary" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">אין התראות</h2>
            <p className="text-muted-foreground text-sm">כל ההתראות שלך יופיעו כאן</p>
          </div>
        ) : (
          notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-card rounded-2xl p-4 border border-border shadow-soft ${
                !notification.is_read ? "border-r-4 border-r-primary" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-sm mb-1 text-right">
                      {notification.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2 text-right">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground text-right">
                      {format(new Date(notification.created_at), "dd/MM/yyyy HH:mm", { locale: he })}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 flex-shrink-0">
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => markAsRead(notification.id)}
                      className="rounded-full h-8 w-8"
                    >
                      <Check className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteNotification(notification.id)}
                    className="rounded-full h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" strokeWidth={1.5} />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Notifications;
