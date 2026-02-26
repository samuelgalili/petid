import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Syringe, Calendar, Shield, ChevronLeft, AlertTriangle, CreditCard, Banknote } from "lucide-react";
import { PetIdCard } from "./PetIdCard";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { GlowRing } from "@/components/ui/GlowRing";
import { AdaptiveBackground } from "@/components/ui/AdaptiveBackground";

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
  vet_clinic_name?: string | null;
}

interface PetHealthScoreProps {
  pet: Pet;
  onViewDetails?: () => void;
  refreshKey?: number;
}

// Breed-specific insurance pitches (Hebrew)
const BREED_INSURANCE_PITCHES: Record<string, { risks: string; pitch: string }> = {
  'שיצו': { risks: 'בעיות עיניים ונשימה', pitch: 'ביטוח יכסה טיפולים אלו' },
  'shih tzu': { risks: 'בעיות עיניים ונשימה', pitch: 'ביטוח יכסה טיפולים אלו' },
  'בולדוג צרפתי': { risks: 'בעיות נשימה, עור וקיפולי עור', pitch: 'ביטוח יכסה ניתוחים וטיפולי עור' },
  'french bulldog': { risks: 'בעיות נשימה, עור וקיפולי עור', pitch: 'ביטוח יכסה ניתוחים וטיפולי עור' },
  'גולדן רטריבר': { risks: 'דיספלזיה וסרטן', pitch: 'ביטוח יכסה בדיקות וטיפולים מתקדמים' },
  'golden retriever': { risks: 'דיספלזיה וסרטן', pitch: 'ביטוח יכסה בדיקות וטיפולים מתקדמים' },
  'פאג': { risks: 'בעיות נשימה ועיניים', pitch: 'ביטוח יכסה ניתוחים ובדיקות עיניים' },
  'pug': { risks: 'בעיות נשימה ועיניים', pitch: 'ביטוח יכסה ניתוחים ובדיקות עיניים' },
};

export const PetHealthScore = ({ pet, onViewDetails, refreshKey }: PetHealthScoreProps) => {
  const navigate = useNavigate();
  const [petData, setPetData] = useState<PetFullData | null>(null);
  const [loading, setLoading] = useState(true);
  const [vaccineCount, setVaccineCount] = useState(0);
  const [inRecovery, setInRecovery] = useState(false);
  const [showVaccineBoost, setShowVaccineBoost] = useState(false);
  const [showInsurancePitch, setShowInsurancePitch] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);
  const [hasRecentWeight, setHasRecentWeight] = useState(false);
  const [hasParasitePrevention, setHasParasitePrevention] = useState(false);
  const [hasRegisteredClinic, setHasRegisteredClinic] = useState(false);
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [ownerProfileComplete, setOwnerProfileComplete] = useState(false);
  const [totalVetSpend, setTotalVetSpend] = useState(0);
  const [pendingClaimsCount, setPendingClaimsCount] = useState(0);

  const fetchHealthData = async () => {
      try {
      const userId = (await supabase.auth.getUser()).data.user?.id || '';
      const [petResult, vaccineResult, profileResult, claimsResult] = await Promise.all([
        supabase
          .from("pets")
          .select("weight, is_neutered, medical_conditions, health_notes, has_insurance, insurance_company, insurance_expiry_date, last_vet_visit, next_vet_visit, current_food, vet_clinic_name")
          .eq("id", pet.id)
          .maybeSingle(),
        supabase
          .from("pet_vet_visits")
          .select("id, vaccines, visit_date, is_recovery_mode, recovery_until, raw_summary")
          .eq("pet_id", pet.id)
          .order("visit_date", { ascending: false })
          .limit(20),
        supabase
          .from("profiles")
          .select("full_name, city, phone, id_number_last4")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("insurance_claims")
          .select("id, status, total_amount")
          .eq("pet_id", pet.id)
          .eq("user_id", userId),
      ]);

        if (petResult.data) setPetData(petResult.data as PetFullData);
        
        // Weight tracking: has weight been logged
        setHasRecentWeight(!!petResult.data?.weight);
        
        // Registered clinic check — also fallback to extracted document data
        const petClinic = (petResult.data as any)?.vet_clinic_name;
        if (petClinic) {
          setHasRegisteredClinic(true);
          setClinicName(petClinic);
        } else {
          // Try to find clinic from scanned documents
          const { data: extractedClinic } = await supabase
            .from("pet_document_extracted_data")
            .select("vet_clinic, vet_name")
            .eq("pet_id", pet.id)
            .or("vet_clinic.neq.,vet_name.neq.")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const foundClinic = extractedClinic?.vet_clinic || extractedClinic?.vet_name || null;
          setHasRegisteredClinic(!!foundClinic);
          setClinicName(foundClinic);
        }
        
        // Owner profile completeness
        const profile = profileResult.data;
        setOwnerProfileComplete(!!(profile?.full_name && profile?.city && profile?.phone));
        
        const visits = vaccineResult.data || [];
        
        const recentVaccines = visits.filter((v: any) => {
          const vDate = new Date(v.visit_date);
          const monthsAgo = (Date.now() - vDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
          return monthsAgo <= 12 && (v.vaccines as string[])?.length > 0;
        });
        setVaccineCount(recentVaccines.length);
        
        // Parasite prevention: check for deworming in visits
        const hasDeworming = visits.some((v: any) => {
          const summary = ((v as any).raw_summary || '').toLowerCase();
          return summary.includes('תילוע') || summary.includes('deworm') || summary.includes('milbemax') || summary.includes('drontal');
        });
        setHasParasitePrevention(hasDeworming);
        
        // Show boost animation if vaccines exist
        if (recentVaccines.length > 0) {
          setTimeout(() => {
            setShowVaccineBoost(true);
            setTimeout(() => setShowVaccineBoost(false), 1500);
          }, 1200);
        }
        
        const activeRecovery = visits.find((v: any) =>
          v.is_recovery_mode && v.recovery_until && new Date(v.recovery_until) > new Date()
        );
        setInRecovery(!!activeRecovery);

        // Claims tracking
        const claims = (claimsResult.data || []) as any[];
        setPendingClaimsCount(claims.filter((c: any) => c.status === 'pending').length);
        
        // Calculate total vet spend from claims for savings pitch
        const spend = claims.reduce((sum: number, c: any) => sum + (Number(c.total_amount) || 0), 0);
        setTotalVetSpend(spend);
      } catch (error) {
        console.error('Error fetching pet health data:', error);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchHealthData();
  }, [pet.id, refreshKey]);

  // Calculate profile completion percentage
  const profileCompletion = useMemo(() => {
    if (!petData) return 0;
    const fields = [
      !!pet.birth_date,
      !!pet.breed,
      !!petData.weight,
      petData.is_neutered !== null && petData.is_neutered !== undefined,
      !!petData.current_food,
      !!petData.last_vet_visit,
      petData.has_insurance !== null && petData.has_insurance !== undefined,
      !!petData.health_notes,
      !!pet.avatar_url,
      !!pet.size,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [pet, petData]);

  // V23 Health Score: Vaccines (30) + Weight (15) + Parasites (12) + Profile (10) + Vet (13) + Clinic (10) + Owner (10)
  const healthScore = useMemo(() => {
    if (!petData) return 50;
    
    let score = 0;

    // 1. Completed Vaccines — up to 30 points
    score += Math.min(vaccineCount * 8, 30);

    // 2. Weight Logs — up to 15 points
    if (hasRecentWeight) score += 15;

    // 3. Parasite Prevention — up to 12 points
    if (hasParasitePrevention) score += 12;

    // 4. Profile Completion — up to 10 points
    score += Math.round(profileCompletion * 0.10);

    // 5. Recent Vet Visit — up to 13 points
    if (petData.last_vet_visit) {
      const monthsSince = (Date.now() - new Date(petData.last_vet_visit).getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSince <= 3) score += 13;
      else if (monthsSince <= 6) score += 10;
      else if (monthsSince <= 12) score += 5;
      else score += 2;
    }

    // 6. Registered Clinic — 10 points
    if (hasRegisteredClinic) score += 10;

    // 7. Owner Profile Complete (name, city, phone) — 10 points
    if (ownerProfileComplete) score += 10;

    // Recovery mode penalty
    if (inRecovery) score -= 8;

    return Math.min(100, Math.max(0, score));
  }, [petData, vaccineCount, hasRecentWeight, hasParasitePrevention, profileCompletion, inRecovery, hasRegisteredClinic, ownerProfileComplete]);

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
    if (healthScore >= 85) return `${pet.name} זוהר/ת! ✨`;
    if (healthScore >= 70) return `${pet.name} במסלול מעולה 🌟`;
    if (healthScore >= 50) return `${pet.name} מתקדמ/ת יפה 💪`;
    return `בואו נדאג ל${pet.name} ❤️`;
  };

  // Sub-label based on score + profile completion
  const getSubLabel = () => {
    if (healthScore >= 85) return `כל הכבוד! הפרופיל מושלם`;
    if (healthScore >= 70) return `עוד קצת ו${pet.name} זוהר/ת`;
    if (profileCompletion < 70) return `גלו עוד על ${pet.name} כדי לשפר`;
    if (healthScore >= 50) return `${pet.name} אוהב/ת שדואגים לו`;
    return `כל צעד קטן חשוב ל${pet.name}`;
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

    // Clinic registration alert
    if (!hasRegisteredClinic) {
      result.push({ icon: Activity, text: 'אין מרפאה רשומה', type: 'info' });
    } else if (clinicName) {
      result.push({ icon: Activity, text: `מרפאה: ${clinicName}`, type: 'success' });
    }

    const conditions = petData?.medical_conditions || [];
    if (conditions.length > 0) {
      result.push({ icon: Activity, text: `${conditions.length} מצבים רפואיים`, type: 'info' });
    }

    // Pending claims alert
    if (pendingClaimsCount > 0) {
      result.push({ icon: Banknote, text: `${pendingClaimsCount} תביעות בטיפול`, type: 'info' });
    }

    return result;
  }, [petData, hasInsurance, isHighRisk, insuranceExpired, pendingClaimsCount]);

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
      <AdaptiveBackground healthScore={healthScore}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mb-4"
      >
        <div className="w-full p-3.5 bg-card rounded-2xl border border-border/30 text-right">
          <div className="flex items-center gap-3">
            {/* Compact Circular Score */}
            <GlowRing score={healthScore} size={52}>
            <button onClick={onViewDetails} className="relative w-13 h-13 flex-shrink-0 hover:scale-105 transition-transform">
              {healthScore < 85 && (
                <motion.div
                  className="absolute inset-[-3px] rounded-full"
                  style={{ background: `radial-gradient(circle, ${gradientColors.start}20 0%, transparent 70%)` }}
                  animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 36 36">
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
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-foreground">{healthScore}%</span>
              </div>
            </button>
            </GlowRing>

            {/* Score Info — compact */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Activity className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                <span className="text-sm font-semibold text-foreground">מצב הרוח של {pet.name}</span>
              </div>
              <p className={`text-xs font-medium ${getScoreColor()}`}>{getStatusText()}</p>

              {/* Top 2 alerts only */}
              {alerts.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {alerts.slice(0, 2).map((alert, i) => (
                    <button
                      key={i}
                      onClick={alert.action}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium transition-colors ${
                        alert.action ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                      } ${
                        alert.type === 'warning'
                          ? 'bg-amber-500/15 text-amber-600'
                          : alert.type === 'success'
                          ? 'bg-green-500/15 text-green-600'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <alert.icon className="w-2.5 h-2.5" />
                      {alert.text}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions — single button */}
            <button onClick={() => setShowIdCard(true)} className="p-1.5 hover:bg-muted/60 rounded-lg transition-colors" title="תעודת זיהוי">
              <CreditCard className="w-4 h-4 text-primary/70" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </motion.div>
      </AdaptiveBackground>

      {/* Insurance Pitch Dialog */}
      <AnimatePresence>
        {showInsurancePitch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] flex items-end justify-center bg-background/60 backdrop-blur-sm"
            onClick={() => setShowInsurancePitch(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-4 p-5 bg-card rounded-2xl border border-border/40 shadow-xl"
              style={{ marginBottom: "calc(80px + env(safe-area-inset-bottom, 16px))" }}
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

              {ownerProfileComplete && (
                <div className="p-2.5 bg-green-500/10 rounded-xl mb-3">
                  <p className="text-[11px] font-medium text-green-700">
                    ✅ הפרטים שלך (ת"ז, כתובת, טלפון) כבר מעודכנים — הטופס ימולא אוטומטית
                  </p>
                </div>
              )}

              {/* Savings calculation pitch */}
              {totalVetSpend > 0 && (
                <div className="p-2.5 bg-primary/5 rounded-xl mb-3 border border-primary/10">
                  <p className="text-[11px] font-medium text-foreground">
                    💰 הוצאת עד כה ₪{totalVetSpend.toLocaleString()} על ביקורי וטרינר. עם ביטוח, היית יכול לחסוך עד ₪{Math.round(totalVetSpend * 0.75).toLocaleString()}.
                  </p>
                </div>
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

      {/* Pet ID Card */}
      <PetIdCard
        petId={pet.id}
        petName={pet.name}
        petType={pet.type}
        breed={pet.breed}
        avatarUrl={pet.avatar_url}
        open={showIdCard}
        onClose={() => setShowIdCard(false)}
      />
    </>
  );
};
