import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PetidLogo } from "@/components/PetidLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/contexts/GuestContext";
import { LogIn, Users, Sparkles } from "lucide-react";

const Splash = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const { setGuestMode } = useGuest();
  const [showButtons, setShowButtons] = useState(false);
  const [logoAnimationComplete, setLogoAnimationComplete] = useState(false);

  useEffect(() => {
    // If already authenticated, go to feed
    if (!loading && isAuthenticated) {
      navigate("/");
      return;
    }

    // Show buttons after logo animation
    const timer = setTimeout(() => {
      setShowButtons(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate, isAuthenticated, loading]);

  const handleLogin = () => {
    setGuestMode(false);
    navigate("/auth");
  };

  const handleBrowse = () => {
    setGuestMode(true);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045] flex flex-col items-center justify-center p-6 overflow-hidden" dir="rtl">
      {/* Background animated circles */}
      <div className="absolute inset-0 overflow-hidden">
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
              x: [0, Math.random() * 50 - 25, 0],
              y: [0, Math.random() * 50 - 25, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with Instagram-style animation */}
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

        {/* App name with typewriter effect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-center mb-2"
        >
          <h1 className="text-4xl font-black text-white tracking-tight font-jakarta">
            Petish
          </h1>
        </motion.div>

        {/* Tagline with fade in */}
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
          className="flex items-center gap-2 mb-8"
        >
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span className="text-sm text-white/70 font-jakarta">שתף, התחבר, אהב</span>
          <Sparkles className="w-4 h-4 text-yellow-300" />
        </motion.div>

        {/* Buttons with stagger animation */}
        <AnimatePresence>
          {showButtons ? (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-full max-w-xs space-y-3"
            >
              {/* Login Button */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <Button
                  onClick={handleLogin}
                  className="w-full h-14 rounded-2xl bg-white hover:bg-white/95 text-gray-900 font-bold text-base shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                >
                  <LogIn className="w-5 h-5 ml-2" />
                  התחברות
                </Button>
              </motion.div>

              {/* Browse as Guest */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <Button
                  onClick={handleBrowse}
                  variant="ghost"
                  className="w-full h-14 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-semibold text-base backdrop-blur-md border border-white/30 transition-all duration-300 hover:scale-[1.02]"
                >
                  <Users className="w-5 h-5 ml-2" />
                  גלוש בלי חשבון
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6"
            >
              {/* Instagram-style loading animation */}
              <div className="relative w-16 h-16">
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-white/20"
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-transparent border-t-white"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              </div>
              
              {/* Loading dots */}
              <div className="flex gap-2">
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom branding */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 flex flex-col items-center gap-2"
      >
        <div className="flex items-center gap-1">
          <span className="text-xs text-white/50">from</span>
          <span className="text-sm font-bold text-white/70">PetiID</span>
        </div>
        <p className="text-xs text-white/40 font-jakarta">
          © 2025 PetiID. כל הזכויות שמורות.
        </p>
      </motion.div>
    </div>
  );
};

export default Splash;
