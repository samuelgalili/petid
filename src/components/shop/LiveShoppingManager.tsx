import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Plus, Calendar, Clock, Users, Play, StopCircle, Package, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';

interface LiveShoppingManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'מתוכנן', color: 'bg-blue-500' },
  live: { label: 'בשידור', color: 'bg-red-500' },
  ended: { label: 'הסתיים', color: 'bg-gray-500' },
};

export const LiveShoppingManager = ({ open, onOpenChange, businessId }: LiveShoppingManagerProps) => {
  const queryClient = useQueryClient();
  
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['live-shopping-sessions', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_shopping_sessions')
        .select(`
          *,
          live_shopping_products(product_id, sales_count)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId && open,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['business-products', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_products')
        .select('id, name, image_url, price')
        .eq('business_id', businessId);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId && isCreating,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const scheduledAt = scheduledDate && scheduledTime 
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;

      const { data: session, error: sessionError } = await supabase
        .from('live_shopping_sessions')
        .insert({
          business_id: businessId,
          title,
          description: description || null,
          scheduled_at: scheduledAt,
          status: scheduledAt ? 'scheduled' : 'live',
          started_at: !scheduledAt ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      if (selectedProducts.length > 0) {
        await supabase.from('live_shopping_products').insert(
          selectedProducts.map((productId, index) => ({
            session_id: session.id,
            product_id: productId,
            display_order: index,
          }))
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-shopping-sessions'] });
      resetForm();
      toast({ title: 'שידור נוצר בהצלחה' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ sessionId, status }: { sessionId: string; status: string }) => {
      const updates: any = { status };
      if (status === 'live') updates.started_at = new Date().toISOString();
      if (status === 'ended') updates.ended_at = new Date().toISOString();

      const { error } = await supabase
        .from('live_shopping_sessions')
        .update(updates)
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-shopping-sessions'] });
      toast({ title: 'סטטוס עודכן' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('live_shopping_sessions')
        .delete()
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-shopping-sessions'] });
      toast({ title: 'שידור נמחק' });
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setScheduledDate('');
    setScheduledTime('');
    setSelectedProducts([]);
    setIsCreating(false);
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500" />
            Live Shopping
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {isCreating ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 p-4 bg-muted/30 rounded-xl"
            >
              <div>
                <Label>כותרת השידור</Label>
                <Input
                  placeholder="למשל: מבצע סוף עונה!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <Label>תיאור</Label>
                <Textarea
                  placeholder="ספרו על מה השידור..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>תאריך (אופציונלי)</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>שעה</Label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>מוצרים להציג בשידור</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => toggleProduct(product.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedProducts.includes(product.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox checked={selectedProducts.includes(product.id)} className="pointer-events-none" />
                      <img src={product.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                      <span className="text-xs truncate flex-1">{product.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={resetForm}>
                  ביטול
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => createMutation.mutate()}
                  disabled={!title.trim() || createMutation.isPending}
                >
                  {scheduledDate ? 'תזמן שידור' : 'התחל שידור'}
                </Button>
              </div>
            </motion.div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 ml-2" />
              צור שידור חדש
            </Button>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">טוען...</div>
          ) : sessions.length === 0 && !isCreating ? (
            <div className="text-center py-12">
              <Radio className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">אין שידורים עדיין</p>
              <p className="text-xs text-muted-foreground mt-1">
                צרו שידור חי למכירת מוצרים בזמן אמת
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {sessions.map((session: any) => {
                const status = statusConfig[session.status] || statusConfig.scheduled;
                const totalSales = session.live_shopping_products?.reduce(
                  (sum: number, p: any) => sum + (p.sales_count || 0), 0
                ) || 0;

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="p-4 bg-card border rounded-xl"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{session.title}</span>
                          <Badge className={`${status.color} text-white text-[10px]`}>
                            {session.status === 'live' && (
                              <span className="w-2 h-2 bg-white rounded-full animate-pulse ml-1" />
                            )}
                            {status.label}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {session.scheduled_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(session.scheduled_at), 'dd/MM HH:mm', { locale: he })}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {session.viewer_count} צופים
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {totalSales} מכירות
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteMutation.mutate(session.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Actions based on status */}
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      {session.status === 'scheduled' && (
                        <Button
                          size="sm"
                          className="flex-1 bg-red-500 hover:bg-red-600"
                          onClick={() => updateStatusMutation.mutate({ sessionId: session.id, status: 'live' })}
                        >
                          <Play className="w-4 h-4 ml-1" />
                          התחל שידור
                        </Button>
                      )}
                      {session.status === 'live' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => updateStatusMutation.mutate({ sessionId: session.id, status: 'ended' })}
                        >
                          <StopCircle className="w-4 h-4 ml-1" />
                          סיים שידור
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
