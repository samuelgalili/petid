import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureHintProps {
  isVisible: boolean;
  onDismiss: () => void;
  title: string;
  description: string;
  className?: string;
}

export const FeatureHint = ({
  isVisible,
  onDismiss,
  title,
  description,
  className
}: FeatureHintProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[9998]"
            onClick={onDismiss}
          />
          
          {/* Centered hint card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed z-[9999] inset-x-4 top-1/2 -translate-y-1/2",
              "p-6 rounded-3xl bg-white shadow-2xl",
              className
            )}
            dir="rtl"
          >
            {/* Close button */}
            <button
              onClick={onDismiss}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
            
            {/* Content */}
            <div className="text-center">
              <h4 className="font-bold text-xl text-cyan-500 mb-3">{title}</h4>
              <p className="text-gray-600 leading-relaxed text-sm">{description}</p>
            </div>

            {/* Got it button */}
            <button
              onClick={onDismiss}
              className="w-full mt-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-600 transition-colors text-white font-bold text-base"
            >
              הבנתי!
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
