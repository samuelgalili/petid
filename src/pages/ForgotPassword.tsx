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
  email: z.string().email("אנא הזן כתובת אימייל תקינה"),
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
    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0]?.message || "אימייל לא תקין");
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
        title: "אימייל נשלח",
        description: "בדוק את האימייל שלך לקישור איפוס הסיסמה",
      });
    } catch (error: any) {
      setError(error.message);
      toast({
        title: "שגיאה",
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
      dir="rtl"
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
      <div className="fixed top-0 left-0 right-0 z-10 bg-background/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/auth"
            className="inline-flex items-center text-foreground hover:text-foreground/70 transition-colors font-medium"
          >
            <ArrowLeft className="ml-2 h-5 w-5" />
            <span className="font-jakarta">חזרה</span>
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
                    <h2 className="text-3xl font-bold font-jakarta text-foreground mb-3">איפוס סיסמה</h2>
                    <p className="text-sm font-jakarta text-muted-foreground leading-relaxed">
                      הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
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
                      <Label htmlFor="email" className="text-sm font-medium font-jakarta text-foreground/80">
                        כתובת אימייל
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
                        className="h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-border font-jakarta"
                        autoComplete="email"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 font-medium transition-all bg-accent hover:bg-accent-hover text-foreground"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                          <span className="text-foreground font-jakarta">שולח...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="ml-2 h-4 w-4 text-foreground" />
                          <span className="text-foreground font-jakarta">שלח קישור איפוס</span>
                        </>
                      )}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto">
                    <Mail className="h-10 w-10 text-foreground/70" />
                  </div>
                  
                  <div>
                    <h2 className="text-3xl font-bold font-jakarta text-foreground mb-3">בדוק את האימייל</h2>
                    <p className="text-sm font-jakarta text-muted-foreground leading-relaxed">
                      שלחנו קישור לאיפוס סיסמה אל<br />
                      <strong className="text-foreground">{email}</strong>
                    </p>
                  </div>

                  <p className="text-xs font-jakarta text-muted-foreground">
                    לא קיבלת את האימייל? בדוק בתיקיית הספאם או נסה שוב עם כתובת אימייל אחרת.
                  </p>

                  <Button
                    onClick={() => setEmailSent(false)}
                    className="w-full h-12 font-medium transition-all bg-accent hover:bg-accent-hover text-foreground"
                  >
                    <span className="text-foreground font-jakarta">נסה אימייל אחר</span>
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
