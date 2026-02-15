/**
 * FelineUrinarySupport — Struvite/FLUTD management UI for cats
 * pH gauge, mineral safety, hydration advice, treatment timeline, feeding matrix
 */

import { motion } from "framer-motion";
import { 
  Droplets, Shield, AlertTriangle, Clock, 
  Utensils, Activity, ChevronDown, ChevronUp 
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FelineUrinarySupportProps {
  petName: string;
  isNeutered?: boolean;
  isMale?: boolean;
  weight?: number;
}

// Vet Life Cat Struvite feeding matrix (grams/day)
const FEEDING_MATRIX = [
  { weight: 2, dry: 30, wet: 150 },
  { weight: 3, dry: 40, wet: 200 },
  { weight: 4, dry: 50, wet: 250 },
  { weight: 5, dry: 55, wet: 275 },
  { weight: 6, dry: 65, wet: 325 },
  { weight: 7, dry: 70, wet: 350 },
  { weight: 8, dry: 80, wet: 400 },
  { weight: 9, dry: 85, wet: 425 },
  { weight: 10, dry: 95, wet: 475 },
];

const PH_TARGET = { min: 6.0, max: 6.3, absoluteMin: 5.5, absoluteMax: 7.5 };

export const FelineUrinarySupport = ({ petName, isNeutered, isMale, weight }: FelineUrinarySupportProps) => {
  const [showFeedingTable, setShowFeedingTable] = useState(false);

  // Find closest weight row
  const matchedRow = weight 
    ? FEEDING_MATRIX.reduce((prev, curr) => 
        Math.abs(curr.weight - weight) < Math.abs(prev.weight - weight) ? curr : prev
      )
    : null;

  // pH gauge position (0-100% for range 5.5 to 7.5)
  const phTargetStartPct = ((PH_TARGET.min - PH_TARGET.absoluteMin) / (PH_TARGET.absoluteMax - PH_TARGET.absoluteMin)) * 100;
  const phTargetEndPct = ((PH_TARGET.max - PH_TARGET.absoluteMin) / (PH_TARGET.absoluteMax - PH_TARGET.absoluteMin)) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-4"
      dir="rtl"
    >
      {/* === pH Balance Dashboard === */}
      <div className="p-4 bg-muted/20 rounded-xl border border-border/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-cyan-500" strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">מד pH — טווח יעד</h4>
            <p className="text-[10px] text-muted-foreground">חומציות שמ"מסה" את הגבישים</p>
          </div>
        </div>

        {/* pH Gauge */}
        <div className="relative h-8 bg-gradient-to-l from-red-400/20 via-green-400/20 to-amber-400/20 rounded-lg overflow-hidden mb-2">
          {/* Target zone highlight */}
          <div 
            className="absolute top-0 bottom-0 bg-green-500/25 border-x-2 border-green-500/50"
            style={{ 
              right: `${100 - phTargetEndPct}%`,
              width: `${phTargetEndPct - phTargetStartPct}%` 
            }}
          />
          {/* Scale labels */}
          <div className="absolute inset-0 flex items-center justify-between px-2">
            <span className="text-[9px] font-mono text-muted-foreground">7.5</span>
            <span className="text-[9px] font-mono text-muted-foreground">5.5</span>
          </div>
          {/* Target arrow */}
          <div 
            className="absolute top-0 bottom-0 flex items-center"
            style={{ right: `${100 - ((6.15 - PH_TARGET.absoluteMin) / (PH_TARGET.absoluteMax - PH_TARGET.absoluteMin)) * 100}%` }}
          >
            <div className="w-0.5 h-full bg-green-600" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">בסיסי (אבני סטרוביט)</span>
          <span className="text-[10px] font-bold text-green-600">יעד: 6.0 – 6.3</span>
          <span className="text-[10px] text-muted-foreground">חומצי מדי</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
          pH בטווח 6.0–6.3 יוצר סביבה חומצית מספיק כדי <span className="font-bold text-foreground">להמיס גבישי סטרוביט</span> קיימים ולמנוע היווצרות חדשים.
        </p>
      </div>

      {/* === Mineral Safety Shield === */}
      <div className="p-4 bg-muted/20 rounded-xl border border-border/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">מגן מינרלים — Mineral Safety</h4>
            <p className="text-[10px] text-muted-foreground">בקרה על מגנזיום, זרחן וסידן</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {/* Magnesium */}
          <div className="flex items-center gap-3 p-2.5 bg-card rounded-lg border border-border/15">
            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground">מגנזיום מופחת</span>
                <span className="text-[9px] font-mono bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded">קריטי #1</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                מגנזיום גבוה הוא <span className="font-bold text-destructive">הגורם מספר 1</span> לחסימות שתן בחתולים{isMale ? ' זכרים' : ''}. 
                מזון Urinary חייב להכיל רמות מגנזיום נמוכות במיוחד.
              </p>
            </div>
          </div>

          {/* Phosphorus */}
          <div className="flex items-center gap-3 p-2.5 bg-card rounded-lg border border-border/15">
            <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground">זרחן מבוקר</span>
                <span className="text-[9px] font-mono bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded">חשוב</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                זרחן מוגבל תומך בתפקוד הכליות ומפחית עומס מטבולי, במיוחד בחתולים מבוגרים.
              </p>
            </div>
          </div>

          {/* Calcium */}
          <div className="flex items-center gap-3 p-2.5 bg-card rounded-lg border border-border/15">
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground">סידן מאוזן</span>
                <span className="text-[9px] font-mono bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded">נדרש</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                יחס סידן-זרחן מאוזן חיוני לשמירה על בריאות העצמות ומניעת הסתיידות.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* === Hydration Booster === */}
      <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/15">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center">
            <Droplets className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
          </div>
          <h4 className="text-xs font-bold text-foreground">מאיץ לחות — Wet Food חובה</h4>
        </div>
        <div className="p-3 bg-card rounded-lg border border-border/15">
          <p className="text-[11px] text-foreground leading-relaxed font-medium">
            מומלץ לשלב מזון רטוב (שימורים רפואיים) כדי להגדיל את נפח השתן ולשטוף את המערכת.
          </p>
          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
            מזון רטוב מכיל 80%+ לחות — קריטי לחתולים שכמעט לא שותים באופן טבעי. 
            הגדלת נפח השתן מדללת את ריכוז המינרלים ומונעת היווצרות גבישים.
          </p>
        </div>
      </div>

      {/* === Treatment Duration Timeline === */}
      <div className="p-4 bg-muted/20 rounded-xl border border-border/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-purple-500" strokeWidth={1.5} />
          </div>
          <h4 className="text-xs font-bold text-foreground">ציר זמן טיפולי</h4>
        </div>

        <div className="relative mr-4">
          {/* Timeline line */}
          <div className="absolute right-0 top-2 bottom-2 w-0.5 bg-border/40" />
          
          {/* Phase 1: Dissolution */}
          <div className="relative pr-6 pb-5">
            <div className="absolute right-[-5px] top-1 w-3 h-3 rounded-full bg-amber-500 border-2 border-card" />
            <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/15">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-foreground">שלב 1: המסה (Dissolution)</span>
                <span className="text-[10px] font-mono text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">5–12 שבועות</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                מזון רפואי ייעודי (כגון Vet Life Struvite) ממיס את הגבישים הקיימים. 
                יש להקפיד על מזון זה בלבד — ללא חטיפים או תוספות.
              </p>
            </div>
          </div>

          {/* Phase 2: Prevention */}
          <div className="relative pr-6">
            <div className="absolute right-[-5px] top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-card" />
            <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/15">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-foreground">שלב 2: מניעה (Prevention)</span>
                <span className="text-[10px] font-mono text-green-600 bg-green-500/10 px-2 py-0.5 rounded">עד 6 חודשים</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                לאחר המסה מוצלחת, מעבר למזון מניעתי Urinary לשמירה על pH אופטימלי ומניעת הישנות.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* === EMERGENCY WARNING === */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-4 bg-destructive/8 rounded-xl border-2 border-destructive/30"
      >
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-4.5 h-4.5 text-destructive" strokeWidth={2} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-destructive mb-1">⚠️ אזהרת חירום — חסימת שתן</h4>
            <p className="text-[11px] text-foreground leading-relaxed font-medium">
              סכנה: אם החתול מנסה להשתין ללא הצלחה, יש לפנות לווטרינר חירום מיד! חסימת שתן היא מצב מסכן חיים.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['ניסיונות שתן תכופים', 'ייללות בארגז', 'ליקוק אזור מוגזם', 'בטן נפוחה/רגישה'].map(symptom => (
                <span key={symptom} className="text-[9px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
                  {symptom}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* === Feeding Matrix === */}
      <div className="p-4 bg-muted/20 rounded-xl border border-border/20">
        <button
          onClick={() => setShowFeedingTable(!showFeedingTable)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <Utensils className="w-4 h-4 text-green-500" strokeWidth={1.5} />
            </div>
            <div className="text-right">
              <h4 className="text-xs font-bold text-foreground">טבלת מינון — Vet Life Struvite</h4>
              <p className="text-[10px] text-muted-foreground">גרם ליום לפי משקל</p>
            </div>
          </div>
          {showFeedingTable ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {showFeedingTable && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3"
          >
            <div className="rounded-lg border border-border/20 overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-3 bg-muted/40 px-3 py-2">
                <span className="text-[10px] font-bold text-foreground">משקל (ק״ג)</span>
                <span className="text-[10px] font-bold text-foreground text-center">יבש (גר׳/יום)</span>
                <span className="text-[10px] font-bold text-foreground text-center">רטוב (גר׳/יום)</span>
              </div>
              {/* Rows */}
              {FEEDING_MATRIX.map((row) => {
                const isMatch = matchedRow?.weight === row.weight;
                return (
                  <div 
                    key={row.weight} 
                    className={cn(
                      "grid grid-cols-3 px-3 py-2 border-t border-border/10 transition-colors",
                      isMatch && "bg-primary/8 border-r-2 border-r-primary"
                    )}
                  >
                    <span className={cn("text-[10px]", isMatch ? "font-bold text-foreground" : "text-muted-foreground")}>
                      {row.weight} ק״ג {isMatch && `(${petName})`}
                    </span>
                    <span className={cn("text-[10px] text-center", isMatch ? "font-bold text-foreground" : "text-muted-foreground")}>
                      {row.dry}
                    </span>
                    <span className={cn("text-[10px] text-center", isMatch ? "font-bold text-foreground" : "text-muted-foreground")}>
                      {row.wet}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-muted-foreground mt-2 leading-relaxed">
              * כמויות מומלצות ליום. יש לחלק ל-2–3 ארוחות. בשלב ההמסה — מזון רפואי בלבד, ללא חטיפים.
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
