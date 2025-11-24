import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/LoginForm";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/contexts/GuestContext";
import { UserX } from "lucide-react";
import { AuthLoadingSkeleton } from "@/components/AuthLoadingSkeleton";
import { PetidLogo } from "@/components/PetidLogo";
import { motion, AnimatePresence } from "framer-motion";

const Auth = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { setGuestMode } = useGuest();
  const navigate = useNavigate();
  const [pageLoading, setPageLoading] = useState(true);
  const [videoEnded, setVideoEnded] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/add-pet");
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleGuestMode = () => {
    setGuestMode(true);
    navigate("/add-pet");
  };

  if (authLoading || pageLoading) {
    return <AuthLoadingSkeleton />;
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
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
              {/* Logo */}
              <div className="mb-6">
                <PetidLogo showAnimals={false} />
              </div>

              {/* Welcome Message */}
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
                <p className="text-white/80 text-sm">Sign in to continue to your account</p>
              </div>

              {/* Login Form */}
              <div className="mb-5">
                <LoginForm />
              </div>

              {/* Forgot Password */}
              <div className="text-center mb-5">
                <Link
                  to="/forgot-password"
                  className="text-white/90 hover:text-white text-sm hover:underline transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>

              {/* Social Auth */}
              <div className="mb-5">
                <SocialAuthButtons redirectTo="/add-pet" />
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-white/70">Or</span>
                </div>
              </div>

              {/* Sign Up Link */}
              <div className="text-center mb-4">
                <p className="text-white/80 text-sm">
                  Don't have an account?{" "}
                  <Link
                    to="/signup"
                    className="text-white font-semibold hover:underline transition-colors"
                  >
                    Sign Up
                  </Link>
                </p>
              </div>

              {/* Guest Mode */}
              <Button
                type="button"
                variant="ghost"
                onClick={handleGuestMode}
                className="w-full rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/20 transition-all"
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

export default Auth;
