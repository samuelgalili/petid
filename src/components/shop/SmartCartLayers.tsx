import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import type { CartItem } from "@/contexts/CartContext";

interface SmartCartLayersProps {
  items: CartItem[];
  subtotal: number;
}

export const SmartCartLayers = ({ items, subtotal }: SmartCartLayersProps) => {
  if (items.length === 0) return null;

  const freeShippingRemaining = Math.max(0, 199 - subtotal);

  return (
    <div className="space-y-3" dir="rtl">
      <Card className="p-3.5 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.6} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <p className="text-xs font-bold text-foreground">בדיקת עגלה</p>
              <Badge variant="secondary" className="text-[10px]">AWS</Badge>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              יש בעגלה {items.length} פריטים. לפני התשלום ודאו שהמוצרים מתאימים לגיל, משקל ורגישויות של חיית המחמד.
            </p>
          </div>
        </div>
      </Card>

      {freeShippingRemaining > 0 ? (
        <Card className="p-3.5 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-amber-600" />
            <p className="text-xs text-muted-foreground">
              חסרים ₪{freeShippingRemaining.toFixed(0)} למשלוח חינם.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="p-3.5 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-5 w-5 text-emerald-600" />
            <p className="text-xs text-muted-foreground">העגלה זכאית למשלוח חינם.</p>
          </div>
        </Card>
      )}
    </div>
  );
};
