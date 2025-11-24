import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const otpLoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+?[0-9]{10,15}$/, "Phone must be 10-15 digits with optional + prefix"),
  rememberMe: z.boolean().optional(),
});

interface FieldError {
  email?: string;
  phone?: string;
}

export const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    rememberMe: false,
  });
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [generalError, setGeneralError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateForm = (): boolean => {
    try {
      otpLoginSchema.parse(formData);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");

    if (!showOTPInput && !validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (!showOTPInput) {
        // Send OTP to phone
        const { error: phoneError } = await supabase.auth.signInWithOtp({
          phone: formData.phone,
        });

        if (phoneError) {
          setGeneralError(phoneError.message);
          toast({
            title: "Error",
            description: phoneError.message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Also send OTP to email
        const { error: emailError } = await supabase.auth.signInWithOtp({
          email: formData.email,
        });

        if (emailError) {
          console.warn("Email OTP error:", emailError.message);
        }

        toast({
          title: "Verification code sent!",
          description: "Check your phone and email for the code.",
        });

        setShowOTPInput(true);
        setLoading(false);
      } else {
        // Verify OTP
        const { error } = await supabase.auth.verifyOtp({
          phone: formData.phone,
          token: otp,
          type: 'sms'
        });

        if (error) {
          setGeneralError(error.message);
          toast({
            title: "Verification failed",
            description: error.message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        toast({
          title: "Login successful!",
          description: "Welcome back!",
        });

        navigate("/add-pet");
      }
    } catch (error: any) {
      setGeneralError("An unexpected error occurred. Please try again later.");
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {generalError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 text-sm text-red-100 bg-red-500/20 border border-red-300/30 rounded-xl backdrop-blur-sm"
          role="alert"
          aria-live="assertive"
        >
          {generalError}
        </motion.div>
      )}

      {!showOTPInput ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-jakarta font-medium text-gray-700">
              Email Address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                setFieldErrors({ ...fieldErrors, email: undefined });
              }}
              disabled={loading}
              className={`h-12 bg-gray-50/95 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary rounded-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] focus:shadow-[0_8px_30px_rgba(96,165,250,0.3)] backdrop-blur-sm ${fieldErrors.email ? "border-red-400 focus-visible:ring-red-400" : ""}`}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              autoComplete="email"
            />
            {fieldErrors.email && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                id="email-error"
                className="text-xs text-red-100 bg-red-500/30 px-3 py-1.5 rounded-lg backdrop-blur-sm"
                role="alert"
              >
                {fieldErrors.email}
              </motion.p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-jakarta font-medium text-gray-700">
              Phone Number
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+1234567890"
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value });
                setFieldErrors({ ...fieldErrors, phone: undefined });
              }}
              disabled={loading}
              className={`h-12 bg-gray-50/95 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary rounded-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] focus:shadow-[0_8px_30px_rgba(96,165,250,0.3)] backdrop-blur-sm ${fieldErrors.phone ? "border-red-400 focus-visible:ring-red-400" : ""}`}
              aria-invalid={!!fieldErrors.phone}
              aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
              autoComplete="tel"
            />
            {fieldErrors.phone && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                id="phone-error"
                className="text-xs text-red-100 bg-red-500/30 px-3 py-1.5 rounded-lg backdrop-blur-sm"
                role="alert"
              >
                {fieldErrors.phone}
              </motion.p>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={formData.rememberMe}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, rememberMe: checked as boolean })
                }
                disabled={loading}
                className="bg-gray-100 border-gray-300 data-[state=checked]:bg-gray-900 data-[state=checked]:text-white"
              />
              <Label
                htmlFor="remember"
                className="text-sm font-jakarta font-normal cursor-pointer text-gray-700"
              >
                Remember me
              </Label>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="otp" className="text-sm font-jakarta font-medium text-gray-700">
            Verification Code
          </Label>
          <Input
            id="otp"
            name="otp"
            type="text"
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            disabled={loading}
            maxLength={6}
            className="h-12 bg-gray-50/95 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary rounded-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] focus:shadow-[0_8px_30px_rgba(96,165,250,0.3)] backdrop-blur-sm text-center text-2xl tracking-widest"
            autoComplete="one-time-code"
          />
          <p className="text-xs text-gray-600 font-jakarta text-center">
            Enter the 6-digit code sent to your phone and email
          </p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-12 bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900 font-jakarta font-semibold transition-all rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_40px_rgba(251,191,36,0.4)] hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
            <span>{showOTPInput ? "Verifying..." : "Sending code..."}</span>
          </>
        ) : showOTPInput ? (
          "Verify Code"
        ) : (
          "Send Code"
        )}
      </Button>

      {showOTPInput && (
        <button
          type="button"
          onClick={() => {
            setShowOTPInput(false);
            setOtp("");
            setGeneralError("");
          }}
          className="w-full text-sm text-gray-700 hover:text-gray-900 font-jakarta transition-colors"
          disabled={loading}
        >
          Change phone number
        </button>
      )}
    </form>
  );
};
