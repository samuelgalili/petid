/**
 * FelineDashboard — Cat-specific dashboard with hydration, urinary,
 * indoor/outdoor, hairball risk, weight status, litter box tracker,
 * smart shop recommendations, and Libra insurance highlights.
 */

import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import {
  Droplets, Activity, Home, TreePine, Wind, Weight,
  AlertTriangle, ShoppingBag, Shield, Clock, CheckCircle2,
  Target, Thermometer
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FelineDashboardProps {
  petName: string;
  weight?: number;
  breed?: string;
  currentFood?: string;
  isIndoor?: boolean;
  isMale?: boolean;
  ageYears?: number;
}

// Breed fur length mapping for hairball risk
const LONG_FUR_BREEDS = ['persian', 'פרסי', 'maine coon', 'מיין קון', 'ragdoll', 'רגדול', 'himalayan', 'הימלאי', 'norwegian', 'נורבגי', 'siberian', 'סיבירי', 'birman', 'בירמן'];
const SHORT_FUR_BREEDS = ['sphynx', 'ספינקס', 'devon rex', 'דבון רקס', 'cornish rex', 'קורניש רקס', 'siamese', 'סיאמי', 'bengal', 'בנגלי', 'burmese', 'בורמזי'];

// Ideal weight by breed (kg)
const BREED_IDEAL: Record<string, number> = {
  'persian': 4.5, 'פרסי': 4.5,
  'siamese': 4, 'סיאמי': 4,
  'british shorthair': 5.5, 'בריטי קצר שיער': 5.5,
  'maine coon': 7, 'מיין קון': 7,
  'ragdoll': 6, 'רגדול': 6,
  'bengal': 5, 'בנגלי': 5,
  'scottish fold': 4, 'סקוטיש פולד': 4,
};

export const FelineDashboard = ({ petName, weight, breed, currentFood, isIndoor = true, isMale, ageYears }: FelineDashboardProps) => {
  const [litterReports, setLitterReports] = useState<Array<{ time: string; difficulty: boolean }>>([]);
  const [showUrinaryAlert, setShowUrinaryAlert] = useState(false);

  const breedLower = (breed || '').toLowerCase();
  const foodLower = (currentFood || '').toLowerCase();

  // === 1. Hydration Score ===
  const hydrationScore = useMemo(() => {
    let score = 40; // base: dry-only default
    if (['wet', 'רטוב', 'pate', 'פטה', 'gravy', 'רוטב', 'mousse'].some(k => foodLower.includes(k))) score = 78;
    if (['fountain', 'מזרקה'].some(k => foodLower.includes(k))) score = Math.min(100, score + 15);
    if (score <= 40 && !foodLower) score = 35; // unknown = low
    return score;
  }, [foodLower]);

  // === 2. Urinary Status ===
  const urinaryScore = useMemo(() => {
    let score = 50;
    if (['urinary', 'struvite', 'ph', 'petid pharmacy', 'health & care'].some(k => foodLower.includes(k))) score = 95;
    else if (['wet', 'רטוב'].some(k => foodLower.includes(k))) score = 70;
    if (isMale) score = Math.max(20, score - 10); // males at higher risk
    return score;
  }, [foodLower, isMale]);

  // === 3. Hairball Risk ===
  const hairballRisk = useMemo(() => {
    if (SHORT_FUR_BREEDS.some(b => breedLower.includes(b))) return { level: 'low', score: 15, label: 'נמוך' };
    if (LONG_FUR_BREEDS.some(b => breedLower.includes(b))) return { level: 'high', score: 85, label: 'גבוה' };
    return { level: 'medium', score: 50, label: 'בינוני' };
  }, [breedLower]);

  // === 4. Weight Status ===
  const weightStatus = useMemo(() => {
    const ideal = Object.entries(BREED_IDEAL).find(([k]) => breedLower.includes(k))?.[1] || 4.5;
    if (!weight) return { diff: 0, ideal, status: 'unknown', label: 'לא צוין' };
    const diffGrams = Math.round((weight - ideal) * 1000);
    if (diffGrams > 300) return { diff: diffGrams, ideal, status: 'overweight', label: `+${diffGrams}g עודף` };
    if (diffGrams < -300) return { diff: diffGrams, ideal, status: 'underweight', label: `${diffGrams}g חסר` };
    return { diff: diffGrams, ideal, status: 'healthy', label: 'תקין' };
  }, [weight, breedLower]);

  // === 5. Smart shop recommendations ===
  const shopRecommendations = useMemo(() => {
    const recs: Array<{ name: string; reason: string; icon: React.ElementType }> = [];
    if (weightStatus.status === 'overweight') {
      recs.push({ name: 'PetID Pharmacy — Obesity', reason: 'לירידה במשקל עם L-Carnitine', icon: Weight });
    }
    if (ageYears && ageYears >= 7) {
      recs.push({ name: 'PetID Pharmacy — Renal', reason: 'הגנה כלייתית לחתול מבוגר', icon: Droplets });
    }
    if (hairballRisk.level === 'high') {
      recs.push({ name: 'Malt Paste', reason: 'משחת מאלט לכדורי שיער', icon: Wind });
    }
    // Fill to 3 if needed
    if (recs.length < 3 && hydrationScore < 50) {
      recs.push({ name: 'מזון רטוב איכותי', reason: 'שיפור לחות ובריאות שתן', icon: Droplets });
    }
    return recs.slice(0, 3);
  }, [weightStatus, ageYears, hairballRisk, hydrationScore]);

  // Litter box report handler
  const reportLitterVisit = (difficulty: boolean) => {
    const now = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    setLitterReports(prev => [{ time: now, difficulty }, ...prev].slice(0, 10));
    if (difficulty) setShowUrinaryAlert(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-4"
      dir="rtl"
    >
      {/* === Section 1: Header — Hydration & Urinary === */}
      <div className="grid grid-cols-2 gap-3">
        {/* Hydration Score Circle */}
        <div className="p-3.5 bg-card rounded-xl border border-border/20 flex flex-col items-center">
          <div className="relative w-16 h-16 mb-2">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="3"
              />
              <motion.path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={hydrationScore >= 60 ? 'hsl(200,80%,50%)' : 'hsl(25,90%,55%)'}
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ strokeDasharray: "0 100" }}
                animate={{ strokeDasharray: `${hydrationScore} 100` }}
                transition={{ delay: 0.5, duration: 1 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Droplets className={`w-5 h-5 ${hydrationScore >= 60 ? 'text-blue-500' : 'text-amber-500'}`} strokeWidth={1.5} />
            </div>
          </div>
          <span className="text-xs font-bold text-foreground">מדד לחות</span>
          <span className={`text-[11px] font-bold ${hydrationScore >= 60 ? 'text-blue-500' : 'text-amber-500'}`}>{hydrationScore}%</span>
          <span className="text-[9px] text-muted-foreground mt-0.5">
            {hydrationScore >= 60 ? 'משלב מזון רטוב' : 'יבש בלבד — מומלץ רטוב'}
          </span>
        </div>

        {/* Urinary Status */}
        <div className="p-3.5 bg-card rounded-xl border border-border/20 flex flex-col items-center">
          <div className="relative w-16 h-16 mb-2">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="3"
              />
              <motion.path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={urinaryScore >= 80 ? 'hsl(150,60%,45%)' : urinaryScore >= 50 ? 'hsl(45,90%,50%)' : 'hsl(0,70%,55%)'}
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ strokeDasharray: "0 100" }}
                animate={{ strokeDasharray: `${urinaryScore} 100` }}
                transition={{ delay: 0.6, duration: 1 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className={`w-5 h-5 ${urinaryScore >= 80 ? 'text-emerald-500' : urinaryScore >= 50 ? 'text-amber-500' : 'text-red-500'}`} strokeWidth={1.5} />
            </div>
          </div>
          <span className="text-xs font-bold text-foreground">בריאות שתן</span>
          <span className={`text-[11px] font-bold ${urinaryScore >= 80 ? 'text-emerald-500' : urinaryScore >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
            {urinaryScore >= 80 ? 'מוגן' : urinaryScore >= 50 ? 'בינוני' : 'סיכון'}
          </span>
          <span className="text-[9px] text-muted-foreground mt-0.5">
            {urinaryScore >= 80 ? 'pH מאוזן' : 'מומלץ מזון urinary'}
          </span>
        </div>
      </div>

      {/* === Section 2: About Circles === */}
      <div className="grid grid-cols-3 gap-2">
        {/* Indoor/Outdoor */}
        <div className="p-3 bg-card rounded-xl border border-border/20 text-center">
          <div className={cn("w-10 h-10 rounded-full mx-auto mb-1.5 flex items-center justify-center", 
            isIndoor ? 'bg-blue-500/10' : 'bg-green-500/10')}>
            {isIndoor ? <Home className="w-5 h-5 text-blue-500" strokeWidth={1.5} /> : <TreePine className="w-5 h-5 text-green-500" strokeWidth={1.5} />}
          </div>
          <span className="text-[10px] font-bold text-foreground">{isIndoor ? 'פנים' : 'חוץ'}</span>
          <p className="text-[8px] text-muted-foreground mt-0.5">
            {isIndoor ? 'חיסוני בית' : 'פרעושים + חיסונים'}
          </p>
        </div>

        {/* Hairball Risk */}
        <div className="p-3 bg-card rounded-xl border border-border/20 text-center">
          <div className={cn("w-10 h-10 rounded-full mx-auto mb-1.5 flex items-center justify-center",
            hairballRisk.level === 'high' ? 'bg-red-500/10' : hairballRisk.level === 'medium' ? 'bg-amber-500/10' : 'bg-green-500/10')}>
            <Wind className={cn("w-5 h-5", 
              hairballRisk.level === 'high' ? 'text-red-500' : hairballRisk.level === 'medium' ? 'text-amber-500' : 'text-green-500')} strokeWidth={1.5} />
          </div>
          <span className="text-[10px] font-bold text-foreground">כד״ש</span>
          <p className={cn("text-[9px] font-bold mt-0.5",
            hairballRisk.level === 'high' ? 'text-red-500' : hairballRisk.level === 'medium' ? 'text-amber-500' : 'text-green-500')}>
            {hairballRisk.label}
          </p>
        </div>

        {/* Weight Status */}
        <div className="p-3 bg-card rounded-xl border border-border/20 text-center">
          <div className={cn("w-10 h-10 rounded-full mx-auto mb-1.5 flex items-center justify-center",
            weightStatus.status === 'overweight' ? 'bg-red-500/10' : weightStatus.status === 'underweight' ? 'bg-amber-500/10' : 'bg-green-500/10')}>
            <Target className={cn("w-5 h-5",
              weightStatus.status === 'overweight' ? 'text-red-500' : weightStatus.status === 'underweight' ? 'text-amber-500' : 'text-green-500')} strokeWidth={1.5} />
          </div>
          <span className="text-[10px] font-bold text-foreground">משקל</span>
          <p className={cn("text-[9px] font-bold mt-0.5",
            weightStatus.status === 'overweight' ? 'text-red-500' : weightStatus.status === 'underweight' ? 'text-amber-500' : 'text-green-500')}>
            {weightStatus.label}
          </p>
        </div>
      </div>

      {/* === Section 3: Litter Box Tracker === */}
      <div className="p-4 bg-muted/20 rounded-xl border border-border/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-violet-500" strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">מעקב ארגז צרכים — Litter Box</h4>
            <p className="text-[10px] text-muted-foreground">דווחו על ביקורים לזיהוי מוקדם של בעיות</p>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => reportLitterVisit(false)}
            className="flex-1 py-2.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 text-[11px] font-bold rounded-lg border border-emerald-500/20 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5 inline ml-1" />
            ביקור תקין
          </button>
          <button
            onClick={() => reportLitterVisit(true)}
            className="flex-1 py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 text-[11px] font-bold rounded-lg border border-red-500/20 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5 inline ml-1" />
            קושי / חריג
          </button>
        </div>

        {/* Recent reports */}
        {litterReports.length > 0 && (
          <div className="space-y-1 mb-2">
            {litterReports.slice(0, 3).map((r, i) => (
              <div key={i} className="flex items-center justify-between py-1 px-2 bg-card rounded-md border border-border/15">
                <span className="text-[10px] text-muted-foreground">{r.time}</span>
                <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full",
                  r.difficulty ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600')}>
                  {r.difficulty ? 'חריג' : 'תקין'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Urinary Alert */}
        {showUrinaryAlert && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-destructive/8 rounded-lg border border-destructive/25"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="text-[11px] font-bold text-destructive">התראת שתן — Urinary Alert</p>
                <p className="text-[10px] text-foreground leading-relaxed mt-0.5">
                  דווח על קושי בהשתנה. מומלץ לפנות לווטרינר בהקדם — במיוחד {isMale ? 'בזכרים, חסימת שתן מסכנת חיים תוך 24-48 שעות' : 'אם זה חוזר על עצמו'}.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* === Section 4: Smart Shop === */}
      {shopRecommendations.length > 0 && (
        <div className="p-4 bg-muted/20 rounded-xl border border-border/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">חנות חכמה — מותאם ל{petName}</h4>
              <p className="text-[10px] text-muted-foreground">3 מוצרים מותאמים לפרופיל</p>
            </div>
          </div>

          <div className="space-y-2">
            {shopRecommendations.map((rec, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 bg-card rounded-lg border border-border/15">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <rec.icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <span className="text-[11px] font-bold text-foreground">{rec.name}</span>
                  <p className="text-[9px] text-muted-foreground">{rec.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === Section 5: Libra for Cats === */}
      <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">Libra — ביטוח חתולים</h4>
            <p className="text-[10px] text-muted-foreground">כיסוי מותאם לסיכונים חתוליים</p>
          </div>
        </div>

        <div className="p-3 bg-card rounded-lg border border-border/15 mb-2">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Thermometer className="w-4 h-4 text-red-500" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-foreground">כיסוי חירום דרכי שתן</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                חסימת שתן היא <span className="font-bold text-destructive">גורם התביעות מס׳ 1</span> בחתולים זכרים. 
                Libra מכסה ניתוחי חירום, אשפוז, ובדיקות הדמיה — ללא תקופת המתנה לחירום.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'ניתוחי חירום', value: 'מכוסה' },
            { label: 'אשפוז', value: 'עד 14 יום' },
            { label: 'הדמיה', value: 'מכוסה' },
          ].map(item => (
            <div key={item.label} className="p-2 bg-card rounded-lg border border-border/15 text-center">
              <span className="text-[9px] font-bold text-primary">{item.value}</span>
              <p className="text-[8px] text-muted-foreground mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>

        {isMale && (
          <div className="mt-2 p-2 bg-amber-500/8 rounded-lg border border-amber-500/20">
            <p className="text-[9px] text-foreground leading-relaxed">
              <span className="font-bold">חתול זכר:</span> סיכון מוגבר לחסימת שתן. Libra כולל כיסוי מיידי לניתוח חירום ופירוק חסימה.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
