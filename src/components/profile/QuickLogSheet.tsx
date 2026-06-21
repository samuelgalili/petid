import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GlassWater, UtensilsCrossed, Weight as WeightIcon, Syringe } from "lucide-react";
import { z } from "zod";

type QuickLogType = "water" | "weight" | "feeding" | "vaccines";

/* ─── Zod schemas — single source of truth for validation ─── */
const todayISO = () => new Date().toISOString().slice(0, 10);

const waterSchema = z.object({
  amount_ml: z.coerce
    .number()
    .int("יש להזין מספר שלם")
    .positive("הכמות חייבת להיות גדולה מ-0")
    .max(5000, "כמות חריגה (מקס׳ 5000 מ״ל לפעם)"),
});

const feedingSchema = z
  .object({
    food_name: z.string().trim().max(120, "שם ארוך מדי (מקס׳ 120 תווים)").optional().or(z.literal("")),
    kcal: z
      .union([z.literal(""), z.coerce.number().positive("חייב להיות גדול מ-0").max(10000, "ערך חריג")])
      .optional(),
  })
  .refine((d) => (d.food_name && d.food_name.length > 0) || (typeof d.kcal === "number" && d.kcal > 0), {
    message: "הזינו שם מזון או כמות קלוריות",
    path: ["food_name"],
  });

const weightSchema = z.object({
  weight_kg: z.coerce
    .number()
    .positive("המשקל חייב להיות גדול מ-0")
    .min(0.1, "משקל לא חוקי")
    .max(120, "משקל חריג — בדקו שוב"),
});

const vaccineSchema = z
  .object({
    vaccine_name: z
      .string()
      .trim()
      .min(2, "שם החיסון קצר מדי")
      .max(120, "שם ארוך מדי (מקס׳ 120 תווים)"),
    vaccination_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין")
      .refine((d) => new Date(d) <= new Date(), "תאריך מתן לא יכול להיות בעתיד"),
    expiry_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (d) => !d.expiry_date || new Date(d.expiry_date) > new Date(d.vaccination_date),
    { message: "תוקף חייב להיות אחרי תאריך המתן", path: ["expiry_date"] },
  );

interface Props {
  type: QuickLogType | null;
  pet: { id: string; name: string; weight?: number | null } | null;
  onClose: () => void;
  onSaved?: () => void;
}

const META: Record<QuickLogType, { title: string; icon: typeof GlassWater }> = {
  water:    { title: "תיעוד שתייה",  icon: GlassWater },
  feeding:  { title: "תיעוד האכלה",  icon: UtensilsCrossed },
  weight:   { title: "שקילה",         icon: WeightIcon },
  vaccines: { title: "תיעוד חיסון",  icon: Syringe },
};

/**
 * QuickLogSheet — single bottom sheet used by the dashboard satellites
 * (water / feeding / weight / vaccines) to write to the new pet_* log tables.
 * Conservative: requires the minimum fields, never invents values.
 */
export const QuickLogSheet = ({ type, pet, onClose, onSaved }: Props) => {
  const { toast } = useToast();
  const open = !!type && !!pet;

  // Field state — reset on open
  const [amountMl, setAmountMl] = useState("");
  const [kcal, setKcal] = useState("");
  const [foodName, setFoodName] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [vName, setVName] = useState("");
  const [vDate, setVDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [vExpiry, setVExpiry] = useState("");
  const [recent, setRecent] = useState<Array<{ label: string; meta: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setAmountMl("");
    setKcal("");
    setFoodName("");
    setWeightKg(pet?.weight ? String(pet.weight) : "");
    setVName("");
    setVExpiry("");
    setVDate(new Date().toISOString().slice(0, 10));
    setErrors({});

    // Load last 5 entries for context
    (async () => {
      if (!pet || !type) return;
      const tableMap = {
        water: { table: "pet_water_logs", order: "logged_at", fmt: (r: any) => ({ label: `${r.amount_ml} מ״ל`, meta: new Date(r.logged_at).toLocaleString("he-IL") }) },
        feeding: { table: "pet_feeding_logs", order: "logged_at", fmt: (r: any) => ({ label: `${r.food_name || "ארוחה"} · ${r.kcal ?? "—"} קק״ל`, meta: new Date(r.logged_at).toLocaleString("he-IL") }) },
        weight: { table: "pet_weight_logs", order: "measured_at", fmt: (r: any) => ({ label: `${r.weight_kg} ק״ג`, meta: new Date(r.measured_at).toLocaleDateString("he-IL") }) },
        vaccines: { table: "pet_vaccinations", order: "vaccination_date", fmt: (r: any) => ({ label: r.vaccine_name, meta: `ניתן ${new Date(r.vaccination_date).toLocaleDateString("he-IL")}${r.expiry_date ? ` · עד ${new Date(r.expiry_date).toLocaleDateString("he-IL")}` : ""}` }) },
      } as const;
      const cfg = tableMap[type];
      const { data } = await (supabase as any)
        .from(cfg.table)
        .select("*")
        .eq("pet_id", pet.id)
        .order(cfg.order, { ascending: false })
        .limit(5);
      setRecent((data ?? []).map(cfg.fmt));
    })();
  }, [open, pet, type]);

  const save = async () => {
    if (!pet || !type || saving) return;
    setErrors({});

    // ── Client-side validation ──
    let payload: Record<string, any> | null = null;
    let parseError: z.ZodError | null = null;

    if (type === "water") {
      const r = waterSchema.safeParse({ amount_ml: amountMl });
      if (!r.success) parseError = r.error;
      else payload = r.data;
    } else if (type === "feeding") {
      const r = feedingSchema.safeParse({ food_name: foodName, kcal: kcal === "" ? "" : kcal });
      if (!r.success) parseError = r.error;
      else payload = { food_name: r.data.food_name || null, kcal: typeof r.data.kcal === "number" ? r.data.kcal : null };
    } else if (type === "weight") {
      const r = weightSchema.safeParse({ weight_kg: weightKg });
      if (!r.success) parseError = r.error;
      else payload = r.data;
    } else if (type === "vaccines") {
      const r = vaccineSchema.safeParse({
        vaccine_name: vName,
        vaccination_date: vDate,
        expiry_date: vExpiry,
      });
      if (!r.success) parseError = r.error;
      else payload = { ...r.data, expiry_date: r.data.expiry_date || null };
    }

    if (parseError) {
      const flat: Record<string, string> = {};
      parseError.issues.forEach((i) => {
        const key = String(i.path[0] ?? "_");
        if (!flat[key]) flat[key] = i.message;
      });
      setErrors(flat);
      toast({
        title: "בדקו את הפרטים",
        description: Object.values(flat)[0],
        variant: "destructive",
      });
      return;
    }
    if (!payload) return;

    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("יש להתחבר כדי לשמור");

      if (type === "water") {
        const { error } = await supabase.from("pet_water_logs").insert({
          pet_id: pet.id, user_id: uid, amount_ml: payload.amount_ml,
        });
        if (error) throw error;
      } else if (type === "feeding") {
        const { error } = await supabase.from("pet_feeding_logs").insert({
          pet_id: pet.id, user_id: uid,
          food_name: payload.food_name,
          kcal: payload.kcal,
        });
        if (error) throw error;
      } else if (type === "weight") {
        const { error } = await supabase.from("pet_weight_logs").insert({
          pet_id: pet.id, user_id: uid, weight_kg: payload.weight_kg, source: "manual",
        });
        if (error) throw error;
        // Mirror into pets.weight for downstream NRC calcs
        await supabase.from("pets").update({ weight: payload.weight_kg }).eq("id", pet.id);
      } else if (type === "vaccines") {
        const { error } = await supabase.from("pet_vaccinations").insert({
          pet_id: pet.id, user_id: uid,
          vaccine_name: payload.vaccine_name,
          vaccination_date: payload.vaccination_date,
          expiry_date: payload.expiry_date,
        });
        if (error) throw error;
      }

      toast({ title: "נשמר" });
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast({
        title: "השמירה נכשלה",
        description: e?.message || "נסו שוב בעוד רגע",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!type) return null;
  const m = META[type];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl pb-[calc(env(safe-area-inset-bottom)+24px)]"
        dir="rtl"
      >
        <SheetHeader>
          <SheetTitle className="text-right flex items-center gap-2">
            <m.icon className="w-5 h-5" strokeWidth={1.5} />
            {m.title}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-5 space-y-3">
          {type === "water" && (
            <>
              <label className="block text-xs text-muted-foreground">כמות (מ״ל)</label>
              <input
                type="number" inputMode="numeric" autoFocus
                value={amountMl} onChange={(e) => setAmountMl(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl bg-muted/40 border border-border/40 text-foreground text-lg tabular-nums"
                placeholder="למשל 250"
              />
              <div className="flex gap-2 flex-wrap">
                {[100, 200, 300, 500].map((v) => (
                  <button key={v} type="button" onClick={() => setAmountMl(String(v))}
                    className="px-3 py-1.5 rounded-full text-xs bg-muted/40 border border-border/40 text-foreground">
                    {v} מ״ל
                  </button>
                ))}
              </div>
            </>
          )}

          {type === "feeding" && (
            <>
              <label className="block text-xs text-muted-foreground">שם המזון (אופציונלי)</label>
              <input
                type="text"
                value={foodName} onChange={(e) => setFoodName(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl bg-muted/40 border border-border/40 text-foreground"
                placeholder="למשל Royal Canin"
              />
              <label className="block text-xs text-muted-foreground mt-2">קלוריות (קק״ל)</label>
              <input
                type="number" inputMode="numeric"
                value={kcal} onChange={(e) => setKcal(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl bg-muted/40 border border-border/40 text-foreground text-lg tabular-nums"
                placeholder="לדוגמה 350"
              />
            </>
          )}

          {type === "weight" && (
            <>
              <label className="block text-xs text-muted-foreground">משקל (ק״ג)</label>
              <input
                type="number" inputMode="decimal" step="0.1" autoFocus
                value={weightKg} onChange={(e) => setWeightKg(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl bg-muted/40 border border-border/40 text-foreground text-lg tabular-nums"
                placeholder="למשל 12.5"
              />
            </>
          )}

          {type === "vaccines" && (
            <>
              <label className="block text-xs text-muted-foreground">שם החיסון</label>
              <input
                type="text" autoFocus
                value={vName} onChange={(e) => setVName(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl bg-muted/40 border border-border/40 text-foreground"
                placeholder="למשל משולש"
              />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-xs text-muted-foreground">תאריך מתן</label>
                  <input type="date" value={vDate} onChange={(e) => setVDate(e.target.value)}
                    className="w-full h-12 px-3 rounded-2xl bg-muted/40 border border-border/40 text-foreground" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">תוקף עד</label>
                  <input type="date" value={vExpiry} onChange={(e) => setVExpiry(e.target.value)}
                    className="w-full h-12 px-3 rounded-2xl bg-muted/40 border border-border/40 text-foreground" />
                </div>
              </div>
            </>
          )}

          <button
            type="button" onClick={save} disabled={saving}
            className="mt-4 w-full h-12 rounded-2xl bg-foreground text-background font-semibold disabled:opacity-50"
          >
            {saving ? "שומר…" : "שמירה"}
          </button>

          {recent.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/30">
              <div className="text-xs text-muted-foreground mb-2">היסטוריה אחרונה</div>
              <ul className="space-y-1.5">
                {recent.map((r, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{r.label}</span>
                    <span className="text-xs text-muted-foreground">{r.meta}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default QuickLogSheet;