import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Heart,
  ShoppingCart,
  Bell,
  Package,
  Star,
  Grid3x3,
  Settings,
  HelpCircle,
  FileText,
  Info,
  Shield,
  LogOut,
  ChevronLeft,
  CreditCard,
  Lock,
  Store,
  Coffee,
  History,
  Plus,
  PawPrint,
  Camera,
  FileImage,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HamburgerMenu = ({ isOpen, onClose }: HamburgerMenuProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (isOpen) {
      supabase.auth.getUser().then(({ data }) => {
        setUser(data.user);
        if (data.user) {
          // Fetch profile
          supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single()
            .then(({ data: profileData }) => {
              setProfile(profileData);
            });
          
          // Fetch unread notifications count
          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", data.user.id)
            .eq("is_read", false)
            .then(({ count }) => {
              setUnreadNotifications(count || 0);
            });
        }
      });
    }
  }, [isOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "התנתקת בהצלחה",
      description: "נתראה בקרוב!",
    });
    navigate("/auth");
    onClose();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 z-[100]"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 left-0 h-full w-full max-w-[100vw] bg-[#F5F5F5] z-[101] overflow-y-auto"
          >
            {/* Header - Golden */}
            <div className="bg-gradient-to-r from-[#FFD700] via-[#FFED4E] to-[#FFC107] p-6 pb-8 relative">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-black text-gray-900">האזור האישי שלי</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-full hover:bg-white/20"
                  aria-label="Close menu"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-900" />
                </Button>
              </div>

              {/* User Info */}
              {user ? (
                <div className="flex items-center gap-3">
                  <Avatar className="w-14 h-14 border-2 border-white shadow-lg">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="bg-white text-gray-900 font-bold text-lg">
                      {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      {profile?.full_name || "משתמש"}
                    </p>
                    <button
                      onClick={() => handleNavigation("/settings")}
                      className="text-sm text-gray-700 hover:underline flex items-center gap-1"
                    >
                      עריכת פרטים &lt;
                    </button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => handleNavigation("/auth")}
                  className="w-full bg-white text-gray-900 hover:bg-gray-100 rounded-full font-bold py-6"
                >
                  התחבר / הירשם
                </Button>
              )}
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
              {/* חיות המחמד שלי */}
              <section>
                <h2 className="text-xl font-black text-gray-900 mb-3 text-right">
                  חיות המחמד שלי
                </h2>
                <div className="text-sm text-gray-600 mb-2 text-right">
                  ניתן להוסיף עד שלוש חיות מחמד
                </div>
                <button
                  onClick={() => handleNavigation("/add-pet")}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                >
                  <span className="text-[#2196F3] font-bold flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    הוספת חיית מחמד
                  </span>
                  <PawPrint className="w-6 h-6 text-[#FF6B6B]" />
                </button>
              </section>

              {/* התראות */}
              <section>
                <h2 className="text-xl font-black text-gray-900 mb-3 text-right">
                  התראות
                </h2>
                <button
                  onClick={() => handleNavigation("/notifications")}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between relative"
                >
                  <span className="text-gray-900 font-semibold">ההתראות שלי</span>
                  <div className="relative">
                    <Bell className="w-6 h-6 text-[#FF9800]" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadNotifications}
                      </span>
                    )}
                  </div>
                </button>
              </section>

              {/* תשלום ואבטחה */}
              <section>
                <h2 className="text-xl font-black text-gray-900 mb-3 text-right">
                  תשלום ואבטחה
                </h2>
                <div className="space-y-3">
                  <button
                    onClick={() => handleNavigation("/payment-methods")}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                  >
                    <span className="text-gray-900 font-semibold">ניהול אמצעי תשלום</span>
                    <CreditCard className="w-6 h-6 text-[#FFC107]" />
                  </button>
                  <button
                    onClick={() => handleNavigation("/security")}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                  >
                    <span className="text-[#2196F3] font-bold flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      הוספת אמצעי הגנה
                    </span>
                    <Lock className="w-6 h-6 text-gray-600" />
                  </button>
                </div>
              </section>

              {/* החנות שלי */}
              <section>
                <h2 className="text-xl font-black text-gray-900 mb-3 text-right">
                  החנות שלי
                </h2>
                <button
                  onClick={() => handleNavigation("/shop")}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                >
                  <div className="text-right">
                    <p className="text-gray-900 font-bold">Petid Shop</p>
                    <p className="text-sm text-gray-600">חנות מוצרי חיות מחמד</p>
                  </div>
                  <ShoppingCart className="w-6 h-6 text-[#FF6B6B]" />
                </button>
              </section>

              {/* מועדון חברים שלי */}
              <section>
                <h2 className="text-xl font-black text-gray-900 mb-3 text-right">
                  מועדון חברים שלי
                </h2>
                <button
                  onClick={() => handleNavigation("/rewards")}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                >
                  <span className="text-[#2196F3] font-bold flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    אפשר להזמין אותך לתגמולים?
                  </span>
                  <Coffee className="w-6 h-6 text-[#795548]" />
                </button>
              </section>

              {/* ביטוח */}
              <section>
                <h2 className="text-xl font-black text-gray-900 mb-3 text-right">
                  ביטוח חיות מחמד
                </h2>
                <button
                  onClick={() => handleNavigation("/insurance")}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                >
                  <span className="text-gray-900 font-semibold">הביטוח שלי</span>
                  <Shield className="w-6 h-6 text-[#2196F3]" />
                </button>
              </section>

              {/* אימוץ */}
              <section>
                <h2 className="text-xl font-black text-gray-900 mb-3 text-right">
                  אימוץ חיות מחמד
                </h2>
                <button
                  onClick={() => handleNavigation("/adoption")}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                >
                  <span className="text-gray-900 font-semibold">מצא חבר חדש</span>
                  <Heart className="w-6 h-6 text-[#E91E63]" />
                </button>
              </section>

              {/* משימות */}
              <section>
                <h2 className="text-xl font-black text-gray-900 mb-3 text-right">
                  משימות יומיות
                </h2>
                <button
                  onClick={() => handleNavigation("/tasks")}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                >
                  <span className="text-gray-900 font-semibold">המשימות שלי</span>
                  <Star className="w-6 h-6 text-[#FFC107]" />
                </button>
              </section>

              {/* אלבום תמונות */}
              <section>
                <h2 className="text-xl font-black text-gray-900 mb-3 text-right">
                  אלבום תמונות
                </h2>
                <button
                  onClick={() => handleNavigation("/photos")}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                >
                  <span className="text-gray-900 font-semibold">התמונות שלי</span>
                  <Camera className="w-6 h-6 text-[#9C27B0]" />
                </button>
              </section>

              {/* מסמכים */}
              <section>
                <h2 className="text-xl font-black text-gray-900 mb-3 text-right">
                  מסמכים
                </h2>
                <button
                  onClick={() => handleNavigation("/documents")}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                >
                  <span className="text-gray-900 font-semibold">המסמכים שלי</span>
                  <FileImage className="w-6 h-6 text-[#FF9800]" />
                </button>
              </section>

              {/* היסטוריית רכישות */}
              <section>
                <h2 className="text-xl font-black text-gray-900 mb-3 text-right">
                  היסטוריית רכישות
                </h2>
                <button
                  onClick={() => handleNavigation("/order-history")}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                >
                  <span className="text-gray-900 font-semibold">ההזמנות שלי</span>
                  <History className="w-6 h-6 text-[#4CAF50]" />
                </button>
              </section>

              {/* הגדרות ועזרה */}
              <section>
                <h2 className="text-xl font-black text-gray-900 mb-3 text-right">
                  הגדרות ועזרה
                </h2>
                <div className="space-y-3">
                  <button
                    onClick={() => handleNavigation("/settings")}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                  >
                    <span className="text-gray-900 font-semibold">הגדרות</span>
                    <Settings className="w-6 h-6 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleNavigation("/support")}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                  >
                    <span className="text-gray-900 font-semibold">תמיכה ועזרה</span>
                    <HelpCircle className="w-6 h-6 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleNavigation("/faq")}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                  >
                    <span className="text-gray-900 font-semibold">שאלות נפוצות</span>
                    <FileText className="w-6 h-6 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleNavigation("/about")}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                  >
                    <span className="text-gray-900 font-semibold">אודות Petid</span>
                    <Info className="w-6 h-6 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleNavigation("/terms")}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                  >
                    <span className="text-gray-900 font-semibold">תנאים ופרטיות</span>
                    <Shield className="w-6 h-6 text-gray-600" />
                  </button>
                </div>
              </section>

              {/* Logout */}
              {user && (
                <section className="pb-6">
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow text-red-600 hover:text-red-700 hover:bg-red-50 justify-start text-base font-semibold"
                  >
                    <LogOut className="w-6 h-6 ml-3" />
                    התנתק
                  </Button>
                  <p className="text-xs text-gray-400 text-center mt-4">
                    Petid v1.0.0
                  </p>
                </section>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
