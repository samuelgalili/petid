/**
 * ExtractedDocumentData - Admin view for extracted data from pet documents
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { FileText, Calendar, DollarSign, User, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface ExtractedDocumentDataProps {
  petId: string;
}

export const ExtractedDocumentData = ({ petId }: ExtractedDocumentDataProps) => {
  const { data: extractedData, isLoading } = useQuery({
    queryKey: ['pet-extracted-data', petId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('pet_document_extracted_data')
        .select('*')
        .eq('pet_id', petId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!petId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!extractedData || extractedData.length === 0) {
    return (
      <div className="p-4 bg-muted/30 rounded-xl text-center">
        <p className="text-sm text-muted-foreground">אין מסמכים שעובדו עדיין</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {extractedData.map((item: any, index: number) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="p-4 bg-card border border-border/30 rounded-xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {item.provider_type && `${item.provider_type} - `}
                  {item.treatment_type || item.vaccination_type || 'מסמך'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                ביטחון: {Math.round((item.extraction_confidence || 0) * 100)}%
              </span>
            </div>
          </div>

          {/* Data Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Health Data */}
            {(item.chip_number || item.vaccination_type || item.diagnosis) && (
              <div className="col-span-2 space-y-2">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Stethoscope className="w-3 h-3" />
                  נתונים בריאותיים
                </h4>
                <div className="space-y-1 text-xs">
                  {item.chip_number && (
                    <p><span className="text-muted-foreground">מספר שבב:</span> {item.chip_number}</p>
                  )}
                  {item.vaccination_type && (
                    <p><span className="text-muted-foreground">סוג הצפה:</span> {item.vaccination_type}</p>
                  )}
                  {item.vaccination_date && (
                    <p><span className="text-muted-foreground">תאריך הצפה:</span> {format(new Date(item.vaccination_date), 'dd/MM/yyyy', { locale: he })}</p>
                  )}
                  {item.diagnosis && (
                    <p><span className="text-muted-foreground">אבחנה:</span> {item.diagnosis}</p>
                  )}
                  {item.vet_name && (
                    <p><span className="text-muted-foreground">שם הווטרינר:</span> {item.vet_name}</p>
                  )}
                </div>
              </div>
            )}

            {/* Financial Data */}
            {item.total_cost && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  עלות
                </p>
                <p className="text-sm font-semibold text-primary">
                  {item.total_cost} {item.currency}
                </p>
                {item.invoice_number && (
                  <p className="text-xs text-muted-foreground">חשבונית: {item.invoice_number}</p>
                )}
              </div>
            )}

            {/* Provider Info */}
            {item.provider_name && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <User className="w-3 h-3" />
                  ספק
                </p>
                <p className="text-xs text-foreground">{item.provider_name}</p>
                {item.provider_phone && (
                  <p className="text-xs text-muted-foreground">טלפון: {item.provider_phone}</p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};
