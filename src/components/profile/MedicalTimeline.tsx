/**
 * MedicalTimeline - Displays vet visits, vaccinations, and treatments
 * Integrated with Health Score to show impact of medical events
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Stethoscope, Syringe, Calendar, Pill, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MedicalEvent {
  id: string;
  type: 'vaccination' | 'vet_visit' | 'treatment' | 'surgery' | 'document';
  title: string;
  date: string;
  notes?: string | null;
}

interface MedicalTimelineProps {
  petId: string;
  petName: string;
}

export const MedicalTimeline = ({ petId, petName }: MedicalTimelineProps) => {
  const [events, setEvents] = useState<MedicalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchMedicalEvents = async () => {
      try {
        // Fetch from pet_documents (extracted medical data)
        const { data: docs } = await supabase
          .from("pet_documents")
          .select("id, document_type, title, uploaded_at, description")
          .eq("pet_id", petId)
          .order("uploaded_at", { ascending: false })
          .limit(10);

        // Fetch from pet_vet_visits (structured vet visit data)
        const { data: vetVisits } = await supabase
          .from("pet_vet_visits")
          .select("id, visit_type, visit_date, diagnosis, treatment, clinic_name, vaccines, is_recovery_mode")
          .eq("pet_id", petId)
          .order("visit_date", { ascending: false })
          .limit(10);

        // Fetch pet's last/next vet visit
        const { data: petData } = await (supabase as any)
          .from("pets")
          .select("last_vet_visit, next_vet_visit, medical_conditions")
          .eq("id", petId)
          .maybeSingle();

        const timeline: MedicalEvent[] = [];

        // Add vet visits from pet_vet_visits table
        if (vetVisits) {
          for (const visit of vetVisits) {
            const typeMap: Record<string, MedicalEvent['type']> = {
              vaccination: 'vaccination',
              surgery: 'surgery',
              treatment: 'treatment',
              checkup: 'vet_visit',
            };
            const vaccines = (visit.vaccines as string[]) || [];
            const title = visit.visit_type === 'vaccination' && vaccines.length > 0
              ? `חיסון: ${vaccines.join(', ')}`
              : visit.diagnosis || visit.clinic_name || 'ביקור וטרינר';
            timeline.push({
              id: visit.id,
              type: typeMap[visit.visit_type || ''] || 'vet_visit',
              title,
              date: visit.visit_date,
              notes: visit.treatment || null,
            });
          }
        }

        // Add documents as events (only if not duplicating vet visits)
        const vetVisitIds = new Set(vetVisits?.map((v: any) => v.id) || []);
        if (docs) {
          for (const doc of docs) {
            if (vetVisitIds.has(doc.id)) continue;
            const typeMap: Record<string, MedicalEvent['type']> = {
              vaccination: 'vaccination',
              vet_visit: 'vet_visit',
              treatment: 'treatment',
              surgery: 'surgery',
            };
            timeline.push({
              id: doc.id,
              type: typeMap[doc.document_type] || 'document',
              title: doc.title || doc.document_type || 'מסמך',
              date: doc.uploaded_at || new Date().toISOString(),
              notes: doc.description,
            });
          }
        }

        // Add vet visits from pet record
        if (petData?.next_vet_visit) {
          timeline.push({
            id: 'next-vet',
            type: 'vet_visit',
            title: 'ביקור וטרינר הבא',
            date: petData.next_vet_visit,
          });
        }

        // Sort by date, newest first, deduplicate
        timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEvents(timeline);
      } catch (error) {
        console.error('Error fetching medical timeline:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMedicalEvents();
  }, [petId]);

  const getEventIcon = (type: MedicalEvent['type']) => {
    switch (type) {
      case 'vaccination': return Syringe;
      case 'vet_visit': return Stethoscope;
      case 'treatment': return Pill;
      case 'surgery': return Stethoscope;
      default: return FileText;
    }
  };

  const getEventColor = (type: MedicalEvent['type']) => {
    switch (type) {
      case 'vaccination': return 'bg-green-500/15 text-green-600';
      case 'vet_visit': return 'bg-blue-500/15 text-blue-600';
      case 'treatment': return 'bg-amber-500/15 text-amber-600';
      case 'surgery': return 'bg-red-500/15 text-red-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const isFuture = (dateStr: string) => new Date(dateStr) > new Date();

  if (loading || events.length === 0) return null;

  const visibleEvents = expanded ? events : events.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4"
    >
      <div className="p-4 bg-card rounded-2xl border border-border/30">
        <div className="flex items-center gap-2 mb-3">
          <Stethoscope className="w-4 h-4 text-primary" strokeWidth={1.5} />
          <span className="font-semibold text-foreground text-sm">ציר זמן רפואי</span>
          <span className="text-[10px] text-muted-foreground">({events.length})</span>
        </div>

        <div className="space-y-2">
          {visibleEvents.map((event, i) => {
            const Icon = getEventIcon(event.type);
            const colorClass = getEventColor(event.type);
            const future = isFuture(event.date);

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-start gap-2.5 p-2 rounded-lg ${future ? 'bg-primary/5 border border-primary/10' : 'bg-muted/20'}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{event.title}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Calendar className="w-2.5 h-2.5 text-muted-foreground" />
                    <span className={`text-[10px] ${future ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                      {future ? 'מתוכנן: ' : ''}{formatDate(event.date)}
                    </span>
                  </div>
                  {event.notes && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{event.notes}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {events.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-2 mx-auto text-[11px] text-primary font-medium hover:underline"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'הצג פחות' : `עוד ${events.length - 3} אירועים`}
          </button>
        )}
      </div>
    </motion.div>
  );
};
