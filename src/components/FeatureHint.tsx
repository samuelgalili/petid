import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureHintProps {
  isVisible: boolean;
  onDismiss: () => void;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export const FeatureHint = ({
  isVisible,
  onDismiss,
  title,
  description,
  position = "bottom",
  className
}: FeatureHintProps) => {
  const positionClasses = {
    top: "bottom-full mb-3 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-3 left-1/2 -translate-x-1/2",
    left: "right-full mr-3 top-1/2 -translate-y-1/2",
    right: "left-full ml-3 top-1/2 -translate-y-1/2"
  };

  const arrowClasses = {
    top: "bottom-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-primary",
    bottom: "top-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-primary",
    left: "right-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-primary",
    right: "left-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-primary"
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[9998]"
            onClick={onDismiss}
          />
          
          {/* Hint tooltip */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className={cn(
              "absolute z-[9999] w-64 p-4 rounded-2xl bg-primary text-primary-foreground shadow-elevated",
              positionClasses[position],
              className
            )}
          >
            {/* Arrow */}
            <div className={cn("absolute w-0 h-0 border-[6px]", arrowClasses[position])} />
            
            {/* Content */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm mb-1">{title}</h4>
                <p className="text-xs opacity-90 leading-relaxed">{description}</p>
              </div>
              <button
                onClick={onDismiss}
                className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Got it button */}
            <button
              onClick={onDismiss}
              className="w-full mt-3 py-2 rounded-xl bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors text-sm font-medium"
            >
              הבנתי!
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
