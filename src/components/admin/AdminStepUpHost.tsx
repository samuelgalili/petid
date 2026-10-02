import { FormEvent, useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAdminStepUpPrompt } from "@/lib/adminStepUp";
import { verifyAdminTwoFactor } from "@/lib/mipoApi";

/**
 * Shown only when a sensitive admin action asks for a recent code.
 *
 * This has to be a dialog of its own. The action that triggers it is often
 * already inside one, and that dialog hides every other node (aria-hidden)
 * and turns pointer events off on the page. A plain overlay rendered beside
 * it never reaches the person at the keyboard, and the action waits forever.
 * A second dialog is appended on top and stays usable.
 */
export const AdminStepUpHost = () => {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const finish = (ok: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setOpen(false);
    setSubmitting(false);
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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) finish(false);
      }}
    >
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader className="text-right">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <DialogTitle>אימות מחדש</DialogTitle>
          </div>
          <DialogDescription>
            הפעולה הזו דורשת קוד אימות עדכני. יש להזין את הקוד מאפליקציית האימות, או קוד שחזור.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
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
      </DialogContent>
    </Dialog>
  );
};
