import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
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

export const PetHealthScore = ({ pet, onViewDetails }: PetHealthScoreProps) => {
  const navigate = useNavigate();
  const [petData, setPetData] = useState<PetFullData | null>(null);
  const [loading, setLoading] = useState(true);
  const [vaccineCount, setVaccineCount] = useState(0);
  const [inRecovery, setInRecovery] = useState(false);

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
        
        // Count recent vaccinations (last 12 months) for health score boost
        const recentVaccines = (vaccineResult.data || []).filter((v: any) => {
          const vDate = new Date(v.visit_date);
          const monthsAgo = (Date.now() - vDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
          return monthsAgo <= 12 && (v.vaccines as string[])?.length > 0;
        });
        setVaccineCount(recentVaccines.length);
        
        // Check recovery mode
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

  // Calculate real health score based on actual pet data
  const healthScore = useMemo(() => {
    if (!petData) return 50;
    let score = 60; // Base score

    // Age factor
    if (pet.birth_date) {
      score += 5; // Has birth date recorded
      const birth = new Date(pet.birth_date);
      const ageYears = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (ageYears < 3) score += 8;
      else if (ageYears <= 7) score += 5;
      else if (ageYears > 10) score -= 5; // Senior risk
    }

    // Weight recorded
    if (petData.weight) score += 5;

    // Neutered
    if (petData.is_neutered === true) score += 3;

    // Medical conditions penalty
    const conditions = petData.medical_conditions || [];
    if (conditions.length === 0) {
      score += 8; // No known issues
    } else {
      // Each condition reduces score slightly, but having them tracked is good
      score -= Math.min(conditions.length * 3, 10);
      score += 3; // Bonus for tracking conditions
    }

    // Diet awareness
    if (petData.current_food) score += 3;

    // Vet visits
    if (petData.last_vet_visit) {
      const lastVisit = new Date(petData.last_vet_visit);
      const monthsSince = (Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSince <= 6) score += 8;
      else if (monthsSince <= 12) score += 4;
      else score -= 3; // Overdue
    }

    // Insurance
    if (petData.has_insurance) score += 5;

    // Health notes present
    if (petData.health_notes) score += 2;

    // Vaccine boost (recent vaccinations)
    score += Math.min(vaccineCount * 4, 10);

    // Recovery mode penalty
    if (inRecovery) score -= 8;

    return Math.min(100, Math.max(0, score));
  }, [pet.birth_date, petData, vaccineCount, inRecovery]);

  // Determine if pet is high-risk (senior or medical conditions)
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

  // Score display helpers
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

  // Build alerts from real data
  const alerts = useMemo(() => {
    const result: { icon: React.ElementType; text: string; type: 'warning' | 'info' | 'success' }[] = [];

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
        result.push({ icon: AlertTriangle, text: 'סיכון גבוה ללא ביטוח', type: 'warning' });
      } else {
        result.push({ icon: Shield, text: 'ללא ביטוח', type: 'info' });
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
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4"
    >
      <div className="w-full p-4 bg-card rounded-2xl border border-border/30 text-right">
        <div className="flex items-center gap-4">
          {/* Circular Score Gauge */}
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
          </button>

          {/* Score Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-primary" strokeWidth={1.5} />
              <span className="font-semibold text-foreground">ציון בריאות</span>
            </div>
            <p className={`text-sm font-medium ${getScoreColor()}`}>{getStatusText()}</p>

            {/* Alerts row */}
            {alerts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {alerts.slice(0, 3).map((alert, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      alert.type === 'warning'
                        ? 'bg-amber-500/15 text-amber-600'
                        : alert.type === 'success'
                        ? 'bg-green-500/15 text-green-600'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <alert.icon className="w-3 h-3" />
                    {alert.text}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Insurance Action / Arrow */}
          <div className="flex flex-col items-center gap-1.5">
            {!hasInsurance && isHighRisk ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/chat', { state: { petId: pet.id, petName: pet.name, category: 'insurance' } })}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-bold shadow-sm transition-colors whitespace-nowrap"
              >
                הגן עכשיו
              </motion.button>
            ) : !hasInsurance ? (
              <button
                onClick={() => navigate('/chat', { state: { petId: pet.id, petName: pet.name, category: 'insurance' } })}
                className="p-1.5"
              >
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </button>
            ) : (
              <button onClick={onViewDetails} className="p-1.5">
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
