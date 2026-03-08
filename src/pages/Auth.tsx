import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LoginForm } from "@/components/LoginForm";
import { PhoneLoginForm } from "@/components/PhoneLoginForm";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { useAuth } from "@/hooks/useAuth";
import { AuthLoadingSkeleton } from "@/components/AuthLoadingSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { PetidLogo } from "@/components/PetidLogo";
import { PawPrint, Heart, Shield, Mail, Smartphone } from "lucide-react";

const Auth = () => {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [pageLoading, setPageLoading] = useState(true);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("phone");

  useEffect(() => {
    const checkUserPets = async () => {
      if (!authLoading && isAuthenticated && user) {
        const { data: pets, error } = await supabase
          .from("pets")
          .select("id")
          .eq("user_id", user.id)
          .eq("archived", false)
          .limit(1);
        if (!error && pets && pets.length > 0) {
          localStorage.setItem("onboardingCompleted", "true");
          navigate("/");
        } else {
          const onboardingCompleted = localStorage.getItem("onboardingCompleted");
          if (onboardingCompleted === "true") {
            navigate("/");
          } else {
            navigate("/onboarding");
          }
        }
      }
    };
    checkUserPets();
  }, [isAuthenticated, authLoading, navigate, user]);

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (authLoading || pageLoading) {
    return <AuthLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex flex-col items-center justify-center px-4 py-8">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full blur-2xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-32 right-16 w-32 h-32 bg-secondary/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute top-1/3 right-10 w-16 h-16 bg-accent/15 rounded-full blur-xl"
          animate={{ y: [0, -10, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[380px] bg-card/95 backdrop-blur-sm border border-border/50 rounded-2xl shadow-xl px-8 py-10 mb-4"
      >
        {/* Logo */}
        <PetidLogo showAnimals={false} size="sm" className="mb-2" />

        {/* Welcome Text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-center mb-5"
        >
          <h1 className="text-xl font-bold text-foreground mb-1">ברוכים הבאים</h1>
          <p className="text-sm text-muted-foreground">
            הקהילה הגדולה של בעלי חיות המחמד בישראל
          </p>
        </motion.div>

        {/* Login Method Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="flex bg-muted/60 rounded-lg p-1 mb-5 gap-1"
        >
          {[
            { key: "phone" as const, icon: Smartphone, label: "SMS" },
            { key: "email" as const, icon: Mail, label: "אימייל" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setLoginMethod(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                loginMethod === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Login Form with slide animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={loginMethod}
            initial={{ opacity: 0, x: loginMethod === "phone" ? -16 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: loginMethod === "phone" ? 16 : -16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {loginMethod === "phone" ? <PhoneLoginForm /> : <LoginForm />}
          </motion.div>
        </AnimatePresence>

        {/* OR Divider */}
        <div className="flex items-center my-5">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="px-4 text-xs font-medium text-muted-foreground">או</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Social Auth */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <SocialAuthButtons redirectTo="/" />
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.3 }}
          className="mt-6 flex justify-center gap-6 text-xs text-muted-foreground"
        >
          {[
            { icon: Shield, label: "מאובטח" },
            { icon: Heart, label: "קהילה אוהבת" },
            { icon: PawPrint, label: "לכל החיות" },
          ].map((feature) => (
            <div key={feature.label} className="flex items-center gap-1.5">
              <feature.icon className="w-3.5 h-3.5 text-primary" />
              <span>{feature.label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Sign Up Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="w-full max-w-[380px] bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl py-4 text-center"
      >
        <p className="text-sm text-foreground">
          אין לך חשבון?{" "}
          <Link
            to="/signup"
            className="text-primary font-semibold hover:text-primary/80 transition-colors"
          >
            הרשמה
          </Link>
        </p>
      </motion.div>

      {/* Footer Links */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="mt-8 text-xs text-muted-foreground text-center space-x-4 rtl:space-x-reverse"
      >
        <Link to="/terms" className="hover:text-foreground transition-colors">תנאי שימוש</Link>
        <span className="text-border">•</span>
        <Link to="/privacy-policy" className="hover:text-foreground transition-colors">פרטיות</Link>
        <span className="text-border">•</span>
        <Link to="/support" className="hover:text-foreground transition-colors">עזרה</Link>
        <span className="text-border">•</span>
        <span>© 2024 Petid</span>
      </motion.footer>
    </div>
  );
};

export default Auth;
