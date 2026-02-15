import {
  Home,
  ShoppingBag,
  Newspaper,
  Sparkles,
  Camera,
  ImagePlus,
  FileText,
  AlertTriangle,
  Dog,
  Cat,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { CreateStoryDialog } from "@/components/CreateStoryDialog";
import { EmergencyHub } from "@/components/emergency/EmergencyHub";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePetPreference } from "@/contexts/PetPreferenceContext";

// ── Translations ──────────────────────────────
const navLabels = {
  he: { home: "דף הבית", feed: "פיד", sos: "חירום", shop: "חנות", chat: "צ'אט", upload: "העלאה", story: "סטורי", post: "פוסט", document: "מסמך", switchPet: "החלף חיית מחמד" },
  en: { home: "Home", feed: "Feed", sos: "SOS", shop: "Shop", chat: "Chat", upload: "Upload", story: "Story", post: "Post", document: "Document", switchPet: "Switch Pet" },
  ar: { home: "الرئيسية", feed: "فيد", sos: "طوارئ", shop: "متجر", chat: "دردشة", upload: "رفع", story: "ستوري", post: "منشور", document: "مستند", switchPet: "تبديل الحيوان" },
};

// ── NavItem ───────────────────────────────────
interface NavItemProps {
  icon: React.ReactNode;
  isActive: boolean;
  label: string;
  onClick?: () => void;
  accentColor?: string;
}

const NavItem = ({ icon, isActive, label, onClick, accentColor }: NavItemProps) => (
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
      {isActive && (
        <motion.div
          layoutId="nav-active-pill"
          className="absolute -inset-x-3 -inset-y-1 rounded-2xl"
          style={{ backgroundColor: accentColor ? `${accentColor}15` : undefined }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <div className="relative z-10">{icon}</div>
      <span
        className={cn(
          "text-[10px] font-medium relative z-10 transition-colors",
          isActive ? "font-semibold" : "text-muted-foreground"
        )}
        style={isActive && accentColor ? { color: accentColor } : isActive ? { color: "hsl(var(--primary))" } : undefined}
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
  const { activePet, pets, switchPet: contextSwitchPet } = usePetPreference();

  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showEmergencyHub, setShowEmergencyHub] = useState(false);
  const [showPetSwitcher, setShowPetSwitcher] = useState(false);
  const { unreadCount } = useRealtimeNotifications();

  // Long-press detection
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const handlePetPointerDown = useCallback(() => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      if (pets.length > 1) {
        setShowPetSwitcher(true);
      }
    }, 500);
  }, [pets.length]);

  const handlePetPointerUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (!longPressTriggered.current) {
      // Short tap — navigate home
      if (location.pathname === "/") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        navigate("/");
      }
    }
  }, [location.pathname, navigate]);

  const handlePetPointerLeave = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handleSwitchPet = (petId: string) => {
    contextSwitchPet(petId);
    setShowPetSwitcher(false);
  };

  // Hidden routes
  const hiddenRoutes = ["/auth", "/signup", "/forgot-password", "/reset-password", "/splash", "/add-pet", "/onboarding", "/stories", "/story"];
  const isHiddenPage = hiddenRoutes.some((r) => location.pathname.startsWith(r));

  if (isHiddenPage) return null;

  // Smart active detection
  const isActive = (path: string) => {
    const p = location.pathname;
    if (path === "/") return p === "/";
    if (path === "/shop") return p === "/shop" || p.startsWith("/product/") || p === "/cart" || p === "/checkout" || p.startsWith("/shop/");
    if (path === "/feed") return p === "/feed" || p.startsWith("/post/") || p.startsWith("/story/") || p === "/explore";
    if (path === "/chat") return p === "/chat";
    return p === path;
  };

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

  // Pet accent color for active states
  const petAccent = activePet?.theme_color || undefined;

  // Species-specific fallback icon
  const PetFallbackIcon = activePet?.pet_type === "cat" ? Cat : Dog;

  // ── Nav items ──
  const navItems = [
    {
      key: "home",
      render: () => (
        <div key="home" className="flex flex-col items-center justify-center flex-1 relative">
          <motion.div
            whileTap={{ scale: 0.9 }}
            onPointerDown={handlePetPointerDown}
            onPointerUp={handlePetPointerUp}
            onPointerLeave={handlePetPointerLeave}
            className="relative flex flex-col items-center gap-0.5 cursor-pointer select-none"
          >
            {/* Active ring */}
            {isActive("/") && (
              <motion.div
                layoutId="nav-active-pill"
                className="absolute -inset-x-2 -inset-y-1 rounded-2xl"
                style={{ backgroundColor: petAccent ? `${petAccent}15` : "hsl(var(--primary) / 0.1)" }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            {/* Pet Avatar */}
            <div
              className={cn(
                "relative z-10 rounded-full p-[2px] transition-all",
                isActive("/") ? "ring-2 shadow-md" : "ring-1 ring-border"
              )}
              style={isActive("/") && petAccent
                ? { boxShadow: `0 0 0 2px ${petAccent}, 0 2px 8px ${petAccent}40` }
                : isActive("/")
                  ? { boxShadow: "0 2px 8px hsl(var(--primary) / 0.3)" }
                  : undefined
              }
            >
              <Avatar className="w-7 h-7 border-2 border-background">
                {activePet?.avatar_url ? (
                  <AvatarImage src={activePet.avatar_url} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-muted text-muted-foreground">
                  <PetFallbackIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
                </AvatarFallback>
              </Avatar>
            </div>
            <span
              className={cn(
                "text-[10px] font-medium relative z-10 transition-colors",
                isActive("/") ? "font-semibold" : "text-muted-foreground"
              )}
              style={isActive("/") && petAccent ? { color: petAccent } : isActive("/") ? { color: "hsl(var(--primary))" } : undefined}
            >
              {activePet?.name || labels.home}
            </span>

            {/* Multi-pet indicator dot */}
            {pets.length > 1 && (
              <span
                className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full border border-background z-20"
                style={{ backgroundColor: petAccent || "hsl(var(--primary))" }}
              />
            )}
          </motion.div>
        </div>
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
          accentColor={petAccent}
          icon={
            <Newspaper
              className={cn("w-[22px] h-[22px] transition-colors", isActive("/feed") ? "" : "text-muted-foreground")}
              style={isActive("/feed") && petAccent ? { color: petAccent } : isActive("/feed") ? { color: "hsl(var(--primary))" } : undefined}
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
          accentColor={petAccent}
          icon={
            <ShoppingBag
              className={cn("w-[22px] h-[22px] transition-colors", isActive("/shop") ? "" : "text-muted-foreground")}
              style={isActive("/shop") && petAccent ? { color: petAccent } : isActive("/shop") ? { color: "hsl(var(--primary))" } : undefined}
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
          accentColor={petAccent}
          icon={
            <Sparkles
              className={cn("w-[22px] h-[22px] transition-colors", isActive("/chat") ? "" : "text-muted-foreground")}
              style={isActive("/chat") && petAccent ? { color: petAccent } : isActive("/chat") ? { color: "hsl(var(--primary))" } : undefined}
              strokeWidth={isActive("/chat") ? 2.2 : 1.5}
            />
          }
        />
      ),
    },
  ];

  const orderedItems = isRtl ? navItems : [...navItems].reverse();

  return (
    <>
      <EmergencyHub open={showEmergencyHub} onOpenChange={setShowEmergencyHub} />

      {/* ── Pet Switcher Mini-Menu ──────────── */}
      <AnimatePresence>
        {showPetSwitcher && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998]"
              onClick={() => setShowPetSwitcher(false)}
            />
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.92 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className="fixed bottom-[76px] inset-x-0 mx-auto w-fit z-[9999] px-3 py-2.5 bg-background/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl"
              dir={direction}
            >
              <p className="text-[11px] font-medium text-muted-foreground px-2 pb-1.5">
                {labels.switchPet}
              </p>
              <div className="flex items-center gap-3 px-1">
                {pets.map((pet) => (
                  <motion.button
                    key={pet.id}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSwitchPet(pet.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-1.5 rounded-xl transition-colors min-w-[56px]",
                      pet.id === activePet?.id ? "bg-primary/10" : "hover:bg-muted/60"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-full p-[2px] transition-all",
                        pet.id === activePet?.id ? "ring-2" : "ring-1 ring-border"
                      )}
                      style={pet.id === activePet?.id ? { boxShadow: `0 0 8px ${pet.theme_color || "hsl(var(--primary))"}40` } : undefined}
                    >
                      <Avatar className="w-10 h-10 border-2 border-background">
                        {pet.avatar_url ? <AvatarImage src={pet.avatar_url} className="object-cover" /> : null}
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          {pet.pet_type === "cat" ? <Cat className="w-4 h-4" /> : <Dog className="w-4 h-4" />}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <span className={cn(
                      "text-[11px] font-medium max-w-[56px] truncate",
                      pet.id === activePet?.id ? "text-primary" : "text-foreground"
                    )}>
                      {pet.name}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Upload Menu */}
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
