/**
 * Reminds a signed-in person that their address is not verified yet.
 *
 * It reminds rather than blocks. Ordering does not wait on the mail: a new
 * customer can pay, and the server asks for the code again after the order
 * is stored. The banner stays off onboarding and checkout so it cannot cover
 * those steps.
 */

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MailWarning, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { requestEmailVerification, MipoApiError } from "@/lib/mipoApi";
import { isInProgressFlow } from "@/lib/flowSurfaces";
import { cn } from "@/lib/utils";

export const EmailVerificationBanner = ({ className }: { className?: string }) => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [sending, setSending] = useState(false);

  if (loading || !user || user.email_verified !== false || isInProgressFlow(location.pathname)) return null;

  const resend = async () => {
    setSending(true);
    try {
      const result = await requestEmailVerification();
      toast(result.sent
        ? { title: "המייל נשלח", description: `בדקו את ${user.email}` }
        : { title: "לא הצלחנו לשלוח כרגע", description: "נסו שוב בעוד רגע", variant: "destructive" });
    } catch (error) {
      const status = error instanceof MipoApiError ? error.status : 0;
      toast(status === 429
        ? { title: "כבר שלחנו מייל", description: "המתינו רגע לפני שליחה נוספת" }
        : { title: "השליחה נכשלה", description: "נסו שוב בעוד רגע", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      dir="rtl"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3",
        className,
      )}
      role="status"
    >
      <MailWarning className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={1.7} />
      <p className="flex-1 min-w-[12rem] text-xs leading-relaxed text-amber-900 dark:text-amber-100">
        שלחנו מייל אימות ל־<span className="font-semibold">{user.email}</span>.
        אפשר להזמין גם לפני האימות. כך נשלח עדכונים לכתובת הנכונה.
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={resend}
          disabled={sending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
        >
          {sending && <Loader2 className="h-3 w-3 animate-spin" />}
          שליחה חוזרת
        </button>
        <Link
          to="/verify-email"
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-800 underline underline-offset-2 dark:text-amber-200"
        >
          יש לי קוד
        </Link>
      </div>
    </div>
  );
};
