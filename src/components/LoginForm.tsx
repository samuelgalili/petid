import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().min(1, "נדרש אימייל").email("כתובת אימייל לא תקינה"),
  password: z.string().min(6, "הסיסמה חייבת להכיל לפחות 6 תווים"),
});

interface FieldError {
  email?: string;
  password?: string;
}

interface LoginError {
  message: string;
  showPasswordReset: boolean;
}

const loginErrorMessage = (error: { message: string; status: number }): LoginError => {
  if (error.status === 401 || /invalid (email or password|credentials)/i.test(error.message)) {
    return {
      message: "האימייל או הסיסמה שגויים.",
      showPasswordReset: true,
    };
  }

  if (error.status === 429) {
    return {
      message: "בוצעו יותר מדי ניסיונות התחברות. נסו שוב בעוד כמה דקות.",
      showPasswordReset: false,
    };
  }

  if (error.status >= 500) {
    return {
      message: "שירות ההתחברות אינו זמין כרגע. נסו שוב בעוד כמה דקות.",
      showPasswordReset: false,
    };
  }

  if (error.status === 0) {
    return {
      message: "לא ניתן להתחבר לשירות. בדקו את החיבור לאינטרנט ונסו שוב.",
      showPasswordReset: false,
    };
  }

  return {
    message: "לא הצלחנו להתחבר. בדקו את הפרטים ונסו שוב.",
    showPasswordReset: false,
  };
};

export const LoginForm = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [loginError, setLoginError] = useState<LoginError | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const validateForm = (): boolean => {
    const result = loginSchema.safeParse(formData);
    if (result.success) {
      setFieldErrors({});
      setLoginError(null);
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
    setLoginError(null);
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await signIn(formData.email, formData.password, rememberMe);

      if (error) {
        const displayError = loginErrorMessage(error);
        setLoginError(displayError);
        toast({ title: "שגיאה בהתחברות", description: displayError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      toast({ title: "התחברת בהצלחה!", description: "ברוכים השבים!" });
      navigate("/");
    } catch {
      setLoginError({
        message: "אירעה תקלה לא צפויה. נסו שוב.",
        showPasswordReset: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <AnimatePresence mode="wait">
        {loginError && (
          <motion.div
            key="error"
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg text-center"
          >
            <p>{loginError.message}</p>
            {loginError.showPasswordReset && (
              <Link
                to="/forgot-password"
                className="mt-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
              >
                שכחת סיסמה? לאיפוס הסיסמה
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Input */}
      <div>
        <div className="relative">
          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="login-email"
            type="email"
            placeholder="אימייל"
            aria-label="אימייל"
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              setFieldErrors({ ...fieldErrors, email: undefined });
            }}
            disabled={loading}
            className={`h-11 bg-muted/50 border border-border rounded-lg text-sm pr-10 text-right transition-colors ${
              fieldErrors.email ? "border-destructive" : ""
            }`}
            autoComplete="email"
            dir="rtl"
          />
        </div>
        <AnimatePresence>
          {fieldErrors.email && (
            <motion.p
              id="login-email-error"
              role="alert"
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
            id="login-password"
            type={showPassword ? "text" : "password"}
            placeholder="סיסמה"
            aria-label="סיסמה"
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              setFieldErrors({ ...fieldErrors, password: undefined });
            }}
            disabled={loading}
            className={`h-11 bg-muted/50 border border-border rounded-lg text-sm pr-10 pl-14 text-right transition-colors ${
              fieldErrors.password ? "border-destructive" : ""
            }`}
            autoComplete="current-password"
            dir="rtl"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <AnimatePresence>
          {fieldErrors.password && (
            <motion.p
              id="login-password-error"
              role="alert"
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
      <div className="flex min-h-11 items-center justify-between gap-3">
        <Label htmlFor="remember-me" className="flex cursor-pointer items-center gap-2 text-xs font-normal">
          <Checkbox
            id="remember-me"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
          />
          זכור אותי במכשיר הזה
        </Label>
        <Link
          to="/forgot-password"
          className="inline-flex min-h-11 items-center text-xs text-primary transition-colors hover:text-primary/80"
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
        className="w-full h-11"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "התחברות"}
      </Button>
    </form>
  );
};
