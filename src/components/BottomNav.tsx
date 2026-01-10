import { Home, ShoppingBag, User, Search } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { motion } from "framer-motion";

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

  // Pages where we hide bottom nav completely (fullscreen experiences)
  const hiddenRoutes = ['/auth', '/signup', '/forgot-password', '/reset-password', '/splash', '/add-pet', '/onboarding', '/stories', '/reels', '/story'];
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
          }} icon={<Home className={`${isActive("/") ? "text-primary" : "text-muted-foreground"}`} style={{ width: '24px', height: '24px' }} strokeWidth={isActive("/") ? 2.5 : 1.5} />} isActive={isActive("/")} label="בית" />

          {/* Explore */}
          <NavItem onClick={() => handleNavClick("/explore")} icon={<Search className={`${isActive("/explore") ? "text-primary" : "text-muted-foreground"}`} style={{ width: '24px', height: '24px' }} strokeWidth={isActive("/explore") ? 2.5 : 1.5} />} isActive={isActive("/explore")} label="חיפוש" />

          {/* Shop */}
          <NavItem onClick={() => handleNavClick("/shop")} icon={<ShoppingBag className={`${isActive("/shop") ? "text-primary" : "text-muted-foreground"}`} style={{ width: '24px', height: '24px' }} strokeWidth={isActive("/shop") ? 2.5 : 1.5} />} isActive={isActive("/shop")} label="חנות" />

          {/* Profile with Avatar - Rounded Square like Instagram */}
          <button onClick={() => handleNavClick("/profile")} className="flex items-center justify-center flex-1" style={{ height: '50px' }} aria-label="פרופיל">
            <div className={cn(
              "rounded-lg p-[2px] transition-all",
              isActive("/profile") 
                ? "bg-gradient-to-br from-primary via-accent to-secondary" 
                : "bg-transparent"
            )} style={{ width: '28px', height: '28px' }}>
              <Avatar className="w-full h-full rounded-md" style={{ width: '24px', height: '24px' }}>
                <AvatarImage src={userAvatar} className="object-cover rounded-md" />
                <AvatarFallback className="bg-muted text-muted-foreground text-[10px] rounded-md">
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