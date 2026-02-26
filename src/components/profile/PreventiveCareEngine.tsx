/**
 * PreventiveCareEngine - Weight tracking, dental milestones, deworming,
 * emergency quick-dial, and personalized "Next Steps" list
 */

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale, AlertTriangle, Phone, ChevronLeft, Sparkles,
  Pill, Baby, MapPin, X, ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PreventiveCareEngineProps {
  petId: string;
  petName: string;
  breed?: string;
  birthDate?: string;
  petType: 'dog' | 'cat';
}

interface WeightEntry {
  weight: number;
  date: string;
}

const isShihTzu = (breed?: string) => {
  if (!breed) return false;
  const lower = breed.toLowerCase();
  return lower.includes('shih tzu') || lower.includes('שיצו') || lower.includes('שי טסו');
};

// Expected weight ranges for Shih Tzu puppies (kg by month)
const SHIH_TZU_WEIGHT: Record<number, { min: number; max: number }> = {
  2: { min: 0.9, max: 1.8 },
  3: { min: 1.4, max: 2.7 },
  4: { min: 1.8, max: 3.2 },
  5: { min: 2.3, max: 4.1 },
  6: { min: 2.7, max: 4.5 },
  9: { min: 3.6, max: 5.9 },
  12: { min: 4.5, max: 7.3 },
};

export const PreventiveCareEngine = ({
  petId, petName, breed, birthDate, petType
}: PreventiveCareEngineProps) => {
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [lastDeworming, setLastDeworming] = useState<string | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);

  const ageMonths = useMemo(() => {
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    return Math.floor((Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30));
  }, [birthDate]);

  useEffect(() => {
    const fetchData = async () => {
      const [petResult, visitResult] = await Promise.all([
        supabase.from("pets").select("weight").eq("id", petId).maybeSingle(),
        supabase
          .from("pet_vet_visits")
          .select("raw_summary, visit_date")
          .eq("pet_id", petId)
          .order("visit_date", { ascending: false })
          .limit(10),
      ]);

      if (petResult.data?.weight) setCurrentWeight(petResult.data.weight as number);

      // Check for deworming in recent visits
      const visits = visitResult.data || [];
      for (const v of visits) {
        const summary = ((v as any).raw_summary || '').toLowerCase();
        if (summary.includes('תילוע') || summary.includes('deworm') || summary.includes('milbemax') || summary.includes('drontal')) {
          setLastDeworming((v as any).visit_date);
          break;
        }
      }
    };
    fetchData();
  }, [petId]);

  // Weight alert for Shih Tzu puppies
  const weightAlert = useMemo(() => {
    if (!currentWeight || !isShihTzu(breed) || ageMonths < 2 || ageMonths > 12) return null;
    const closest = Object.keys(SHIH_TZU_WEIGHT)
      .map(Number)
      .reduce((prev, curr) => Math.abs(curr - ageMonths) < Math.abs(prev - ageMonths) ? curr : prev);
    const range = SHIH_TZU_WEIGHT[closest];
    if (!range) return null;

    if (currentWeight < range.min) return { type: 'low' as const, msg: `${petName} שוקלת פחות מהצפוי (${range.min}-${range.max} ק"ג). יש לבדוק תזונה.` };
    if (currentWeight > range.max) return { type: 'high' as const, msg: `${petName} שוקלת יותר מהצפוי (${range.min}-${range.max} ק"ג). יש להתאים מנה.` };
    return null;
  }, [currentWeight, breed, ageMonths, petName]);

  // Deworming reminder
  const dewormingAlert = useMemo(() => {
    if (!lastDeworming) return { needed: true, msg: 'לא זוהה תילוע — מומלץ כל 3-6 חודשים' };
    const monthsSince = (Date.now() - new Date(lastDeworming).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsSince >= 6) return { needed: true, msg: `תילוע אחרון לפני ${Math.round(monthsSince)} חודשים — יש לחדש` };
    return null;
  }, [lastDeworming]);

  // Dental teething alert (4-6 months)
  const teethingAlert = ageMonths >= 4 && ageMonths <= 6;

  // Next steps list
  const nextSteps = useMemo(() => {
    const steps: { text: string; icon: string }[] = [];
    
    if (ageMonths >= 2 && ageMonths <= 16) {
      // Calculate next vaccine
      const vaccineWeeks = [6, 9, 12, 16];
      const ageWeeks = ageMonths * 4.3;
      const next = vaccineWeeks.find(w => w > ageWeeks);
      if (next && birthDate) {
        const nextDate = new Date(birthDate);
        nextDate.setDate(nextDate.getDate() + next * 7);
        const daysUntil = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntil > 0 && daysUntil < 60) {
          steps.push({ text: `בעוד ${daysUntil} ימים: חיסון בשבוע ${next}`, icon: '💉' });
        }
      }
    }

    if (teethingAlert) {
      steps.push({ text: 'טיפ: זה הזמן להתחיל להרגיל את ' + petName + ' למברשת שיניים לפני ששיני הקבע יוצאות', icon: '🦷' });
    }

    if (dewormingAlert?.needed) {
      steps.push({ text: dewormingAlert.msg, icon: '💊' });
    }

    if (weightAlert) {
      steps.push({ text: weightAlert.msg, icon: '⚖️' });
    }

    if (ageMonths <= 4) {
      steps.push({ text: `סוציאליזציה: חשוב לחשוף את ${petName} לגירויים שונים בשבועות הקרובים`, icon: '🐾' });
    }

    return steps;
  }, [ageMonths, birthDate, teethingAlert, dewormingAlert, weightAlert, petName]);

  // Teething chew toy recommendations
  const teethingProducts = [
    { name: 'צעצוע לעיסה מצנן', desc: 'מרגיע חניכיים — אפשר להקפיא לאפקט מוגבר' },
    { name: 'Kong Puppy', desc: 'ממלאים בחטיף — מפנה אנרגיה מריהוט' },
    { name: 'חבל קשר כותנה', desc: 'בטוח ללסתות צעירות — מנקה שיניים באופן טבעי' },
  ];

  const hasAlerts = weightAlert || dewormingAlert?.needed || teethingAlert || nextSteps.length > 0;

  if (!hasAlerts) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mb-4 space-y-3"
      >
        {/* Weight Alert */}
        {weightAlert && (
          <div className={`p-3 rounded-2xl border ${weightAlert.type === 'low' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <div className="flex items-start gap-2.5">
              <Scale className={`w-4 h-4 mt-0.5 ${weightAlert.type === 'low' ? 'text-amber-500' : 'text-red-500'}`} strokeWidth={1.5} />
              <div>
                <p className="text-xs font-semibold text-foreground">התראת משקל</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{weightAlert.msg}</p>
              </div>
            </div>
          </div>
        )}

        {/* Dental Teething Alert */}
        {teethingAlert && (
          <div className="p-3 rounded-2xl border bg-purple-500/5 border-purple-500/20">
            <div className="flex items-start gap-2.5">
              <Baby className="w-4 h-4 mt-0.5 text-purple-500" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground">🦷 שיני חלב — תקופת החלפה</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {petName} בגיל {ageMonths} חודשים — שיני הקבע מתחילות לצאת. צעצועי לעיסה מומלצים:
                </p>
                <div className="space-y-1.5 mt-2">
                  {teethingProducts.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 p-1.5 bg-muted/20 rounded-lg">
                      <span className="text-[10px]">🦴</span>
                      <div>
                        <p className="text-[10px] font-medium text-foreground">{p.name}</p>
                        <p className="text-[9px] text-muted-foreground">{p.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deworming Alert */}
        {dewormingAlert?.needed && (
          <div className="p-3 rounded-2xl border bg-amber-500/5 border-amber-500/20">
            <div className="flex items-center gap-2.5">
              <Pill className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-semibold text-foreground">תילוע / טפילים</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{dewormingAlert.msg}</p>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Quick-Dial */}
        <button
          onClick={() => setShowEmergency(true)}
          className="w-full p-3 rounded-2xl border border-red-500/20 bg-red-500/5 flex items-center gap-2.5 hover:bg-red-500/10 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <Phone className="w-4 h-4 text-red-500" strokeWidth={1.5} />
          </div>
          <div className="flex-1 text-right">
            <p className="text-xs font-bold text-red-600">וטרינר חירום 🚨</p>
            <p className="text-[10px] text-muted-foreground">מצא מרפאה 24/7 קרובה אליך</p>
          </div>
          <ChevronLeft className="w-4 h-4 text-red-400" />
        </button>

        {/* Personalized Next Steps */}
        {nextSteps.length > 0 && (
          <div className="p-4 bg-card rounded-2xl border border-border/30">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
              <span className="font-semibold text-foreground text-sm">הצעדים הבאים ל{petName}</span>
            </div>
            <div className="space-y-2">
              {nextSteps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-2.5 p-2.5 bg-muted/20 rounded-xl"
                >
                  <span className="text-sm flex-shrink-0">{step.icon}</span>
                  <p className="text-[10px] text-foreground leading-relaxed">{step.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Emergency Sheet */}
      <AnimatePresence>
        {showEmergency && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-end justify-center bg-background/60 backdrop-blur-sm"
            onClick={() => setShowEmergency(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-4 mb-[calc(env(safe-area-inset-bottom)+80px)] p-5 bg-card rounded-2xl border border-border/40 shadow-xl"
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                  <h3 className="font-bold text-foreground text-sm">וטרינר חירום 24/7</h3>
                </div>
                <button onClick={() => setShowEmergency(false)} className="p-1">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-2">
                <a
                  href="tel:1-700-501-511"
                  className="flex items-center gap-3 w-full p-3 bg-red-500/10 rounded-xl hover:bg-red-500/15 transition-colors"
                >
                  <Phone className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                  <div className="text-right flex-1">
                    <p className="text-xs font-semibold text-foreground">וטרינר חירום ארצי</p>
                    <p className="text-[10px] text-muted-foreground">1-700-501-511</p>
                  </div>
                </a>

                <button
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition((pos) => {
                        window.open(
                          `https://www.google.com/maps/search/emergency+vet+24+hours/@${pos.coords.latitude},${pos.coords.longitude},14z`,
                          '_blank'
                        );
                      }, () => {
                        window.open('https://www.google.com/maps/search/וטרינר+חירום+24+שעות', '_blank');
                      });
                    } else {
                      window.open('https://www.google.com/maps/search/וטרינר+חירום+24+שעות', '_blank');
                    }
                    setShowEmergency(false);
                  }}
                  className="flex items-center gap-3 w-full p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <MapPin className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  <div className="text-right flex-1">
                    <p className="text-xs font-semibold text-foreground">מצא מרפאה קרובה</p>
                    <p className="text-[10px] text-muted-foreground">חיפוש לפי מיקום GPS</p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
