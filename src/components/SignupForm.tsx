import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { signupSchema, type SignupFormData } from "@/lib/validators";
import { supabase } from "@/integrations/supabase/client";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

interface FieldError {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

export const SignupForm = () => {
  const [formData, setFormData] = useState<SignupFormData>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [generalError, setGeneralError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateForm = (): boolean => {
    try {
      signupSchema.parse(formData);
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

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
          },
          emailRedirectTo: `${window.location.origin}/add-pet`,
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          setGeneralError("This email is already registered. Try logging in instead.");
          setFieldErrors({ email: "Email already exists" });
        } else {
          setGeneralError(error.message);
        }

        toast({
          title: "Registration Error",
          description: error.message,
          variant: "destructive",
        });
      } else if (data.user) {
        toast({
          title: "Registration Successful!",
          description: "New account created successfully",
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
    } finally {
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

      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-sm font-medium text-white">
          Full Name
        </Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          placeholder="John Doe"
          value={formData.fullName}
          onChange={(e) => {
            setFormData({ ...formData, fullName: e.target.value });
            setFieldErrors({ ...fieldErrors, fullName: undefined });
          }}
          disabled={loading}
          className={`h-12 bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary rounded-xl transition-all shadow-sm hover:shadow-md ${fieldErrors.fullName ? "border-red-400 focus-visible:ring-red-400" : ""}`}
          aria-invalid={!!fieldErrors.fullName}
          aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
          autoComplete="name"
        />
        {fieldErrors.fullName && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            id="fullName-error"
            className="text-xs text-red-100 bg-red-500/30 px-3 py-1.5 rounded-lg backdrop-blur-sm"
            role="alert"
          >
            {fieldErrors.fullName}
          </motion.p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-white">
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
          className={`h-12 bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary rounded-xl transition-all shadow-sm hover:shadow-md ${fieldErrors.email ? "border-red-400 focus-visible:ring-red-400" : ""}`}
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
        <Label htmlFor="phone" className="text-sm font-medium text-white">
          Phone Number
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="1234567890"
          value={formData.phone}
          onChange={(e) => {
            setFormData({ ...formData, phone: e.target.value });
            setFieldErrors({ ...fieldErrors, phone: undefined });
          }}
          disabled={loading}
          className={`h-12 bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary rounded-xl transition-all shadow-sm hover:shadow-md ${fieldErrors.phone ? "border-red-400 focus-visible:ring-red-400" : ""}`}
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

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-white">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              setFieldErrors({ ...fieldErrors, password: undefined });
            }}
            disabled={loading}
            className={`h-12 pr-10 bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary rounded-xl transition-all shadow-sm hover:shadow-md ${fieldErrors.password ? "border-red-400 focus-visible:ring-red-400" : ""}`}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {fieldErrors.password && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            id="password-error"
            className="text-xs text-red-100 bg-red-500/30 px-3 py-1.5 rounded-lg backdrop-blur-sm"
            role="alert"
          >
            {fieldErrors.password}
          </motion.p>
        )}
        <PasswordStrengthIndicator password={formData.password} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium text-white">
          Confirm Password
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChange={(e) => {
              setFormData({ ...formData, confirmPassword: e.target.value });
              setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
            }}
            disabled={loading}
            className={`h-12 pr-10 bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary rounded-xl transition-all shadow-sm hover:shadow-md ${fieldErrors.confirmPassword ? "border-red-400 focus-visible:ring-red-400" : ""}`}
            aria-invalid={!!fieldErrors.confirmPassword}
            aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {fieldErrors.confirmPassword && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            id="confirmPassword-error"
            className="text-xs text-red-100 bg-red-500/30 px-3 py-1.5 rounded-lg backdrop-blur-sm"
            role="alert"
          >
            {fieldErrors.confirmPassword}
          </motion.p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold transition-all rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
            <span>Creating account...</span>
          </>
        ) : (
          "Create Account"
        )}
      </Button>
    </form>
  );
};
