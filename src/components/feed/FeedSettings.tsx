import { motion, AnimatePresence } from "framer-motion";
import { Type, LayoutGrid, LayoutList, X, Minus, Plus } from "lucide-react";
import { useState } from "react";

export type FeedTextSize = "small" | "normal" | "large";
export type FeedDensity = "compact" | "normal" | "comfortable";

interface FeedSettingsProps {
  open: boolean;
  onClose: () => void;
  textSize: FeedTextSize;
  onTextSizeChange: (size: FeedTextSize) => void;
  density: FeedDensity;
  onDensityChange: (density: FeedDensity) => void;
}

const TEXT_SIZES: { value: FeedTextSize; label: string; preview: string }[] = [
  { value: "small", label: "קטן", preview: "text-xs" },
  { value: "normal", label: "רגיל", preview: "text-sm" },
  { value: "large", label: "גדול", preview: "text-base" },
];

const DENSITIES: { value: FeedDensity; label: string; icon: typeof LayoutGrid }[] = [
  { value: "compact", label: "צפוף", icon: LayoutGrid },
  { value: "normal", label: "רגיל", icon: LayoutList },
  { value: "comfortable", label: "מרווח", icon: LayoutList },
];

export const FeedSettings = ({
  open,
  onClose,
  textSize,
  onTextSizeChange,
  density,
  onDensityChange,
}: FeedSettingsProps) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl p-5 pb-8 border-t border-border/30 shadow-2xl"
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-foreground">הגדרות פיד</h3>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Text Size */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Type className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">גודל טקסט</span>
              </div>
              <div className="flex gap-2">
                {TEXT_SIZES.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => onTextSizeChange(size.value)}
                    className={`flex-1 py-2.5 rounded-xl text-center transition-all ${
                      textSize === size.value
                        ? "bg-primary text-primary-foreground font-medium"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <span className={size.preview}>{size.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Density */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <LayoutList className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">צפיפות תצוגה</span>
              </div>
              <div className="flex gap-2">
                {DENSITIES.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => onDensityChange(d.value)}
                    className={`flex-1 py-2.5 rounded-xl text-center text-sm transition-all ${
                      density === d.value
                        ? "bg-primary text-primary-foreground font-medium"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
