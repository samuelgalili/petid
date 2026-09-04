import { useId } from "react";
import { motion } from "framer-motion";
import { PawPrint } from "lucide-react";
import { MIPO_DOT_COLOR, MIPO_MARK_GRADIENT, MIPO_SMILE_GRADIENT } from "@/lib/mipoTheme";
import { cn } from "@/lib/utils";

interface MipoLogoProps {
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

// Geometry measured off the brand artwork: stroke width 47, peak centres at
// x 93.5 / 286.5 with the stroke top at y 3, valley floor y 124, feet at
// x 29 / 352 down a nearly straight leg, dot at (412, 175.5) r 21.5.
const M_PATH =
  "M29 185 C36 145, 52 26, 93.5 26 C142 26, 160 124, 190.25 124 " +
  "C220.5 124, 239 26, 286.5 26 C329 26, 345 145, 352 185";

// The smile is a filled ribbon, not a stroke. It tapers from 26 units at the
// middle to under 12 at the tips, and SVG has no variable-width stroke; drawing
// it at a constant width reads blunt and far too heavy at the ends.
const SMILE_PATH =
  "M1 231C6 236.9 18.9 256.5 30.8 266.5C42.7 276.5 57.6 284.2 72.4 290.9" +
  "C87.3 297.6 103.6 302.8 119.9 306.8C136.3 310.8 153.5 313.8 170.5 314.9" +
  "C187.5 316 205.1 315.5 222 313.7C238.9 311.9 256.1 308.9 272 304.2" +
  "C287.9 299.5 303.6 293.2 317.7 285.7C331.8 278.2 346 269.8 356.7 259.2" +
  "C367.4 248.6 377.8 228.2 382 222L382 222C376.1 226 358.7 238.8 346.5 246.2" +
  "C334.3 253.6 322.1 260.8 308.6 266.4C295.1 272 280.5 276.4 265.6 280" +
  "C250.7 283.6 235 286.3 219.4 287.8C203.8 289.3 187.6 289.5 171.8 288.9" +
  "C156 288.3 139.9 287.1 124.6 284.3C109.3 281.6 94 277.5 79.8 272.4" +
  "C65.6 267.3 52.3 260.8 39.2 253.9C26.1 247 7.4 234.8 1 231Z";

const MipoMark = ({ className }: { className?: string }) => {
  const gradientId = useId();

  return (
    <svg
      viewBox="0 0 437 314"
      role="img"
      aria-label="MIPO"
      className={cn("overflow-visible", className)}
    >
      <defs>
        <linearGradient
          id={`${gradientId}-m`}
          x1={MIPO_MARK_GRADIENT.x1}
          y1={MIPO_MARK_GRADIENT.y1}
          x2={MIPO_MARK_GRADIENT.x2}
          y2={MIPO_MARK_GRADIENT.y2}
          gradientUnits="userSpaceOnUse"
        >
          {MIPO_MARK_GRADIENT.stops.map(([offset, color]) => (
            <stop key={color} offset={offset} stopColor={color} />
          ))}
        </linearGradient>
        <linearGradient
          id={`${gradientId}-s`}
          x1={MIPO_SMILE_GRADIENT.x1}
          y1={MIPO_SMILE_GRADIENT.y1}
          x2={MIPO_SMILE_GRADIENT.x2}
          y2={MIPO_SMILE_GRADIENT.y2}
          gradientUnits="userSpaceOnUse"
        >
          {MIPO_SMILE_GRADIENT.stops.map(([offset, color]) => (
            <stop key={color} offset={offset} stopColor={color} />
          ))}
        </linearGradient>
      </defs>
      <path
        d={M_PATH}
        fill="none"
        stroke={`url(#${gradientId}-m)`}
        strokeWidth="47"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d={SMILE_PATH} fill={`url(#${gradientId}-s)`} />
      <circle cx="412" cy="175.5" r="21.5" fill={MIPO_DOT_COLOR} />
    </svg>
  );
};

export const MipoLogo = ({
  showAnimals = true,
  className = "",
  size = "md",
  variant = "stacked",
}: MipoLogoProps) => {
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
