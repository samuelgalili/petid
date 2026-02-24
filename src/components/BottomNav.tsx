import {
  ShoppingBag,
  Sparkles,
  Plus,
  Dog,
  Cat,
  Camera,
  ScanLine,
  MessageCircle,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { usePetButtonAnimation, PetButtonOverlay } from "@/components/ui/PetButtonAnimations";
import { useOverlayNav } from "@/contexts/OverlayNavContext";

const navLabels = {
  he: { feed: "פיד", shop: "חנות", chat: "AI", addPet: "הוסף חיית מחמד" },
  en: { feed: "Feed", shop: "Shop", chat: "AI", addPet: "Add Pet" },
  ar: { feed: "فيد", shop: "متجر", chat: "AI", addPet: "إضافة حيوان" },
};

const quickActions = {
  he: [
    { key: "upload", icon: Camera, label: "העלאה", path: "/feed", color: "#FF6B8A" },
    { key: "scan", icon: ScanLine, label: "סריקה", path: "/chat", color: "#4ECDC4" },
    { key: "chat", icon: MessageCircle, label: "צ'אט", path: "/chat", color: "#7C5CFC" },
  ],
  en: [
    { key: "upload", icon: Camera, label: "Upload", path: "/feed", color: "#FF6B8A" },
    { key: "scan", icon: ScanLine, label: "Scan", path: "/chat", color: "#4ECDC4" },
    { key: "chat", icon: MessageCircle, label: "Chat", path: "/chat", color: "#7C5CFC" },
  ],
  ar: [
    { key: "upload", icon: Camera, label: "رفع", path: "/feed", color: "#FF6B8A" },
    { key: "scan", icon: ScanLine, label: "مسح", path: "/chat", color: "#4ECDC4" },
    { key: "chat", icon: MessageCircle, label: "دردشة", path: "/chat", color: "#7C5CFC" },
  ],
};

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, direction } = useLanguage();
  const isRtl = direction === "rtl";
  const labels = navLabels[language] || navLabels.he;
  const actions = quickActions[language] || quickActions.he;
  const { activePet, pets, switchPet: contextSwitchPet } = usePetPreference();

  const { openDashboard, closeDashboard, dashboardOpen } = useOverlayNav();

  const [showPetSwitcher, setShowPetSwitcher] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const { activeAnim, triggerRandom } = usePetButtonAnimation();

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  // Single tap → floating pet switcher; Long press → open dashboard directly
  const handlePetPointerDown = useCallback(() => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      if (navigator.vibrate) navigator.vibrate(20);
      openDashboard();
    }, 500);
  }, [openDashboard]);

  const handlePetPointerUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (!longPressTriggered.current) {
      triggerRandom();
      if (navigator.vibrate) navigator.vibrate(10);
      setShowPetSwitcher(true);
    }
  }, [triggerRandom]);

  const handlePetPointerLeave = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  // When a pet is selected from switcher → switch pet + open dashboard (slides from top)
  const handleSwitchPet = (petId: string) => {
    contextSwitchPet(petId);
    setShowPetSwitcher(false);
    openDashboard();
  };

  // Tap active pet in switcher → open its dashboard
  const handleOpenActivePetDashboard = () => {
    setShowPetSwitcher(false);
    openDashboard();
  };

  const hiddenRoutes = ["/auth", "/signup", "/forgot-password", "/reset-password", "/splash", "/add-pet", "/onboarding", "/stories", "/story"];
  const isHiddenPage = hiddenRoutes.some((r) => location.pathname.startsWith(r));
  if (isHiddenPage) return null;

  const isActive = (path: string) => {
    const p = location.pathname;
    if (path === "/feed") return p === "/feed" || p === "/" || p.startsWith("/post/") || p.startsWith("/story/") || p === "/explore";
    if (path === "/shop") return p === "/shop" || p.startsWith("/product/") || p === "/cart" || p === "/checkout" || p.startsWith("/shop/");
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

  const petAccent = activePet?.theme_color || undefined;
  const PetFallbackIcon = activePet?.pet_type === "cat" ? Cat : Dog;

  return (
    <>
      {/* ── Quick Actions Radial Menu ── */}
      <AnimatePresence>
        {showQuickActions && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9997] bg-black/30 backdrop-blur-sm"
              onClick={() => setShowQuickActions(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 30 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="fixed bottom-[80px] inset-x-0 mx-auto w-fit z-[9999] flex items-end gap-4 px-6 py-4"
            >
              {actions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.key}
                    initial={{ opacity: 0, y: 20, scale: 0.7 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.7 }}
                    transition={{ delay: i * 0.06, type: "spring", stiffness: 500, damping: 25 }}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => {
                      setShowQuickActions(false);
                      navigate(action.path);
                    }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${action.color}30, ${action.color}15)`,
                        border: `1.5px solid ${action.color}40`,
                        backdropFilter: "blur(12px)",
                      }}
                    >
                      <Icon className="w-6 h-6" style={{ color: action.color }} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] font-semibold text-white drop-shadow-md">
                      {action.label}
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Pet Switcher (Long Press only) ── */}
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
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setShowPetSwitcher(false); navigate('/add-pet'); }}
                  className="flex flex-col items-center gap-1.5 min-w-[60px]"
                >
                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">{labels.addPet}</span>
                </motion.button>
                {pets.map((pet) => {
                  const isCurrentActive = pet.id === activePet?.id;
                  return (
                    <motion.button
                      key={pet.id}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => isCurrentActive ? handleOpenActivePetDashboard() : handleSwitchPet(pet.id)}
                      className="flex flex-col items-center gap-1.5 min-w-[60px]"
                    >
                      <div
                        className={cn(
                          "w-14 h-14 rounded-full p-[2.5px] transition-all",
                          isCurrentActive ? "ring-[2.5px]" : "ring-1 ring-border"
                        )}
                        style={isCurrentActive
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
                        isCurrentActive ? "text-primary font-semibold" : "text-foreground"
                      )}>
                        {pet.name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating FAB (+) — always bottom-right, hidden when dashboard is open */}
      {!dashboardOpen && (
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => setShowQuickActions((v) => !v)}
          className="fixed z-[10000] w-11 h-11 rounded-full flex items-center justify-center bg-transparent border-[1.5px] border-primary/60 text-primary backdrop-blur-sm left-4"
          style={{ bottom: `calc(72px + env(safe-area-inset-bottom))` }}
          aria-label="Quick actions"
        >
          <motion.div
            animate={{ rotate: showQuickActions ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            {showQuickActions ? (
              <X className="w-5 h-5" strokeWidth={2} />
            ) : (
              <Plus className="w-5 h-5" strokeWidth={2} />
            )}
          </motion.div>
        </motion.button>
      )}

      {/* ── Bottom Navigation Bar ── */}
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[9999]",
          "bg-background/80 dark:bg-[hsl(0,0%,5%)]/80 backdrop-blur-xl backdrop-saturate-150",
          "shadow-[0_-1px_8px_rgba(0,0,0,0.06)]",
          "pb-[env(safe-area-inset-bottom)]"
        )}
        role="navigation"
        aria-label={isRtl ? "ניווט ראשי" : "Main navigation"}
        dir={direction}
      >
        <div className="flex justify-around items-center w-full max-w-lg mx-auto h-[64px]">
          {/* Chat (AI) — Left */}
          <NavButton
            onClick={() => handleNavClick("/chat")}
            active={isActive("/chat")}
            label={labels.chat}
            accent={petAccent}
          >
            <Sparkles
              className={cn("w-[22px] h-[22px] transition-colors", !isActive("/chat") && "text-muted-foreground")}
              style={isActive("/chat") ? { color: petAccent || "hsl(var(--primary))" } : undefined}
              strokeWidth={isActive("/chat") ? 2.2 : 1.5}
            />
          </NavButton>

          {/* Center: Pet Avatar */}
          <div className="flex flex-col items-center justify-center relative">
            <motion.div
              whileTap={{ scale: 0.9 }}
              onPointerDown={handlePetPointerDown}
              onPointerUp={handlePetPointerUp}
              onPointerLeave={handlePetPointerLeave}
              className="relative -mt-8 flex flex-col items-center cursor-pointer select-none"
            >
              <div
                className="w-[58px] h-[58px] rounded-full p-[2.5px] bg-background shadow-lg"
                style={{
                  boxShadow: `0 0 0 2.5px ${petAccent || "hsl(209, 79%, 52%)"}, 0 4px 16px ${petAccent || "hsl(209, 79%, 52%)"}25`
                }}
              >
                <Avatar className="w-full h-full border-[2px] border-background rounded-full">
                  {activePet?.avatar_url ? (
                    <AvatarImage src={activePet.avatar_url} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <PetFallbackIcon className="w-6 h-6" strokeWidth={1.5} />
                  </AvatarFallback>
                </Avatar>
              </div>
              {pets.length > 1 && (
                <span
                  className="absolute top-0 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background z-20"
                  style={{ backgroundColor: petAccent || "hsl(var(--primary))" }}
                />
              )}
              <PetButtonOverlay activeAnim={activeAnim} />
            </motion.div>
            <span
              className="text-[10px] font-semibold mt-0.5 transition-colors truncate max-w-[56px]"
              style={{ color: petAccent || "hsl(var(--primary))" }}
            >
              {activePet?.name || ""}
            </span>
          </div>

          {/* Shop */}
          <NavButton
            onClick={() => handleNavClick("/shop")}
            active={isActive("/shop")}
            label={labels.shop}
            accent={petAccent}
          >
            <ShoppingBag
              className={cn("w-[22px] h-[22px] transition-colors", !isActive("/shop") && "text-muted-foreground")}
              style={isActive("/shop") ? { color: petAccent || "hsl(var(--primary))" } : undefined}
              strokeWidth={isActive("/shop") ? 2.2 : 1.5}
            />
          </NavButton>
        </div>
      </nav>
    </>
  );
};

/* ── NavButton ── */
function NavButton({
  children,
  onClick,
  active,
  label,
  accent,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active: boolean;
  label: string;
  accent?: string;
}) {
  return (
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
        {active && (
          <motion.div
            layoutId="nav-active-dot"
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: accent || "hsl(var(--primary))" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <div className="relative z-10">{children}</div>
        <span
          className={cn(
            "text-[10px] font-medium relative z-10 transition-colors",
            active ? "font-semibold" : "text-muted-foreground"
          )}
          style={active ? { color: accent || "hsl(var(--primary))" } : undefined}
        >
          {label}
        </span>
      </motion.div>
    </button>
  );
}

export default BottomNav;
