import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface PetData {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  age: number | null;
  birth_date: string | null;
  gender: string | null;
  health_notes: string | null;
  is_neutered: boolean | null;
  personality_tags: string[] | null;
  favorite_activities: string[] | null;
}

interface PilotReasoning {
  status: "pilot_only";
  next_action: "none" | "data_missing" | "safe_recommendation" | "wait";
  reason: string;
  required_data: string[];
  long_term_check: "pass" | "fail";
  internal_notes?: string;
}

const HomeAIPilot = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'he' || language === 'ar';
  
  const [pets, setPets] = useState<PetData[]>([]);
  const [reasoning, setReasoning] = useState<Record<string, PilotReasoning>>({});
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchPets();
    }
  }, [user?.id]);

  const fetchPets = async () => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('id, name, type, breed, age, birth_date, gender, health_notes, is_neutered, personality_tags, favorite_activities')
        .eq('user_id', user?.id)
        .eq('archived', false);

      if (error) throw error;
      setPets(data || []);
    } catch (err) {
      console.error('Error fetching pets:', err);
      setError('Failed to fetch pets');
    } finally {
      setLoading(false);
    }
  };

  const analyzeWithAI = async (pet: PetData) => {
    setAnalyzing(pet.id);
    try {
      const { data, error } = await supabase.functions.invoke('pet-pilot-reasoning', {
        body: { 
          petData: {
            name: pet.name,
            type: pet.type,
            breed: pet.breed,
            age: pet.age,
            birth_date: pet.birth_date,
            gender: pet.gender,
            health_notes: pet.health_notes,
            is_neutered: pet.is_neutered,
            personality_tags: pet.personality_tags,
            favorite_activities: pet.favorite_activities,
            // Note: sensitivities/allergies would come from health_notes or a separate field
          }
        }
      });

      if (error) throw error;
      
      setReasoning(prev => ({
        ...prev,
        [pet.id]: data.reasoning
      }));
    } catch (err) {
      console.error('AI analysis error:', err);
      setReasoning(prev => ({
        ...prev,
        [pet.id]: {
          status: "pilot_only",
          next_action: "wait",
          reason: "AI analysis failed - defaulting to safe state",
          required_data: [],
          long_term_check: "fail"
        }
      }));
    } finally {
      setAnalyzing(null);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'none': return 'text-muted-foreground';
      case 'data_missing': return 'text-amber-500';
      case 'safe_recommendation': return 'text-green-500';
      case 'wait': return 'text-orange-500';
      default: return 'text-foreground';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-background p-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="max-w-2xl mx-auto">
        {/* Header - Internal Only */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-6">
          <p className="text-amber-600 dark:text-amber-400 text-sm font-mono">
            ⚠️ INTERNAL PILOT - READ ONLY - NO UI OUTPUT
          </p>
        </div>

        <h1 className="text-xl font-mono font-bold text-foreground mb-2">
          PetID Core Logic Pilot
        </h1>
        <p className="text-muted-foreground text-sm font-mono mb-6">
          Internal reasoning engine - does not affect user experience
        </p>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
            <p className="text-destructive text-sm font-mono">{error}</p>
          </div>
        )}

        {pets.length === 0 ? (
          <div className="bg-muted/50 rounded-lg p-6 text-center">
            <p className="text-muted-foreground font-mono text-sm">
              No pets found for analysis
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pets.map((pet) => (
              <div key={pet.id} className="bg-card border border-border rounded-lg p-4">
                {/* Pet Info */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-mono font-semibold text-foreground">
                      {pet.name}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      {pet.type} • {pet.breed || 'Unknown breed'} • {pet.age ? `${pet.age}y` : 'Age unknown'}
                    </p>
                  </div>
                  <button
                    onClick={() => analyzeWithAI(pet)}
                    disabled={analyzing === pet.id}
                    className="px-3 py-1 bg-muted hover:bg-muted/80 text-foreground text-xs font-mono rounded border border-border disabled:opacity-50"
                  >
                    {analyzing === pet.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Analyze'
                    )}
                  </button>
                </div>

                {/* Raw Pet Data */}
                <details className="mb-3">
                  <summary className="text-xs text-muted-foreground font-mono cursor-pointer hover:text-foreground">
                    Raw Data
                  </summary>
                  <pre className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono overflow-x-auto">
                    {JSON.stringify(pet, null, 2)}
                  </pre>
                </details>

                {/* AI Reasoning Output */}
                {reasoning[pet.id] && (
                  <div className="border-t border-border pt-3 mt-3">
                    <p className="text-xs text-muted-foreground font-mono mb-2">
                      AI Reasoning Output:
                    </p>
                    <pre className="p-3 bg-muted/30 rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(reasoning[pet.id], null, 2)}
                    </pre>
                    
                    {/* Quick Status */}
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-xs font-mono font-semibold ${getActionColor(reasoning[pet.id].next_action)}`}>
                        → {reasoning[pet.id].next_action.toUpperCase()}
                      </span>
                      <span className={`text-xs font-mono ${reasoning[pet.id].long_term_check === 'pass' ? 'text-green-500' : 'text-red-500'}`}>
                        [{reasoning[pet.id].long_term_check}]
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground font-mono">
            This screen outputs internal reasoning only.
            <br />
            No actions, no CTAs, no user-facing changes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomeAIPilot;
