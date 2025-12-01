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

      {/* Fixed Header with Back Button and Logo */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/auth"
            className="inline-flex items-center text-gray-900 hover:text-gray-700 transition-colors font-medium"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            <span className="font-jakarta">Back</span>
          </Link>
          
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

              {!emailSent ? (
                <>
                  <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold font-jakarta text-gray-900 mb-3">Reset Password</h2>
                    <p className="text-sm font-jakarta text-gray-600 leading-relaxed">
                      Enter your email address and we'll send you a link to reset your password
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                      <div
                        className="p-3 text-sm text-error bg-error/10 border border-error/20 rounded-lg"
                        role="alert"
                      >
                        {error}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium font-jakarta text-gray-700">
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
                        className="h-12 bg-gray-100 border-gray-200 text-gray-900 placeholder:text-gray-500 focus:bg-white focus:border-gray-300 font-jakarta"
                        autoComplete="email"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 font-medium transition-all bg-accent hover:bg-accent-hover text-gray-900"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          <span className="text-gray-900 font-jakarta">Sending...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4 text-gray-900" />
                          <span className="text-gray-900 font-jakarta">Send Reset Link</span>
                        </>
                      )}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="h-10 w-10 text-gray-700" />
                  </div>
                  
                  <div>
                    <h2 className="text-3xl font-bold font-jakarta text-gray-900 mb-3">Check Your Email</h2>
                    <p className="text-sm font-jakarta text-gray-600 leading-relaxed">
                      We've sent a password reset link to<br />
                      <strong className="text-gray-900">{email}</strong>
                    </p>
                  </div>

                  <p className="text-xs font-jakarta text-gray-500">
                    Didn't receive the email? Check your spam folder or try again with a different email address.
                  </p>

                  <Button
                    onClick={() => setEmailSent(false)}
                    className="w-full h-12 font-medium transition-all bg-accent hover:bg-accent-hover text-gray-900"
                  >
                    <span className="text-gray-900 font-jakarta">Try Another Email</span>
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
