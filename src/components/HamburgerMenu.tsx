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
  Scissors,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SmartPanel } from "@/components/ui/smart-panel";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProfileImageEditor } from "@/components/ProfileImageEditor";
import { slideUp, ANIMATION_DURATION } from "@/lib/animations";
import { MICROCOPY, ARIA_LABELS } from "@/lib/microcopy";
import { getAccessibleButtonProps } from "@/lib/accessibility";

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
      title: MICROCOPY.success.profileUpdated,
      description: "נתראה בקרוב! 👋",
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
            className="fixed top-0 left-0 h-full w-[85vw] max-w-md bg-background z-[101] overflow-y-auto shadow-2xl"
            role="dialog"
            aria-label={ARIA_LABELS.menu}
          >
            {/* Header - Enhanced Golden Gradient */}
            <div className="bg-gradient-primary p-6 pb-10 relative overflow-hidden">
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
                      <Avatar className="w-16 h-16 border-3 border-white shadow-xl ring-2 ring-primary/50">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback className="bg-gradient-secondary text-white font-black text-xl">
                          {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        onClick={() => setIsImageEditorOpen(true)}
                        className="absolute bottom-0 right-0 w-7 h-7 bg-secondary rounded-full flex items-center justify-center shadow-lg hover:bg-secondary-dark transition-all hover:scale-110 active:scale-95"
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

            {/* Content - Smart Panels Organization */}
            <div className="p-5 space-y-4 bg-[#F5F5F5]">
              {/* My Pets - Smart Panel */}
              <motion.div
                variants={slideUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.15 }}
              >
                <SmartPanel
                  title="חיות המחמד שלי"
                  description="ניהול ומעקב אחר חיות המחמד"
                  icon={PawPrint}
                >
                  <SmartPanel.Item
                    icon={Plus}
                    label="הוספת חיית מחמד"
                    value="צור פרופיל חדש"
                    to="/add-pet"
                    variant="highlighted"
                  />
                </SmartPanel>
              </motion.div>

              {/* Primary Actions - Smart Panel */}
              <motion.div
                variants={slideUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
              >
                <SmartPanel title="פעולות מהירות" icon={Grid3x3}>
                  <SmartPanel.Item
                    icon={Bell}
                    label="התראות"
                    badge={unreadNotifications > 0 ? unreadNotifications : undefined}
                    to="/notifications"
                    variant={unreadNotifications > 0 ? "warning" : "default"}
                  />
                  <SmartPanel.Item
                    icon={ShoppingCart}
                    label="עגלת קניות"
                    value="מוצרים שנשמרו"
                    to="/cart"
                  />
                  <SmartPanel.Item
                    icon={Package}
                    label="ההזמנות שלי"
                    value="עקוב אחר משלוחים"
                    to="/order-history"
                  />
                  <SmartPanel.Item
                    icon={Star}
                    label="תגמולים ונקודות"
                    value="צבור והשתמש בנקודות"
                    to="/rewards"
                    variant="success"
                  />
                </SmartPanel>
              </motion.div>

              {/* Services - Smart Panel */}
              <motion.div
                variants={slideUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.25 }}
              >
                <SmartPanel title="שירותים" icon={Store}>
                  <SmartPanel.Item
                    icon={Shield}
                    label="ביטוח לחיות מחמד"
                    value="הגנה מקיפה"
                    to="/insurance"
                  />
                  <SmartPanel.Item
                    icon={Heart}
                    label="אימוץ"
                    value="מצא חבר חדש"
                    to="/adoption"
                  />
                  <SmartPanel.Item
                    icon={Scissors}
                    label="טיפוח ומספרות"
                    value="קבע תור"
                    to="/grooming"
                  />
                  <SmartPanel.Item
                    icon={Camera}
                    label="אלבום תמונות"
                    value="זכרונים מתוקים"
                    to="/photos"
                  />
                  <SmartPanel.Item
                    icon={FileImage}
                    label="מסמכים"
                    value="חיסונים ותעודות"
                    to="/documents"
                  />
                </SmartPanel>
              </motion.div>

              {/* Settings & Support - Smart Panel */}
              <motion.div
                variants={slideUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.3 }}
              >
                <SmartPanel title="הגדרות ותמיכה" icon={Settings}>
                  <SmartPanel.Item
                    icon={Settings}
                    label="הגדרות"
                    value="התאמה אישית"
                    to="/settings"
                  />
                  <SmartPanel.Item
                    icon={HelpCircle}
                    label="תמיכה ועזרה"
                    value="שאלות נפוצות"
                    to="/support"
                  />
                </SmartPanel>
              </motion.div>

              {/* Logout */}
              {user && (
                <motion.div
                  variants={slideUp}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.35 }}
                  className="pb-6 pt-2"
                >
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full bg-background rounded-2xl p-5 shadow-md hover:shadow-xl transition-all text-error hover:text-error/80 hover:bg-error/5 justify-between text-base font-bold font-jakarta group"
                    {...getAccessibleButtonProps("התנתק מהחשבון")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-error/10 rounded-full flex items-center justify-center">
                        <LogOut className="w-5 h-5 text-error" />
                      </div>
                      <span>התנתק מהחשבון</span>
                    </div>
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-6 font-jakarta">
                    Petid v1.0.0 • כל הזכויות שמורות
                  </p>
                </motion.div>
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
