import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  FlaskConical, TrendingDown, AlertTriangle, Package,
  Scale, Clock, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * NRC 2006 daily caloric needs (kcal/day) approximation for adult dogs:
 * MER = 110 * (bodyWeight_kg ^ 0.75) for active dogs
 * This is used to estimate daily food consumption.
 */
function estimateDailyIntakeKg(petWeightKg: number, kcalPerKg: number): number {
  if (!petWeightKg || !kcalPerKg || kcalPerKg <= 0) return 0;
  const mer = 110 * Math.pow(petWeightKg, 0.75); // NRC 2006 MER for active dogs
  return mer / kcalPerKg; // kg of food per day
}

function estimateDepletionDays(productWeightKg: number, dailyIntakeKg: number): number {
  if (!dailyIntakeKg || dailyIntakeKg <= 0) return Infinity;
  return Math.floor(productWeightKg / dailyIntakeKg);
}

const AdminInventoryPredictions = () => {
  // Get food products with kcal data
  const { data: foodProducts = [] } = useQuery({
    queryKey: ["food-products-nrc"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("business_products")
        .select("id, name, image_url, brand, category, kcal_per_kg, price, in_stock, weight_unit, product_attributes")
        .not("kcal_per_kg", "is", null) as any);
      if (error) throw error;
      return data || [];
    },
  });

  // Get pets with weight data for demand estimation
  const { data: pets = [] } = useQuery({
    queryKey: ["pets-weight-data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pets")
        .select("id, name, breed, weight, pet_type");
      if (error) throw error;
      return data || [];
    },
  });

  // Build predictions
  const predictions = foodProducts.map((product: any) => {
    // Get average pet weight from all registered pets
    const dogPets = pets.filter((p: any) => p.pet_type === "dog" && p.weight);
    const avgWeight = dogPets.length > 0
      ? dogPets.reduce((sum: number, p: any) => sum + (p.weight || 0), 0) / dogPets.length
      : 15; // default 15kg if no data

    const productWeightKg = parseFloat(product.weight_unit) || 10; // default 10kg bag
    const dailyIntake = estimateDailyIntakeKg(avgWeight, product.kcal_per_kg);
    const depletionDays = estimateDepletionDays(productWeightKg, dailyIntake);
    const dailyIntakeGrams = Math.round(dailyIntake * 1000);

    // Demand level based on how many pets match
    const matchingPets = dogPets.length;
    const estimatedMonthlyBags = matchingPets > 0 ? Math.ceil((matchingPets * dailyIntake * 30) / productWeightKg) : 0;

    return {
      ...product,
      avgPetWeight: Math.round(avgWeight * 10) / 10,
      dailyIntakeGrams,
      depletionDays,
      matchingPets,
      estimatedMonthlyBags,
      urgency: depletionDays < 14 ? "critical" : depletionDays < 30 ? "warning" : "ok",
    };
  }).sort((a: any, b: any) => a.depletionDays - b.depletionDays);

  const criticalCount = predictions.filter((p: any) => p.urgency === "critical").length;
  const warningCount = predictions.filter((p: any) => p.urgency === "warning").length;

  return (
    <AdminLayout title="Inventory Bot — NRC 2006 Predictions" icon={FlaskConical}>
      <div className="space-y-6">
        {/* NRC Info Banner */}
        <Card className="p-4 bg-indigo-500/5 border-indigo-500/20">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-6 h-6 text-indigo-500" />
            <div>
              <p className="text-sm font-medium">מנוע חיזוי מבוסס NRC 2006</p>
              <p className="text-xs text-muted-foreground">
                חישוב צריכה יומית: MER = 110 × (משקל^0.75) kcal/יום — מחולק לפי kcal/kg של המוצר
              </p>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">מוצרי מזון עם נתונים</p>
                <p className="text-2xl font-bold">{foodProducts.length}</p>
              </div>
              <Package className="w-8 h-8 text-muted-foreground/40" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">חיות רשומות</p>
                <p className="text-2xl font-bold">{pets.filter((p: any) => p.weight).length}</p>
              </div>
              <Scale className="w-8 h-8 text-muted-foreground/40" />
            </div>
          </Card>
          <Card className="p-4 border-red-500/30 bg-red-500/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">קריטי (&lt;14 יום)</p>
                <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500/40" />
            </div>
          </Card>
          <Card className="p-4 border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">אזהרה (&lt;30 יום)</p>
                <p className="text-2xl font-bold text-amber-600">{warningCount}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500/40" />
            </div>
          </Card>
        </div>

        {/* Predictions Table */}
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="w-5 h-5" />
              חיזוי אזילת מלאי
            </CardTitle>
          </CardHeader>

          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_100px_100px_80px_80px] gap-3 p-3 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
            <span>מוצר</span>
            <span>kcal/kg</span>
            <span>צריכה/יום</span>
            <span>ימים לאזילה</span>
            <span>ביקוש/חודש</span>
            <span>סטטוס</span>
          </div>

          <ScrollArea className="h-[calc(100vh-480px)]">
            <div className="divide-y">
              {predictions.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>אין מוצרי מזון עם נתוני קלוריות</p>
                  <p className="text-xs mt-1">הוסף kcal_per_kg למוצרים כדי להפעיל חיזוי</p>
                </div>
              ) : (
                predictions.map((product: any) => (
                  <div
                    key={product.id}
                    className={cn(
                      "grid grid-cols-[1fr_100px_100px_100px_80px_80px] gap-3 p-3 items-center hover:bg-muted/30 transition-colors",
                      product.urgency === "critical" && "bg-red-500/5",
                      product.urgency === "warning" && "bg-amber-500/5"
                    )}
                  >
                    {/* Product */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                        {product.image_url && (
                          <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-[10px] text-muted-foreground">{product.brand}</p>
                      </div>
                    </div>

                    {/* kcal/kg */}
                    <span className="text-sm font-mono">{product.kcal_per_kg?.toLocaleString()}</span>

                    {/* Daily Intake */}
                    <span className="text-sm">{product.dailyIntakeGrams}g/יום</span>

                    {/* Depletion Days */}
                    <span className={cn(
                      "text-sm font-bold",
                      product.urgency === "critical" ? "text-red-600" :
                      product.urgency === "warning" ? "text-amber-600" : "text-emerald-600"
                    )}>
                      {product.depletionDays === Infinity ? "∞" : `${product.depletionDays} ימים`}
                    </span>

                    {/* Monthly Bags */}
                    <span className="text-sm">{product.estimatedMonthlyBags} שקיות</span>

                    {/* Status */}
                    <Badge className={cn(
                      "text-[10px] justify-center",
                      product.urgency === "critical"
                        ? "bg-red-500/10 text-red-600 border-red-200"
                        : product.urgency === "warning"
                        ? "bg-amber-500/10 text-amber-600 border-amber-200"
                        : "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                    )}>
                      {product.urgency === "critical" ? "קריטי" : product.urgency === "warning" ? "אזהרה" : "תקין"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* NRC Formula Explanation */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            <FlaskConical className="w-4 h-4" />
            נוסחת NRC 2006
          </h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• <span className="font-mono">MER = 110 × BW^0.75</span> — צריכת אנרגיה יומית (kcal) לכלב פעיל</p>
            <p>• <span className="font-mono">צריכה יומית = MER ÷ kcal/kg</span> — כמות מזון יומית בגרמים</p>
            <p>• <span className="font-mono">ימים לאזילה = משקל שקית ÷ צריכה יומית</span></p>
            <p>• משקל ממוצע של חיות רשומות: <span className="font-bold">{pets.filter((p: any) => p.pet_type === "dog" && p.weight).length > 0
              ? `${Math.round((pets.filter((p: any) => p.pet_type === "dog" && p.weight).reduce((s: number, p: any) => s + p.weight, 0) / pets.filter((p: any) => p.pet_type === "dog" && p.weight).length) * 10) / 10} ק"ג`
              : "אין נתונים"}</span></p>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminInventoryPredictions;
