import { motion } from "framer-motion";
import splashPaw from "@/assets/splash-paw.png";

export const AuthLoadingSkeleton = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center overflow-hidden relative">
      {/* Subtle background glow */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 40%, hsl(var(--primary) / 0.08) 0%, hsl(var(--accent) / 0.05) 30%, transparent 60%)',
        }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Paw with glow */}
        <div className="relative">
          <motion.div
            className="absolute inset-0 blur-3xl rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, hsl(var(--accent) / 0.3) 50%, transparent 70%)',
              transform: 'scale(1.5)',
            }}
            animate={{ opacity: [0.4, 0.7, 0.4], scale: [1.4, 1.6, 1.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.img
            src={splashPaw}
            alt="Petid"
            className="w-64 h-64 sm:w-80 sm:h-80 object-contain relative z-10 drop-shadow-2xl"
            animate={{
              scale: [1, 1.03, 1],
              filter: [
                'drop-shadow(0 0 20px hsl(var(--primary) / 0.3))',
                'drop-shadow(0 0 40px hsl(var(--accent) / 0.4))',
                'drop-shadow(0 0 20px hsl(var(--primary) / 0.3))',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Spinner */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <motion.div
            className="w-10 h-10 rounded-full border-3 border-primary/30"
            style={{ borderTopColor: 'hsl(var(--primary))' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>

        {/* Loading text */}
        <motion.p
          className="mt-6 text-muted-foreground text-sm font-medium tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        >
          טוען...
        </motion.p>
      </motion.div>

      {/* Floating particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-primary/20"
          style={{
            width: 4 + i * 2,
            height: 4 + i * 2,
            left: `${20 + i * 15}%`,
            top: `${60 + (i % 3) * 10}%`,
          }}
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.5, 0.2], scale: [1, 1.2, 1] }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
};
