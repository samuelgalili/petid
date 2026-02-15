/**
 * PetCoinReward — Animated coin reward when user finishes watching educational content.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PetCoinRewardProps {
  /** Whether this post is currently the active/visible one */
  isActive: boolean;
  /** Index of the post (to track watch time) */
  postIndex: number;
  /** Only show for educational-style content */
  isEducational: boolean;
}

export const PetCoinReward = ({ isActive, postIndex, isEducational }: PetCoinRewardProps) => {
  const [showReward, setShowReward] = useState(false);
  const [collected, setCollected] = useState(false);

  useEffect(() => {
    if (!isActive || !isEducational || collected) return;

    // After 8 seconds of watching, reward
    const timer = setTimeout(() => {
      setShowReward(true);
    }, 8000);

    return () => clearTimeout(timer);
  }, [isActive, isEducational, collected, postIndex]);

  // Reset when post changes
  useEffect(() => {
    if (!isActive) {
      setShowReward(false);
    }
  }, [isActive]);

  const handleCollect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCollected(true);
    setShowReward(false);

    // Store reward in localStorage
    const totalCoins = parseInt(localStorage.getItem("petid_coins") || "0", 10);
    localStorage.setItem("petid_coins", String(totalCoins + 5));
  };

  return (
    <AnimatePresence>
      {showReward && !collected && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.5 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 1.5 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto"
          onClick={handleCollect}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="flex flex-col items-center gap-2 cursor-pointer"
          >
            {/* Coin */}
            <motion.div
              animate={{ rotateY: [0, 360] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
              style={{
                background: "linear-gradient(135deg, #FBD66A, #F4C542, #E8A317)",
                boxShadow: "0 4px 20px rgba(251,214,106,0.6), inset 0 2px 4px rgba(255,255,255,0.5)",
              }}
            >
              <span className="text-2xl font-black text-amber-800">🪙</span>
            </motion.div>

            {/* Label */}
            <div
              className="px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg"
              style={{
                background: "linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.5))",
                backdropFilter: "blur(10px)",
              }}
            >
              +5 PetCoins! לחץ לאסוף
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Collected confirmation */}
      {collected && (
        <motion.div
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0, scale: 2, y: -80 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
        >
          <span className="text-3xl">🪙</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
