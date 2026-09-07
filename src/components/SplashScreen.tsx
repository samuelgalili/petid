import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MipoLogo } from "@/components/MipoLogo";

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

  useEffect(() => {
    const timer = setTimeout(startFadeOut, 2400);
    return () => clearTimeout(timer);
  }, [startFadeOut]);

  return (
    <AnimatePresence>
      {!fadeOut && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex min-h-[320px] flex-col items-center justify-center px-8"
          >
            <MipoLogo size="lg" showAnimals />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
