/**
 * FelineGastrointestinal — GI recovery & digestive health UI for cats
 * Rapid recovery dashboard, gut flora, hairball diagnostic, micro-meal guide, feeding matrix, cross-sell
 */

import { motion } from "framer-motion";
import { 
  AlertTriangle, Zap, Droplets, Shield, Utensils,
  ChevronDown, ChevronUp, Leaf, Info, Sparkles
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FelineGastrointestinalProps {
  petName: string;
  weight?: number;
}

const FEEDING_MATRIX = [
  { weight: 2, dry: 25, wet: 130 },
  { weight: 3, dry: 35, wet: 175 },
  { weight: 4, dry: 45, wet: 220 },
  { weight: 5, dry: 50, wet: 250 },
  { weight: 6, dry: 60, wet: 290 },
  { weight: 7, dry: 65, wet: 320 },
  { weight: 8, dry: 75, wet: 365 },
  { weight: 9, dry: 80, wet: 390 },
  { weight: 10, dry: 90, wet: 435 },
];

export const FelineGastrointestinal = ({ petName, weight }: FelineGastrointestinalProps) => {
  const [showFeedingTable, setShowFeedingTable] = useState(false);
  const [showHairballTip, setShowHairballTip] = useState(false);

  const matchedRow = weight
    ? FEEDING_MATRIX.reduce((prev, curr) =>
        Math.abs(curr.weight - weight) < Math.abs(prev.weight - weight) ? curr : prev
      )
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-4"
      dir="rtl"
    >
      {/* === Rapid Recovery Dashboard === */}
      <div className="p-4 bg-muted/20 rounded-xl border border-border/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">שיקום מהיר — Rapid Recovery</h4>
            <p className="text-[10px] text-muted-foreground">עיכול קל ואיזון אלקטרוליטים</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* High Digestibility */}
          <div className="p-3 bg-card rounded-lg border border-border/15 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
              <Zap className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
            </div>
            <span className="text-[11px] font-bold text-foreground block">נעכלות גבוהה</span>
            <span className="text-[9px] text-muted-foreground">High Digestibility</span>
            <p className="text-[9px] text-muted-foreground mt-1.5 leading-relaxed">
              חלבונים ושומנים קלים לספיגה — מפחיתים עומס על המעי הפגוע
            </p>
          </div>

          {/* Electrolyte Balance */}
          <div className="p-3 bg-card rounded-lg border border-border/15 text-center">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
              <Droplets className="w-5 h-5 text-blue-500" strokeWidth={1.5} />
            </div>
            <span className="text-[11px] font-bold text-foreground block">איזון אלקטרוליטים</span>
            <span className="text-[9px] text-muted-foreground">Electrolyte Balance</span>
            <p className="text-[9px] text-muted-foreground mt-1.5 leading-relaxed">
              נתרן, אשלגן ומגנזיום מאוזנים למניעת התייבשות
            </p>
          </div>
        </div>
      </div>

      {/* === Gut Flora Shield === */}
      <div className="p-4 bg-green-500/5 rounded-xl border border-green-500/15">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center">
            <Shield className="w-4 h-4 text-green-500" strokeWidth={1.5} />
          </div>
          <h4 className="text-xs font-bold text-foreground">מגן פלורת מעיים — FOS & MOS</h4>
        </div>
        <div className="p-3 bg-card rounded-lg border border-border/15">
          <p className="text-[11px] text-foreground leading-relaxed">
            ריכוז <span className="font-bold">פרה-ביוטיקה (FOS)</span> ו-<span className="font-bold">מאנן-אוליגוסכרידים (MOS)</span> משחזר 
            את אוכלוסיית החיידקים הבריאים במעי.
          </p>
          <div className="flex gap-2 mt-2.5">
            {[
              { label: 'FOS — מזין חיידקים טובים', color: 'bg-green-500/10 text-green-700' },
              { label: 'MOS — חוסם פתוגנים', color: 'bg-emerald-500/10 text-emerald-700' },
            ].map(item => (
              <span key={item.label} className={cn("text-[9px] px-2 py-1 rounded-full font-medium", item.color)}>
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* === Hairball Diagnostic Tip === */}
      <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/15">
        <button
          onClick={() => setShowHairballTip(!showHairballTip)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Info className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
            </div>
            <h4 className="text-xs font-bold text-foreground">האם זה כדור שיער? — טיפ אבחוני</h4>
          </div>
          {showHairballTip ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {showHairballTip && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3"
          >
            <div className="p-3 bg-card rounded-lg border border-amber-500/15">
              <p className="text-[11px] text-foreground leading-relaxed font-medium">
                הקאות תכופות אינן תמיד כדורי שיער. אם החתול מקיא יותר מפעמיים בחודש, המזון הזה עשוי לסייע בשיקום רירית המעי.
              </p>
              <div className="mt-2.5 p-2.5 bg-amber-500/5 rounded-lg">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground">סימנים ל-GI ולא Hairball:</span> הקאות ללא שיער, שלשולים, ירידה בתיאבון, 
                  שינוי בקונסיסטנציית הצואה, או רגישות בטנית.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* === Micro-Meal Feeding Guide === */}
      <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/15">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center">
            <Utensils className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
          </div>
          <h4 className="text-xs font-bold text-foreground">מנות מיקרו — Micro-Meal Protocol</h4>
        </div>
        <div className="p-3 bg-card rounded-lg border border-border/15">
          <p className="text-[11px] text-foreground leading-relaxed font-medium">
            חלקו את המנה היומית ל-<span className="font-bold">4–6 ארוחות קטנות</span> לאורך היום.
          </p>
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
            קיבת החתול קטנה יחסית. ארוחות גדולות מעמיסות על מערכת העיכול הפגועה ועלולות לגרום להקאות חוזרות. 
            מנות קטנות ותכופות מאפשרות ספיגה מיטבית.
          </p>
          {matchedRow && (
            <div className="mt-2.5 p-2 bg-primary/5 rounded-lg border border-primary/10">
              <p className="text-[10px] text-foreground">
                <span className="font-bold">{petName} ({matchedRow.weight} ק״ג):</span>{' '}
                כ-{Math.round(matchedRow.dry / 5)} גרם יבש × 5 ארוחות, או כ-{Math.round(matchedRow.wet / 5)} גרם רטוב × 5 ארוחות
              </p>
            </div>
          )}
        </div>
      </div>

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
              <h4 className="text-xs font-bold text-foreground">טבלת מינון — Health & Care GI</h4>
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
              <div className="grid grid-cols-3 bg-muted/40 px-3 py-2">
                <span className="text-[10px] font-bold text-foreground">משקל (ק״ג)</span>
                <span className="text-[10px] font-bold text-foreground text-center">יבש (גר׳/יום)</span>
                <span className="text-[10px] font-bold text-foreground text-center">רטוב (גר׳/יום)</span>
              </div>
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
              * חלקו ל-4–6 ארוחות קטנות. בשלב שיקום — מזון רפואי GI בלבד, ללא חטיפים.
            </p>
          </motion.div>
        )}
      </div>

      {/* === Smart Cross-Sell === */}
      <div className="p-4 bg-muted/20 rounded-xl border border-border/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Leaf className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">תוספי שיקום מומלצים</h4>
            <p className="text-[10px] text-muted-foreground">הבחנה בין בעיות עיכול לכדורי שיער</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Cat Grass */}
          <div className="p-3 bg-card rounded-lg border border-border/15">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-green-500" strokeWidth={1.5} />
              <span className="text-[11px] font-bold text-foreground">דשא לחתולים</span>
            </div>
            <p className="text-[9px] text-muted-foreground leading-relaxed">
              מסייע להוצאת כדורי שיער באופן טבעי ומספק סיבים. אם ההקאות פוחתות עם דשא — הבעיה היא Hairball.
            </p>
          </div>

          {/* Malt Paste */}
          <div className="p-3 bg-card rounded-lg border border-border/15">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.5} />
              <span className="text-[11px] font-bold text-foreground">משחת מאלט</span>
            </div>
            <p className="text-[9px] text-muted-foreground leading-relaxed">
              משחה שמשמנת את מערכת העיכול ומסייעת בהעברת שיער. אם ההקאות נמשכות — הבעיה היא GI.
            </p>
          </div>
        </div>
      </div>

      {/* === GI Warning === */}
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
            <h4 className="text-xs font-bold text-destructive mb-1">⚠️ מתי לפנות לווטרינר</h4>
            <p className="text-[11px] text-foreground leading-relaxed font-medium">
              אם {petName} מקיא/ה יותר מ-24 שעות, יש דם בהקאות או בצואה, או שיש סימני התייבשות (חניכיים יבשות, עור לא אלסטי) — יש לפנות לווטרינר מיד.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
