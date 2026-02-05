import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Activity, Syringe, Calendar, Shield, ChevronLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

interface HealthData {
  hasVaccinations: boolean;
  nextVaccineDays: number | null;
  hasMedicalRecords: boolean;
  hasInsurance: boolean;
}

interface PetHealthScoreProps {
  pet: Pet;
  onViewDetails?: () => void;
}

export const PetHealthScore = ({ pet, onViewDetails }: PetHealthScoreProps) => {
  const [healthData, setHealthData] = useState<HealthData>({
    hasVaccinations: false,
    nextVaccineDays: null,
    hasMedicalRecords: false,
    hasInsurance: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealthData();
  }, [pet.id]);

  const fetchHealthData = async () => {
    try {
      // Fetch vaccination records
      const { data: vaccinations } = await supabase
        .from('pet_vaccinations')
        .select('next_due_date')
        .eq('pet_id', pet.id)
        .order('next_due_date', { ascending: true })
        .limit(1);

      // Fetch medical records count
      const { count: medicalCount } = await supabase
        .from('pet_medical_records')
        .select('*', { count: 'exact', head: true })
        .eq('pet_id', pet.id);

      // Calculate next vaccine days
      let nextVaccineDays: number | null = null;
      if (vaccinations && vaccinations.length > 0 && vaccinations[0].next_due_date) {
        const nextDate = new Date(vaccinations[0].next_due_date);
        const today = new Date();
        nextVaccineDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      setHealthData({
        hasVaccinations: (vaccinations?.length || 0) > 0,
        nextVaccineDays,
        hasMedicalRecords: (medicalCount || 0) > 0,
        hasInsurance: false // Would check insurance table
      });
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate health score based on actual data
  const calculateHealthScore = () => {
    let score = 70; // Base score

    // Age-based adjustments
    if (pet.birth_date) {
      const birth = new Date(pet.birth_date);
      const ageYears = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (ageYears < 3) score += 10;
      else if (ageYears > 8) score -= 5;
    }

    // Vaccination status
    if (healthData.hasVaccinations) {
      score += 10;
      if (healthData.nextVaccineDays !== null && healthData.nextVaccineDays > 30) {
        score += 5; // Up to date on vaccines
      }
    }

    // Medical records
    if (healthData.hasMedicalRecords) score += 5;

    return Math.min(100, Math.max(0, score));
  };

  const healthScore = calculateHealthScore();
  
  // Determine score color and status
  const getScoreColor = () => {
    if (healthScore >= 85) return 'text-green-500';
    if (healthScore >= 70) return 'text-primary';
    if (healthScore >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreGradient = () => {
    if (healthScore >= 85) return 'from-green-500 to-emerald-400';
    if (healthScore >= 70) return 'from-primary to-primary/70';
    if (healthScore >= 50) return 'from-amber-500 to-orange-400';
    return 'from-red-500 to-red-400';
  };

  const getStatusText = () => {
    if (healthScore >= 85) return 'מצוין';
    if (healthScore >= 70) return 'טוב';
    if (healthScore >= 50) return 'סביר';
    return 'דורש תשומת לב';
  };

  // Determine alerts
  const alerts: { icon: React.ElementType; text: string; type: 'warning' | 'info' | 'success' }[] = [];
  
  if (healthData.nextVaccineDays !== null) {
    if (healthData.nextVaccineDays <= 0) {
      alerts.push({ icon: Syringe, text: 'חיסון באיחור', type: 'warning' });
    } else if (healthData.nextVaccineDays <= 14) {
      alerts.push({ icon: Calendar, text: `חיסון בעוד ${healthData.nextVaccineDays} ימים`, type: 'warning' });
    } else if (healthData.nextVaccineDays <= 30) {
      alerts.push({ icon: Calendar, text: `חיסון בעוד ${healthData.nextVaccineDays} ימים`, type: 'info' });
    }
  } else if (!healthData.hasVaccinations) {
    alerts.push({ icon: Syringe, text: 'אין רשומות חיסונים', type: 'info' });
  }

  if (!healthData.hasInsurance) {
    alerts.push({ icon: Shield, text: 'ללא ביטוח', type: 'info' });
  }

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
      <button
        onClick={onViewDetails}
        className="w-full p-4 bg-card rounded-2xl border border-border/30 hover:border-primary/30 transition-colors text-right"
      >
        <div className="flex items-center gap-4">
          {/* Circular Score Gauge */}
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              {/* Background circle */}
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="3"
              />
              {/* Progress circle */}
              <motion.circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="url(#healthGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${healthScore * 0.97} 100`}
                initial={{ strokeDasharray: "0 100" }}
                animate={{ strokeDasharray: `${healthScore * 0.97} 100` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" className={`${getScoreGradient().includes('green') ? 'stop-green-500' : getScoreGradient().includes('amber') ? 'stop-amber-500' : 'stop-primary'}`} stopColor="hsl(var(--primary))" />
                  <stop offset="100%" className="stop-primary/70" stopColor="hsl(var(--primary) / 0.7)" />
                </linearGradient>
              </defs>
            </svg>
            {/* Score text in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-lg font-bold ${getScoreColor()}`}>
                {healthScore}
              </span>
            </div>
          </div>

          {/* Score Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground">ציון בריאות</span>
            </div>
            <p className={`text-sm font-medium ${getScoreColor()}`}>
              {getStatusText()}
            </p>
            
            {/* Alerts row */}
            {alerts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {alerts.slice(0, 2).map((alert, i) => (
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

          {/* Arrow */}
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </div>
      </button>
    </motion.div>
  );
};
