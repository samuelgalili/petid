/**
 * CelebrationScreen — V72 Success & Celebration overlay
 * Triggers after OCR scan, purchase, or vaccine update.
 * Features: paw-print confetti, animated health score circle,
 * neon-glow dark mode, share card.
 */

import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Share2, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { EASING } from "@/lib/animations";

/* ─── Types ─── */

export type CelebrationTrigger = "ocr_scan" | "purchase" | "vaccine_update" | "general";

export interface CelebrationScreenProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: CelebrationTrigger;
  petName?: string;
  petImageUrl?: string;
  petType?: "dog" | "cat";
  /** Previous health score (animate from) */
  scoreFrom?: number;
  /** New health score (animate to) */
  scoreTo?: number;
  /** Custom title override */
  title?: string;
  /** Custom subtitle override */
  subtitle?: string;
  /** Where "Back to Dashboard" navigates */
  dashboardPath?: string;
}

/* ─── Paw-print confetti ─── */

function firePawConfetti() {
  const petidColors = ["#0099E6", "#37B679", "#FFB800", "#E8725A"];

  // Burst 1 — center
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.5 },
    colors: petidColors,
    shapes: ["circle", "square"],
    scalar: 1.2,
    ticks: 120,
  });

  // Burst 2 — left
  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: petidColors,
      scalar: 1,
    });
  }, 200);

  // Burst 3 — right
  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: petidColors,
      scalar: 1,
    });
  }, 400);
}

/* ─── Animated SVG Health Score Circle ─── */

const HealthScoreCircle = ({
  from,
  to,
  isDark,
}: {
  from: number;
  to: number;
  isDark: boolean;
}) => {
  const [displayScore, setDisplayScore] = useState(from);

  useEffect(() => {
    const start = Date.now();
    const duration = 1500;
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart
      setDisplayScore(Math.round(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    const timer = setTimeout(() => requestAnimationFrame(animate), 600);
    return () => clearTimeout(timer);
  }, [from, to]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokePct = ((100 - displayScore) / 100) * circumference;

  const getColor = () => {
    if (displayScore >= 85) return "hsl(142, 71%, 45%)";
    if (displayScore >= 70) return "hsl(204, 100%, 48%)";
    if (displayScore >= 50) return "hsl(38, 92%, 50%)";
    return "hsl(0, 84%, 60%)";
  };

  return (
    <motion.div
      className="relative"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.6, ease: EASING.easeOut as any }}
    >
      <svg width="160" height="160" viewBox="0 0 120 120" className="drop-shadow-lg">
        {/* Glow filter for dark mode */}
        {isDark && (
          <defs>
            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor={getColor()} floodOpacity="0.6" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        )}

        {/* Background track */}
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
          opacity={0.3}
        />

        {/* Animated progress arc */}
        <motion.circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          filter={isDark ? "url(#neonGlow)" : undefined}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: strokePct }}
          transition={{ duration: 1.5, delay: 0.6, ease: "easeOut" }}
          transform="rotate(-90 60 60)"
        />
      </svg>

      {/* Score number */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={cn(
            "text-4xl font-bold tabular-nums",
            isDark && "drop-shadow-[0_0_12px_rgba(0,153,230,0.6)]"
          )}
          style={{ color: getColor() }}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.15, 1] }}
          transition={{ delay: 0.8, duration: 0.5, ease: EASING.bounce as any }}
        >
          {displayScore}
        </motion.span>
        <span className="text-xs text-muted-foreground font-medium mt-0.5">ציון בריאות</span>
      </div>
    </motion.div>
  );
};

/* ─── Floating paw prints decoration ─── */

const FloatingPaws = ({ isDark }: { isDark: boolean }) => {
  const paws = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    x: 15 + Math.random() * 70,
    delay: 0.3 + i * 0.2,
    size: 16 + Math.random() * 12,
    rotation: -30 + Math.random() * 60,
  }));

  return (
    <>
      {paws.map((p) => (
        <motion.span
          key={p.id}
          className={cn(
            "absolute text-primary/20 pointer-events-none select-none",
            isDark && "text-primary/30 drop-shadow-[0_0_8px_rgba(0,153,230,0.4)]"
          )}
          style={{
            left: `${p.x}%`,
            top: `${10 + Math.random() * 70}%`,
            fontSize: p.size,
          }}
          initial={{ opacity: 0, scale: 0, rotate: p.rotation }}
          animate={{ opacity: 1, scale: 1, rotate: p.rotation + 10 }}
          transition={{ delay: p.delay, duration: 0.5, ease: EASING.bounce as any }}
        >
          🐾
        </motion.span>
      ))}
    </>
  );
};

/* ─── Main Component ─── */

export const CelebrationScreen = ({
  isOpen,
  onClose,
  trigger = "general",
  petName = "חיית המחמד שלך",
  petType = "dog",
  scoreFrom = 90,
  scoreTo = 95,
  title,
  subtitle,
  dashboardPath = "/dashboard",
}: CelebrationScreenProps) => {
  const navigate = useNavigate();
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === "dark";

  const defaultTitle = "מעולה! המידע עודכן בהצלחה";
  const defaultSubtitle = `${petName} מודה לך, עכשיו ${petType === "cat" ? "היא" : "הוא"} בטוח/ה ב-${scoreTo}%`;

  // Fire confetti on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(firePawConfetti, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleBackToDashboard = useCallback(() => {
    onClose();
    navigate(dashboardPath);
  }, [onClose, navigate, dashboardPath]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: `${petName} - ציון בריאות ${scoreTo}%`,
      text: `${petName} בציון בריאות ${scoreTo}%! 🐾✨ מנוהל באמצעות PetID`,
      url: window.location.origin,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(
        `${shareData.text}\n${shareData.url}`
      );
    }
  }, [petName, scoreTo]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className={cn(
              "absolute inset-0",
              isDark
                ? "bg-background/90 backdrop-blur-xl"
                : "bg-background/80 backdrop-blur-lg"
            )}
            onClick={onClose}
          />

          {/* Content */}
          <motion.div
            className={cn(
              "relative z-10 w-full max-w-sm flex flex-col items-center text-center rounded-3xl p-8 overflow-hidden",
              isDark
                ? "bg-card/90 border border-primary/20 shadow-[0_0_60px_-15px_rgba(0,153,230,0.3)]"
                : "bg-card border border-border/50 shadow-2xl"
            )}
            initial={{ scale: 0.8, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 40, opacity: 0 }}
            transition={{ duration: 0.5, ease: EASING.easeOut as any }}
          >
            {/* Floating paw decorations */}
            <FloatingPaws isDark={isDark} />

            {/* Sparkle icon */}
            <motion.div
              className={cn(
                "mb-4",
                isDark && "drop-shadow-[0_0_20px_rgba(255,184,0,0.5)]"
              )}
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4, ease: EASING.bounce as any }}
            >
              <Sparkles className="w-10 h-10 text-petid-gold" strokeWidth={1.5} />
            </motion.div>

            {/* Pet emoji illustration */}
            <motion.div
              className={cn(
                "text-6xl mb-2 select-none",
                isDark && "drop-shadow-[0_0_16px_rgba(0,153,230,0.4)]"
              )}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {petType === "cat" ? "😸" : "🐕"}
            </motion.div>

            {/* Health Score Circle */}
            <HealthScoreCircle from={scoreFrom} to={scoreTo} isDark={isDark} />

            {/* Title */}
            <motion.h2
              className={cn(
                "text-xl font-bold text-foreground mt-5",
                isDark && "drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]"
              )}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.4 }}
            >
              {title || defaultTitle}
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-[280px]"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.85, duration: 0.4 }}
            >
              {subtitle || defaultSubtitle}
            </motion.p>

            {/* Actions */}
            <motion.div
              className="flex flex-col gap-3 w-full mt-7"
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1, duration: 0.4 }}
            >
              <Button
                size="lg"
                variant="default"
                className="w-full text-base"
                onClick={handleBackToDashboard}
              >
                חזרה לדשבורד
                <ArrowRight className="w-4 h-4 mr-1 rtl:rotate-180" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                className={cn(
                  "w-full text-base",
                  isDark && "border-primary/30 hover:border-primary/50 hover:shadow-[0_0_15px_-5px_rgba(0,153,230,0.3)]"
                )}
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4 ml-1" strokeWidth={1.5} />
                שתף סטטוס בריאות
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
