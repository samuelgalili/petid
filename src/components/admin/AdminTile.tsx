/**
 * The number tile and the status chip, in one place.
 *
 * Both were about to be written a second time. The Command Center has a strip
 * of four numbers and so does the orders screen; the tile was declared inside
 * AdminHome.tsx, which meant the orders copy would have been a copy - and the
 * two would have drifted in padding, in icon size, and eventually in whether a
 * number is a way in or a figure to look at. The four product screens this
 * admin just merged into one are what that drift looks like after a year.
 *
 * Nothing here holds state or fetches anything. They are shapes.
 */

import { type LucideIcon } from "lucide-react";

import { type AdminTone, TONE_CHIP } from "@/lib/adminOrderLabels";
import { cn } from "@/lib/utils";

/**
 * A number, and the way into the rows behind it.
 *
 * `onClick` is optional and the element changes with it: a tile that leads
 * somewhere is a button, and one that does not is a div. A div styled to look
 * pressable is the thing people click three times.
 */
export const AdminTile = ({ label, value, sub, icon: Icon, tone, onClick }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon square — `TONE_CHIP[tone]` fits. */
  tone: string;
  onClick?: () => void;
}) => {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "admin-card flex items-center gap-2.5 p-3 text-right",
        onClick && "admin-card-hover admin-focus",
      )}
    >
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tone)}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="admin-label block truncate">{label}</span>
        <span className="admin-figure block truncate">{value}</span>
        {sub && <span className="admin-meta block truncate">{sub}</span>}
      </span>
    </Tag>
  );
};

/**
 * A state, said in a word.
 *
 * Tone comes from the label maps rather than from the caller, so the same status
 * is the same colour everywhere it appears - which is the only thing that makes
 * a colour readable at a glance rather than decorative.
 */
export const AdminChip = ({ label, tone, icon: Icon, className }: {
  label: string;
  tone: AdminTone;
  icon?: LucideIcon;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
      TONE_CHIP[tone],
      className,
    )}
  >
    {Icon && <Icon className="h-3 w-3" strokeWidth={2} />}
    {label}
  </span>
);
