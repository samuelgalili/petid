import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PetidLogo } from "@/components/PetidLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/contexts/GuestContext";
import { LogIn, Users } from "lucide-react";

const Splash = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const { setGuestMode } = useGuest();
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    // If already authenticated, go to home
    if (!loading && isAuthenticated) {
      navigate("/home");
      return;
    }

    // Show buttons after animation
    const timer = setTimeout(() => {
      setShowButtons(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigate, isAuthenticated, loading]);

  const handleLogin = () => {
    setGuestMode(false);
    navigate("/auth");
  };

  const handleBrowse = () => {
    setGuestMode(true);
    navigate("/feed");
  };

  return (
    <div className="min-h-screen bg-gradient-instagram flex flex-col items-center justify-center p-6" dir="rtl">
      {/* Animated Logo */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mb-6"
      >
        <PetidLogo className="h-20 w-auto" />
      </motion.div>

      {/* Tagline */}
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="text-lg font-bold text-white font-jakarta mb-8 text-center"
      >
        הרשת החברתית לבעלי חיות מחמד
      </motion.p>

      <AnimatePresence>
        {showButtons ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-xs space-y-3"
          >
            {/* Login Button */}
            <Button
              onClick={handleLogin}
              className="w-full h-14 rounded-xl bg-white hover:bg-white/90 text-foreground font-bold text-base shadow-lg"
            >
              <LogIn className="w-5 h-5 ml-2" />
              התחברות
            </Button>

            {/* Browse as Guest */}
            <Button
              onClick={handleBrowse}
              variant="ghost"
              className="w-full h-14 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-base backdrop-blur-sm border border-white/30"
            >
              <Users className="w-5 h-5 ml-2" />
              גלוש בלי חשבון
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-white/60"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8"
      >
        <p className="text-xs text-white/60 font-jakarta">
          © 2025 PetiID. כל הזכויות שמורות.
        </p>
      </motion.div>
    </div>
  );
};

export default Splash;
