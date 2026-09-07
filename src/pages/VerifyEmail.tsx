/**
 * Where the verification link lands, and where a code can be typed instead.
 *
 * Unauthenticated on purpose: mail is often read on a different device from
 * the one that registered, and asking someone to sign in before they can
 * verify is how a verification link goes unclicked.
 */

import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTransition } from "@/components/PageTransition";
import { confirmEmailVerification, MipoApiError } from "@/lib/mipoApi";

const errorMessage = (error: unknown): string => {
  const status = error instanceof MipoApiError ? error.status : null;
  if (status === 429) return "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.";
  if (status === 400) return "הקוד שגוי או שפג תוקפו. אפשר לבקש קוד חדש.";
  if (status === 0) return "אין חיבור לשרת. בדקו את החיבור ונסו שוב.";
  if (status !== null && status >= 500) return "השירות אינו זמין כרגע. נסו שוב בעוד רגע.";
  return "אירעה תקלה לא צפויה. נסו שוב.";
};

const VerifyEmail = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(params.get("email") || "");
  const [otp, setOtp] = useState(params.get("otp") || "");
  const [status, setStatus] = useState<"idle" | "working" | "done">("idle");
  const [error, setError] = useState("");
  const autoSubmitted = useRef(false);

  const submit = async (submitEmail: string, submitOtp: string) => {
    setError("");
    setStatus("working");
    try {
      await confirmEmailVerification(submitEmail.trim(), submitOtp.trim());
      setStatus("done");
      // Long enough to read the confirmation, short enough not to feel stuck.
      setTimeout(() => navigate("/", { replace: true }), 2200);
    } catch (caught) {
      setError(errorMessage(caught));
      setStatus("idle");
    }
  };

  // Arriving from the link carries both halves, so finish without a tap.
  useEffect(() => {
    const linkEmail = params.get("email");
    const linkOtp = params.get("otp");
    if (autoSubmitted.current || !linkEmail || !linkOtp) return;
    autoSubmitted.current = true;
    void submit(linkEmail, linkOtp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit(email, otp);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-muted/20 flex items-center justify-center px-4 py-8" dir="rtl">
        <Card className="w-full max-w-sm rounded-2xl shadow-sm">
          <CardHeader className="space-y-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              {status === "done"
                ? <CheckCircle2 className="h-5 w-5" />
                : <MailCheck className="h-5 w-5" />}
            </div>
            <CardTitle className="text-xl">
              {status === "done" ? "הכתובת אומתה" : "אימות כתובת המייל"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {status === "done" ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  הכל מוכן. מעבירים אתכם לאפליקציה.
                </p>
                <Button className="w-full" onClick={() => navigate("/", { replace: true })}>
                  להמשיך עכשיו
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <p className="text-sm text-muted-foreground">
                  הזינו את הקוד בן שש הספרות ששלחנו במייל.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="verify-email">אימייל</Label>
                  <Input
                    id="verify-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    dir="ltr"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verify-otp">קוד אימות</Label>
                  <Input
                    id="verify-otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                    dir="ltr"
                    className="text-center tracking-[0.4em] text-lg"
                    required
                  />
                </div>

                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

                <Button type="submit" className="w-full" disabled={status === "working" || otp.length !== 6}>
                  {status === "working" && <Loader2 className="h-4 w-4 animate-spin" />}
                  אימות
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  לא קיבלתם? אפשר לבקש קוד חדש מהבאנר{" "}
                  <Link to="/" className="text-primary underline underline-offset-2">באפליקציה</Link>.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default VerifyEmail;
