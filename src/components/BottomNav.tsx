import { Home, Compass, Play, Plus, MessageCircle, BarChart2, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

// Gradient icon wrapper for active state
const GradientIcon = ({ children, isActive, id }: { children: React.ReactNode; isActive: boolean; id: string }) => {
  if (!isActive) return <>{children}</>;
  
  return (
    <svg width="0" height="0" className="absolute">
      <defs>
        <linearGradient id={`gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>
    </svg>
  );
};

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
  const content = <motion.div whileTap={{
    scale: 0.92
  }} className="relative">
      {icon}
    </motion.div>;
  if (onClick) {
    return <button onClick={onClick} className="flex flex-col items-center justify-center flex-1 py-2 active:opacity-50 transition-opacity" aria-label={label}>
        {content}
      </button>;
  }
  return <Link to={to || "/"} className="flex flex-col items-center justify-center flex-1 py-2 active:opacity-50 transition-opacity" aria-label={label}>
      {content}
    </Link>;
};
const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string>("");
  const { unreadCount } = useRealtimeNotifications();

  // Pages where we hide bottom nav completely (fullscreen experiences)
  const hiddenRoutes = ['/auth', '/signup', '/forgot-password', '/reset-password', '/splash', '/add-pet', '/onboarding', '/stories', '/story'];
  const isHiddenPage = hiddenRoutes.some(route => location.pathname.startsWith(route));
  if (isHiddenPage) return null;

  // Fetch user avatar
  useEffect(() => {
    const fetchUserAvatar = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const {
          data
        } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
        if (data?.avatar_url) {
          setUserAvatar(data.avatar_url);
        }
      }
    };
    fetchUserAvatar();
  }, []);
  
  const isActive = (path: string) => location.pathname === path;
  
  // Scroll to top when clicking on current tab
  const handleNavClick = (path: string) => {
    if (location.pathname === path) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(path);
    }
  };
  
  return <>
      {/* SVG Gradient definitions - Light Blue (תכלת) */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="nav-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0099E6" />
            <stop offset="100%" stopColor="#0080CC" />
          </linearGradient>
        </defs>
      </svg>

      {/* Instagram-style bottom nav - height: 50px like Instagram */}
      <nav className="fixed bottom-0 left-0 right-0 z-[9999] bg-background border-t border-border" style={{
      position: 'fixed',
      bottom: 0
    }} role="navigation" aria-label="ניווט ראשי">
        <div className="flex justify-around items-center w-full max-w-lg mx-auto" style={{ height: '50px' }}>
          {/* Home */}
          <NavItem onClick={() => {
            if (location.pathname === "/") {
              window.scrollTo({
                top: 0,
                behavior: 'smooth'
              });
              window.dispatchEvent(new CustomEvent('refresh-feed'));
            } else {
              navigate("/");
            }
          }} icon={<Home className={`${isActive("/") ? "text-foreground" : "text-muted-foreground"}`} style={{ width: '24px', height: '24px' }} strokeWidth={isActive("/") ? 2 : 1.5} />} isActive={isActive("/")} label="בית" />

          {/* Explore */}
          <NavItem onClick={() => handleNavClick("/explore")} icon={<Compass className={`${isActive("/explore") ? "text-foreground" : "text-muted-foreground"}`} style={{ width: '24px', height: '24px' }} strokeWidth={isActive("/explore") ? 2 : 1.5} />} isActive={isActive("/explore")} label="גילוי" />

          {/* Reels */}
          <NavItem onClick={() => handleNavClick("/reels")} icon={<Play className={`${isActive("/reels") ? "text-foreground" : "text-muted-foreground"}`} style={{ width: '24px', height: '24px' }} strokeWidth={isActive("/reels") ? 2 : 1.5} />} isActive={isActive("/reels")} label="סרטונים" />

          {/* Create Post - Plus Icon */}
          <button 
            onClick={() => setCreatePostOpen(true)} 
            className="flex items-center justify-center flex-1 active:opacity-50 transition-opacity" 
            style={{ height: '50px' }} 
            aria-label="יצירת פוסט"
          >
            <motion.div whileTap={{ scale: 0.92 }}>
              <Plus className="text-foreground" style={{ width: '28px', height: '28px' }} strokeWidth={1.5} />
            </motion.div>
          </button>

          {/* Messages with notification badge */}
          <button 
            onClick={() => handleNavClick("/messages")} 
            className="flex items-center justify-center flex-1 relative active:opacity-50 transition-opacity" 
            style={{ height: '50px' }} 
            aria-label="הודעות"
          >
            <motion.div whileTap={{ scale: 0.92 }} className="relative">
              <MessageCircle className={`${isActive("/messages") ? "text-foreground" : "text-muted-foreground"}`} style={{ width: '24px', height: '24px' }} strokeWidth={isActive("/messages") ? 2 : 1.5} />
              <AnimatePresence mode="wait">
                {unreadCount > 0 && (
                  <motion.span
                    key={unreadCount}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FF3B30] text-white rounded-full text-[10px] font-bold flex items-center justify-center"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </button>

          {/* Insights/Stats */}
          <NavItem onClick={() => handleNavClick("/rewards")} icon={<BarChart2 className={`${isActive("/rewards") ? "text-foreground" : "text-muted-foreground"}`} style={{ width: '24px', height: '24px' }} strokeWidth={isActive("/rewards") ? 2 : 1.5} />} isActive={isActive("/rewards")} label="תגמולים" />

          {/* Profile with Avatar - Rounded like reference */}
          <button onClick={() => handleNavClick("/profile")} className="flex items-center justify-center flex-1" style={{ height: '50px' }} aria-label="פרופיל">
            <div className={cn(
              "rounded-full p-[2px] transition-all",
              isActive("/profile") 
                ? "ring-2 ring-foreground" 
                : ""
            )}>
              <Avatar className="w-7 h-7 rounded-full">
                <AvatarImage src={userAvatar} className="object-cover rounded-full" />
                <AvatarFallback className="bg-muted text-muted-foreground text-[10px] rounded-full">
                  <User style={{ width: '14px', height: '14px' }} />
                </AvatarFallback>
              </Avatar>
            </div>
          </button>
        </div>
        
        {/* Safe area for notched devices - iOS safe area */}
        <div className="bg-background" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </nav>

      {/* Create Post Dialog */}
      <CreatePostDialog open={createPostOpen} onOpenChange={setCreatePostOpen} onPostCreated={() => {}} />
    </>;
};
export default BottomNav;