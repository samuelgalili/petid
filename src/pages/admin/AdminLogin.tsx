import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAwsAdminAuth } from "@/hooks/useAwsAdminAuth";
import { MipoApiError } from "@/lib/mipoApi";

type AdminLoginLocationState = {
  from?: string;
};

// Neither is a place to land after signing in. /admin/login would bounce
// straight back, and /admin/change-password is where the route guard sent the
// admin when changing the password revoked their session: returning them there
// asks for the change again, which revokes the new session, which sends them
// back to the login. That is the loop a newly provisioned admin cannot escape.
const NOT_A_DESTINATION = ["/admin/login", "/admin/change-password"];

// Mirrors loginErrorMessage in components/LoginForm.tsx, which the customer
// login already uses. Showing "wrong credentials" for every failure is what
// turns a rate-limit lockout into a loop: the admin retries, each retry
// extends the window, and nothing on screen says that waiting is the answer.
const adminLoginErrorMessage = (error: unknown): string => {
  const status = error instanceof MipoApiError ? error.status : null;

  if (status === 401) return "האימייל או הסיסמה שגויים.";
  if (status === 429) return "בוצעו יותר מדי ניסיונות התחברות. נסו שוב בעוד כמה דקות.";
  if (status === 403) return "לחשבון הזה אין הרשאת ניהול.";
  if (status === 0) return "אין חיבור לשרת. בדקו את החיבור ונסו שוב.";
  if (status !== null && status >= 500) return "שירות ההתחברות אינו זמין כרגע. נסו שוב בעוד כמה דקות.";

  return "אירעה תקלה לא צפויה. נסו שוב.";
};

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, isAdmin, loading, login } = useAwsAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const redirectTo = useMemo(() => {
    const from = (location.state as AdminLoginLocationState | null)?.from;
    return from && !NOT_A_DESTINATION.includes(from) ? from : "/admin/products";
  }, [location.state]);

  useEffect(() => {
    if (!loading && isAdmin) {
      navigate(admin?.must_change_password ? "/admin/change-password" : redirectTo, { replace: true });
    }
  }, [admin?.must_change_password, isAdmin, loading, navigate, redirectTo]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const loggedInAdmin = await login(email, password);
      navigate(loggedInAdmin.must_change_password ? "/admin/change-password" : redirectTo, { replace: true });
    } catch (caught) {
      setError(adminLoginErrorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center px-4 py-8" dir="rtl">
      <Card className="w-full max-w-sm rounded-lg shadow-sm">
        <CardHeader className="space-y-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">כניסת מנהל</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="admin-email">אימייל</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">סיסמה</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              התחברות
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
