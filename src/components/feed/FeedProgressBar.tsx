import { motion } from "framer-motion";

interface FeedProgressBarProps {
  current: number;
  total: number;
}

/** Thin progress bar at the very top of the feed showing how many posts the user has seen */
export const FeedProgressBar = ({ current, total }: FeedProgressBarProps) => {
  if (total === 0) return null;
  const pct = Math.min(((current + 1) / total) * 100, 100);

  return (
    <div className="absolute top-0 left-0 right-0 z-[60] h-[3px] bg-white/10">
      <motion.div
        className="h-full rounded-r-full"
        style={{
          background: "linear-gradient(90deg, #FF8C42, #FBD66A)",
        }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
      {/* Counter pill */}
      <motion.div
        className="absolute top-1.5 text-[10px] font-bold text-white/70 drop-shadow-lg"
        style={{ right: 12 }}
        key={current}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
      >
        {current + 1}/{total}
      </motion.div>
    </div>
  );
};
