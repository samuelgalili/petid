/**
 * SlideToConfirm — Swipe-to-buy slider to prevent accidental purchases
 * Premium feel with haptic feedback
 */
import { useState, useRef, useCallback, useLayoutEffect } from "react";
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
  const [maxDrag, setMaxDrag] = useState(200);
  const containerRef = useRef<HTMLDivElement>(null);
  const confirmingRef = useRef(false);
  const x = useMotionValue(0);
  const THRESHOLD = 0.7;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateMaxDrag = () => setMaxDrag(Math.max(0, container.offsetWidth - 56));
    updateMaxDrag();

    const observer = new ResizeObserver(updateMaxDrag);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Progress transforms
  const bgOpacity = useTransform(x, [0, maxDrag * THRESHOLD], [0, 1]);
  const labelOpacity = useTransform(x, [0, maxDrag * 0.3], [1, 0]);
  const checkScale = useTransform(x, [maxDrag * 0.5, maxDrag * THRESHOLD], [0, 1]);
  const bagScale = useTransform(checkScale, [0, 1], [1, 0]);

  const confirm = useCallback(() => {
    if (disabled || confirmingRef.current) return;
    confirmingRef.current = true;
    setConfirmed(true);
    haptic("success");
    animate(x, maxDrag, { type: "spring", stiffness: 300, damping: 30 });
    window.setTimeout(onConfirm, 300);
  }, [disabled, maxDrag, onConfirm, x]);

  const handleDragEnd = useCallback(() => {
    if (x.get() >= maxDrag * THRESHOLD) {
      confirm();
    } else {
      haptic("light");
      animate(x, 0, { type: "spring", stiffness: 400, damping: 25 });
    }
  }, [confirm, maxDrag, x]);

  return (
    <div>
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
        <motion.button
          type="button"
          drag="x"
          dragConstraints={{ left: 0, right: maxDrag }}
          dragElastic={0}
          style={{ x }}
          onDragEnd={handleDragEnd}
          onDragStart={() => haptic("selection")}
          whileTap={{ scale: 0.95 }}
          className="absolute top-1 left-1 w-[48px] h-[48px] rounded-xl bg-primary shadow-lg shadow-primary/25 flex items-center justify-center cursor-grab active:cursor-grabbing z-10"
          aria-label={label}
        >
          <motion.div style={{ scale: checkScale }}>
            <Check className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
          </motion.div>
          <motion.div
            style={{ scale: bagScale }}
            className="absolute"
          >
            <ShoppingBag className="w-5 h-5 text-primary-foreground" strokeWidth={2} />
          </motion.div>
        </motion.button>
      )}
      </div>

      <button
        type="button"
        onClick={confirm}
        disabled={disabled || confirmed}
        className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        {confirmed ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
        {confirmed ? confirmLabel : "הוסף לעגלה"}
      </button>
    </div>
  );
};
