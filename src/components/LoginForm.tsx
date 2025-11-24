import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { loginSchema, type LoginFormData } from "@/lib/validators";
import { useAuth } from "@/hooks/useAuth";

interface FieldError {
  email?: string;
  password?: string;
  phone?: string;
}

export const LoginForm = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
    phone: "",
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
        <Label htmlFor="password" className="text-sm font-medium text-white">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={(e) => {
            setFormData({ ...formData, password: e.target.value });
            setFieldErrors({ ...fieldErrors, password: undefined });
          }}
          disabled={loading}
          className={`h-12 bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary rounded-xl transition-all shadow-sm hover:shadow-md ${fieldErrors.password ? "border-red-400 focus-visible:ring-red-400" : ""}`}
          aria-invalid={!!fieldErrors.password}
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
          autoComplete="current-password"
        />
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
            className="text-sm font-normal cursor-pointer text-white"
          >
            Remember me
          </Label>
        </div>
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
            <span>Signing in...</span>
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
};
