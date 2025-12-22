import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, User, Phone, CheckCircle, XCircle, MessageCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AppointmentsCalendarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'ממתין', color: 'bg-yellow-500' },
  confirmed: { label: 'מאושר', color: 'bg-green-500' },
  cancelled: { label: 'בוטל', color: 'bg-red-500' },
  completed: { label: 'הושלם', color: 'bg-blue-500' },
};

export const AppointmentsCalendar = ({ open, onOpenChange, businessId }: AppointmentsCalendarProps) => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['business-appointments', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_appointments')
        .select('*')
        .eq('business_id', businessId)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!businessId && open,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: string; status: string }) => {
      const { error } = await supabase
        .from('business_appointments')
        .update({ status })
        .eq('id', appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-appointments'] });
      toast({ title: 'סטטוס עודכן' });
    },
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  const appointmentsForDate = appointments.filter(apt => 
    isSameDay(parseISO(apt.appointment_date), selectedDate)
  );

  const getAppointmentsCountForDate = (date: Date) => {
    return appointments.filter(apt => isSameDay(parseISO(apt.appointment_date), date)).length;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            יומן תורים
          </DialogTitle>
        </DialogHeader>

        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium">
            {format(weekStart, 'MMMM yyyy', { locale: he })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Week Days */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {weekDays.map((day) => {
            const count = getAppointmentsCountForDate(day);
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());

            return (
              <motion.button
                key={day.toISOString()}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'flex flex-col items-center p-2 rounded-xl transition-all',
                  isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  isToday && !isSelected && 'ring-2 ring-primary'
                )}
              >
                <span className="text-[10px]">
                  {format(day, 'EEE', { locale: he })}
                </span>
                <span className="text-lg font-bold">
                  {format(day, 'd')}
                </span>
                {count > 0 && (
                  <span className={cn(
                    'w-5 h-5 rounded-full text-[10px] flex items-center justify-center',
                    isSelected ? 'bg-primary-foreground/20' : 'bg-primary/10 text-primary'
                  )}>
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Appointments for Selected Date */}
        <div className="flex-1 overflow-y-auto space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{format(selectedDate, 'EEEE, d בMMMM', { locale: he })}</span>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">טוען...</div>
          ) : appointmentsForDate.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">אין תורים ליום זה</p>
            </div>
          ) : (
            <AnimatePresence>
              {appointmentsForDate.map((apt) => {
                const status = statusConfig[apt.status] || statusConfig.pending;

                return (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="p-3 bg-card border rounded-xl"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          <span className="font-bold">{apt.appointment_time.slice(0, 5)}</span>
                          <Badge className={`${status.color} text-white text-[10px]`}>
                            {status.label}
                          </Badge>
                        </div>

                        <div className="mt-2 space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{apt.customer_name || 'לקוח'}</span>
                          </div>
                          {apt.customer_phone && (
                            <a
                              href={`tel:${apt.customer_phone}`}
                              className="flex items-center gap-2 text-muted-foreground hover:text-primary"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span dir="ltr">{apt.customer_phone}</span>
                            </a>
                          )}
                          {apt.service_type && (
                            <div className="text-xs text-muted-foreground">
                              שירות: {apt.service_type}
                            </div>
                          )}
                          {apt.notes && (
                            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                              {apt.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 mt-3 pt-3 border-t">
                      {apt.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-green-600 hover:text-green-700"
                            onClick={() => updateStatusMutation.mutate({ 
                              appointmentId: apt.id, 
                              status: 'confirmed' 
                            })}
                          >
                            <CheckCircle className="w-3.5 h-3.5 ml-1" />
                            אשר
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-red-600 hover:text-red-700"
                            onClick={() => updateStatusMutation.mutate({ 
                              appointmentId: apt.id, 
                              status: 'cancelled' 
                            })}
                          >
                            <XCircle className="w-3.5 h-3.5 ml-1" />
                            בטל
                          </Button>
                        </>
                      )}
                      {apt.status === 'confirmed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => updateStatusMutation.mutate({ 
                            appointmentId: apt.id, 
                            status: 'completed' 
                          })}
                        >
                          <CheckCircle className="w-3.5 h-3.5 ml-1" />
                          סמן כהושלם
                        </Button>
                      )}
                      {apt.customer_phone && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a href={`https://wa.me/${apt.customer_phone.replace(/\D/g, '')}`}>
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
