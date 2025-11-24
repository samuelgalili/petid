import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
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
        style={{ 
          filter: 'brightness(0.7)',
          zIndex: 0
        }}
      >
        <source src="/videos/background-pup.mp4" type="video/mp4" />
      </video>
      
      {/* Overlay for better readability */}
      <div 
        className="absolute inset-0" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(94, 186, 176, 0.3) 0%, rgba(135, 201, 195, 0.3) 100%)',
          zIndex: 1
        }}
      />
      <Card 
        className="w-full max-w-[420px] border-0 overflow-hidden bg-[#FEFEFE]/95 backdrop-blur-sm relative" 
        style={{ 
          borderRadius: '32px',
          boxShadow: '0 8px 32px rgba(93, 213, 200, 0.15)',
          zIndex: 2
        }}
      >
        <div className="pt-12 pb-12 px-6">
          {/* Header with status icons */}
          <div className="flex items-center justify-between mb-5">
            <div className="w-6 h-6">
              <Menu className="w-5 h-5 text-foreground/60" />
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 border border-border/20">
              <span className="text-xs font-medium">AITEACN</span>
              <UserX className="w-3.5 h-3.5" />
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
              className="text-muted-foreground hover:text-foreground hover:underline transition-colors block w-full"
            >
              Forgot Password
            </button>

            <div className="text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="hover:underline font-medium transition-colors"
                style={{ color: 'hsl(174 62% 60%)' }}
              >
                Sign Up
              </Link>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={handleGuestMode}
              className="w-full mt-2 rounded-full hover:bg-muted/50"
            >
              <UserX className="ml-2 h-4 w-4" />
              Continue as Guest
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
