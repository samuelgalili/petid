import { Home, ShoppingBag, User, Compass, Clapperboard, Plus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { motion } from "framer-motion";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  isActive: boolean;
  label: string;
}

const NavItem = ({ to, icon, isActive, label }: NavItemProps) => (
  <Link
    to={to}
    className="flex flex-col items-center justify-center flex-1 py-2 active:opacity-50 transition-opacity"
    aria-label={label}
  >
    <motion.div
      whileTap={{ scale: 0.9 }}
      className="relative"
    >
      {icon}
      {isActive && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
          initial={false}
        />
      )}
    </motion.div>
  </Link>
);

const BottomNav = () => {
  const location = useLocation();
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string>("");

  // Auth pages where we don't show bottom nav
  const authRoutes = ['/auth', '/signup', '/forgot-password', '/reset-password', '/splash', '/add-pet', '/onboarding'];
  const isAuthPage = authRoutes.some(route => location.pathname.startsWith(route));
  
  if (isAuthPage) return null;

  // Fetch user avatar
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

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { 
      to: "/", 
      label: "בית",
      icon: (
        <Home 
          className="w-6 h-6 text-foreground"
          strokeWidth={isActive("/") ? 2.5 : 1.5}
          fill={isActive("/") ? "currentColor" : "none"}
        />
      )
    },
    { 
      to: "/explore", 
      label: "חיפוש",
      icon: (
        <Compass 
          className="w-6 h-6 text-foreground"
          strokeWidth={isActive("/explore") ? 2.5 : 1.5}
          fill={isActive("/explore") ? "currentColor" : "none"}
        />
      )
    },
    { 
      to: "/reels", 
      label: "Reels",
      icon: (
        <Clapperboard 
          className="w-6 h-6 text-foreground"
          strokeWidth={isActive("/reels") ? 2.5 : 1.5}
          fill={isActive("/reels") ? "currentColor" : "none"}
        />
      )
    },
    { 
      to: "/shop", 
      label: "חנות",
      icon: (
        <ShoppingBag 
          className="w-6 h-6 text-foreground"
          strokeWidth={isActive("/shop") ? 2.5 : 1.5}
          fill={isActive("/shop") ? "currentColor" : "none"}
        />
      )
    },
  ];

  return (
    <>
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border"
        role="navigation"
        aria-label="ניווט ראשי"
      >
        <div className="flex justify-around items-center h-14 max-w-lg mx-auto px-1">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              isActive={isActive(item.to)}
              label={item.label}
            />
          ))}

          {/* Profile with Avatar */}
          <Link
            to="/profile"
            className="flex flex-col items-center justify-center flex-1 py-2 active:opacity-50"
            aria-label="פרופיל"
          >
            <motion.div whileTap={{ scale: 0.9 }} className="relative">
              <div className={cn(
                "w-6 h-6 rounded-full overflow-hidden transition-all",
                isActive("/profile") && "ring-2 ring-primary ring-offset-1 ring-offset-background"
              )}>
                <Avatar className="w-full h-full">
                  <AvatarImage src={userAvatar} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                    <User className="w-3.5 h-3.5" />
                  </AvatarFallback>
                </Avatar>
              </div>
              {isActive("/profile") && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                  initial={false}
                />
              )}
            </motion.div>
          </Link>
        </div>
        
        {/* Safe area for notched devices */}
        <div className="h-[env(safe-area-inset-bottom)] bg-background" />
      </nav>

      {/* Floating Action Button for Create Post */}
      <motion.button
        onClick={() => setCreatePostOpen(true)}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        className="fixed bottom-20 left-4 z-40 w-14 h-14 bg-gradient-to-br from-primary via-[#F4B400] to-[#E3A700] rounded-full flex items-center justify-center shadow-lg shadow-primary/30"
        aria-label="יצירת פוסט חדש"
      >
        <Plus className="w-6 h-6 text-primary-foreground" strokeWidth={2.5} />
      </motion.button>

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        onPostCreated={() => {
          // Refresh will be handled by realtime subscription
        }}
      />
    </>
  );
};

export default BottomNav;
