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
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-background to-secondary/30" 
      dir="rtl"
    >
      {/* Background Video */}
      <video
        autoPlay
        muted
        playsInline
        loop
        onCanPlay={() => setVideoEnded(true)}
        className="absolute inset-0 w-full h-full object-cover opacity-40"
      >
        <source src="/videos/background-pup-story.mp4" type="video/mp4" />
      </video>

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />

      {/* Fixed Header with Back Button and Logo */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-10 bg-background/60 backdrop-blur-md border-b border-border/30"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 text-foreground hover:text-primary transition-colors font-medium group"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-jakarta">חזרה</span>
          </Link>
          
          <PetidLogo showAnimals={false} />
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {videoEnded && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[420px] relative mt-16"
            style={{ zIndex: 2 }}
          >
            <div className="bg-card/80 backdrop-blur-xl rounded-3xl border border-border/50 shadow-2xl shadow-black/10 p-8">
              {!emailSent ? (
                <>
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8 text-center"
                  >
                    <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                      <Mail className="h-8 w-8 text-accent" />
                    </div>
                    <h2 className="text-2xl font-bold font-jakarta text-foreground mb-2">איפוס סיסמה</h2>
                    <p className="text-sm font-jakarta text-muted-foreground leading-relaxed">
                      הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
                    </p>
                  </motion.div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-3 text-sm text-error bg-error/10 border border-error/20 rounded-xl"
                          role="alert"
                        >
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

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
                        className="h-12 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary/50 font-jakarta rounded-xl transition-all"
                        autoComplete="email"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 font-medium transition-all bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30 hover:-translate-y-0.5"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                          <span className="font-jakarta">שולח...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="ml-2 h-4 w-4" />
                          <span className="font-jakarta">שלח קישור איפוס</span>
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-border/30 text-center">
                    <p className="text-sm text-muted-foreground font-jakarta">
                      נזכרת בסיסמה?{" "}
                      <Link to="/auth" className="text-primary hover:text-primary/80 font-medium transition-colors">
                        התחבר עכשיו
                      </Link>
                    </p>
                  </div>
                </>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-6"
                >
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                    className="w-20 h-20 bg-gradient-to-br from-green-400/20 to-green-500/20 rounded-2xl flex items-center justify-center mx-auto"
                  >
                    <Mail className="h-10 w-10 text-green-500" />
                  </motion.div>
                  
                  <div>
                    <h2 className="text-2xl font-bold font-jakarta text-foreground mb-2">בדוק את האימייל</h2>
                    <p className="text-sm font-jakarta text-muted-foreground leading-relaxed">
                      שלחנו קישור לאיפוס סיסמה אל<br />
                      <strong className="text-foreground">{email}</strong>
                    </p>
                  </div>

                  <div className="bg-secondary/30 rounded-xl p-4">
                    <p className="text-xs font-jakarta text-muted-foreground">
                      💡 לא קיבלת את האימייל? בדוק בתיקיית הספאם או נסה שוב עם כתובת אימייל אחרת.
                    </p>
                  </div>

                  <Button
                    onClick={() => setEmailSent(false)}
                    variant="outline"
                    className="w-full h-12 font-medium transition-all border-border/50 hover:bg-secondary/50 rounded-xl"
                  >
                    <span className="font-jakarta">נסה אימייל אחר</span>
                  </Button>

                  <Link to="/auth">
                    <Button
                      variant="ghost"
                      className="w-full h-10 font-medium text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="ml-2 h-4 w-4" />
                      <span className="font-jakarta">חזרה להתחברות</span>
                    </Button>
                  </Link>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ForgotPassword;
