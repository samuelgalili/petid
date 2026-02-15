import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Syringe, Calendar, Shield, ChevronLeft, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Pet {
  id: string;
  name: string;
  type: 'dog' | 'cat';
  breed?: string;
  birth_date?: string;
  age_years?: number;
  age_months?: number;
  size?: string;
  avatar_url?: string;
}

interface PetFullData {
  weight?: number | null;
  is_neutered?: boolean | null;
  medical_conditions?: string[] | null;
  health_notes?: string | null;
  has_insurance?: boolean | null;
  insurance_company?: string | null;
  insurance_expiry_date?: string | null;
  last_vet_visit?: string | null;
  next_vet_visit?: string | null;
  current_food?: string | null;
}

interface PetHealthScoreProps {
  pet: Pet;
  onViewDetails?: () => void;
}

// Breed-specific insurance pitches (Hebrew)
const BREED_INSURANCE_PITCHES: Record<string, { risks: string; pitch: string }> = {
  'שיצו': { risks: 'בעיות עיניים ונשימה', pitch: 'ביטוח Libra יכסה טיפולים אלו' },
  'shih tzu': { risks: 'בעיות עיניים ונשימה', pitch: 'ביטוח Libra יכסה טיפולים אלו' },
  'בולדוג צרפתי': { risks: 'בעיות נשימה, עור וקיפולי עור', pitch: 'ביטוח Libra יכסה ניתוחים וטיפולי עור' },
  'french bulldog': { risks: 'בעיות נשימה, עור וקיפולי עור', pitch: 'ביטוח Libra יכסה ניתוחים וטיפולי עור' },
  'גולדן רטריבר': { risks: 'דיספלזיה וסרטן', pitch: 'ביטוח Libra יכסה בדיקות וטיפולים מתקדמים' },
  'golden retriever': { risks: 'דיספלזיה וסרטן', pitch: 'ביטוח Libra יכסה בדיקות וטיפולים מתקדמים' },
  'פאג': { risks: 'בעיות נשימה ועיניים', pitch: 'ביטוח Libra יכסה ניתוחים ובדיקות עיניים' },
  'pug': { risks: 'בעיות נשימה ועיניים', pitch: 'ביטוח Libra יכסה ניתוחים ובדיקות עיניים' },
};

export const PetHealthScore = ({ pet, onViewDetails }: PetHealthScoreProps) => {
  const navigate = useNavigate();
  const [petData, setPetData] = useState<PetFullData | null>(null);
  const [loading, setLoading] = useState(true);
  const [vaccineCount, setVaccineCount] = useState(0);
  const [inRecovery, setInRecovery] = useState(false);
  const [showVaccineBoost, setShowVaccineBoost] = useState(false);
  const [showInsurancePitch, setShowInsurancePitch] = useState(false);

  useEffect(() => {
    const fetchPetData = async () => {
      try {
        const [petResult, vaccineResult] = await Promise.all([
          supabase
            .from("pets")
            .select("weight, is_neutered, medical_conditions, health_notes, has_insurance, insurance_company, insurance_expiry_date, last_vet_visit, next_vet_visit, current_food")
            .eq("id", pet.id)
            .maybeSingle(),
          supabase
            .from("pet_vet_visits")
            .select("id, vaccines, visit_date, is_recovery_mode, recovery_until")
            .eq("pet_id", pet.id)
            .order("visit_date", { ascending: false })
            .limit(5),
        ]);

        if (petResult.data) setPetData(petResult.data as PetFullData);
        
        const recentVaccines = (vaccineResult.data || []).filter((v: any) => {
          const vDate = new Date(v.visit_date);
          const monthsAgo = (Date.now() - vDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
          return monthsAgo <= 12 && (v.vaccines as string[])?.length > 0;
        });
        setVaccineCount(recentVaccines.length);
        
        // Show boost animation if vaccines exist
        if (recentVaccines.length > 0) {
          setTimeout(() => {
            setShowVaccineBoost(true);
            setTimeout(() => setShowVaccineBoost(false), 1500);
          }, 1200);
        }
        
        const activeRecovery = (vaccineResult.data || []).find((v: any) =>
          v.is_recovery_mode && v.recovery_until && new Date(v.recovery_until) > new Date()
        );
        setInRecovery(!!activeRecovery);
      } catch (error) {
        console.error('Error fetching pet health data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPetData();
  }, [pet.id]);

  // Calculate real health score
  const healthScore = useMemo(() => {
    if (!petData) return 50;
    let score = 60;
    if (pet.birth_date) {
      score += 5;
      const birth = new Date(pet.birth_date);
      const ageYears = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (ageYears < 3) score += 8;
      else if (ageYears <= 7) score += 5;
      else if (ageYears > 10) score -= 5;
    }
    if (petData.weight) score += 5;
    if (petData.is_neutered === true) score += 3;
    const conditions = petData.medical_conditions || [];
    if (conditions.length === 0) {
      score += 8;
    } else {
      score -= Math.min(conditions.length * 3, 10);
      score += 3;
    }
    if (petData.current_food) score += 3;
    if (petData.last_vet_visit) {
      const lastVisit = new Date(petData.last_vet_visit);
      const monthsSince = (Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSince <= 6) score += 8;
      else if (monthsSince <= 12) score += 4;
      else score -= 3;
    }
    if (petData.has_insurance) score += 5;
    if (petData.health_notes) score += 2;
    score += Math.min(vaccineCount * 4, 10);
    if (inRecovery) score -= 8;
    return Math.min(100, Math.max(0, score));
  }, [pet.birth_date, petData, vaccineCount, inRecovery]);

  const isHighRisk = useMemo(() => {
    if (!petData) return false;
    const conditions = petData.medical_conditions || [];
    if (conditions.length >= 2) return true;
    if (pet.birth_date) {
      const ageYears = (Date.now() - new Date(pet.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (ageYears > 8) return true;
    }
    return false;
  }, [pet.birth_date, petData]);

  const hasInsurance = petData?.has_insurance === true;
  const insuranceExpired = useMemo(() => {
    if (!petData?.insurance_expiry_date) return false;
    return new Date(petData.insurance_expiry_date) < new Date();
  }, [petData?.insurance_expiry_date]);

  // Get breed-specific insurance pitch
  const breedPitch = useMemo(() => {
    if (!pet.breed) return null;
    const breedLower = pet.breed.toLowerCase();
    for (const [key, value] of Object.entries(BREED_INSURANCE_PITCHES)) {
      if (breedLower.includes(key.toLowerCase()) || key.toLowerCase().includes(breedLower)) {
        return value;
      }
    }
    return null;
  }, [pet.breed]);

  const getScoreColor = () => {
    if (healthScore >= 85) return 'text-green-500';
    if (healthScore >= 70) return 'text-primary';
    if (healthScore >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreGradientColors = () => {
    if (healthScore >= 85) return { start: 'hsl(142, 71%, 45%)', end: 'hsl(160, 60%, 45%)' };
    if (healthScore >= 70) return { start: 'hsl(var(--primary))', end: 'hsl(var(--primary) / 0.7)' };
    if (healthScore >= 50) return { start: 'hsl(38, 92%, 50%)', end: 'hsl(25, 95%, 53%)' };
    return { start: 'hsl(0, 84%, 60%)', end: 'hsl(0, 72%, 51%)' };
  };

  const getStatusText = () => {
    if (healthScore >= 85) return 'מצוין';
    if (healthScore >= 70) return 'טוב';
    if (healthScore >= 50) return 'סביר';
    return 'דורש תשומת לב';
  };

  // Sub-label based on score
  const getSubLabel = () => {
    if (healthScore >= 85) return `מעולה! ${pet.name} מוגנת`;
    if (healthScore >= 70) return `${pet.name} במצב טוב`;
    if (healthScore >= 50) return `${pet.name} צריכה תשומת לב`;
    return `${pet.name} דורשת טיפול`;
  };

  // Build alerts
  const alerts = useMemo(() => {
    const result: { icon: React.ElementType; text: string; type: 'warning' | 'info' | 'success'; action?: () => void }[] = [];

    if (petData?.next_vet_visit) {
      const nextVisit = new Date(petData.next_vet_visit);
      const daysUntil = Math.ceil((nextVisit.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 0) {
        result.push({ icon: Calendar, text: 'ביקור וטרינר באיחור', type: 'warning' });
      } else if (daysUntil <= 7) {
        result.push({ icon: Calendar, text: `וטרינר בעוד ${daysUntil} ימים`, type: 'warning' });
      } else if (daysUntil <= 30) {
        result.push({ icon: Calendar, text: `וטרינר בעוד ${daysUntil} ימים`, type: 'info' });
      }
    }

    if (!hasInsurance) {
      if (isHighRisk) {
        result.push({ 
          icon: AlertTriangle, 
          text: 'ללא ביטוח — הגן עכשיו', 
          type: 'warning',
          action: () => setShowInsurancePitch(true),
        });
      } else {
        result.push({ 
          icon: Shield, 
          text: 'ללא ביטוח', 
          type: 'info',
          action: () => setShowInsurancePitch(true),
        });
      }
    } else if (insuranceExpired) {
      result.push({ icon: Shield, text: 'ביטוח פג תוקף', type: 'warning' });
    } else {
      result.push({ icon: Shield, text: petData?.insurance_company || 'מבוטח', type: 'success' });
    }

    const conditions = petData?.medical_conditions || [];
    if (conditions.length > 0) {
      result.push({ icon: Activity, text: `${conditions.length} מצבים רפואיים`, type: 'info' });
    }

    return result;
  }, [petData, hasInsurance, isHighRisk, insuranceExpired]);

  const gradientColors = getScoreGradientColors();

  if (loading) {
    return (
      <div className="mx-4 mb-4 p-4 bg-card rounded-2xl border border-border/30">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-3 w-16 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mb-4"
      >
        <div className="w-full p-4 bg-card rounded-2xl border border-border/30 text-right">
          <div className="flex items-center gap-4">
            {/* Circular Score Gauge - linked to vet log */}
            <button onClick={onViewDetails} className="relative w-16 h-16 flex-shrink-0 hover:scale-105 transition-transform">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                <motion.circle
                  cx="18" cy="18" r="15.5" fill="none"
                  stroke={gradientColors.start}
                  strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${healthScore * 0.97} 100`}
                  initial={{ strokeDasharray: "0 100" }}
                  animate={{ strokeDasharray: `${healthScore * 0.97} 100` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-lg font-bold ${getScoreColor()}`}>{healthScore}</span>
              </div>

              {/* Vaccine boost '+' animation */}
              <AnimatePresence>
                {showVaccineBoost && (
                  <motion.div
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: 1, y: -16, scale: 1.2 }}
                    exit={{ opacity: 0, y: -28, scale: 0.8 }}
                    transition={{ duration: 0.8 }}
                    className="absolute -top-1 right-0 flex items-center"
                  >
                    <span className="text-xs font-bold text-green-500 bg-green-500/15 rounded-full px-1.5 py-0.5">
                      +{vaccineCount * 4}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* Score Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Activity className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <span className="font-semibold text-foreground">ציון בריאות</span>
              </div>
              <p className={`text-sm font-medium ${getScoreColor()}`}>{getStatusText()}</p>
              {/* Sub-label */}
              <p className="text-[10px] text-muted-foreground mt-0.5">{getSubLabel()}</p>

              {/* Alerts row */}
              {alerts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {alerts.slice(0, 3).map((alert, i) => (
                    <button
                      key={i}
                      onClick={alert.action}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                        alert.action ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                      } ${
                        alert.type === 'warning'
                          ? 'bg-amber-500/15 text-amber-600'
                          : alert.type === 'success'
                          ? 'bg-green-500/15 text-green-600'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <alert.icon className="w-3 h-3" />
                      {alert.text}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center gap-1.5">
              <button onClick={onViewDetails} className="p-1.5">
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Insurance Pitch Dialog */}
      <AnimatePresence>
        {showInsurancePitch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm"
            onClick={() => setShowInsurancePitch(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-4 mb-6 p-5 bg-card rounded-2xl border border-border/40 shadow-xl"
              dir="rtl"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">ביטוח בריאות ל{pet.name}</h3>
                  <p className="text-[11px] text-muted-foreground">הגנה מותאמת לגזע</p>
                </div>
              </div>

              {breedPitch ? (
                <p className="text-xs text-foreground leading-relaxed mb-4">
                  מכיוון ש{pet.name} {pet.breed ? `היא ${pet.breed}` : ''}, היא נוטה ל{breedPitch.risks}. {breedPitch.pitch}.
                </p>
              ) : (
                <p className="text-xs text-foreground leading-relaxed mb-4">
                  ביטוח בריאות יכסה ביקורי וטרינר, ניתוחים וטיפולים עבור {pet.name}. הגנה שקטה לבעלים אחראי.
                </p>
              )}

              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setShowInsurancePitch(false);
                    navigate('/chat', { state: { petId: pet.id, petName: pet.name, category: 'insurance' } });
                  }}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold"
                >
                  בדוק הצעת מחיר
                </motion.button>
                <button
                  onClick={() => setShowInsurancePitch(false)}
                  className="px-4 py-2.5 bg-muted text-muted-foreground rounded-xl text-xs font-medium"
                >
                  לא עכשיו
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
