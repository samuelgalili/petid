import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageCircle, CalendarIcon } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { format, differenceInYears, parse, isValid } from "date-fns";
import { toE164, isValidIsraeliPhone } from "@/utils/phoneFormat";
import { PhoneOtpVerification } from "@/components/PhoneOtpVerification";
import { he } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// Calculate age from birthdate
const calculateAge = (birthdate: Date): number => {
  return differenceInYears(new Date(), birthdate);
};

// Validate age is at least 13
const validateAge = (birthdate: Date): boolean => {
  return calculateAge(birthdate) >= 13;
};

const emailSignupSchema = z.object({
  fullName: z.string().min(2, "השם חייב להכיל לפחות 2 תווים").max(100).trim(),
  email: z.string().min(1, "אימייל נדרש").email("אימייל לא תקין"),
  birthdate: z.date({ message: "תאריך לידה נדרש" }).refine(
    (date) => validateAge(date),
    { message: "חובה להיות מעל גיל 13 לשימוש באפליקציה" }
  ),
});

const phoneSignupSchema = z.object({
  fullName: z.string().min(2, "השם חייב להכיל לפחות 2 תווים").max(100).trim(),
  phone: z.string().min(1, "טלפון נדרש").regex(/^0?[0-9]{9,10}$/, "מספר טלפון לא תקין"),
  birthdate: z.date({ message: "תאריך לידה נדרש" }).refine(
    (date) => validateAge(date),
    { message: "חובה להיות מעל גיל 13 לשימוש באפליקציה" }
  ),
});

interface FieldError {
  fullName?: string;
  email?: string;
  phone?: string;
  birthdate?: string;
}

export const SignupForm = () => {
  const [signupMethod, setSignupMethod] = useState<"whatsapp" | "sms" | "email">("whatsapp");
  const [showSmsOtp, setShowSmsOtp] = useState(false);
  const [formData, setFormData] = useState({ fullName: "", email: "", phone: "" });
  const [birthdate, setBirthdate] = useState<Date | undefined>(undefined);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [generalError, setGeneralError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  useEffect(() => {
    if (showOTPInput && otpInputRefs.current[0]) {
      otpInputRefs.current[0].focus();
    }
  }, [showOTPInput]);

  useEffect(() => {
    const verifyOtp = async () => {
      if (otp.every(d => d) && showOTPInput && !loading) {
        setLoading(true);
        setGeneralError("");
        try {
          const otpCode = otp.join('');
          
          if (signupMethod === "whatsapp") {
            // Verify via WhatsApp edge function
            const { data, error } = await supabase.functions.invoke('verify-whatsapp-otp', {
              body: { 
                phone: formData.phone, 
                otp: otpCode,
                fullName: formData.fullName,
                birthdate: birthdate?.toISOString().split('T')[0]
              }
            });

            if (error || !data?.success) {
              setGeneralError(error?.message || data?.error || "קוד לא תקין");
              toast({ title: "האימות נכשל", description: error?.message || data?.error, variant: "destructive" });
              setOtp(["", "", "", "", "", ""]);
              otpInputRefs.current[0]?.focus();
              setLoading(false);
              return;
            }

            // If session is returned, set it in Supabase client
            if (data.session) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
              });

              if (sessionError) {
                console.error("Error setting session:", sessionError);
                setGeneralError("שגיאה בהתחברות. נסה שוב.");
                setLoading(false);
                return;
              }
            }

            // Save additional data to profile if new user
            if (data.isNewUser && data.userId) {
              const profileUpdate: Record<string, any> = {};
              if (birthdate) profileUpdate.birthdate = birthdate.toISOString().split('T')[0];
              if (formData.phone) profileUpdate.phone = formData.phone;
              const nameParts = formData.fullName.trim().split(' ');
              profileUpdate.first_name = nameParts[0] || null;
              profileUpdate.last_name = nameParts.slice(1).join(' ') || null;
              
              if (Object.keys(profileUpdate).length > 0) {
                await supabase
                  .from('profiles')
                  .update(profileUpdate)
                  .eq('id', data.userId);
              }
            }

            if (data.isNewUser) {
              toast({ title: "החשבון נוצר!", description: "ברוכים הבאים ל-Petid!" });
              navigate("/onboarding");
            } else {
              toast({ title: "התחברת בהצלחה!", description: "ברוכים השבים!" });
              navigate("/");
            }
          } else {
            // Email OTP via Supabase
            const { data: authData, error } = await supabase.auth.verifyOtp({ 
              email: formData.email, 
              token: otpCode, 
              type: 'email' 
            });

            if (error) {
              setGeneralError(error.message);
              toast({ title: "האימות נכשל", description: error.message, variant: "destructive" });
              setOtp(["", "", "", "", "", ""]);
              otpInputRefs.current[0]?.focus();
              setLoading(false);
              return;
            }

            // Save additional data to profile
            if (authData?.user) {
              const profileUpdate: Record<string, any> = {};
              if (birthdate) profileUpdate.birthdate = birthdate.toISOString().split('T')[0];
              const nameParts = formData.fullName.trim().split(' ');
              profileUpdate.first_name = nameParts[0] || null;
              profileUpdate.last_name = nameParts.slice(1).join(' ') || null;
              
              if (Object.keys(profileUpdate).length > 0) {
                await supabase
                  .from('profiles')
                  .update(profileUpdate)
                  .eq('id', authData.user.id);
              }
            }

            toast({ title: "החשבון נוצר!", description: "ברוכים הבאים ל-Petid!" });
            navigate("/onboarding");
          }
        } catch {
          setGeneralError("אירעה שגיאה לא צפויה.");
          setOtp(["", "", "", "", "", ""]);
          otpInputRefs.current[0]?.focus();
          setLoading(false);
        }
      }
    };
    verifyOtp();
  }, [otp, showOTPInput, loading, birthdate]);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    pastedData.split('').forEach((digit, index) => {
      if (index < 6) newOtp[index] = digit;
    });
    setOtp(newOtp);
    const nextEmptyIndex = newOtp.findIndex(d => !d);
    otpInputRefs.current[nextEmptyIndex === -1 ? 5 : nextEmptyIndex]?.focus();
  };

  const validateForm = (): boolean => {
    const schema = signupMethod === "email"
      ? emailSignupSchema
      : phoneSignupSchema;
    
    const data = signupMethod === "email"
      ? { fullName: formData.fullName, email: formData.email, birthdate }
      : { fullName: formData.fullName, phone: formData.phone, birthdate };
    
    const result = schema.safeParse(data);
    
    if (result.success) {
      setFieldErrors({});
      setGeneralError("");
      return true;
    }
    
    const errors: FieldError = {};
    result.error.issues.forEach((issue) => {
      const field = issue.path[0] as keyof FieldError;
      if (field) {
        errors[field] = issue.message;
      }
    });
    setFieldErrors(errors);
    return false;
  };

  const sendOTP = async () => {
    setLoading(true);
    setGeneralError("");
    try {
      if (signupMethod === "whatsapp") {
        // Send via WhatsApp edge function
        const { data, error } = await supabase.functions.invoke('send-whatsapp-otp', {
          body: { phone: formData.phone, type: 'signup' }
        });

        if (error || !data?.success) {
          const errorMsg = error?.message || data?.error || data?.details || "שגיאה בשליחת הודעה";
          setGeneralError(errorMsg);
          toast({ title: "שגיאה", description: errorMsg, variant: "destructive" });
          setLoading(false);
          return false;
        }

        toast({ title: "קוד נשלח!", description: "בדוק את הווטסאפ שלך" });
      } else {
        // Email OTP via Supabase
        const { error } = await supabase.auth.signInWithOtp({ 
          email: formData.email, 
          options: { data: { full_name: formData.fullName, birthdate: birthdate?.toISOString().split('T')[0] } } 
        });

        if (error) {
          setGeneralError(error.message);
          toast({ title: "שגיאה", description: error.message, variant: "destructive" });
          setLoading(false);
          return false;
        }

        toast({ title: "הקוד נשלח!", description: "בדוק את האימייל שלך" });
      }

      setShowOTPInput(true);
      setResendCountdown(60);
      setLoading(false);
      return true;
    } catch {
      setGeneralError("שליחת הקוד נכשלה.");
      setLoading(false);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    if (!showOTPInput && !validateForm()) return;
    if (signupMethod === "sms") {
      // For SMS, use the dedicated PhoneOtpVerification component
      setShowSmsOtp(true);
      return;
    }
    if (!showOTPInput) await sendOTP();
  };

  const handleSmsVerified = async (e164Phone: string) => {
    // After SMS OTP verification, update profile with additional data
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const profileUpdate: Record<string, any> = {};
      if (birthdate) profileUpdate.birthdate = birthdate.toISOString().split('T')[0];
      profileUpdate.phone = e164Phone;
      const nameParts = formData.fullName.trim().split(' ');
      profileUpdate.first_name = nameParts[0] || null;
      profileUpdate.last_name = nameParts.slice(1).join(' ') || null;

      await supabase.from('profiles').update(profileUpdate).eq('id', currentUser.id);
    }
    toast({ title: "החשבון נוצר!", description: "ברוכים הבאים ל-Petid!" });
    navigate("/onboarding");
  };

  const isFormValid = formData.fullName && birthdate && (signupMethod === "email" ? formData.email : formData.phone);

  const getMethodLabel = () => {
    switch (signupMethod) {
      case "whatsapp": return "וואטסאפ";
      case "sms": return "SMS";
      case "email": return "אימייל";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      {generalError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg text-center"
        >
          {generalError}
        </motion.div>
      )}

      {showSmsOtp ? (
        <PhoneOtpVerification
          phone={formData.phone}
          mode="signup"
          onVerified={handleSmsVerified}
          onCancel={() => setShowSmsOtp(false)}
        />
      ) : !showOTPInput ? (
        <>
          {/* Method Toggle */}
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => { setSignupMethod("whatsapp"); setFieldErrors({}); setShowSmsOtp(false); }}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                signupMethod === "whatsapp" ? "bg-[#25D366] text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              וואטסאפ
            </button>
            <button
              type="button"
              onClick={() => { setSignupMethod("sms"); setFieldErrors({}); setShowSmsOtp(false); }}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                signupMethod === "sms" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              SMS
            </button>
            <button
              type="button"
              onClick={() => { setSignupMethod("email"); setFieldErrors({}); setShowSmsOtp(false); }}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                signupMethod === "email" ? "bg-card text-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              אימייל
            </button>
          </div>

          {/* Full Name */}
          <div>
            <Input
              type="text"
              placeholder="שם מלא"
              value={formData.fullName}
              onChange={(e) => {
                setFormData({ ...formData, fullName: e.target.value });
                setFieldErrors({ ...fieldErrors, fullName: undefined });
              }}
              disabled={loading}
              className={`h-10 bg-gray-50 border border-gray-300 rounded-lg text-sm placeholder:text-gray-400 focus:border-gray-400 focus:ring-0 ${
                fieldErrors.fullName ? "border-red-400" : ""
              }`}
              autoComplete="name"
            />
            {fieldErrors.fullName && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.fullName}</p>
            )}
          </div>

          {/* Birthdate Picker */}
          <div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={loading}
                  className={cn(
                    "w-full h-10 justify-start text-right bg-gray-50 border border-gray-300 rounded-lg text-sm hover:bg-gray-100",
                    !birthdate && "text-gray-400",
                    fieldErrors.birthdate && "border-red-400"
                  )}
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {birthdate ? format(birthdate, "dd/MM/yyyy") : "תאריך לידה"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={birthdate}
                  onSelect={(date) => {
                    setBirthdate(date);
                    setFieldErrors({ ...fieldErrors, birthdate: undefined });
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  captionLayout="dropdown-buttons"
                  fromYear={1920}
                  toYear={new Date().getFullYear()}
                  locale={he}
                />
              </PopoverContent>
            </Popover>
            {fieldErrors.birthdate && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.birthdate}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">חובה להיות מעל גיל 13</p>
          </div>

          {/* Email/Phone Input */}
          <div>
            <Input
              type={signupMethod === "email" ? "email" : "tel"}
              placeholder={signupMethod === "email" ? "אימייל" : "מספר טלפון"}
              value={signupMethod === "email" ? formData.email : formData.phone}
              onChange={(e) => {
                if (signupMethod === "email") {
                  setFormData({ ...formData, email: e.target.value });
                  setFieldErrors({ ...fieldErrors, email: undefined });
                } else {
                  setFormData({ ...formData, phone: e.target.value });
                  setFieldErrors({ ...fieldErrors, phone: undefined });
                }
              }}
              disabled={loading}
              className={`h-10 bg-gray-50 border border-gray-300 rounded-lg text-sm placeholder:text-gray-400 focus:border-gray-400 focus:ring-0 ${
                (signupMethod === "email" ? fieldErrors.email : fieldErrors.phone) ? "border-red-400" : ""
              }`}
              autoComplete={signupMethod === "email" ? "email" : "tel"}
              dir="ltr"
            />
            {(signupMethod === "email" ? fieldErrors.email : fieldErrors.phone) && (
              <p className="text-xs text-red-500 mt-1">
                {signupMethod === "email" ? fieldErrors.email : fieldErrors.phone}
              </p>
            )}
          </div>

          {/* Sign Up Button */}
          <Button
            type="submit"
            variant={signupMethod === "whatsapp" ? "default" : "instagram"}
            size="default"
            disabled={loading || !isFormValid}
            className={`w-full h-10 ${signupMethod === "whatsapp" ? "bg-[#25D366] hover:bg-[#20BD5A] text-white" : ""}`}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {signupMethod === "whatsapp" && <MessageCircle className="w-4 h-4 ml-2" />}
                הרשמה
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            בהרשמה, אתה מסכים ל{" "}
            <a href="/terms" className="text-primary">תנאי שימוש</a>,{" "}
            <a href="/privacy-policy" className="text-primary">מדיניות פרטיות</a> ו{" "}
            <a href="/privacy-policy" className="text-primary">מדיניות עוגיות</a>.
          </p>
        </>
      ) : (
        /* OTP Input */
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              הזן את הקוד בן 6 הספרות שנשלח ב{getMethodLabel()}
            </p>
            <p className="text-xs text-muted-foreground">
              {signupMethod === "email" ? formData.email : formData.phone}
            </p>
          </div>
          
          <div className="flex justify-center gap-2" dir="ltr">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (otpInputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                onPaste={index === 0 ? handleOtpPaste : undefined}
                disabled={loading}
                className="w-10 h-12 text-center text-xl font-semibold bg-gray-50 border border-gray-300 rounded-lg focus:border-gray-400 focus:outline-none transition-colors"
              />
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#0095F6]" />
              <span className="mr-2 text-sm text-gray-600">מאמת...</span>
            </div>
          )}

          <div className="space-y-2">
            <Button
              type="button"
              variant="instagramSecondary"
              size="sm"
              onClick={() => resendCountdown === 0 && sendOTP()}
              disabled={loading || resendCountdown > 0}
              className="w-full"
            >
              {resendCountdown > 0 ? `שלח שוב בעוד ${resendCountdown} שניות` : "שלח קוד שוב"}
            </Button>
            
            <button
              type="button"
              onClick={() => {
                setShowOTPInput(false);
                setOtp(["", "", "", "", "", ""]);
                setGeneralError("");
                setResendCountdown(0);
              }}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
              disabled={loading}
            >
              שנה {signupMethod === "email" ? "אימייל" : "מספר טלפון"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
};
