import { motion } from "framer-motion";
import petidLogo from "@/assets/petid-logo.png";

export const AuthLoadingSkeleton = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      {/* Centered Logo with Pulse Animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        {/* Gradient glow behind logo */}
        <motion.div
          className="absolute inset-0 blur-2xl opacity-30"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            background: "linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4)",
            borderRadius: "50%",
          }}
        />
        
        {/* Logo */}
        <motion.img
          src={petidLogo}
          alt="Petid"
          className="h-20 w-auto relative z-10"
          animate={{
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* Loading dots */}
      <div className="mt-8 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-gray-300"
            animate={{
              scale: [1, 1.3, 1],
              backgroundColor: ["#d1d5db", "#9ca3af", "#d1d5db"],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Bottom text - Instagram style */}
      <motion.div
        className="absolute bottom-10 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-xs text-gray-400 font-semibold tracking-wide">from</p>
        <p className="text-sm text-gray-500 font-semibold mt-0.5">Petid</p>
      </motion.div>
    </div>
  );
};
