import { ReactNode, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PetidLogo } from "@/components/PetidLogo";
import { Sparkles } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  const [videoEnded, setVideoEnded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [logoAnimationComplete, setLogoAnimationComplete] = useState(false);

  useEffect(() => {
    // Show splash for 2.5 seconds then transition to form
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" 
      dir="ltr"
    >
      {/* Background - Gradient for splash, Video for form */}
      <AnimatePresence mode="wait">
        {showSplash ? (
          <motion.div
            key="splash-bg"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-gradient-to-br from-petid-blue via-petid-gold to-petid-blue-dark"
          >
            {/* Animated background circles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-white/5"
                style={{
                  width: Math.random() * 300 + 100,
                  height: Math.random() * 300 + 100,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.2, 0.1],
                }}
                transition={{
                  duration: 4 + Math.random() * 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.5,
                }}
              />
            ))}
          </motion.div>
        ) : (
          <motion.video
            key="video-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            autoPlay
            muted
            playsInline
            onEnded={() => setVideoEnded(true)}
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/videos/background-pup-story.mp4" type="video/mp4" />
          </motion.video>
        )}
      </AnimatePresence>

      {/* Splash Content */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash-content"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 flex flex-col items-center"
          >
            {/* Logo with animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                damping: 15,
                duration: 0.8 
              }}
              onAnimationComplete={() => setLogoAnimationComplete(true)}
              className="mb-4"
            >
              <motion.div
                animate={logoAnimationComplete ? {
                  boxShadow: [
                    "0 0 20px rgba(255,255,255,0.3)",
                    "0 0 40px rgba(255,255,255,0.5)",
                    "0 0 20px rgba(255,255,255,0.3)",
                  ]
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className="rounded-3xl p-4 bg-white/10 backdrop-blur-sm"
              >
                <PetidLogo className="h-24 w-auto" />
              </motion.div>
            </motion.div>

            {/* App name */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-4xl font-black text-white tracking-tight font-jakarta mb-2"
            >
              Petid
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="text-lg font-medium text-white/90 font-jakarta mb-2 text-center"
            >
              הרשת החברתית לבעלי חיות מחמד
            </motion.p>

            {/* Sparkle decoration */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2, duration: 0.4 }}
              className="flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-sm text-white/70 font-jakarta">שתף, התחבר, אהב</span>
              <Sparkles className="w-4 h-4 text-yellow-300" />
            </motion.div>

            {/* Loading dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="flex gap-2 mt-8"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-white/70"
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed Header with Logo - Only show after splash */}
      {!showSplash && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="fixed top-0 left-0 right-0 z-10 bg-white/5 backdrop-blur-sm py-4"
        >
          <div className="flex justify-center">
            <PetidLogo showAnimals={false} />
          </div>
        </motion.div>
      )}

      {/* Form Content - Only show after splash and video */}
      <AnimatePresence>
        {!showSplash && videoEnded && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[440px] relative px-4 mt-20"
            style={{ zIndex: 2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
