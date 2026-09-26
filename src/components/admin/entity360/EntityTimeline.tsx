/**
 * What has happened to this record, in one stream.
 *
 * ─── ONE STREAM, NOT THREE LISTS ────────────────────────────────────────────
 *
 * Orders here, notes there, messages somewhere else is three lists that each
 * answer "what happened" partially, and a person holding the phone has to
 * merge them in their head while talking. Interleaved by time, the same facts
 * become a history of dealing with somebody - "she rang about the delivery,
 * then ordered again two days later" is a sentence the stream tells and three
 * lists cannot.
 *
 * ─── EVERY ENTRY SAYS WHEN, AND WHEN IS RELATIVE ────────────────────────────
 *
 * "לפני שעתיים" is what somebody needs mid-call; the exact stamp is on hover
 * for when it matters. Both, because a relative time alone cannot be quoted
 * back to a customer and an absolute one alone has to be subtracted in your
 * head.
 */

import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface TimelineEntry {
  id: string;
  at: string | null;
  icon: LucideIcon;
  /** What happened, in one line. */
  title: string;
  /** The detail under it - an amount, a status, the note's own text. */
  body?: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "accent";
  /** Where this entry leads, if it leads anywhere. */
  onOpen?: () => void;
  /** Removing an entry that a person wrote, when they may. */
  onRemove?: () => void;
}

const TONES: Record<NonNullable<TimelineEntry["tone"]>, string> = {
  neutral: "bg-admin-sunk text-admin-ink-muted",
  good: "bg-admin-success-soft text-admin-success",
  warn: "bg-admin-warning-soft text-admin-warning",
  bad: "bg-admin-danger-soft text-admin-danger",
  accent: "bg-admin-accent-soft text-admin-accent",
};

/** "לפני 4 שע׳", and "עכשיו" rather than "לפני 0 דק׳". */
export const relativeHe = (iso: string | null) => {
  if (!iso) return "";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 1) return "עכשיו";
  if (minutes < 60) return `לפני ${minutes} דק׳`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `לפני ${hours} שע׳`;
  const days = Math.round(hours / 24);
  if (days < 31) return `לפני ${days} ימים`;
  return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
};

const exactHe = (iso: string | null) => (
  iso
    ? new Date(iso).toLocaleString("he-IL", {
      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    })
    : ""
);

export const EntityTimeline = ({ entries, empty }: {
  entries: TimelineEntry[];
  empty: string;
}) => {
  if (entries.length === 0) {
    return <p className="admin-meta py-6 text-center">{empty}</p>;
  }

  return (
    <ol className="relative space-y-0">
      {/* The rail. Physically RIGHT because the page is RTL and the icons sit
          at the start of each row, which in Hebrew is the right-hand edge. */}
      <span
        className="absolute bottom-3 right-[15px] top-3 w-px bg-admin-line"
        aria-hidden
      />

      {entries.map((entry) => {
        const Icon = entry.icon;
        const Body = entry.onOpen ? "button" : "div";

        return (
          <li key={entry.id} className="relative flex gap-3 py-2.5">
            <span
              className={cn(
                "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-admin-surface",
                TONES[entry.tone ?? "neutral"],
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>

            <Body
              {...(entry.onOpen ? { type: "button" as const, onClick: entry.onOpen } : {})}
              className={cn(
                "min-w-0 flex-1 rounded-lg px-2 py-1 text-right",
                entry.onOpen && "admin-focus transition-colors hover:bg-admin-sunk",
              )}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-medium text-admin-ink">{entry.title}</span>
                <span className="admin-meta shrink-0" title={exactHe(entry.at)}>
                  {relativeHe(entry.at)}
                </span>
              </span>
              {entry.body && <span className="admin-meta mt-0.5 block">{entry.body}</span>}
            </Body>

            {entry.onRemove && (
              <button
                type="button"
                onClick={entry.onRemove}
                className="admin-focus shrink-0 self-start rounded p-1 text-admin-ink-subtle transition-colors hover:text-admin-danger"
                aria-label={`מחיקה: ${entry.title}`}
              >
                <span aria-hidden>×</span>
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
};
