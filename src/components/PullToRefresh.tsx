import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowDown } from "lucide-react";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  progress: number;
  shouldTrigger: boolean;
}

export const PullToRefreshIndicator = ({
  pullDistance,
  isRefreshing,
  progress,
  shouldTrigger
}: PullToRefreshIndicatorProps) => {
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute left-0 right-0 flex justify-center z-50 pointer-events-none"
        style={{ 
          top: Math.max(pullDistance - 50, 0),
          height: 50
        }}
      >
        <motion.div
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ${
            shouldTrigger || isRefreshing
              ? "bg-primary"
              : "bg-white border border-border"
          }`}
          style={{
            scale: 0.5 + progress * 0.5,
            rotate: progress * 180
          }}
        >
          {isRefreshing ? (
            <Loader2 
              className="w-5 h-5 text-white animate-spin" 
              strokeWidth={2} 
            />
          ) : (
            <ArrowDown 
              className={`w-5 h-5 transition-colors ${
                shouldTrigger ? "text-white" : "text-muted-foreground"
              }`}
              strokeWidth={2}
              style={{
                transform: shouldTrigger ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
