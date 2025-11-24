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

          {/* Membership Banner */}
          <div 
            className="mb-5 rounded-[20px] py-3 px-4 text-center"
            style={{ 
              backgroundColor: 'hsl(174 62% 60%)',
              boxShadow: '0 4px 12px rgba(93, 213, 200, 0.3)'
            }}
          >
            <p className="text-white text-sm font-semibold leading-tight">
              מנוי שנתיית<br />Membership.yub
            </p>
          </div>

          {/* Animated Pet Icons */}
          <div className="flex justify-center items-center gap-8 mb-6">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <img 
                src={dogIcon}
                alt="Dog" 
                className="w-[120px] h-[120px] object-contain"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <img 
                src={catIcon}
                alt="Cat" 
                className="w-[120px] h-[120px] object-contain"
              />
            </motion.div>
          </div>

          {/* Main Title with Animated Logo */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="inline-flex items-center justify-center mb-2"
            >
              <h1 
                className="font-bold text-[#1A1A1A] relative" 
                style={{ 
                  fontSize: '38px',
                  fontWeight: '800',
                  letterSpacing: '-0.5px'
                }}
              >
                Pet
                <span className="relative inline-block">
                  i
                  <motion.span
                    className="absolute"
                    style={{
                      top: '-8px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '20px',
                    }}
                    animate={{
                      y: [0, -8, 0],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      repeatDelay: 0.5
                    }}
                  >
                    🐾
                  </motion.span>
                </span>
                d
              </h1>
            </motion.div>
            <p 
              className="font-medium"
              style={{
                fontSize: '15px',
                fontWeight: '500',
                color: 'hsl(220 9% 46%)'
              }}
            >
              חשבון צדיקה
            </p>
          </div>
          
          {/* Welcome Section */}
          <div className="mb-6">
            <h2 
              className="text-center mb-3 font-bold text-[#1A1A1A]"
              style={{ fontSize: '30px' }}
            >
              ברוכים הבאים
            </h2>
            <p 
              className="text-center leading-relaxed px-4"
              style={{
                fontSize: '14px',
                fontWeight: '400',
                color: 'hsl(220 9% 58%)',
                lineHeight: '1.6'
              }}
            >
              פשוט שיח בגולה חיה אשראמבל<br />מיל וילדים מרליטה
            </p>
          </div>

          {/* Login Form would go here - keeping existing */}
          <div className="mb-6">
            <LoginForm />
          </div>

          {/* Main CTA Button */}
          <Button
            className="w-full text-white font-semibold shadow-none border-0"
            style={{
              height: '50px',
              borderRadius: '25px',
              backgroundColor: 'hsl(174 62% 60%)',
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: '0 4px 16px rgba(93, 213, 200, 0.4)'
            }}
            onClick={() => navigate('/home')}
          >
            COCOONT UUT
          </Button>

          {/* Social Auth Buttons */}
          <div className="mt-6">
            <SocialAuthButtons redirectTo="/add-pet" />
          </div>

          {/* Page Indicators */}
          <div className="flex justify-center items-center gap-3 mt-8 mb-6">
            <button className="text-xs font-medium text-[#1A1A1A]">סמא</button>
            <span className="text-xs text-muted-foreground">•</span>
            <button className="text-xs font-medium text-muted-foreground">ה:יסטוס</button>
            <span className="text-xs text-muted-foreground">•</span>
            <button className="text-xs font-medium text-muted-foreground">לחן</button>
          </div>

          {/* Footer Links */}
          <div className="space-y-3 text-center text-sm">
            <button
              type="button"
              onClick={() =>
                toast({
                  title: "בקרוב",
                  description: "פיצ'ר שחזור סיסמה יתווסף בקרוב",
                })
              }
              className="text-muted-foreground hover:text-foreground hover:underline transition-colors"
            >
              שכחתי סיסמה
            </button>

            <div className="text-muted-foreground">
              אין לך חשבון?{" "}
              <Link
                to="/signup"
                className="hover:underline font-medium transition-colors"
                style={{ color: 'hsl(174 62% 60%)' }}
              >
                צור חשבון
              </Link>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={handleGuestMode}
              className="w-full mt-2 rounded-full hover:bg-muted/50"
            >
              <UserX className="ml-2 h-4 w-4" />
              המשך כאורח
            </Button>
          </div>

          {/* Back Arrow */}
          <div className="flex justify-start mt-6">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-muted/50"
              onClick={() => navigate(-1)}
            >
              <span className="text-xl">←</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
