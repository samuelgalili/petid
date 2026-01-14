import { useState } from "react";
import { 
  Search, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProductDuplicateCheckProps {
  productName: string;
  productId?: string;
  sku?: string;
  onSelectProduct?: (product: any) => void;
}

interface DuplicateProduct {
  id: string;
  name: string;
  sku: string | null;
  image_url: string;
  price: number;
  category: string | null;
  matchType: 'sku' | 'name' | 'similar';
  matchScore: number;
  reason: string;
}

interface DuplicateData {
  duplicates: DuplicateProduct[];
  possibleDuplicates: DuplicateProduct[];
  totalChecked: number;
  hasDuplicates: boolean;
}

export function ProductDuplicateCheck({ productName, productId, sku, onSelectProduct }: ProductDuplicateCheckProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DuplicateData | null>(null);
  const [checked, setChecked] = useState(false);

  const checkDuplicates = async () => {
    if (!productName || productName.length < 3) {
      toast.error('שם מוצר קצר מדי לבדיקה');
      return;
    }

    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('product-duplicate-check', {
        body: { productName, productId, sku }
      });
      
      if (error) throw error;
      setData(result);
      setChecked(true);
    } catch (err) {
      console.error('Error checking duplicates:', err);
      toast.error('שגיאה בבדיקת כפילויות');
    } finally {
      setLoading(false);
    }
  };

  if (!checked && !loading) {
    return (
      <Button variant="outline" size="sm" onClick={checkDuplicates} className="gap-2">
        <Search className="h-4 w-4" />
        בדוק כפילויות
      </Button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm">בודק כפילויות...</span>
      </div>
    );
  }

  if (!data?.hasDuplicates && data?.possibleDuplicates.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm">לא נמצאו כפילויות</span>
        <Button variant="ghost" size="sm" onClick={checkDuplicates}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
          <AlertTriangle className="h-4 w-4" />
          נמצאו מוצרים דומים
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Exact duplicates */}
        {data!.duplicates.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-red-600">כפילויות ודאיות:</p>
            {data!.duplicates.map((dup) => (
              <div 
                key={dup.id} 
                className="flex items-center gap-3 p-2 rounded border border-red-200 bg-white"
              >
                <img 
                  src={dup.image_url} 
                  alt={dup.name} 
                  className="w-10 h-10 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{dup.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">
                      {dup.reason}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ₪{dup.price}
                    </span>
                  </div>
                </div>
                {onSelectProduct && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onSelectProduct(dup)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Possible duplicates */}
        {data!.possibleDuplicates.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-orange-600">מוצרים דומים:</p>
            {data!.possibleDuplicates.slice(0, 3).map((dup) => (
              <div 
                key={dup.id} 
                className="flex items-center gap-3 p-2 rounded border bg-white"
              >
                <img 
                  src={dup.image_url} 
                  alt={dup.name} 
                  className="w-8 h-8 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{dup.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(dup.matchScore * 100)}% התאמה
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button variant="ghost" size="sm" onClick={checkDuplicates} className="w-full">
          <RefreshCw className="h-4 w-4 ml-2" />
          בדוק שוב
        </Button>
      </CardContent>
    </Card>
  );
}
