/**
 * TrainingSheet - Pet training recommendations by breed and age
 * Includes professional training and minimalist chat option
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, User, Clock, MessageCircle, ChevronLeft, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ServiceBottomSheet } from './ServiceBottomSheet';
import { Button } from '@/components/ui/button';

interface Pet {
  id: string;
  name: string;
  type: 'dog' | 'cat';
  breed?: string;
  age_years?: number;
  age_months?: number;
}

interface TrainingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet | null;
}

const trainingTypeLabels: Record<string, string> = {
  professional: 'אילוף פרטי',
  online: 'קורס אונליין',
  group: 'אילוף קבוצתי',
};

export const TrainingSheet = ({ isOpen, onClose, pet }: TrainingSheetProps) => {
  const navigate = useNavigate();

  const { data: programs, isLoading } = useQuery({
    queryKey: ['training-programs', pet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pet_training_programs')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false });

      if (error) throw error;

      // Filter by pet type and breed
      return data?.filter(program => {
        if (pet?.type && program.suitable_pet_types) {
          if (!program.suitable_pet_types.includes(pet.type)) return false;
        }
        if (pet?.breed && program.suitable_breeds?.length) {
          if (!program.suitable_breeds.includes(pet.breed)) return false;
        }
        return true;
      }) || [];
    },
    enabled: isOpen && !!pet,
  });

  const handleOpenChat = () => {
    onClose();
    navigate('/training', { state: { petId: pet?.id, petName: pet?.name } });
  };

  return (
    <ServiceBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`אילוף ל${pet?.name || 'חיית המחמד'}`}
    >
      {/* AI Chat Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-4 mb-4"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-foreground">צ'אט אילוף חכם</p>
            <p className="text-xs text-muted-foreground">קבל טיפים מותאמים ל{pet?.name}</p>
          </div>
        </div>
        <Button 
          onClick={handleOpenChat}
          className="w-full rounded-full"
        >
          <MessageCircle className="w-4 h-4 ml-2" />
          פתח צ'אט אילוף
        </Button>
      </motion.div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">או בחר מאלף מקצועי</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-muted/50 rounded-2xl p-4 animate-pulse h-32" />
          ))}
        </div>
      ) : programs?.length ? (
        <div className="space-y-4">
          {programs.map((program, index) => (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-2xl border border-border p-4"
            >
              <div className="flex items-start gap-3">
                {/* Trainer Image */}
                <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0">
                  {program.trainer_image_url ? (
                    <img 
                      src={program.trainer_image_url} 
                      alt={program.trainer_name || ''} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-foreground">{program.name}</h3>
                      {program.trainer_name && (
                        <p className="text-xs text-muted-foreground">{program.trainer_name}</p>
                      )}
                    </div>
                    <span className="text-xs bg-muted px-2 py-1 rounded-full whitespace-nowrap">
                      {trainingTypeLabels[program.training_type] || program.training_type}
                    </span>
                  </div>

                  {program.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {program.description}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    {program.duration_sessions && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{program.duration_sessions} שיעורים</span>
                      </div>
                    )}
                    {program.price && (
                      <span className="font-bold text-foreground">₪{program.price}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action */}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3 rounded-full"
              >
                פרטים ויצירת קשר
                <ChevronLeft className="w-4 h-4 mr-1" />
              </Button>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
            <GraduationCap className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-center text-sm">
            אין כרגע תוכניות אילוף זמינות
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            נסה את הצ'אט החכם לקבלת טיפים
          </p>
        </div>
      )}
    </ServiceBottomSheet>
  );
};
