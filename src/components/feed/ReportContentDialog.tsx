import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, X } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createContentReport, MipoApiError } from "@/lib/mipoApi";
import { cn } from "@/lib/utils";

const REPORT_REASONS = [
  { id: "spam", label: "ספאם או פרסומת" },
  { id: "harassment", label: "הטרדה או פגיעה" },
  { id: "inappropriate", label: "תוכן לא הולם" },
  { id: "person", label: "אדם או ילד בתמונה" },
  { id: "other", label: "משהו אחר" },
] as const;

type ReportReasonId = (typeof REPORT_REASONS)[number]["id"];

const PRIMARY = "#6C63FF";

const failureMessage = (error: unknown) => {
  if (error instanceof MipoApiError) {
    if (error.status === 401) return "כדי לשלוח דיווח צריך להיות מחוברים.";
    if (error.status === 404) return "התוכן כבר לא זמין.";
    if (error.status === 429) return "אפשר לשלוח דיווח נוסף מאוחר יותר.";
  }
  return "לא הצלחנו לשלוח את הדיווח. נסו שוב.";
};

export const ContentOptionsButton = ({
  label,
  onReport,
  className,
}: {
  label: string;
  onReport: () => void;
  className?: string;
}) => (
  <DropdownMenu dir="rtl">
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        aria-label={label}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full",
          className,
        )}
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="z-[13000] min-w-[10rem]">
      <DropdownMenuItem className="min-h-11" onSelect={onReport}>
        דיווח
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export const ReportContentDialog = ({
  open,
  contentType,
  contentId,
  onClose,
}: {
  open: boolean;
  contentType: "post" | "comment";
  contentId: string;
  onClose: () => void;
}) => {
  const [reason, setReason] = useState<ReportReasonId | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [ack, setAck] = useState<"new" | "duplicate" | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason(null);
    setNote("");
    setSending(false);
    setError("");
    setAck(null);
  }, [open, contentId, contentType]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const title = contentType === "post" ? "דיווח על רגע" : "דיווח על תגובה";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason || sending) return;
    try {
      setSending(true);
      setError("");
      const result = await createContentReport({
        content_type: contentType,
        content_id: contentId,
        reason,
        description: note.trim() || undefined,
      });
      setAck(result.duplicate ? "duplicate" : "new");
    } catch (caught) {
      setError(failureMessage(caught));
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[14000] flex items-end justify-center bg-black/50 sm:items-center"
      dir="rtl"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="content-report-title"
        className="w-full max-w-lg rounded-t-[2rem] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-[2rem]"
      >
        <div className="flex items-center justify-between">
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full" aria-label="סגירה">
            <X className="h-5 w-5" />
          </button>
          <h2 id="content-report-title" className="text-lg font-semibold text-mipo-ink">{title}</h2>
          <span className="w-11" />
        </div>

        {ack ? (
          <div className="mt-6 text-center" data-testid="report-ack">
            <p className="text-lg font-semibold text-mipo-ink">
              {ack === "duplicate" ? "הדיווח כבר התקבל" : "תודה על הדיווח"}
            </p>
            <p className="mt-2 text-sm leading-6 text-mipo-muted">
              {ack === "duplicate"
                ? "כבר קיבלנו דיווח מכם על התוכן הזה. תודה."
                : "קיבלנו את הדיווח ונבדוק אותו."}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 flex min-h-12 w-full items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              סגירה
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4">
            <p className="text-sm text-mipo-muted">בחרו סיבה. ההערה לא חובה.</p>
            <div className="mt-3 space-y-2">
              {REPORT_REASONS.map((option) => {
                const selected = reason === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setReason(option.id)}
                    className={cn(
                      "min-h-11 w-full rounded-2xl border px-4 text-right text-sm",
                      selected ? "border-transparent text-white" : "border-black/10 text-mipo-ink",
                    )}
                    style={selected ? { backgroundColor: PRIMARY } : undefined}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <label className="mt-4 block text-sm text-mipo-ink">
              הערה (לא חובה)
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                rows={3}
                className="mt-1 w-full resize-none rounded-2xl border border-black/10 px-3 py-2 text-sm outline-none"
              />
            </label>
            {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={!reason || sending}
              className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full text-sm font-bold text-white disabled:opacity-40"
              style={{ backgroundColor: PRIMARY }}
            >
              {sending ? "שולחים…" : "שליחת דיווח"}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
};
