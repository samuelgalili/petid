import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PetidLogo } from "@/components/PetidLogo";

interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  const [videoEnded, setVideoEnded] = useState(false);

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" 
      dir="ltr"
    >
      {/* Background Video */}
      <video
        autoPlay
        muted
        playsInline
        onEnded={() => setVideoEnded(true)}
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/videos/background-pup-story.mp4" type="video/mp4" />
      </video>

      {/* Fixed Header with Logo */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white/5 backdrop-blur-sm py-4">
        <div className="flex justify-center">
          <PetidLogo showAnimals={false} />
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {videoEnded && (
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
