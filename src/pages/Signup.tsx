import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SignupForm } from "@/components/SignupForm";
import { useAuth } from "@/hooks/useAuth";
import { AuthLoadingSkeleton } from "@/components/AuthLoadingSkeleton";
import { PetidLogo } from "@/components/PetidLogo";
import { PawPrint, Sparkles, Users } from "lucide-react";
import { getMyPets } from "@/lib/mipoApi";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const Signup = () => {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const checkUserPets = async () => {
      if (!authLoading && isAuthenticated && user) {
        const pets = await getMyPets();
        if (pets.length > 0) {
          localStorage.setItem('onboardingCompleted', 'true');
          navigate("/");
        } else {
          const onboardingCompleted = localStorage.getItem('onboardingCompleted');
          if (onboardingCompleted === 'true') {
            navigate("/");
          } else {
            navigate("/onboarding");
          }
        }
      }
    };
    
    checkUserPets().catch(() => navigate("/onboarding"));
  }, [isAuthenticated, authLoading, navigate, user]);

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (authLoading || pageLoading) {
    return <AuthLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen mipo-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Main Card */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="mipo-flow-card relative w-full max-w-[380px] px-8 py-10 mb-4"
      >
        {/* Logo */}
        <PetidLogo showAnimals={false} size="sm" className="mb-2" />

        {/* Welcome Text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="text-center mb-6"
        >
          <h1 className="text-xl font-semibold text-mipo-ink mb-1">הצטרפו ל-MIPO</h1>
          <p className="text-sm text-mipo-muted">צרו חשבון וניהלו את חיות המחמד שלכם</p>
        </motion.div>

        {/* Signup Form */}
        <SignupForm />

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="mt-6 flex justify-center gap-6 text-xs text-mipo-muted"
        >
          <div className="flex items-center gap-1.5">
            <PawPrint className="w-3.5 h-3.5 text-mipo-cyan" />
            <span>ניהול חיות</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-mipo-cyan" />
            <span>קהילה פעילה</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-mipo-cyan" />
            <span>הטבות בלעדיות</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="mipo-soft-card w-full max-w-[380px] py-4 text-center"
      >
        <p className="text-sm text-foreground">
          יש לך חשבון?{" "}
          <Link to="/auth" className="text-mipo-violet font-semibold hover:text-mipo-violet/80 transition-colors">
            התחברות
          </Link>
        </p>
      </motion.div>

      {/* Footer Links */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="mt-8 text-xs text-muted-foreground text-center space-x-4 rtl:space-x-reverse"
      >
        <Link to="/terms" className="hover:text-foreground transition-colors">תנאי שימוש</Link>
        <span className="text-border">•</span>
        <Link to="/privacy-policy" className="hover:text-foreground transition-colors">פרטיות</Link>
        <span className="text-border">•</span>
        <Link to="/support" className="hover:text-foreground transition-colors">עזרה</Link>
        <span className="text-border">•</span>
        <span>© 2025 MIPO</span>
      </motion.footer>
    </div>
  );
};

export default Signup;
