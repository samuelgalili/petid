import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { signupSchema, type SignupFormData } from "@/lib/validators";
import { supabase } from "@/integrations/supabase/client";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

interface FieldError {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export const SignupForm = () => {
  const [formData, setFormData] = useState<SignupFormData>({
    fullName: "",
    email: "",
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
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {generalError && (
        <div
          className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg"
          role="alert"
          aria-live="assertive"
        >
          {generalError}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-sm font-medium">
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
          className={`h-11 ${fieldErrors.fullName ? "border-red-500 focus-visible:ring-red-500" : ""}`}
          aria-invalid={!!fieldErrors.fullName}
          aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
          autoComplete="name"
        />
        {fieldErrors.fullName && (
          <p id="fullName-error" className="text-sm text-red-600" role="alert">
            {fieldErrors.fullName}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="example@email.com"
          value={formData.email}
          onChange={(e) => {
            setFormData({ ...formData, email: e.target.value });
            setFieldErrors({ ...fieldErrors, email: undefined });
          }}
          disabled={loading}
          className={`h-11 ${fieldErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          autoComplete="email"
        />
        {fieldErrors.email && (
          <p id="email-error" className="text-sm text-red-600" role="alert">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="At least 6 characters, including uppercase, lowercase & number"
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              setFieldErrors({ ...fieldErrors, password: undefined });
            }}
            disabled={loading}
            className={`h-11 pr-10 ${fieldErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {fieldErrors.password && (
          <p id="password-error" className="text-sm text-red-600" role="alert">
            {fieldErrors.password}
          </p>
        )}
        <PasswordStrengthIndicator password={formData.password} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm Password
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Re-enter password"
            value={formData.confirmPassword}
            onChange={(e) => {
              setFormData({ ...formData, confirmPassword: e.target.value });
              setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
            }}
            disabled={loading}
            className={`h-11 pr-10 ${fieldErrors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            aria-invalid={!!fieldErrors.confirmPassword}
            aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {fieldErrors.confirmPassword && (
          <p id="confirmPassword-error" className="text-sm text-red-600" role="alert">
            {fieldErrors.confirmPassword}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? (
          <>
            <Loader2 className="ml-2 h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Creating Account...</span>
          </>
        ) : (
          "Create Account"
        )}
      </Button>
    </form>
  );
};
