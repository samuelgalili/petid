import { motion } from "framer-motion";
import petidLogo from "@/assets/petid-logo.png";
import petidIcon from "@/assets/petid-icon.png";
import dogIcon from "@/assets/dog-icon.gif";
import catIcon from "@/assets/cat-icon.gif";

interface PetidLogoProps {
  showAnimals?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const PetidLogo = ({
  showAnimals = true,
  className = "",
  size = "md"
}: PetidLogoProps) => {
  const logoSizes = {
    sm: "h-10",
    md: "h-16",
    lg: "h-24"
  };

  const iconSizes = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16"
  };

  const animalSizes = {
    sm: "w-[70px] h-[70px]",
    md: "w-[110px] h-[110px]",
    lg: "w-[140px] h-[140px]"
  };

  const containerHeights = {
    sm: "h-[90px]",
    md: "h-[140px]",
    lg: "h-[180px]"
  };

  return (
    <div className={className}>
      {/* Logo with warm glow effect */}
      <div 
        className="flex justify-center relative" 
        style={{ marginBottom: showAnimals ? '2rem' : '1.5rem' }}
      >
      <motion.div 
        className="relative flex items-center gap-3"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Paw Icon with gradient glow */}
        <motion.div
          className="relative"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {/* Multi-layer glow behind icon */}
          <motion.div 
            className="absolute inset-0 blur-xl rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(236, 72, 153, 0.5) 0%, rgba(139, 92, 246, 0.3) 50%, transparent 70%)',
              transform: 'scale(2)',
            }}
            animate={{
              opacity: [0.5, 0.8, 0.5],
              scale: [1.8, 2.2, 1.8],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          <motion.img 
            src={petidIcon} 
            alt="Petid Icon" 
            className={`${iconSizes[size]} object-contain relative z-10 drop-shadow-lg`}
          />
        </motion.div>

        {/* Logo image */}
        <motion.div className="relative">
          {/* Warm glow behind logo */}
          <motion.div 
            className="absolute inset-0 blur-2xl rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, hsl(var(--accent) / 0.2) 50%, transparent 70%)',
              transform: 'scale(2)',
            }}
            animate={{
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          <motion.img 
            src={petidLogo} 
            alt="Petid Logo" 
            className={`${logoSizes[size]} w-auto object-contain relative z-10 drop-shadow-lg`}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          />
        </motion.div>
        
        {/* Sparkle effect */}
        <motion.div
          className="absolute z-20"
          style={{
            top: '-8px',
            right: '-8px',
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0.5],
            rotate: [0, 15, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            repeatDelay: 1
          }}
        >
          <span className="text-lg">✨</span>
        </motion.div>
      </motion.div>
      </div>

      {/* Animated Pet Icons - Walking towards each other */}
      {showAnimals && (
        <div className={`flex justify-center items-end gap-4 mb-8 relative ${containerHeights[size]}`}>
          {/* Dog animation */}
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
            <motion.img 
              src={dogIcon} 
              alt="Dog" 
              className={`${animalSizes[size]} object-contain drop-shadow-md`}
              animate={{ 
                y: [0, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
          
          {/* Heart between pets */}
          <motion.div
            className="absolute bottom-1/2 left-1/2 transform -translate-x-1/2 z-10"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              scale: [0, 1.2, 1, 0],
              y: [0, -20, -20, -40]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 2,
              delay: 2
            }}
          >
            <span className="text-4xl">❤️</span>
          </motion.div>

          {/* Cat animation */}
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
            <motion.img 
              src={catIcon} 
              alt="Cat" 
              className={`${animalSizes[size]} object-contain drop-shadow-md`}
              animate={{ 
                y: [0, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
            />
          </motion.div>
        </div>
      )}
    </div>
  );
};