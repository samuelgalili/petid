import { FormEvent, useEffect, useRef, useState } from "react";
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

// The menu item that opens the dialog unmounts as the menu closes, so the
// button that should receive focus again is the ⋯ trigger, captured here.
let reportDialogOpener: HTMLElement | null = null;

const rememberReportDialogOpener = (node: HTMLElement | null) => {
  reportDialogOpener = node;
};

const takeReportDialogOpener = () => {
  const node = reportDialogOpener;
  reportDialogOpener = null;
  return node?.isConnected ? node : null;
};

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

const focusableElements = (root: HTMLElement) => (
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => (
    !element.hasAttribute("disabled") && element.tabIndex >= 0
  ))
);

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
}) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reportingRef = useRef(false);
  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <button
          ref={triggerRef}
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
      <DropdownMenuContent
        align="end"
        className="z-[13000] min-w-[10rem]"
        onCloseAutoFocus={(event) => {
          if (!reportingRef.current) return;
          reportingRef.current = false;
          event.preventDefault();
        }}
      >
        <DropdownMenuItem
          className="min-h-11"
          onSelect={() => {
            reportingRef.current = true;
            rememberReportDialogOpener(triggerRef.current);
            onReport();
          }}
        >
          דיווח
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setReason(null);
    setNote("");
    setSending(false);
    setError("");
    setAck(null);
  }, [open, contentId, contentType]);

  useEffect(() => {
    if (!open) {
      const opener = openerRef.current;
      openerRef.current = null;
      if (opener?.isConnected) opener.focus();
      return;
    }
    if (!openerRef.current) {
      const remembered = takeReportDialogOpener();
      const active = document.activeElement;
      const dialog = dialogRef.current;
      openerRef.current = remembered
        ?? (
          active instanceof HTMLElement
          && active.isConnected
          && active !== document.body
          && !dialog?.contains(active)
            ? active
            : null
        );
    }
    const moveFocusInside = () => {
      const dialog = dialogRef.current;
      if (!dialog?.isConnected) return;
      if (dialog.contains(document.activeElement)) return;
      const closeButton = closeButtonRef.current;
      (closeButton?.isConnected ? closeButton : dialog).focus();
    };
    moveFocusInside();
    const frame = window.requestAnimationFrame(moveFocusInside);
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = focusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && dialog.contains(active);
      if (event.shiftKey) {
        if (!inside || active === first) {
          event.preventDefault();
          last.focus();
        }
        return;
      }
      if (!inside || active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="content-report-title"
        tabIndex={-1}
        className="w-full max-w-lg rounded-t-[2rem] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] outline-none sm:rounded-[2rem]"
      >
        <div className="flex items-center justify-between">
          <button ref={closeButtonRef} type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full" aria-label="סגירה">
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
