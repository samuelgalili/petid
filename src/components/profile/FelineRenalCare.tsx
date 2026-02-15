/**
 * FelineRenalCare — CKD/Renal management UI for cats
 * Kidney dashboard, appetite badge, litter box insight, vet warning
 */

import { motion } from "framer-motion";
import { 
  AlertTriangle, Heart, Sparkles, Droplets, Activity
} from "lucide-react";

interface FelineRenalCareProps {
  petName: string;
  isSenior?: boolean;
}

export const FelineRenalCare = ({ petName, isSenior }: FelineRenalCareProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-4"
      dir="rtl"
    >
      {/* === Kidney Protection Dashboard === */}
      <div className="p-4 bg-muted/20 rounded-xl border border-border/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-rose-500" strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">לוח הגנת כליות — Renal Dashboard</h4>
            <p className="text-[10px] text-muted-foreground">הפחתת עומס מטבולי על הכליות</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {/* Ultra-Low Phosphorus */}
          <div className="flex items-center gap-3 p-2.5 bg-card rounded-lg border border-border/15">
            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground">זרחן נמוך במיוחד</span>
                <span className="text-[9px] font-mono bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded">קריטי</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                זרחן עודף מאיץ את <span className="font-bold text-foreground">הרס רקמת הכליה</span>. 
                מזון Renal מכיל רמות זרחן מינימליות כדי להאט את התקדמות ה-CKD ולהאריך את חיי החתול.
              </p>
            </div>
          </div>

          {/* Controlled Protein */}
          <div className="flex items-center gap-3 p-2.5 bg-card rounded-lg border border-border/15">
            <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground">חלבון מבוקר ואיכותי</span>
                <span className="text-[9px] font-mono bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded">חשוב</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                כמות חלבון מופחתת אך <span className="font-bold text-foreground">באיכות גבוהה במיוחד</span> — 
                מפחיתה רעלנים אורמיים מבלי לגרום לאובדן מסת שריר.
              </p>
            </div>
          </div>

          {/* Omega-3 / Anti-inflammatory */}
          <div className="flex items-center gap-3 p-2.5 bg-card rounded-lg border border-border/15">
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground">אומגה-3 נוגד דלקת</span>
                <span className="text-[9px] font-mono bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded">תומך</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                חומצות שומן EPA ו-DHA מפחיתות דלקת כלייתית ומגינות על הנפרונים הנותרים.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* === Appetite Stimulator Badge === */}
      <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/15">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
          </div>
          <h4 className="text-xs font-bold text-foreground">מעודד תיאבון — Palatability</h4>
        </div>
        <div className="p-3 bg-card rounded-lg border border-border/15">
          <p className="text-[11px] text-foreground leading-relaxed">
            מזון Renal מעוצב עם <span className="font-bold">טעימות גבוהה במיוחד</span> כדי לעודד חתולים
            {isSenior ? ' מבוגרים' : ''} עם ירידה בתיאבון לאכול.
          </p>
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
            ירידה בתיאבון היא מ<span className="font-bold text-foreground">הסימנים הראשונים</span> של CKD. 
            גרגירים בצורה וטקסטורה ייחודיים מגבירים את הרצון לאכול ומונעים אנורקסיה כלייתית.
          </p>
        </div>
      </div>

      {/* === Litter Box Insight === */}
      <div className="p-4 bg-green-500/5 rounded-xl border border-green-500/15">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center">
            <Droplets className="w-4 h-4 text-green-500" strokeWidth={1.5} />
          </div>
          <h4 className="text-xs font-bold text-foreground">תובנת ארגז חול — Toxin Reduction</h4>
        </div>
        <div className="p-3 bg-card rounded-lg border border-border/15">
          <p className="text-[11px] text-foreground leading-relaxed">
            מזון Renal <span className="font-bold">מפחית את העומס הרעלני בדם</span> (אוריאה וקראטינין) — 
            מה שמשפר ישירות את מצב הרוח, האנרגיה והחיוניות של {petName}.
          </p>
          <div className="flex gap-2 mt-2.5">
            {[
              { label: 'פחות הקאות', icon: '✓' },
              { label: 'יותר אנרגיה', icon: '✓' },
              { label: 'שתן בהיר יותר', icon: '✓' },
            ].map(item => (
              <span key={item.label} className="text-[9px] bg-green-500/10 text-green-700 px-2 py-1 rounded-full font-medium flex items-center gap-0.5">
                <span className="text-green-500">{item.icon}</span> {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* === Hydration Reminder === */}
      <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/15">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
          <p className="text-[10px] text-foreground leading-relaxed">
            <span className="font-bold">שילוב מזון רטוב</span> חיוני לחתולים עם CKD — מגדיל צריכת נוזלים ומסייע לכליות לסנן רעלנים ביעילות.
          </p>
        </div>
      </div>

      {/* === Mandatory Veterinary Warning === */}
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
            <h4 className="text-xs font-bold text-destructive mb-1">⚠️ מעקב וטרינרי חובה — CKD</h4>
            <p className="text-[11px] text-foreground leading-relaxed font-medium">
              מחלת כליות בחתולים דורשת מעקב וטרינרי צמוד ובדיקות דם תקופתיות. וודאו גישה למים טריים ב-3 מוקדים שונים בבית.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['בדיקת דם כל 3 חודשים', 'מדידת לחץ דם', 'בדיקת שתן', 'מעקב משקל שבועי'].map(item => (
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
