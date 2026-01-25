/**
 * BreedInfoSheet - Breed information from research sources
 * Managed by admin panel
 */

import { motion } from 'framer-motion';
import { 
  Info, 
  Heart, 
  Activity, 
  Scissors, 
  Brain, 
  Users, 
  Dog, 
  Home,
  MapPin,
  Scale,
  Ruler,
  Clock,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ServiceBottomSheet } from './ServiceBottomSheet';

interface Pet {
  id: string;
  name: string;
  type: 'dog' | 'cat';
  breed?: string;
  age_years?: number;
  age_months?: number;
}

interface BreedInfoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet | null;
}

const exerciseLabels: Record<string, { label: string; color: string }> = {
  low: { label: 'נמוכה', color: 'text-green-600' },
  moderate: { label: 'בינונית', color: 'text-amber-600' },
  high: { label: 'גבוהה', color: 'text-orange-600' },
  very_high: { label: 'גבוהה מאוד', color: 'text-red-600' },
};

const groomingLabels: Record<string, { label: string; color: string }> = {
  low: { label: 'נמוכה', color: 'text-green-600' },
  moderate: { label: 'בינונית', color: 'text-amber-600' },
  high: { label: 'גבוהה', color: 'text-orange-600' },
};

const trainingLabels: Record<string, { label: string; color: string }> = {
  easy: { label: 'קל', color: 'text-green-600' },
  moderate: { label: 'בינוני', color: 'text-amber-600' },
  challenging: { label: 'מאתגר', color: 'text-red-600' },
};

export const BreedInfoSheet = ({ isOpen, onClose, pet }: BreedInfoSheetProps) => {
  const { data: breedInfo, isLoading } = useQuery({
    queryKey: ['breed-info', pet?.breed, pet?.type],
    queryFn: async () => {
      if (!pet?.breed) return null;

      const { data, error } = await supabase
        .from('breed_information')
        .select('*')
        .eq('is_active', true)
        .or(`breed_name.ilike.%${pet.breed}%,breed_name_he.ilike.%${pet.breed}%`)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!pet?.breed,
  });

  const InfoItem = ({ 
    icon: Icon, 
    label, 
    value, 
    valueColor 
  }: { 
    icon: typeof Info; 
    label: string; 
    value: string | undefined; 
    valueColor?: string;
  }) => {
    if (!value) return null;
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-sm font-medium ${valueColor || 'text-foreground'}`}>{value}</p>
        </div>
      </div>
    );
  };

  const BooleanBadge = ({ value, label }: { value: boolean | null; label: string }) => {
    if (value === null || value === undefined) return null;
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${
        value 
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      }`}>
        {value ? '✓' : '✗'} {label}
      </span>
    );
  };

  return (
    <ServiceBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`מידע על ${pet?.breed || 'הגזע'}`}
    >
      {isLoading ? (
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-2xl h-40 animate-pulse" />
          <div className="bg-muted/50 rounded-2xl h-32 animate-pulse" />
        </div>
      ) : breedInfo ? (
        <div className="space-y-6">
          {/* Header with image */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10"
          >
            {breedInfo.image_url ? (
              <img 
                src={breedInfo.image_url} 
                alt={breedInfo.breed_name_he || breedInfo.breed_name}
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="w-full h-48 flex items-center justify-center">
                <Dog className="w-16 h-16 text-primary/30" />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <h2 className="text-xl font-bold text-white">
                {breedInfo.breed_name_he || breedInfo.breed_name}
              </h2>
              {breedInfo.origin_country && (
                <div className="flex items-center gap-1 text-white/80 text-sm">
                  <MapPin className="w-3 h-3" />
                  <span>{breedInfo.origin_country}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Description */}
          {(breedInfo.description_he || breedInfo.description) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl border border-border p-4"
            >
              <p className="text-sm text-foreground leading-relaxed">
                {breedInfo.description_he || breedInfo.description}
              </p>
            </motion.div>
          )}

          {/* Quick facts */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-wrap gap-2"
          >
            <BooleanBadge value={breedInfo.good_with_children} label="מתאים לילדים" />
            <BooleanBadge value={breedInfo.good_with_other_pets} label="מתאים לחיות אחרות" />
            <BooleanBadge value={breedInfo.apartment_friendly} label="מתאים לדירה" />
          </motion.div>

          {/* Physical characteristics */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-2xl border border-border p-4"
          >
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              מאפיינים פיזיים
            </h3>
            <div className="divide-y divide-border">
              <InfoItem icon={Scale} label="משקל" value={breedInfo.weight_range_kg ? `${breedInfo.weight_range_kg} ק"ג` : undefined} />
              <InfoItem icon={Ruler} label="גובה" value={breedInfo.height_range_cm ? `${breedInfo.height_range_cm} ס"מ` : undefined} />
              <InfoItem icon={Clock} label="תוחלת חיים" value={breedInfo.life_expectancy_years ? `${breedInfo.life_expectancy_years} שנים` : undefined} />
            </div>
          </motion.div>

          {/* Care needs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card rounded-2xl border border-border p-4"
          >
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary" />
              צרכי טיפול
            </h3>
            <div className="divide-y divide-border">
              <InfoItem 
                icon={Activity} 
                label="צורך בפעילות גופנית" 
                value={exerciseLabels[breedInfo.exercise_needs || '']?.label}
                valueColor={exerciseLabels[breedInfo.exercise_needs || '']?.color}
              />
              <InfoItem 
                icon={Scissors} 
                label="צורך בטיפוח" 
                value={groomingLabels[breedInfo.grooming_needs || '']?.label}
                valueColor={groomingLabels[breedInfo.grooming_needs || '']?.color}
              />
              <InfoItem 
                icon={Brain} 
                label="קושי אילוף" 
                value={trainingLabels[breedInfo.training_difficulty || '']?.label}
                valueColor={trainingLabels[breedInfo.training_difficulty || '']?.color}
              />
            </div>
          </motion.div>

          {/* Temperament */}
          {(breedInfo.temperament_he?.length > 0 || breedInfo.temperament?.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-2xl border border-border p-4"
            >
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                אופי וטמפרמנט
              </h3>
              <div className="flex flex-wrap gap-2">
                {(breedInfo.temperament_he || breedInfo.temperament || []).map((trait: string, i: number) => (
                  <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {trait}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Health issues */}
          {(breedInfo.health_issues_he?.length > 0 || breedInfo.health_issues?.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4"
            >
              <h3 className="font-bold text-amber-800 dark:text-amber-200 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                בעיות בריאות נפוצות
              </h3>
              <ul className="space-y-1.5">
                {(breedInfo.health_issues_he || breedInfo.health_issues || []).map((issue: string, i: number) => (
                  <li key={i} className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {issue}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Sources */}
          {breedInfo.source_references?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xs text-muted-foreground"
            >
              <p className="flex items-center gap-1 mb-1">
                <ExternalLink className="w-3 h-3" />
                מקורות מחקר:
              </p>
              <ul className="space-y-0.5">
                {breedInfo.source_references.map((source: string, i: number) => (
                  <li key={i}>{source}</li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Info className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-center">
            אין מידע זמין על הגזע {pet?.breed}
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            המידע יתעדכן בקרוב
          </p>
        </div>
      )}
    </ServiceBottomSheet>
  );
};
