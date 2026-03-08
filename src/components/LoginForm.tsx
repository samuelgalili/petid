import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [generalError, setGeneralError] = useState("");
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
      if (field) errors[field] = issue.message;
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
      <AnimatePresence mode="wait">
        {generalError && (
          <motion.div
            key="error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg text-center"
          >
            {generalError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Input */}
      <div>
        <div className="relative">
          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="email"
            placeholder="אימייל"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              setFieldErrors({ ...fieldErrors, email: undefined });
            }}
            disabled={loading}
            className={`h-10 bg-muted/50 border border-border rounded-lg text-sm pr-10 text-right transition-colors ${
              fieldErrors.email ? "border-destructive" : ""
            }`}
            autoComplete="email"
            dir="rtl"
          />
        </div>
        <AnimatePresence>
          {fieldErrors.email && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs text-destructive mt-1 text-right"
            >
              {fieldErrors.email}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Password Input */}
      <div>
        <div className="relative">
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="סיסמה"
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              setFieldErrors({ ...fieldErrors, password: undefined });
            }}
            disabled={loading}
            className={`h-10 bg-muted/50 border border-border rounded-lg text-sm pr-10 pl-10 text-right transition-colors ${
              fieldErrors.password ? "border-destructive" : ""
            }`}
            autoComplete="current-password"
            dir="rtl"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <AnimatePresence>
          {fieldErrors.password && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs text-destructive mt-1 text-right"
            >
              {fieldErrors.password}
            </motion.p>
          )}
        </AnimatePresence>
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
