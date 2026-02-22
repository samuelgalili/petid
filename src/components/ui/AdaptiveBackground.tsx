/**
 * AdaptiveBackground — Background gradient that shifts based on health score.
 * Higher score = more premium/vibrant; lower = more muted/urgent.
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
        gradient: "radial-gradient(ellipse at 30% 20%, hsla(160, 60%, 45%, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, hsla(280, 50%, 55%, 0.04) 0%, transparent 50%)",
        blur: 80,
        saturation: 1.1,
      };
    }
    if (healthScore >= 70) {
      return {
        gradient: "radial-gradient(ellipse at 30% 20%, hsla(209, 79%, 52%, 0.05) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, hsla(160, 50%, 45%, 0.03) 0%, transparent 50%)",
        blur: 60,
        saturation: 1.05,
      };
    }
    if (healthScore >= 50) {
      return {
        gradient: "radial-gradient(ellipse at 50% 30%, hsla(38, 80%, 50%, 0.04) 0%, transparent 50%)",
        blur: 40,
        saturation: 1,
      };
    }
    return {
      gradient: "radial-gradient(ellipse at 50% 50%, hsla(0, 60%, 50%, 0.03) 0%, transparent 50%)",
      blur: 20,
      saturation: 0.95,
    };
  }, [healthScore]);

  return (
    <div className={`relative ${className || ""}`} style={{ filter: `saturate(${saturation})` }}>
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: gradient, filter: `blur(${blur}px)` }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};
