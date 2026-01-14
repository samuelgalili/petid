import { useState } from "react";
import { Plus, Trash2, TrendingDown, TrendingUp, Minus, ExternalLink, Settings2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Competitor {
  id: string;
  name: string;
  domain: string;
  logo_emoji: string;
  is_active: boolean;
}

interface CompetitorPrice {
  competitor: string;
  logo: string;
  price: number;
  originalPrice?: number | null;
  inStock: boolean;
  url: string;
}

interface MarketAnalysis {
  averagePrice: number;
  lowestPrice: number;
  highestPrice: number;
  priceSpread: number;
}

interface CompetitorPriceManagerProps {
  productName: string;
  currentPrice?: number;
  sku?: string;
  onPriceSelect?: (price: number) => void;
}

export function CompetitorPriceManager({ 
  productName, 
  currentPrice, 
  sku,
  onPriceSelect 
}: CompetitorPriceManagerProps) {
  const queryClient = useQueryClient();
  const [showManager, setShowManager] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({ name: "", domain: "", emoji: "🏪" });
  const [isChecking, setIsChecking] = useState(false);
  const [competitorPrices, setCompetitorPrices] = useState<CompetitorPrice[]>([]);
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysis | null>(null);

  // Fetch competitors
  const { data: competitors = [], isLoading } = useQuery({
    queryKey: ["price-competitors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_competitors")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data as Competitor[];
    },
  });

  // Add competitor mutation
  const addCompetitorMutation = useMutation({
    mutationFn: async (competitor: { name: string; domain: string; logo_emoji: string }) => {
      const { error } = await supabase
        .from("price_competitors")
        .insert(competitor);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-competitors"] });
      setNewCompetitor({ name: "", domain: "", emoji: "🏪" });
      toast.success("מתחרה נוסף בהצלחה");
    },
    onError: (error: any) => {
      toast.error(error.message || "שגיאה בהוספת מתחרה");
    },
  });

  // Delete competitor mutation
  const deleteCompetitorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("price_competitors")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-competitors"] });
      toast.success("מתחרה הוסר");
    },
  });

  // Check competitor prices
  const checkPrices = async () => {
    if (!productName) {
      toast.error("הזן שם מוצר לפני בדיקת מחירים");
      return;
    }

    setIsChecking(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("product-competitor-prices", {
        body: { 
          productName, 
          sku,
          competitors: competitors.map(c => ({
            name: c.name,
            domain: c.domain,
            logo: c.logo_emoji,
          })),
        },
      });

      if (error) throw error;

      if (data?.competitors) {
        setCompetitorPrices(data.competitors);
        setMarketAnalysis(data.marketAnalysis);
      }
    } catch (err) {
      console.error("Price check failed:", err);
      toast.error("שגיאה בבדיקת מחירים");
    } finally {
      setIsChecking(false);
    }
  };

  const handleAddCompetitor = () => {
    if (!newCompetitor.name || !newCompetitor.domain) {
      toast.error("נא למלא שם ודומיין");
      return;
    }
    addCompetitorMutation.mutate({
      name: newCompetitor.name,
      domain: newCompetitor.domain,
      logo_emoji: newCompetitor.emoji,
    });
  };

  const getPriceComparison = (competitorPrice: number) => {
    if (!currentPrice) return null;
    const diff = ((competitorPrice - currentPrice) / currentPrice) * 100;
    if (Math.abs(diff) < 1) return { type: "same", diff: 0 };
    return { type: diff > 0 ? "higher" : "lower", diff: Math.abs(diff).toFixed(0) };
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={checkPrices}
          disabled={isChecking || !productName}
          className="flex-1"
        >
          {isChecking ? (
            <Loader2 className="w-4 h-4 animate-spin ml-2" />
          ) : (
            <TrendingDown className="w-4 h-4 ml-2" />
          )}
          בדוק מחירי מתחרים
        </Button>
        
        <Popover open={showManager} onOpenChange={setShowManager}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon">
              <Settings2 className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end" dir="rtl">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">ניהול מתחרים</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  הוסף אתרים להשוואת מחירים
                </p>
              </div>
              
              {/* Existing competitors */}
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {competitors.map((comp) => (
                    <div 
                      key={comp.id} 
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span>{comp.logo_emoji}</span>
                        <span className="text-sm font-medium">{comp.name}</span>
                        <span className="text-xs text-muted-foreground">{comp.domain}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6"
                        onClick={() => deleteCompetitorMutation.mutate(comp.id)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {competitors.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      אין מתחרים מוגדרים
                    </p>
                  )}
                </div>
              </ScrollArea>
              
              {/* Add new competitor */}
              <div className="border-t pt-3 space-y-2">
                <div className="grid grid-cols-12 gap-2">
                  <Input
                    value={newCompetitor.emoji}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, emoji: e.target.value })}
                    className="col-span-2 text-center"
                    maxLength={2}
                  />
                  <Input
                    value={newCompetitor.name}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                    placeholder="שם האתר"
                    className="col-span-5"
                  />
                  <Input
                    value={newCompetitor.domain}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, domain: e.target.value })}
                    placeholder="domain.co.il"
                    className="col-span-5"
                    dir="ltr"
                  />
                </div>
                <Button 
                  type="button" 
                  size="sm" 
                  className="w-full"
                  onClick={handleAddCompetitor}
                  disabled={addCompetitorMutation.isPending}
                >
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף מתחרה
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Price Results */}
      {competitorPrices.length > 0 && (
        <div className="bg-muted/30 rounded-lg p-3 space-y-3">
          {/* Market Analysis Summary */}
          {marketAnalysis && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  ממוצע: <strong className="text-foreground">₪{marketAnalysis.averagePrice}</strong>
                </span>
                <span className="text-muted-foreground">
                  טווח: ₪{marketAnalysis.lowestPrice} - ₪{marketAnalysis.highestPrice}
                </span>
              </div>
              {currentPrice && (
                <Badge 
                  variant={currentPrice <= marketAnalysis.averagePrice ? "default" : "secondary"}
                  className="text-xs"
                >
                  {currentPrice <= marketAnalysis.lowestPrice 
                    ? "המחיר הזול ביותר! 🏆" 
                    : currentPrice <= marketAnalysis.averagePrice 
                    ? "מתחת לממוצע ✓" 
                    : "מעל הממוצע"}
                </Badge>
              )}
            </div>
          )}

          {/* Competitor list */}
          <div className="grid grid-cols-2 gap-2">
            {competitorPrices.slice(0, 4).map((comp, idx) => {
              const comparison = getPriceComparison(comp.price);
              
              return (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-2 bg-background rounded-md border text-sm"
                >
                  <a
                    href={comp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    <span>{comp.logo}</span>
                    <span className="truncate max-w-20">{comp.competitor}</span>
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onPriceSelect?.(comp.price)}
                      className="font-medium hover:text-primary cursor-pointer"
                    >
                      ₪{comp.price}
                    </button>
                    {comparison && (
                      <span className={`text-xs ${
                        comparison.type === "lower" ? "text-green-600" : 
                        comparison.type === "higher" ? "text-red-500" : 
                        "text-muted-foreground"
                      }`}>
                        {comparison.type === "lower" && <TrendingDown className="w-3 h-3 inline" />}
                        {comparison.type === "higher" && <TrendingUp className="w-3 h-3 inline" />}
                        {comparison.type === "same" && <Minus className="w-3 h-3 inline" />}
                        {Number(comparison.diff) > 0 && ` ${comparison.diff}%`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
