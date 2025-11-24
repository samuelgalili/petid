import { motion } from "framer-motion";
import petidLogo from "@/assets/petid-logo.png";
import dogIcon from "@/assets/dog-icon.gif";
import catIcon from "@/assets/cat-icon.gif";

interface PetidLogoProps {
  showAnimals?: boolean;
  className?: string;
}

export const PetidLogo = ({ showAnimals = true, className = "" }: PetidLogoProps) => {
  return (
    <div className={className}>
      {/* Logo */}
      <div className="flex justify-center relative" style={{ marginBottom: showAnimals ? '2rem' : '1.5rem' }}>
        <motion.img
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          src={petidLogo}
          alt="PetID Logo"
          className="h-12 w-auto object-contain"
        />
        {/* Blinking Paw over the "i" */}
        <motion.div
          className="absolute"
          style={{ 
            top: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            marginLeft: '2px'
          }}
          animate={{ 
            opacity: [1, 0.3, 1],
            scale: [1, 0.95, 1],
            filter: [
              'drop-shadow(0 0 8px rgba(96, 165, 250, 0.8))',
              'drop-shadow(0 0 2px rgba(96, 165, 250, 0.3))',
              'drop-shadow(0 0 8px rgba(96, 165, 250, 0.8))'
            ]
          }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-primary"
          >
            <path d="M14 10.5c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2zm-4-3c0 .828-.672 1.5-1.5 1.5S7 8.328 7 7.5 7.672 6 8.5 6s1.5.672 1.5 1.5zm7 0c0 .828-.672 1.5-1.5 1.5S14 8.328 14 7.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5zM12 13c-1.657 0-3 1.343-3 3v5c0 1.657 1.343 3 3 3s3-1.343 3-3v-5c0-1.657-1.343-3-3-3z"/>
          </svg>
        </motion.div>
      </div>

      {/* Animated Pet Icons - Walking towards each other */}
      {showAnimals && (
        <div className="flex justify-center items-end gap-4 mb-8 relative h-[140px]">
          <motion.div
            initial={{ x: -150, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ 
              duration: 1.2, 
              delay: 0.3,
              ease: "easeOut"
            }}
            className="flex-shrink-0"
          >
            <img 
              src={dogIcon}
              alt="Dog" 
              className="w-[110px] h-[110px] object-contain"
            />
          </motion.div>
          <motion.div
            initial={{ x: 150, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ 
              duration: 1.2, 
              delay: 0.3,
              ease: "easeOut"
            }}
            className="flex-shrink-0"
          >
            <img 
              src={catIcon}
              alt="Cat" 
              className="w-[110px] h-[110px] object-contain"
            />
          </motion.div>
        </div>
      )}
    </div>
  );
};
