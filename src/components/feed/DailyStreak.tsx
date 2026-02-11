import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/** Small daily streak badge stored in localStorage */
export const DailyStreak = () => {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem("petid_feed_last_visit");
    const currentStreak = parseInt(localStorage.getItem("petid_feed_streak") || "0", 10);

    if (lastVisit === today) {
      // Same day, keep streak
      setStreak(currentStreak);
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastVisit === yesterday.toDateString()) {
        // Consecutive day
        const newStreak = currentStreak + 1;
        localStorage.setItem("petid_feed_streak", String(newStreak));
        setStreak(newStreak);
      } else {
        // Streak broken, restart
        localStorage.setItem("petid_feed_streak", "1");
        setStreak(1);
      }
      localStorage.setItem("petid_feed_last_visit", today);
    }
  }, []);

  if (streak < 2) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0.5 }}
      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-xs font-bold shadow-lg"
      style={{
        background: "linear-gradient(135deg, #FF6B35, #FF8C42)",
      }}
    >
      <span>🔥</span>
      <span>{streak} ימים</span>
    </motion.div>
  );
};
