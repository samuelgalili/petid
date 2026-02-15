/**
 * Emergency SOS Floating Button
 * Pulsing red button accessible from main pages
 */

import { motion } from "framer-motion";
import { Phone } from "lucide-react";

interface EmergencySOSButtonProps {
  onClick: () => void;
}

export const EmergencySOSButton = ({ onClick }: EmergencySOSButtonProps) => {
  return (
    <motion.button
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.5 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed top-20 left-4 z-50 w-12 h-12 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg shadow-destructive/40"
      aria-label="SOS חירום"
    >
      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-30" />
      <span className="absolute inset-0 rounded-full border-2 border-destructive/50 animate-pulse" />
      <div className="relative flex flex-col items-center">
        <Phone className="w-4 h-4" strokeWidth={2.5} />
        <span className="text-[8px] font-black leading-none mt-0.5">SOS</span>
      </div>
    </motion.button>
  );
};
