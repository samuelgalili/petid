import {
  Home,
  Plus,
  ShoppingBag,
  User,
  Newspaper,
  Sparkles,
  Camera,
  ImagePlus,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { CreateStoryDialog } from "@/components/CreateStoryDialog";
import { EmergencyHub } from "@/components/emergency/EmergencyHub";
import { useLanguage } from "@/contexts/LanguageContext";

// ── Translations ──────────────────────────────
const navLabels = {
  he: { home: "דף הבית", feed: "פיד", sos: "חירום", shop: "חנות", chat: "צ'אט", upload: "העלאה", story: "סטורי", post: "פוסט", document: "מסמך" },
  en: { home: "Home", feed: "Feed", sos: "SOS", shop: "Shop", chat: "Chat", upload: "Upload", story: "Story", post: "Post", document: "Document" },
  ar: { home: "الرئيسية", feed: "فيد", sos: "طوارئ", shop: "متجر", chat: "دردشة", upload: "رفع", story: "ستوري", post: "منشور", document: "مستند" },
};

// ── NavItem ───────────────────────────────────
interface NavItemProps {
  icon: React.ReactNode;
  isActive: boolean;
  label: string;
  onClick?: () => void;
}

const NavItem = ({ icon, isActive, label, onClick }: NavItemProps) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center flex-1 py-1.5 active:opacity-60 transition-opacity"
    aria-label={label}
  >
    <motion.div
      whileTap={{ scale: 0.85 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      className="relative flex flex-col items-center gap-0.5"
    >
      {/* Active glow */}
      {isActive && (
        <motion.div
          layoutId="nav-active-pill"
          className="absolute -inset-x-3 -inset-y-1 rounded-2xl bg-primary/10"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <div className="relative z-10">{icon}</div>
      <span
        className={cn(
          "text-[10px] font-medium relative z-10 transition-colors",
          isActive ? "text-primary font-semibold" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </motion.div>
  </button>
);

// ── Main Component ────────────────────────────
const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, direction } = useLanguage();
  const isRtl = direction === "rtl";
  const labels = navLabels[language] || navLabels.he;

  const [userAvatar, setUserAvatar] = useState<string>("");
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showEmergencyHub, setShowEmergencyHub] = useState(false);
  const { unreadCount } = useRealtimeNotifications();

  // Hidden routes
  const hiddenRoutes = ["/auth", "/signup", "/forgot-password", "/reset-password", "/splash", "/add-pet", "/onboarding", "/stories", "/story"];
  const isHiddenPage = hiddenRoutes.some((r) => location.pathname.startsWith(r));

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
        if (data?.avatar_url) setUserAvatar(data.avatar_url);
      }
    })();
  }, []);

  if (isHiddenPage) return null;

  const isActive = (path: string) => location.pathname === path;

  const handleNavClick = (path: string) => {
    if (location.pathname === path) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate(path);
    }
  };

  const handleUploadAction = (action: "story" | "post" | "document") => {
    setShowUploadMenu(false);
    if (action === "story") setShowCreateStory(true);
    else if (action === "post") setShowCreatePost(true);
    else navigate("/documents");
  };

  // Navigation items in logical order (will be reversed for LTR)
  const navItems = [
    {
      key: "home",
      render: () => (
        <NavItem
          key="home"
          onClick={() => handleNavClick("/")}
          isActive={isActive("/")}
          label={labels.home}
          icon={
            <Home
              className={cn("w-[22px] h-[22px] transition-colors", isActive("/") ? "text-primary" : "text-muted-foreground")}
              strokeWidth={isActive("/") ? 2.2 : 1.5}
            />
          }
        />
      ),
    },
    {
      key: "feed",
      render: () => (
        <NavItem
          key="feed"
          onClick={() => handleNavClick("/feed")}
          isActive={isActive("/feed")}
          label={labels.feed}
          icon={
            <Newspaper
              className={cn("w-[22px] h-[22px] transition-colors", isActive("/feed") ? "text-primary" : "text-muted-foreground")}
              strokeWidth={isActive("/feed") ? 2.2 : 1.5}
            />
          }
        />
      ),
    },
    {
      key: "sos",
      render: () => (
        <div key="sos" className="flex flex-col items-center justify-center flex-1 relative">
          <motion.button
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            onClick={() => setShowEmergencyHub(true)}
            className="relative -mt-6 w-[56px] h-[56px] rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/30 ring-4 ring-background active:shadow-red-500/50 transition-shadow"
            aria-label={labels.sos}
          >
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" style={{ animationDuration: "2.5s" }} />
            <AlertTriangle className="w-6 h-6 text-white relative z-10" strokeWidth={2.2} />
          </motion.button>
          <span className="text-[10px] font-bold text-red-500 mt-0.5">{labels.sos}</span>
        </div>
      ),
    },
    {
      key: "shop",
      render: () => (
        <NavItem
          key="shop"
          onClick={() => handleNavClick("/shop")}
          isActive={isActive("/shop")}
          label={labels.shop}
          icon={
            <ShoppingBag
              className={cn("w-[22px] h-[22px] transition-colors", isActive("/shop") ? "text-primary" : "text-muted-foreground")}
              strokeWidth={isActive("/shop") ? 2.2 : 1.5}
            />
          }
        />
      ),
    },
    {
      key: "chat",
      render: () => (
        <NavItem
          key="chat"
          onClick={() => handleNavClick("/chat")}
          isActive={isActive("/chat")}
          label={labels.chat}
          icon={
            <Sparkles
              className={cn("w-[22px] h-[22px] transition-colors", isActive("/chat") ? "text-primary" : "text-muted-foreground")}
              strokeWidth={isActive("/chat") ? 2.2 : 1.5}
            />
          }
        />
      ),
    },
  ];

  // Reverse item order for LTR to maintain visual consistency
  const orderedItems = isRtl ? navItems : [...navItems].reverse();

  return (
    <>
      {/* Emergency Hub Dialog */}
      <EmergencyHub open={showEmergencyHub} onOpenChange={setShowEmergencyHub} />

      {/* Upload Menu Overlay */}
      <AnimatePresence>
        {showUploadMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
              onClick={() => setShowUploadMenu(false)}
            />
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 22, stiffness: 350 }}
              className="fixed bottom-[80px] inset-x-0 mx-auto w-fit z-[9999] flex items-center gap-6 px-6 py-4 bg-background/90 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl"
              dir={direction}
            >
              {[
                { icon: Camera, label: labels.story, action: "story" as const, color: "text-pink-500", bg: "bg-pink-500/10" },
                { icon: ImagePlus, label: labels.post, action: "post" as const, color: "text-blue-500", bg: "bg-blue-500/10" },
                { icon: FileText, label: labels.document, action: "document" as const, color: "text-amber-500", bg: "bg-amber-500/10" },
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
      <CreatePostDialog open={showCreatePost} onOpenChange={setShowCreatePost} onPostCreated={() => setShowCreatePost(false)} />
      <CreateStoryDialog open={showCreateStory} onOpenChange={setShowCreateStory} onStoryCreated={() => setShowCreateStory(false)} />

      {/* ── Bottom Navigation Bar ─────────────── */}
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[9999]",
          "bg-background/80 dark:bg-[hsl(0,0%,7%)]/80",
          "backdrop-blur-xl backdrop-saturate-150",
          "border-t border-border/40",
          "pb-[env(safe-area-inset-bottom)]"
        )}
        role="navigation"
        aria-label={isRtl ? "ניווט ראשי" : "Main navigation"}
        dir={direction}
      >
        <div className="flex justify-around items-end w-full max-w-lg mx-auto h-[60px]">
          {orderedItems.map((item) => item.render())}
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
