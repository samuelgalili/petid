import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LoginForm } from "@/components/LoginForm";
import { useAuth } from "@/hooks/useAuth";
import { AuthLoadingSkeleton } from "@/components/AuthLoadingSkeleton";
import { PetidLogo } from "@/components/PetidLogo";
import { PawPrint, Heart, Shield } from "lucide-react";
import { getMyPets } from "@/lib/mipoApi";

const Auth = () => {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserPets = async () => {
      if (!authLoading && isAuthenticated && user) {
        const pets = await getMyPets();
        if (pets.length > 0) {
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
    checkUserPets().catch(() => navigate("/onboarding"));
  }, [isAuthenticated, authLoading, navigate, user]);

  if (authLoading) {
    return <AuthLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen mipo-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mipo-flow-card relative w-full max-w-[380px] px-8 py-10 mb-4"
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
          <h1 className="text-xl font-semibold text-mipo-ink mb-1">ברוכים הבאים ל-MIPO</h1>
          <p className="text-sm text-mipo-muted">
            My Precious One
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <LoginForm />
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.3 }}
          className="mt-6 flex justify-center gap-6 text-xs text-mipo-muted"
        >
          {[
            { icon: Shield, label: "מאובטח" },
            { icon: Heart, label: "קהילה אוהבת" },
            { icon: PawPrint, label: "לכל החיות" },
          ].map((feature) => (
            <div key={feature.label} className="flex items-center gap-1.5">
              <feature.icon className="w-3.5 h-3.5 text-mipo-cyan" />
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
        className="mipo-soft-card w-full max-w-[380px] py-4 text-center"
      >
        <p className="text-sm text-foreground">
          אין לך חשבון?{" "}
          <Link to="/signup" className="inline-flex min-h-11 min-w-11 items-center justify-center text-mipo-violet font-semibold transition-colors hover:text-mipo-violet/80">
            הרשמה
          </Link>
        </p>
      </motion.div>

      {/* Footer Links */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="mt-8 flex flex-wrap items-center justify-center gap-x-3 text-center text-xs text-muted-foreground"
      >
        <Link to="/terms" className="inline-flex min-h-11 items-center transition-colors hover:text-foreground">תנאי שימוש</Link>
        <span className="text-border">•</span>
        <Link to="/privacy-policy" className="inline-flex min-h-11 items-center transition-colors hover:text-foreground">פרטיות</Link>
        <span className="text-border">•</span>
        <Link to="/support" className="inline-flex min-h-11 items-center transition-colors hover:text-foreground">עזרה</Link>
        <span className="text-border">•</span>
        <span className="inline-flex min-h-11 items-center">© {new Date().getFullYear()} MIPO</span>
      </motion.footer>
    </div>
  );
};

export default Auth;
