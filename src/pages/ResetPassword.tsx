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
    try {
      passwordSchema.parse({ password, confirmPassword });
    } catch (err: any) {
      const newErrors: { password?: string; confirmPassword?: string } = {};
      err.errors.forEach((error: any) => {
        const field = error.path[0] as "password" | "confirmPassword";
        newErrors[field] = error.message;
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

      {/* Content */}
      <AnimatePresence>
        {videoEnded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full max-w-[420px] relative"
            style={{ zIndex: 2 }}
          >
            <div className="pt-6 pb-6 px-6">
              {/* Logo */}
              <PetidLogo showAnimals={false} className="mb-6" />

              {!success ? (
                <>
                  <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold text-white mb-3">Set New Password</h2>
                    <p className="text-sm text-white/90 leading-relaxed px-4">
                      Enter your new password below
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-white">
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
                          className={`h-11 pr-10 bg-white/90 backdrop-blur-sm border-white/30 text-gray-900 placeholder:text-gray-500 focus:bg-white focus:border-white ${errors.password ? "border-red-500" : ""}`}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-sm text-red-100 bg-red-500/20 px-2 py-1 rounded">
                          {errors.password}
                        </p>
                      )}
                      <PasswordStrengthIndicator password={password} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-white">
                        Confirm New Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Re-enter your password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setErrors({ ...errors, confirmPassword: undefined });
                          }}
                          disabled={loading}
                          className={`h-11 pr-10 bg-white/90 backdrop-blur-sm border-white/30 text-gray-900 placeholder:text-gray-500 focus:bg-white focus:border-white ${errors.confirmPassword ? "border-red-500" : ""}`}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900"
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-sm text-red-100 bg-red-500/20 px-2 py-1 rounded">
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 bg-white/90 hover:bg-white text-gray-900 font-medium transition-colors backdrop-blur-sm"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                  
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-3">Password Updated!</h2>
                    <p className="text-sm text-white/90 leading-relaxed px-4">
                      Your password has been successfully updated.<br />
                      Redirecting to login...
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
