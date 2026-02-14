import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import splashGif from "@/assets/splash-animation.gif";

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);

  const handleLoad = useCallback(() => {
    // GIF duration — adjust to match your actual GIF length
    setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinish, 500); // wait for fade-out animation
    }, 3500);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {!fadeOut && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: '#FAFAF5' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <img
            src={splashGif}
            alt="PetID"
            onLoad={handleLoad}
            className="w-[85vw] max-w-[420px] object-contain"
            style={{ filter: 'drop-shadow(0 0 0 transparent)' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
