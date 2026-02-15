import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link2, Download, CheckCircle2, AlertCircle, Loader2, ExternalLink, Package, RotateCcw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_BUSINESS_ID = "cf941cc4-e1d1-4d7c-8122-a5df81a1e53c";

type Status = "idle" | "loading" | "success" | "error";

const AdminQuickImport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [importedProduct, setImportedProduct] = useState<any>(null);

  const handleImport = async () => {
    if (!url || !url.startsWith("http")) {
      toast({ title: "כתובת לא תקינה", description: "הזן כתובת URL מלאה של דף מוצר", variant: "destructive" });
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    setImportedProduct(null);

    try {
      // Step 1: Scrape the product page
      const { data, error } = await supabase.functions.invoke("import-products-from-url", {
        body: { url, maxProducts: 1, maxPages: 1, sameDomainOnly: true },
      });

      if (error) throw new Error(error.message);

      if (!data?.success || !data?.data?.products?.length) {
        setStatus("error");
        setErrorMessage("לא נמצא מוצר בקישור. וודא שזה דף מוצר ספציפי.");
        return;
      }

      const scraped = data.data.products[0];

      // Step 2: Save to business_products
      const productData: any = {
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
        brand: scraped.brand || null,
        ingredients: scraped.ingredients || null,
        benefits: scraped.benefits || [],
        feeding_guide: scraped.feedingGuide || [],
        product_attributes: scraped.productAttributes || {},
        life_stage: scraped.lifeStage || null,
        dog_size: scraped.dogSize || null,
        special_diet: scraped.specialDiet || [],
      };

      if (!productData.name.trim()) {
        setStatus("error");
        setErrorMessage("הסריקה לא הצליחה לחלץ שם מוצר.");
        return;
      }
      if (productData.price <= 0) {
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
        const guidelines = scraped.feedingGuide
          .map((fg: any) => ({
            product_id: inserted.id,
            weight_min_kg: parseWeightMin(fg.range),
            weight_max_kg: parseWeightMax(fg.range),
            grams_per_day_min: parseGramsMin(fg.amount),
            grams_per_day_max: parseGramsMax(fg.amount),
            notes: `${fg.range} → ${fg.amount}`,
          }))
          .filter((g: any) => g.weight_min_kg != null);

        if (guidelines.length > 0) {
          await supabase.from("product_feeding_guidelines").insert(guidelines);
        }
      }

      setImportedProduct(inserted);
      setStatus("success");
      toast({ title: "המוצר נשמר בהצלחה!", description: inserted.name });

    } catch (err: any) {
      console.error("Import failed:", err);
      setStatus("error");
      setErrorMessage(err.message || "שגיאה בייבוא הנתונים. נסה שוב.");
    }
  };

  const handleReset = () => {
    setUrl("");
    setStatus("idle");
    setErrorMessage("");
    setImportedProduct(null);
  };

  return (
    <AdminLayout title="מייבא מוצרים" icon={Download} breadcrumbs={[{ label: "מוצרים", href: "/admin/products" }, { label: "ייבוא מהיר" }]}>
      <div className="max-w-2xl mx-auto">
        <div className="p-8 bg-card rounded-2xl shadow-xl border border-border">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary rounded-lg text-primary-foreground">
              <Download size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">מייבא המוצרים של PetID</h2>
              <p className="text-muted-foreground text-sm">הדבק קישור מהספק כדי ליצור דף מוצר אוטומטי</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* URL Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="https://ken-hatuki.co.il/product/..."
                className="w-full p-4 pr-12 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none transition-all text-left"
                dir="ltr"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && status !== "loading" && handleImport()}
                disabled={status === "loading"}
              />
              <Link2 className="absolute right-4 top-4 text-muted-foreground" size={20} />
            </div>

            {/* Import Button */}
            <button
              onClick={handleImport}
              disabled={status === "loading" || !url}
              className={`w-full py-4 rounded-xl font-bold text-primary-foreground transition-all flex items-center justify-center gap-2 ${
                status === "loading" || !url
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90 shadow-lg"
              }`}
            >
              {status === "loading" ? (
                <><Loader2 className="animate-spin" size={20} /> מעבד נתונים...</>
              ) : (
                "ייבא מוצר למערכת"
              )}
            </button>

            {/* Status Messages */}
            <AnimatePresence mode="wait">
              {status === "success" && importedProduct && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 size={20} />
                    <span className="font-medium">המוצר נשמר בהצלחה! התבנית עודכנה.</span>
                  </div>

                  {/* Product Preview */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl border border-border">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-background border border-border shrink-0">
                      <img src={importedProduct.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{importedProduct.name}</p>
                      <p className="text-sm text-muted-foreground">₪{importedProduct.price}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => navigate(`/product/${importedProduct.id}`)}
                      className="flex-1 gap-2"
                    >
                      <ExternalLink size={16} />
                      צפה בדף המוצר
                    </Button>
                    <Button variant="outline" onClick={handleReset} className="gap-2">
                      <RotateCcw size={16} />
                      ייבא עוד
                    </Button>
                  </div>
                </motion.div>
              )}

              {status === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20"
                >
                  <AlertCircle size={20} />
                  <span>{errorMessage || "שגיאה בייבוא הנתונים. וודא שהקישור תקין."}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

// --- Utility helpers ---

function detectCategory(scraped: any): string | null {
  const text = `${scraped.title || ""} ${scraped.description || ""} ${scraped.source_url || ""}`.toLowerCase();
  try {
    const decoded = decodeURIComponent(text);
    if (decoded !== text) return detectFromText(decoded);
  } catch {}
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
