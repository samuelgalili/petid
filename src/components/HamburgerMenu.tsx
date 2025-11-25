import { useState } from "react";
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
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Type,
  Contrast,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/contexts/ThemeContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import defaultPetAvatar from "@/assets/default-pet-avatar.png";

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HamburgerMenu = ({ isOpen, onClose }: HamburgerMenuProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, effectiveTheme, setTheme } = useTheme();
  const { fontSize, highContrast, reduceMotion, setFontSize, setHighContrast, setReduceMotion } = useAccessibility();
  const [user, setUser] = useState<any>(null);

  // Check for authenticated user
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out successfully",
      description: "See you soon!",
    });
    navigate('/auth');
    onClose();
  };

  const menuItems = [
    { icon: Heart, label: "My Pets", path: "/home" },
    { icon: Package, label: "Orders", path: "/order-history" },
    { icon: Star, label: "Membership Club", path: "/membership" },
    { icon: Grid3x3, label: "Shop Categories", path: "/shop" },
    { icon: Heart, label: "Favorites", path: "/favorites" },
    { icon: ShoppingCart, label: "Cart", path: "/cart" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
  ];

  const secondaryItems = [
    { icon: Settings, label: "Settings", path: "/settings" },
    { icon: HelpCircle, label: "Support & Help", path: "/support" },
    { icon: FileText, label: "FAQ", path: "/faq" },
    { icon: Info, label: "About Petid", path: "/about" },
    { icon: Shield, label: "Terms & Privacy", path: "/terms" },
  ];

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
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 h-full w-[85vw] max-w-[340px] bg-white dark:bg-gray-900 shadow-2xl z-[101] overflow-y-auto"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <img src={defaultPetAvatar} alt="Petid" className="h-8 w-auto" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </Button>
                </div>

                {/* User Section */}
                {user ? (
                  <button
                    onClick={() => handleNavigation('/settings')}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-[#7DD3C0] text-white">
                        {user.email?.[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-gray-900 dark:text-white">{user.user_metadata?.full_name || 'User'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">View Profile</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                ) : (
                  <Button
                    onClick={() => handleNavigation('/auth')}
                    className="w-full bg-[#7DD3C0] hover:bg-[#6BC4AD] text-white rounded-full font-bold"
                  >
                    Login / Sign Up
                  </Button>
                )}
              </div>

              {/* Main Navigation */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-1">
                  {menuItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                    >
                      <item.icon className="w-5 h-5 text-[#7DD3C0] flex-shrink-0" />
                      <span className="flex-1 text-left font-semibold text-gray-900 dark:text-white">
                        {item.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    </button>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Theme Switcher */}
                <div className="px-4 mb-4">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    Theme
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('light')}
                      className={`flex-1 ${theme === 'light' ? 'bg-[#7DD3C0] hover:bg-[#6BC4AD]' : ''}`}
                    >
                      <Sun className="w-4 h-4 mr-2" />
                      Light
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('dark')}
                      className={`flex-1 ${theme === 'dark' ? 'bg-[#7DD3C0] hover:bg-[#6BC4AD]' : ''}`}
                    >
                      <Moon className="w-4 h-4 mr-2" />
                      Dark
                    </Button>
                    <Button
                      variant={theme === 'system' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('system')}
                      className={`flex-1 ${theme === 'system' ? 'bg-[#7DD3C0] hover:bg-[#6BC4AD]' : ''}`}
                    >
                      <Monitor className="w-4 h-4 mr-2" />
                      Auto
                    </Button>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Accessibility Section */}
                <div className="px-4 mb-4">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    Accessibility
                  </p>
                  <div className="space-y-3">
                    {/* Font Size */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Type className="w-4 h-4 text-[#7DD3C0]" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Font Size</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={fontSize === 'small' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFontSize('small')}
                          className={`flex-1 text-xs ${fontSize === 'small' ? 'bg-[#7DD3C0] hover:bg-[#6BC4AD]' : ''}`}
                        >
                          Small
                        </Button>
                        <Button
                          variant={fontSize === 'medium' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFontSize('medium')}
                          className={`flex-1 text-sm ${fontSize === 'medium' ? 'bg-[#7DD3C0] hover:bg-[#6BC4AD]' : ''}`}
                        >
                          Medium
                        </Button>
                        <Button
                          variant={fontSize === 'large' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFontSize('large')}
                          className={`flex-1 text-base ${fontSize === 'large' ? 'bg-[#7DD3C0] hover:bg-[#6BC4AD]' : ''}`}
                        >
                          Large
                        </Button>
                      </div>
                    </div>

                    {/* High Contrast */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <Contrast className="w-4 h-4 text-[#7DD3C0]" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">High Contrast</span>
                      </div>
                      <Switch checked={highContrast} onCheckedChange={setHighContrast} />
                    </div>

                    {/* Reduce Motion */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[#7DD3C0]" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Reduce Motion</span>
                      </div>
                      <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Secondary Items */}
                <div className="px-4 space-y-1">
                  {secondaryItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <item.icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <span className="flex-1 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              {user && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    Logout
                  </Button>
                  <p className="text-xs text-gray-400 text-center mt-3">
                    Petid v1.0.0
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
