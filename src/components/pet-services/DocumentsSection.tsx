/**
 * DocumentsSection - Reusable documents section for all pet service categories
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Trash2, Download, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { createMyDocument, deleteMyDocument, getMyDocuments, type MipoDocument } from '@/lib/mipoApi';

type DocumentCategory = 'insurance' | 'training' | 'grooming' | 'boarding' | 'food' | 'health';

interface DocumentsSectionProps {
  petId: string;
  category: DocumentCategory;
  title?: string;
}

interface ServiceDocument {
  id: string;
  document_name: string;
  document_url: string;
  file_size: number | null;
  created_at: string;
}

const categoryLabels: Record<DocumentCategory, string> = {
  insurance: 'ביטוח',
  training: 'אילוף',
  grooming: 'טיפוח',
  boarding: 'פנסיון',
  food: 'מזון',
  health: 'בריאות',
};

const documentTypeToCategory: Record<string, DocumentCategory> = {
  insurance: 'insurance',
  training: 'training',
  grooming: 'grooming',
  boarding: 'boarding',
  food: 'food',
  health: 'health',
  medical: 'health',
  vaccination: 'health',
};

const categoryToDocumentType = (category: DocumentCategory) => (
  category === 'health' ? 'medical' : category
);

const toServiceDocument = (doc: MipoDocument): ServiceDocument => ({
  id: doc.id,
  document_name: doc.title || doc.file_name,
  document_url: doc.file_url,
  file_size: doc.file_size,
  created_at: doc.uploaded_at,
});

export const DocumentsSection = ({ petId, category, title }: DocumentsSectionProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['pet-documents', petId, category],
    queryFn: async () => {
      const results = await getMyDocuments({ pet_id: petId, limit: 200 });
      return results
        .filter((doc) => documentTypeToCategory[doc.document_type] === category)
        .map(toServiceDocument);
    },
    enabled: !!petId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await deleteMyDocument(documentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet-documents', petId, category] });
      toast({ title: 'המסמך נמחק בהצלחה' });
    },
    onError: () => {
      toast({ title: 'שגיאה במחיקת המסמך', variant: 'destructive' });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await createMyDocument({
        pet_id: petId,
        document_type: categoryToDocumentType(category),
        title: file.name,
        file,
      });
      queryClient.invalidateQueries({ queryKey: ['pet-documents', petId, category] });
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

  return (
    <div className="border-t border-border pt-4 mt-4">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-2"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {title || `מסמכי ${categoryLabels[category]}`}
          </span>
          {documents && documents.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {documents.length}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">
              {/* Upload Button */}
              <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.docx"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                {isUploading ? (
                  <span className="text-sm text-muted-foreground">מעלה...</span>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-primary" />
                    <span className="text-sm text-primary font-medium">הוספת מסמך</span>
                  </>
                )}
              </label>

              {/* Documents List */}
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : documents && documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {doc.document_name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(doc.file_size || 0)}</span>
                          <span>•</span>
                          <span>{format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: he })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href={doc.document_url}
                          download={doc.document_name}
                          className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"
                        >
                          <Download className="w-4 h-4 text-muted-foreground" />
                        </a>
                        <button
                          onClick={() => deleteMutation.mutate(doc.id)}
                          className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  אין מסמכים עדיין
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
