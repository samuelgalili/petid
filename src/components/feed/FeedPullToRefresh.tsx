import { motion, AnimatePresence } from "framer-motion";

interface FeedPullToRefreshProps {
  pullDistance: number;
  isRefreshing: boolean;
  progress: number;
  shouldTrigger: boolean;
}

export const FeedPullToRefresh = ({
  pullDistance,
  isRefreshing,
  progress,
  shouldTrigger,
}: FeedPullToRefreshProps) => {
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute left-0 right-0 flex justify-center z-[60] pointer-events-none"
        style={{ top: Math.max(pullDistance - 60, 8), height: 60 }}
      >
        <motion.div
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
          style={{
            scale: 0.5 + progress * 0.5,
            rotate: progress * 360,
            background: shouldTrigger || isRefreshing
              ? "linear-gradient(135deg, #FF8C42, #FBD66A)"
              : "rgba(255,255,255,0.9)",
            backdropFilter: "blur(12px)",
          }}
        >
          {isRefreshing ? (
            <motion.span
              className="text-2xl"
              animate={{ rotate: [0, 360] }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
            >
              🐾
            </motion.span>
          ) : (
            <motion.span
              className="text-2xl"
              style={{
                transform: shouldTrigger ? "scaleY(-1)" : "scaleY(1)",
                transition: "transform 0.2s ease",
              }}
            >
              🐾
            </motion.span>
          )}
        </motion.div>

        {shouldTrigger && !isRefreshing && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-16 text-white text-xs font-medium drop-shadow-lg"
          >
            שחרר לרענון
          </motion.p>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
