import { motion } from "framer-motion";
import petidLogo from "@/assets/petid-logo.png";
import dogIcon from "@/assets/dog-icon.gif";
import catIcon from "@/assets/cat-icon.gif";

export const AuthLoadingSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/30 flex flex-col items-center justify-center overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating paw prints */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-primary/10 text-4xl"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -20, 0],
              rotate: [0, 10, -10, 0],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut",
            }}
          >
            🐾
          </motion.div>
        ))}
      </div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Logo container with glow */}
        <div className="relative mb-6">
          {/* Multi-layer warm glow */}
          <motion.div
            className="absolute inset-0 blur-3xl rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, hsl(var(--accent) / 0.2) 50%, transparent 70%)',
              transform: 'scale(3)',
            }}
            animate={{
              opacity: [0.3, 0.5, 0.3],
              scale: [2.8, 3.2, 2.8],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Secondary gold glow */}
          <motion.div
            className="absolute inset-0 blur-2xl rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--petid-gold) / 0.25) 0%, transparent 60%)',
              transform: 'scale(2.5)',
            }}
            animate={{
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          />

          {/* Logo with breathing animation */}
          <motion.img
            src={petidLogo}
            alt="Petid"
            className="h-24 w-auto relative z-10 drop-shadow-lg"
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Sparkle effect */}
          <motion.div
            className="absolute -top-2 -right-2 z-20"
            animate={{
              opacity: [0, 1, 0],
              scale: [0.5, 1.2, 0.5],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <span className="text-2xl">✨</span>
          </motion.div>
        </div>

        {/* Animated pets walking in */}
        <div className="flex items-end gap-6 mb-8 h-[80px]">
          <motion.img
            src={dogIcon}
            alt="Dog"
            className="w-16 h-16 object-contain"
            initial={{ x: -100, opacity: 0 }}
            animate={{ 
              x: 0, 
              opacity: 1,
              y: [0, -5, 0],
            }}
            transition={{
              x: { duration: 0.8, ease: "easeOut" },
              opacity: { duration: 0.8 },
              y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
            }}
          />
          
          {/* Heart between pets */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              scale: [0, 1.2, 1, 0],
              y: [0, -15, -15, -30],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              repeatDelay: 1,
              delay: 1.5,
            }}
          >
            <span className="text-xl">❤️</span>
          </motion.div>

          <motion.img
            src={catIcon}
            alt="Cat"
            className="w-16 h-16 object-contain"
            initial={{ x: 100, opacity: 0 }}
            animate={{ 
              x: 0, 
              opacity: 1,
              y: [0, -5, 0],
            }}
            transition={{
              x: { duration: 0.8, ease: "easeOut" },
              opacity: { duration: 0.8 },
              y: { duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 },
            }}
          />
        </div>

        {/* Loading text with typing effect */}
        <motion.p
          className="text-muted-foreground text-sm font-medium mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          מתחבר לעולם החיות...
        </motion.p>

        {/* Animated loading bar */}
        <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--petid-gold)), hsl(var(--primary)))',
              backgroundSize: '200% 100%',
            }}
            initial={{ width: '0%' }}
            animate={{ 
              width: ['0%', '100%', '0%'],
              backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* Loading dots */}
        <div className="mt-6 flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: 'hsl(var(--primary))' }}
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Bottom branding */}
      <motion.div
        className="absolute bottom-8 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <p className="text-xs text-muted-foreground font-medium tracking-wide">from</p>
        <p className="text-base text-foreground font-bold mt-0.5 bg-gradient-to-r from-primary to-petid-gold bg-clip-text text-transparent">
          Petid
        </p>
      </motion.div>
    </div>
  );
};
