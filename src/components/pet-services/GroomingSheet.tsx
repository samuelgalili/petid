/**
 * GroomingSheet - Pet grooming services with date selection
 * Requires admin approval before billing
 * Provider: סטודיו פול
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Scissors, Calendar, Clock, Check, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ServiceBottomSheet } from './ServiceBottomSheet';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DocumentsSection } from './DocumentsSection';

interface Pet {
  id: string;
  name: string;
  type: 'dog' | 'cat';
  breed?: string;
  age_years?: number;
  age_months?: number;
}

interface GroomingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet | null;
}

const serviceTypeLabels: Record<string, string> = {
  bath: 'רחצה',
  haircut: 'תספורת',
  full_grooming: 'טיפוח מלא',
  nail_trim: 'גזיזת ציפורניים',
};

export const GroomingSheet = ({ isOpen, onClose, pet }: GroomingSheetProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  const { data: services, isLoading } = useQuery({
    queryKey: ['grooming-services', pet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pet_grooming_services')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;

      // Filter by pet type and breed
      return data?.filter(service => {
        if (pet?.type && service.suitable_pet_types) {
          if (!service.suitable_pet_types.includes(pet.type)) return false;
        }
        if (pet?.breed && service.suitable_breeds?.length) {
          if (!service.suitable_breeds.includes(pet.breed)) return false;
        }
        return true;
      }) || [];
    },
    enabled: isOpen && !!pet,
  });

  const bookingMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!pet || !selectedService || !selectedDate) throw new Error('Missing data');

      const service = services?.find(s => s.id === selectedService);
      
      const { error } = await supabase
        .from('pet_grooming_bookings')
        .insert({
          user_id: user.id,
          pet_id: pet.id,
          service_id: selectedService,
          requested_date: format(selectedDate, 'yyyy-MM-dd'),
          total_price: service?.price || 0,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'ההזמנה נשלחה',
        description: 'נודיע לך כשההזמנה תאושר',
      });
      queryClient.invalidateQueries({ queryKey: ['grooming-bookings'] });
      onClose();
      setStep('select');
      setSelectedService(null);
      setSelectedDate(undefined);
    },
    onError: (error) => {
      toast({
        title: 'שגיאה',
        description: 'לא הצלחנו לשלוח את ההזמנה',
        variant: 'destructive',
      });
    },
  });

  const selectedServiceData = services?.find(s => s.id === selectedService);

  const handleContinue = () => {
    if (selectedService && selectedDate) {
      setStep('confirm');
    }
  };

  const handleBook = () => {
    bookingMutation.mutate();
  };

  return (
    <ServiceBottomSheet
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setStep('select');
        setSelectedService(null);
        setSelectedDate(undefined);
      }}
      title={step === 'confirm' ? 'אישור הזמנה' : `טיפוח ל${pet?.name || 'חיית המחמד'}`}
    >
      {step === 'select' ? (
        <>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-muted/50 rounded-2xl p-4 animate-pulse h-24" />
              ))}
            </div>
          ) : services?.length ? (
            <div className="space-y-6">
              {/* Services */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">בחר שירות</h3>
                {services.map((service, index) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                      selectedService === service.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border bg-card'
                    }`}
                    onClick={() => setSelectedService(service.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          selectedService === service.id ? 'bg-primary/20' : 'bg-muted'
                        }`}>
                          <Scissors className={`w-5 h-5 ${
                            selectedService === service.id ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{service.name}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{serviceTypeLabels[service.service_type] || service.service_type}</span>
                            {service.duration_minutes && (
                              <>
                                <span>•</span>
                                <span>{service.duration_minutes} דק׳</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="font-bold text-foreground">₪{service.price}</span>
                        {selectedService === service.id && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center mt-1 mr-auto">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Date Selection */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">בחר תאריך</h3>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-right rounded-xl h-12",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="ml-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'PPP', { locale: he }) : 'בחר תאריך'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Continue Button */}
              <Button 
                className="w-full rounded-full h-12"
                disabled={!selectedService || !selectedDate}
                onClick={handleContinue}
              >
                המשך לאישור
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Scissors className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-center">
                אין שירותי טיפוח זמינים כרגע
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
                לא יבוצע חיוב עד לאישור התאריך על ידי הספק
              </p>
            </div>
          </motion.div>

          {/* Summary */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Scissors className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">{selectedServiceData?.name}</h3>
                <p className="text-xs text-muted-foreground">
                  עבור {pet?.name}
                </p>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">תאריך מבוקש</span>
                <span className="font-medium text-foreground">
                  {selectedDate && format(selectedDate, 'PPP', { locale: he })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">משך הטיפול</span>
                <span className="font-medium text-foreground">
                  {selectedServiceData?.duration_minutes} דקות
                </span>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="flex justify-between">
              <span className="font-medium text-foreground">סה"כ לתשלום</span>
              <span className="font-bold text-lg text-foreground">
                ₪{selectedServiceData?.price}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              className="w-full rounded-full h-12"
              onClick={handleBook}
              disabled={bookingMutation.isPending}
            >
              {bookingMutation.isPending ? 'שולח...' : 'שלח בקשה לאישור'}
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
      
      {/* Documents Section */}
      {pet && step === 'select' && (
        <DocumentsSection 
          petId={pet.id} 
          category="grooming" 
          title="מסמכי טיפוח"
        />
      )}
    </ServiceBottomSheet>
  );
};
