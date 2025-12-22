import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Phone, Mail, Clock, CheckCircle, XCircle, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface LeadsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  new: { label: 'חדש', color: 'bg-blue-500', icon: Clock },
  contacted: { label: 'נוצר קשר', color: 'bg-yellow-500', icon: MessageCircle },
  converted: { label: 'הומר', color: 'bg-green-500', icon: CheckCircle },
  rejected: { label: 'נדחה', color: 'bg-red-500', icon: XCircle },
};

export const LeadsManager = ({ open, onOpenChange, businessId }: LeadsManagerProps) => {
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['lead-submissions', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_submissions')
        .select(`
          *,
          lead_forms!inner(title, business_id)
        `)
        .eq('lead_forms.business_id', businessId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!businessId && open,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      const { error } = await supabase
        .from('lead_submissions')
        .update({ status })
        .eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-submissions'] });
      toast({ title: 'סטטוס עודכן' });
    },
  });

  const getFieldValue = (data: any, fieldType: string) => {
    if (typeof data !== 'object') return null;
    
    // Try to find by common field names
    const phoneFields = ['phone', 'טלפון', 'mobile', 'נייד'];
    const emailFields = ['email', 'אימייל', 'mail'];
    const nameFields = ['name', 'שם', 'full_name', 'שם מלא'];

    for (const key of Object.keys(data)) {
      const lowerKey = key.toLowerCase();
      if (fieldType === 'phone' && phoneFields.some(f => lowerKey.includes(f))) {
        return data[key];
      }
      if (fieldType === 'email' && emailFields.some(f => lowerKey.includes(f))) {
        return data[key];
      }
      if (fieldType === 'name' && nameFields.some(f => lowerKey.includes(f))) {
        return data[key];
      }
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            ניהול לידים
            {leads.length > 0 && (
              <Badge variant="secondary" className="mr-2">
                {leads.length}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">טוען...</div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">אין לידים עדיין</p>
              <p className="text-xs text-muted-foreground mt-1">
                לידים יופיעו כאן כשמישהו ימלא טופס
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {leads.map((lead: any) => {
                const status = statusConfig[lead.status] || statusConfig.new;
                const StatusIcon = status.icon;
                const name = getFieldValue(lead.data, 'name');
                const phone = getFieldValue(lead.data, 'phone');
                const email = getFieldValue(lead.data, 'email');

                return (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="p-4 bg-card border rounded-xl"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{name || 'ללא שם'}</span>
                          <Badge className={`${status.color} text-white text-[10px]`}>
                            <StatusIcon className="w-3 h-3 ml-1" />
                            {status.label}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          {phone && (
                            <a
                              href={`tel:${phone}`}
                              className="flex items-center gap-2 text-muted-foreground hover:text-primary"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span dir="ltr">{phone}</span>
                            </a>
                          )}
                          {email && (
                            <a
                              href={`mailto:${email}`}
                              className="flex items-center gap-2 text-muted-foreground hover:text-primary"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>{email}</span>
                            </a>
                          )}
                        </div>

                        {/* Additional fields */}
                        {Object.entries(lead.data as Record<string, any>).filter(
                          ([key]) => !['phone', 'email', 'name', 'טלפון', 'אימייל', 'שם'].some(f => 
                            key.toLowerCase().includes(f)
                          )
                        ).length > 0 && (
                          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                            {Object.entries(lead.data as Record<string, any>)
                              .filter(([key]) => !['phone', 'email', 'name', 'טלפון', 'אימייל', 'שם'].some(f => 
                                key.toLowerCase().includes(f)
                              ))
                              .map(([key, value]) => (
                                <div key={key}>
                                  <span className="font-medium">{key}:</span> {String(value)}
                                </div>
                              ))
                            }
                          </div>
                        )}

                        <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>
                            {format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                          </span>
                          <span className="mx-1">•</span>
                          <span>{lead.lead_forms?.title}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Actions */}
                    <div className="flex gap-1 mt-3 pt-3 border-t">
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <Button
                          key={key}
                          variant={lead.status === key ? 'default' : 'ghost'}
                          size="sm"
                          className="flex-1 text-[10px] h-7"
                          onClick={() => updateStatusMutation.mutate({ leadId: lead.id, status: key })}
                        >
                          {config.label}
                        </Button>
                      ))}
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
