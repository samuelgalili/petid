import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SignupForm } from "@/components/SignupForm";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { useAuth } from "@/hooks/useAuth";
import { AuthLoadingSkeleton } from "@/components/AuthLoadingSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { PetidLogo } from "@/components/PetidLogo";
import { Sparkles, Users } from "lucide-react";
import petidIcon from "@/assets/petid-icon.png";

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
        const { data: pets, error } = await supabase
          .from('pets')
          .select('id')
          .eq('user_id', user.id)
          .eq('archived', false)
          .limit(1);
        
        if (!error && pets && pets.length > 0) {
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
    
    checkUserPets();
  }, [isAuthenticated, authLoading, navigate, user]);

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (authLoading || pageLoading) {
    return <AuthLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 via-background to-primary/5 flex flex-col items-center justify-center px-4 py-8">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-16 right-12 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
        <div className="absolute bottom-24 left-10 w-28 h-28 bg-secondary/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-20 w-14 h-14 bg-accent/10 rounded-full blur-xl" />
      </div>

      {/* Main Card */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-full max-w-[380px] bg-card/95 backdrop-blur-sm border border-border/50 rounded-2xl shadow-xl px-8 py-10 mb-4"
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
          <h1 className="text-xl font-bold text-foreground mb-1">הצטרפו לפטיד</h1>
          <p className="text-sm text-muted-foreground">צרו חשבון וניהלו את חיות המחמד שלכם</p>
        </motion.div>

        {/* Social Auth First */}
        <SocialAuthButtons redirectTo="/" />

        {/* OR Divider */}
        <div className="flex items-center my-5">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="px-4 text-xs font-medium text-muted-foreground">או</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Signup Form */}
        <SignupForm />

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="mt-6 flex justify-center gap-6 text-xs text-muted-foreground"
        >
          <div className="flex items-center gap-1.5">
            <img src={petidIcon} alt="Petid" className="w-3.5 h-3.5 object-contain" />
            <span>ניהול חיות</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span>קהילה פעילה</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>הטבות בלעדיות</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="w-full max-w-[380px] bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl py-4 text-center"
      >
        <p className="text-sm text-foreground">
          יש לך חשבון?{" "}
          <Link to="/auth" className="text-primary font-semibold hover:text-primary/80 transition-colors">
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
        <Link to="/privacy" className="hover:text-foreground transition-colors">פרטיות</Link>
        <span className="text-border">•</span>
        <Link to="/support" className="hover:text-foreground transition-colors">עזרה</Link>
        <span className="text-border">•</span>
        <span>© 2024 Petid</span>
      </motion.footer>
    </div>
  );
};

export default Signup;
