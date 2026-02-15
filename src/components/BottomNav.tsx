import { Home, Plus, ShoppingBag, User, Newspaper, Sparkles, X, Camera, ImagePlus, FileText } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

interface NavItemProps {
  icon: React.ReactNode;
  isActive: boolean;
  label: string;
  onClick?: () => void;
  showPill?: boolean;
}

const NavItem = ({
  icon,
  isActive,
  label,
  onClick,
  showPill = true,
}: NavItemProps) => {
  const content = (
    <motion.div
      whileTap={{ scale: 0.9 }}
      className="relative flex flex-col items-center gap-0.5"
    >
      {/* Active pill background */}
      {showPill && isActive && (
        <motion.div
          layoutId="nav-pill"
          className="absolute -inset-x-2 -inset-y-1 rounded-2xl bg-primary/12"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <div className="relative z-10">{icon}</div>
      <AnimatePresence mode="wait">
        {isActive && (
          <motion.span
            key="label"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="text-[10px] font-semibold text-primary relative z-10"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      {!isActive && (
        <span className="text-[10px] font-medium text-muted-foreground">
          {label}
        </span>
      )}
    </motion.div>
  );

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center flex-1 py-2 active:opacity-50 transition-opacity"
      aria-label={label}
    >
      {content}
    </button>
  );
};

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const { unreadCount } = useRealtimeNotifications();

  // Pages where we hide bottom nav completely (fullscreen experiences)
  const hiddenRoutes = ['/auth', '/signup', '/forgot-password', '/reset-password', '/splash', '/add-pet', '/onboarding', '/stories', '/story'];
  const isHiddenPage = hiddenRoutes.some(route => location.pathname.startsWith(route));

  // Fetch user avatar - MUST be before any conditional returns
  useEffect(() => {
    const fetchUserAvatar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        if (data?.avatar_url) {
          setUserAvatar(data.avatar_url);
        }
      }
    };
    fetchUserAvatar();
  }, []);

  // Early return AFTER all hooks
  if (isHiddenPage) return null;

  const isActive = (path: string) => location.pathname === path;

  // Scroll to top when clicking on current tab
  const handleNavClick = (path: string) => {
    if (location.pathname === path) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(path);
    }
  };

  return (
    <>
      {/* Upload Menu Overlay */}
      <AnimatePresence>
        {showUploadMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[9998]"
              onClick={() => setShowUploadMenu(false)}
            />
            {/* Menu */}
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-[70px] left-1/2 -translate-x-1/2 z-[9999] w-[200px] bg-background rounded-2xl border border-border shadow-xl overflow-hidden"
              dir="rtl"
            >
              <button
                onClick={() => { setShowUploadMenu(false); navigate('/create-story'); }}
                className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-muted/60 transition-colors"
              >
                <Camera className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                <span className="text-sm font-medium text-foreground">סטורי</span>
              </button>
              <div className="h-px bg-border mx-3" />
              <button
                onClick={() => { setShowUploadMenu(false); navigate('/create-post'); }}
                className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-muted/60 transition-colors"
              >
                <ImagePlus className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                <span className="text-sm font-medium text-foreground">פוסט</span>
              </button>
              <div className="h-px bg-border mx-3" />
              <button
                onClick={() => { setShowUploadMenu(false); navigate('/scan-document'); }}
                className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-muted/60 transition-colors"
              >
                <FileText className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                <span className="text-sm font-medium text-foreground">מסמך</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom nav - height: 56px */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[9999] bg-background/80 backdrop-blur-xl border-t border-border/50 pb-[env(safe-area-inset-bottom)]"
        role="navigation"
        aria-label="ניווט ראשי"
      >
        <div className="flex justify-around items-center w-full max-w-lg mx-auto h-[56px]">
          {/* 1. Chat AI */}
          <NavItem
            onClick={() => handleNavClick("/chat")}
            icon={
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                isActive("/chat")
                  ? "bg-primary"
                  : "bg-primary/10"
              )}>
                <Sparkles
                  className={cn(
                    "w-3.5 h-3.5",
                    isActive("/chat") ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                  strokeWidth={2}
                />
              </div>
            }
            isActive={isActive("/chat")}
            label="צ'אט AI"
          />

          {/* 2. Upload (+) */}
          <NavItem
            onClick={() => setShowUploadMenu(prev => !prev)}
            showPill={false}
            icon={
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all",
                showUploadMenu
                  ? "border-primary bg-primary rotate-45"
                  : "border-muted-foreground"
              )}>
                <Plus
                  className={cn(
                    "w-4 h-4 transition-colors",
                    showUploadMenu ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                  strokeWidth={2.5}
                />
              </div>
            }
            isActive={showUploadMenu}
            label="העלאה"
          />

          {/* 3. Home (Avatar) - Center */}
          <NavItem
            onClick={() => handleNavClick("/")}
            showPill={false}
            icon={
              <div className={cn(
                "rounded-full p-[2.5px] transition-all",
                isActive("/")
                  ? "bg-gradient-to-tr from-primary via-accent to-primary ring-1 ring-primary/30"
                  : ""
              )}>
                <Avatar className={cn(
                  "rounded-full border-2 border-background transition-all",
                  isActive("/") ? "w-8 h-8" : "w-7 h-7"
                )}>
                  <AvatarImage src={userAvatar} className="object-cover rounded-full" />
                  <AvatarFallback className="bg-muted text-muted-foreground text-[10px] rounded-full">
                    <User className="w-3.5 h-3.5" />
                  </AvatarFallback>
                </Avatar>
              </div>
            }
            isActive={isActive("/")}
            label="בית"
          />

          {/* 4. Feed */}
          <NavItem
            onClick={() => handleNavClick("/feed")}
            icon={
              <Newspaper
                className={cn(
                  "w-6 h-6 transition-colors",
                  isActive("/feed") ? "text-primary" : "text-muted-foreground"
                )}
                strokeWidth={isActive("/feed") ? 2 : 1.5}
              />
            }
            isActive={isActive("/feed")}
            label="פיד"
          />

          {/* 5. Shop */}
          <NavItem
            onClick={() => handleNavClick("/shop")}
            icon={
              <ShoppingBag
                className={cn(
                  "w-6 h-6 transition-colors",
                  isActive("/shop") ? "text-primary" : "text-muted-foreground"
                )}
                strokeWidth={isActive("/shop") ? 2 : 1.5}
              />
            }
            isActive={isActive("/shop")}
            label="חנות"
          />
        </div>

        {/* Safe area for notched devices */}
        <div className="bg-background/80" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </nav>
    </>
  );
};

export default BottomNav;
