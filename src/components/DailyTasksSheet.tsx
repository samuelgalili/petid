import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Footprints, UtensilsCrossed, GlassWater, Sparkles, Brush, HeartPulse } from "lucide-react";
import { usePetPreference } from "@/contexts/PetPreferenceContext";

type DailyTaskKey =
  | "walk_morning" | "walk_evening" | "feed_morning" | "feed_evening"
  | "water" | "health_check" | "grooming" | "play";

const DAILY_TASKS: { key: DailyTaskKey; label: string; icon: typeof Footprints; color: string }[] = [
  { key: "walk_morning", label: "הליכת בוקר", icon: Footprints, color: "hsl(30 80% 55%)" },
  { key: "feed_morning", label: "ארוחת בוקר", icon: UtensilsCrossed, color: "hsl(8 78% 60%)" },
  { key: "water", label: "מים נקיים", icon: GlassWater, color: "hsl(200 70% 55%)" },
  { key: "play", label: "משחק", icon: Sparkles, color: "hsl(45 90% 55%)" },
  { key: "walk_evening", label: "הליכת ערב", icon: Footprints, color: "hsl(260 60% 60%)" },
  { key: "feed_evening", label: "ארוחת ערב", icon: UtensilsCrossed, color: "hsl(8 78% 60%)" },
  { key: "grooming", label: "טיפוח / מברשת", icon: Brush, color: "hsl(280 60% 60%)" },
  { key: "health_check", label: "בדיקת בריאות", icon: HeartPulse, color: "hsl(0 70% 60%)" },
];

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const DailyTasksSheet = () => {
  const { activePet } = usePetPreference();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const storageKey = activePet ? `petid:daily:${activePet.id}:${todayKey()}` : "";

  // Load when sheet opens or pet changes
  useEffect(() => {
    if (!open || !storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      setDone(raw ? JSON.parse(raw) : {});
    } catch { setDone({}); }
  }, [open, storageKey]);

  // Persist on change
  useEffect(() => {
    if (!storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify(done)); } catch {}
  }, [done, storageKey]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("open-daily-tasks", onOpen);
    return () => window.removeEventListener("open-daily-tasks", onOpen);
  }, []);

  const toggle = useCallback((key: string) => {
    setDone((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const completed = DAILY_TASKS.filter((t) => done[t.key]).length;
  const pct = Math.round((completed / DAILY_TASKS.length) * 100);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-[80]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            className="fixed bottom-0 inset-x-0 z-[81] bg-background rounded-t-3xl shadow-2xl border-t border-border/40"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            dir="rtl"
          >
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="px-5 pt-2 pb-3 flex items-center justify-between">
              <div>
                <div className="text-[16px] font-bold text-foreground">משימות יומיות</div>
                <div className="text-[11px] text-muted-foreground" dir="auto" style={{ unicodeBidi: "plaintext" }}>
                  {activePet?.name ? `${activePet.name} · ` : ""}{completed}/{DAILY_TASKS.length} · {pct}%
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground"
                aria-label="סגור"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5">
              <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={false}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>

            <div className="p-4 pb-[max(env(safe-area-inset-bottom),16px)] grid grid-cols-2 gap-2">
              {DAILY_TASKS.map((t) => {
                const checked = !!done[t.key];
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => toggle(t.key)}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors text-right ${
                      checked ? "bg-primary/10 border-primary/40" : "bg-card border-border/40"
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: checked ? t.color : "hsl(var(--muted))", color: checked ? "white" : "hsl(var(--foreground))" }}
                    >
                      {checked ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 text-[12px] text-foreground leading-tight">{t.label}</div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DailyTasksSheet;