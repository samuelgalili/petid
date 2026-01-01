import { Home, ShoppingBag, User, Compass, Grid3X3, Search } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { motion } from "framer-motion";
import { FeatureHintWrapper } from "@/components/FeatureHintWrapper";
import { SmartActionSearch } from "@/components/SmartActionSearch";

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
  const [searchOpen, setSearchOpen] = useState(false);
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
      {/* SVG Gradient definitions */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="nav-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2EB8A6" />
            <stop offset="100%" stopColor="#4ECDC4" />
          </linearGradient>
        </defs>
      </svg>

      {/* PetID-style bottom nav - warm, organic feel */}
      <nav className="fixed bottom-0 left-0 right-0 z-[9999] bg-card/95 backdrop-blur-md border-t border-border/30 shadow-[0_-4px_20px_rgba(46,184,166,0.08)]" style={{
      position: 'fixed',
      bottom: 0
    }} role="navigation" aria-label="ניווט ראשי">
        <div className="flex justify-around items-center h-14 w-full max-w-2xl mx-auto px-2">
          {/* Home */}
          <FeatureHintWrapper
            featureId="nav_home"
            title="דף הבית"
            description="כאן תמצא את הפיד הראשי, עדכונים וכל מה שקורה עם חיות המחמד שלך"
          >
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
          }} icon={<Home className="w-6 h-6 transition-colors" strokeWidth={2} fill="none" style={isActive("/") ? { stroke: "url(#nav-gradient)" } : { stroke: "hsl(var(--muted-foreground))" }} />} isActive={isActive("/")} label="בית" />
          </FeatureHintWrapper>

          {/* Explore */}
          <FeatureHintWrapper
            featureId="nav_explore"
            title="חיפוש וגילוי"
            description="גלה חיות מחמד, בעלים ותכנים חדשים. חפש לפי שם, גזע או מיקום"
          >
            <NavItem onClick={() => handleNavClick("/explore")} icon={<Compass className="w-6 h-6 transition-colors" strokeWidth={2} fill="none" style={isActive("/explore") ? { stroke: "url(#nav-gradient)" } : { stroke: "hsl(var(--muted-foreground))" }} />} isActive={isActive("/explore")} label="חיפוש" />
          </FeatureHintWrapper>

          {/* Search - Center button */}
          <FeatureHintWrapper
            featureId="nav_search_actions"
            title="חיפוש פעולות"
            description="חפש בקלות מה שאתה רוצה לעשות - מסמכים, אילוף, גינות ועוד"
          >
            <NavItem onClick={() => setSearchOpen(true)} icon={
              <Search 
                className="w-6 h-6 transition-colors" 
                strokeWidth={2} 
                fill="none" 
                style={searchOpen ? { stroke: "url(#nav-gradient)" } : { stroke: "hsl(var(--muted-foreground))" }} 
              />
            } isActive={false} label="חיפוש פעולות" />
          </FeatureHintWrapper>

          {/* Shop */}
          <FeatureHintWrapper
            featureId="nav_shop"
            title="חנות"
            description="מוצרים מומלצים לחיית המחמד שלך, מבצעים והטבות מיוחדות"
          >
            <NavItem onClick={() => handleNavClick("/shop")} icon={<ShoppingBag className="w-6 h-6 transition-colors" strokeWidth={2} fill="none" style={isActive("/shop") ? { stroke: "url(#nav-gradient)" } : { stroke: "hsl(var(--muted-foreground))" }} />} isActive={isActive("/shop")} label="חנות" />
          </FeatureHintWrapper>

          {/* Profile with Avatar */}
          <FeatureHintWrapper
            featureId="nav_profile"
            title="הפרופיל שלך"
            description="צפה בחיות המחמד שלך, ערוך פרטים ונהל את החשבון"
          >
            <button onClick={() => handleNavClick("/profile")} className="flex items-center justify-center flex-1 py-2" aria-label="פרופיל">
              <div className={cn("w-7 h-7 rounded-full overflow-hidden transition-all", isActive("/profile") ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "")}>
                <Avatar className="w-full h-full">
                  <AvatarImage src={userAvatar} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                    <User className="w-3.5 h-3.5" />
                  </AvatarFallback>
                </Avatar>
              </div>
            </button>
          </FeatureHintWrapper>
        </div>
        
        {/* Safe area for notched devices */}
        <div className="h-[env(safe-area-inset-bottom)] bg-card" />
      </nav>


      {/* Create Post Dialog */}
      <CreatePostDialog open={createPostOpen} onOpenChange={setCreatePostOpen} onPostCreated={() => {}} />

      {/* Smart Action Search */}
      <SmartActionSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>;
};
export default BottomNav;