/**
 * BoardingSheet - Pet boarding/pension services with date range selection
 * Requires admin approval
 * Provider: פנסיון אביעד
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Calendar, MapPin, Check, AlertCircle, Star } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ServiceBottomSheet } from './ServiceBottomSheet';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { DocumentsSection } from './DocumentsSection';

interface Pet {
  id: string;
  name: string;
  type: 'dog' | 'cat';
  breed?: string;
  age_years?: number;
  age_months?: number;
}

interface BoardingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet | null;
}

export const BoardingSheet = ({ isOpen, onClose, pet }: BoardingSheetProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  const { data: services, isLoading } = useQuery({
    queryKey: ['boarding-services', pet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pet_boarding_services')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false });

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

  const selectedServiceData = services?.find(s => s.id === selectedService);
  const nights = dateRange?.from && dateRange?.to 
    ? differenceInDays(dateRange.to, dateRange.from) 
    : 0;
  const totalPrice = selectedServiceData?.price_per_night 
    ? selectedServiceData.price_per_night * nights 
    : 0;

  const bookingMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!pet || !selectedService || !dateRange?.from || !dateRange?.to) throw new Error('Missing data');
      
      const { error } = await supabase
        .from('pet_boarding_bookings')
        .insert({
          user_id: user.id,
          pet_id: pet.id,
          service_id: selectedService,
          start_date: format(dateRange.from, 'yyyy-MM-dd'),
          end_date: format(dateRange.to, 'yyyy-MM-dd'),
          total_nights: nights,
          total_price: totalPrice,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'ההזמנה נשלחה',
        description: 'נודיע לך כשההזמנה תאושר',
      });
      queryClient.invalidateQueries({ queryKey: ['boarding-bookings'] });
      onClose();
      setStep('select');
      setSelectedService(null);
      setDateRange(undefined);
    },
    onError: () => {
      toast({
        title: 'שגיאה',
        description: 'לא הצלחנו לשלוח את ההזמנה',
        variant: 'destructive',
      });
    },
  });

  const handleContinue = () => {
    if (selectedService && dateRange?.from && dateRange?.to) {
      setStep('confirm');
    }
  };

  return (
    <ServiceBottomSheet
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setStep('select');
        setSelectedService(null);
        setDateRange(undefined);
      }}
      title={step === 'confirm' ? 'אישור הזמנה' : `פנסיון ל${pet?.name || 'חיית המחמד'}`}
    >
      {step === 'select' ? (
        <>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="bg-muted/50 rounded-2xl p-4 animate-pulse h-36" />
              ))}
            </div>
          ) : services?.length ? (
            <div className="space-y-6">
              {/* Services */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">בחר פנסיון</h3>
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
                    <div className="flex gap-3">
                      {/* Image */}
                      <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden shrink-0">
                        {service.provider_image_url ? (
                          <img 
                            src={service.provider_image_url} 
                            alt={service.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-foreground">{service.name}</h4>
                          {service.is_featured && (
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{service.provider_name}</p>
                        
                        {service.provider_address && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span className="line-clamp-1">{service.provider_address}</span>
                          </div>
                        )}

                        {/* Amenities */}
                        {service.amenities?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {service.amenities.slice(0, 3).map((amenity: string, i: number) => (
                              <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                                {amenity}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-2">
                          <span className="font-bold text-foreground">
                            ₪{service.price_per_night}
                          </span>
                          <span className="text-xs text-muted-foreground">/לילה</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Date Range Selection */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">בחר תאריכים</h3>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-right rounded-xl h-12",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="ml-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, 'P', { locale: he })} - {format(dateRange.to, 'P', { locale: he })}
                          </>
                        ) : (
                          format(dateRange.from, 'P', { locale: he })
                        )
                      ) : (
                        'בחר טווח תאריכים'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <CalendarComponent
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      disabled={(date) => date < new Date()}
                      numberOfMonths={1}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                
                {nights > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    {nights} לילות
                  </p>
                )}
              </div>

              {/* Continue */}
              <Button 
                className="w-full rounded-full h-12"
                disabled={!selectedService || !dateRange?.from || !dateRange?.to}
                onClick={handleContinue}
              >
                המשך לאישור
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-center">
                אין פנסיונים זמינים כרגע
              </p>
            </div>
          )}
        </>
      ) : (
        /* Confirmation */
        <div className="space-y-6">
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
                לא יבוצע חיוב עד לאישור הפנסיון
              </p>
            </div>
          </motion.div>

          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">{selectedServiceData?.name}</h3>
                <p className="text-xs text-muted-foreground">עבור {pet?.name}</p>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">כניסה</span>
                <span className="font-medium text-foreground">
                  {dateRange?.from && format(dateRange.from, 'PPP', { locale: he })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">יציאה</span>
                <span className="font-medium text-foreground">
                  {dateRange?.to && format(dateRange.to, 'PPP', { locale: he })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">מספר לילות</span>
                <span className="font-medium text-foreground">{nights}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">מחיר ללילה</span>
                <span className="font-medium text-foreground">
                  ₪{selectedServiceData?.price_per_night}
                </span>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="flex justify-between">
              <span className="font-medium text-foreground">סה"כ לתשלום</span>
              <span className="font-bold text-lg text-foreground">₪{totalPrice}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              className="w-full rounded-full h-12"
              onClick={() => bookingMutation.mutate()}
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
          category="boarding" 
          title="מסמכי פנסיון"
        />
      )}
    </ServiceBottomSheet>
  );
};
