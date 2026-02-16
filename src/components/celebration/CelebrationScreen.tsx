/**
 * CelebrationScreen — V73 Positive Reinforcement Engine
 * Triggers after OCR scan, purchase, or vaccine update.
 * Features: quantified impact, species emojis, shareable health card,
 * contextual next steps, paw confetti, animated score circle,
 * neon-glow dark mode.
 */

import { useEffect, useCallback, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Share2, Sparkles, ShoppingBag, Shield, Stethoscope, Camera } from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { EASING } from "@/lib/animations";
import { useToast } from "@/hooks/use-toast";

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
  /** Callback when user picks a next-step */
  onNextStep?: (step: string) => void;
}

/* ─── Species-aware helpers ─── */

function petEmoji(type: "dog" | "cat") {
  return type === "cat" ? "🐱" : "🐶";
}

function happyPetEmoji(type: "dog" | "cat") {
  return type === "cat" ? "😸" : "🐕";
}

function pronoun(type: "dog" | "cat") {
  return type === "cat" ? "היא" : "הוא";
}

/* ─── Quantified impact per trigger ─── */

function getImpactMessage(
  trigger: CelebrationTrigger,
  petName: string,
  petType: "dog" | "cat",
  scoreDelta: number
) {
  const emoji = petEmoji(petType);
  const pro = pronoun(petType);

  switch (trigger) {
    case "vaccine_update":
      return `${emoji} ${petName} עכשיו ${scoreDelta}% יותר מוגנ${petType === "cat" ? "ת" : ""}`;
    case "ocr_scan":
      return `${emoji} הרשומה הרפואית של ${petName} עודכנה — ${pro} בטוח${petType === "cat" ? "ה" : ""} יותר ב-${scoreDelta}%`;
    case "purchase":
      return `${emoji} מוצר חדש בדרך ל${petName} — ציון הבריאות עלה ב-${scoreDelta}%`;
    default:
      return `${emoji} ${petName} עכשיו בטוח${petType === "cat" ? "ה" : ""} יותר ב-${scoreDelta}%`;
  }
}

/* ─── Contextual next steps per trigger ─── */

interface NextStep {
  id: string;
  label: string;
  icon: typeof ShoppingBag;
  path: string;
}

function getNextSteps(trigger: CelebrationTrigger, petType: "dog" | "cat"): NextStep[] {
  const emoji = petEmoji(petType);

  switch (trigger) {
    case "vaccine_update":
      return [
        { id: "outdoor_toys", label: `${emoji} צעצועים לחוץ`, icon: ShoppingBag, path: "/shop?category=toys" },
        { id: "insurance", label: "בדוק ביטוח", icon: Shield, path: "/insurance" },
      ];
    case "ocr_scan":
      return [
        { id: "vet_checkup", label: "קבע בדיקה הבאה", icon: Stethoscope, path: "/chat" },
        { id: "photo_update", label: "עדכן תמונה", icon: Camera, path: "/profile" },
      ];
    case "purchase":
      return [
        { id: "health_check", label: "בדיקת בריאות", icon: Stethoscope, path: "/chat" },
        { id: "more_products", label: "מוצרים נוספים", icon: ShoppingBag, path: "/shop" },
      ];
    default:
      return [
        { id: "shop", label: "חנות PetID", icon: ShoppingBag, path: "/shop" },
      ];
  }
}

/* ─── Paw-print confetti ─── */

function firePawConfetti() {
  const petidColors = ["#0099E6", "#37B679", "#FFB800", "#E8725A"];

  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.5 },
    colors: petidColors,
    shapes: ["circle", "square"],
    scalar: 1.2,
    ticks: 120,
  });

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
      const eased = 1 - Math.pow(1 - progress, 4);
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

        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
          opacity={0.3}
        />

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

/* ─── Floating paw prints ─── */

const FloatingPaws = ({ isDark }: { isDark: boolean }) => {
  const paws = useMemo(() => Array.from({ length: 6 }, (_, i) => ({
    id: i,
    x: 15 + Math.random() * 70,
    y: 10 + Math.random() * 70,
    delay: 0.3 + i * 0.2,
    size: 16 + Math.random() * 12,
    rotation: -30 + Math.random() * 60,
  })), []);

  return (
    <>
      {paws.map((p) => (
        <motion.span
          key={p.id}
          className={cn(
            "absolute text-primary/20 pointer-events-none select-none",
            isDark && "text-primary/30 drop-shadow-[0_0_8px_rgba(0,153,230,0.4)]"
          )}
          style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: p.size }}
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

/* ─── Shareable Health Card (canvas-based) ─── */

async function generateShareableCard(
  petName: string,
  petType: "dog" | "cat",
  score: number,
): Promise<Blob | null> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 340;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 600, 340);
    grad.addColorStop(0, "#0099E6");
    grad.addColorStop(1, "#37B679");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(0, 0, 600, 340, 24);
    ctx.fill();

    // Semi-transparent overlay
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.roundRect(20, 20, 560, 300, 16);
    ctx.fill();

    // Pet emoji
    ctx.font = "64px serif";
    ctx.textAlign = "center";
    ctx.fillText(petType === "cat" ? "😸" : "🐕", 300, 90);

    // Pet name
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px Assistant, sans-serif";
    ctx.fillText(petName, 300, 140);

    // Score circle placeholder
    ctx.beginPath();
    ctx.arc(300, 210, 42, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fill();

    // Score arc
    ctx.beginPath();
    ctx.arc(300, 210, 42, -Math.PI / 2, -Math.PI / 2 + (score / 100) * Math.PI * 2);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.stroke();

    // Score text
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 28px Assistant, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${score}%`, 300, 220);

    // Footer
    ctx.font = "16px Assistant, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText("ציון בריאות • PetID", 300, 310);

    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  } catch {
    return null;
  }
}

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
  onNextStep,
}: CelebrationScreenProps) => {
  const navigate = useNavigate();
  const { effectiveTheme } = useTheme();
  const { toast } = useToast();
  const isDark = effectiveTheme === "dark";

  const scoreDelta = scoreTo - scoreFrom;
  const emoji = petEmoji(petType);

  // V73: Quantified impact title
  const defaultTitle = "מעולה! המידע עודכן בהצלחה";

  // V73: Quantified benefit subtitle
  const impactMessage = useMemo(
    () => getImpactMessage(trigger, petName, petType, scoreDelta),
    [trigger, petName, petType, scoreDelta]
  );
  const defaultSubtitle = subtitle || impactMessage;

  // V73: Contextual next steps
  const nextSteps = useMemo(
    () => getNextSteps(trigger, petType),
    [trigger, petType]
  );

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

  const handleNextStep = useCallback((step: NextStep) => {
    onClose();
    onNextStep?.(step.id);
    navigate(step.path);
  }, [onClose, onNextStep, navigate]);

  // V73: Share branded health card image
  const handleShare = useCallback(async () => {
    const cardBlob = await generateShareableCard(petName, petType, scoreTo);

    const shareText = `${emoji} ${petName} בציון בריאות ${scoreTo}%! 🐾✨ מנוהל באמצעות PetID`;

    if (cardBlob && navigator.share && navigator.canShare?.({
      files: [new File([cardBlob], "petid-health-card.png", { type: "image/png" })],
    })) {
      try {
        await navigator.share({
          text: shareText,
          files: [new File([cardBlob], "petid-health-card.png", { type: "image/png" })],
        });
        return;
      } catch {
        // User cancelled or error
      }
    }

    // Fallback: copy text
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${petName} - PetID`,
          text: shareText,
          url: window.location.origin,
        });
        return;
      } catch {
        // User cancelled
      }
    }

    await navigator.clipboard.writeText(`${shareText}\n${window.location.origin}`);
    toast({ title: `${emoji} הקישור הועתק`, description: "שתף את כרטיס הבריאות עם חברים" });
  }, [petName, petType, scoreTo, emoji, toast]);

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
            <FloatingPaws isDark={isDark} />

            {/* Sparkle */}
            <motion.div
              className={cn("mb-3", isDark && "drop-shadow-[0_0_20px_rgba(255,184,0,0.5)]")}
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4, ease: EASING.bounce as any }}
            >
              <Sparkles className="w-10 h-10 text-petid-gold" strokeWidth={1.5} />
            </motion.div>

            {/* Pet emoji */}
            <motion.div
              className={cn(
                "text-6xl mb-1 select-none",
                isDark && "drop-shadow-[0_0_16px_rgba(0,153,230,0.4)]"
              )}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {happyPetEmoji(petType)}
            </motion.div>

            {/* Health Score Circle */}
            <HealthScoreCircle from={scoreFrom} to={scoreTo} isDark={isDark} />

            {/* V73: Impact badge — quantified benefit */}
            <motion.div
              className={cn(
                "mt-3 px-4 py-1.5 rounded-full text-xs font-semibold",
                isDark
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "bg-primary/10 text-primary"
              )}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.4, ease: EASING.bounce as any }}
            >
              +{scoreDelta}% בטיחות {emoji}
            </motion.div>

            {/* Title */}
            <motion.h2
              className={cn(
                "text-xl font-bold text-foreground mt-4",
                isDark && "drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]"
              )}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.4 }}
            >
              {title || defaultTitle}
            </motion.h2>

            {/* V73: Quantified subtitle */}
            <motion.p
              className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-[280px]"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.85, duration: 0.4 }}
            >
              {defaultSubtitle}
            </motion.p>

            {/* V73: Contextual next steps */}
            {nextSteps.length > 0 && (
              <motion.div
                className="flex gap-2 mt-4 w-full"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.05, duration: 0.4 }}
              >
                {nextSteps.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => handleNextStep(step)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl text-xs font-medium transition-all duration-200",
                      isDark
                        ? "bg-muted/40 hover:bg-muted/60 text-foreground border border-border/30 hover:border-primary/30"
                        : "bg-muted/50 hover:bg-muted text-foreground"
                    )}
                  >
                    <step.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                    <span className="leading-tight">{step.label}</span>
                  </button>
                ))}
              </motion.div>
            )}

            {/* Actions */}
            <motion.div
              className="flex flex-col gap-3 w-full mt-5"
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.15, duration: 0.4 }}
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
                שתף כרטיס בריאות {emoji}
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
