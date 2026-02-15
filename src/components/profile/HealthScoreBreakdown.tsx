/**
 * HealthScoreBreakdown — Detailed view of health score pillars,
 * actionable to-do items, breed-specific preventive insights,
 * and direct commerce links for improvement.
 */

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Syringe, Utensils, ShieldCheck, UserCheck, 
  CheckCircle2, Circle, ChevronLeft, Sparkles, 
  Eye, ShoppingBag, ArrowUpRight, Activity,
  Smile, Droplets, Wind, AlertTriangle
} from "lucide-react";
import { FelineUrinarySupport } from "./FelineUrinarySupport";
import { FelineRenalCare } from "./FelineRenalCare";
import { FelineGastrointestinal } from "./FelineGastrointestinal";
import { FelineNeuteredCare } from "./FelineNeuteredCare";
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

interface HealthScoreBreakdownProps {
  pet: Pet;
  isOpen: boolean;
  onClose: () => void;
}

interface Pillar {
  id: string;
  label: string;
  icon: React.ElementType;
  weight: number; // percentage of total
  score: number; // 0-100 within this pillar
  description: string;
  color: string;
}

interface TodoItem {
  id: string;
  text: string;
  pointsGain: number;
  done: boolean;
  action?: () => void;
}

// Breed-specific preventive tips (dogs + cats)
const BREED_PREVENTIVE_TIPS: Record<string, string> = {
  // Dogs
  'shih tzu': 'מכיוון ששיטסו נוטים לבעיות דמעות, שמירה על ניקיון העיניים יומיומי ישמור על ציון הטיפוח שלך גבוה וימנע דלקות עתידיות.',
  'שיצו': 'מכיוון ששיטסו נוטים לבעיות דמעות, שמירה על ניקיון העיניים יומיומי ישמור על ציון הטיפוח שלך גבוה וימנע דלקות עתידיות.',
  'שי טסו': 'מכיוון ששיטסו נוטים לבעיות דמעות, שמירה על ניקיון העיניים יומיומי ישמור על ציון הטיפוח שלך גבוה וימנע דלקות עתידיות.',
  'french bulldog': 'בולדוגים צרפתיים רגישים לבעיות נשימה. פעילות מתונה ומניעת חשיפה לחום תשמור על ציון הבריאות גבוה.',
  'בולדוג צרפתי': 'בולדוגים צרפתיים רגישים לבעיות נשימה. פעילות מתונה ומניעת חשיפה לחום תשמור על ציון הבריאות גבוה.',
  'golden retriever': 'גולדן רטריברים נוטים לדיספלזיה במפרק הירך. בדיקות תקופתיות ומשקל תקין יסייעו במניעה.',
  'גולדן רטריבר': 'גולדן רטריברים נוטים לדיספלזיה במפרק הירך. בדיקות תקופתיות ומשקל תקין יסייעו במניעה.',
  'pug': 'פאגים נוטים לבעיות עיניים ונשימה. ניקיון קפלי עור ומעקב עיניים שוטף ישמרו על הבריאות.',
  'פאג': 'פאגים נוטים לבעיות עיניים ונשימה. ניקיון קפלי עור ומעקב עיניים שוטף ישמרו על הבריאות.',
  // Cats
  'persian': 'חתולים פרסיים נוטים ל-PKD (מחלת כליות פוליציסטית). בדיקת אולטרסאונד שנתית ותזונה דלת-זרחן חיוניות.',
  'פרסי': 'חתולים פרסיים נוטים ל-PKD (מחלת כליות פוליציסטית). בדיקת אולטרסאונד שנתית ותזונה דלת-זרחן חיוניות.',
  'siamese': 'סיאמיים נוטים לבעיות שיניים (FORL) ולאסתמה. בדיקת שיניים שנתית ומעקב נשימתי חשובים.',
  'סיאמי': 'סיאמיים נוטים לבעיות שיניים (FORL) ולאסתמה. בדיקת שיניים שנתית ומעקב נשימתי חשובים.',
  'british shorthair': 'בריטיים נוטים ל-HCM (מחלת לב) והשמנה. מעקב אקו-לב שנתי ותזונה מבוקרת קלוריות.',
  'בריטי קצר שיער': 'בריטיים נוטים ל-HCM (מחלת לב) והשמנה. מעקב אקו-לב שנתי ותזונה מבוקרת קלוריות.',
  'maine coon': 'מיין קון נוטים ל-HCM ודיספלזיה. בדיקות לב תקופתיות ותמיכת מפרקים מומלצות.',
  'מיין קון': 'מיין קון נוטים ל-HCM ודיספלזיה. בדיקות לב תקופתיות ותמיכת מפרקים מומלצות.',
  'ragdoll': 'רגדול נוטים ל-HCM ואבני שתן. מומלץ מזון רטוב ומעקב אקו-לב.',
  'רגדול': 'רגדול נוטים ל-HCM ואבני שתן. מומלץ מזון רטוב ומעקב אקו-לב.',
  'scottish fold': 'סקוטיש פולד סובלים מאוסטאוכונדרודיספלזיה. מעקב מפרקים ותנועה חיוני.',
  'סקוטיש פולד': 'סקוטיש פולד סובלים מאוסטאוכונדרודיספלזיה. מעקב מפרקים ותנועה חיוני.',
};

export const HealthScoreBreakdown = ({ pet, isOpen, onClose }: HealthScoreBreakdownProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [petData, setPetData] = useState<any>(null);
  const [vaccineCount, setVaccineCount] = useState(0);
  const [hasParasitePrevention, setHasParasitePrevention] = useState(false);
  const [hasRegisteredClinic, setHasRegisteredClinic] = useState(false);
  const [ownerProfileComplete, setOwnerProfileComplete] = useState(false);
  const [hasMicrochip, setHasMicrochip] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [lowPillarProducts, setLowPillarProducts] = useState<any[]>([]);
  const [breedInfo, setBreedInfo] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchData();
  }, [isOpen, pet.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userId = (await supabase.auth.getUser()).data.user?.id || '';

      const [petResult, vaccineResult, profileResult, breedResult] = await Promise.all([
        supabase
          .from("pets")
          .select("weight, is_neutered, medical_conditions, health_notes, has_insurance, current_food, vet_clinic_name, microchip_number, next_vet_visit, last_vet_visit")
          .eq("id", pet.id)
          .maybeSingle(),
        supabase
          .from("pet_vet_visits")
          .select("id, vaccines, visit_date, raw_summary")
          .eq("pet_id", pet.id)
          .order("visit_date", { ascending: false })
          .limit(20),
        supabase
          .from("profiles")
          .select("full_name, city, phone, id_number_last4")
          .eq("id", userId)
          .maybeSingle(),
        pet.breed ? supabase
          .from('breed_information')
          .select('grooming_freq')
          .or(`breed_name.ilike.%${pet.breed}%,breed_name_he.ilike.%${pet.breed}%`)
          .maybeSingle() : Promise.resolve({ data: null }),
      ]);

      if (breedResult.data) setBreedInfo(breedResult.data);

      const pd = petResult.data as any;
      setPetData(pd);
      setHasMicrochip(!!pd?.microchip_number);
      setHasRegisteredClinic(!!pd?.vet_clinic_name);

      const profile = profileResult.data;
      setOwnerProfileComplete(!!(profile?.full_name && profile?.city && profile?.phone));

      // Profile completion
      const fields = [
        !!pet.birth_date, !!pet.breed, !!pd?.weight,
        pd?.is_neutered !== null, !!pd?.current_food,
        !!pd?.last_vet_visit, pd?.has_insurance !== null,
        !!pd?.health_notes, !!pet.avatar_url, !!pet.size,
      ];
      setProfileCompletion(Math.round((fields.filter(Boolean).length / fields.length) * 100));

      const visits = vaccineResult.data || [];
      const recentVaccines = visits.filter((v: any) => {
        const vDate = new Date(v.visit_date);
        const monthsAgo = (Date.now() - vDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return monthsAgo <= 12 && (v.vaccines as string[])?.length > 0;
      });
      setVaccineCount(recentVaccines.length);

      const hasDeworming = visits.some((v: any) => {
        const summary = ((v as any).raw_summary || '').toLowerCase();
        return summary.includes('תילוע') || summary.includes('deworm') || summary.includes('milbemax');
      });
      setHasParasitePrevention(hasDeworming);
    } catch (err) {
      console.error('Error fetching health breakdown:', err);
    } finally {
      setLoading(false);
    }
  };

  // Life stage calculation (species-aware: cats mature faster)
  const isCat = pet.type === 'cat';
  const lifeStage = useMemo(() => {
    if (!pet.birth_date) return { label: 'לא ידוע', months: 0, stage: 'unknown' as const };
    const totalMonths = Math.floor((Date.now() - new Date(pet.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (isCat) {
      // Cat life stages differ from dogs
      if (totalMonths < 6) return { label: 'גור', months: totalMonths, stage: 'puppy' as const };
      if (totalMonths < 12) return { label: 'גור צעיר', months: totalMonths, stage: 'junior' as const };
      if (totalMonths < 36) return { label: 'צעיר/ה', months: totalMonths, stage: 'young' as const };
      const years = Math.floor(totalMonths / 12);
      if (years > 10) return { label: 'סניור', months: totalMonths, stage: 'senior' as const };
      return { label: 'בוגר/ת', months: totalMonths, stage: 'adult' as const };
    }
    if (totalMonths < 6) return { label: 'גור', months: totalMonths, stage: 'puppy' as const };
    if (totalMonths < 12) return { label: 'גור צעיר', months: totalMonths, stage: 'junior' as const };
    if (totalMonths < 24) return { label: 'צעיר/ה', months: totalMonths, stage: 'young' as const };
    const years = Math.floor(totalMonths / 12);
    if (years > 7) return { label: 'סניור', months: totalMonths, stage: 'senior' as const };
    return { label: 'בוגר/ת', months: totalMonths, stage: 'adult' as const };
  }, [pet.birth_date, isCat]);

  // Breed detection
  const isShihTzu = useMemo(() => {
    const b = (pet.breed || '').toLowerCase();
    return b.includes('shih tzu') || b.includes('שיצו') || b.includes('שי טסו');
  }, [pet.breed]);

  // Cat-specific flags
  const isIndoorOrNeutered = isCat && (petData?.is_neutered === true);

  // Life-stage-aware pillar weights — species-specific
  const pillarWeights = useMemo(() => {
    const isPuppy = lifeStage.stage === 'puppy' || lifeStage.stage === 'junior';
    const isSenior = lifeStage.stage === 'senior';

    // === CAT WEIGHTS ===
    if (isCat) {
      // Cats: Urinary, Hydration, Hairball are critical; Eye/Dental only for specific breeds
      if (isPuppy) return { vaccines: 30, nutrition: 20, prevention: 15, profile: 5, eyeCare: 0, dental: 0, urinary: 15, hydration: 10, hairball: 5 };
      if (isSenior) return { vaccines: 15, nutrition: 15, prevention: 10, profile: 5, eyeCare: 0, dental: 0, urinary: 20, hydration: 20, hairball: 15 };
      if (isIndoorOrNeutered) return { vaccines: 20, nutrition: 15, prevention: 10, profile: 5, eyeCare: 0, dental: 0, urinary: 20, hydration: 18, hairball: 12 };
      return { vaccines: 25, nutrition: 18, prevention: 12, profile: 5, eyeCare: 0, dental: 0, urinary: 18, hydration: 15, hairball: 7 };
    }

    // === DOG WEIGHTS ===
    if (isShihTzu) {
      if (isPuppy) return { vaccines: 30, nutrition: 18, prevention: 12, profile: 5, eyeCare: 20, dental: 15, urinary: 0, hydration: 0, hairball: 0 };
      if (isSenior) return { vaccines: 18, nutrition: 22, prevention: 18, profile: 7, eyeCare: 20, dental: 15, urinary: 0, hydration: 0, hairball: 0 };
      return { vaccines: 25, nutrition: 20, prevention: 15, profile: 10, eyeCare: 18, dental: 12, urinary: 0, hydration: 0, hairball: 0 };
    }

    if (isPuppy) return { vaccines: 45, nutrition: 25, prevention: 20, profile: 10, eyeCare: 0, dental: 0, urinary: 0, hydration: 0, hairball: 0 };
    if (isSenior) return { vaccines: 25, nutrition: 30, prevention: 30, profile: 15, eyeCare: 0, dental: 0, urinary: 0, hydration: 0, hairball: 0 };
    return { vaccines: 35, nutrition: 25, prevention: 25, profile: 15, eyeCare: 0, dental: 0, urinary: 0, hydration: 0, hairball: 0 };
  }, [lifeStage.stage, isShihTzu, isCat, isIndoorOrNeutered]);

  // Calculate individual pillar scores
  const pillars: Pillar[] = useMemo(() => {
    if (!petData) return [];

    const vaccScore = Math.min(vaccineCount * 30, 90);
    const vaccDesc = vaccScore >= 90
      ? `${pet.name} מחוסנ${isCat ? '' : 'ת'} במלואה. כל הכבוד!`
      : vaccScore > 0
      ? isCat
        ? `${pet.name} מחוסנ${isCat ? '' : 'ת'} ב-${vaccScore}%. חסר חיסון ${vaccScore < 60 ? 'FVRCP (מרובעת)' : 'FeLV (לוקמיה)'} להשלמה.`
        : `${pet.name} מחוסנת ב-${vaccScore}%. חסר חיסון משושה להשלמה.`
      : `אין רשומות חיסונים. העלה צילום כדי לעדכן.`;

    const hasFood = !!petData.current_food;
    const hasWeight = !!petData.weight;
    let nutrScore = 0;
    if (hasFood) nutrScore += 50;
    if (hasWeight) nutrScore += 30;
    if (pet.birth_date) nutrScore += 20;
    const nutrDesc = hasFood
      ? `תזונה מותאמת לגיל (${lifeStage.label}) ולגזע (${pet.breed || 'לא ידוע'}).`
      : `לא הוזן מזון נוכחי. עדכן כדי לקבל המלצות מותאמות.`;

    let prevScore = 0;
    if (hasParasitePrevention) prevScore += 60;
    if (hasRegisteredClinic) prevScore += 40;
    const prevDesc = hasParasitePrevention
      ? 'טיפול נגד פרעושים ותולעים בתוקף.'
      : 'לא נמצא רשומת טיפול מונע. העלה צילום מסמך.';

    const profScore = profileCompletion;
    const missingItems: string[] = [];
    if (!hasMicrochip) missingItems.push('מספר שבב');
    if (!ownerProfileComplete) missingItems.push('פרטי בעלים');
    if (!pet.avatar_url) missingItems.push('תמונה');
    const profDesc = profScore >= 100
      ? 'הפרופיל מלא ומעודכן!'
      : `חסר ${missingItems.join(', ')} להשלמת הפרופיל.`;

    const result: Pillar[] = [
      { id: 'vaccines', label: 'חיסונים', icon: Syringe, weight: pillarWeights.vaccines, score: vaccScore, description: vaccDesc, color: 'text-blue-500' },
      { id: 'nutrition', label: 'תזונה', icon: Utensils, weight: pillarWeights.nutrition, score: nutrScore, description: nutrDesc, color: 'text-green-500' },
      { id: 'prevention', label: 'מניעה', icon: ShieldCheck, weight: pillarWeights.prevention, score: prevScore, description: prevDesc, color: 'text-amber-500' },
      { id: 'profile', label: 'השלמת פרופיל', icon: UserCheck, weight: pillarWeights.profile, score: profScore, description: profDesc, color: 'text-purple-500' },
    ];

    // Breed-specific: Eye Care (Shih Tzu)
    if (pillarWeights.eyeCare > 0) {
      const eyeScore = hasParasitePrevention ? 70 : 40;
      result.push({
        id: 'eye_care',
        label: 'טיפול עיניים',
        icon: Eye,
        weight: pillarWeights.eyeCare,
        score: eyeScore,
        description: eyeScore >= 70
          ? `ניקיון עיניים יומי מומלץ ל${pet.breed}. נראה שאת/ה על זה!`
          : `${pet.breed} נוטים לדמיעה מוגברת. הקפידו על ניקיון עיניים יומי עם מגבונים ייעודיים.`,
        color: 'text-sky-500',
      });
    }

    // Breed-specific: Dental Hygiene (Shih Tzu / small breeds)
    if (pillarWeights.dental > 0) {
      const dentalScore = (petData.weight && petData.weight < 8) ? 50 : 65;
      result.push({
        id: 'dental',
        label: 'היגיינת שיניים',
        icon: Smile,
        weight: pillarWeights.dental,
        score: dentalScore,
        description: dentalScore >= 65
          ? 'מומלץ לצחצח שיניים 2-3 פעמים בשבוע ולספק חטיפי לעיסה.'
          : `גזעים קטנים כמו ${pet.breed} נוטים למחלות חניכיים. צחצוח שיניים קבוע חיוני.`,
        color: 'text-pink-500',
      });
    }

    // === CAT-SPECIFIC PILLARS ===
    
    // Urinary Health (FLUTD/Struvite) — critical for cats
    if (pillarWeights.urinary > 0) {
      const foodLower = (petData.current_food || '').toLowerCase();
      const hasUrinaryFood = ['urinary', 'struvite', 'ph', 'שתן'].some(k => foodLower.includes(k));
      const isNeutered = petData.is_neutered === true;
      let urinaryScore = 50;
      if (hasUrinaryFood) urinaryScore += 30;
      if (isNeutered) urinaryScore -= 10; // higher risk
      if (hasRegisteredClinic) urinaryScore += 15;
      urinaryScore = Math.max(0, Math.min(100, urinaryScore));
      
      const conditions = (petData.medical_conditions || []) as string[];
      const hasUrinaryIssue = conditions.some((c: string) => ['urinary', 'struvite', 'flutd', 'שתן', 'אבני'].some(k => c.toLowerCase().includes(k)));
      
      result.push({
        id: 'urinary',
        label: 'בריאות שתן',
        icon: Droplets,
        weight: pillarWeights.urinary,
        score: hasUrinaryIssue ? Math.min(urinaryScore, 40) : urinaryScore,
        description: hasUrinaryIssue
          ? 'זוהתה בעיית דרכי שתן. מומלץ מזון Urinary S/O ומעבר למזון רטוב בלבד.'
          : isNeutered
          ? 'חתולים מעוקרים בסיכון גבוה יותר ל-FLUTD. הקפידו על מזון מבוקר pH ונוזלים מרובים.'
          : 'בקרת pH ומגנזיום נמוך חיוניים לבריאות דרכי השתן.',
        color: 'text-cyan-500',
      });
    }

    // Hydration Level — cats naturally drink very little
    if (pillarWeights.hydration > 0) {
      const foodLower = (petData.current_food || '').toLowerCase();
      const hasWetFood = ['wet', 'רטוב', 'pate', 'פטה', 'gravy', 'רוטב', 'mousse'].some(k => foodLower.includes(k));
      let hydrationScore = hasWetFood ? 80 : 35;
      if (hasRegisteredClinic) hydrationScore += 10;
      hydrationScore = Math.min(100, hydrationScore);

      result.push({
        id: 'hydration',
        label: 'לחות',
        icon: Droplets,
        weight: pillarWeights.hydration,
        score: hydrationScore,
        description: hasWetFood
          ? 'מזון רטוב מספק כ-80% לחות — מצוין לבריאות הכליות.'
          : 'חתולים כמעט לא שותים. מזון רטוב (80%+ לחות) חיוני למניעת בעיות כליות ושתן.',
        color: 'text-blue-400',
      });
    }

    // Hairball Control
    if (pillarWeights.hairball > 0) {
      const foodLower = (petData.current_food || '').toLowerCase();
      const hasHairballFood = ['hairball', 'כדורי שיער', 'fiber', 'סיבים', 'malt'].some(k => foodLower.includes(k));
      const groomingLevel = breedInfo?.grooming_freq || 3;
      let hairballScore = hasHairballFood ? 75 : 45;
      if (groomingLevel >= 4) hairballScore -= 10; // long-haired = more risk
      hairballScore = Math.max(0, Math.min(100, hairballScore));

      result.push({
        id: 'hairball',
        label: 'כדורי שיער',
        icon: Wind,
        weight: pillarWeights.hairball,
        score: hairballScore,
        description: hasHairballFood
          ? 'מזון עשיר בסיבים ומאלט מסייע בהוצאת כדורי שיער.'
          : 'מומלץ מזון עם סיבים מוגברים ומשחת מאלט למניעת חסימות כדורי שיער.',
        color: 'text-orange-400',
      });
    }

    return result;
  }, [petData, vaccineCount, hasParasitePrevention, hasRegisteredClinic, profileCompletion, hasMicrochip, ownerProfileComplete, pet, pillarWeights, lifeStage, isCat, breedInfo]);

  // Total score
  const totalScore = useMemo(() => {
    if (pillars.length === 0) return 0;
    return Math.round(pillars.reduce((sum, p) => sum + (p.score * p.weight / 100), 0));
  }, [pillars]);

  // Build to-do items — dynamic based on what's missing
  const todos: TodoItem[] = useMemo(() => {
    const items: TodoItem[] = [];
    if (vaccineCount < 3) {
      items.push({
        id: 'vaccine-upload',
        text: isCat ? 'העלה צילום של חיסון FVRCP (מרובעת)' : 'העלה צילום של חיסון המשושה',
        pointsGain: Math.round(pillarWeights.vaccines * 0.1),
        done: false,
        action: () => { onClose(); navigate(`/pet/${pet.id}/vet-log`); },
      });
    }
    if (!hasMicrochip) {
      items.push({
        id: 'microchip',
        text: 'השלם את מספר השבב מהמסמכים',
        pointsGain: Math.round(pillarWeights.profile * 0.2),
        done: false,
        action: () => { onClose(); navigate(`/pet/${pet.id}/edit`); },
      });
    }
    if (!petData?.current_food) {
      items.push({
        id: 'food',
        text: 'עדכן את סוג המזון הנוכחי',
        pointsGain: Math.round(pillarWeights.nutrition * 0.15),
        done: false,
        action: () => { onClose(); navigate(`/pet/${pet.id}/edit`); },
      });
    }
    if (!hasParasitePrevention) {
      items.push({
        id: 'parasite',
        text: 'העלה אישור טיפול נגד פרעושים',
        pointsGain: Math.round(pillarWeights.prevention * 0.12),
        done: false,
        action: () => { onClose(); navigate(`/pet/${pet.id}/vet-log`); },
      });
    }
    if (!ownerProfileComplete) {
      items.push({
        id: 'owner',
        text: 'השלם פרטי בעלים (שם, טלפון, עיר)',
        pointsGain: Math.round(pillarWeights.profile * 0.2),
        done: false,
        action: () => { onClose(); navigate('/edit-profile'); },
      });
    }
    // Breed-specific todos (dogs)
    if (isShihTzu && pillarWeights.eyeCare > 0) {
      items.push({
        id: 'eye-wipes',
        text: 'רכשו מגבוני עיניים ייעודיים לשיצו',
        pointsGain: Math.round(pillarWeights.eyeCare * 0.15),
        done: false,
        action: () => { onClose(); navigate('/shop'); },
      });
    }
    if (isShihTzu && pillarWeights.dental > 0) {
      items.push({
        id: 'dental-chew',
        text: 'הוסיפו חטיפי לעיסה לשמירה על שיניים',
        pointsGain: Math.round(pillarWeights.dental * 0.1),
        done: false,
        action: () => { onClose(); navigate('/shop'); },
      });
    }
    // Cat-specific todos
    if (isCat) {
      const foodLower = (petData?.current_food || '').toLowerCase();
      const hasWetFood = ['wet', 'רטוב', 'pate', 'פטה'].some(k => foodLower.includes(k));
      if (!hasWetFood) {
        items.push({
          id: 'wet-food',
          text: 'הוסיפו מזון רטוב (80%+ לחות) לשיפור ההידרציה',
          pointsGain: Math.round(pillarWeights.hydration * 0.2),
          done: false,
          action: () => { onClose(); navigate('/shop'); },
        });
      }
      const hasUrinaryFood = ['urinary', 'struvite', 'ph'].some(k => foodLower.includes(k));
      if (!hasUrinaryFood && pillarWeights.urinary > 0) {
        items.push({
          id: 'urinary-food',
          text: 'שקלו מזון Urinary לבקרת pH ומגנזיום נמוך',
          pointsGain: Math.round(pillarWeights.urinary * 0.15),
          done: false,
          action: () => { onClose(); navigate('/shop'); },
        });
      }
      const hasHairballFood = ['hairball', 'כדורי שיער', 'malt'].some(k => foodLower.includes(k));
      if (!hasHairballFood && pillarWeights.hairball > 0) {
        items.push({
          id: 'hairball-food',
          text: 'הוסיפו משחת מאלט או מזון Hairball Control',
          pointsGain: Math.round(pillarWeights.hairball * 0.15),
          done: false,
          action: () => { onClose(); navigate('/shop'); },
        });
      }
    }
    return items;
  }, [petData, vaccineCount, hasMicrochip, hasParasitePrevention, ownerProfileComplete, pet.id, pillarWeights, isShihTzu, isCat]);

  // Get breed preventive tip
  const breedTip = useMemo(() => {
    if (!pet.breed) return null;
    const breedLower = pet.breed.toLowerCase();
    for (const [key, tip] of Object.entries(BREED_PREVENTIVE_TIPS)) {
      if (breedLower.includes(key) || key.includes(breedLower)) {
        return tip;
      }
    }
    return null;
  }, [pet.breed]);

  // Find lowest pillar for commerce link
  const lowestPillar = useMemo(() => {
    if (pillars.length === 0) return null;
    return pillars.reduce((min, p) => p.score < min.score ? p : min, pillars[0]);
  }, [pillars]);

  // Fetch products for lowest pillar
  useEffect(() => {
    if (!lowestPillar || !isOpen || lowestPillar.score >= 80) return;
    const fetchProducts = async () => {
      let searchTerm = '';
      if (lowestPillar.id === 'nutrition') searchTerm = 'food';
      else if (lowestPillar.id === 'prevention') searchTerm = 'health';
      else if (lowestPillar.id === 'eye_care') searchTerm = 'eye';
      else if (lowestPillar.id === 'dental') searchTerm = 'dental';
      else if (lowestPillar.id === 'urinary') searchTerm = 'urinary';
      else if (lowestPillar.id === 'hydration') searchTerm = 'wet';
      else if (lowestPillar.id === 'hairball') searchTerm = 'hairball';
      else return;

      const { data } = await supabase
        .from('business_products')
        .select('id, name, price, sale_price, image_url, category')
        .or(`category.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
        .limit(3);
      setLowPillarProducts(data || []);
    };
    fetchProducts();
  }, [lowestPillar, isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto bg-card rounded-t-3xl border-t border-border/30 shadow-2xl"
          dir="rtl"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-muted-foreground/20 rounded-full" />
          </div>

          <div className="px-5 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                    <motion.circle
                      cx="18" cy="18" r="15.5" fill="none"
                      stroke={totalScore >= 70 ? 'hsl(142, 71%, 45%)' : 'hsl(38, 92%, 50%)'}
                      strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${totalScore * 0.97} 100`}
                      initial={{ strokeDasharray: "0 100" }}
                      animate={{ strokeDasharray: `${totalScore * 0.97} 100` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-foreground">{totalScore}</span>
                  </div>
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-base">פירוט ציון הבריאות</h2>
                  <p className="text-xs text-muted-foreground">
                    {pet.name} · {pet.breed || (pet.type === 'dog' ? 'כלב' : 'חתול')}
                    {lifeStage.label !== 'לא ידוע' && (
                      <span className="mr-1 text-primary font-medium"> · {lifeStage.label} ({lifeStage.months} חודשים)</span>
                    )}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-muted/60 rounded-xl transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : (
              <>
                {/* Life-stage weight explanation */}
                {lifeStage.label !== 'לא ידוע' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 bg-muted/30 rounded-xl border border-border/15 mb-4"
                  >
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      <span className="font-bold text-foreground">{pet.name} ({lifeStage.label})</span> — 
                      {isCat ? (
                        lifeStage.stage === 'puppy' || lifeStage.stage === 'junior'
                          ? ` גורי חתולים דורשים חיסונים מוגברים (${pillarWeights.vaccines}%) ותזונה עשירה לצמיחה.`
                          : lifeStage.stage === 'senior'
                          ? ` חתולים מבוגרים בסיכון גבוה ל-CKD. בריאות שתן (${pillarWeights.urinary}%) ולחות (${pillarWeights.hydration}%) מקבלים עדיפות.`
                          : isIndoorOrNeutered
                          ? ` חתולים מעוקרים/ביתיים: בריאות שתן (${pillarWeights.urinary}%) ולחות (${pillarWeights.hydration}%) קריטיים. ניהול קלוריות חשוב.`
                          : ` המשקלות מאוזנים עם דגש על בריאות שתן (${pillarWeights.urinary}%) — הנושא הקריטי ביותר אצל חתולים.`
                      ) : (
                        lifeStage.stage === 'puppy' || lifeStage.stage === 'junior'
                          ? ` בגיל זה, חיסונים מקבלים משקל גבוה יותר (${pillarWeights.vaccines}%) כי מערכת החיסון עדיין מתפתחת.`
                          : lifeStage.stage === 'senior'
                          ? ` בגיל מבוגר, מניעה ותזונה מקבלות משקל גבוה יותר לשמירה על איכות החיים.`
                          : ` המשקלות מאוזנים לשלב חיים בוגר ויציב.`
                      )}
                      {isShihTzu && ` כשיצו, טיפול עיניים (${pillarWeights.eyeCare}%) והיגיינת שיניים (${pillarWeights.dental}%) מוערכים בנפרד.`}
                    </p>
                  </motion.div>
                )}

                {/* Health Pillars */}
                <div className="space-y-3 mb-6">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    עמודי בריאות ({pillars.length})
                  </h3>
                  {pillars.map((pillar, i) => {
                    const Icon = pillar.icon;
                    const contribution = Math.round(pillar.score * pillar.weight / 100);
                    return (
                      <motion.div
                        key={pillar.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="p-3.5 bg-muted/20 rounded-xl border border-border/20"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full bg-card flex items-center justify-center border border-border/20`}>
                              <Icon className={`w-4 h-4 ${pillar.color}`} strokeWidth={1.5} />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-foreground">{pillar.label}</span>
                              <span className="text-[9px] text-muted-foreground mr-1">({pillar.weight}%)</span>
                            </div>
                          </div>
                          <div className="text-left">
                            <span className={`text-sm font-bold ${pillar.score >= 70 ? 'text-green-600' : pillar.score >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                              {pillar.score}%
                            </span>
                            <span className="text-[9px] text-muted-foreground block">+{contribution} נק׳</span>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pillar.score}%` }}
                            transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                            className={`h-full rounded-full ${
                              pillar.score >= 70 ? 'bg-green-500' : pillar.score >= 40 ? 'bg-amber-500' : 'bg-red-400'
                            }`}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{pillar.description}</p>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Feline Urinary Support — detailed Struvite UI for cats */}
                {isCat && pillarWeights.urinary > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
                      <Droplets className="w-4 h-4 text-cyan-500" strokeWidth={1.5} />
                      תמיכה אורולוגית — Struvite
                    </h3>
                    <FelineUrinarySupport
                      petName={pet.name}
                      isNeutered={petData?.is_neutered ?? undefined}
                      isMale={petData?.gender === 'male' || petData?.gender === 'זכר'}
                      weight={petData?.weight ?? undefined}
                    />
                  </div>
                )}

                {/* Feline Renal Care — CKD management UI for cats */}
                {isCat && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-rose-500" strokeWidth={1.5} />
                      הגנת כליות — Renal Care
                    </h3>
                    <FelineRenalCare
                      petName={pet.name}
                      isSenior={lifeStage.stage === 'senior'}
                    />
                  </div>
                )}

                {/* Feline Gastrointestinal — GI recovery UI for cats */}
                {isCat && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
                      <Utensils className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                      שיקום מערכת עיכול — Gastrointestinal
                    </h3>
                    <FelineGastrointestinal
                      petName={pet.name}
                      weight={petData?.weight ?? undefined}
                    />
                  </div>
                )}

                {/* Feline Neutered Care — for sterilized/neutered cats */}
                {isCat && petData?.is_neutered === true && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-orange-500" strokeWidth={1.5} />
                      ניהול משקל מעוקרים — Neutered Care
                    </h3>
                    <FelineNeuteredCare
                      petName={pet.name}
                      isMale={petData?.gender === 'male' || petData?.gender === 'זכר'}
                    />
                  </div>
                )}

                {todos.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" strokeWidth={1.5} />
                      איך מגיעים ל-100%?
                    </h3>
                    <div className="space-y-2">
                      {todos.map((todo, i) => (
                        <motion.button
                          key={todo.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + i * 0.06 }}
                          onClick={todo.action}
                          className="w-full flex items-center gap-3 p-3 bg-muted/20 hover:bg-muted/40 rounded-xl border border-border/20 transition-colors text-right"
                        >
                          <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
                          <span className="text-xs text-foreground flex-1">{todo.text}</span>
                          <span className="text-[10px] font-bold text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full flex-shrink-0">
                            +{todo.pointsGain}%
                          </span>
                          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preventive Breed Insight */}
                {breedTip && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mb-6 p-4 bg-primary/5 rounded-xl border border-primary/15"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
                      <span className="text-xs font-bold text-foreground">טיפ מונע מ{pet.name}:</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{breedTip}</p>
                  </motion.div>
                )}

                {/* Cat Safety Warning — Dog-toxic medications */}
                {isCat && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.65 }}
                    className="mb-6 p-4 bg-destructive/5 rounded-xl border border-destructive/20"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" strokeWidth={1.5} />
                      <span className="text-xs font-bold text-destructive">אזהרת בטיחות לחתולים</span>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        <span className="font-bold text-foreground">תרופות רעילות לחתולים:</span> פרמתרין (Advantix), אקמול/פרצטמול, איבופרופן, נפרוקסן.
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        <span className="font-bold text-foreground">מינרלים קריטיים:</span> מגנזיום נמוך (מניעת אבני סטרוביט), זרחן מבוקר (תמיכת כליות), סידן מאוזן (בריאות עצמות).
                      </p>
                      <p className="text-[10px] text-destructive/80 font-medium">
                        ⚠️ לעולם אל תשתמשו בתרופות או טיפולי פרעושים המיועדים לכלבים על חתולים.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Direct Commerce Link — products to fix lowest pillar */}
                {lowPillarProducts.length > 0 && lowestPillar && lowestPillar.score < 80 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="mb-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <ShoppingBag className="w-4 h-4 text-primary" strokeWidth={1.5} />
                        שפר את ציון ה{lowestPillar.label}
                      </h3>
                      <button
                        onClick={() => { onClose(); navigate('/shop'); }}
                        className="text-[10px] text-primary font-medium flex items-center gap-0.5"
                      >
                        לחנות
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex gap-2.5 overflow-x-auto pb-1">
                      {lowPillarProducts.map((product, i) => (
                        <motion.button
                          key={product.id}
                          initial={{ opacity: 0, x: 15 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + i * 0.08 }}
                          onClick={() => { onClose(); navigate(`/product/${product.id}`); }}
                          className="flex-shrink-0 w-28 bg-muted/20 border border-border/20 rounded-xl overflow-hidden text-right hover:shadow-sm transition-shadow"
                        >
                          {product.image_url ? (
                            <div className="w-full h-20 bg-muted">
                              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                            </div>
                          ) : (
                            <div className="w-full h-20 bg-muted/50 flex items-center justify-center">
                              <ShoppingBag className="w-6 h-6 text-muted-foreground/30" />
                            </div>
                          )}
                          <div className="p-2">
                            <p className="text-[10px] font-medium text-foreground line-clamp-2 leading-tight mb-1">{product.name}</p>
                            {product.sale_price ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-bold text-primary">₪{product.sale_price}</span>
                                <span className="text-[9px] text-muted-foreground line-through">₪{product.price}</span>
                              </div>
                            ) : product.price ? (
                              <span className="text-xs font-bold text-foreground">₪{product.price}</span>
                            ) : null}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
