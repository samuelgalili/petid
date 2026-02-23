/**
 * SlideToConfirm — Swipe-to-buy slider to prevent accidental purchases
 * Premium feel with haptic feedback
 */
import { useState, useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ShoppingBag, Check } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface SlideToConfirmProps {
  onConfirm: () => void;
  label?: string;
  confirmLabel?: string;
  price?: string;
  disabled?: boolean;
}

export const SlideToConfirm = ({
  onConfirm,
  label = "החלק לאישור",
  confirmLabel = "אושר!",
  price,
  disabled = false,
}: SlideToConfirmProps) => {
  const [confirmed, setConfirmed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const THRESHOLD = 0.7;

  const getMaxDrag = useCallback(() => {
    if (!containerRef.current) return 200;
    return containerRef.current.offsetWidth - 56;
  }, []);

  // Progress transforms
  const bgOpacity = useTransform(x, [0, getMaxDrag() * THRESHOLD], [0, 1]);
  const labelOpacity = useTransform(x, [0, getMaxDrag() * 0.3], [1, 0]);
  const checkScale = useTransform(x, [getMaxDrag() * 0.5, getMaxDrag() * THRESHOLD], [0, 1]);

  const handleDragEnd = useCallback(() => {
    const maxDrag = getMaxDrag();
    if (x.get() >= maxDrag * THRESHOLD) {
      setConfirmed(true);
      haptic("success");
      animate(x, maxDrag, { type: "spring", stiffness: 300, damping: 30 });
      setTimeout(onConfirm, 300);
    } else {
      haptic("light");
      animate(x, 0, { type: "spring", stiffness: 400, damping: 25 });
    }
  }, [getMaxDrag, onConfirm, x]);

  return (
    <div
      ref={containerRef}
      className="relative h-[56px] rounded-2xl overflow-hidden bg-muted/80 border border-border/30"
    >
      {/* Success fill */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/40 rounded-2xl"
        style={{ opacity: bgOpacity }}
      />

      {/* Label */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center gap-2"
        style={{ opacity: labelOpacity }}
      >
        <span className="text-sm font-semibold text-muted-foreground">
          {label}
        </span>
        {price && (
          <span className="text-sm font-bold text-foreground">• {price}</span>
        )}
        <motion.div
          animate={{ x: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </motion.div>

      {/* Confirmed label */}
      {confirmed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-primary" strokeWidth={2.5} />
            <span className="text-sm font-bold text-primary">{confirmLabel}</span>
          </div>
        </motion.div>
      )}

      {/* Draggable thumb */}
      {!confirmed && !disabled && (
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: getMaxDrag() }}
          dragElastic={0}
          style={{ x }}
          onDragEnd={handleDragEnd}
          onDragStart={() => haptic("selection")}
          whileTap={{ scale: 0.95 }}
          className="absolute top-1 left-1 w-[48px] h-[48px] rounded-xl bg-primary shadow-lg shadow-primary/25 flex items-center justify-center cursor-grab active:cursor-grabbing z-10"
        >
          <motion.div style={{ scale: checkScale }}>
            <Check className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
          </motion.div>
          <motion.div
            style={{ scale: useTransform(checkScale, [0, 1], [1, 0]) }}
            className="absolute"
          >
            <ShoppingBag className="w-5 h-5 text-primary-foreground" strokeWidth={2} />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};
