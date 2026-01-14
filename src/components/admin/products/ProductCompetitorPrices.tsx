import { useState } from "react";
import { 
  Globe, 
  RefreshCw, 
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProductCompetitorPricesProps {
  productName: string;
  currentPrice: number;
  category?: string;
}

interface CompetitorPrice {
  competitor: string;
  logo: string;
  price: number;
  originalPrice: number | null;
  inStock: boolean;
  lastChecked: string;
  url: string;
}

interface CompetitorData {
  productName: string;
  competitors: CompetitorPrice[];
  marketAnalysis: {
    averagePrice: number;
    lowestPrice: number;
    highestPrice: number;
    priceSpread: number;
  };
  recommendations: string[];
  lastUpdated: string;
}

export function ProductCompetitorPrices({ productName, currentPrice, category }: ProductCompetitorPricesProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CompetitorData | null>(null);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('product-competitor-prices', {
        body: { productName, category }
      });
      
      if (error) throw error;
      setData(result);
    } catch (err) {
      console.error('Error fetching competitor prices:', err);
      toast.error('שגיאה בטעינת מחירי מתחרים');
    } finally {
      setLoading(false);
    }
  };

  const getPricePosition = (avgPrice: number) => {
    const diff = ((currentPrice - avgPrice) / avgPrice) * 100;
    if (diff > 10) return { label: 'יקר מהשוק', icon: <TrendingUp className="h-4 w-4 text-red-500" />, color: 'text-red-600' };
    if (diff < -10) return { label: 'זול מהשוק', icon: <TrendingDown className="h-4 w-4 text-green-500" />, color: 'text-green-600' };
    return { label: 'מחיר שוק', icon: <Minus className="h-4 w-4 text-gray-500" />, color: 'text-gray-600' };
  };

  if (!data && !loading) {
    return (
      <Button variant="outline" size="sm" onClick={fetchPrices} className="gap-2">
        <Globe className="h-4 w-4" />
        השווה מחירים
      </Button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm">בודק מחירים...</span>
      </div>
    );
  }

  const position = getPricePosition(data!.marketAnalysis.averagePrice);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            השוואת מחירים
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchPrices}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price Position */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            {position.icon}
            <span className={`font-medium ${position.color}`}>{position.label}</span>
          </div>
          <div className="text-left">
            <p className="font-bold">₪{currentPrice}</p>
            <p className="text-xs text-muted-foreground">המחיר שלך</p>
          </div>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded bg-green-50 dark:bg-green-900/20">
            <p className="font-bold text-green-700">₪{data!.marketAnalysis.lowestPrice}</p>
            <p className="text-xs text-muted-foreground">הזול</p>
          </div>
          <div className="p-2 rounded bg-blue-50 dark:bg-blue-900/20">
            <p className="font-bold text-blue-700">₪{data!.marketAnalysis.averagePrice}</p>
            <p className="text-xs text-muted-foreground">ממוצע</p>
          </div>
          <div className="p-2 rounded bg-red-50 dark:bg-red-900/20">
            <p className="font-bold text-red-700">₪{data!.marketAnalysis.highestPrice}</p>
            <p className="text-xs text-muted-foreground">הגבוה</p>
          </div>
        </div>

        {/* Competitor List */}
        <div className="space-y-2">
          {data!.competitors.map((comp, i) => (
            <div 
              key={i} 
              className="flex items-center justify-between p-2 rounded border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{comp.logo}</span>
                <div>
                  <p className="font-medium text-sm">{comp.competitor}</p>
                  <p className="text-xs text-muted-foreground">
                    {comp.inStock ? '✓ במלאי' : '✗ אזל'}
                  </p>
                </div>
              </div>
              <div className="text-left">
                <p className="font-bold">₪{comp.price}</p>
                {comp.originalPrice && (
                  <p className="text-xs text-muted-foreground line-through">
                    ₪{comp.originalPrice}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        <div className="space-y-1 pt-2 border-t">
          {data!.recommendations.map((rec, i) => (
            <p key={i} className="text-xs text-muted-foreground">{rec}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
