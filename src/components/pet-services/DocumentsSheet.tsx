/**
 * DocumentsSheet - Bottom sheet for managing all pet documents
 */

import { useState } from 'react';
import { ServiceBottomSheet } from './ServiceBottomSheet';
import { FileText, Upload, Trash2, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { createMyDocument, deleteMyDocument, getMyDocuments, type MipoDocument, type MipoPet } from '@/lib/mipoApi';
import { openSafeExternalUrl } from '@/lib/safeExternalUrl';

interface DocumentsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pick<MipoPet, 'id'> | null;
}

interface SheetDocument {
  id: string;
  category: string;
  document_name: string;
  document_url: string;
  file_size: number | null;
}

const toSheetDocument = (doc: MipoDocument): SheetDocument => ({
  id: doc.id,
  category: doc.document_type,
  document_name: doc.title || doc.file_name,
  document_url: doc.file_url,
  file_size: doc.file_size,
});

export const DocumentsSheet = ({ isOpen, onClose, pet }: DocumentsSheetProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['all-pet-documents', pet?.id],
    queryFn: async () => {
      if (!pet?.id) return [];
      const results = await getMyDocuments({ pet_id: pet.id, limit: 200 });
      return results.map(toSheetDocument);
    },
    enabled: !!pet?.id && isOpen,
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await deleteMyDocument(documentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-pet-documents', pet?.id] });
      toast({ title: 'המסמך נמחק בהצלחה' });
    },
    onError: () => {
      toast({ title: 'שגיאה במחיקת המסמך', variant: 'destructive' });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pet?.id) return;

    setIsUploading(true);
    try {
      await createMyDocument({
        pet_id: pet.id,
        document_type: 'other',
        title: file.name,
        file,
      });
      queryClient.invalidateQueries({ queryKey: ['all-pet-documents', pet?.id] });
      toast({ title: 'המסמך הועלה בהצלחה' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'שגיאה בהעלאת המסמך', description: error instanceof Error ? error.message : undefined, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      insurance: 'ביטוח',
      training: 'אילוף',
      grooming: 'טיפוח',
      food: 'מזון',
      boarding: 'פנסיון',
      health: 'בריאות',
      medical: 'בריאות',
      vaccination: 'חיסונים',
      invoice: 'חשבונית',
      other: 'כללי',
      general: 'כללי',
    };
    return labels[category] || category;
  };

  const handleViewDocument = (url: string) => {
    openSafeExternalUrl(url);
  };

  return (
    <ServiceBottomSheet isOpen={isOpen} onClose={onClose} title="מסמכים">
      <div className="space-y-4">
        {/* Upload Button */}
        <div className="flex justify-center">
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.docx"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <Button 
              variant="outline" 
              className="gap-2"
              disabled={isUploading}
              asChild
            >
              <span>
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                העלאת מסמך
              </span>
            </Button>
          </label>
        </div>

        {/* Documents List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {documents.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {doc.document_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{getCategoryLabel(doc.category)}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.file_size || 0)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleViewDocument(doc.document_url)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(doc.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">אין מסמכים עדיין</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              העלה מסמכים כמו תעודות חיסון, פוליסות ביטוח ועוד
            </p>
          </div>
        )}
      </div>
    </ServiceBottomSheet>
  );
};
