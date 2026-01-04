import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PetidLogo } from "@/components/PetidLogo";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { z } from "zod";

const passwordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [videoEnded, setVideoEnded] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has access token (from email link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast({
          title: "Invalid or Expired Link",
          description: "Please request a new password reset link",
          variant: "destructive",
        });
        navigate("/forgot-password");
      }
    });
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate passwords
    const result = passwordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const newErrors: { password?: string; confirmPassword?: string } = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as "password" | "confirmPassword";
        if (field) {
          newErrors[field] = issue.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated",
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/auth");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

      {/* Fixed Header with Back Button and Logo */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center">
          <PetidLogo showAnimals={false} />
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {videoEnded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full max-w-[420px] relative mt-24"
            style={{ zIndex: 2 }}
          >
            <div className="pt-6 pb-6 px-6">

              {!success ? (
                <>
                  <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold font-jakarta text-gray-900 mb-3">Set New Password</h2>
                    <p className="text-sm font-jakarta text-gray-600 leading-relaxed">
                      Enter your new password below
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium font-jakarta text-gray-700">
                        New Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="At least 6 characters"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setErrors({ ...errors, password: undefined });
                          }}
                          disabled={loading}
                          className={`h-12 pr-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary font-jakarta ${errors.password ? "border-error" : ""}`}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && (
                       <p className="text-sm text-error bg-error/10 px-2 py-1 rounded">
                          {errors.password}
                        </p>
                      )}
                      <PasswordStrengthIndicator password={password} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium font-jakarta text-foreground">
                        אישור סיסמה חדשה
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="הזן שוב את הסיסמה"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setErrors({ ...errors, confirmPassword: undefined });
                          }}
                          disabled={loading}
                          className={`h-12 pr-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary font-jakarta ${errors.confirmPassword ? "border-error" : ""}`}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showConfirmPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                       <p className="text-sm text-error bg-error/10 px-2 py-1 rounded">
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 font-medium font-jakarta transition-all bg-accent hover:bg-accent-hover text-foreground"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                          <span className="text-foreground">מעדכן סיסמה...</span>
                        </>
                      ) : (
                        <span className="text-foreground">עדכן סיסמה</span>
                      )}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="h-10 w-10 text-success" />
                  </div>
                  
                  <div>
                    <h2 className="text-3xl font-bold font-jakarta text-foreground mb-3">הסיסמה עודכנה!</h2>
                    <p className="text-sm font-jakarta text-muted-foreground leading-relaxed">
                      הסיסמה שלך עודכנה בהצלחה.<br />
                      מעביר להתחברות...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResetPassword;
