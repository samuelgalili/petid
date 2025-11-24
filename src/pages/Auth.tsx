import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LoginForm } from "@/components/LoginForm";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/contexts/GuestContext";
import { UserX, Menu } from "lucide-react";
import { AuthLoadingSkeleton } from "@/components/AuthLoadingSkeleton";
import { PetidLogo } from "@/components/PetidLogo";

const Auth = () => {
  const { toast } = useToast();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { setGuestMode } = useGuest();
  const navigate = useNavigate();
  const [pageLoading, setPageLoading] = useState(true);

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
    console.log("Guest mode button clicked");
    setGuestMode(true);
    console.log("Guest mode set to true, navigating to /add-pet");
    navigate("/add-pet");
  };

  if (authLoading || pageLoading) {
    return <AuthLoadingSkeleton />;
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" 
      dir="rtl"
    >
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/videos/background-pup-story.mp4" type="video/mp4" />
      </video>

      {/* Content without Card background */}
      <div className="w-full max-w-[420px] relative" style={{ zIndex: 2 }}>
        <div className="pt-12 pb-12 px-6">
          {/* Header with status icons */}
          <div className="flex items-center justify-between mb-5">
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
          <PetidLogo showAnimals={false} />

          {/* Login Form */}
          <div className="mb-4">
            <LoginForm />
          </div>

          {/* Social Auth Buttons */}
          <div className="mb-6">
            <SocialAuthButtons redirectTo="/add-pet" />
          </div>

          {/* Footer Links */}
          <div className="space-y-3 text-center text-sm">
            <button
              type="button"
              onClick={() =>
                toast({
                  title: "Coming Soon",
                  description: "Password recovery feature will be added soon",
                })
              }
              className="text-white/90 hover:text-white hover:underline transition-colors block w-full"
            >
              Forgot Password
            </button>

            <div className="text-white/90">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="hover:underline font-medium transition-colors text-white"
              >
                Sign Up
              </Link>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={handleGuestMode}
              className="w-full mt-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
            >
              <UserX className="ml-2 h-4 w-4" />
              Continue as Guest
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
