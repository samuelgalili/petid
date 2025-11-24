import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { loginSchema, type LoginFormData } from "@/lib/validators";
import { useAuth } from "@/hooks/useAuth";

interface FieldError {
  email?: string;
  password?: string;
}

export const LoginForm = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [generalError, setGeneralError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateForm = (): boolean => {
    try {
      loginSchema.parse(formData);
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
      const { data, error } = await signIn(
        formData.email,
        formData.password,
        formData.rememberMe || false
      );

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setGeneralError("Invalid email or password. Please try again.");
        } else if (error.message.includes("Email not confirmed")) {
          setGeneralError("Please confirm your email before logging in.");
        } else {
          setGeneralError(error.message);
        }
        
        toast({
          title: "Login Error",
          description: error.message,
          variant: "destructive",
        });
      } else if (data.session) {
        toast({
          title: "Login Successful",
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
          <p
            id="email-error"
            className="text-sm text-red-600"
            role="alert"
          >
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Enter password (at least 6 characters)"
          value={formData.password}
          onChange={(e) => {
            setFormData({ ...formData, password: e.target.value });
            setFieldErrors({ ...fieldErrors, password: undefined });
          }}
          disabled={loading}
          className={`h-11 ${fieldErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
          aria-invalid={!!fieldErrors.password}
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
          autoComplete="current-password"
        />
        {fieldErrors.password && (
          <p
            id="password-error"
            className="text-sm text-red-600"
            role="alert"
          >
            {fieldErrors.password}
          </p>
        )}
      </div>

      <div className="flex items-center space-x-2 space-x-reverse">
        <Checkbox
          id="remember"
          checked={formData.rememberMe}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, rememberMe: checked as boolean })
          }
          disabled={loading}
        />
        <Label
          htmlFor="remember"
          className="text-sm font-normal cursor-pointer"
        >
          Remember me
        </Label>
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
            <span>Signing In...</span>
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
};
