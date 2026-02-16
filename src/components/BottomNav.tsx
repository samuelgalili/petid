import {
  ShoppingBag,
  Newspaper,
  Sparkles,
  Plus,
  Dog,
  Cat,
  User,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useAuth } from "@/hooks/useAuth";

import { useLanguage } from "@/contexts/LanguageContext";
import { usePetPreference } from "@/contexts/PetPreferenceContext";

// ── Translations ──────────────────────────────
const navLabels = {
  he: { home: "דף הבית", feed: "פיד", pets: "חיות", shop: "חנות", chat: "צ'אט", upload: "העלאה", story: "סטורי", post: "פוסט", document: "מסמך", switchPet: "החלף חיית מחמד", addPet: "הוסף חיית מחמד" },
  en: { home: "Home", feed: "Feed", pets: "Pets", shop: "Shop", chat: "Chat", upload: "Upload", story: "Story", post: "Post", document: "Document", switchPet: "Switch Pet", addPet: "Add Pet" },
  ar: { home: "الرئيسية", feed: "فيد", pets: "حيوانات", shop: "متجر", chat: "دردشة", upload: "رفع", story: "ستوري", post: "منشور", document: "مستند", switchPet: "تبديل الحيوان", addPet: "إضافة حيوان" },
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

  const [showPetSwitcher, setShowPetSwitcher] = useState(false);
  const { unreadCount } = useRealtimeNotifications();
  const { user } = useAuth();
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);

  // Fetch user avatar
  useEffect(() => {
    if (!user) return;
    const fetchAvatar = async () => {
      const { data } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
      const authAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
      setUserAvatarUrl(data?.avatar_url || authAvatar || null);
    };
    fetchAvatar();
  }, [user]);

  // Listen for cross-pet safety events and show toast
  useEffect(() => {
    const handler = (e: Event) => {
      const { sickPets } = (e as CustomEvent).detail;
      if (sickPets?.length > 0) {
        import("sonner").then(({ toast }) => {
          const names = sickPets.map((p: any) => p.name).join(", ");
          toast.warning(`שימו לב: ל${names} יש מצב רפואי פעיל`, {
            description: "מומלץ לבדוק את המוצרים המתאימים",
            duration: 4000,
          });
        });
      }
    };
    window.addEventListener("petid:fleet-safety", handler);
    return () => window.removeEventListener("petid:fleet-safety", handler);
  }, []);
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
      // Short tap — navigate to home
      if (location.pathname === '/') {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        navigate('/');
      }
    }
  }, [location.pathname, navigate, activePet]);

  const handlePetPointerLeave = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handleSwitchPet = (petId: string) => {
    contextSwitchPet(petId);
    setShowPetSwitcher(false);
    navigate('/');
  };

  // Hidden routes
  const hiddenRoutes = ["/auth", "/signup", "/forgot-password", "/reset-password", "/splash", "/add-pet", "/onboarding", "/stories", "/story"];
  const isHiddenPage = hiddenRoutes.some((r) => location.pathname.startsWith(r));

  if (isHiddenPage) return null;

  // Smart active detection
  const isActive = (path: string) => {
    const p = location.pathname;
    if (path === "/profile-nav") return p === "/";
    if (path === "/") return p === "/" || p.startsWith("/pet/");
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

  // Pet accent color for active states
  const petAccent = activePet?.theme_color || undefined;

  // Species-specific fallback icon
  const PetFallbackIcon = activePet?.pet_type === "cat" ? Cat : Dog;

  // ── Nav items ──
  const navItems = [
    {
      key: "profile",
      render: () => (
        <NavItem
          key="profile"
          onClick={() => handleNavClick("/")}
          isActive={isActive("/profile-nav")}
          label={labels.home}
          accentColor={petAccent}
          icon={
            <Avatar className="w-[24px] h-[24px]">
              {userAvatarUrl ? (
                <AvatarImage src={userAvatarUrl} className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-muted text-muted-foreground">
                <User className="w-3.5 h-3.5" strokeWidth={1.5} />
              </AvatarFallback>
            </Avatar>
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
      key: "pets",
      render: () => (
        <div key="pets" className="flex flex-col items-center justify-center flex-1 relative">
          <motion.div
            whileTap={{ scale: 0.9 }}
            onPointerDown={handlePetPointerDown}
            onPointerUp={handlePetPointerUp}
            onPointerLeave={handlePetPointerLeave}
            className="relative -mt-7 flex flex-col items-center cursor-pointer select-none"
          >
            <div
              className="w-[56px] h-[56px] rounded-full p-[3px] bg-background shadow-lg"
              style={{
                boxShadow: `0 0 0 3px ${petAccent || "hsl(209, 79%, 52%)"}, 0 2px 12px ${petAccent || "hsl(209, 79%, 52%)"}30`
              }}
            >
              <Avatar className="w-full h-full border-[2.5px] border-background rounded-full">
                {activePet?.avatar_url ? (
                  <AvatarImage src={activePet.avatar_url} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-muted text-muted-foreground">
                  <PetFallbackIcon className="w-6 h-6" strokeWidth={1.5} />
                </AvatarFallback>
              </Avatar>
            </div>
            {/* Multi-pet indicator */}
            {pets.length > 1 && (
              <span
                className="absolute top-0 -right-0.5 w-3 h-3 rounded-full border-2 border-background z-20"
                style={{ backgroundColor: petAccent || "hsl(var(--primary))" }}
              />
            )}
          </motion.div>
          <span
            className={cn(
              "text-[10px] font-semibold mt-1 transition-colors",
              isActive("/") ? "" : "text-muted-foreground"
            )}
            style={{ color: isActive("/") ? (petAccent || "hsl(var(--primary))") : undefined }}
          >
            {activePet?.name || labels.pets}
          </span>
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
              className="fixed bottom-[76px] inset-x-0 mx-auto w-fit z-[9999] px-4 py-3 bg-background/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl"
              dir={direction}
            >
              <div className="flex items-center gap-4">
                {/* Add Pet */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setShowPetSwitcher(false); navigate('/add-pet'); }}
                  className="flex flex-col items-center gap-1.5 min-w-[60px]"
                >
                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {labels.addPet}
                  </span>
                </motion.button>

                {/* Pet list */}
                {pets.map((pet) => (
                  <motion.button
                    key={pet.id}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSwitchPet(pet.id)}
                    className="flex flex-col items-center gap-1.5 min-w-[60px]"
                  >
                    <div
                      className={cn(
                        "w-14 h-14 rounded-full p-[2.5px] transition-all",
                        pet.id === activePet?.id ? "ring-[2.5px]" : "ring-1 ring-border"
                      )}
                      style={pet.id === activePet?.id 
                        ? { boxShadow: `0 0 0 2.5px ${pet.theme_color || "hsl(var(--primary))"}` } 
                        : undefined
                      }
                    >
                      <Avatar className="w-full h-full border-2 border-background">
                        {pet.avatar_url ? <AvatarImage src={pet.avatar_url} className="object-cover" /> : null}
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          {pet.pet_type === "cat" ? <Cat className="w-5 h-5" /> : <Dog className="w-5 h-5" />}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <span className={cn(
                      "text-[11px] font-medium max-w-[60px] truncate",
                      pet.id === activePet?.id ? "text-primary font-semibold" : "text-foreground"
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
