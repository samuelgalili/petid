import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Activity,
  Bookmark,
  Clock,
  QrCode,
  Star,
  Heart,
  Users,
  LogOut,
  ChevronLeft,
  PawPrint,
  Store,
  ShieldCheck,
  Bell,
  MessageCircle,
  Camera,
  FileText,
  MapPin,
  Scissors,
  GraduationCap,
  Package,
  ShoppingCart,
  Plus,
  Moon,
  Sun,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  badge?: number;
  isNew?: boolean;
}

const MenuItem = ({ icon: Icon, label, onClick, badge, isNew }: MenuItemProps) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
  >
    <Icon className="w-6 h-6 text-[#262626]" strokeWidth={1.5} />
    <span className="flex-1 text-[16px] text-[#262626] text-right">{label}</span>
    {badge && badge > 0 && (
      <span className="bg-[#FF3040] text-white text-[12px] font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center">
        {badge}
      </span>
    )}
    {isNew && (
      <span className="bg-[#FF3040] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
        חדש
      </span>
    )}
  </button>
);

const Divider = () => <div className="h-[6px] bg-[#FAFAFA]" />;

export const HamburgerMenu = ({ isOpen, onClose }: HamburgerMenuProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (isOpen) {
      supabase.auth.getUser().then(({ data }) => {
        setUser(data.user);
        if (data.user) {
          supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single()
            .then(({ data: profileData }) => {
              setProfile(profileData);
            });
          
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
      description: "נתראה בקרוב! 👋",
    });
    navigate("/auth");
    onClose();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
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
            className="fixed inset-0 bg-black/40 z-[100]"
            onClick={onClose}
          />

          {/* Drawer - Instagram Style */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 left-0 h-full w-[80vw] max-w-[360px] bg-white z-[101] overflow-y-auto"
            dir="rtl"
          >
            {/* Profile Section */}
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={onClose}
                  className="p-1 -mr-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-[#262626]" strokeWidth={1.5} />
                </button>
              </div>
              
              {user ? (
                <button 
                  onClick={() => handleNavigation("/profile")}
                  className="flex items-center gap-4 w-full"
                >
                  <Avatar className="w-16 h-16 ring-2 ring-border">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                      {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-right">
                    <p className="text-[18px] font-semibold text-foreground">
                      {profile?.full_name || "משתמש"}
                    </p>
                    <p className="text-[14px] text-muted-foreground">הצג פרופיל</p>
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => handleNavigation("/auth")}
                  className="w-full bg-[#0095F6] text-white py-3 rounded-lg font-semibold text-[15px] hover:bg-[#1877F2] transition-colors"
                >
                  התחבר
                </button>
              )}
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {/* My Pets Section */}
              <MenuItem
                icon={PawPrint}
                label="חיות המחמד שלי"
                onClick={() => handleNavigation("/")}
              />
              <MenuItem
                icon={Plus}
                label="הוסף חיית מחמד"
                onClick={() => handleNavigation("/add-pet")}
              />
              
              <Divider />

              {/* Activity Section */}
              <MenuItem
                icon={Bell}
                label="התראות"
                onClick={() => handleNavigation("/notifications")}
                badge={unreadNotifications}
              />
              <MenuItem
                icon={MessageCircle}
                label="הודעות"
                onClick={() => handleNavigation("/messages")}
              />
              <MenuItem
                icon={Bookmark}
                label="מועדפים"
                onClick={() => handleNavigation("/favorites")}
              />
              
              <Divider />

              {/* Shopping Section */}
              <MenuItem
                icon={Store}
                label="חנות"
                onClick={() => handleNavigation("/shop")}
              />
              <MenuItem
                icon={ShoppingCart}
                label="עגלת קניות"
                onClick={() => handleNavigation("/cart")}
              />
              <MenuItem
                icon={Package}
                label="ההזמנות שלי"
                onClick={() => handleNavigation("/order-history")}
              />
              <MenuItem
                icon={Star}
                label="תגמולים ונקודות"
                onClick={() => handleNavigation("/rewards")}
              />

              <Divider />

              {/* Services Section */}
              <MenuItem
                icon={Heart}
                label="אימוץ"
                onClick={() => handleNavigation("/adoption")}
                isNew
              />
              <MenuItem
                icon={ShieldCheck}
                label="ביטוח"
                onClick={() => handleNavigation("/insurance")}
              />
              <MenuItem
                icon={Scissors}
                label="טיפוח"
                onClick={() => handleNavigation("/grooming")}
              />
              <MenuItem
                icon={GraduationCap}
                label="אילוף"
                onClick={() => handleNavigation("/training")}
              />
              <MenuItem
                icon={MapPin}
                label="גינות כלבים"
                onClick={() => handleNavigation("/parks")}
              />

              <Divider />

              {/* Content Section */}
              <MenuItem
                icon={Camera}
                label="אלבום תמונות"
                onClick={() => handleNavigation("/photos")}
              />
              <MenuItem
                icon={FileText}
                label="מסמכים"
                onClick={() => handleNavigation("/documents")}
              />

              <Divider />

              {/* Settings Section */}
              <MenuItem
                icon={Settings}
                label="הגדרות"
                onClick={() => handleNavigation("/settings")}
              />
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="w-6 h-6 text-[#262626]" strokeWidth={1.5} />
                ) : (
                  <Moon className="w-6 h-6 text-[#262626]" strokeWidth={1.5} />
                )}
                <span className="flex-1 text-[16px] text-[#262626] text-right">
                  {theme === 'dark' ? 'מצב יום' : 'מצב לילה'}
                </span>
              </button>
              
              {user && (
                <>
                  <Divider />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <LogOut className="w-6 h-6 text-[#ED4956]" strokeWidth={1.5} />
                    <span className="flex-1 text-[16px] text-[#ED4956] text-right">התנתק</span>
                  </button>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 mt-auto">
              <p className="text-[12px] text-[#8E8E8E] text-center">
                Petid © 2024
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};