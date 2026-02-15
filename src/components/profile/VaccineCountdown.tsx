/**
 * VaccineCountdown - Visual timeline for upcoming vaccines
 * Pulsing alert when vaccine due in <30 days
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Syringe, Calendar, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const [upcoming, setUpcoming] = useState<UpcomingVaccine[]>([]);

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
        setUpcoming(items);
      }
    };
    fetch();
  }, [petId]);

  if (upcoming.length === 0) return null;

  return (
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
            const isUrgent = vac.daysUntil <= 30;
            return (
              <div
                key={vac.id}
                className={`flex items-center gap-3 p-2.5 rounded-xl ${
                  isUrgent
                    ? "bg-amber-500/10 border border-amber-500/20"
                    : "bg-muted/20"
                }`}
              >
                {/* Pulsing indicator for urgent */}
                {isUrgent ? (
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" strokeWidth={2} />
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
                    <span className={`text-[10px] ${isUrgent ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                      {isUrgent ? `בעוד ${vac.daysUntil} ימים!` : `בעוד ${vac.daysUntil} ימים`}
                      {" · "}
                      {new Date(vac.nextDate).toLocaleDateString("he-IL", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>

                {isUrgent && (
                  <span className="text-[9px] font-bold text-amber-600 bg-amber-500/15 px-2 py-0.5 rounded-full">
                    בקרוב
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
