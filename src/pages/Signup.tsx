import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SignupForm } from "@/components/SignupForm";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/contexts/GuestContext";
import { UserX } from "lucide-react";
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

      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" style={{ zIndex: 1 }} />

      {/* Content */}
      <AnimatePresence>
        {videoEnded && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[440px] relative"
            style={{ zIndex: 2 }}
          >
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/30">
              {/* Logo */}
              <div className="mb-8">
                <PetidLogo showAnimals={false} />
              </div>

              {/* Signup Form */}
              <div className="mb-5">
                <SignupForm />
              </div>

              {/* Social Auth */}
              <div className="mb-5">
                <SocialAuthButtons redirectTo="/add-pet" />
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
              </div>

              {/* Sign In Link */}
              <div className="text-center mb-4">
                <p className="text-gray-600 text-sm">
                  Already have an account?{" "}
                  <Link
                    to="/auth"
                    className="text-gray-900 font-semibold hover:underline transition-colors"
                  >
                    Sign In
                  </Link>
                </p>
              </div>

              {/* Guest Mode */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGuestMode}
                className="w-full rounded-full border-gray-300 hover:bg-gray-50 text-gray-700 transition-all"
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
