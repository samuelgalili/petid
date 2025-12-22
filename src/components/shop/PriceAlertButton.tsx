import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface PriceAlertButtonProps {
  productId: string;
  currentPrice: number;
  productName: string;
}

export const PriceAlertButton = ({ productId, currentPrice, productName }: PriceAlertButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [targetPrice, setTargetPrice] = useState(Math.floor(currentPrice * 0.9));

  const { data: existingAlert } = useQuery({
    queryKey: ['price-alert', productId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('price_alerts')
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const createAlertMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('price_alerts')
        .upsert({
          user_id: user.id,
          product_id: productId,
          original_price: currentPrice,
          target_price: targetPrice,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alert', productId] });
      setShowDialog(false);
      toast.success('התראת מחיר נוספה! נעדכן אותך כשהמחיר ירד');
    },
  });

  const removeAlertMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      
      const { error } = await supabase
        .from('price_alerts')
        .delete()
        .eq('product_id', productId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alert', productId] });
      toast.success('התראת המחיר הוסרה');
    },
  });

  const handleClick = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (existingAlert) {
      removeAlertMutation.mutate();
    } else {
      setShowDialog(true);
    }
  };

  return (
    <>
      <Button
        variant={existingAlert ? 'default' : 'outline'}
        size="sm"
        onClick={handleClick}
        className="gap-2"
      >
        {existingAlert ? (
          <>
            <BellRing className="w-4 h-4" />
            התראה פעילה
          </>
        ) : (
          <>
            <Bell className="w-4 h-4" />
            עדכן אותי על הנחה
          </>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              התראת מחיר
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              נעדכן אותך כשהמחיר של <strong>{productName}</strong> יירד
            </p>

            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span>מחיר נוכחי:</span>
                <span className="font-bold">₪{currentPrice}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>עדכן אותי כשהמחיר יגיע ל:</Label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₪</span>
                <Input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(Number(e.target.value))}
                  className="pr-8"
                  max={currentPrice - 1}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                חיסכון של ₪{currentPrice - targetPrice} ({Math.round((1 - targetPrice/currentPrice) * 100)}%)
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDialog(false)}
              >
                ביטול
              </Button>
              <Button
                className="flex-1"
                onClick={() => createAlertMutation.mutate()}
                disabled={targetPrice >= currentPrice || createAlertMutation.isPending}
              >
                <BellRing className="w-4 h-4 ml-2" />
                הפעל התראה
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
