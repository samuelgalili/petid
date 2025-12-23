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

interface DecodedOutput {
  action_required: boolean;
  missing_data: string[];
  safe_to_recommend: boolean;
  wait_required: boolean;
  explanation: string;
}

const HomeAIDebug = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'he' || language === 'ar';
  
  const [pets, setPets] = useState<PetData[]>([]);
  const [decodedOutputs, setDecodedOutputs] = useState<Record<string, DecodedOutput>>({});
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

  const runDecoderTest = async (pet: PetData) => {
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
          }
        }
      });

      if (error) throw error;
      
      // Store ONLY the decoded output
      if (data.decoded) {
        setDecodedOutputs(prev => ({
          ...prev,
          [pet.id]: data.decoded
        }));
      }
    } catch (err) {
      console.error('Decoder test error:', err);
      setDecodedOutputs(prev => ({
        ...prev,
        [pet.id]: {
          action_required: false,
          missing_data: [],
          safe_to_recommend: false,
          wait_required: true,
          explanation: "Decoder test failed"
        }
      }));
    } finally {
      setAnalyzing(null);
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
        {/* Internal Debug Warning */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6">
          <p className="text-red-600 dark:text-red-400 text-sm font-mono font-bold">
            🔧 INTERNAL DEBUG SCREEN - pilot_decoder TEST
          </p>
          <p className="text-red-500/70 text-xs font-mono mt-1">
            No UI output • No CTA • No user actions • Decoder output only
          </p>
        </div>

        <h1 className="text-xl font-mono font-bold text-foreground mb-2">
          pilot_decoder Test
        </h1>
        <p className="text-muted-foreground text-sm font-mono mb-6">
          Verifying decoder correctly parses pilot JSON output
        </p>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
            <p className="text-destructive text-sm font-mono">{error}</p>
          </div>
        )}

        {pets.length === 0 ? (
          <div className="bg-muted/50 rounded-lg p-6 text-center">
            <p className="text-muted-foreground font-mono text-sm">
              No pets found for decoder test
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
                      {pet.type} • {pet.breed || 'Unknown'} • {pet.age ? `${pet.age}y` : 'No age'}
                    </p>
                  </div>
                  <button
                    onClick={() => runDecoderTest(pet)}
                    disabled={analyzing === pet.id}
                    className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 text-xs font-mono rounded border border-red-500/30 disabled:opacity-50"
                  >
                    {analyzing === pet.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Run Decoder'
                    )}
                  </button>
                </div>

                {/* Decoded Output ONLY */}
                {decodedOutputs[pet.id] && (
                  <div className="border-t border-border pt-3 mt-3">
                    <p className="text-xs text-muted-foreground font-mono mb-2">
                      Decoded Output:
                    </p>
                    <pre className="p-4 bg-zinc-900 text-green-400 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(decodedOutputs[pet.id], null, 2)}
                    </pre>
                    
                    {/* Quick Status Flags */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className={`p-2 rounded ${decodedOutputs[pet.id].action_required ? 'bg-amber-500/20 text-amber-500' : 'bg-muted text-muted-foreground'}`}>
                        action_required: {decodedOutputs[pet.id].action_required ? 'TRUE' : 'false'}
                      </div>
                      <div className={`p-2 rounded ${decodedOutputs[pet.id].safe_to_recommend ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                        safe_to_recommend: {decodedOutputs[pet.id].safe_to_recommend ? 'TRUE' : 'false'}
                      </div>
                      <div className={`p-2 rounded ${decodedOutputs[pet.id].wait_required ? 'bg-orange-500/20 text-orange-500' : 'bg-muted text-muted-foreground'}`}>
                        wait_required: {decodedOutputs[pet.id].wait_required ? 'TRUE' : 'false'}
                      </div>
                      <div className={`p-2 rounded ${decodedOutputs[pet.id].missing_data.length > 0 ? 'bg-red-500/20 text-red-500' : 'bg-muted text-muted-foreground'}`}>
                        missing_data: [{decodedOutputs[pet.id].missing_data.join(', ')}]
                      </div>
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
            Debug screen only — decoder verification
            <br />
            No actions, no CTAs, no user-facing changes
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomeAIDebug;
