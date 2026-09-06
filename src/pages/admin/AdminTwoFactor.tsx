import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Loader2, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAwsAdminAuth } from "@/hooks/useAwsAdminAuth";
import { startAdminTwoFactorSetup, type MipoAdminTwoFactorSetup } from "@/lib/mipoApi";

const PANEL_HOME = "/admin/products";

const AdminTwoFactor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    admin,
    loading: adminLoading,
    needsTwoFactor,
    activateTwoFactor,
    verifyTwoFactor,
    logout,
  } = useAwsAdminAuth();

  const [setup, setSetup] = useState<MipoAdminTwoFactorSetup | null>(null);
  const [setupError, setSetupError] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  // What this screen is for is decided once, from the state the admin arrived
  // in. Re-deriving it from the live session would flip the screen out from
  // under the admin the instant enrolment succeeds — which is exactly when the
  // recovery codes are on it and have nowhere else to be shown.
  const [stage, setStage] = useState<"loading" | "enrol" | "verify">("loading");
  const stageRef = useRef(stage);
  stageRef.current = stage;

  const isEnrolling = stage === "enrol";

  useEffect(() => {
    if (adminLoading || !admin || stageRef.current !== "loading") return;
    if (!needsTwoFactor) {
      // A verified session has no business here.
      navigate(PANEL_HOME, { replace: true });
      return;
    }
    setStage(admin.mfa_enrolled ? "verify" : "enrol");
  }, [admin, adminLoading, navigate, needsTwoFactor]);

  useEffect(() => {
    if (!isEnrolling || setup) return;
    let cancelled = false;

    startAdminTwoFactorSetup()
      .then((result) => {
        if (!cancelled) setSetup(result);
      })
      .catch((setupFailure: Error) => {
        if (!cancelled) setSetupError(setupFailure.message || "לא ניתן להתחיל את הרישום כרגע");
      });

    return () => {
      cancelled = true;
    };
  }, [isEnrolling, setup]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (isEnrolling) {
        setRecoveryCodes(await activateTwoFactor(code));
      } else {
        const result = await verifyTwoFactor(code);
        if (result.used_recovery_code) {
          toast({
            title: "נכנסת עם קוד שחזור",
            description: `נותרו ${result.recovery_codes_remaining} קודי שחזור. מומלץ להנפיק חדשים.`,
          });
        }
        navigate(PANEL_HOME, { replace: true });
      }
    } catch (verificationError) {
      setError((verificationError as Error).message || "הקוד אינו תקין");
      setCode("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = useCallback(async () => {
    await logout().catch(() => undefined);
    navigate("/admin/login", { replace: true });
  }, [logout, navigate]);

  const copyRecoveryCodes = useCallback(async () => {
    if (!recoveryCodes) return;
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      toast({ title: "הקודים הועתקו" });
    } catch {
      toast({ title: "ההעתקה נכשלה", description: "יש להעתיק את הקודים ידנית", variant: "destructive" });
    }
  }, [recoveryCodes, toast]);

  const manualSecret = useMemo(
    () => (setup ? setup.secret.replace(/(.{4})/g, "$1 ").trim() : ""),
    [setup],
  );

  if (adminLoading || !admin || (stage === "loading" && !recoveryCodes)) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Shown once, immediately after enrolment. The server stores only hashes, so
  // there is no second chance to read them.
  if (recoveryCodes) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center px-4 py-8" dir="rtl">
        <Card className="w-full max-w-md rounded-lg shadow-sm">
          <CardHeader className="space-y-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <CardTitle className="text-xl">קודי שחזור</CardTitle>
            <p className="text-sm text-muted-foreground">
              יש לשמור את הקודים במקום בטוח. כל קוד תקף לשימוש אחד בלבד, והם מוצגים רק עכשיו.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-4 font-mono text-sm" dir="ltr">
              {recoveryCodes.map((recoveryCode) => (
                <li key={recoveryCode}>{recoveryCode}</li>
              ))}
            </ul>
            <Button type="button" variant="outline" className="w-full" onClick={copyRecoveryCodes}>
              <Copy className="h-4 w-4" />
              העתקת הקודים
            </Button>
            <Button type="button" className="w-full" onClick={() => navigate(PANEL_HOME, { replace: true })}>
              שמרתי אותם, המשך לפאנל
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center px-4 py-8" dir="rtl">
      <Card className="w-full max-w-md rounded-lg shadow-sm">
        <CardHeader className="space-y-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            {isEnrolling ? <ShieldQuestion className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </div>
          <CardTitle className="text-xl">
            {isEnrolling ? "הפעלת אימות דו-שלבי" : "אימות דו-שלבי"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isEnrolling
              ? "אימות דו-שלבי הוא חובה לכל מנהל. יש לסרוק את הקוד באפליקציית אימות ולהזין את הקוד שמופיע בה."
              : "יש להזין את הקוד מאפליקציית האימות, או קוד שחזור."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEnrolling && (
            <div className="space-y-3">
              {setupError && <p className="text-sm text-destructive" role="alert">{setupError}</p>}
              {!setup && !setupError && (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              {setup && (
                <>
                  <div className="flex justify-center rounded-lg border bg-white p-4">
                    <QRCodeSVG value={setup.otpauth_url} size={176} level="M" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">להזנה ידנית</Label>
                    <p
                      className="rounded-lg border bg-muted/40 px-3 py-2 font-mono text-sm tracking-wide break-all"
                      dir="ltr"
                    >
                      {manualSecret}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="admin-mfa-code">קוד אימות</Label>
              <Input
                id="admin-mfa-code"
                name="code"
                inputMode={isEnrolling ? "numeric" : "text"}
                autoComplete="one-time-code"
                autoFocus
                dir="ltr"
                className="text-center font-mono tracking-[0.3em]"
                placeholder={isEnrolling ? "000000" : "000000"}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                disabled={isEnrolling && !setup}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting || (isEnrolling && !setup)}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEnrolling ? "הפעלה" : "אימות"}
            </Button>
          </form>

          {/* Without this the only way off this screen is to clear cookies:
              the panel chrome, and its sign-out, is on the other side of it. */}
          <Button type="button" variant="ghost" className="w-full" onClick={handleSignOut}>
            התחברות עם חשבון אחר
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTwoFactor;
