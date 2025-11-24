import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PetidLogo } from "@/components/PetidLogo";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");
  const [videoEnded, setVideoEnded] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate email
    try {
      emailSchema.parse({ email });
    } catch (err: any) {
      setError(err.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "Email Sent",
        description: "Check your email for the password reset link",
      });
    } catch (error: any) {
      setError(error.message);
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
              {/* Back Button */}
              <div className="mb-4">
                <Link
                  to="/auth"
                  className="inline-flex items-center text-white/90 hover:text-white transition-colors"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Link>
              </div>

              {/* Logo */}
              <PetidLogo showAnimals={false} className="mb-6" />

              {!emailSent ? (
                <>
                  <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold text-white mb-3">Reset Password</h2>
                    <p className="text-sm text-white/90 leading-relaxed px-4">
                      Enter your email address and we'll send you a link to reset your password
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div
                        className="p-3 text-sm text-red-600 bg-red-50/90 border border-red-200 rounded-lg backdrop-blur-sm"
                        role="alert"
                      >
                        {error}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-white">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="example@email.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError("");
                        }}
                        disabled={loading}
                        className="h-11 bg-white/90 backdrop-blur-sm border-white/30 text-gray-900 placeholder:text-gray-500 focus:bg-white focus:border-white"
                        autoComplete="email"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 bg-white/90 hover:bg-white text-gray-900 font-medium transition-colors backdrop-blur-sm"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          <span>Send Reset Link</span>
                        </>
                      )}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm">
                    <Mail className="h-8 w-8 text-white" />
                  </div>
                  
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-3">Check Your Email</h2>
                    <p className="text-sm text-white/90 leading-relaxed px-4">
                      We've sent a password reset link to<br />
                      <strong className="text-white">{email}</strong>
                    </p>
                  </div>

                  <p className="text-xs text-white/80 px-4">
                    Didn't receive the email? Check your spam folder or try again with a different email address.
                  </p>

                  <Button
                    onClick={() => setEmailSent(false)}
                    variant="ghost"
                    className="w-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
                  >
                    Try Another Email
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ForgotPassword;
