/**
 * FelineObesityCare — Obesity & weight management UI for cats
 * Fat burn dashboard, satiety meter, hepatic risk, weight loss tracker
 */

import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import {
  Flame, Leaf, AlertTriangle, TrendingDown, Target, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FelineObesityCareProps {
  petName: string;
  weight?: number;
  breed?: string;
}

// Ideal weight ranges by breed (kg)
const BREED_IDEAL_WEIGHT: Record<string, { min: number; max: number }> = {
  'persian': { min: 3.5, max: 5.5 },
  'פרסי': { min: 3.5, max: 5.5 },
  'siamese': { min: 3, max: 5 },
  'סיאמי': { min: 3, max: 5 },
  'british shorthair': { min: 4, max: 7 },
  'בריטי קצר שיער': { min: 4, max: 7 },
  'maine coon': { min: 5.5, max: 9 },
  'מיין קון': { min: 5.5, max: 9 },
  'ragdoll': { min: 4.5, max: 8 },
  'רגדול': { min: 4.5, max: 8 },
  'scottish fold': { min: 3, max: 5.5 },
  'סקוטיש פולד': { min: 3, max: 5.5 },
  'bengal': { min: 3.5, max: 6.5 },
  'בנגלי': { min: 3.5, max: 6.5 },
};
const DEFAULT_IDEAL = { min: 3.5, max: 5.5 };

export const FelineObesityCare = ({ petName, weight, breed }: FelineObesityCareProps) => {
  const [satietyLevel] = useState(72); // simulated fiber satiety %

  const idealWeight = useMemo(() => {
    if (!breed) return DEFAULT_IDEAL;
    const b = breed.toLowerCase();
    for (const [key, val] of Object.entries(BREED_IDEAL_WEIGHT)) {
      if (b.includes(key) || key.includes(b)) return val;
    }
    return DEFAULT_IDEAL;
  }, [breed]);

  const idealMid = (idealWeight.min + idealWeight.max) / 2;
  const overweightPct = weight && weight > idealMid
    ? Math.round(((weight - idealMid) / idealMid) * 100)
    : 0;

  // Weekly target: 1-2% loss
  const weeklyTargetMin = weight ? (weight * 0.01).toFixed(2) : '0';
  const weeklyTargetMax = weight ? (weight * 0.02).toFixed(2) : '0';
  const weeksToGoal = weight && weight > idealMid
    ? Math.ceil((weight - idealMid) / (weight * 0.015))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-4"
      dir="rtl"
    >
      {/* === Fat Burn Dashboard === */}
      <div className="p-4 bg-muted/20 rounded-xl border border-border/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
            <Flame className="w-4 h-4 text-orange-500" strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">שריפת שומן — Fat Burn Dashboard</h4>
            <p className="text-[10px] text-muted-foreground">L-Carnitine הופך שומן לאנרגיה</p>
          </div>
        </div>

        <div className="p-3 bg-card rounded-lg border border-border/15 mb-2.5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Flame className="w-6 h-6 text-orange-500" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold text-foreground">L-Carnitine מוגבר</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                מעביר חומצות שומן ל<span className="font-bold text-foreground">מיטוכונדריה</span> — שם הן נשרפות לאנרגיה במקום להיאגר כשומן.
              </p>
            </div>
          </div>

          {/* Visual process */}
          <div className="flex items-center gap-1.5">
            {[
              { label: 'שומן מאוחסן', color: 'bg-red-500/15 text-red-600 border-red-500/20' },
              { label: '→', color: 'text-muted-foreground' },
              { label: 'L-Carnitine', color: 'bg-orange-500/15 text-orange-600 border-orange-500/20' },
              { label: '→', color: 'text-muted-foreground' },
              { label: 'אנרגיה!', color: 'bg-green-500/15 text-green-600 border-green-500/20' },
            ].map((step, i) => (
              step.label === '→' ? (
                <span key={i} className={cn("text-xs", step.color)}>→</span>
              ) : (
                <span key={i} className={cn("text-[9px] font-medium px-2 py-1 rounded-full border", step.color)}>
                  {step.label}
                </span>
              )
            ))}
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'L-Carnitine', value: 'מוגבר', color: 'text-orange-500 bg-orange-500/10' },
            { label: 'קלוריות', value: 'מופחתות', color: 'text-red-500 bg-red-500/10' },
            { label: 'חלבון', value: 'גבוה', color: 'text-blue-500 bg-blue-500/10' },
          ].map(m => (
            <div key={m.label} className="p-2 bg-card rounded-lg border border-border/15 text-center">
              <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded", m.color)}>{m.value}</span>
              <p className="text-[10px] font-bold text-foreground mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* === Satiety Meter === */}
      <div className="p-4 bg-green-500/5 rounded-xl border border-green-500/15">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center">
            <Leaf className="w-4 h-4 text-green-500" strokeWidth={1.5} />
          </div>
          <h4 className="text-xs font-bold text-foreground">מד שובע — Anti-Begging Fiber</h4>
        </div>

        {/* Satiety gauge */}
        <div className="p-3 bg-card rounded-lg border border-border/15">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-muted-foreground">רמת שובע</span>
            <span className="text-[11px] font-bold text-green-600">{satietyLevel}%</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${satietyLevel}%` }}
              transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-l from-green-500 to-emerald-400"
            />
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            ריכוז <span className="font-bold text-foreground">סיבים תזונתיים גבוה</span> יוצר תחושת שובע ממושכת — 
            מפחית את התנהגות ה"קיבוץ" (Begging) בין ארוחות.
          </p>
          <div className="flex gap-2 mt-2">
            {['פחות יללות', 'פחות גניבת מזון', 'שקט בין ארוחות'].map(tag => (
              <span key={tag} className="text-[9px] bg-green-500/10 text-green-700 px-2 py-0.5 rounded-full font-medium">
                ✓ {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* === Weight Loss Tracker === */}
      {weight && weight > idealMid && (
        <div className="p-4 bg-muted/20 rounded-xl border border-border/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">מסלול ירידה במשקל</h4>
              <p className="text-[10px] text-muted-foreground">{petName} — מטרה: {idealWeight.min}–{idealWeight.max} ק״ג</p>
            </div>
          </div>

          {/* Weight progress bar */}
          <div className="p-3 bg-card rounded-lg border border-border/15 mb-2.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-[10px] text-foreground font-bold">{weight} ק״ג</span>
                <span className="text-[9px] text-red-500 font-medium">(+{overweightPct}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-green-500" strokeWidth={1.5} />
                <span className="text-[10px] text-green-600 font-bold">{idealMid} ק״ג</span>
              </div>
            </div>

            {/* Visual bar */}
            <div className="relative w-full h-4 bg-muted rounded-full overflow-hidden">
              {/* Ideal zone */}
              <div
                className="absolute top-0 bottom-0 bg-green-500/20 border-x border-green-500/40"
                style={{
                  right: `${((10 - idealWeight.max) / 8) * 100}%`,
                  width: `${((idealWeight.max - idealWeight.min) / 8) * 100}%`,
                }}
              />
              {/* Current weight marker */}
              {weight <= 10 && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-red-500 rounded-full"
                  style={{ right: `${((10 - weight) / 8) * 100}%` }}
                />
              )}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[8px] text-muted-foreground">10 ק״ג</span>
              <span className="text-[8px] text-muted-foreground">2 ק״ג</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-card rounded-lg border border-border/15 text-center">
              <p className="text-[9px] text-muted-foreground">ירידה שבועית בטוחה</p>
              <p className="text-[12px] font-bold text-foreground">{weeklyTargetMin}–{weeklyTargetMax} ק״ג</p>
              <p className="text-[8px] text-muted-foreground">1–2% ממשקל הגוף</p>
            </div>
            <div className="p-2.5 bg-card rounded-lg border border-border/15 text-center">
              <p className="text-[9px] text-muted-foreground">זמן משוער ליעד</p>
              <p className="text-[12px] font-bold text-foreground">~{weeksToGoal} שבועות</p>
              <p className="text-[8px] text-muted-foreground">בקצב בטוח</p>
            </div>
          </div>
        </div>
      )}

      {/* === Cross-Condition: Diabetic Risk Monitoring === */}
      {weight && weight > idealMid && (
        <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Activity className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground mb-1">ניטור סיכון סוכרת — Diabetic Risk</h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                חתולים עם <span className="font-bold text-foreground">עודף משקל</span> נמצאים בסיכון מוגבר פי 4 לפתח סוכרת מסוג 2. 
                מומלץ לבצע בדיקת גלוקוז תקופתית אצל הווטרינר.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['בדיקת גלוקוז תקופתית', 'מעקב משקל שבועי', 'דיאטה דלת-פחמימות'].map(tag => (
                  <span key={tag} className="text-[9px] bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === Obligate Carnivore Reminder === */}
      <div className="p-3 bg-muted/20 rounded-xl border border-border/20">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Flame className="w-3.5 h-3.5 text-red-500" strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-foreground">טורף מחייב — Obligate Carnivore</h4>
            <p className="text-[9px] text-muted-foreground leading-relaxed mt-0.5">
              חתולים חייבים חלבון מן החי לשרוד. דיאטת ירידה במשקל <span className="font-bold text-foreground">חייבת</span> לשמור על רמת חלבון גבוהה — 
              לעולם לא להפחית חלבון על חשבון קלוריות.
            </p>
          </div>
        </div>
      </div>

      {/* === Hepatic Risk Alert === */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-4 bg-destructive/8 rounded-xl border-2 border-destructive/30"
      >
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-destructive" strokeWidth={2} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-destructive mb-1">⚠️ סכנת כשל כבד — Hepatic Lipidosis</h4>
            <p className="text-[11px] text-foreground leading-relaxed font-medium">
              אזהרה: לעולם אין להרעיב חתול. ירידה במשקל חייבת להיות הדרגתית (1-2% בשבוע) למניעת כשל כבד.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['לעולם לא להרעיב', 'מעבר הדרגתי 7-10 ימים', 'מעקב שבועי'].map(item => (
                <span key={item} className="text-[9px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
