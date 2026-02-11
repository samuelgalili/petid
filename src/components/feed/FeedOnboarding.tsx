import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const TIPS = [
  { id: "doubletap", text: "💡 לחצו פעמיים על התמונה ללייק!", position: "center" as const },
  { id: "swipe", text: "⬆️ גללו למעלה לפוסט הבא", position: "bottom" as const },
  { id: "pull", text: "⬇️ משכו למטה לרענון הפיד", position: "top" as const },
];

export const FeedOnboarding = () => {
  const [currentTip, setCurrentTip] = useState<number | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem("petid_feed_onboarding_v2");
    if (!seen) {
      // Start showing tips after a short delay
      const timer = setTimeout(() => setCurrentTip(0), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    if (currentTip !== null && currentTip < TIPS.length - 1) {
      setCurrentTip(currentTip + 1);
    } else {
      setCurrentTip(null);
      localStorage.setItem("petid_feed_onboarding_v2", "true");
    }
  };

  const handleSkipAll = () => {
    setCurrentTip(null);
    localStorage.setItem("petid_feed_onboarding_v2", "true");
  };

  if (currentTip === null) return null;
  const tip = TIPS[currentTip];

  const positionClass =
    tip.position === "top"
      ? "top-20"
      : tip.position === "bottom"
      ? "bottom-[180px]"
      : "top-1/2 -translate-y-1/2";

  return (
    <AnimatePresence>
      <motion.div
        key={tip.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`fixed left-1/2 -translate-x-1/2 z-[80] ${positionClass}`}
      >
        <div
          className="relative px-5 py-3 rounded-2xl shadow-2xl max-w-[280px] text-center"
          style={{
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(20px)",
          }}
        >
          <p className="text-white text-sm font-medium leading-relaxed">{tip.text}</p>

          <div className="flex items-center justify-center gap-3 mt-3">
            <button
              onClick={handleDismiss}
              className="text-white/90 text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: "#FF8C42" }}
            >
              {currentTip < TIPS.length - 1 ? "הבא →" : "הבנתי!"}
            </button>
            {currentTip < TIPS.length - 1 && (
              <button onClick={handleSkipAll} className="text-white/50 text-xs">
                דלג
              </button>
            )}
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 mt-2">
            {TIPS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === currentTip ? "bg-white w-3" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
