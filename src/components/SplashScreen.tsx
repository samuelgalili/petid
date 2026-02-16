import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import splashGif from "@/assets/splash-animation.gif";

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);
  const finishedRef = useRef(false);

  const startFadeOut = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFadeOut(true);
    setTimeout(onFinish, 500);
  }, [onFinish]);

  // Safety timeout — never stay on splash more than 5 seconds
  useEffect(() => {
    const timer = setTimeout(startFadeOut, 5000);
    return () => clearTimeout(timer);
  }, [startFadeOut]);

  const handleLoad = useCallback(() => {
    setTimeout(startFadeOut, 3500);
  }, [startFadeOut]);

  const handleError = useCallback(() => {
    startFadeOut();
  }, [startFadeOut]);

  return (
    <AnimatePresence>
      {!fadeOut && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
          style={{ backgroundColor: '#ffffff' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <img
            src={splashGif}
            alt="PetID"
            onLoad={handleLoad}
            onError={handleError}
            className="w-[85vw] max-w-[420px] object-contain"
            style={{ filter: 'drop-shadow(0 0 0 transparent)' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
