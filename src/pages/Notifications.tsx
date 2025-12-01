import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Bell, Check, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

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
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) {
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן התראה",
        variant: "destructive",
      });
    } else {
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    }
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן התראות",
        variant: "destructive",
      });
    } else {
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      toast({
        title: "הצלחה",
        description: "כל ההתראות סומנו כנקראו",
      });
    }
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
      <div className="bg-gradient-to-r from-[#FFD700] via-[#FFED4E] to-[#FFC107] p-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-gray-900">התראות</h1>
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
            className="bg-white text-gray-900 hover:bg-gray-100 rounded-full font-bold"
          >
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
              className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${getNotificationColor(notification.type)} ${
                !notification.is_read ? "border-l-8" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1 text-right">
                    {notification.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2 text-right">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 text-right">
                    {format(new Date(notification.created_at), "dd/MM/yyyy HH:mm", { locale: he })}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => markAsRead(notification.id)}
                      className="hover:bg-green-100"
                    >
                      <Check className="w-5 h-5 text-green-600" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteNotification(notification.id)}
                    className="hover:bg-red-100"
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
