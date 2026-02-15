/**
 * LocalEventsCard — "Events Near You" snap card in the feed
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Calendar, ChevronLeft, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LocalEvent {
  id: string;
  title: string;
  date: string;
  city: string;
  type: "meetup" | "adoption" | "training" | "community";
}

const EVENT_ICONS: Record<string, string> = {
  meetup: "🐕",
  adoption: "🐾",
  training: "🎓",
  community: "🎉",
};

export const LocalEventsCard = () => {
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [city, setCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("city")
        .eq("id", user.id)
        .maybeSingle();

      const userCity = profile?.city;
      setCity(userCity || null);

      // Fetch calendar events that are public/community events
      const now = new Date().toISOString();
      const { data: calEvents } = await supabase
        .from("calendar_events")
        .select("id, title, start_time, location, event_type")
        .gte("start_time", now)
        .order("start_time", { ascending: true })
        .limit(5);

      if (calEvents?.length) {
        const mapped: LocalEvent[] = calEvents.map((e: any) => ({
          id: e.id,
          title: e.title,
          date: new Date(e.start_time).toLocaleDateString("he-IL", { day: "numeric", month: "short" }),
          city: e.location || userCity || "",
          type: (e.event_type as LocalEvent["type"]) || "community",
        }));
        setEvents(mapped);
      } else {
        // Fallback: generate placeholder events for the user's city
        const cityName = userCity || "האזור שלך";
        setEvents([
          { id: "1", title: `מפגש כלבים — ${cityName}`, date: "בקרוב", city: cityName, type: "meetup" },
          { id: "2", title: "יום אימוץ פתוח", date: "בקרוב", city: cityName, type: "adoption" },
          { id: "3", title: "סדנת אילוף גורים", date: "בקרוב", city: cityName, type: "training" },
        ]);
      }
      setLoading(false);
    };
    fetchEvents();
  }, []);

  if (loading || events.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="snap-start flex-shrink-0 w-full px-4 py-4"
      style={{ minHeight: "100dvh" }}
    >
      <div className="h-full flex flex-col justify-center" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
            <MapPin className="w-4.5 h-4.5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">אירועים באזורך</h3>
            <p className="text-xs text-muted-foreground">
              {city ? `📍 ${city}` : "📍 גלה אירועים קרובים"}
            </p>
          </div>
        </div>

        {/* Events List */}
        <div className="space-y-3">
          {events.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
              className="bg-card border border-border/30 rounded-xl p-3.5 flex items-center gap-3 hover:bg-muted/30 transition-colors cursor-pointer"
            >
              <span className="text-2xl flex-shrink-0">{EVENT_ICONS[event.type] || "📅"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {event.date}
                  </span>
                  {event.city && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {event.city}
                    </span>
                  )}
                </div>
              </div>
              <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </motion.div>
          ))}
        </div>

        {/* Community CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground"
        >
          <Users className="w-3.5 h-3.5" />
          <span>הצטרף לקהילה המקומית שלך</span>
        </motion.div>
      </div>
    </motion.div>
  );
};
