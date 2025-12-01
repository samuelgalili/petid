import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
const emailOtpSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  rememberMe: z.boolean().optional()
});
const phoneOtpSchema = z.object({
  phone: z.string().min(1, "Phone number is required").regex(/^\+?[0-9]{10,15}$/, "Phone must be 10-15 digits with optional + prefix"),
  rememberMe: z.boolean().optional()
});
interface FieldError {
  email?: string;
  phone?: string;
}
export const LoginForm = () => {
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("phone");
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    rememberMe: false
  });
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [generalError, setGeneralError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();

  // Countdown timer effect
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Focus first OTP input when OTP screen shows
  useEffect(() => {
    if (showOTPInput && otpInputRefs.current[0]) {
      otpInputRefs.current[0].focus();
    }
  }, [showOTPInput]);

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    const verifyOtp = async () => {
      if (otp.every(d => d) && showOTPInput && !loading) {
        setLoading(true);
        setGeneralError("");
        try {
          const otpCode = otp.join('');
          if (loginMethod === "email") {
            const {
              error
            } = await supabase.auth.verifyOtp({
              email: formData.email,
              token: otpCode,
              type: 'email'
            });
            if (error) {
              setGeneralError(error.message);
              toast({
                title: "Verification failed",
                description: error.message,
                variant: "destructive"
              });
              // Clear OTP on error
              setOtp(["", "", "", "", "", ""]);
              otpInputRefs.current[0]?.focus();
              setLoading(false);
              return;
            }
          } else {
            const {
              error
            } = await supabase.auth.verifyOtp({
              phone: formData.phone,
              token: otpCode,
              type: 'sms'
            });
            if (error) {
              setGeneralError(error.message);
              toast({
                title: "Verification failed",
                description: error.message,
                variant: "destructive"
              });
              // Clear OTP on error
              setOtp(["", "", "", "", "", ""]);
              otpInputRefs.current[0]?.focus();
              setLoading(false);
              return;
            }
          }
          toast({
            title: "Login successful!",
            description: "Welcome back!"
          });
          navigate("/add-pet");
        } catch (error: any) {
          setGeneralError("An unexpected error occurred. Please try again.");
          toast({
            title: "Error",
            description: "An unexpected error occurred",
            variant: "destructive"
          });
          setOtp(["", "", "", "", "", ""]);
          otpInputRefs.current[0]?.focus();
          setLoading(false);
        }
      }
    };
    verifyOtp();
  }, [otp, showOTPInput, loading]);
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
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
      if (index < 6) {
        newOtp[index] = digit;
      }
    });
    setOtp(newOtp);
    const nextEmptyIndex = newOtp.findIndex(d => !d);
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
    otpInputRefs.current[focusIndex]?.focus();
  };
  const validateForm = (): boolean => {
    try {
      if (loginMethod === "email") {
        emailOtpSchema.parse({
          email: formData.email,
          rememberMe: formData.rememberMe
        });
      } else {
        phoneOtpSchema.parse({
          phone: formData.phone,
          rememberMe: formData.rememberMe
        });
      }
      setFieldErrors({});
      setGeneralError("");
      return true;
    } catch (error: any) {
      const errors: FieldError = {};
      error.errors.forEach((err: any) => {
        const field = err.path[0] as keyof FieldError;
        errors[field] = err.message;
      });
      setFieldErrors(errors);
      return false;
    }
  };
  const sendOTP = async () => {
    setLoading(true);
    setGeneralError("");
    try {
      if (loginMethod === "email") {
        const {
          error
        } = await supabase.auth.signInWithOtp({
          email: formData.email
        });
        if (error) {
          setGeneralError(error.message);
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive"
          });
          setLoading(false);
          return false;
        }
      } else {
        const {
          error
        } = await supabase.auth.signInWithOtp({
          phone: formData.phone
        });
        if (error) {
          setGeneralError(error.message);
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive"
          });
          setLoading(false);
          return false;
        }
      }
      toast({
        title: "Verification code sent!",
        description: `Check your ${loginMethod === "email" ? "email" : "phone"} for the code.`
      });
      setShowOTPInput(true);
      setResendCountdown(60);
      setLoading(false);
      return true;
    } catch (error: any) {
      setGeneralError("Failed to send verification code. Please try again.");
      toast({
        title: "Error",
        description: "Failed to send verification code",
        variant: "destructive"
      });
      setLoading(false);
      return false;
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    if (!showOTPInput && !validateForm()) {
      return;
    }
    setLoading(true);
    try {
      if (!showOTPInput) {
        await sendOTP();
      }
      // OTP verification is handled by auto-submit useEffect
    } catch (error: any) {
      setGeneralError("An unexpected error occurred. Please try again later.");
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
      setLoading(false);
    }
  };
  return <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {generalError && <motion.div initial={{
      opacity: 0,
      y: -10
    }} animate={{
      opacity: 1,
      y: 0
    }} className="p-3 text-sm text-error bg-error/10 border border-error/20 rounded-xl backdrop-blur-sm" role="alert" aria-live="assertive">
          {generalError}
        </motion.div>}

      {!showOTPInput ? <>
          {/* Login Method Tabs */}
          <div className="flex p-2 bg-gray-100/80 rounded-2xl backdrop-blur-sm gap-2">
            <button type="button" onClick={() => {
          setLoginMethod("email");
          setFieldErrors({});
          setGeneralError("");
        }} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-jakarta font-medium transition-all ${loginMethod === "email" ? "bg-white text-gray-900 shadow-md" : "text-gray-600 hover:text-gray-900"}`}>
              <Mail className="h-4 w-4" />
              Email
            </button>
            <button type="button" onClick={() => {
          setLoginMethod("phone");
          setFieldErrors({});
          setGeneralError("");
        }} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-jakarta font-medium transition-all ${loginMethod === "phone" ? "bg-white text-gray-900 shadow-md" : "text-gray-600 hover:text-gray-900"}`}>
              <Phone className="h-4 w-4" />
              Phone
            </button>
          </div>

          {loginMethod === "email" ? <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-jakarta font-medium text-gray-700">
                Email Address
              </Label>
              <Input id="email" name="email" type="email" placeholder="your@email.com" value={formData.email} onChange={e => {
          setFormData({
            ...formData,
            email: e.target.value
          });
          setFieldErrors({
            ...fieldErrors,
            email: undefined
          });
        }} disabled={loading} className={`h-12 bg-gray-50/95 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary rounded-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] focus:shadow-[0_8px_30px_rgba(96,165,250,0.3)] backdrop-blur-sm ${fieldErrors.email ? "border-error focus-visible:ring-error" : ""}`} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? "email-error" : undefined} autoComplete="email" />
              {fieldErrors.email && <motion.p initial={{
          opacity: 0,
          height: 0
        }} animate={{
          opacity: 1,
          height: "auto"
        }} id="email-error" className="text-xs text-error bg-error/10 px-3 py-1.5 rounded-lg backdrop-blur-sm" role="alert">
                  {fieldErrors.email}
                </motion.p>}
            </div> : <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-jakarta font-medium text-gray-700">
                Phone Number
              </Label>
              <Input id="phone" name="phone" type="tel" placeholder="+1234567890" value={formData.phone} onChange={e => {
          setFormData({
            ...formData,
            phone: e.target.value
          });
          setFieldErrors({
            ...fieldErrors,
            phone: undefined
          });
        }} disabled={loading} className={`h-12 bg-gray-50/95 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary rounded-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] focus:shadow-[0_8px_30px_rgba(96,165,250,0.3)] backdrop-blur-sm ${fieldErrors.phone ? "border-error focus-visible:ring-error" : ""}`} aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? "phone-error" : undefined} autoComplete="tel" />
              {fieldErrors.phone && <motion.p initial={{
          opacity: 0,
          height: 0
        }} animate={{
          opacity: 1,
          height: "auto"
        }} id="phone-error" className="text-xs text-error bg-error/10 px-3 py-1.5 rounded-lg backdrop-blur-sm" role="alert">
                  {fieldErrors.phone}
                </motion.p>}
            </div>}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" checked={formData.rememberMe} onCheckedChange={checked => setFormData({
            ...formData,
            rememberMe: checked as boolean
          })} disabled={loading} className="bg-gray-100 border-gray-300 data-[state=checked]:bg-gray-900 data-[state=checked]:text-white" />
              <Label htmlFor="remember" className="text-sm font-jakarta font-normal cursor-pointer text-gray-700">
                Remember me
              </Label>
            </div>
          </div>
        </> : <div className="space-y-3">
          <Label className="text-sm font-jakarta font-medium text-gray-700 text-center block">
            Verification Code
          </Label>
          
          <div className="flex justify-center gap-2">
            {otp.map((digit, index) => <motion.input key={index} ref={el => otpInputRefs.current[index] = el} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={e => handleOtpChange(index, e.target.value)} onKeyDown={e => handleOtpKeyDown(index, e)} onPaste={index === 0 ? handleOtpPaste : undefined} disabled={loading} animate={otp.every(d => d) ? {
          scale: [1, 1.05, 1],
          borderColor: ["hsl(var(--border))", "hsl(var(--accent))", "hsl(var(--accent))"]
        } : {}} transition={{
          duration: 0.3,
          delay: index * 0.05
        }} className={`w-12 h-14 text-center text-2xl font-bold bg-gray-50/95 border-2 text-gray-900 rounded-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_25px_rgba(0,0,0,0.2)] backdrop-blur-sm focus:outline-none ${digit ? otp.every(d => d) ? "border-accent bg-accent/10 focus:border-accent-hover focus:shadow-lg" : "border-gray-300 bg-gray-100 focus:border-primary focus:shadow-[0_6px_25px_rgba(96,165,250,0.3)]" : "border-gray-200 focus:border-primary focus:shadow-[0_6px_25px_rgba(96,165,250,0.3)]"}`} autoComplete="one-time-code" />)}
          </div>

          <motion.p initial={{
        opacity: 0.7
      }} animate={otp.every(d => d) ? {
        opacity: [0.7, 1, 0.7],
        color: ["hsl(var(--muted-foreground))", "hsl(var(--accent-hover))", "hsl(var(--muted-foreground))"]
      } : {
        opacity: 0.7
      }} transition={{
        duration: 0.5
      }} className="text-xs font-jakarta text-center">
            {otp.every(d => d) ? "✓ Code complete! Click verify to continue" : `Enter the 6-digit code sent to your ${loginMethod === "email" ? "email" : "phone"}`}
          </motion.p>
        </div>}

      {!showOTPInput && <Button type="submit" className="w-full h-12 bg-accent hover:bg-accent-hover text-gray-900 font-semibold transition-all rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100" disabled={loading} aria-busy={loading}>
          {loading ? <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
              <span>Sending code...</span>
            </> : "Send Code"}
        </Button>}

      {showOTPInput && loading && <div className="flex items-center justify-center py-3">
          <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden="true" />
          <span className="ml-2 text-sm text-gray-700">Verifying...</span>
        </div>}

      {showOTPInput && <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" onClick={async () => {
        if (resendCountdown === 0) {
          await sendOTP();
        }
      }} disabled={loading || resendCountdown > 0} className="w-full h-10 bg-gray-50/95 hover:bg-gray-100 text-gray-700 font-medium border-2 border-gray-200 rounded-xl transition-all disabled:opacity-50">
            {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : "Resend verification code"}
          </Button>
          
          <button type="button" onClick={() => {
        setShowOTPInput(false);
        setOtp(["", "", "", "", "", ""]);
        setGeneralError("");
        setResendCountdown(0);
      }} className="w-full text-sm text-gray-700 hover:text-gray-900 transition-colors" disabled={loading}>
            Change {loginMethod === "email" ? "email" : "phone number"}
          </button>
        </div>}
    </form>;
};