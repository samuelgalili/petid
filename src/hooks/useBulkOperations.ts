import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuditLog } from './useAuditLog';

interface BulkOperationResult {
  success: number;
  failed: number;
  errors: { id: string; error: string }[];
}

type EntityType = 'products' | 'orders' | 'users' | 'posts';

/**
 * Bulk operations hook for admin panel
 */
export const useBulkOperations = () => {
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const bulkUpdate = useCallback(async <T extends Record<string, any>>(
    table: string,
    ids: string[],
    updates: Partial<T>,
    entityType: EntityType = 'products'
  ): Promise<BulkOperationResult> => {
    setIsProcessing(true);
    setProgress(0);

    const result: BulkOperationResult = { success: 0, failed: 0, errors: [] };
    const batchSize = 50;

    try {
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from(table as any)
          .update(updates as any)
          .in('id', batch);

        if (error) {
          batch.forEach(id => {
            result.failed++;
            result.errors.push({ id, error: error.message });
          });
        } else {
          result.success += batch.length;
        }

        setProgress(Math.round(((i + batch.length) / ids.length) * 100));
      }

      // Log the bulk action
      await logAction({
        action_type: `${entityType.slice(0, -1)}.updated` as any,
        entity_type: entityType.slice(0, -1) as any,
        metadata: { 
          bulk: true, 
          count: result.success,
          updates: Object.keys(updates),
        },
      });

      toast({
        title: "עדכון בוצע",
        description: `${result.success} פריטים עודכנו בהצלחה${result.failed > 0 ? `, ${result.failed} נכשלו` : ''}`,
        variant: result.failed > 0 ? "destructive" : "default",
      });

      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [toast, logAction]);

  const bulkDelete = useCallback(async (
    table: string,
    ids: string[],
    entityType: EntityType = 'products'
  ): Promise<BulkOperationResult> => {
    setIsProcessing(true);
    setProgress(0);

    const result: BulkOperationResult = { success: 0, failed: 0, errors: [] };
    const batchSize = 50;

    try {
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from(table as any)
          .delete()
          .in('id', batch);

        if (error) {
          batch.forEach(id => {
            result.failed++;
            result.errors.push({ id, error: error.message });
          });
        } else {
          result.success += batch.length;
        }

        setProgress(Math.round(((i + batch.length) / ids.length) * 100));
      }

      await logAction({
        action_type: `${entityType.slice(0, -1)}.deleted` as any,
        entity_type: entityType.slice(0, -1) as any,
        metadata: { bulk: true, count: result.success },
      });

      toast({
        title: "מחיקה בוצעה",
        description: `${result.success} פריטים נמחקו${result.failed > 0 ? `, ${result.failed} נכשלו` : ''}`,
        variant: result.failed > 0 ? "destructive" : "default",
      });

      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [toast, logAction]);

  const bulkStatusChange = useCallback(async (
    table: string,
    ids: string[],
    status: string,
    entityType: EntityType = 'orders'
  ): Promise<BulkOperationResult> => {
    return bulkUpdate(table, ids, { status } as any, entityType);
  }, [bulkUpdate]);

  const bulkExport = useCallback(async (
    table: string,
    ids: string[],
    columns?: string[]
  ): Promise<any[]> => {
    setIsProcessing(true);
    
    try {
      let query = supabase.from(table as any).select(columns?.join(',') || '*');
      
      if (ids.length > 0) {
        query = query.in('id', ids);
      }

      const { data, error } = await query;
      if (error) throw error;

      toast({
        title: "ייצוא הושלם",
        description: `${data?.length || 0} רשומות יוצאו`,
      });

      return data || [];
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const bulkImport = useCallback(async <T extends Record<string, any>>(
    table: string,
    records: T[],
    entityType: EntityType = 'products'
  ): Promise<BulkOperationResult> => {
    setIsProcessing(true);
    setProgress(0);

    const result: BulkOperationResult = { success: 0, failed: 0, errors: [] };
    const batchSize = 100;

    try {
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from(table as any)
          .upsert(batch as any, { onConflict: 'id' });

        if (error) {
          batch.forEach((_, idx) => {
            result.failed++;
            result.errors.push({ id: `row-${i + idx}`, error: error.message });
          });
        } else {
          result.success += batch.length;
        }

        setProgress(Math.round(((i + batch.length) / records.length) * 100));
      }

      await logAction({
        action_type: `${entityType.slice(0, -1)}.created` as any,
        entity_type: entityType.slice(0, -1) as any,
        metadata: { bulk: true, count: result.success, import: true },
      });

      toast({
        title: "ייבוא הושלם",
        description: `${result.success} רשומות יובאו${result.failed > 0 ? `, ${result.failed} נכשלו` : ''}`,
        variant: result.failed > 0 ? "destructive" : "default",
      });

      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [toast, logAction]);

  return {
    isProcessing,
    progress,
    bulkUpdate,
    bulkDelete,
    bulkStatusChange,
    bulkExport,
    bulkImport,
  };
};

export default useBulkOperations;
