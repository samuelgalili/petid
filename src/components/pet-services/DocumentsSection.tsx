/**
 * DocumentsSection - Reusable documents section for all pet service categories
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, Trash2, Download, Calendar, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { autoSaveToDocuments } from '@/lib/autoSaveUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useDocumentExtraction } from '@/hooks/useDocumentExtraction';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

type DocumentCategory = 'insurance' | 'training' | 'grooming' | 'boarding' | 'food' | 'health';

interface DocumentsSectionProps {
  petId: string;
  category: DocumentCategory;
  title?: string;
}

const categoryLabels: Record<DocumentCategory, string> = {
  insurance: 'ביטוח',
  training: 'אילוף',
  grooming: 'טיפוח',
  boarding: 'פנסיון',
  food: 'מזון',
  health: 'בריאות',
};

export const DocumentsSection = ({ petId, category, title }: DocumentsSectionProps) => {
  const { toast } = useToast();
  const { extractDataFromDocument } = useDocumentExtraction();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['pet-documents', petId, category],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('pet_service_documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('pet_id', petId)
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!petId,
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // For now, store as data URL (similar to avatar approach)
      // In production, use proper file storage
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        
        const { data: docData, error } = await supabase
          .from('pet_service_documents')
          .insert({
            user_id: user.id,
            pet_id: petId,
            category,
            document_name: file.name,
            document_url: dataUrl,
            document_type: file.type,
            file_size: file.size,
          })
          .select()
          .single();

        if (error) throw error;

        // Auto-extract data from document using AI
        if (docData) {
          // Pass text content to AI for extraction
          // For now using the filename and metadata, in production you'd use a proper OCR service
          // or pass the dataUrl if the LLM supports image analysis
          await extractDataFromDocument(
            docData.id,
            `מסמך מסוג ${category} בשם ${file.name}.`, 
            file.name,
            petId
          );
        }

        queryClient.invalidateQueries({ queryKey: ['pet-documents', petId, category] });
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
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
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
