import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const emailSignupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
  email: z.string().min(1, "Email is required").email("Invalid email"),
});

const phoneSignupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
  phone: z.string().min(1, "Phone is required").regex(/^\+?[0-9]{10,15}$/, "Invalid phone number"),
});

interface FieldError {
  fullName?: string;
  email?: string;
  phone?: string;
}

export const SignupForm = () => {
  const [signupMethod, setSignupMethod] = useState<"email" | "phone">("phone");
  const [formData, setFormData] = useState({ fullName: "", email: "", phone: "" });
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
          const { error } = signupMethod === "email"
            ? await supabase.auth.verifyOtp({ email: formData.email, token: otpCode, type: 'email' })
            : await supabase.auth.verifyOtp({ phone: formData.phone, token: otpCode, type: 'sms' });

          if (error) {
            setGeneralError(error.message);
            toast({ title: "Verification failed", description: error.message, variant: "destructive" });
            setOtp(["", "", "", "", "", ""]);
            otpInputRefs.current[0]?.focus();
            setLoading(false);
            return;
          }

          toast({ title: "Account created!", description: "Welcome to Petid!" });
          navigate("/add-pet");
        } catch {
          setGeneralError("An unexpected error occurred.");
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
    try {
      if (signupMethod === "email") {
        emailSignupSchema.parse({ fullName: formData.fullName, email: formData.email });
      } else {
        phoneSignupSchema.parse({ fullName: formData.fullName, phone: formData.phone });
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
      const { error } = signupMethod === "email"
        ? await supabase.auth.signInWithOtp({ email: formData.email, options: { data: { full_name: formData.fullName } } })
        : await supabase.auth.signInWithOtp({ phone: formData.phone, options: { data: { full_name: formData.fullName } } });

      if (error) {
        setGeneralError(error.message);
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setLoading(false);
        return false;
      }

      toast({ title: "Code sent!", description: `Check your ${signupMethod === "email" ? "email" : "phone"}.` });
      setShowOTPInput(true);
      setResendCountdown(60);
      setLoading(false);
      return true;
    } catch {
      setGeneralError("Failed to send code.");
      setLoading(false);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    if (!showOTPInput && !validateForm()) return;
    if (!showOTPInput) await sendOTP();
  };

  const isFormValid = formData.fullName && (signupMethod === "email" ? formData.email : formData.phone);

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

      {!showOTPInput ? (
        <>
          {/* Method Toggle */}
          <div className="flex border border-gray-300 rounded-sm overflow-hidden">
            <button
              type="button"
              onClick={() => { setSignupMethod("phone"); setFieldErrors({}); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                signupMethod === "phone" ? "bg-white text-gray-900" : "bg-gray-50 text-gray-500"
              }`}
            >
              Phone
            </button>
            <button
              type="button"
              onClick={() => { setSignupMethod("email"); setFieldErrors({}); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-l border-gray-300 ${
                signupMethod === "email" ? "bg-white text-gray-900" : "bg-gray-50 text-gray-500"
              }`}
            >
              Email
            </button>
          </div>

          {/* Full Name */}
          <div>
            <Input
              type="text"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={(e) => {
                setFormData({ ...formData, fullName: e.target.value });
                setFieldErrors({ ...fieldErrors, fullName: undefined });
              }}
              disabled={loading}
              className={`h-10 bg-gray-50 border border-gray-300 rounded-sm text-sm placeholder:text-gray-400 focus:border-gray-400 focus:ring-0 ${
                fieldErrors.fullName ? "border-red-400" : ""
              }`}
              autoComplete="name"
            />
            {fieldErrors.fullName && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.fullName}</p>
            )}
          </div>

          {/* Email/Phone Input */}
          <div>
            <Input
              type={signupMethod === "email" ? "email" : "tel"}
              placeholder={signupMethod === "email" ? "Email" : "Phone number"}
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
              className={`h-10 bg-gray-50 border border-gray-300 rounded-sm text-sm placeholder:text-gray-400 focus:border-gray-400 focus:ring-0 ${
                (signupMethod === "email" ? fieldErrors.email : fieldErrors.phone) ? "border-red-400" : ""
              }`}
              autoComplete={signupMethod === "email" ? "email" : "tel"}
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
            variant="instagram"
            size="default"
            disabled={loading || !isFormValid}
            className="w-full h-10"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign Up"}
          </Button>

          <p className="text-xs text-gray-500 text-center leading-relaxed">
            By signing up, you agree to our{" "}
            <a href="/terms" className="text-[#00376B]">Terms</a>,{" "}
            <a href="/privacy" className="text-[#00376B]">Privacy Policy</a> and{" "}
            <a href="/privacy" className="text-[#00376B]">Cookies Policy</a>.
          </p>
        </>
      ) : (
        /* OTP Input */
        <div className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            Enter the 6-digit code sent to your {signupMethod === "email" ? "email" : "phone"}
          </p>
          
          <div className="flex justify-center gap-2">
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
                className="w-10 h-12 text-center text-xl font-semibold bg-gray-50 border border-gray-300 rounded-sm focus:border-gray-400 focus:outline-none transition-colors"
              />
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#0095F6]" />
              <span className="ml-2 text-sm text-gray-600">Verifying...</span>
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
              {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : "Resend code"}
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
              Change {signupMethod === "email" ? "email" : "phone number"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
};
