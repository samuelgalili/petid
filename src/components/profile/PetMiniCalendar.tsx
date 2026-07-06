import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Syringe, Scissors, Stethoscope } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { getMyPetHealthSummary } from "@/lib/mipoApi";

interface PetMiniCalendarProps {
  petId: string;
  petName: string;
  isOwner: boolean;
}

interface PetEvent {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
}

const EVENT_ICONS: Record<string, React.ElementType> = {
  vaccination: Syringe,
  grooming: Scissors,
  vet: Stethoscope,
  general: Calendar,
};

const EVENT_COLORS: Record<string, string> = {
  vaccination: 'bg-blue-500/15 text-blue-600',
  grooming: 'bg-pink-500/15 text-pink-600',
  vet: 'bg-green-500/15 text-green-600',
  general: 'bg-primary/15 text-primary',
};

export const PetMiniCalendar = ({ petId, petName, isOwner }: PetMiniCalendarProps) => {
  const [events, setEvents] = useState<PetEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchEvents = async () => {
      if (!petId) {
        if (active) setLoading(false);
        return;
      }

      try {
        const summary = await getMyPetHealthSummary(petId);
        const upcoming: PetEvent[] = [];
        const today = new Date();

        if (summary.pet.next_vet_visit && new Date(summary.pet.next_vet_visit) >= today) {
          upcoming.push({
            id: `${petId}-next-vet`,
            title: `ביקור וטרינר של ${petName}`,
            event_date: summary.pet.next_vet_visit,
            event_type: 'vet',
          });
        }

        summary.vet_visits.forEach((visit) => {
          if (!visit.next_visit_date || new Date(visit.next_visit_date) < today) return;
          upcoming.push({
            id: `${visit.id}-follow-up`,
            title: visit.reason || visit.clinic_name || 'ביקור מעקב',
            event_date: visit.next_visit_date,
            event_type: 'vet',
          });
        });

        summary.vaccinations.forEach((vaccination) => {
          if (!vaccination.expires_at || new Date(vaccination.expires_at) < today) return;
          upcoming.push({
            id: `${vaccination.id}-expires`,
            title: `חיסון ${vaccination.vaccine_name}`,
            event_date: vaccination.expires_at,
            event_type: 'vaccination',
          });
        });

        const uniqueEvents = Array.from(
          new Map(upcoming.map((event) => [`${event.event_type}-${event.event_date}-${event.title}`, event])).values(),
        )
          .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
          .slice(0, 3);

        if (active) setEvents(uniqueEvents);
      } catch (error) {
        console.error('Failed to fetch pet events:', error);
        if (active) setEvents([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchEvents();
    return () => {
      active = false;
    };
  }, [petId, petName]);

  const getDaysUntil = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'היום';
    if (diff === 1) return 'מחר';
    return `בעוד ${diff} ימים`;
  };

  if (loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mx-4 mb-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">אירועים קרובים</span>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="p-4 bg-card rounded-xl border border-border/20 text-center">
          <p className="text-xs text-muted-foreground mb-2">אין אירועים קרובים</p>
          {isOwner && (
            <button className="text-[10px] text-primary font-medium hover:underline">
              + הוסף אירוע
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {events.map((event, i) => {
            const Icon = EVENT_ICONS[event.event_type] || Calendar;
            const colorClass = EVENT_COLORS[event.event_type] || EVENT_COLORS.general;
            
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2.5 p-2.5 bg-card rounded-xl border border-border/20"
              >
                <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-foreground block truncate">{event.title}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(event.event_date), 'dd/MM', { locale: he })} · {getDaysUntil(event.event_date)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
