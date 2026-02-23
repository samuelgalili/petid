/**
 * PetVaultDrawer — Full-screen secure document vault for a pet
 * Groups files by type: Medical, Insurance, ID, General
 * Actions: View + Share per file
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Upload, Eye, Share2, Loader2, Shield, Stethoscope, CreditCard, FolderOpen, ChevronDown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

type VaultCategory = 'medical' | 'insurance' | 'id' | 'general';

interface PetVaultDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pet: any;
}

const VAULT_CATEGORIES: { id: VaultCategory; label: string; icon: typeof FileText; color: string }[] = [
  { id: 'medical', label: 'רפואי', icon: Stethoscope, color: 'text-red-500 bg-red-500/10' },
  { id: 'insurance', label: 'ביטוח', icon: Shield, color: 'text-blue-500 bg-blue-500/10' },
  { id: 'id', label: 'זיהוי', icon: CreditCard, color: 'text-amber-500 bg-amber-500/10' },
  { id: 'general', label: 'כללי', icon: FolderOpen, color: 'text-muted-foreground bg-muted/50' },
];

const CATEGORY_MAP: Record<string, VaultCategory> = {
  health: 'medical',
  medical: 'medical',
  insurance: 'insurance',
  id: 'id',
  identification: 'id',
  general: 'general',
  training: 'general',
  grooming: 'general',
  boarding: 'general',
  food: 'general',
};

export const PetVaultDrawer = ({ isOpen, onClose, pet }: PetVaultDrawerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<VaultCategory | null>('medical');

  const { data: documents, isLoading } = useQuery({
    queryKey: ['pet-vault-documents', pet?.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !pet?.id) return [];

      const { data, error } = await supabase
        .from('pet_service_documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('pet_id', pet.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!pet?.id && isOpen,
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('pet_service_documents')
        .delete()
        .eq('id', documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet-vault-documents', pet?.id] });
      toast({ title: 'המסמך נמחק בהצלחה' });
    },
    onError: () => {
      toast({ title: 'שגיאה במחיקת המסמך', variant: 'destructive' });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: VaultCategory) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const dbCategory = category === 'medical' ? 'health' : category;

        const { error } = await supabase
          .from('pet_service_documents')
          .insert({
            user_id: user.id,
            pet_id: pet.id,
            category: dbCategory,
            document_name: file.name,
            document_url: dataUrl,
            document_type: file.type,
            file_size: file.size,
          });

        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ['pet-vault-documents', pet?.id] });
        toast({ title: 'המסמך הועלה בהצלחה' });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'שגיאה בהעלאת המסמך', variant: 'destructive' });
      setIsUploading(false);
    }
  };

  const handleView = (url: string) => {
    window.open(url, '_blank');
  };

  const handleShare = async (doc: any) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: doc.document_name,
          text: `מסמך של ${pet?.name}: ${doc.document_name}`,
          url: doc.document_url,
        });
      } catch {
        // User cancelled share
      }
    } else {
      // Fallback: copy URL
      await navigator.clipboard.writeText(doc.document_url);
      toast({ title: 'הקישור הועתק' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const groupedDocs = VAULT_CATEGORIES.map((cat) => ({
    ...cat,
    docs: (documents || []).filter((d: any) => (CATEGORY_MAP[d.category] || 'general') === cat.id),
  }));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[300] bg-background flex flex-col"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          dir="rtl"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/20">
            <div className="flex items-center justify-between px-5 h-14">
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"
                  initial={{ rotate: -10 }}
                  animate={{ rotate: 0 }}
                >
                  <Shield className="w-4 h-4 text-primary" />
                </motion.div>
                <div>
                  <h1 className="text-base font-bold text-foreground">הכספת של {pet?.name || 'חיית המחמד'}</h1>
                  <p className="text-[10px] text-muted-foreground">{(documents || []).length} מסמכים</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-20 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              groupedDocs.map((group) => {
                const Icon = group.icon;
                const isExpanded = expandedCategory === group.id;
                const [iconColor, iconBg] = group.color.split(' ');

                return (
                  <motion.div
                    key={group.id}
                    className="bg-card border border-border/30 rounded-2xl overflow-hidden"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {/* Category Header */}
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? null : group.id)}
                      className="w-full flex items-center justify-between px-4 py-3.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
                          <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-foreground">{group.label}</span>
                          <span className="text-[10px] text-muted-foreground mr-2">
                            ({group.docs.length})
                          </span>
                        </div>
                      </div>
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </motion.div>
                    </button>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-2">
                            {/* Upload for this category */}
                            <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border/40 rounded-xl cursor-pointer hover:border-primary/40 transition-colors">
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                onChange={(e) => handleFileUpload(e, group.id)}
                                disabled={isUploading}
                              />
                              {isUploading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 text-primary" />
                                  <span className="text-xs text-primary font-medium">העלאת מסמך</span>
                                </>
                              )}
                            </label>

                            {/* Document List */}
                            {group.docs.length > 0 ? (
                              group.docs.map((doc: any) => (
                                <motion.div
                                  key={doc.id}
                                  className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl"
                                  initial={{ opacity: 0, x: 10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                >
                                  <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                                    <FileText className={`w-4 h-4 ${iconColor}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                      {doc.document_name}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                      <span>{formatFileSize(doc.file_size || 0)}</span>
                                      <span>•</span>
                                      <span>{format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: he })}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      onClick={() => handleView(doc.document_url)}
                                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                                      aria-label="צפייה"
                                    >
                                      <Eye className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                    <button
                                      onClick={() => handleShare(doc)}
                                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                                      aria-label="שיתוף"
                                    >
                                      <Share2 className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                  </div>
                                </motion.div>
                              ))
                            ) : (
                              <p className="text-xs text-muted-foreground text-center py-3">
                                אין מסמכים בקטגוריה זו
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
