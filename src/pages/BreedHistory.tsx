import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Calendar, Image } from "lucide-react";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";

interface HistoryEntry {
  id: string;
  breed: string | null;
  confidence: number | null;
  avatar_url: string | null;
  detected_at: string;
}

interface Pet {
  id: string;
  name: string;
  type: string;
}

const BreedHistory = () => {
  const navigate = useNavigate();
  const { petId } = useParams();
  const [pet, setPet] = useState<Pet | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!petId) return;

      // Fetch pet details
      const { data: petData } = await supabase
        .from('pets')
        .select('id, name, type')
        .eq('id', petId)
        .single();

      if (petData) {
        setPet(petData);
      }

      // Fetch breed detection history
      const { data: historyData } = await supabase
        .from('breed_detection_history')
        .select('*')
        .eq('pet_id', petId)
        .order('detected_at', { ascending: false });

      if (historyData) {
        setHistory(historyData);
      }

      setLoading(false);
    };

    fetchData();
  }, [petId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-jakarta">טוען...</p>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-jakarta">חיה לא נמצאה</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 animate-fade-in" dir="rtl">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 z-10 h-10 px-4 rounded-full bg-card hover:bg-secondary border-2 border-border shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all flex items-center justify-center gap-2 group animate-slide-in-left"
      >
        <ArrowLeft className="w-5 h-5 text-foreground group-hover:scale-110 transition-transform" />
        <span className="text-sm font-semibold font-jakarta text-foreground">חזרה</span>
      </button>

      <div className="max-w-[640px] mx-auto mt-16 px-4">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <h1 className="text-3xl md:text-4xl font-jakarta font-semibold text-foreground mb-2 tracking-tight">
            היסטוריית זיהוי גזע
          </h1>
          <p className="text-muted-foreground text-sm md:text-base font-jakarta font-normal">
            ציר הזמן של זיהוי הגזע של {pet.name}
          </p>
        </div>

        {/* History Timeline */}
        {history.length === 0 ? (
          <Card className="p-8 bg-card border-2 border-border rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] text-center">
            <p className="text-muted-foreground font-jakarta">אין היסטוריית זיהוי גזע עדיין</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {history.map((entry, index) => (
              <Card
                key={entry.id}
                className="p-5 bg-card border-2 border-border rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] animate-scale-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex gap-4">
                  {/* Image */}
                  {entry.avatar_url ? (
                    <img
                      src={entry.avatar_url}
                      alt="תמונת זיהוי"
                      className="w-20 h-20 rounded-xl object-cover border-2 border-primary/30"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center border-2 border-border">
                      <Image className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-lg font-jakarta text-foreground">
                          {entry.breed || "גזע לא ידוע"}
                        </h3>
                        {entry.confidence !== null && (
                          <span
                            className={`inline-block text-xs font-semibold font-jakarta px-2 py-1 rounded-full mt-1 ${
                              entry.confidence > 80
                                ? "bg-success/20 text-success"
                                : entry.confidence > 60
                                ? "bg-warning/20 text-warning"
                                : "bg-orange-500/20 text-orange-600"
                            }`}
                          >
                            {entry.confidence}% דיוק
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-jakarta">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{format(new Date(entry.detected_at), "PPp")}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default BreedHistory;
