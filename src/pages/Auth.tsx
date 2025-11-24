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
import { motion } from "framer-motion";
import dogIcon from "@/assets/dog-icon.gif";
import catIcon from "@/assets/cat-icon.gif";
import petidLogo from "@/assets/petid-logo.png";

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
      className="min-h-screen flex items-center justify-center p-4" 
      dir="rtl" 
      style={{ 
        background: 'linear-gradient(135deg, hsl(174 43% 88%) 0%, hsl(180 40% 92%) 100%)' 
      }}
    >
      <Card 
        className="w-full max-w-[420px] border-0 overflow-hidden bg-[#FEFEFE]/95 backdrop-blur-sm" 
        style={{ 
          borderRadius: '32px',
          boxShadow: '0 8px 32px rgba(93, 213, 200, 0.15)'
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

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <motion.img
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              src={petidLogo}
              alt="PetID Logo"
              className="h-16 w-auto object-contain"
            />
          </div>

          {/* Animated Pet Icons - Walking towards each other */}
          <div className="flex justify-center items-end gap-4 mb-8 relative h-[140px]">
            <motion.div
              initial={{ x: -150, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ 
                duration: 1.2, 
                delay: 0.3,
                ease: "easeOut"
              }}
              className="flex-shrink-0"
            >
              <img 
                src={dogIcon}
                alt="Dog" 
                className="w-[110px] h-[110px] object-contain"
              />
            </motion.div>
            <motion.div
              initial={{ x: 150, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ 
                duration: 1.2, 
                delay: 0.3,
                ease: "easeOut"
              }}
              className="flex-shrink-0"
            >
              <img 
                src={catIcon}
                alt="Cat" 
                className="w-[110px] h-[110px] object-contain"
              />
            </motion.div>
          </div>

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
