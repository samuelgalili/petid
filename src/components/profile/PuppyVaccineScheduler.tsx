/**
 * PuppyVaccineScheduler - Smart vaccine schedule for puppies
 * Calculates "Puppy Series" (חיסוני גורים) with 3-4 week booster intervals
 * Allows adding to phone calendar
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Syringe, CalendarPlus, CheckCircle2, Circle } from "lucide-react";

interface PuppyVaccineSchedulerProps {
  petName: string;
  birthDate?: string;
  breed?: string;
  petType: 'dog' | 'cat';
}

interface ScheduleItem {
  weekAge: number;
  label: string;
  vaccines: string;
  date: string;
  isPast: boolean;
}

export const PuppyVaccineScheduler = ({ petName, birthDate, breed, petType }: PuppyVaccineSchedulerProps) => {
  const schedule = useMemo(() => {
    if (!birthDate) return [];
    const birth = new Date(birthDate);
    const now = new Date();
    const ageWeeks = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 7));

    // Only show for puppies under 6 months (26 weeks)
    if (ageWeeks > 26) return [];

    const items: ScheduleItem[] = [
      { weekAge: 6, label: 'חיסון ראשון', vaccines: 'מחומש (DHPP) + תילוע', date: '', isPast: false },
      { weekAge: 9, label: 'חיסון שני', vaccines: 'מחומש (DHPP) + לפטוספירוזיס', date: '', isPast: false },
      { weekAge: 12, label: 'חיסון שלישי', vaccines: 'משושה (DHLPP) + כלבת', date: '', isPast: false },
      { weekAge: 16, label: 'חיסון רביעי', vaccines: 'משושה (DHLPP) + לישמניה', date: '', isPast: false },
    ];

    return items.map(item => {
      const vaccineDate = new Date(birth);
      vaccineDate.setDate(vaccineDate.getDate() + item.weekAge * 7);
      return {
        ...item,
        date: vaccineDate.toISOString().split('T')[0],
        isPast: vaccineDate < now,
      };
    });
  }, [birthDate]);

  if (schedule.length === 0) return null;

  const addToCalendar = (item: ScheduleItem) => {
    const startDate = new Date(item.date);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);

    const title = encodeURIComponent(`💉 ${item.label} — ${petName}`);
    const details = encodeURIComponent(`חיסונים: ${item.vaccines}\nחיית מחמד: ${petName}`);
    const start = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const url = `https://calendar.google.com/calendar/event?action=TEMPLATE&text=${title}&details=${details}&dates=${start}/${end}`;
    window.open(url, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4"
    >
      <div className="p-4 bg-card rounded-2xl border border-border/30">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
            <Syringe className="w-4 h-4 text-purple-500" strokeWidth={1.5} />
          </div>
          <div>
            <span className="font-semibold text-foreground text-sm">חיסוני גורים</span>
            <p className="text-[10px] text-muted-foreground">לוח חיסונים אישי ל{petName}</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative pr-4">
          {/* Vertical line */}
          <div className="absolute right-[11px] top-2 bottom-2 w-[2px] bg-border/50" />

          <div className="space-y-3">
            {schedule.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-3 relative"
              >
                {/* Timeline dot */}
                <div className="relative z-10 flex-shrink-0">
                  {item.isPast ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground/40" strokeWidth={1.5} />
                  )}
                </div>

                <div className={`flex-1 p-2.5 rounded-xl ${item.isPast ? 'bg-green-500/5' : 'bg-muted/20'}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-semibold ${item.isPast ? 'text-green-600' : 'text-foreground'}`}>
                      {item.label} (שבוע {item.weekAge})
                    </p>
                    {!item.isPast && (
                      <button
                        onClick={() => addToCalendar(item)}
                        className="p-1 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
                        title="הוסף ליומן"
                      >
                        <CalendarPlus className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.vaccines}</p>
                  <p className={`text-[10px] mt-0.5 ${item.isPast ? 'text-green-500' : 'text-primary'}`}>
                    {new Date(item.date).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
