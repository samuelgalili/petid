import { Bot, Grid2X2, PawPrint } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

import defaultPetAvatar from "@/assets/default-pet-avatar.png";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { activePet } = usePetPreference();
  const hidden = ["/auth", "/signup", "/forgot-password", "/reset-password", "/onboarding", "/add-pet"]
    .some((path) => pathname.startsWith(path));

  if (hidden || pathname.startsWith("/admin")) return null;

  const items = [
    { path: "/feed", label: "קהילה", icon: Grid2X2, active: pathname === "/feed" },
    { path: "/chat", label: "Mipo AI", icon: Bot, active: pathname === "/chat" },
    { path: "/", label: activePet?.name || "החיה שלי", icon: PawPrint, active: pathname === "/" },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[10000] border-t border-black/[0.06] bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl"
      aria-label="ניווט ראשי"
      dir="rtl"
    >
      <div className="mx-auto grid h-[68px] max-w-lg grid-cols-3 px-5">
        {items.map(({ path, label, icon: Icon, active }) => (
          <button
            key={path}
            onClick={() => pathname === path ? window.scrollTo({ top: 0, behavior: "smooth" }) : navigate(path)}
            className="relative flex min-h-11 flex-col items-center justify-center gap-1"
            aria-current={active ? "page" : undefined}
            aria-label={label}
          >
            {path === "/" && activePet?.avatar_url ? (
              <span className={cn("rounded-full p-[2px]", active && "mipo-gradient-ring")}>
                <img src={activePet.avatar_url || defaultPetAvatar} alt="" className="h-7 w-7 rounded-full border border-white object-cover" />
              </span>
            ) : (
              <Icon className={cn("h-[22px] w-[22px]", active ? "text-mipo-ink" : "text-mipo-muted")} strokeWidth={active ? 2 : 1.6} />
            )}
            <span className={cn("text-[11px]", active ? "font-semibold text-mipo-ink" : "font-medium text-mipo-muted")}>{label}</span>
            {active && (
              <motion.span
                layoutId="mipo-nav-indicator"
                className="absolute bottom-0 h-1 w-7 rounded-full bg-[var(--gradient-primary)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
