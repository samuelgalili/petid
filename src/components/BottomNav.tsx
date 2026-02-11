import { Home, Plus, ShoppingBag, User, Newspaper, Sparkles, X, Camera, ImagePlus, FileText } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

interface NavItemProps {
  to?: string;
  icon: React.ReactNode;
  isActive: boolean;
  label: string;
  onClick?: () => void;
}

const NavItem = ({
  to,
  icon,
  isActive,
  label,
  onClick
}: NavItemProps) => {
  const content = (
    <motion.div 
      whileTap={{ scale: 0.92 }} 
      className="flex flex-col items-center gap-0.5"
    >
      {icon}
      <span className={cn(
        "text-[10px] font-medium transition-colors",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}>
        {label}
      </span>
    </motion.div>
  );

  if (onClick) {
    return (
      <button 
        onClick={onClick} 
        className="flex flex-col items-center justify-center flex-1 py-2 active:opacity-50 transition-opacity" 
        aria-label={label}
      >
        {content}
      </button>
    );
  }
  
  return (
    <Link 
      to={to || "/"} 
      className="flex flex-col items-center justify-center flex-1 py-2 active:opacity-50 transition-opacity" 
      aria-label={label}
    >
      {content}
    </Link>
  );
};

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userAvatar, setUserAvatar] = useState<string>("");
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
      {/* Instagram-style bottom nav - height: 56px */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-[9999] bg-background border-t border-border pb-[env(safe-area-inset-bottom)]" 
        role="navigation" 
        aria-label="ניווט ראשי"
      >
        <div className="flex justify-around items-center w-full max-w-lg mx-auto h-[56px]">
          {/* 1. Home */}
          <NavItem 
            onClick={() => handleNavClick("/")}
            icon={
              <div className={cn(
                "rounded-full p-[2px] transition-all",
                isActive("/") ? "ring-2 ring-foreground" : ""
              )}>
                <Avatar className="w-6 h-6 rounded-full">
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

          {/* 2. Feed */}
          <NavItem 
            onClick={() => handleNavClick("/feed")}
            icon={
              <Newspaper 
                className={cn(
                  "w-6 h-6",
                  isActive("/feed") ? "text-foreground" : "text-muted-foreground"
                )}
                strokeWidth={isActive("/feed") ? 2 : 1.5}
              />
            }
            isActive={isActive("/feed")}
            label="פיד"
          />

          {/* 3. Upload (+) - Center */}
          <NavItem 
            onClick={() => handleNavClick("/create-post")}
            icon={
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center border-2",
                isActive("/create-post") 
                  ? "border-foreground bg-foreground" 
                  : "border-muted-foreground"
              )}>
                <Plus 
                  className={cn(
                    "w-4 h-4",
                    isActive("/create-post") ? "text-background" : "text-muted-foreground"
                  )}
                  strokeWidth={2.5}
                />
              </div>
            }
            isActive={isActive("/create-post")}
            label="העלאה"
          />

          {/* 4. AI Chat */}
          <NavItem 
            onClick={() => handleNavClick("/chat")}
            icon={
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center",
                isActive("/chat") 
                  ? "bg-gradient-to-tr from-petid-blue via-petid-gold to-petid-blue" 
                  : "bg-muted"
              )}>
                <Sparkles 
                  className={cn(
                    "w-3.5 h-3.5",
                    isActive("/chat") ? "text-white" : "text-muted-foreground"
                  )}
                  strokeWidth={2}
                />
              </div>
            }
            isActive={isActive("/chat")}
            label="צ'אט AI"
          />

          {/* 5. Shop */}
          <NavItem 
            onClick={() => handleNavClick("/shop")}
            icon={
              <ShoppingBag 
                className={cn(
                  "w-6 h-6",
                  isActive("/shop") ? "text-foreground" : "text-muted-foreground"
                )}
                strokeWidth={isActive("/shop") ? 2 : 1.5}
              />
            }
            isActive={isActive("/shop")}
            label="חנות"
          />
        </div>
        
        {/* Safe area for notched devices - iOS safe area */}
        <div className="bg-background" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </nav>
    </>
  );
};

export default BottomNav;