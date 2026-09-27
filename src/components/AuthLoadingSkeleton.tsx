import { motion } from "framer-motion";

// public/splash-paw.png is the same paw artwork, with the paper knocked out.
// The old file was an opaque JPEG-like PNG, so on the grey shell it read as a
// white rectangle. The shell color is --mipo-soft, light and dark.
export const AuthLoadingSkeleton = () => {
  return (
    <div
      dir="rtl"
      lang="he"
      className="min-h-screen bg-mipo-soft text-mipo-ink flex flex-col items-center justify-center overflow-hidden relative"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        <img
          src="/splash-paw.png"
          alt="MIPO"
          width={220}
          height={243}
          className="w-44 h-auto bg-transparent"
        />

        <div
          className="mt-8 h-10 w-10 rounded-full border-[3px] border-[#6C63FF]/25 border-t-[#6C63FF] animate-spin"
          aria-hidden="true"
        />

        <p className="mt-6 text-sm font-medium text-mipo-muted">טוען...</p>
      </motion.div>
    </div>
  );
};
