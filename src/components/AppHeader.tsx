/**
 * Unified AppHeader — Glassmorphism header with role-based actions
 * and context-aware navigation (back arrow vs menu).
 */
import { ArrowRight, Menu, Bell, Shield, Store, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useMemo } from "react";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { useUserRole } from "@/hooks/useUserRole";
import { useNotificationsBadge } from "@/hooks/useNotificationsBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import petidIcon from "@/assets/petid-icon.png";

interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  showMenuButton?: boolean;
  /** Override: force hiding the role action on the right */
  hideRoleAction?: boolean;
  /** Custom right-side action (overrides role-based action) */
  extraAction?: {
    icon: LucideIcon;
    onClick: () => void;
  };
  /** Set true on dark pages so icons render white */
  dark?: boolean;
}

/** Pages where the Feed/home context is active → show Menu, not Back */
const FEED_ROOTS = ["/", "/feed"];

export const AppHeader = ({
  title,
  showBackButton,
  showMenuButton,
  hideRoleAction = false,
  extraAction,
  dark = false,
}: AppHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { direction } = useLanguage();
  const isRtl = direction === "rtl";
  const { role, isAdmin, isBusiness } = useUserRole();
  const { unreadCount } = useNotificationsBadge();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Determine nav mode: explicit props > auto-detect from route
  const isFeedRoot = FEED_ROOTS.includes(location.pathname);
  const shouldShowBack = showBackButton ?? !isFeedRoot;
  const shouldShowMenu = showMenuButton ?? isFeedRoot;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  // Role-based right action
  const roleAction = useMemo(() => {
    if (hideRoleAction || extraAction) return null;

    if (isAdmin) {
      return {
        icon: Shield,
        label: "ניהול",
        onClick: () => navigate("/admin/growo"),
        badge: null as string | null,
      };
    }
    if (isBusiness) {
      return {
        icon: Store,
        label: "חנות",
        onClick: () => navigate("/business-dashboard"),
        badge: null,
      };
    }
    // Regular user → notifications
    return {
      icon: Bell,
      label: "התראות",
      onClick: () => navigate("/notifications"),
      badge: unreadCount > 0 ? (unreadCount > 9 ? "9+" : String(unreadCount)) : null,
    };
  }, [isAdmin, isBusiness, hideRoleAction, extraAction, unreadCount, navigate]);

  return (
    <>
      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <div
        className="fixed top-0 left-0 right-0 h-11 z-40 flex items-center justify-between px-4"
        style={{
          backdropFilter: "blur(15px)",
          WebkitBackdropFilter: "blur(15px)",
          background: dark
            ? "hsla(240, 20%, 8%, 0.8)"
            : "hsl(var(--background) / 0.8)",
          borderBottom: "1px solid hsl(var(--border) / 0.2)",
        }}
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Left (RTL: Right) — Navigation */}
        <div className="flex items-center gap-1 w-10">
          {shouldShowBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="rounded-full h-8 w-8"
              aria-label="חזור"
            >
              <ArrowRight
                className="w-[18px] h-[18px]"
                style={{ color: dark ? "white" : "hsl(var(--foreground))" }}
                strokeWidth={1.5}
              />
            </Button>
          )}
          {shouldShowMenu && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(true)}
              className="rounded-full h-8 w-8"
              aria-label="תפריט"
            >
              <Menu
                className="w-[18px] h-[18px]"
                style={{ color: dark ? "white" : "hsl(var(--foreground))" }}
                strokeWidth={1.5}
              />
            </Button>
          )}
        </div>

        {/* Center — Title + role badge */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          <img src={petidIcon} alt="PetID" className="w-5 h-5 object-contain" />
          <h1
            className="text-sm font-semibold truncate max-w-[160px]"
            style={{ color: dark ? "white" : "hsl(var(--foreground))" }}
          >
            {title}
          </h1>
          {isAdmin && (
            <span
              className="text-[9px] font-bold uppercase px-1.5 py-[1px] rounded-full"
              style={{
                background: "hsl(var(--primary) / 0.12)",
                color: "hsl(var(--primary))",
                border: "1px solid hsl(var(--primary) / 0.2)",
              }}
            >
              Admin
            </span>
          )}
        </div>

        {/* Right (RTL: Left) — Role Action */}
        <div className="flex items-center gap-1 w-10 justify-end">
          {extraAction ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={extraAction.onClick}
              className="rounded-full h-8 w-8"
              aria-label="פעולה"
            >
              <extraAction.icon
                className="w-[18px] h-[18px]"
                style={{ color: dark ? "white" : "hsl(var(--foreground))" }}
                strokeWidth={1.5}
              />
            </Button>
          ) : roleAction ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={roleAction.onClick}
              className="rounded-full h-8 w-8 relative"
              aria-label={roleAction.label}
            >
              <roleAction.icon
                className="w-[18px] h-[18px]"
                style={{ color: dark ? "white" : "hsl(var(--foreground))" }}
                strokeWidth={1.5}
              />
              {roleAction.badge && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-bold text-white px-[3px]"
                  style={{
                    background: "hsl(var(--destructive))",
                    boxShadow: "0 0 6px hsl(var(--destructive) / 0.5)",
                  }}
                >
                  {roleAction.badge}
                </motion.span>
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Spacer */}
      <div className="h-11" />
    </>
  );
};
