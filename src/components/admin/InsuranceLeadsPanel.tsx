import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Shield, Send, Check, X, Clock, Mail, Phone, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface InsuranceLead {
  id: string;
  user_id: string;
  pet_name: string;
  pet_type: string;
  breed: string | null;
  age_years: number | null;
  phone: string;
  health_answer_1: string | null;
  health_answer_2: string | null;
  selected_plan: string | null;
  status: string;
  notes: string | null;
  admin_notes: string | null;
  forwarded_to_email: string | null;
  forwarded_at: string | null;
  admin_approved_at: string | null;
  created_at: string;
}

const planLabels: Record<string, string> = {
  basic: 'בסיסי',
  premium: 'פרימיום',
  gold: 'זהב',
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'ממתין לאישור', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  forwarded: { label: 'הועבר לחברה', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  rejected: { label: 'נדחה', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  contacted: { label: 'נוצר קשר', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
};

export const InsuranceLeadsPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<InsuranceLead | null>(null);
  const [forwardEmail, setForwardEmail] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: leads, isLoading } = useQuery({
    queryKey: ['admin-insurance-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as InsuranceLead[];
    },
  });

  const forwardMutation = useMutation({
    mutationFn: async ({ leadId, email, notes }: { leadId: string; email: string; notes: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/forward-insurance-lead`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ leadId, forwardToEmail: email, adminNotes: notes }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to forward lead');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-insurance-leads'] });
      toast({ title: '✅ הפנייה הועברה בהצלחה', description: `נשלחה ל-${forwardEmail}` });
      setShowForwardDialog(false);
      setForwardEmail('');
      setAdminNotes('');
      setSelectedLead(null);
    },
    onError: (err: Error) => {
      toast({ title: 'שגיאה', description: err.message, variant: 'destructive' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('insurance_leads')
        .update({ status: 'rejected' })
        .eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-insurance-leads'] });
      toast({ title: 'הפנייה נדחתה' });
    },
  });

  const openForwardDialog = (lead: InsuranceLead) => {
    setSelectedLead(lead);
    setForwardEmail('');
    setAdminNotes('');
    setShowForwardDialog(true);
  };

  const openDetailsDialog = (lead: InsuranceLead) => {
    setSelectedLead(lead);
    setShowDetailsDialog(true);
  };

  const pendingLeads = leads?.filter(l => l.status === 'pending') || [];
  const processedLeads = leads?.filter(l => l.status !== 'pending') || [];

  return (
    <div className="space-y-6">
      {/* Pending leads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            פניות ממתינות לאישור
            {pendingLeads.length > 0 && (
              <Badge variant="destructive" className="mr-2">{pendingLeads.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">טוען...</div>
          ) : pendingLeads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">אין פניות ממתינות 🎉</div>
          ) : (
            <div className="space-y-3">
              {pendingLeads.map(lead => (
                <div key={lead.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-foreground">{lead.pet_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {lead.pet_type === 'dog' ? '🐕' : '🐈'} {lead.breed || ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {lead.phone}
                      </span>
                      <span>תוכנית: {planLabels[lead.selected_plan || ''] || lead.selected_plan || '—'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(lead.created_at), 'PPp', { locale: he })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mr-3">
                    <Button size="sm" variant="ghost" onClick={() => openDetailsDialog(lead)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white gap-1"
                      onClick={() => openForwardDialog(lead)}
                    >
                      <Send className="w-3.5 h-3.5" />
                      אשר והעבר
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => rejectMutation.mutate(lead.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed leads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            היסטוריית פניות
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processedLeads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">אין פניות בהיסטוריה</div>
          ) : (
            <div className="space-y-2">
              {processedLeads.map(lead => (
                <div key={lead.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{lead.pet_name}</span>
                      <Badge variant="outline" className={`text-[10px] ${statusConfig[lead.status]?.className || ''}`}>
                        {statusConfig[lead.status]?.label || lead.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(lead.created_at), 'PPp', { locale: he })}
                      {lead.forwarded_to_email && (
                        <span className="mr-2">• הועבר ל: {lead.forwarded_to_email}</span>
                      )}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openDetailsDialog(lead)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Forward Dialog */}
      <Dialog open={showForwardDialog} onOpenChange={setShowForwardDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              העברת פנייה לחברת ביטוח
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <p><strong>חיה:</strong> {selectedLead?.pet_name} ({selectedLead?.breed || 'לא צוין'})</p>
              <p><strong>טלפון:</strong> {selectedLead?.phone}</p>
              <p><strong>תוכנית:</strong> {planLabels[selectedLead?.selected_plan || ''] || selectedLead?.selected_plan}</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">כתובת מייל של חברת הביטוח</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={forwardEmail}
                  onChange={e => setForwardEmail(e.target.value)}
                  placeholder="insurance@company.co.il"
                  type="email"
                  dir="ltr"
                  className="pr-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">הערות (אופציונלי)</label>
              <Textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder="הערות נוספות לחברת הביטוח..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForwardDialog(false)}>ביטול</Button>
            <Button
              onClick={() => {
                if (!selectedLead || !forwardEmail) return;
                forwardMutation.mutate({
                  leadId: selectedLead.id,
                  email: forwardEmail,
                  notes: adminNotes,
                });
              }}
              disabled={!forwardEmail || forwardMutation.isPending}
              className="gap-2"
            >
              {forwardMutation.isPending ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Send className="w-4 h-4" />
              )}
              שלח לחברת הביטוח
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>פרטי פנייה</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">שם חיה:</span> <strong>{selectedLead.pet_name}</strong></div>
                <div><span className="text-muted-foreground">סוג:</span> {selectedLead.pet_type === 'dog' ? 'כלב' : 'חתול'}</div>
                <div><span className="text-muted-foreground">גזע:</span> {selectedLead.breed || 'לא צוין'}</div>
                <div><span className="text-muted-foreground">גיל:</span> {selectedLead.age_years ? `${selectedLead.age_years} שנים` : 'לא צוין'}</div>
                <div><span className="text-muted-foreground">טלפון:</span> {selectedLead.phone}</div>
                <div><span className="text-muted-foreground">תוכנית:</span> {planLabels[selectedLead.selected_plan || ''] || selectedLead.selected_plan || '—'}</div>
              </div>
              {selectedLead.health_answer_1 && (
                <div>
                  <span className="text-muted-foreground">מצב בריאותי:</span>
                  <p className="mt-1">{selectedLead.health_answer_1}</p>
                </div>
              )}
              {selectedLead.health_answer_2 && (
                <div>
                  <span className="text-muted-foreground">פירוט נוסף:</span>
                  <p className="mt-1">{selectedLead.health_answer_2}</p>
                </div>
              )}
              {selectedLead.forwarded_to_email && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                  <p className="text-green-700 dark:text-green-400 font-medium">✅ הועבר ל: {selectedLead.forwarded_to_email}</p>
                  {selectedLead.forwarded_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      בתאריך: {format(new Date(selectedLead.forwarded_at), 'PPp', { locale: he })}
                    </p>
                  )}
                </div>
              )}
              {selectedLead.admin_notes && (
                <div>
                  <span className="text-muted-foreground">הערות אדמין:</span>
                  <p className="mt-1">{selectedLead.admin_notes}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                נוצר: {format(new Date(selectedLead.created_at), 'PPp', { locale: he })}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
