import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Loader2, ArrowLeft, Package, Sparkles, ExternalLink } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_BUSINESS_ID = "cf941cc4-e1d1-4d7c-8122-a5df81a1d53c";

interface ImportStep {
  label: string;
  status: "pending" | "active" | "done" | "error";
}

const AdminQuickImport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [steps, setSteps] = useState<ImportStep[]>([]);
  const [importedProduct, setImportedProduct] = useState<any>(null);

  const updateStep = (index: number, status: ImportStep["status"]) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, status } : s));
  };

  const handleImport = async () => {
    if (!url || !url.startsWith("http")) {
      toast({ title: "כתובת לא תקינה", description: "הזן כתובת URL מלאה של דף מוצר", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    setImportedProduct(null);
    setSteps([
      { label: "סריקת דף המוצר", status: "active" },
      { label: "חילוץ נתונים", status: "pending" },
      { label: "שמירה למאגר", status: "pending" },
    ]);

    try {
      // Step 1: Scrape
      const { data, error } = await supabase.functions.invoke("import-products-from-url", {
        body: { url, maxProducts: 1, maxPages: 1, sameDomainOnly: true },
      });

      if (error) throw new Error(error.message);
      
      updateStep(0, "done");
      updateStep(1, "active");

      if (!data?.success || !data?.data?.products?.length) {
        updateStep(1, "error");
        toast({ title: "לא נמצא מוצר", description: "נסה קישור אחר לדף מוצר ספציפי", variant: "destructive" });
        setIsImporting(false);
        return;
      }

      const scraped = data.data.products[0];
      updateStep(1, "done");
      updateStep(2, "active");

      // Step 2: Save to business_products
      const productData = {
        business_id: DEFAULT_BUSINESS_ID,
        name: scraped.title || "מוצר ללא שם",
        description: scraped.description || null,
        price: scraped.basePrice || scraped.salePrice || 0,
        original_price: scraped.basePrice && scraped.salePrice && scraped.salePrice < scraped.basePrice 
          ? scraped.basePrice : null,
        sale_price: scraped.salePrice || null,
        image_url: scraped.images?.[0] || "/placeholder.svg",
        images: scraped.images || [],
        sku: scraped.sku || null,
        source_url: scraped.source_url || url,
        category: detectCategory(scraped),
        in_stock: true,
        pet_type: scraped.petType || "all",
      };

      // Validate required fields
      if (!productData.name.trim()) {
        updateStep(2, "error");
        toast({ title: "שם המוצר חסר", description: "הסריקה לא הצליחה לחלץ שם מוצר", variant: "destructive" });
        setIsImporting(false);
        return;
      }
      if (productData.price <= 0) {
        // Try to use any available price
        productData.price = scraped.salePrice || scraped.basePrice || 1;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("business_products")
        .insert(productData)
        .select("id, name, price, image_url")
        .single();

      if (insertError) throw insertError;

      // Step 3: Save feeding guide if available
      if (scraped.feedingGuide?.length > 0 && inserted?.id) {
        const guidelines = scraped.feedingGuide.map((fg: any) => ({
          product_id: inserted.id,
          weight_min_kg: parseWeightMin(fg.range),
          weight_max_kg: parseWeightMax(fg.range),
          grams_per_day_min: parseGramsMin(fg.amount),
          grams_per_day_max: parseGramsMax(fg.amount),
          notes: `${fg.range} → ${fg.amount}`,
        })).filter((g: any) => g.weight_min_kg != null);

        if (guidelines.length > 0) {
          await supabase.from("product_feeding_guidelines").insert(guidelines);
        }
      }

      updateStep(2, "done");
      setImportedProduct(inserted);

      toast({ title: "המוצר יובא בהצלחה! 🎉", description: `${inserted.name} נשמר במאגר` });

    } catch (err: any) {
      console.error("Import failed:", err);
      toast({ title: "שגיאה בייבוא", description: err.message || "נסה שוב", variant: "destructive" });
      setSteps(prev => prev.map(s => s.status === "active" ? { ...s, status: "error" } : s));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AdminLayout title="ייבוא מהיר" icon={Globe} breadcrumbs={[{ label: "מוצרים", href: "/admin/products" }, { label: "ייבוא מהיר" }]}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* URL Input */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-center space-y-2 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Globe className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">ייבוא מוצר מ-URL</h2>
              <p className="text-sm text-muted-foreground">הדבק קישור לדף מוצר ונחלץ את כל הנתונים אוטומטית</p>
            </div>

            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.kenhatuki.co.il/product/..."
                dir="ltr"
                className="text-left"
                disabled={isImporting}
                onKeyDown={(e) => e.key === "Enter" && handleImport()}
              />
              <Button onClick={handleImport} disabled={isImporting || !url} className="gap-2 shrink-0">
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                ייבא מוצר
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Progress Steps */}
        <AnimatePresence>
          {steps.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-6 space-y-3">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                        step.status === "done" ? "bg-emerald-500 text-white" :
                        step.status === "active" ? "bg-primary text-primary-foreground animate-pulse" :
                        step.status === "error" ? "bg-destructive text-destructive-foreground" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {step.status === "done" ? "✓" : step.status === "error" ? "✗" : i + 1}
                      </div>
                      <span className={`text-sm ${step.status === "done" ? "text-emerald-600 font-medium" : step.status === "active" ? "font-medium" : "text-muted-foreground"}`}>
                        {step.label}
                      </span>
                      {step.status === "active" && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result Card */}
        <AnimatePresence>
          {importedProduct && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-emerald-200 bg-emerald-50/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-white border">
                      <img src={importedProduct.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Badge className="bg-emerald-500 mb-2">נשמר בהצלחה</Badge>
                      <h3 className="font-bold truncate">{importedProduct.name}</h3>
                      <p className="text-sm text-muted-foreground">₪{importedProduct.price}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={() => navigate(`/product/${importedProduct.id}`)} className="flex-1 gap-2">
                      <ExternalLink className="w-4 h-4" />
                      צפה במוצר
                    </Button>
                    <Button variant="outline" onClick={() => { setUrl(""); setSteps([]); setImportedProduct(null); }} className="gap-2">
                      <Package className="w-4 h-4" />
                      ייבא עוד
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

// --- Utility helpers ---

function detectCategory(scraped: any): string | null {
  const text = `${scraped.title || ""} ${scraped.description || ""} ${scraped.source_url || ""}`.toLowerCase();
  try { const decoded = decodeURIComponent(text); if (decoded !== text) return detectFromText(decoded); } catch {}
  return detectFromText(text);
}

function detectFromText(text: string): string | null {
  if (/מזון יבש|dry.?food|kibble/.test(text)) return "dry-food";
  if (/מזון רטוב|wet.?food|can/.test(text)) return "wet-food";
  if (/חטיף|treat|snack/.test(text)) return "treats";
  if (/צעצוע|toy/.test(text)) return "toys";
  if (/טיפוח|grooming|שמפו/.test(text)) return "grooming";
  if (/בריאות|health|vitamin/.test(text)) return "health";
  if (/מזון|food/.test(text)) return "food";
  return null;
}

function parseWeightMin(range: string): number | null {
  const match = range.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

function parseWeightMax(range: string): number | null {
  const matches = range.match(/(\d+(?:\.\d+)?)/g);
  return matches && matches.length >= 2 ? parseFloat(matches[1]) : parseWeightMin(range);
}

function parseGramsMin(amount: string): number | null {
  const match = amount.match(/(\d+(?:\.\d+)?)/);
  return match ? Math.round(parseFloat(match[1])) : null;
}

function parseGramsMax(amount: string): number | null {
  const matches = amount.match(/(\d+(?:\.\d+)?)/g);
  return matches && matches.length >= 2 ? Math.round(parseFloat(matches[1])) : parseGramsMin(amount);
}

export default AdminQuickImport;
