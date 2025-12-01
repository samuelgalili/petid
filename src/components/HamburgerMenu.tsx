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
import { ProfileImageEditor } from "@/components/ProfileImageEditor";

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
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);

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
            className="fixed top-0 left-0 h-full w-[85vw] max-w-md bg-white z-[101] overflow-y-auto shadow-2xl"
          >
            {/* Header - Enhanced Golden Gradient */}
            <div className="bg-gradient-to-br from-[#FFD700] via-[#FFED4E] to-[#FFC107] p-6 pb-10 relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-black text-gray-900 font-jakarta">האזור האישי</h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="rounded-full hover:bg-white/30 transition-colors"
                    aria-label="Close menu"
                  >
                    <ChevronLeft className="w-6 h-6 text-gray-900" />
                  </Button>
                </div>

                {/* User Info */}
                {user ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="relative">
                      <Avatar className="w-16 h-16 border-3 border-white shadow-xl ring-2 ring-yellow-400/50">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-gray-900 to-gray-700 text-white font-black text-xl">
                          {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        onClick={() => setIsImageEditorOpen(true)}
                        className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all hover:scale-110 active:scale-95"
                      >
                        <Camera className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className="text-xl font-black text-gray-900 font-jakarta mb-1">
                        {profile?.full_name || "משתמש"}
                      </p>
                      <button
                        onClick={() => handleNavigation("/profile")}
                        className="text-sm text-gray-800 hover:text-gray-900 font-semibold font-jakarta flex items-center gap-1 transition-colors group"
                      >
                        <span className="group-hover:underline">הצג פרופיל</span>
                        <ChevronLeft className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <Button
                    onClick={() => handleNavigation("/auth")}
                    className="w-full bg-white text-gray-900 hover:bg-gray-50 rounded-2xl font-bold py-6 shadow-lg hover:shadow-xl transition-all"
                  >
                    התחבר / הירשם
                  </Button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5 bg-[#F5F5F5]">
              {/* חיות המחמד שלי */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <h2 className="text-lg font-black text-gray-900 mb-2 text-right font-jakarta">
                  חיות המחמד שלי
                </h2>
                <p className="text-sm text-gray-600 mb-3 text-right font-jakarta">
                  ניהול פרופילי חיות המחמד שלך
                </p>
                <button
                  onClick={() => handleNavigation("/add-pet")}
                  className="w-full bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-all flex items-center justify-between group hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-gray-900 font-bold font-jakarta">הוספת חיית מחמד</span>
                  </div>
                  <PawPrint className="w-6 h-6 text-[#FF6B6B] group-hover:scale-110 transition-transform" />
                </button>
              </motion.section>

              {/* קטגוריות ראשיות */}
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <button
                  onClick={() => handleNavigation("/notifications")}
                  className="w-full bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-all flex items-center justify-between group hover:scale-[1.02] active:scale-[0.98] relative"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center relative">
                      <Bell className="w-5 h-5 text-white" />
                      {unreadNotifications > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse ring-2 ring-white">
                          {unreadNotifications}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-900 font-bold font-jakarta">התראות</span>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => handleNavigation("/cart")}
                  className="w-full bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-all flex items-center justify-between group hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-gray-900 font-bold font-jakarta">עגלת קניות</span>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => handleNavigation("/order-history")}
                  className="w-full bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-all flex items-center justify-between group hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-gray-900 font-bold font-jakarta">ההזמנות שלי</span>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => handleNavigation("/rewards")}
                  className="w-full bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-all flex items-center justify-between group hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                      <Star className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-gray-900 font-bold font-jakarta">תגמולים ונקודות</span>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.section>

              {/* קישורים מהירים */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <h2 className="text-lg font-black text-gray-900 mb-3 text-right font-jakarta">
                  קישורים מהירים
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleNavigation("/photos")}
                    className="bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-all group hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 text-center font-jakarta">תמונות</p>
                  </button>

                  <button
                    onClick={() => handleNavigation("/documents")}
                    className="bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-all group hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <FileImage className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 text-center font-jakarta">מסמכים</p>
                  </button>

                  <button
                    onClick={() => handleNavigation("/insurance")}
                    className="bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-all group hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 text-center font-jakarta">ביטוח</p>
                  </button>

                  <button
                    onClick={() => handleNavigation("/adoption")}
                    className="bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-all group hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Heart className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 text-center font-jakarta">אימוץ</p>
                  </button>
                </div>
              </motion.section>

              {/* הגדרות */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <h2 className="text-lg font-black text-gray-900 mb-3 text-right font-jakarta">
                  הגדרות
                </h2>
                <button
                  onClick={() => handleNavigation("/settings")}
                  className="w-full bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-all flex items-center justify-between group hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-gray-900 font-bold font-jakarta">הגדרות</span>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => handleNavigation("/support")}
                  className="w-full bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-all flex items-center justify-between group hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                      <HelpCircle className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-gray-900 font-bold font-jakarta">תמיכה ועזרה</span>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.section>

              {/* Logout */}
              {user && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="pb-6 pt-2"
                >
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full bg-white rounded-2xl p-5 shadow-md hover:shadow-xl transition-all text-red-600 hover:text-red-700 hover:bg-red-50 justify-between text-base font-bold font-jakarta group hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <LogOut className="w-5 h-5 text-red-600" />
                      </div>
                      <span>התנתק מהחשבון</span>
                    </div>
                  </Button>
                  <p className="text-xs text-gray-400 text-center mt-6 font-jakarta">
                    Petid v1.0.0 • כל הזכויות שמורות
                  </p>
                </motion.section>
              )}
            </div>
          </motion.div>
        </>
      )}

      {/* Profile Image Editor */}
      <ProfileImageEditor
        isOpen={isImageEditorOpen}
        onClose={() => setIsImageEditorOpen(false)}
        currentImageUrl={profile?.avatar_url}
        onImageUpdated={(url) => {
          setProfile((prev: any) => ({ ...prev, avatar_url: url }));
        }}
      />
    </AnimatePresence>
  );
};
