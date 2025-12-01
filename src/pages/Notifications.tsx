import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Bell, Check, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useAuth } from "@/hooks/useAuth";

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

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchNotifications();
  }, [user]);

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
        return "bg-gradient-to-r from-yellow-100 to-amber-100 border-[#FFD700]";
      case "success":
        return "bg-green-100 border-green-500";
      case "warning":
        return "bg-yellow-100 border-yellow-500";
      case "error":
        return "bg-red-100 border-red-500";
      default:
        return "bg-blue-100 border-blue-500";
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
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFD700] via-[#FFED4E] to-[#FFC107] p-6 pb-8 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-md">
              <Bell className="w-6 h-6 text-gray-900" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">התראות</h1>
              {unreadCount > 0 && (
                <p className="text-sm font-bold text-gray-700">{unreadCount} התראות חדשות</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full hover:bg-white/20"
          >
            <X className="w-6 h-6 text-gray-900" />
          </Button>
        </div>
        
        {notifications.some(n => !n.is_read) && (
          <Button
            onClick={markAllAsRead}
            className="bg-white text-gray-900 hover:bg-gray-100 rounded-full font-bold shadow-md"
          >
            <Check className="w-5 h-5 ml-2" />
            סמן הכל כנקרא
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 text-center"
          >
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">אין התראות</h2>
            <p className="text-gray-600">כל ההתראות שלך יופיעו כאן</p>
          </motion.div>
        ) : (
          notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white rounded-2xl p-4 shadow-md border-l-4 ${getNotificationColor(notification.type)} ${
                !notification.is_read ? "border-l-8 shadow-lg" : ""
              } hover:shadow-xl transition-shadow`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-2xl shadow-sm flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-gray-900 mb-1 text-right">
                      {notification.title}
                    </h3>
                    <p className="text-sm text-gray-700 font-semibold mb-2 text-right">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 font-semibold text-right">
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
                      className="hover:bg-green-100 rounded-full"
                    >
                      <Check className="w-5 h-5 text-green-600" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteNotification(notification.id)}
                    className="hover:bg-red-100 rounded-full"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
