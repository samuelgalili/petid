/**
 * VaccineCountdown - Visual timeline for upcoming vaccines
 * Color-coded: green >30d, orange 14-30d, red+blink <7d
 * Click to show scheduling action
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Syringe, Calendar, AlertCircle, MapPin, CalendarPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface VaccineCountdownProps {
  petId: string;
  petName: string;
}

interface UpcomingVaccine {
  id: string;
  vaccines: string[];
  nextDate: string;
  daysUntil: number;
}

export const VaccineCountdown = ({ petId, petName }: VaccineCountdownProps) => {
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState<UpcomingVaccine[]>([]);
  const [selectedVaccine, setSelectedVaccine] = useState<UpcomingVaccine | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("pet_vet_visits")
        .select("id, vaccines, next_visit_date")
        .eq("pet_id", petId)
        .not("next_visit_date", "is", null)
        .gte("next_visit_date", today)
        .order("next_visit_date", { ascending: true })
        .limit(5);

      if (data) {
        const items: UpcomingVaccine[] = data
          .filter((v: any) => v.vaccines && (v.vaccines as string[]).length > 0)
          .map((v: any) => ({
            id: v.id,
            vaccines: v.vaccines as string[],
            nextDate: v.next_visit_date,
            daysUntil: Math.ceil((new Date(v.next_visit_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          }));

        // Deduplicate by vaccine names + date to avoid showing the same vaccine twice
        const seen = new Set<string>();
        const unique = items.filter((item) => {
          const key = `${item.vaccines.sort().join(",")}|${item.nextDate}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setUpcoming(unique);
      }
    };
    fetch();
  }, [petId]);

  if (upcoming.length === 0) return null;

  const getUrgencyStyle = (days: number) => {
    if (days <= 7) return {
      bg: 'bg-red-500/10 border border-red-500/25',
      text: 'text-red-600',
      badge: 'bg-red-500/15 text-red-600',
      badgeLabel: 'דחוף!',
      dotColor: 'bg-red-500',
    };
    if (days <= 30) return {
      bg: 'bg-amber-500/10 border border-amber-500/20',
      text: 'text-amber-600',
      badge: 'bg-amber-500/15 text-amber-600',
      badgeLabel: 'בקרוב',
      dotColor: 'bg-amber-500',
    };
    return {
      bg: 'bg-green-500/8 border border-green-500/15',
      text: 'text-green-600',
      badge: 'bg-green-500/15 text-green-600',
      badgeLabel: 'מתוכנן',
      dotColor: 'bg-green-500',
    };
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mb-4"
      >
        <div className="p-4 bg-card rounded-2xl border border-border/30">
          <div className="flex items-center gap-2 mb-3">
            <Syringe className="w-4 h-4 text-green-500" strokeWidth={1.5} />
            <span className="font-semibold text-foreground text-sm">ספירה לאחור לחיסונים</span>
          </div>

          <div className="space-y-2">
            {upcoming.map((vac) => {
              const style = getUrgencyStyle(vac.daysUntil);
              const isCritical = vac.daysUntil <= 7;

              return (
                <button
                  key={vac.id}
                  onClick={() => setSelectedVaccine(vac)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl w-full text-right transition-colors hover:opacity-90 ${style.bg}`}
                >
                  {/* Indicator */}
                  {isCritical ? (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" strokeWidth={2} />
                    </motion.div>
                  ) : vac.daysUntil <= 30 ? (
                    <motion.div
                      animate={{ scale: [1, 1.15, 1], opacity: [1, 0.7, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.5} />
                    </motion.div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                      <Syringe className="w-3.5 h-3.5 text-green-500" strokeWidth={1.5} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      {vac.vaccines.join(", ")}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Calendar className="w-2.5 h-2.5 text-muted-foreground" />
                      <span className={`text-[10px] font-medium ${style.text}`}>
                        {isCritical ? `בעוד ${vac.daysUntil} ימים!` : `בעוד ${vac.daysUntil} ימים`}
                        {" · "}
                        {new Date(vac.nextDate).toLocaleDateString("he-IL", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                    {style.badgeLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Schedule / Clinic Action Sheet */}
      <AnimatePresence>
        {selectedVaccine && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-end justify-center bg-background/60 backdrop-blur-sm"
            onClick={() => setSelectedVaccine(null)}
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
                  <Syringe className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  <h3 className="font-bold text-foreground text-sm">
                    חיסון: {selectedVaccine.vaccines.join(", ")}
                  </h3>
                </div>
                <button onClick={() => setSelectedVaccine(null)} className="p-1">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground mb-4">
                {petName} צריך חיסון בעוד {selectedVaccine.daysUntil} ימים ({new Date(selectedVaccine.nextDate).toLocaleDateString("he-IL")})
              </p>

              <div className="space-y-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setSelectedVaccine(null);
                    navigate('/tracker');
                  }}
                  className="flex items-center gap-3 w-full p-3 bg-primary/10 rounded-xl hover:bg-primary/15 transition-colors"
                >
                  <CalendarPlus className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  <div className="text-right">
                    <p className="text-xs font-semibold text-foreground">קבע תור</p>
                    <p className="text-[10px] text-muted-foreground">הוסף ליומן תזכורת</p>
                  </div>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setSelectedVaccine(null);
                    navigate('/shop', { state: { search: 'וטרינר' } });
                  }}
                  className="flex items-center gap-3 w-full p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <MapPin className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  <div className="text-right">
                    <p className="text-xs font-semibold text-foreground">מצא מרפאה קרובה</p>
                    <p className="text-[10px] text-muted-foreground">חפש וטרינר באזורך</p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
