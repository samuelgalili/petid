import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface InventoryUpdate {
  productId: string;
  productName: string;
  previousStock: number;
  currentStock: number;
  timestamp: Date;
}

interface RealtimeInventoryConfig {
  lowStockThreshold?: number;
  enableNotifications?: boolean;
  productIds?: string[];
}

const DEFAULT_CONFIG: RealtimeInventoryConfig = {
  lowStockThreshold: 5,
  enableNotifications: true,
};

/**
 * Realtime inventory sync hook
 */
export const useRealtimeInventory = (config: RealtimeInventoryConfig = {}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const opts = { ...DEFAULT_CONFIG, ...config };
  
  const [updates, setUpdates] = useState<InventoryUpdate[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<string[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<string[]>([]);

  const handleInventoryChange = useCallback((payload: any) => {
    const { new: newRecord, old: oldRecord } = payload;
    
    if (!newRecord) return;

    // Track the update
    const update: InventoryUpdate = {
      productId: newRecord.id,
      productName: newRecord.name,
      previousStock: oldRecord?.stock ?? 0,
      currentStock: newRecord.stock ?? newRecord.in_stock ? 1 : 0,
      timestamp: new Date(),
    };

    setUpdates(prev => [update, ...prev.slice(0, 49)]); // Keep last 50 updates

    // Check for low stock
    const stock = newRecord.stock ?? (newRecord.in_stock ? 999 : 0);
    
    if (stock === 0) {
      setOutOfStockProducts(prev => 
        prev.includes(newRecord.id) ? prev : [...prev, newRecord.id]
      );
      
      if (opts.enableNotifications) {
        toast({
          title: "אזל מהמלאי! ⚠️",
          description: `${newRecord.name} אזל מהמלאי`,
          variant: "destructive",
        });
      }
    } else if (stock <= opts.lowStockThreshold!) {
      setLowStockProducts(prev => 
        prev.includes(newRecord.id) ? prev : [...prev, newRecord.id]
      );
      
      if (opts.enableNotifications) {
        toast({
          title: "מלאי נמוך",
          description: `${newRecord.name} - נותרו ${stock} יחידות`,
          variant: "default",
        });
      }
    } else {
      // Remove from low/out of stock if restocked
      setLowStockProducts(prev => prev.filter(id => id !== newRecord.id));
      setOutOfStockProducts(prev => prev.filter(id => id !== newRecord.id));
    }

    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['product', newRecord.id] });
  }, [opts, toast, queryClient]);

  useEffect(() => {
    // Subscribe to realtime changes
    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'business_products',
          filter: opts.productIds?.length 
            ? `id=in.(${opts.productIds.join(',')})` 
            : undefined,
        },
        handleInventoryChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [opts.productIds, handleInventoryChange]);

  const isLowStock = useCallback((productId: string): boolean => {
    return lowStockProducts.includes(productId);
  }, [lowStockProducts]);

  const isOutOfStock = useCallback((productId: string): boolean => {
    return outOfStockProducts.includes(productId);
  }, [outOfStockProducts]);

  const clearUpdates = useCallback(() => {
    setUpdates([]);
  }, []);

  return {
    updates,
    lowStockProducts,
    outOfStockProducts,
    isLowStock,
    isOutOfStock,
    clearUpdates,
    recentUpdatesCount: updates.length,
  };
};

export default useRealtimeInventory;
