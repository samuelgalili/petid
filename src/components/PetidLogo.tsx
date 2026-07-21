import { useId } from "react";
import { motion } from "framer-motion";
import { PawPrint } from "lucide-react";
import { MIPO_GRADIENT_STOPS } from "@/lib/mipoTheme";
import { cn } from "@/lib/utils";

interface PetidLogoProps {
  showAnimals?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "stacked" | "horizontal" | "mark";
}

const sizeMap = {
  sm: {
    mark: "w-20 h-14",
    horizontalMark: "w-11 h-8",
    word: "text-2xl",
    tagline: "text-xs",
    gap: "gap-2",
  },
  md: {
    mark: "w-28 h-20",
    horizontalMark: "w-14 h-10",
    word: "text-4xl",
    tagline: "text-sm",
    gap: "gap-3",
  },
  lg: {
    mark: "w-40 h-28",
    horizontalMark: "w-16 h-12",
    word: "text-5xl",
    tagline: "text-base",
    gap: "gap-4",
  },
};

const MipoMark = ({ className }: { className?: string }) => {
  const gradientId = useId();

  return (
    <svg
      viewBox="0 0 100 60"
      role="img"
      aria-label="MIPO"
      className={cn("overflow-visible", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="10" y1="14" x2="75" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={MIPO_GRADIENT_STOPS[0]} />
          <stop offset="0.28" stopColor={MIPO_GRADIENT_STOPS[1]} />
          <stop offset="0.55" stopColor={MIPO_GRADIENT_STOPS[2]} />
          <stop offset="0.78" stopColor={MIPO_GRADIENT_STOPS[3]} />
          <stop offset="1" stopColor={MIPO_GRADIENT_STOPS[4]} />
        </linearGradient>
      </defs>
      <path
        d="M10 48C10 28 10 14 22 14C33 14 33 30 33 38C33 30 33 14 44 14C56 14 56 28 56 48"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 54Q33 60 50 54"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="70" cy="48" r="5" fill={`url(#${gradientId})`} />
    </svg>
  );
};

export const PetidLogo = ({
  showAnimals = true,
  className = "",
  size = "md",
  variant = "stacked",
}: PetidLogoProps) => {
  const sizing = sizeMap[size];
  const shouldShowTagline = showAnimals && variant !== "mark";

  if (variant === "mark") {
    return (
      <motion.div
        className={cn("inline-flex items-center justify-center", className)}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <MipoMark className={sizing.mark} />
      </motion.div>
    );
  }

  if (variant === "horizontal") {
    return (
      <motion.div
        className={cn("inline-flex items-center justify-center", sizing.gap, className)}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <MipoMark className={sizing.horizontalMark} />
        <div className="flex flex-col items-start leading-none">
          <span className={cn("font-semibold text-mipo-ink", size === "sm" ? "text-lg" : "text-2xl")}>
            Mipo
          </span>
          {shouldShowTagline && (
            <span className={cn("mt-1 inline-flex items-center gap-1 text-mipo-muted", sizing.tagline)}>
              My Precious One
              <PawPrint className="h-3 w-3 fill-current" />
            </span>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn("inline-flex flex-col items-center justify-center text-center", className)}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <MipoMark className={sizing.mark} />
      <span className={cn("mt-2 font-semibold text-mipo-ink", sizing.word)}>
        Mipo
      </span>
      {shouldShowTagline && (
        <span className={cn("mt-2 inline-flex items-center gap-2 font-normal text-mipo-muted", sizing.tagline)}>
          My Precious One
          <PawPrint className="h-4 w-4 fill-current" />
        </span>
      )}
    </motion.div>
  );
};
