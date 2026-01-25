/**
 * DogWalkerSheet - Dog walking services with date selection
 * Requires admin approval
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Footprints, Calendar, Clock, Check, AlertCircle, Star, MapPin, User } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ServiceBottomSheet } from './ServiceBottomSheet';
import { Button } from '@/components/ui/button';
import { DateWheelPicker } from '@/components/ui/date-wheel-picker';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Pet {
  id: string;
  name: string;
  type: 'dog' | 'cat';
  breed?: string;
  age_years?: number;
  age_months?: number;
}

interface DogWalkerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet | null;
}

const walkDurations = [
  { id: '30', label: '30 דקות', price: 35 },
  { id: '45', label: '45 דקות', price: 50 },
  { id: '60', label: 'שעה', price: 65 },
];

export const DogWalkerSheet = ({ isOpen, onClose, pet }: DogWalkerSheetProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  // For now, showing placeholder data - in real app, this would fetch from dog_walker_services table
  const { data: walkers, isLoading } = useQuery({
    queryKey: ['dog-walkers', pet?.id],
    queryFn: async () => {
      // Placeholder - in real implementation, fetch from database
      return [
        {
          id: '1',
          name: 'יוסי - דוג ווקר מקצועי',
          description: 'מטייל עם כלבים מזה 5 שנים, מתמחה בטיולים קבוצתיים וטיולים פרטיים',
          rating: 4.8,
          walks_completed: 342,
          price_30: 35,
          price_45: 50,
          price_60: 65,
          area: 'תל אביב והסביבה',
          image_url: null,
        },
        {
          id: '2',
          name: 'מיכל - Dog Walker',
          description: 'אוהבת כלבים מילדות, מציעה טיולים איכותיים עם תשומת לב אישית',
          rating: 4.9,
          walks_completed: 218,
          price_30: 40,
          price_45: 55,
          price_60: 70,
          area: 'רמת גן וגבעתיים',
          image_url: null,
        },
      ];
    },
    enabled: isOpen && !!pet,
  });

  const [selectedWalker, setSelectedWalker] = useState<string | null>(null);
  const selectedWalkerData = walkers?.find(w => w.id === selectedWalker);
  const selectedDurationData = walkDurations.find(d => d.id === selectedDuration);

  const handleContinue = () => {
    if (selectedWalker && selectedDuration && selectedDate) {
      setStep('confirm');
    }
  };

  const handleBook = () => {
    toast({
      title: 'הבקשה נשלחה',
      description: 'נודיע לך כשהדוג ווקר יאשר',
    });
    onClose();
    setStep('select');
    setSelectedWalker(null);
    setSelectedDuration(null);
    setSelectedDate(new Date());
  };

  // Only for dogs
  if (pet?.type !== 'dog') {
    return (
      <ServiceBottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="דוג ווקר"
      >
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Footprints className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-center">
            שירות זה זמין לכלבים בלבד
          </p>
        </div>
      </ServiceBottomSheet>
    );
  }

  return (
    <ServiceBottomSheet
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setStep('select');
        setSelectedWalker(null);
        setSelectedDuration(null);
        setSelectedDate(new Date());
      }}
      title={step === 'confirm' ? 'אישור הזמנה' : `דוג ווקר ל${pet?.name || 'הכלב'}`}
    >
      {step === 'select' ? (
        <>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="bg-muted/50 rounded-2xl p-4 animate-pulse h-32" />
              ))}
            </div>
          ) : walkers?.length ? (
            <div className="space-y-6">
              {/* Walkers List */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">בחר דוג ווקר</h3>
                {walkers.map((walker, index) => (
                  <motion.div
                    key={walker.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                      selectedWalker === walker.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border bg-card'
                    }`}
                    onClick={() => setSelectedWalker(walker.id)}
                  >
                    <div className="flex gap-3">
                      {/* Avatar */}
                      <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0">
                        {walker.image_url ? (
                          <img 
                            src={walker.image_url} 
                            alt={walker.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-7 h-7 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-foreground">{walker.name}</h4>
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span className="text-xs font-medium">{walker.rating}</span>
                          </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {walker.description}
                        </p>

                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{walker.area}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {walker.walks_completed} טיולים
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Duration Selection */}
              {selectedWalker && (
                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h3 className="text-sm font-medium text-muted-foreground">בחר משך הטיול</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {walkDurations.map((duration) => (
                      <button
                        key={duration.id}
                        onClick={() => setSelectedDuration(duration.id)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          selectedDuration === duration.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-card'
                        }`}
                      >
                        <div className="text-sm font-medium text-foreground">{duration.label}</div>
                        <div className="text-xs text-muted-foreground">₪{duration.price}</div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Date Selection */}
              {selectedWalker && selectedDuration && (
                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h3 className="text-sm font-medium text-muted-foreground">בחר תאריך</h3>
                  
                  <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-muted/50 border border-border/50">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {format(selectedDate, 'PPP', { locale: he })}
                    </span>
                  </div>

                  <div className="flex justify-center py-3 bg-muted/30 rounded-2xl">
                    <DateWheelPicker
                      value={selectedDate}
                      onChange={setSelectedDate}
                      minYear={new Date().getFullYear()}
                      maxYear={new Date().getFullYear() + 1}
                      size="sm"
                      locale="he-IL"
                    />
                  </div>
                </motion.div>
              )}

              {/* Continue Button */}
              <Button 
                className="w-full rounded-full h-12"
                disabled={!selectedWalker || !selectedDuration}
                onClick={handleContinue}
              >
                המשך לאישור
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Footprints className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-center">
                אין דוג ווקרים זמינים כרגע באזור
              </p>
              <p className="text-xs text-muted-foreground text-center mt-1">
                נעדכן אותך כשיהיו דוג ווקרים חדשים
              </p>
            </div>
          )}
        </>
      ) : (
        /* Confirmation Step */
        <div className="space-y-6">
          {/* Alert */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 flex gap-3"
          >
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                ההזמנה דורשת אישור
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                לא יבוצע חיוב עד לאישור הדוג ווקר
              </p>
            </div>
          </motion.div>

          {/* Summary */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Footprints className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">{selectedWalkerData?.name}</h3>
                <p className="text-xs text-muted-foreground">
                  טיול ל{pet?.name}
                </p>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">תאריך מבוקש</span>
                <span className="font-medium text-foreground">
                  {format(selectedDate, 'PPP', { locale: he })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">משך הטיול</span>
                <span className="font-medium text-foreground">
                  {selectedDurationData?.label}
                </span>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="flex justify-between">
              <span className="font-medium text-foreground">סה"כ לתשלום</span>
              <span className="font-bold text-lg text-foreground">
                ₪{selectedDurationData?.price}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              className="w-full rounded-full h-12"
              onClick={handleBook}
            >
              שלח בקשה לאישור
            </Button>
            <Button 
              variant="ghost"
              className="w-full rounded-full"
              onClick={() => setStep('select')}
            >
              חזור
            </Button>
          </div>
        </div>
      )}
    </ServiceBottomSheet>
  );
};
