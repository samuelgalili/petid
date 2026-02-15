/**
 * SmartCartLayers — AI-powered cart intelligence for PetID.
 * 1. "Missing Piece" Upsell
 * 2. "Next Vaccine" Sync Banner
 * 3. Health Score Impact Preview
 * 4. Smart Quantity Adjustment
 * 5. PetCoin Redemption Slider
 * 6. Final Safety Check Badge
 */

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Syringe, TrendingUp, Scale, Coins, ShieldCheck,
  Plus, AlertTriangle, ChevronDown, ChevronUp, Calendar,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useActivePet, type ActivePet } from "@/hooks/useActivePet";
import { checkProductSafety } from "@/components/shop/ShopSafetyFilter";
import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/contexts/CartContext";

// ── Helpers ──

function estimateDailyGrams(weight: number | null, petType: string): number {
  if (!weight) return 0;
  if (petType === "cat") {
    if (weight <= 3) return Math.round(weight * 35);
    if (weight <= 6) return Math.round(weight * 28);
    return Math.round(weight * 22);
  }
  if (weight <= 5) return Math.round(weight * 30);
  if (weight <= 15) return Math.round(weight * 25);
  return Math.round(weight * 20);
}

function parseBagKg(name: string): number {
  const match = name.match(/(\d+\.?\d*)\s*(?:ק[״"]?ג|kg|קילו)/i);
  if (match) return parseFloat(match[1]);
  const gMatch = name.match(/(\d+)\s*(?:גרם|gr|g)\b/i);
  if (gMatch) return parseInt(gMatch[1]) / 1000;
  return 0;
}

function getLifeStageHe(ageWeeks: number | null): string {
  if (!ageWeeks) return "";
  if (ageWeeks < 26) return "גור";
  if (ageWeeks < 52) return "צעיר";
  if (ageWeeks < 364) return "בוגר";
  return "מבוגר";
}

// ── 1. Missing Piece Upsell ──

const CARE_CATEGORIES = [
  { key: "food", keywords: ["food", "מזון", "אוכל", "kibble", "גורים", "puppy", "adult", "senior"], label: "מזון" },
  { key: "treat", keywords: ["treat", "חטיף", "snack", "chew", "לעיסה", "dental"], label: "חטיפים" },
  { key: "supplement", keywords: ["omega", "אומגה", "vitamin", "ויטמין", "supplement", "תוסף", "probiotic"], label: "תוספים" },
  { key: "grooming", keywords: ["shampoo", "שמפו", "brush", "מברשת", "grooming", "טיפוח"], label: "טיפוח" },
  { key: "toy", keywords: ["toy", "צעצוע", "ball", "כדור", "puzzle", "game"], label: "צעצועים" },
];

interface UpsellSuggestion {
  message: string;
  category: string;
}

const MissingPieceUpsell = ({ items, pet }: { items: CartItem[]; pet: ActivePet }) => {
  const suggestion = useMemo<UpsellSuggestion | null>(() => {
    const cartText = items.map(i => i.name.toLowerCase()).join(" ");
    const presentCategories = CARE_CATEGORIES.filter(cat =>
      cat.keywords.some(kw => cartText.includes(kw))
    ).map(c => c.key);

    const stage = getLifeStageHe(pet.ageWeeks);

    // Specific smart suggestions based on what's in cart + pet profile
    if (presentCategories.includes("food") && !presentCategories.includes("treat")) {
      if (pet.ageWeeks !== null && pet.ageWeeks < 26) {
        return {
          message: `${pet.name} מחליפ/ה שיניים עכשיו – להוסיף חטיף לעיסה להקלה על החניכיים?`,
          category: "treat",
        };
      }
      return {
        message: `להשלמת שגרת התזונה של ${pet.name} – מה דעתך להוסיף חטיף בריא?`,
        category: "treat",
      };
    }

    if (!presentCategories.includes("supplement") && pet.medical_conditions?.length) {
      return {
        message: `${pet.name} עם מצב רפואי רשום – תוסף תזונה יכול לתמוך בבריאות.`,
        category: "supplement",
      };
    }

    if (!presentCategories.includes("grooming") && presentCategories.length >= 1) {
      return {
        message: `שגרת טיפוח היא חלק חשוב – להוסיף מוצר טיפוח ל${pet.name}?`,
        category: "grooming",
      };
    }

    if (!presentCategories.includes("toy") && presentCategories.length >= 2) {
      return {
        message: `${stage === "גור" ? "גורים צריכים גירוי" : "פעילות חשובה"} – להוסיף צעצוע?`,
        category: "toy",
      };
    }

    return null;
  }, [items, pet]);

  if (!suggestion) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="p-3.5 border-primary/20 bg-gradient-to-l from-primary/5 to-background">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-foreground mb-0.5">חלק חסר בעגלה</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{suggestion.message}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// ── 2. Next Vaccine Sync Banner ──

const VaccineSyncBanner = ({ pet }: { pet: ActivePet }) => {
  const [nextAppointment, setNextAppointment] = useState<{ days: number; date: string } | null>(null);

  useEffect(() => {
    const fetchNext = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];
      const { data } = await (supabase as any)
        .from("pet_reminders")
        .select("reminder_date, title")
        .eq("user_id", user.id)
        .gte("reminder_date", today)
        .order("reminder_date", { ascending: true })
        .limit(1);

      if (data?.[0]) {
        const d = new Date(data[0].reminder_date);
        const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days <= 30) {
          setNextAppointment({
            days,
            date: d.toLocaleDateString("he-IL", { day: "numeric", month: "long" }),
          });
        }
      }
    };
    fetchNext();
  }, []);

  if (!nextAppointment) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-3.5 border-amber-500/20 bg-gradient-to-l from-amber-500/5 to-background">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Syringe className="w-4 h-4 text-amber-600" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-foreground mb-0.5">
              <Calendar className="w-3 h-3 inline ml-1 text-amber-600" />
              תור ל{pet.name} בעוד {nextAppointment.days} ימים
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              יש ל{pet.name} תור ב-{nextAppointment.date}. רוצה להוסיף חטיף הרגעה לביקור במרפאה?
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// ── 3. Health Score Impact Preview ──

const HealthScoreImpact = ({ items, pet }: { items: CartItem[]; pet: ActivePet }) => {
  const impact = useMemo(() => {
    const cartText = items.map(i => i.name.toLowerCase()).join(" ");
    let boost = 0;
    const areas: string[] = [];

    if (cartText.match(/food|מזון|kibble|גורים|puppy|adult/)) { boost += 15; areas.push("תזונה"); }
    if (cartText.match(/omega|אומגה|salmon|סלמון|coat/)) { boost += 10; areas.push("פרווה"); }
    if (cartText.match(/vitamin|ויטמין|supplement|תוסף/)) { boost += 8; areas.push("חיסון"); }
    if (cartText.match(/dental|שיניים|chew|לעיסה/)) { boost += 5; areas.push("שיניים"); }
    if (cartText.match(/joint|מפרקים|glucosamine/)) { boost += 7; areas.push("מפרקים"); }

    if (boost === 0) return null;

    const currentScore = 80;
    const projectedScore = Math.min(100, currentScore + boost);
    return { currentScore, projectedScore, boost, areas };
  }, [items]);

  if (!impact) return null;

  const barWidth = `${impact.projectedScore}%`;
  const currentWidth = `${impact.currentScore}%`;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-3.5 border-border/30">
        <div className="flex items-center gap-2 mb-2.5">
          <TrendingUp className="w-4 h-4 text-primary" strokeWidth={1.5} />
          <p className="text-xs font-bold text-foreground">השפעה על ציון הבריאות של {pet.name}</p>
        </div>
        <div className="relative h-3 bg-muted rounded-full overflow-hidden mb-2">
          <div className="absolute inset-y-0 right-0 bg-muted-foreground/20 rounded-full" style={{ width: currentWidth }} />
          <motion.div
            className="absolute inset-y-0 right-0 bg-primary rounded-full"
            initial={{ width: currentWidth }}
            animate={{ width: barWidth }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            {impact.areas.join(" + ")}
          </p>
          <p className="text-[11px] font-bold text-primary">
            {impact.currentScore}% → {impact.projectedScore}%
          </p>
        </div>
      </Card>
    </motion.div>
  );
};

// ── 4. Smart Quantity Adjustment ──

const SmartQuantityToggle = ({ items, pet, onQuantityNote }: {
  items: CartItem[];
  pet: ActivePet;
  onQuantityNote: (itemId: string, note: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);

  const foodItems = useMemo(() => {
    return items.filter(item => {
      const lower = item.name.toLowerCase();
      return lower.match(/food|מזון|kibble|גורים|puppy|adult|senior|kg|ק"ג|קילו/);
    }).map(item => {
      const bagKg = parseBagKg(item.name);
      if (!bagKg || !pet.weight) return null;
      const dailyG = estimateDailyGrams(pet.weight, pet.pet_type);
      const daysPerBag = Math.round((bagKg * 1000) / dailyG);
      const runOutDate = new Date();
      runOutDate.setDate(runOutDate.getDate() + daysPerBag * item.quantity);
      return {
        ...item,
        bagKg,
        dailyG,
        daysPerBag,
        totalDays: daysPerBag * item.quantity,
        runOutDate: runOutDate.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }),
      };
    }).filter(Boolean) as Array<CartItem & { bagKg: number; dailyG: number; daysPerBag: number; totalDays: number; runOutDate: string }>;
  }, [items, pet]);

  if (foodItems.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-3.5 border-border/30">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" strokeWidth={1.5} />
            <p className="text-xs font-bold text-foreground">חישוב כמות לפי משקל {pet.name}</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2">
                {foodItems.map(item => (
                  <div key={item.id} className="p-2.5 rounded-xl bg-muted/50 border border-border/20">
                    <p className="text-[11px] font-semibold text-foreground line-clamp-1 mb-1.5">{item.name}</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-sm font-black text-primary">{item.dailyG}g</p>
                        <p className="text-[9px] text-muted-foreground">מנה יומית</p>
                      </div>
                      <div>
                        <p className="text-sm font-black text-primary">{item.totalDays}</p>
                        <p className="text-[9px] text-muted-foreground">ימים</p>
                      </div>
                      <div>
                        <p className="text-sm font-black text-primary">{item.runOutDate.split(" ").slice(0, 2).join(" ")}</p>
                        <p className="text-[9px] text-muted-foreground">נגמר ב-</p>
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground text-center">
                  * מבוסס על משקל {pet.weight} ק״ג ({pet.pet_type === "cat" ? "חתול" : "כלב"})
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

// ── 5. PetCoin Redemption Slider ──

const PetCoinRedemption = ({ subtotal, onDiscountChange }: {
  subtotal: number;
  onDiscountChange: (discount: number) => void;
}) => {
  const [balance, setBalance] = useState(0);
  const [applied, setApplied] = useState(0);
  const COIN_VALUE = 0.10; // 1 PetCoin = ₪0.10

  useEffect(() => {
    const fetchBalance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase as any)
        .from("profiles")
        .select("petid_coins")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.petid_coins) setBalance(data.petid_coins);
    };
    fetchBalance();
  }, []);

  if (balance <= 0) return null;

  const maxDiscount = Math.min(balance * COIN_VALUE, subtotal * 0.3); // Max 30% of subtotal
  const maxCoins = Math.floor(maxDiscount / COIN_VALUE);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const coins = parseInt(e.target.value);
    setApplied(coins);
    onDiscountChange(coins * COIN_VALUE);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-3.5 border-border/30">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
            <p className="text-xs font-bold text-foreground">שלם עם PetCoins</p>
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground">
            יתרה: {balance.toLocaleString()} 🪙
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={maxCoins}
          value={applied}
          onChange={handleChange}
          className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
        />

        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-muted-foreground">0 🪙</span>
          <motion.span
            key={applied}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-sm font-black text-primary"
          >
            {applied > 0 ? `-₪${(applied * COIN_VALUE).toFixed(0)}` : "—"}
          </motion.span>
          <span className="text-[10px] text-muted-foreground">{maxCoins.toLocaleString()} 🪙</span>
        </div>
      </Card>
    </motion.div>
  );
};

// ── 6. Final Safety Check Badge ──

const FinalSafetyBadge = ({ items, pet }: { items: CartItem[]; pet: ActivePet }) => {
  const safetyResult = useMemo(() => {
    const warnings: string[] = [];
    for (const item of items) {
      const { level, reason } = checkProductSafety(`${item.name} ${item.variant || ""}`, pet);
      if (level !== "safe" && reason) warnings.push(`${item.name}: ${reason}`);
    }
    return { safe: warnings.length === 0, warnings };
  }, [items, pet]);

  if (safetyResult.safe) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 border-primary/20"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary) / 0.03), hsl(var(--primary) / 0.08))",
        }}
      >
        <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0" strokeWidth={2} />
        <div>
          <p className="text-xs font-bold text-primary">הסל נבדק רפואית ✓</p>
          <p className="text-[10px] text-muted-foreground">כל המוצרים מתאימים לנתונים של {pet.name}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border-2 border-amber-500/30 overflow-hidden"
    >
      <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-500/5">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" strokeWidth={2} />
        <div>
          <p className="text-xs font-bold text-amber-700">שים לב — נמצאו אזהרות</p>
          <p className="text-[10px] text-muted-foreground">בדוק את המוצרים הבאים לפני הרכישה</p>
        </div>
      </div>
      <div className="px-4 py-2 space-y-1">
        {safetyResult.warnings.map((w, i) => (
          <p key={i} className="text-[10px] text-amber-700">⚠️ {w}</p>
        ))}
      </div>
    </motion.div>
  );
};

// ── Main Export ──

interface SmartCartLayersProps {
  items: CartItem[];
  subtotal: number;
  onPetCoinDiscount: (discount: number) => void;
}

export const SmartCartLayers = ({ items, subtotal, onPetCoinDiscount }: SmartCartLayersProps) => {
  const { pet, loading } = useActivePet();

  if (loading || !pet || items.length === 0) return null;

  return (
    <div className="space-y-3 mt-4">
      <MissingPieceUpsell items={items} pet={pet} />
      <VaccineSyncBanner pet={pet} />
      <HealthScoreImpact items={items} pet={pet} />
      <SmartQuantityToggle items={items} pet={pet} onQuantityNote={() => {}} />
      <PetCoinRedemption subtotal={subtotal} onDiscountChange={onPetCoinDiscount} />
      <FinalSafetyBadge items={items} pet={pet} />
    </div>
  );
};
