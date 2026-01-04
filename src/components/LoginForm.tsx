import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().min(1, "נדרש אימייל").email("כתובת אימייל לא תקינה"),
  password: z.string().min(6, "הסיסמה חייבת להכיל לפחות 6 תווים"),
});

interface FieldError {
  email?: string;
  password?: string;
}

export const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [generalError, setGeneralError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateForm = (): boolean => {
    const result = loginSchema.safeParse(formData);
    
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setGeneralError("אימייל או סיסמה שגויים");
        } else if (error.message.includes("Email not confirmed")) {
          setGeneralError("האימייל לא אומת. בדוק את תיבת הדואר שלך");
        } else {
          setGeneralError(error.message);
        }
        toast({ title: "שגיאה בהתחברות", description: "אימייל או סיסמה שגויים", variant: "destructive" });
        setLoading(false);
        return;
      }

      toast({ title: "התחברת בהצלחה!", description: "ברוכים השבים!" });
      navigate("/");
    } catch {
      setGeneralError("אירעה שגיאה לא צפויה");
      setLoading(false);
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

      {/* Email Input */}
      <div>
        <Input
          type="email"
          placeholder="אימייל"
          value={formData.email}
          onChange={(e) => {
            setFormData({ ...formData, email: e.target.value });
            setFieldErrors({ ...fieldErrors, email: undefined });
          }}
          disabled={loading}
          className={`h-10 bg-gray-50 border border-gray-300 rounded-sm text-sm placeholder:text-gray-400 focus:border-gray-400 focus:ring-0 ${
            fieldErrors.email ? "border-red-400" : ""
          }`}
          autoComplete="email"
          dir="ltr"
        />
        {fieldErrors.email && (
          <p className="text-xs text-red-500 mt-1 text-right">{fieldErrors.email}</p>
        )}
      </div>

      {/* Password Input */}
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="סיסמה"
          value={formData.password}
          onChange={(e) => {
            setFormData({ ...formData, password: e.target.value });
            setFieldErrors({ ...fieldErrors, password: undefined });
          }}
          disabled={loading}
          className={`h-10 bg-gray-50 border border-gray-300 rounded-sm text-sm placeholder:text-gray-400 focus:border-gray-400 focus:ring-0 pr-10 ${
            fieldErrors.password ? "border-red-400" : ""
          }`}
          autoComplete="current-password"
          dir="ltr"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        {fieldErrors.password && (
          <p className="text-xs text-red-500 mt-1 text-right">{fieldErrors.password}</p>
        )}
      </div>

      {/* Forgot Password Link */}
      <div className="text-left">
        <Link 
          to="/forgot-password" 
          className="text-xs text-primary hover:text-primary/80 transition-colors"
        >
          שכחת סיסמה?
        </Link>
      </div>

      {/* Login Button */}
      <Button
        type="submit"
        variant="instagram"
        size="default"
        disabled={loading || !formData.email || !formData.password}
        className="w-full h-10"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "התחברות"}
      </Button>
    </form>
  );
};
