import { useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const MOODS = [
  { emoji: "🥰", label: "שמחה" },
  { emoji: "😌", label: "רגועה" },
  { emoji: "🤪", label: "שובבה" },
  { emoji: "😴", label: "עייפה" },
] as const;

type MoodSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petName: string;
  mood: string | null;
  onPick: (label: string) => void;
};

/**
 * Mood check-in (design 4a). Replaces the always-visible chip row on the home
 * screen — same chips, same persistence, opened by tapping the pet.
 */
const MoodSheet = ({ open, onOpenChange, petName, mood, onPick }: MoodSheetProps) => {
  const returnFocusRef = useRef<HTMLElement | null>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        dir="rtl"
        className="rounded-t-[1.5rem] border-mipo-line/60 bg-mipo-surface pb-8"
        onOpenAutoFocus={() => {
          returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
        <SheetHeader>
          <SheetTitle className="text-center text-lg font-semibold text-mipo-ink">
            איך {petName} מרגיש היום?
          </SheetTitle>
        </SheetHeader>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {MOODS.map((m) => (
            <button
              key={m.label}
              onClick={() => {
                onPick(m.label);
                onOpenChange(false);
              }}
              aria-pressed={mood === m.label}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium shadow-sm transition-colors duration-150 active:scale-95",
                mood === m.label
                  ? "border-mipo-ink bg-mipo-ink text-mipo-surface"
                  : "border-mipo-line/70 bg-mipo-surface text-mipo-ink",
              )}
            >
              <span aria-hidden="true">{m.emoji}</span>
              {m.label}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MoodSheet;
