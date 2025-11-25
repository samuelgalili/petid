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

      {/* Fixed Header with Logo */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center">
          <PetidLogo showAnimals={false} />
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {videoEnded && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[440px] relative px-4 mt-20"
            style={{ zIndex: 2 }}
          >
            {/* Logo */}
            <div className="mb-8">
              <PetidLogo showAnimals={false} />
            </div>

            {/* Login Form */}
            <div className="mb-5">
              <LoginForm />
            </div>

            {/* Social Auth */}
            <div className="mb-5">
              <SocialAuthButtons redirectTo="/add-pet" />
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-400/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-transparent px-2 text-gray-700 font-jakarta">Or</span>
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="text-center mb-4">
              <p className="text-gray-700 text-sm font-jakarta">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="text-gray-900 font-semibold hover:underline transition-colors"
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
              className="w-full rounded-full bg-white/95 hover:bg-gray-50 text-gray-900 border-2 border-gray-200 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-sm font-jakarta font-semibold"
            >
              <UserX className="mr-2 h-4 w-4" />
              Continue as Guest
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Auth;
