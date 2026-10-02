import { FormEvent, useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAdminStepUpPrompt } from "@/lib/adminStepUp";
import { verifyAdminTwoFactor } from "@/lib/mipoApi";

/**
 * Shown only when a sensitive admin action asks for a recent code.
 * A plain overlay, not a second dialog: the action that triggered it is
 * often already inside one, and two dialogs fight over focus.
 */
export const AdminStepUpHost = () => {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const finish = (ok: boolean) => {
    setOpen(false);
    setSubmitting(false);
    const resolve = resolver.current;
    resolver.current = null;
    resolve?.(ok);
  };

  useEffect(() => {
    registerAdminStepUpPrompt(() => new Promise((resolve) => {
      resolver.current?.(false);
      resolver.current = resolve;
      setCode("");
      setError("");
      setSubmitting(false);
      setOpen(true);
    }));
    return () => {
      registerAdminStepUpPrompt(null);
      resolver.current?.(false);
      resolver.current = null;
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !code.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await verifyAdminTwoFactor(code.trim());
      finish(true);
    } catch {
      setError("הקוד אינו תקין");
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 px-4"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-step-up-title"
    >
      <form
        className="w-full max-w-sm space-y-4 rounded-lg bg-background p-6 shadow-lg"
        onSubmit={submit}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 id="admin-step-up-title" className="text-lg font-semibold">אימות מחדש</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          הפעולה הזו דורשת קוד אימות עדכני. יש להזין את הקוד מאפליקציית האימות, או קוד שחזור.
        </p>
        <div className="space-y-2">
          <Label htmlFor="admin-step-up-code">קוד אימות</Label>
          <Input
            id="admin-step-up-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="one-time-code"
            autoFocus
            disabled={submitting}
          />
        </div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={submitting || !code.trim()}>
            אישור
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={() => finish(false)} disabled={submitting}>
            ביטול
          </Button>
        </div>
      </form>
    </div>
  );
};
