import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Trash2, GripVertical, Save, Eye, X, Type, Mail, Phone, Hash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';

interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'textarea';
  label: string;
  placeholder?: string;
  required: boolean;
}

interface LeadFormBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

const fieldTypes = [
  { value: 'text', label: 'טקסט', icon: Type },
  { value: 'email', label: 'אימייל', icon: Mail },
  { value: 'phone', label: 'טלפון', icon: Phone },
  { value: 'number', label: 'מספר', icon: Hash },
  { value: 'textarea', label: 'טקסט ארוך', icon: FileText },
];

export const LeadFormBuilder = ({ open, onOpenChange, businessId }: LeadFormBuilderProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([
    { id: '1', type: 'text', label: 'שם מלא', required: true },
    { id: '2', type: 'phone', label: 'טלפון', required: true },
  ]);
  const [isActive, setIsActive] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  const { data: existingForms = [] } = useQuery({
    queryKey: ['lead-forms', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_forms')
        .select('*')
        .eq('business_id', businessId);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId && open,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('נא להזין כותרת');
      
      const { error } = await supabase
        .from('lead_forms')
        .insert({
          business_id: businessId,
          title,
          description: description || null,
          fields: fields as any,
          is_active: isActive,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-forms'] });
      toast({ title: 'טופס נוצר בהצלחה' });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: error.message || 'שגיאה ביצירת הטופס', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFields([
      { id: '1', type: 'text', label: 'שם מלא', required: true },
      { id: '2', type: 'phone', label: 'טלפון', required: true },
    ]);
    setIsActive(true);
    setShowPreview(false);
  };

  const addField = () => {
    setFields([
      ...fields,
      { id: Date.now().toString(), type: 'text', label: '', required: false },
    ]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    if (fields.length <= 1) return;
    setFields(fields.filter(f => f.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            בניית טופס לידים
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {showPreview ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4 p-4 bg-muted/30 rounded-xl border"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{title || 'תצוגה מקדימה'}</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
              
              {fields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <Label className="text-sm">
                    {field.label}
                    {field.required && <span className="text-destructive mr-1">*</span>}
                  </Label>
                  {field.type === 'textarea' ? (
                    <Textarea placeholder={field.placeholder} disabled />
                  ) : (
                    <Input type={field.type} placeholder={field.placeholder} disabled />
                  )}
                </div>
              ))}
              
              <Button className="w-full" disabled>שלח</Button>
            </motion.div>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <Label>כותרת הטופס</Label>
                  <Input
                    placeholder="למשל: השאר פרטים לקבלת הצעת מחיר"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label>תיאור (אופציונלי)</Label>
                  <Textarea
                    placeholder="תיאור קצר שיופיע מעל הטופס"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>שדות הטופס</Label>
                <AnimatePresence>
                  {fields.map((field, index) => (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg"
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground mt-2.5 cursor-grab" />
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="שם השדה"
                            value={field.label}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                            className="flex-1"
                          />
                          <Select
                            value={field.type}
                            onValueChange={(v: FormField['type']) => updateField(field.id, { type: v })}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={field.required}
                              onCheckedChange={(v) => updateField(field.id, { required: v })}
                              id={`required-${field.id}`}
                            />
                            <Label htmlFor={`required-${field.id}`} className="text-xs">
                              שדה חובה
                            </Label>
                          </div>
                          
                          {fields.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-destructive"
                              onClick={() => removeField(field.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                <Button variant="outline" size="sm" onClick={addField} className="w-full">
                  <Plus className="w-4 h-4 ml-1" />
                  הוסף שדה
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <Label>הפעל טופס</Label>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="w-4 h-4 ml-1" />
            {showPreview ? 'ערוך' : 'תצוגה מקדימה'}
          </Button>
          <Button
            className="flex-1"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !title.trim()}
          >
            <Save className="w-4 h-4 ml-1" />
            {saveMutation.isPending ? 'שומר...' : 'שמור טופס'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
