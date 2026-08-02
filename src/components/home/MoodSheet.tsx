import { useRef } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
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
  onOpenCharacterStudio?: () => void;
  hasCharacter?: boolean;
  characterWorking?: boolean;
};

/**
 * Mood check-in (design 4a). Replaces the always-visible chip row on the home
 * screen — same chips, same persistence, opened by tapping the pet.
 */
const MoodSheet = ({
  open,
  onOpenChange,
  petName,
  mood,
  onPick,
  onOpenCharacterStudio,
  hasCharacter = false,
  characterWorking = false,
}: MoodSheetProps) => {
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
        {onOpenCharacterStudio && (
          <div className="mt-6 border-t border-mipo-line/60 pt-4">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                window.setTimeout(onOpenCharacterStudio, 180);
              }}
              className="mx-auto flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-mipo-soft px-4 text-sm font-semibold text-mipo-ink transition-colors hover:bg-mipo-line/50"
            >
              {characterWorking ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" strokeWidth={1.7} />}
              {characterWorking
                ? `הדמות של ${petName} נוצרת עכשיו`
                : hasCharacter
                  ? `פתיחת סטודיו הדמות של ${petName}`
                  : `להפוך את ${petName} לדמות דיגיטלית`}
            </button>
            {!hasCharacter && !characterWorking && (
              <p className="mt-2 text-center text-[11px] leading-5 text-mipo-muted">מבוסס על תמונות · אנימציה חלקה ללא וידאו</p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default MoodSheet;
