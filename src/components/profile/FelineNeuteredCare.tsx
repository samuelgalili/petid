/**
 * FelineNeuteredCare — Metabolic, satiety & urinary UI for neutered/sterilized cats
 */

import { motion } from "framer-motion";
import { 
  Activity, Leaf, Shield, Droplets, AlertTriangle
} from "lucide-react";

interface FelineNeuteredCareProps {
  petName: string;
  isMale?: boolean;
}

export const FelineNeuteredCare = ({ petName, isMale }: FelineNeuteredCareProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-4"
      dir="rtl"
    >
      {/* === Metabolic Balance Gauge === */}
      <div className="p-4 bg-muted/20 rounded-xl border border-border/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-orange-500" strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">איזון מטבולי — Metabolic Balance</h4>
            <p className="text-[10px] text-muted-foreground">פיצוי על ירידה של 30% בצריכת אנרגיה</p>
          </div>
        </div>

        {/* Energy drop visual */}
        <div className="p-3 bg-card rounded-lg border border-border/15 mb-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground">לפני עיקור</span>
            <span className="text-[10px] text-muted-foreground">אחרי עיקור</span>
          </div>
          <div className="flex gap-2 items-end">
            {/* Before bar */}
            <div className="flex-1">
              <div className="h-8 bg-amber-500/20 rounded-md flex items-center justify-center border border-amber-500/20">
                <span className="text-[10px] font-bold text-amber-700">100% אנרגיה</span>
              </div>
            </div>
            {/* Arrow */}
            <span className="text-muted-foreground text-xs pb-1">→</span>
            {/* After bar */}
            <div className="flex-1">
              <div className="h-8 bg-red-500/15 rounded-md flex items-center justify-center border border-red-500/20">
                <span className="text-[10px] font-bold text-red-600">70% אנרגיה</span>
              </div>
            </div>
          </div>
          <div className="mt-2.5 p-2 bg-primary/5 rounded-lg border border-primary/10">
            <p className="text-[10px] text-foreground leading-relaxed">
              <span className="font-bold">ירידה של ~30%</span> בצריכת אנרגיה לאחר עיקור. מזון Neutered/Sterilized מפחית קלוריות 
              תוך שמירה על כל הוויטמינים והמינרלים הנדרשים ל-{petName}.
            </p>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'קלוריות', value: 'מופחתות', sub: '-30%', color: 'text-red-500 bg-red-500/10' },
            { label: 'ויטמינים', value: 'מלאים', sub: '100%', color: 'text-green-500 bg-green-500/10' },
            { label: 'L-Carnitine', value: 'מוגבר', sub: 'שריפת שומן', color: 'text-blue-500 bg-blue-500/10' },
          ].map(m => (
            <div key={m.label} className="p-2 bg-card rounded-lg border border-border/15 text-center">
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${m.color}`}>{m.value}</span>
              <p className="text-[10px] font-bold text-foreground mt-1">{m.label}</p>
              <p className="text-[8px] text-muted-foreground">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* === Satiety Tech === */}
      <div className="p-4 bg-green-500/5 rounded-xl border border-green-500/15">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center">
            <Leaf className="w-4 h-4 text-green-500" strokeWidth={1.5} />
          </div>
          <h4 className="text-xs font-bold text-foreground">טכנולוגיית שובע — Satiety Fiber</h4>
        </div>
        <div className="p-3 bg-card rounded-lg border border-border/15">
          <p className="text-[11px] text-foreground leading-relaxed">
            ריכוז <span className="font-bold">סיבים תזונתיים גבוה</span> יוצר תחושת שובע ממושכת — גם כשהקלוריות נמוכות יותר.
          </p>
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
            חתולים מעוקרים נוטים לתיאבון מוגבר ולחיפוש מזון מתמיד. סיבים מסיסים ובלתי-מסיסים מאטים את הריקון מהקיבה 
            ומפחיתים התנהגות של "קיבוץ מזון" (food begging).
          </p>
          <div className="flex gap-2 mt-2.5">
            {[
              { label: 'שובע ממושך', icon: '✓' },
              { label: 'פחות חיפוש מזון', icon: '✓' },
              { label: 'עיכול בריא', icon: '✓' },
            ].map(item => (
              <span key={item.label} className="text-[9px] bg-green-500/10 text-green-700 px-2 py-1 rounded-full font-medium flex items-center gap-0.5">
                <span className="text-green-500">{item.icon}</span> {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* === Urinary Prevention === */}
      <div className="p-4 bg-cyan-500/5 rounded-xl border border-cyan-500/15">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-cyan-500/15 flex items-center justify-center">
            <Shield className="w-4 h-4 text-cyan-500" strokeWidth={1.5} />
          </div>
          <h4 className="text-xs font-bold text-foreground">הגנת שתן — Urinary pH Control</h4>
        </div>
        <div className="p-3 bg-card rounded-lg border border-border/15">
          <p className="text-[11px] text-foreground leading-relaxed">
            בניגוד למזון רגיל, פורמולה זו <span className="font-bold">שומרת על pH שתן בטווח בטוח</span> (6.0–6.5) 
            למניעת היווצרות גבישי סטרוביט.
          </p>
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
            חתולים מעוקרים — {isMale ? (
              <span className="font-bold text-destructive">במיוחד זכרים</span>
            ) : 'ובפרט זכרים'} — בסיכון גבוה פי 3 לפתח בעיות בדרכי השתן. 
            מגנזיום מופחת ובקרת pH מספקים שכבת הגנה חיונית.
          </p>
        </div>
        
        {/* Hydration reminder */}
        <div className="flex items-center gap-2 mt-2.5 p-2.5 bg-blue-500/5 rounded-lg border border-blue-500/10">
          <Droplets className="w-4 h-4 text-blue-500 flex-shrink-0" strokeWidth={1.5} />
          <p className="text-[10px] text-foreground leading-relaxed">
            <span className="font-bold">שילוב מזון רטוב</span> מומלץ במיוחד לחתולים מעוקרים — מגביר נפח שתן ומדלל ריכוז מינרלים.
          </p>
        </div>
      </div>

      {/* === Neutered Male Warning === */}
      {isMale && (
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
              <h4 className="text-xs font-bold text-destructive mb-1">⚠️ סיכון מוגבר — חתול זכר מעוקר</h4>
              <p className="text-[11px] text-foreground leading-relaxed font-medium">
                {petName} כזכר מעוקר נמצא בקבוצת הסיכון הגבוהה ביותר לחסימת שתן. הקפידו על מזון Urinary/Neutered, 
                מים זמינים תמיד, ומעקב אחר תדירות השתנה.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
