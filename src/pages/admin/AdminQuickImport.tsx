import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Link2, Download, CheckCircle2, AlertCircle, Loader2, ExternalLink,
  RotateCcw, Pencil, Save, Eye, Sparkles, Package, List, Utensils, Heart
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_BUSINESS_ID = "cf941cc4-e1d1-4d7c-8122-a5df81a1e53c";

type Stage = "input" | "loading" | "preview" | "publishing" | "success" | "error";

interface ScrapedData {
  name: string;
  price: number;
  original_price: number | null;
  sale_price: number | null;
  description: string;
  image_url: string;
  images: string[];
  sku: string;
  source_url: string;
  category: string | null;
  pet_type: string;
  brand: string;
  ingredients: string;
  benefits: any[];
  feeding_guide: any[];
  product_attributes: any;
  life_stage: string;
  dog_size: string;
  special_diet: string[];
  variants: any[];
}

const AdminQuickImport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [errorMessage, setErrorMessage] = useState("");
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [editData, setEditData] = useState<ScrapedData | null>(null);
  const [publishedProduct, setPublishedProduct] = useState<any>(null);

  // ── Scrape ──
  const handleScrape = async () => {
    if (!url || !url.startsWith("http")) {
      toast({ title: "כתובת לא תקינה", description: "הזן כתובת URL מלאה", variant: "destructive" });
      return;
    }

    setStage("loading");
    setErrorMessage("");

    try {
      // Use smart scraper: Firecrawl + AI extraction
      const { data, error } = await supabase.functions.invoke("smart-scrape-product", {
        body: { url },
      });

      if (error) throw new Error(error.message);
      if (!data?.success || !data?.data) {
        setStage("error");
        setErrorMessage(data?.error || "לא נמצא מוצר בקישור. וודא שזה דף מוצר ספציפי.");
        return;
      }

      const s = data.data;
      const parsed: ScrapedData = {
        name: s.name || "",
        price: s.price || 0,
        original_price: s.original_price || null,
        sale_price: s.sale_price || null,
        description: s.description || "",
        image_url: s.image_url || "/placeholder.svg",
        images: s.images || [],
        sku: s.sku || "",
        source_url: s.source_url || url,
        category: s.category || null,
        pet_type: s.pet_type || "all",
        brand: s.brand || "",
        ingredients: s.ingredients || "",
        benefits: s.benefits || [],
        feeding_guide: s.feeding_guide || [],
        product_attributes: s.product_attributes || {},
        life_stage: s.life_stage || "",
        dog_size: s.dog_size || "",
        special_diet: s.special_diet || [],
        variants: [],
      };

      setScrapedData(parsed);
      setEditData({ ...parsed });
      setStage("preview");
    } catch (err: any) {
      console.error("Scrape failed:", err);
      setStage("error");
      setErrorMessage(err.message || "שגיאה בסריקת הקישור.");
    }
  };

  // ── Publish ──
  const handlePublish = async () => {
    if (!editData) return;
    setStage("publishing");

    try {
      const productData: any = {
        business_id: DEFAULT_BUSINESS_ID,
        name: editData.name || "מוצר ללא שם",
        description: editData.description || null,
        price: editData.price || 1,
        original_price: editData.original_price,
        sale_price: editData.sale_price,
        image_url: editData.image_url,
        images: editData.images,
        sku: editData.sku || null,
        source_url: editData.source_url,
        category: editData.category,
        in_stock: true,
        pet_type: editData.pet_type || "all",
        brand: editData.brand || null,
        ingredients: editData.ingredients || null,
        benefits: editData.benefits,
        feeding_guide: editData.feeding_guide,
        product_attributes: editData.product_attributes,
        life_stage: editData.life_stage || null,
        dog_size: editData.dog_size || null,
        special_diet: editData.special_diet,
      };

      const { data: inserted, error: insertError } = await supabase
        .from("business_products")
        .insert(productData)
        .select("id, name, price, image_url")
        .single();

      if (insertError) throw insertError;

      // Save feeding guidelines
      if (editData.feeding_guide?.length > 0 && inserted?.id) {
        const guidelines = editData.feeding_guide
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

      // Save variants
      if (editData.variants?.length > 0 && inserted?.id) {
        const variantRows = editData.variants
          .filter((v: any) => v.label?.trim())
          .map((v: any, i: number) => ({
            product_id: inserted.id,
            variant_type: v.weight ? "weight" : "size",
            label: v.label.trim(),
            value: v.label.trim(),
            weight_kg: v.weight || null,
            weight_unit: v.weight_unit || null,
            price: v.price || null,
            sale_price: v.sale_price || null,
            sku: v.sku || null,
            in_stock: true,
            display_order: i,
          }));

        if (variantRows.length > 0) {
          await supabase.from("product_variants").insert(variantRows);
        }
      }

      setPublishedProduct(inserted);
      setStage("success");
      toast({ title: "המוצר פורסם בהצלחה!", description: inserted.name });
    } catch (err: any) {
      console.error("Publish failed:", err);
      setStage("error");
      setErrorMessage(err.message || "שגיאה בשמירת המוצר.");
    }
  };

  const handleReset = () => {
    setUrl("");
    setStage("input");
    setErrorMessage("");
    setScrapedData(null);
    setEditData(null);
    setPublishedProduct(null);
  };

  const updateField = (field: keyof ScrapedData, value: any) => {
    if (!editData) return;
    setEditData({ ...editData, [field]: value });
  };

  // ── Feeding guide edit helpers ──
  const updateFeedingRow = (index: number, key: string, value: string) => {
    if (!editData) return;
    const updated = [...editData.feeding_guide];
    updated[index] = { ...updated[index], [key]: value };
    setEditData({ ...editData, feeding_guide: updated });
  };

  const removeFeedingRow = (index: number) => {
    if (!editData) return;
    setEditData({ ...editData, feeding_guide: editData.feeding_guide.filter((_, i) => i !== index) });
  };

  const addFeedingRow = () => {
    if (!editData) return;
    setEditData({ ...editData, feeding_guide: [...editData.feeding_guide, { range: "", amount: "" }] });
  };

  return (
    <AdminLayout title="סריקה וייבוא מוצר" icon={Download} breadcrumbs={[{ label: "מוצרים", href: "/admin/products" }, { label: "ייבוא מהיר" }]}>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Step 1: URL Input ── */}
        <div className="p-6 bg-card rounded-2xl shadow-lg border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary rounded-lg text-primary-foreground">
              <Download size={22} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold">מייבא מוצרים – PetID</h2>
              <p className="text-muted-foreground text-sm">הדבק קישור מהספק, סרוק, ערוך ופרסם</p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="https://ken-hatuki.co.il/product/..."
                className="w-full p-3 pr-10 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none transition-all text-left text-sm"
                dir="ltr"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && stage !== "loading" && handleScrape()}
                disabled={stage === "loading" || stage === "publishing"}
              />
              <Link2 className="absolute right-3 top-3 text-muted-foreground" size={18} />
            </div>
            <Button
              onClick={handleScrape}
              disabled={stage === "loading" || stage === "publishing" || !url}
              className="gap-2 px-6"
            >
              {stage === "loading" ? (
                <><Loader2 className="animate-spin" size={16} /> סורק...</>
              ) : (
                <><Sparkles size={16} /> סרוק וצפה</>
              )}
            </Button>
          </div>
        </div>

        {/* ── Error ── */}
        <AnimatePresence>
          {stage === "error" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20"
            >
              <AlertCircle size={20} />
              <span className="flex-1">{errorMessage}</span>
              <Button variant="outline" size="sm" onClick={handleReset}>נסה שוב</Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Step 2: Live Preview + Edit ── */}
        <AnimatePresence>
          {(stage === "preview" || stage === "publishing") && editData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Product Header Card */}
              <div className="p-6 bg-card rounded-2xl shadow-lg border border-border">
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye size={16} /> תצוגה מקדימה – ערוך לפני פרסום
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                  {/* Image */}
                  <div className="w-full md:w-48 h-48 rounded-xl overflow-hidden bg-muted border border-border shrink-0">
                    <img src={editData.image_url} alt="" className="w-full h-full object-cover" />
                  </div>

                  {/* Core Fields */}
                  <div className="flex-1 space-y-3">
                    <EditableField label="שם המוצר" value={editData.name} onChange={(v) => updateField("name", v)} />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <EditableField label="מחיר (₪)" value={String(editData.price)} onChange={(v) => updateField("price", parseFloat(v) || 0)} type="number" />
                      <EditableField label="מחיר מבצע (₪)" value={String(editData.sale_price || "")} onChange={(v) => updateField("sale_price", v ? parseFloat(v) : null)} type="number" />
                      <EditableField label="SKU" value={editData.sku} onChange={(v) => updateField("sku", v)} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <EditableField label="מותג" value={editData.brand} onChange={(v) => updateField("brand", v)} />
                      <EditableField label="קטגוריה" value={editData.category || ""} onChange={(v) => updateField("category", v)} />
                      <EditableField label="סוג חיית מחמד" value={editData.pet_type} onChange={(v) => updateField("pet_type", v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <EditableField label="שלב בחיים" value={editData.life_stage} onChange={(v) => updateField("life_stage", v)} />
                      <EditableField label="גודל כלב" value={editData.dog_size} onChange={(v) => updateField("dog_size", v)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs: Description, Ingredients, Feeding, Benefits */}
              <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
                <Tabs defaultValue="description" dir="rtl">
                  <TabsList className="w-full justify-start rounded-none border-b border-border bg-muted/30 p-0 h-auto">
                    <TabsTrigger value="description" className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3 px-4">
                      <Package size={14} /> תיאור
                    </TabsTrigger>
                    <TabsTrigger value="ingredients" className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3 px-4">
                      <List size={14} /> רכיבים
                    </TabsTrigger>
                    <TabsTrigger value="feeding" className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3 px-4">
                      <Utensils size={14} /> טבלת האכלה
                    </TabsTrigger>
                    <TabsTrigger value="benefits" className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3 px-4">
                      <Heart size={14} /> יתרונות
                    </TabsTrigger>
                  </TabsList>

                  <div className="p-5">
                    {/* Description */}
                    <TabsContent value="description" className="mt-0">
                      <textarea
                        value={editData.description}
                        onChange={(e) => updateField("description", e.target.value)}
                        className="w-full min-h-[120px] p-3 rounded-xl border border-border bg-background text-foreground text-sm resize-y focus:ring-2 focus:ring-ring focus:outline-none"
                        dir="rtl"
                      />
                    </TabsContent>

                    {/* Ingredients */}
                    <TabsContent value="ingredients" className="mt-0">
                      <textarea
                        value={editData.ingredients}
                        onChange={(e) => updateField("ingredients", e.target.value)}
                        className="w-full min-h-[120px] p-3 rounded-xl border border-border bg-background text-foreground text-sm resize-y focus:ring-2 focus:ring-ring focus:outline-none"
                        dir="rtl"
                        placeholder="רשימת רכיבים..."
                      />
                      {!editData.ingredients && (
                        <p className="text-xs text-warning mt-2 flex items-center gap-1">
                          <AlertCircle size={12} /> חסרים רכיבים – המוצר יסומן לבדיקה
                        </p>
                      )}
                    </TabsContent>

                    {/* Feeding Table */}
                    <TabsContent value="feeding" className="mt-0 space-y-3">
                      {editData.feeding_guide.length > 0 ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
                            <span>טווח משקל</span>
                            <span>כמות יומית</span>
                            <span></span>
                          </div>
                          {editData.feeding_guide.map((row: any, i: number) => (
                            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                              <Input
                                value={row.range || ""}
                                onChange={(e) => updateFeedingRow(i, "range", e.target.value)}
                                className="text-sm h-9"
                                dir="ltr"
                                placeholder="1-5 kg"
                              />
                              <Input
                                value={row.amount || ""}
                                onChange={(e) => updateFeedingRow(i, "amount", e.target.value)}
                                className="text-sm h-9"
                                dir="ltr"
                                placeholder="50-100g"
                              />
                              <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => removeFeedingRow(i)}>
                                ✕
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">לא נמצאה טבלת האכלה</p>
                      )}
                      <Button variant="outline" size="sm" onClick={addFeedingRow} className="gap-1">
                        + הוסף שורה
                      </Button>
                    </TabsContent>

                    {/* Benefits */}
                    <TabsContent value="benefits" className="mt-0">
                      <textarea
                        value={
                          Array.isArray(editData.benefits)
                            ? editData.benefits.map((b: any) => typeof b === "string" ? b : b.title || b.text || JSON.stringify(b)).join("\n")
                            : String(editData.benefits || "")
                        }
                        onChange={(e) => updateField("benefits", e.target.value.split("\n").filter(Boolean).map(t => ({ title: t })))}
                        className="w-full min-h-[100px] p-3 rounded-xl border border-border bg-background text-foreground text-sm resize-y focus:ring-2 focus:ring-ring focus:outline-none"
                        dir="rtl"
                        placeholder="יתרון אחד בכל שורה..."
                      />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              {/* Publish Bar */}
              <div className="flex items-center justify-between p-4 bg-card rounded-2xl shadow-lg border border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Pencil size={14} />
                  <span>ערוך כל שדה לפני הפרסום</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleReset} className="gap-1.5">
                    <RotateCcw size={14} /> התחל מחדש
                  </Button>
                  <Button onClick={handlePublish} disabled={stage === "publishing"} className="gap-1.5 px-6">
                    {stage === "publishing" ? (
                      <><Loader2 className="animate-spin" size={14} /> שומר...</>
                    ) : (
                      <><Save size={14} /> פרסם ב-PetID</>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Step 3: Success ── */}
        <AnimatePresence>
          {stage === "success" && publishedProduct && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 size={20} />
                <span className="font-medium">המוצר פורסם בהצלחה!</span>
              </div>

              <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted border border-border shrink-0">
                  <img src={publishedProduct.image_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{publishedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">₪{publishedProduct.price}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => navigate(`/product/${publishedProduct.id}`)} className="flex-1 gap-2">
                  <ExternalLink size={16} /> צפה בדף המוצר
                </Button>
                <Button variant="outline" onClick={handleReset} className="gap-2">
                  <RotateCcw size={16} /> ייבא עוד
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

// ── Editable Field Component ──
function EditableField({ label, value, onChange, type = "text" }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm h-9"
        dir={type === "number" ? "ltr" : "rtl"}
      />
    </div>
  );
}

// ── Utility Helpers ──
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
