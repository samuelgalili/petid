/**
 * AdaptiveBackground — Dynamic Mood UI.
 * Higher score = more golden/vibrant/premium. Lower = muted.
 */
import { motion } from "framer-motion";
import { useMemo } from "react";

interface AdaptiveBackgroundProps {
  healthScore: number;
  children: React.ReactNode;
  className?: string;
}

export const AdaptiveBackground = ({ healthScore, children, className }: AdaptiveBackgroundProps) => {
  const { gradient, blur, saturation } = useMemo(() => {
    if (healthScore >= 85) {
      return {
        gradient: "radial-gradient(ellipse at 20% 20%, hsla(45, 93%, 58%, 0.10) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, hsla(25, 95%, 53%, 0.07) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, hsla(36, 100%, 60%, 0.05) 0%, transparent 60%)",
        blur: 90,
        saturation: 1.15,
      };
    }
    if (healthScore >= 70) {
      return {
        gradient: "radial-gradient(ellipse at 30% 20%, hsla(45, 80%, 55%, 0.07) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, hsla(160, 50%, 45%, 0.04) 0%, transparent 50%)",
        blur: 70,
        saturation: 1.08,
      };
    }
    if (healthScore >= 50) {
      return {
        gradient: "radial-gradient(ellipse at 50% 30%, hsla(209, 79%, 52%, 0.05) 0%, transparent 50%)",
        blur: 50,
        saturation: 1,
      };
    }
    return {
      gradient: "radial-gradient(ellipse at 50% 50%, hsla(0, 0%, 50%, 0.03) 0%, transparent 50%)",
      blur: 20,
      saturation: 0.95,
    };
  }, [healthScore]);

  return (
    <div className={`relative ${className || ""}`} style={{ filter: `saturate(${saturation})` }}>
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: gradient, filter: `blur(${blur}px)` }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};
