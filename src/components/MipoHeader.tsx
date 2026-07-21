import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MipoHeaderProps = {
  /** Start side (right in RTL) — icon button / back */
  leading?: ReactNode;
  /** Centered content — logo or title */
  center?: ReactNode;
  /** End side (left in RTL) — actions */
  trailing?: ReactNode;
  className?: string;
};

/**
 * Unified sticky app header. Replaces the hand-rolled headers in MipoHome,
 * MipoFeed, Shop and the separate AppHeader in Documents.
 * Tokens only (F02): flips correctly in dark mode.
 */
const MipoHeader = ({ leading, center, trailing, className }: MipoHeaderProps) => (
  <header
    dir="rtl"
    className={cn(
      "sticky top-0 z-sticky flex min-h-[60px] items-center gap-2 border-b border-mipo-line/60 bg-mipo-surface/85 px-5 py-3 backdrop-blur-xl",
      className,
    )}
  >
    <div className="flex min-w-11 flex-1 items-center justify-start gap-1">{leading}</div>
    <div className="flex min-w-0 shrink-0 items-center justify-center">{center}</div>
    <div className="flex min-w-11 flex-1 items-center justify-end gap-1">{trailing}</div>
  </header>
);

export default MipoHeader;
