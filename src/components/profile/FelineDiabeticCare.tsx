/**
 * FelineDiabeticCare — Diabetic management UI for cats
 * Glucose regulator, remission tracker, feeding protocol, smart cross-sell
 */

import { motion } from "framer-motion";
import { useState } from "react";
import {
  Activity, TrendingDown, Clock, ShoppingBag, Droplets, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FelineDiabeticCareProps {
  petName: string;
  weight?: number;
}

export const FelineDiabeticCare = ({ petName, weight }: FelineDiabeticCareProps) => {
  const [remissionScore] = useState(64); // simulated remission potential %

  // Estimated daily caloric need for diabetic cat (lower end)
  const dailyKcal = weight ? Math.round(weight * 40) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-4"
      dir="rtl"
    >
      {/* === Glucose Regulator Dashboard === */}
      <div className="p-4 bg-muted/20 rounded-xl border border-border/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">ויסות גלוקוז — Glucose Regulator</h4>
            <p className="text-[10px] text-muted-foreground">אינדקס גליקמי נמוך + חלבון גבוה</p>
          </div>
        </div>

        {/* GI Explanation */}
        <div className="p-3 bg-card rounded-lg border border-border/15 mb-2.5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-blue-500" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold text-foreground">Low Glycemic Index</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                פחמימות מורכבות משתחררות <span className="font-bold text-foreground">לאט ובהדרגה</span> — מונע קפיצות סוכר פתאומיות לאחר הארוחה.
              </p>
            </div>
          </div>

          {/* Visual glucose curve */}
          <div className="flex items-end gap-1 h-10 mb-2">
            {[20, 35, 50, 55, 58, 55, 50, 45, 40, 38, 35, 33].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-blue-500/30 to-blue-400/60"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between">
            <span className="text-[8px] text-muted-foreground">ארוחה</span>
            <span className="text-[8px] text-blue-500 font-medium">עקומת גלוקוז יציבה</span>
            <span className="text-[8px] text-muted-foreground">4 שעות</span>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'אינדקס גליקמי', value: 'נמוך', color: 'text-blue-500 bg-blue-500/10' },
            { label: 'חלבון', value: '>45%', color: 'text-emerald-500 bg-emerald-500/10' },
            { label: 'פחמימות', value: '<15%', color: 'text-amber-500 bg-amber-500/10' },
          ].map(m => (
            <div key={m.label} className="p-2 bg-card rounded-lg border border-border/15 text-center">
              <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded", m.color)}>{m.value}</span>
              <p className="text-[10px] font-bold text-foreground mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        {dailyKcal && (
          <div className="mt-2.5 p-2 bg-card rounded-lg border border-border/15 text-center">
            <p className="text-[9px] text-muted-foreground">צריכת קלוריות יומית מומלצת</p>
            <p className="text-sm font-bold text-foreground">~{dailyKcal} קק״ל/יום</p>
            <p className="text-[8px] text-muted-foreground">מבוסס על {weight} ק״ג × 40 קק״ל/ק״ג</p>
          </div>
        )}
      </div>

      {/* === Remission Tracker === */}
      <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/15">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
          </div>
          <h4 className="text-xs font-bold text-foreground">פוטנציאל רמיסיה — Remission Tracker</h4>
        </div>

        <div className="p-3 bg-card rounded-lg border border-border/15">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-muted-foreground">סיכוי לרמיסיה</span>
            <span className="text-[11px] font-bold text-emerald-600">{remissionScore}%</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${remissionScore}%` }}
              transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-400"
            />
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            <span className="font-bold text-foreground">עד 30% מהחתולים הסוכרתיים</span> יכולים להגיע לרמיסיה מלאה 
            עם דיאטה קפדנית דלת-פחמימות בשילוב טיפול אינסולין מבוקר.
          </p>
          <div className="flex gap-2 mt-2">
            {['דיאטה קפדנית', 'מעקב גלוקוז', 'שיתוף וטרינר'].map(tag => (
              <span key={tag} className="text-[9px] bg-emerald-500/10 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                ✓ {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* === Feeding Protocol === */}
      <div className="p-4 bg-muted/20 rounded-xl border border-border/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">פרוטוקול האכלה — Feeding Protocol</h4>
            <p className="text-[10px] text-muted-foreground">תזמון ארוחות מותאם לזריקות אינסולין</p>
          </div>
        </div>

        <div className="space-y-2">
          {[
            { time: '07:00', label: 'ארוחת בוקר', sub: 'מיד לפני/אחרי זריקת אינסולין', icon: '🌅' },
            { time: '12:30', label: 'חטיף קטן (אופציונלי)', sub: 'ללא סוכר — חלבון בלבד', icon: '🕐' },
            { time: '19:00', label: 'ארוחת ערב', sub: 'מיד לפני/אחרי זריקת אינסולין', icon: '🌙' },
          ].map(meal => (
            <div key={meal.time} className="flex items-center gap-3 p-2.5 bg-card rounded-lg border border-border/15">
              <span className="text-sm">{meal.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">{meal.time}</span>
                  <span className="text-[10px] font-bold text-foreground">{meal.label}</span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">{meal.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2.5 p-2.5 bg-amber-500/8 rounded-lg border border-amber-500/20">
          <p className="text-[10px] text-foreground leading-relaxed">
            <span className="font-bold">חשוב:</span> עקביות בזמני האכלה היא קריטית. ארוחות בזמנים קבועים 
            מאפשרות שליטה טובה יותר ברמת הגלוקוז ומפחיתות סיכון ל<span className="font-bold">היפוגליקמיה</span>.
          </p>
        </div>
      </div>

      {/* === Smart Cross-Sell: Sugar-Free Treats === */}
      <div className="p-4 bg-muted/20 rounded-xl border border-border/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-violet-500" strokeWidth={1.5} />
          </div>
          <h4 className="text-xs font-bold text-foreground">חטיפים בטוחים — Sugar-Free Treats</h4>
        </div>

        <div className="p-3 bg-card rounded-lg border border-border/15">
          <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
            חטיפים רגילים עלולים לגרום ל<span className="font-bold text-destructive">קפיצות סוכר חדות</span>. 
            מומלץ להשתמש אך ורק בחטיפים ללא סוכר, על בסיס חלבון בלבד.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {['ללא סוכר מוסף', 'בסיס חלבון', 'אינדקס גליקמי נמוך', 'מאושר לסוכרתיים'].map(tag => (
              <span key={tag} className="text-[9px] bg-violet-500/10 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* === Cross-Condition: Carb/Sugar Filter Warning === */}
      <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <ShoppingBag className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground mb-1">סינון חנות חכם — Smart Shop Filter</h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              המערכת <span className="font-bold text-foreground">מסננת אוטומטית</span> חטיפים וממרחים עם סוכר מוסף או פחמימות גבוהות. 
              רק מוצרים עם אינדקס גליקמי נמוך יוצגו ב{petName ? `חנות של ${petName}` : 'חנות'}.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['חוסם סוכר', 'חוסם פחמימות >15%', 'מוצרים מאושרים בלבד'].map(tag => (
                <span key={tag} className="text-[9px] bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* === Obligate Carnivore Reminder === */}
      <div className="p-3 bg-muted/20 rounded-xl border border-border/20">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Droplets className="w-3.5 h-3.5 text-red-500" strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-foreground">טורף מחייב — Obligate Carnivore</h4>
            <p className="text-[9px] text-muted-foreground leading-relaxed mt-0.5">
              חתולים סוכרתיים <span className="font-bold text-foreground">חייבים</span> חלבון מן החי כמקור אנרגיה עיקרי. 
              דיאטה צמחית או דלת-חלבון עלולה להחמיר את המצב המטבולי באופן מסכן חיים.
            </p>
          </div>
        </div>
      </div>

      {/* === Safety Alert === */}
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
            <h4 className="text-xs font-bold text-destructive mb-1">⚠️ אזהרת היפוגליקמיה</h4>
            <p className="text-[11px] text-foreground leading-relaxed font-medium">
              לעולם אין לשנות דיאטה של חתול סוכרתי ללא תיאום עם וטרינר. שינוי פתאומי עלול לגרום להיפוגליקמיה מסכנת חיים.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['תיאום וטרינר חובה', 'מעבר הדרגתי 7-10 ימים', 'מעקב גלוקוז יומי'].map(item => (
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
