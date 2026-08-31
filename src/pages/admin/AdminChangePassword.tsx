import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAwsAdminAuth } from "@/hooks/useAwsAdminAuth";

const AdminChangePassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { admin, loading: adminLoading, updatePassword } = useAwsAdminAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Nothing links here voluntarily: the screen exists for the forced change
  // after provisioning. An admin who no longer owes one has already done it,
  // so asking again would revoke the session they just earned.
  useEffect(() => {
    if (!adminLoading && admin && !admin.must_change_password) {
      navigate("/admin/products", { replace: true });
    }
  }, [admin, adminLoading, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password.length < 12) {
      setError("הסיסמה חייבת להכיל לפחות 12 תווים");
      return;
    }
    if (password !== confirmation) {
      setError("הסיסמאות אינן תואמות");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      toast({ title: "הסיסמה עודכנה", description: "יש להתחבר מחדש עם הסיסמה החדשה" });
      navigate("/admin/login", { replace: true });
    } catch (changeError: any) {
      setError(changeError.message || "עדכון הסיסמה נכשל");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center px-4 py-8" dir="rtl">
      <Card className="w-full max-w-sm rounded-lg shadow-sm">
        <CardHeader className="space-y-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <KeyRound className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">בחירת סיסמת ניהול</CardTitle>
          <p className="text-sm text-muted-foreground">יש לבחור סיסמה קבועה בת 12 תווים לפחות.</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="new-admin-password">סיסמה חדשה</Label>
              <Input
                id="new-admin-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={12}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-admin-password">אימות סיסמה</Label>
              <Input
                id="confirm-admin-password"
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                minLength={12}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              שמירת סיסמה
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminChangePassword;
