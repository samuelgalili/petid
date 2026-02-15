import { Home, Plus, ShoppingBag, User, Newspaper, Sparkles, X, Camera, ImagePlus, FileText, MessageCircle } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { CreateStoryDialog } from "@/components/CreateStoryDialog";
import { EmergencySOSButton } from "@/components/emergency/EmergencySOSButton";
import { EmergencyHub } from "@/components/emergency/EmergencyHub";

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
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showEmergencyHub, setShowEmergencyHub] = useState(false);
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

  const handleUploadAction = (action: "story" | "post" | "document") => {
    setShowUploadMenu(false);
    switch (action) {
      case "story":
        setShowCreateStory(true);
        break;
      case "post":
        setShowCreatePost(true);
        break;
      case "document":
        navigate("/documents");
        break;
    }
  };

  return (
    <>
      {/* Emergency SOS Button */}
      <EmergencySOSButton onClick={() => setShowEmergencyHub(true)} />
      <EmergencyHub open={showEmergencyHub} onOpenChange={setShowEmergencyHub} />

      {/* Upload Menu Overlay */}
      <AnimatePresence>
        {showUploadMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
              onClick={() => setShowUploadMenu(false)}
            />
            {/* Menu - horizontal layout */}
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 22, stiffness: 350 }}
              className="fixed bottom-[80px] inset-x-0 mx-auto w-fit z-[9999] flex items-center gap-6 px-6 py-4 bg-background/90 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl"
              dir="rtl"
            >
              {[
                { icon: Camera, label: "סטורי", action: "story" as const, color: "text-pink-500", bg: "bg-pink-500/10" },
                { icon: ImagePlus, label: "פוסט", action: "post" as const, color: "text-blue-500", bg: "bg-blue-500/10" },
                { icon: FileText, label: "מסמך", action: "document" as const, color: "text-amber-500", bg: "bg-amber-500/10" },
              ].map((item) => (
                <motion.button
                  key={item.action}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleUploadAction(item.action)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", item.bg)}>
                    <item.icon className={cn("w-6 h-6", item.color)} strokeWidth={1.5} />
                  </div>
                  <span className="text-xs font-medium text-foreground">{item.label}</span>
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dialogs */}
      <CreatePostDialog
        open={showCreatePost}
        onOpenChange={setShowCreatePost}
        onPostCreated={() => {
          setShowCreatePost(false);
        }}
      />
      <CreateStoryDialog
        open={showCreateStory}
        onOpenChange={setShowCreateStory}
        onStoryCreated={() => {
          setShowCreateStory(false);
        }}
      />

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
              <Sparkles
                className={cn(
                  "w-6 h-6 transition-colors",
                  isActive("/chat") ? "text-primary" : "text-muted-foreground"
                )}
                strokeWidth={isActive("/chat") ? 2 : 1.5}
              />
            }
            isActive={isActive("/chat")}
            label="צ'אט AI"
          />

          {/* 2. Upload (+) */}
          <NavItem
            onClick={() => setShowUploadMenu(prev => !prev)}
            showPill={false}
            icon={
              <Plus
                className={cn(
                  "w-7 h-7 transition-all",
                  showUploadMenu ? "text-primary rotate-45" : "text-muted-foreground"
                )}
                strokeWidth={2}
              />
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
                "rounded-full p-[3px] transition-all -mt-5",
                isActive("/")
                  ? "bg-gradient-to-tr from-primary via-accent to-primary ring-2 ring-primary/30 shadow-lg shadow-primary/20"
                  : "ring-2 ring-border"
              )}>
                <Avatar className={cn(
                  "rounded-full border-[3px] border-background transition-all",
                  isActive("/") ? "w-11 h-11" : "w-10 h-10"
                )}>
                  <AvatarImage src={userAvatar} className="object-cover rounded-full" />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs rounded-full">
                    <User className="w-4 h-4" />
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
