import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, FlaskConical, ShieldCheck, Brain,
  Microscope, BookOpen, ArrowLeft, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScienceBadge } from '@/components/ui/ScienceBadge';

const pillars = [
  {
    icon: FlaskConical,
    title: 'NRC 2006 Standards',
    titleHe: 'תקני NRC 2006',
    description:
      'האלגוריתמים התזונתיים שלנו מבוססים על נתוני ה-National Research Council — מחקר עמיתים (peer-reviewed) שמגדיר את הצרכים התזונתיים המדויקים לכל גזע, גיל, ומצב בריאותי. כל המלצה עוברת אימות מול הנחיות אלו.',
    accent: 'bg-primary/5 border-primary/10',
    iconBg: 'bg-primary/10',
  },
  {
    icon: Microscope,
    title: 'Clinical Verification',
    titleHe: 'אימות קליני',
    description:
      'כל מוצר בקטלוג הגלובלי שלנו עובר תהליך סינון קפדני. אנו בוחנים מחקרים קליניים מפורסמים, בודקים את הרכב המרכיבים, ומוודאים שהמוצר עומד בסטנדרטים של רפואה וטרינרית מבוססת ראיות (Evidence-Based Veterinary Medicine).',
    accent: 'bg-primary/5 border-primary/10',
    iconBg: 'bg-primary/10',
  },
  {
    icon: Brain,
    title: 'AI Integrity',
    titleHe: 'יושרה של בינה מלאכותית',
    description:
      'העוזרים הדיגיטליים שלנו — Danny ו-Sarah — פועלים בגבולות מידע וטרינרי מאומת בלבד. הם אינם ממציאים עובדות, אינם מניחים הנחות רפואיות, ומסמנים בבירור כאשר נדרשת התייעצות עם וטרינר מוסמך.',
    accent: 'bg-primary/5 border-primary/10',
    iconBg: 'bg-primary/10',
  },
];

const ScienceTrust = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-5 h-14 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <span className="text-[15px] font-semibold tracking-tight">מדע ואמון</span>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-10 space-y-14">
        {/* ─── Hero ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-5"
        >
          <div className="flex justify-center">
            <ScienceBadge size="lg" label="Science-Verified" />
          </div>

          <h1 className="text-[28px] sm:text-[34px] font-bold leading-tight tracking-tight">
            The PetID Scientific Standard
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Why Data Matters — כל החלטה ב-PetID מבוססת על מידע מדעי מאומת,
            לא על שיווק או ניחושים.
          </p>
        </motion.div>

        {/* ─── Pillars ─── */}
        <div className="space-y-5">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.1 }}
                className={`rounded-[24px] border p-6 sm:p-8 ${pillar.accent}`}
              >
                <div className="flex items-start gap-5">
                  <div className={`w-12 h-12 rounded-2xl ${pillar.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="space-y-2 flex-1">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">
                        {pillar.title}
                      </p>
                      <h2 className="text-lg font-bold mt-0.5">{pillar.titleHe}</h2>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ─── The Badge Section ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-[24px] border border-border/50 bg-card p-6 sm:p-8 text-center space-y-5"
        >
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">
            THE BADGE
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <ScienceBadge size="sm" />
            <ScienceBadge size="md" label="Science-Verified" />
            <ScienceBadge size="lg" label="PetID Verified · NRC 2006" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            התג הזה מופיע על מוצרים, המלצות, ותכנים שעברו את תהליך האימות המדעי שלנו.
            כשאתם רואים אותו — אתם יודעים שהמידע מגובה במחקר.
          </p>
        </motion.div>

        {/* ─── Footer CTA ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center space-y-4 pb-8"
        >
          <div className="w-px h-10 bg-border mx-auto" />
          <p className="text-sm text-muted-foreground">
            רוצים לראות תובנות בריאותיות מותאמות לגזע שלכם?
          </p>
          <Button
            variant="outline"
            className="rounded-2xl h-11 px-6 text-sm gap-2"
            onClick={() => navigate('/breeds')}
          >
            <Sparkles className="w-4 h-4" strokeWidth={1.5} />
            אנציקלופדיית גזעים ותובנות בריאות
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default ScienceTrust;
