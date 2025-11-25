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
        <p className="text-gray-600 font-jakarta">Loading...</p>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-gray-600 font-jakarta">Pet not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 animate-fade-in" dir="ltr">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 z-10 h-10 px-4 rounded-full bg-white/95 hover:bg-gray-50 border-2 border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all flex items-center justify-center gap-2 group animate-slide-in-left"
      >
        <ArrowLeft className="w-5 h-5 text-gray-900 group-hover:scale-110 transition-transform" />
        <span className="text-sm font-semibold font-jakarta text-gray-900">Back</span>
      </button>

      <div className="max-w-[640px] mx-auto mt-16 px-4">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <h1 className="text-3xl md:text-4xl font-jakarta font-semibold text-gray-900 mb-2 tracking-tight">
            Breed Detection History
          </h1>
          <p className="text-gray-700 text-sm md:text-base font-jakarta font-normal">
            {pet.name}'s breed detection timeline
          </p>
        </div>

        {/* History Timeline */}
        {history.length === 0 ? (
          <Card className="p-8 bg-white border-2 border-gray-200 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] text-center">
            <p className="text-gray-600 font-jakarta">No breed detection history yet</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {history.map((entry, index) => (
              <Card
                key={entry.id}
                className="p-5 bg-white border-2 border-gray-200 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] animate-scale-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex gap-4">
                  {/* Image */}
                  {entry.avatar_url ? (
                    <img
                      src={entry.avatar_url}
                      alt="Detection photo"
                      className="w-20 h-20 rounded-xl object-cover border-2 border-[#FBD66A]/30"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                      <Image className="w-8 h-8 text-gray-400" />
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-lg font-jakarta text-gray-900">
                          {entry.breed || "Unknown Breed"}
                        </h3>
                        {entry.confidence !== null && (
                          <span
                            className={`inline-block text-xs font-semibold font-jakarta px-2 py-1 rounded-full mt-1 ${
                              entry.confidence > 80
                                ? "bg-green-100 text-green-700"
                                : entry.confidence > 60
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {entry.confidence}% confidence
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 font-jakarta">
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
