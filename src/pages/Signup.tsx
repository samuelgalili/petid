import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SignupForm } from "@/components/SignupForm";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/contexts/GuestContext";
import { UserX, Menu } from "lucide-react";
import { PetidLogo } from "@/components/PetidLogo";
import { motion, AnimatePresence } from "framer-motion";

const Signup = () => {
  const { isAuthenticated, loading } = useAuth();
  const { setGuestMode } = useGuest();
  const navigate = useNavigate();
  const [videoEnded, setVideoEnded] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/add-pet");
    }
  }, [isAuthenticated, loading, navigate]);

  const handleGuestMode = () => {
    setGuestMode(true);
    navigate("/add-pet");
  };

  if (loading) {
    return null;
  }

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

      {/* Content without Card background */}
      <AnimatePresence>
        {videoEnded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full max-w-[420px] relative"
            style={{ zIndex: 2 }}
          >
            <div className="pt-6 pb-6 px-6">
              {/* Header with status icons */}
              <div className="flex items-center justify-between mb-3">
                <div className="w-6 h-6">
                  <Menu className="w-5 h-5 text-white/80" />
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                  <span className="text-xs font-medium text-white">AITEACN</span>
                  <UserX className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="w-6 h-6" />
              </div>

              {/* Logo without Animals */}
              <PetidLogo showAnimals={false} className="mb-4" />

              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-white mb-3">Sign Up</h2>
                <p className="text-sm text-white/90 leading-relaxed px-4">
                  Create a new account and start<br />managing your pet's care
                </p>
              </div>

              <SignupForm />

              <SocialAuthButtons redirectTo="/add-pet" />

              <div className="mt-4 text-center text-sm text-white/90">
                Already have an account?{" "}
                <Link
                  to="/auth"
                  className="hover:underline font-medium transition-colors text-white"
                >
                  Sign In
                </Link>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={handleGuestMode}
                className="w-full mt-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
              >
                <UserX className="mr-2 h-4 w-4" />
                Continue as Guest
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Signup;
