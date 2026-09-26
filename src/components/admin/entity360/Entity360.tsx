/**
 * Entity 360 — one record, completely enough to act on it.
 *
 * ─── WHY A PATTERN AND NOT A CUSTOMER SCREEN ────────────────────────────────
 *
 * The brief asks for Customer 360 and then asks for the same thing for orders,
 * products and pets. Built as one handsome screen, the second one is a copy of
 * it that drifts, and by the fourth nobody can say what a 360 IS in this
 * product. Built as a shape - identity, then metrics, then tabs, then a
 * three-column overview - each new entity is a page that fills it in.
 *
 * The shape itself is the argument: a person opening a record asks who or what
 * is this, how much is it worth, what has happened to it, and what can I do
 * about it. In that order. The header answers the first two before any
 * scrolling; the tabs hold the third; the right-hand column holds the fourth,
 * so the actions are reachable from every tab rather than at the bottom of one.
 *
 * ─── RTL IS NOT A MIRROR ────────────────────────────────────────────────────
 *
 * The page is dir="rtl", so a plain grid already puts the first column on the
 * right. What does NOT flip is meaning: the back arrow points right because
 * that is the direction "back" runs in Hebrew, and a phone number stays LTR
 * inside a Hebrew line or its digits reorder around the dash.
 */

import { type ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ── header ─────────────────────────────────────────────────────────────── */

export interface Entity360Metric {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  /** Optional: a metric that is a way in rather than a figure to look at. */
  onClick?: () => void;
}

export interface Entity360Fact {
  icon: LucideIcon;
  value: string;
  /** LTR inside a Hebrew line: phone numbers, emails, ids. */
  ltr?: boolean;
}

export const Entity360Header = ({
  avatar, title, status, statusTone = "neutral", facts, note, metrics, actions,
}: {
  avatar: ReactNode;
  title: string;
  status?: string;
  statusTone?: "neutral" | "good" | "warn" | "bad";
  facts: Entity360Fact[];
  /** One line in the record's own words - a bio, a delivery note, a warning. */
  note?: string | null;
  metrics: Entity360Metric[];
  actions?: ReactNode;
}) => {
  const tone = {
    neutral: "bg-admin-sunk text-admin-ink-muted",
    good: "bg-admin-success-soft text-admin-success",
    warn: "bg-admin-warning-soft text-admin-warning",
    bad: "bg-admin-danger-soft text-admin-danger",
  }[statusTone];

  return (
    <header className="admin-card p-4 lg:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3 lg:gap-4">
          <div className="shrink-0">{avatar}</div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="admin-title truncate">{title}</h1>
              {status && (
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", tone)}>
                  {status}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {facts.map((fact) => (
                <span key={fact.value} className="flex min-w-0 items-center gap-1.5">
                  <fact.icon className="h-3.5 w-3.5 shrink-0 text-admin-ink-subtle" strokeWidth={1.6} />
                  <span
                    className="admin-body truncate text-[13px]"
                    // A phone number or an email inside a Hebrew line reorders
                    // around its punctuation unless it is isolated.
                    dir={fact.ltr ? "ltr" : undefined}
                    style={fact.ltr ? { unicodeBidi: "isolate" } : undefined}
                  >
                    {fact.value}
                  </span>
                </span>
              ))}
            </div>

            {note && <p className="admin-meta line-clamp-2 pt-0.5">{note}</p>}
          </div>
        </div>

        {/* The metrics, beside the identity rather than under it: "who is
            this" and "how much are they worth" are read together. */}
        <div className="grid shrink-0 grid-cols-3 gap-2 lg:w-auto">
          {metrics.map((metric) => {
            const Tag = metric.onClick ? "button" : "div";
            return (
              <Tag
                key={metric.label}
                {...(metric.onClick ? { type: "button" as const, onClick: metric.onClick } : {})}
                className={cn(
                  "admin-well flex min-w-[84px] flex-col items-center justify-center gap-0.5 px-3 py-2",
                  metric.onClick && "admin-focus transition-colors hover:bg-admin-line/40",
                )}
              >
                {metric.icon && (
                  <metric.icon className="h-3.5 w-3.5 text-admin-ink-subtle" strokeWidth={1.6} />
                )}
                <span className="admin-figure text-lg leading-6">{metric.value}</span>
                <span className="admin-meta whitespace-nowrap">{metric.label}</span>
              </Tag>
            );
          })}
        </div>
      </div>

      {actions && <div className="flex flex-wrap gap-2 pt-4">{actions}</div>}
    </header>
  );
};

/* ── tabs ───────────────────────────────────────────────────────────────── */

export interface Entity360Tab {
  key: string;
  label: string;
  /** Shown beside the label. A tab with nothing in it should say so. */
  count?: number;
}

export const Entity360Tabs = ({ tabs, active, onSelect }: {
  tabs: Entity360Tab[];
  active: string;
  onSelect: (key: string) => void;
}) => (
  <div
    role="tablist"
    aria-label="חלקי הכרטיס"
    // Scrolls rather than wraps. Seven tabs do not fit on a phone, and a tab
    // bar that becomes two rows stops reading as one control.
    className="flex items-center gap-1 overflow-x-auto border-b border-admin-line [&::-webkit-scrollbar]:h-0"
  >
    {tabs.map((tab) => {
      const selected = tab.key === active;
      return (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={selected}
          onClick={() => onSelect(tab.key)}
          className={cn(
            "admin-focus -mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] transition-colors",
            selected
              ? "border-admin-accent font-semibold text-admin-accent"
              : "border-transparent text-admin-ink-muted hover:text-admin-ink",
          )}
        >
          {tab.label}
          {typeof tab.count === "number" && (
            <span
              className={cn(
                "admin-meta rounded-full px-1.5 tabular-nums",
                selected ? "bg-admin-accent-soft text-admin-accent" : "bg-admin-sunk",
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

/* ── layout ─────────────────────────────────────────────────────────────── */

/**
 * The overview's three columns: what it is, what happened, what to do.
 *
 * One column on a phone, two at md, three at xl. The ORDER matters on the way
 * down: on a narrow screen the actions come second, not last, because the
 * reason somebody opened a record on their phone is usually to do one of them.
 */
export const Entity360Columns = ({ facts, stream, actions }: {
  facts: ReactNode;
  stream: ReactNode;
  actions: ReactNode;
}) => (
  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,0.9fr)]">
    <div className="order-1 space-y-3">{facts}</div>
    <div className="order-3 space-y-3 xl:order-2">{stream}</div>
    <div className="order-2 space-y-3 xl:order-3">{actions}</div>
  </div>
);

export const Entity360Panel = ({ title, action, children, className }: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={cn("admin-card p-4", className)} aria-label={title}>
    <div className="flex items-center justify-between gap-2 pb-2.5">
      <h2 className="admin-section">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

/* ── the way back, and the way on ───────────────────────────────────────── */

export const Entity360Nav = ({ backLabel, onBack, onPrevious, onNext, previousLabel, nextLabel }: {
  backLabel: string;
  onBack: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  previousLabel: string;
  nextLabel: string;
}) => (
  <div className="flex items-center justify-between gap-2 pb-3">
    <Button variant="outline" size="sm" className="admin-focus gap-1.5" onClick={onBack}>
      {/* Points RIGHT. In Hebrew that is the direction "back" runs, and an
          arrow is one of the few glyphs whose meaning IS its direction. */}
      <ChevronRight className="h-4 w-4" />
      {backLabel}
    </Button>

    {/* Moving between records without returning to the list, which is what
        makes a full-page 360 as quick to triage in as a side panel. */}
    {(onPrevious || onNext) && (
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline" size="sm" className="admin-focus gap-1"
          disabled={!onPrevious} onClick={onPrevious}
        >
          {previousLabel}
        </Button>
        <Button
          variant="outline" size="sm" className="admin-focus gap-1"
          disabled={!onNext} onClick={onNext}
        >
          {nextLabel}
        </Button>
      </div>
    )}
  </div>
);
