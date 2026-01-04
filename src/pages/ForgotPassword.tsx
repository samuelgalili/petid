import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Mail, KeyRound, Eye, EyeOff, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PetidLogo } from "@/components/PetidLogo";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().email("אנא הזן כתובת אימייל תקינה"),
});

const passwordSchema = z.object({
  password: z.string().min(6, "הסיסמה חייבת להכיל לפחות 6 תווים"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "הסיסמאות אינן תואמות",
  path: ["confirmPassword"],
});

type Step = "email" | "otp" | "password" | "success";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [error, setError] = useState("");
  const [videoEnded, setVideoEnded] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0]?.message || "אימייל לא תקין");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { email, type: "password_reset" },
      });

      if (error) throw error;

      setStep("otp");
      toast({
        title: "קוד נשלח",
        description: "קוד אימות נשלח לאימייל שלך",
      });
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      setError(error.message || "שגיאה בשליחת הקוד");
      toast({
        title: "שגיאה",
        description: error.message || "שגיאה בשליחת הקוד",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError("אנא הזן קוד בן 6 ספרות");
      return;
    }
    setError("");
    setStep("password");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = passwordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      setError(result.error.issues[0]?.message || "סיסמה לא תקינה");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { email, otp, newPassword: password },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setStep("success");
      toast({
        title: "הסיסמה עודכנה",
        description: "הסיסמה שלך עודכנה בהצלחה",
      });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      setError(error.message || "שגיאה באיפוס הסיסמה");
      toast({
        title: "שגיאה",
        description: error.message || "שגיאה באיפוס הסיסמה",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await supabase.functions.invoke("send-otp", {
        body: { email, type: "password_reset" },
      });
      toast({
        title: "קוד נשלח מחדש",
        description: "בדוק את האימייל שלך",
      });
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: "שגיאה בשליחת הקוד מחדש",
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

      {/* Fixed Header */}
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
            key={step}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[420px] relative mt-16"
            style={{ zIndex: 2 }}
          >
            <div className="bg-card/80 backdrop-blur-xl rounded-3xl border border-border/50 shadow-2xl shadow-black/10 p-8">
              
              {/* Step: Email */}
              {step === "email" && (
                <>
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8 text-center"
                  >
                    <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                      <Mail className="h-8 w-8 text-accent" />
                    </div>
                    <h2 className="text-2xl font-bold font-jakarta text-foreground mb-2">איפוס סיסמה</h2>
                    <p className="text-sm font-jakarta text-muted-foreground leading-relaxed">
                      הזן את כתובת האימייל שלך ונשלח לך קוד אימות
                    </p>
                  </motion.div>

                  <form onSubmit={handleSendOtp} className="space-y-5">
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
                          <span className="font-jakarta">שלח קוד אימות</span>
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
              )}

              {/* Step: OTP */}
              {step === "otp" && (
                <>
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8 text-center"
                  >
                    <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                      <KeyRound className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold font-jakarta text-foreground mb-2">הזן קוד אימות</h2>
                    <p className="text-sm font-jakarta text-muted-foreground leading-relaxed">
                      שלחנו קוד בן 6 ספרות אל<br />
                      <strong className="text-foreground">{email}</strong>
                    </p>
                  </motion.div>

                  <div className="space-y-5">
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

                    <div className="flex justify-center" dir="ltr">
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={(value) => {
                          setOtp(value);
                          setError("");
                        }}
                      >
                        <InputOTPGroup className="gap-2">
                          {[0, 1, 2, 3, 4, 5].map((index) => (
                            <InputOTPSlot 
                              key={index} 
                              index={index}
                              className="w-12 h-14 text-xl font-bold rounded-xl border-border/50 bg-secondary/50"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <Button
                      onClick={handleVerifyOtp}
                      className="w-full h-12 font-medium transition-all bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-lg shadow-accent/20"
                      disabled={otp.length !== 6}
                    >
                      <span className="font-jakarta">אמת קוד</span>
                    </Button>

                    <div className="text-center">
                      <button
                        onClick={handleResendOtp}
                        disabled={loading}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors font-jakarta"
                      >
                        {loading ? "שולח..." : "לא קיבלת? שלח שוב"}
                      </button>
                    </div>

                    <button
                      onClick={() => setStep("email")}
                      className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors font-jakarta flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      שנה כתובת אימייל
                    </button>
                  </div>
                </>
              )}

              {/* Step: Password */}
              {step === "password" && (
                <>
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8 text-center"
                  >
                    <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                      <KeyRound className="h-8 w-8 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold font-jakarta text-foreground mb-2">סיסמה חדשה</h2>
                    <p className="text-sm font-jakarta text-muted-foreground leading-relaxed">
                      בחר סיסמה חדשה לחשבון שלך
                    </p>
                  </motion.div>

                  <form onSubmit={handleResetPassword} className="space-y-5">
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
                      <Label htmlFor="password" className="text-sm font-medium font-jakarta text-foreground/80">
                        סיסמה חדשה
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setError("");
                          }}
                          disabled={loading}
                          className="h-12 bg-secondary/50 border-border/50 text-foreground pl-12 focus:bg-background focus:border-primary/50 font-jakarta rounded-xl transition-all"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      <PasswordStrengthIndicator password={password} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium font-jakarta text-foreground/80">
                        אימות סיסמה
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setError("");
                          }}
                          disabled={loading}
                          className="h-12 bg-secondary/50 border-border/50 text-foreground pl-12 focus:bg-background focus:border-primary/50 font-jakarta rounded-xl transition-all"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 font-medium transition-all bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-lg shadow-accent/20"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                          <span className="font-jakarta">מעדכן...</span>
                        </>
                      ) : (
                        <span className="font-jakarta">עדכן סיסמה</span>
                      )}
                    </Button>
                  </form>
                </>
              )}

              {/* Step: Success */}
              {step === "success" && (
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
                    <Check className="h-10 w-10 text-green-500" />
                  </motion.div>
                  
                  <div>
                    <h2 className="text-2xl font-bold font-jakarta text-foreground mb-2">הסיסמה עודכנה!</h2>
                    <p className="text-sm font-jakarta text-muted-foreground leading-relaxed">
                      הסיסמה שלך עודכנה בהצלחה.<br />
                      כעת תוכל להתחבר עם הסיסמה החדשה.
                    </p>
                  </div>

                  <Button
                    onClick={() => navigate("/auth")}
                    className="w-full h-12 font-medium transition-all bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-lg shadow-accent/20"
                  >
                    <span className="font-jakarta">המשך להתחברות</span>
                  </Button>
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
