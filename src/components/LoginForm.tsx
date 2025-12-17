import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const emailOtpSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
});

const phoneOtpSchema = z.object({
  phone: z.string().min(1, "Phone number is required").regex(/^\+?[0-9]{10,15}$/, "Phone must be 10-15 digits"),
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
  });
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
          const { error } = loginMethod === "email" 
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

          toast({ title: "Login successful!", description: "Welcome back!" });
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
      if (loginMethod === "email") {
        emailOtpSchema.parse({ email: formData.email });
      } else {
        phoneOtpSchema.parse({ phone: formData.phone });
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
      const { error } = loginMethod === "email"
        ? await supabase.auth.signInWithOtp({ email: formData.email })
        : await supabase.auth.signInWithOtp({ phone: formData.phone });

      if (error) {
        setGeneralError(error.message);
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setLoading(false);
        return false;
      }

      toast({ title: "Code sent!", description: `Check your ${loginMethod === "email" ? "email" : "phone"}.` });
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
          {/* Method Toggle - Instagram style */}
          <div className="flex border border-gray-300 rounded-sm overflow-hidden">
            <button
              type="button"
              onClick={() => { setLoginMethod("phone"); setFieldErrors({}); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                loginMethod === "phone" ? "bg-white text-gray-900" : "bg-gray-50 text-gray-500"
              }`}
            >
              Phone
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod("email"); setFieldErrors({}); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-l border-gray-300 ${
                loginMethod === "email" ? "bg-white text-gray-900" : "bg-gray-50 text-gray-500"
              }`}
            >
              Email
            </button>
          </div>

          {/* Input Field - Instagram style */}
          <div>
            <Input
              type={loginMethod === "email" ? "email" : "tel"}
              placeholder={loginMethod === "email" ? "Email" : "Phone number"}
              value={loginMethod === "email" ? formData.email : formData.phone}
              onChange={(e) => {
                if (loginMethod === "email") {
                  setFormData({ ...formData, email: e.target.value });
                  setFieldErrors({ ...fieldErrors, email: undefined });
                } else {
                  setFormData({ ...formData, phone: e.target.value });
                  setFieldErrors({ ...fieldErrors, phone: undefined });
                }
              }}
              disabled={loading}
              className={`h-10 bg-gray-50 border border-gray-300 rounded-sm text-sm placeholder:text-gray-400 focus:border-gray-400 focus:ring-0 ${
                (loginMethod === "email" ? fieldErrors.email : fieldErrors.phone) ? "border-red-400" : ""
              }`}
              autoComplete={loginMethod === "email" ? "email" : "tel"}
            />
            {(loginMethod === "email" ? fieldErrors.email : fieldErrors.phone) && (
              <p className="text-xs text-red-500 mt-1">
                {loginMethod === "email" ? fieldErrors.email : fieldErrors.phone}
              </p>
            )}
          </div>

          {/* Login Button - Instagram blue */}
          <button
            type="submit"
            disabled={loading || !(loginMethod === "email" ? formData.email : formData.phone)}
            className="w-full h-10 bg-[#0095F6] hover:bg-[#1877F2] text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log In"}
          </button>
        </>
      ) : (
        /* OTP Input */
        <div className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            Enter the 6-digit code sent to your {loginMethod === "email" ? "email" : "phone"}
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
            <button
              type="button"
              onClick={() => resendCountdown === 0 && sendOTP()}
              disabled={loading || resendCountdown > 0}
              className="w-full text-sm text-[#0095F6] font-semibold disabled:text-gray-400"
            >
              {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : "Resend code"}
            </button>
            
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
              Change {loginMethod === "email" ? "email" : "phone number"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
};
