import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MessageSquareText, Clock, Save, Moon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface AutoRepliesSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AutoRepliesSettings = ({ open, onOpenChange }: AutoRepliesSettingsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [greetingEnabled, setGreetingEnabled] = useState(false);
  const [greetingMessage, setGreetingMessage] = useState('');
  const [awayEnabled, setAwayEnabled] = useState(false);
  const [awayMessage, setAwayMessage] = useState('');
  const [awayStartTime, setAwayStartTime] = useState('');
  const [awayEndTime, setAwayEndTime] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['auto-replies', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('auto_replies')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  useEffect(() => {
    if (settings) {
      setGreetingEnabled(settings.greeting_enabled || false);
      setGreetingMessage(settings.greeting_message || '');
      setAwayEnabled(settings.away_enabled || false);
      setAwayMessage(settings.away_message || '');
      setAwayStartTime(settings.away_start_time || '');
      setAwayEndTime(settings.away_end_time || '');
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const data = {
        user_id: user.id,
        greeting_enabled: greetingEnabled,
        greeting_message: greetingMessage || null,
        away_enabled: awayEnabled,
        away_message: awayMessage || null,
        away_start_time: awayStartTime || null,
        away_end_time: awayEndTime || null,
      };

      const { error } = await supabase
        .from('auto_replies')
        .upsert(data, { onConflict: 'user_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-replies'] });
      toast({ title: 'הגדרות נשמרו בהצלחה' });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'שגיאה בשמירה', variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-primary" />
            תגובות אוטומטיות
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">טוען...</div>
        ) : (
          <div className="space-y-6">
            {/* Greeting Message */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="w-4 h-4 text-primary" />
                  <Label className="font-medium">הודעת פתיחה</Label>
                </div>
                <Switch
                  checked={greetingEnabled}
                  onCheckedChange={setGreetingEnabled}
                />
              </div>
              {greetingEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Textarea
                    placeholder="היי! תודה שפנית אלינו 👋 איך אוכל לעזור?"
                    value={greetingMessage}
                    onChange={(e) => setGreetingMessage(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    הודעה זו תישלח אוטומטית כשמישהו שולח לך הודעה ראשונה
                  </p>
                </motion.div>
              )}
            </motion.div>

            {/* Away Message */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-primary" />
                  <Label className="font-medium">הודעת "לא זמין"</Label>
                </div>
                <Switch
                  checked={awayEnabled}
                  onCheckedChange={setAwayEnabled}
                />
              </div>
              {awayEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3"
                >
                  <Textarea
                    placeholder="תודה על הפנייה! אנחנו כרגע לא זמינים, נחזור אליך בהקדם 🙏"
                    value={awayMessage}
                    onChange={(e) => setAwayMessage(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">משעה</Label>
                      <Input
                        type="time"
                        value={awayStartTime}
                        onChange={(e) => setAwayStartTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">עד שעה</Label>
                      <Input
                        type="time"
                        value={awayEndTime}
                        onChange={(e) => setAwayEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>ההודעה תישלח בין השעות שהגדרת</span>
                  </div>
                </motion.div>
              )}
            </motion.div>

            <Button
              className="w-full"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              <Save className="w-4 h-4 ml-2" />
              {saveMutation.isPending ? 'שומר...' : 'שמור הגדרות'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
