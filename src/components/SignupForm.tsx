import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, differenceInYears } from "date-fns";
import { CalendarIcon, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const validateAge = (birthdate: Date): boolean => differenceInYears(new Date(), birthdate) >= 13;

const signupSchema = z.object({
  fullName: z.string().min(2, "השם חייב להכיל לפחות 2 תווים").max(100).trim(),
  email: z.string().min(1, "אימייל נדרש").email("אימייל לא תקין"),
  password: z.string().min(8, "הסיסמה חייבת להכיל לפחות 8 תווים"),
  confirmPassword: z.string().min(1, "יש לאשר את הסיסמה"),
  birthdate: z.date({ message: "תאריך לידה נדרש" }).refine(validateAge, {
    message: "חובה להיות מעל גיל 13 לשימוש באפליקציה",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "הסיסמאות אינן תואמות",
  path: ["confirmPassword"],
});

interface FieldError {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  birthdate?: string;
}

export const SignupForm = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [birthdate, setBirthdate] = useState<Date | undefined>(undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const todayInputValue = format(new Date(), "yyyy-MM-dd");
  const birthdateInputValue = birthdate ? format(birthdate, "yyyy-MM-dd") : "";

  const validateForm = (): boolean => {
    const result = signupSchema.safeParse({ ...formData, birthdate });
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
    if (!validateForm() || !birthdate) return;

    setLoading(true);
    try {
      const { error } = await signUp({
        full_name: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        birthdate: birthdate.toISOString().split("T")[0],
      });

      if (error) {
        const message = error.message.includes("Email already exists")
          ? "כבר קיים חשבון עם האימייל הזה"
          : error.message;
        setGeneralError(message);
        toast({ title: "שגיאה בהרשמה", description: message, variant: "destructive" });
        return;
      }

      localStorage.removeItem("onboardingCompleted");
      toast({ title: "החשבון נוצר!", description: "ברוכים הבאים ל-MIPO!" });
      navigate("/onboarding");
    } catch {
      setGeneralError("אירעה שגיאה לא צפויה");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.fullName && formData.email && formData.password && formData.confirmPassword && birthdate;

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      {generalError && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg text-center">
          {generalError}
        </div>
      )}

      <div>
        <div className="relative">
          <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="שם מלא"
            value={formData.fullName}
            onChange={(e) => {
              setFormData({ ...formData, fullName: e.target.value });
              setFieldErrors({ ...fieldErrors, fullName: undefined });
            }}
            disabled={loading}
            className={`h-11 bg-muted/50 border border-border rounded-lg text-sm pr-10 text-right ${
              fieldErrors.fullName ? "border-destructive" : ""
            }`}
            autoComplete="name"
            dir="rtl"
          />
        </div>
        {fieldErrors.fullName && <p className="text-xs text-destructive mt-1 text-right">{fieldErrors.fullName}</p>}
      </div>

      <div>
        <div className="relative">
          <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            aria-label="תאריך לידה"
            value={birthdateInputValue}
            min="1920-01-01"
            max={todayInputValue}
            onChange={(e) => {
              const nextDate = e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined;
              setBirthdate(nextDate);
              setFieldErrors({ ...fieldErrors, birthdate: undefined });
            }}
            disabled={loading}
            className={`h-11 bg-muted/50 border border-border rounded-lg text-sm pr-10 text-right ${
              fieldErrors.birthdate ? "border-destructive" : ""
            }`}
            dir="rtl"
          />
        </div>
        {fieldErrors.birthdate && <p className="text-xs text-destructive mt-1 text-right">{fieldErrors.birthdate}</p>}
      </div>

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
            className={`h-11 bg-muted/50 border border-border rounded-lg text-sm pr-10 text-right ${
              fieldErrors.email ? "border-destructive" : ""
            }`}
            autoComplete="email"
            dir="rtl"
          />
        </div>
        {fieldErrors.email && <p className="text-xs text-destructive mt-1 text-right">{fieldErrors.email}</p>}
      </div>

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
            className={`h-11 bg-muted/50 border border-border rounded-lg text-sm pr-10 pl-14 text-right ${
              fieldErrors.password ? "border-destructive" : ""
            }`}
            autoComplete="new-password"
            dir="rtl"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            tabIndex={-1}
            aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {fieldErrors.password && <p className="text-xs text-destructive mt-1 text-right">{fieldErrors.password}</p>}
      </div>

      <div>
        <div className="relative">
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="אימות סיסמה"
            value={formData.confirmPassword}
            onChange={(e) => {
              setFormData({ ...formData, confirmPassword: e.target.value });
              setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
            }}
            disabled={loading}
            className={`h-11 bg-muted/50 border border-border rounded-lg text-sm pr-10 text-right ${
              fieldErrors.confirmPassword ? "border-destructive" : ""
            }`}
            autoComplete="new-password"
            dir="rtl"
          />
        </div>
        {fieldErrors.confirmPassword && <p className="text-xs text-destructive mt-1 text-right">{fieldErrors.confirmPassword}</p>}
      </div>

      <Button
        type="submit"
        variant="instagram"
        size="default"
        disabled={loading || !isFormValid}
        className="w-full h-11"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "הרשמה"}
      </Button>

      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        בהרשמה, אתה מסכים ל{" "}
        <a href="/terms" className="inline-flex min-h-11 items-center text-primary">תנאי שימוש</a>,{" "}
        <a href="/privacy-policy" className="inline-flex min-h-11 items-center text-primary">מדיניות פרטיות</a> ו{" "}
        <a href="/privacy-policy" className="inline-flex min-h-11 items-center text-primary">מדיניות עוגיות</a>.
      </p>
    </form>
  );
};
