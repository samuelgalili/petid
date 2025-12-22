import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, Trash2, Edit2, Zap, X, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

interface QuickReply {
  id: string;
  title: string;
  message_text: string;
  shortcut: string | null;
  use_count: number;
}

interface QuickRepliesManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectReply?: (message: string) => void;
}

export const QuickRepliesManager = ({ open, onOpenChange, onSelectReply }: QuickRepliesManagerProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [messageText, setMessageText] = useState('');
  const [shortcut, setShortcut] = useState('');

  const { data: replies = [], isLoading } = useQuery({
    queryKey: ['quick-replies', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('quick_replies')
        .select('*')
        .eq('user_id', user.id)
        .order('use_count', { ascending: false });
      
      if (error) throw error;
      return data as QuickReply[];
    },
    enabled: !!user && open,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('quick_replies')
        .insert({
          user_id: user.id,
          title,
          message_text: messageText,
          shortcut: shortcut || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
      resetForm();
      toast({ title: 'תגובה מהירה נוספה' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quick_replies')
        .update({ title, message_text: messageText, shortcut: shortcut || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
      resetForm();
      toast({ title: 'תגובה מהירה עודכנה' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quick_replies')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
      toast({ title: 'תגובה מהירה נמחקה' });
    },
  });

  const useReplyMutation = useMutation({
    mutationFn: async (reply: QuickReply) => {
      await supabase
        .from('quick_replies')
        .update({ use_count: reply.use_count + 1 })
        .eq('id', reply.id);
      return reply;
    },
    onSuccess: (reply) => {
      onSelectReply?.(reply.message_text);
      onOpenChange(false);
    },
  });

  const resetForm = () => {
    setTitle('');
    setMessageText('');
    setShortcut('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (reply: QuickReply) => {
    setTitle(reply.title);
    setMessageText(reply.message_text);
    setShortcut(reply.shortcut || '');
    setEditingId(reply.id);
    setIsAdding(true);
  };

  const handleSave = () => {
    if (!title.trim() || !messageText.trim()) return;
    if (editingId) {
      updateMutation.mutate(editingId);
    } else {
      addMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            תגובות מהירות
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3">
          {isAdding ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 p-3 bg-muted/50 rounded-xl"
            >
              <Input
                placeholder="כותרת (למשל: שעות פעילות)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                placeholder="תוכן ההודעה..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={3}
              />
              <Input
                placeholder="קיצור (אופציונלי, למשל: /hours)"
                value={shortcut}
                onChange={(e) => setShortcut(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetForm}
                  className="flex-1"
                >
                  <X className="w-4 h-4 ml-1" />
                  ביטול
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!title.trim() || !messageText.trim()}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 ml-1" />
                  {editingId ? 'עדכון' : 'שמירה'}
                </Button>
              </div>
            </motion.div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="w-4 h-4 ml-2" />
              הוסף תגובה מהירה
            </Button>
          )}

          {isLoading ? (
            <div className="text-center text-muted-foreground py-4">טוען...</div>
          ) : replies.length === 0 && !isAdding ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">אין תגובות מהירות עדיין</p>
            </div>
          ) : (
            <AnimatePresence>
              {replies.map((reply) => (
                <motion.div
                  key={reply.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="p-3 bg-card border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => useReplyMutation.mutate(reply)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{reply.title}</span>
                        {reply.shortcut && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                            {reply.shortcut}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {reply.message_text}
                      </p>
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        שימושים: {reply.use_count}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(reply);
                        }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(reply.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
