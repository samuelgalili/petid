import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Link2, Download, CheckCircle2, AlertCircle, Loader2, ExternalLink,
  RotateCcw, Pencil, Save, Eye, Sparkles, Package, List, Utensils, Heart,
  Search, Shield, FlaskConical, Flame, Scale, TriangleAlert, Star, Zap,
  BadgeCheck, XCircle, Info, ChevronLeft, ChevronRight, ScanBarcode,
  Plus, Trash2, AlertOctagon, Building2, Truck, ToggleLeft, ToggleRight
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const DEFAULT_BUSINESS_ID = "cf941cc4-e1d1-4d7c-8122-a5df81a1e53c";

type WizardStep = 1 | 2 | 3 | 4;
type StepStatus = "idle" | "loading" | "done" | "error";

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

interface RedFlag {
  name: string;
  he: string;
  risk: string;
  severity: "critical" | "warning" | "info";
}

interface PositiveIngredient {
  name: string;
  he: string;
  benefit: string;
}

interface IngredientAnalysis {
  verdict: "safe" | "caution" | "danger";
  qualityScore: number | null;
  confidence: number;
  redFlags: RedFlag[];
  positives: PositiveIngredient[];
  proteinSources: string[];
  fillerIngredients: string[];
  summaryHe: string | null;
  firstFiveAnalysis: string | null;
  estimatedKcalPerKg: number | null;
  kcalEstimationMethod: string | null;
  stats: {
    totalRedFlags: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    positiveCount: number;
  };
}

interface DuplicateResult {
  id: string;
  name: string;
  sku: string | null;
  image_url: string;
  price: number;
  matchType: string;
  matchScore: number;
  reason: string;
}

const STEP_LABELS = [
  { num: 1, icon: Search, label: "הצייד", desc: "סריקה וזיהוי כפילויות" },
  { num: 2, icon: FlaskConical, label: "המדען", desc: "ניתוח רכיבים וסיכונים" },
  { num: 3, icon: Flame, label: "לוגיקת האכלה", desc: "חישוב Kcal וכמויות" },
  { num: 4, icon: Package, label: "ספק ופרסום", desc: "קישור ספק, וריאנטים ושמירה" },
];

const AdminQuickImport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Wizard state
  const [step, setStep] = useState<WizardStep>(1);
  const [stepStatus, setStepStatus] = useState<Record<WizardStep, StepStatus>>({
    1: "idle", 2: "idle", 3: "idle", 4: "idle",
  });

  // Step 1: Hunter
  const [url, setUrl] = useState("");
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [editData, setEditData] = useState<ScrapedData | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateResult[]>([]);
  const [possibleDuplicates, setPossibleDuplicates] = useState<DuplicateResult[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  // Step 2: Scientist
  const [analysis, setAnalysis] = useState<IngredientAnalysis | null>(null);

  // Step 4: Publish
  const [publishedProduct, setPublishedProduct] = useState<any>(null);

  // Supplier linking
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [costPrice, setCostPrice] = useState<string>("");
  const [apiSyncEnabled, setApiSyncEnabled] = useState(false);

  // Fetch suppliers on mount
  useEffect(() => {
    supabase.from("suppliers").select("id, name, shipping_days, payment_terms, api_endpoint").eq("is_active", true).order("name").then(({ data }) => {
      if (data) setSuppliers(data);
    });
  }, []);

  const updateStatus = (s: WizardStep, status: StepStatus) => {
    setStepStatus(prev => ({ ...prev, [s]: status }));
  };

  const updateField = (field: keyof ScrapedData, value: any) => {
    if (!editData) return;
    setEditData({ ...editData, [field]: value });
  };

  // ═══════════════════════════════════════════
  // STEP 1: THE HUNTER - Scrape + Duplicate Check
  // ═══════════════════════════════════════════
  const handleScrape = async () => {
    if (!url || !url.startsWith("http")) {
      toast({ title: "כתובת לא תקינה", description: "הזן כתובת URL מלאה", variant: "destructive" });
      return;
    }

    updateStatus(1, "loading");
    setErrorMessage("");
    setDuplicates([]);
    setPossibleDuplicates([]);

    try {
      const { data, error } = await supabase.functions.invoke("smart-scrape-product", {
        body: { url },
      });

      if (error) throw new Error(error.message);
      if (!data?.success || !data?.data) {
        updateStatus(1, "error");
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
        variants: s.variants || [],
      };

      setScrapedData(parsed);
      setEditData({ ...parsed });

      // Run duplicate check in background
      if (parsed.name) {
        try {
          const { data: dupData } = await supabase.functions.invoke("product-duplicate-check", {
            body: { productName: parsed.name, sku: parsed.sku },
          });
          if (dupData) {
            setDuplicates(dupData.duplicates || []);
            setPossibleDuplicates(dupData.possibleDuplicates || []);
          }
        } catch (dupErr) {
          console.warn("Duplicate check failed:", dupErr);
        }
      }

      updateStatus(1, "done");
    } catch (err: any) {
      console.error("Scrape failed:", err);
      updateStatus(1, "error");
      setErrorMessage(err.message || "שגיאה בסריקת הקישור.");
    }
  };

  // ═══════════════════════════════════════════
  // STEP 2: THE SCIENTIST - AI Ingredient Analysis
  // ═══════════════════════════════════════════
  const runIngredientAnalysis = async () => {
    if (!editData) return;
    updateStatus(2, "loading");

    try {
      const { data, error } = await supabase.functions.invoke("analyze-product-ingredients", {
        body: {
          ingredients: editData.ingredients,
          petType: editData.pet_type,
          productName: editData.name,
          category: editData.category,
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Analysis failed");

      setAnalysis(data as IngredientAnalysis);
      updateStatus(2, "done");
    } catch (err: any) {
      console.error("Analysis failed:", err);
      updateStatus(2, "error");
      toast({ title: "שגיאה בניתוח", description: err.message, variant: "destructive" });
    }
  };

  // ═══════════════════════════════════════════
  // STEP 4: PUBLISH
  // ═══════════════════════════════════════════
  const handlePublish = async () => {
    if (!editData) return;
    updateStatus(4, "loading");

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
        supplier_id: selectedSupplierId || null,
        cost_price: costPrice ? parseFloat(costPrice) : null,
        safety_score: analysis?.qualityScore || null,
        kcal_per_kg: analysis?.estimatedKcalPerKg || null,
        api_sync_enabled: apiSyncEnabled,
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
      updateStatus(4, "done");
      toast({ title: "המוצר פורסם בהצלחה!", description: inserted.name });
    } catch (err: any) {
      console.error("Publish failed:", err);
      updateStatus(4, "error");
      setErrorMessage(err.message || "שגיאה בשמירת המוצר.");
    }
  };

  const handleReset = () => {
    setUrl("");
    setStep(1);
    setStepStatus({ 1: "idle", 2: "idle", 3: "idle", 4: "idle" });
    setErrorMessage("");
    setScrapedData(null);
    setEditData(null);
    setDuplicates([]);
    setPossibleDuplicates([]);
    setAnalysis(null);
    setPublishedProduct(null);
    setSelectedSupplierId("");
    setCostPrice("");
    setApiSyncEnabled(false);
  };

  const goToStep = (s: WizardStep) => {
    if (s === 2 && !editData) return;
    if (s === 3 && !editData) return;
    if (s === 4 && !editData) return;
    setStep(s);
  };

  // Feeding guide helpers
  const updateFeedingRow = (index: number, key: string, value: string) => {
    if (!editData) return;
    const updated = [...editData.feeding_guide];
    updated[index] = { ...updated[index], [key]: value };
    setEditData({ ...editData, feeding_guide: updated });
  };

  const removeFeedingRow = (index: number) => {
    if (!editData) return;
    setEditData({ ...editData, feeding_guide: editData.feeding_guide.filter((_: any, i: number) => i !== index) });
  };

  const addFeedingRow = () => {
    if (!editData) return;
    setEditData({ ...editData, feeding_guide: [...editData.feeding_guide, { range: "", amount: "" }] });
  };

  // Variant helpers
  const addVariant = () => {
    if (!editData) return;
    setEditData({ ...editData, variants: [...editData.variants, { label: "", weight: null, weight_unit: "kg", price: null, sku: "" }] });
  };

  const updateVariant = (index: number, key: string, value: any) => {
    if (!editData) return;
    const updated = [...editData.variants];
    updated[index] = { ...updated[index], [key]: value };
    setEditData({ ...editData, variants: updated });
  };

  const removeVariant = (index: number) => {
    if (!editData) return;
    setEditData({ ...editData, variants: editData.variants.filter((_: any, i: number) => i !== index) });
  };

  const progressPct = ((step - 1) / 3) * 100;

  return (
    <AdminLayout title="אשף ייבוא מוצר" icon={Download} breadcrumbs={[{ label: "מוצרים", href: "/admin/products" }, { label: "ייבוא מהיר" }]}>
      <div className="max-w-5xl mx-auto space-y-6" dir="rtl">

        {/* ═══ Progress Bar + Steps ═══ */}
        <div className="p-5 bg-card rounded-2xl shadow-lg border border-border">
          <div className="flex items-center justify-between mb-4">
            {STEP_LABELS.map((s, i) => {
              const Icon = s.icon;
              const isActive = step === s.num;
              const isDone = stepStatus[s.num as WizardStep] === "done";
              const isError = stepStatus[s.num as WizardStep] === "error";
              return (
                <button
                  key={s.num}
                  onClick={() => goToStep(s.num as WizardStep)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-sm font-bold ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : isDone
                        ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                        : isError
                          ? "bg-destructive/10 text-destructive"
                          : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {isDone ? <CheckCircle2 size={18} /> : isError ? <XCircle size={18} /> : <Icon size={18} />}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              );
            })}
          </div>
          <Progress value={progressPct} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {STEP_LABELS[step - 1].desc}
          </p>
        </div>

        {/* ═══ STEP 1: THE HUNTER ═══ */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* URL / Barcode Input Card */}
              <div className="p-6 bg-card rounded-2xl shadow-lg border border-border">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-3 bg-primary rounded-xl text-primary-foreground">
                    <Search size={24} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold">שלב 1: הצייד</h2>
                    <p className="text-muted-foreground text-base">הדבק קישור או ברקוד – נביא לך את כל הנתונים</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="https://store.co.il/product/... או ברקוד"
                      className="w-full p-4 pr-12 rounded-xl border-2 border-border bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-primary focus:outline-none transition-all text-left text-base font-medium"
                      dir="ltr"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && stepStatus[1] !== "loading" && handleScrape()}
                      disabled={stepStatus[1] === "loading"}
                    />
                    <ScanBarcode className="absolute right-4 top-4 text-muted-foreground" size={20} />
                  </div>
                  <Button
                    onClick={handleScrape}
                    disabled={stepStatus[1] === "loading" || !url}
                    size="lg"
                    className="gap-2 px-8 text-base font-bold"
                  >
                    {stepStatus[1] === "loading" ? (
                      <><Loader2 className="animate-spin" size={18} /> סורק...</>
                    ) : (
                      <><Sparkles size={18} /> סרוק ונתח</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Error */}
              {stepStatus[1] === "error" && (
                <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20">
                  <AlertCircle size={22} />
                  <span className="flex-1 text-base font-semibold">{errorMessage}</span>
                  <Button variant="outline" size="sm" onClick={handleReset}>נסה שוב</Button>
                </div>
              )}

              {/* Duplicate Alert */}
              {duplicates.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-destructive/10 rounded-xl border-2 border-destructive/30">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertOctagon size={22} className="text-destructive" />
                    <span className="text-lg font-extrabold text-destructive">⚠️ מוצר דומה נמצא במערכת!</span>
                  </div>
                  {duplicates.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 p-3 bg-background rounded-lg mb-2 border border-border">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                        <img src={d.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base truncate">{d.name}</p>
                        <p className="text-sm text-muted-foreground">₪{d.price} • {d.reason}</p>
                      </div>
                      <span className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded-lg font-bold">
                        {Math.round(d.matchScore * 100)}%
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}

              {possibleDuplicates.length > 0 && duplicates.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <TriangleAlert size={18} className="text-amber-600" />
                    <span className="text-base font-bold text-amber-700 dark:text-amber-400">מוצרים דומים במערכת</span>
                  </div>
                  {possibleDuplicates.slice(0, 3).map((d) => (
                    <div key={d.id} className="flex items-center gap-3 py-2">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                        <img src={d.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-sm font-medium truncate flex-1">{d.name}</span>
                      <span className="text-xs text-amber-600 font-bold">{Math.round(d.matchScore * 100)}%</span>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* ═══ Data Extraction Preview + Form Fields ═══ */}
              {stepStatus[1] === "done" && editData && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                  {/* Product Identity + Image */}
                  <div className="p-6 bg-card rounded-2xl shadow-lg border border-border">
                    <h3 className="text-lg font-extrabold mb-4 flex items-center gap-2">
                      <Package size={20} className="text-primary" /> זהות המוצר
                    </h3>
                    <div className="flex gap-5">
                      {/* Main Image Preview */}
                      <div className="shrink-0">
                        <div className="w-32 h-32 rounded-xl overflow-hidden bg-muted border-2 border-border shadow-sm">
                          <img src={editData.image_url} alt={editData.name} className="w-full h-full object-cover" />
                        </div>
                        {editData.source_url && (
                          <a href={editData.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline font-medium">
                            <ExternalLink size={12} /> מקור
                          </a>
                        )}
                      </div>

                      {/* Identity Fields */}
                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="text-sm font-bold text-muted-foreground mb-1 block">שם המוצר (מנוקה) <span className="text-destructive">*</span></label>
                          <Input
                            value={editData.name}
                            onChange={(e) => updateField("name", e.target.value)}
                            className="text-base h-12 font-bold"
                            dir="rtl"
                            placeholder="שם המוצר..."
                          />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-sm font-bold text-muted-foreground mb-1 block">מותג <span className="text-destructive">*</span></label>
                            <Input
                              value={editData.brand}
                              onChange={(e) => updateField("brand", e.target.value)}
                              className="text-base h-11 font-medium"
                              dir="rtl"
                              placeholder="שם המותג"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-bold text-muted-foreground mb-1 block">SKU / ברקוד</label>
                            <Input
                              value={editData.sku}
                              onChange={(e) => updateField("sku", e.target.value)}
                              className="text-base h-11 font-medium"
                              dir="ltr"
                              placeholder="מק״ט"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-bold text-muted-foreground mb-1 block">מחיר (₪) <span className="text-destructive">*</span></label>
                            <Input
                              type="number"
                              value={editData.price || ""}
                              onChange={(e) => updateField("price", parseFloat(e.target.value) || 0)}
                              className="text-base h-11 font-bold"
                              dir="ltr"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-bold text-muted-foreground mb-1 block">Source URL</label>
                          <Input
                            value={editData.source_url}
                            onChange={(e) => updateField("source_url", e.target.value)}
                            className="text-sm h-10 font-medium text-muted-foreground"
                            dir="ltr"
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pet Context + Categorization */}
                  <div className="p-6 bg-card rounded-2xl shadow-lg border border-border">
                    <h3 className="text-lg font-extrabold mb-4 flex items-center gap-2">
                      <Heart size={20} className="text-primary" /> הקשר חיית מחמד וסיווג
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Pet Type */}
                      <div>
                        <label className="text-sm font-bold text-muted-foreground mb-1 block">סוג חיה</label>
                        <select
                          value={editData.pet_type || "all"}
                          onChange={(e) => updateField("pet_type", e.target.value)}
                          className="w-full h-11 rounded-xl border-2 border-border bg-background text-foreground px-3 text-base font-medium focus:ring-2 focus:ring-ring focus:outline-none"
                        >
                          <option value="all">הכל</option>
                          <option value="dog">כלב</option>
                          <option value="cat">חתול</option>
                          <option value="other">אחר</option>
                        </select>
                      </div>
                      {/* Life Stage */}
                      <div>
                        <label className="text-sm font-bold text-muted-foreground mb-1 block">שלב חיים</label>
                        <select
                          value={editData.life_stage || ""}
                          onChange={(e) => updateField("life_stage", e.target.value)}
                          className="w-full h-11 rounded-xl border-2 border-border bg-background text-foreground px-3 text-base font-medium focus:ring-2 focus:ring-ring focus:outline-none"
                        >
                          <option value="">לא צוין</option>
                          <option value="puppy">גור (Puppy/Kitten)</option>
                          <option value="adult">בוגר (Adult)</option>
                          <option value="senior">מבוגר (Senior)</option>
                          <option value="all">כל הגילאים</option>
                        </select>
                      </div>
                      {/* Size */}
                      <div>
                        <label className="text-sm font-bold text-muted-foreground mb-1 block">גודל</label>
                        <select
                          value={editData.dog_size || ""}
                          onChange={(e) => updateField("dog_size", e.target.value)}
                          className="w-full h-11 rounded-xl border-2 border-border bg-background text-foreground px-3 text-base font-medium focus:ring-2 focus:ring-ring focus:outline-none"
                        >
                          <option value="">לא צוין</option>
                          <option value="small">קטן (Small)</option>
                          <option value="medium">בינוני (Medium)</option>
                          <option value="large">גדול (Large)</option>
                          <option value="all">כל הגדלים</option>
                        </select>
                      </div>
                      {/* Main Category */}
                      <div>
                        <label className="text-sm font-bold text-muted-foreground mb-1 block">קטגוריה ראשית</label>
                        <select
                          value={editData.category || ""}
                          onChange={(e) => updateField("category", e.target.value)}
                          className="w-full h-11 rounded-xl border-2 border-border bg-background text-foreground px-3 text-base font-medium focus:ring-2 focus:ring-ring focus:outline-none"
                        >
                          <option value="">לא צוין</option>
                          <option value="מזון יבש">מזון יבש (Dry Food)</option>
                          <option value="מזון רטוב">מזון רטוב (Wet Food)</option>
                          <option value="חטיפים">חטיפים (Treats)</option>
                          <option value="רפואי">רפואי (Medical)</option>
                          <option value="תוספי תזונה">תוספי תזונה (Supplements)</option>
                          <option value="ציוד">ציוד (Equipment)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="p-6 bg-card rounded-2xl shadow-lg border border-border">
                    <h3 className="text-lg font-extrabold mb-3 flex items-center gap-2">
                      <Pencil size={20} className="text-primary" /> תיאור המוצר
                    </h3>
                    {editData.description ? (
                      <textarea
                        value={editData.description}
                        onChange={(e) => updateField("description", e.target.value)}
                        className="w-full min-h-[100px] p-4 rounded-xl border-2 border-border bg-background text-foreground text-base resize-y focus:ring-2 focus:ring-ring focus:outline-none font-medium leading-relaxed"
                        dir="rtl"
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
                        <AlertCircle size={18} className="text-amber-600 shrink-0" />
                        <span className="text-base font-bold text-amber-700 dark:text-amber-400">לא נמצא (Not Found)</span>
                      </div>
                    )}
                  </div>

                  {/* Raw Ingredients (read-only transparency) */}
                  <div className="p-6 bg-card rounded-2xl shadow-lg border border-border">
                    <h3 className="text-lg font-extrabold mb-3 flex items-center gap-2">
                      <List size={20} className="text-primary" /> רכיבים גולמיים (מהמקור)
                    </h3>
                    {editData.ingredients ? (
                      <>
                        <div className="p-4 bg-muted/50 rounded-xl border border-border">
                          <p className="text-sm font-medium leading-relaxed text-muted-foreground whitespace-pre-wrap" dir="ltr">
                            {editData.ingredients}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Info size={12} /> נתון זה חולץ ישירות מעמוד המוצר – ללא עריכה או השלמה
                        </p>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
                        <AlertCircle size={18} className="text-amber-600 shrink-0" />
                        <span className="text-base font-bold text-amber-700 dark:text-amber-400">לא נמצא (Not Found)</span>
                      </div>
                    )}
                  </div>

                  {/* Benefits Preview */}
                  <div className="p-6 bg-card rounded-2xl shadow-lg border border-border">
                    <h3 className="text-lg font-extrabold mb-3 flex items-center gap-2">
                      <Star size={20} className="text-primary" /> יתרונות מרכזיים
                    </h3>
                    {editData.benefits && editData.benefits.length > 0 ? (
                      <div className="space-y-2">
                        {editData.benefits.slice(0, 5).map((b: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl border border-border">
                            <BadgeCheck size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-base font-bold">{b.title}</p>
                              {b.description && <p className="text-sm text-muted-foreground">{b.description}</p>}
                            </div>
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Info size={12} /> סוכם מתוך הטקסט המקורי בלבד – ללא המצאה
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
                        <AlertCircle size={18} className="text-amber-600 shrink-0" />
                        <span className="text-base font-bold text-amber-700 dark:text-amber-400">לא נמצא (Not Found)</span>
                      </div>
                    )}
                  </div>

                  {/* Feeding Table Preview */}
                  <div className="p-6 bg-card rounded-2xl shadow-lg border border-border">
                    <h3 className="text-lg font-extrabold mb-3 flex items-center gap-2">
                      <Utensils size={20} className="text-primary" /> טבלת האכלה (JSON)
                    </h3>
                    {editData.feeding_guide && editData.feeding_guide.length > 0 ? (
                      <>
                        <div className="overflow-hidden rounded-xl border border-border">
                          <table className="w-full text-base">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="text-right p-3 font-bold text-muted-foreground">טווח משקל</th>
                                <th className="text-right p-3 font-bold text-muted-foreground">כמות יומית</th>
                              </tr>
                            </thead>
                            <tbody>
                              {editData.feeding_guide.map((row: any, i: number) => (
                                <tr key={i} className="border-t border-border">
                                  <td className="p-3 font-medium" dir="ltr">{row.range || "—"}</td>
                                  <td className="p-3 font-medium" dir="ltr">{row.amount || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Info size={12} /> {editData.feeding_guide.length} שורות חולצו מהמקור
                        </p>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
                        <AlertCircle size={18} className="text-amber-600 shrink-0" />
                        <span className="text-base font-bold text-amber-700 dark:text-amber-400">לא נמצא (Not Found)</span>
                      </div>
                    )}
                  </div>

                  {/* Price Display */}
                  <div className="p-6 bg-card rounded-2xl shadow-lg border border-border">
                    <h3 className="text-lg font-extrabold mb-3 flex items-center gap-2">
                      <Zap size={20} className="text-primary" /> מחיר
                    </h3>
                    {editData.price > 0 ? (
                      <div className="flex items-center gap-4">
                        <span className="text-3xl font-extrabold text-primary">₪{editData.price}</span>
                        {editData.sale_price && (
                          <span className="text-lg text-emerald-600 font-bold">מבצע: ₪{editData.sale_price}</span>
                        )}
                        {editData.original_price && editData.original_price !== editData.price && (
                          <span className="text-lg text-muted-foreground line-through">₪{editData.original_price}</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
                        <AlertCircle size={18} className="text-amber-600 shrink-0" />
                        <span className="text-base font-bold text-amber-700 dark:text-amber-400">לא נמצא (Not Found)</span>
                      </div>
                    )}
                  </div>

                  {/* Zero-Hallucination Notice */}
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border">
                    <Shield size={18} className="text-primary shrink-0" />
                    <p className="text-sm font-semibold text-muted-foreground">
                      <span className="text-foreground">Zero-Hallucination:</span> שדות המסומנים "לא נמצא" – המידע לא קיים בעמוד המקור. אין השלמה אוטומטית של נתונים חסרים.
                    </p>
                  </div>

                  {/* Navigation - Next disabled until mandatory fields filled */}
                  <div className="flex items-center justify-between p-4 bg-card rounded-2xl shadow-lg border border-border">
                    <Button variant="outline" onClick={handleReset} className="gap-2 font-bold">
                      <RotateCcw size={14} /> התחל מחדש
                    </Button>
                    <div className="flex items-center gap-3">
                      {(!editData.name || !editData.brand || !editData.price) && (
                        <p className="text-xs text-destructive font-semibold">חובה: שם, מותג, מחיר</p>
                      )}
                      <Button
                        onClick={() => goToStep(2)}
                        disabled={!editData.name || !editData.brand || !editData.price}
                        className="gap-2 text-base font-bold"
                        size="lg"
                      >
                        המשך לניתוח <ChevronLeft size={18} />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ═══ STEP 2: THE SCIENTIST ═══ */}
          {step === 2 && editData && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="p-6 bg-card rounded-2xl shadow-lg border border-border">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-3 bg-amber-500 rounded-xl text-white">
                    <FlaskConical size={24} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold">שלב 2: המדען</h2>
                    <p className="text-muted-foreground text-base">ניתוח רכיבים מבוסס מחקר מדעי – Zero Hallucination</p>
                  </div>
                </div>

                {/* Ingredients editor */}
                <div className="mb-4">
                  <label className="text-sm font-bold text-foreground mb-2 block">רכיבים (ניתן לעריכה)</label>
                  <textarea
                    value={editData.ingredients}
                    onChange={(e) => updateField("ingredients", e.target.value)}
                    className="w-full min-h-[100px] p-4 rounded-xl border-2 border-border bg-background text-foreground text-base resize-y focus:ring-2 focus:ring-ring focus:outline-none font-medium"
                    dir="rtl"
                    placeholder="הדבק כאן את רשימת הרכיבים מהאריזה..."
                  />
                </div>

                {!analysis && (
                  <Button
                    onClick={runIngredientAnalysis}
                    disabled={stepStatus[2] === "loading" || !editData.ingredients}
                    size="lg"
                    className="gap-2 w-full text-base font-bold"
                    variant={editData.ingredients ? "default" : "outline"}
                  >
                    {stepStatus[2] === "loading" ? (
                      <><Loader2 className="animate-spin" size={18} /> מנתח רכיבים...</>
                    ) : (
                      <><Shield size={18} /> הפעל ניתוח מדעי</>
                    )}
                  </Button>
                )}

                {!editData.ingredients && (
                  <p className="text-center text-sm text-amber-600 dark:text-amber-400 mt-3 font-semibold flex items-center justify-center gap-2">
                    <Info size={16} /> ללא רכיבים – ניתן לדלג ולהמשיך
                  </p>
                )}
              </div>

              {/* Analysis Results */}
              {analysis && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {/* Verdict Banner */}
                  <div className={`p-5 rounded-2xl border-2 ${
                    analysis.verdict === "safe"
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                      : analysis.verdict === "caution"
                        ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800"
                        : "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800"
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {analysis.verdict === "safe" ? (
                          <BadgeCheck size={28} className="text-emerald-600" />
                        ) : analysis.verdict === "caution" ? (
                          <TriangleAlert size={28} className="text-amber-600" />
                        ) : (
                          <AlertOctagon size={28} className="text-red-600" />
                        )}
                        <span className="text-xl font-extrabold">
                          {analysis.verdict === "safe" ? "מוצר בטוח" : analysis.verdict === "caution" ? "נדרשת תשומת לב" : "נמצאו סיכונים"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {analysis.qualityScore && (
                          <div className="text-center">
                            <div className="text-3xl font-extrabold">{analysis.qualityScore}/10</div>
                            <div className="text-xs text-muted-foreground font-semibold">ציון איכות</div>
                          </div>
                        )}
                        <div className="text-center">
                          <div className="text-3xl font-extrabold">{Math.round(analysis.confidence * 100)}%</div>
                          <div className="text-xs text-muted-foreground font-semibold">אמינות</div>
                        </div>
                      </div>
                    </div>

                    {analysis.summaryHe && (
                      <p className="text-base font-medium leading-relaxed">{analysis.summaryHe}</p>
                    )}
                  </div>

                  {/* Red Flags */}
                  {analysis.redFlags.length > 0 && (
                    <div className="p-5 bg-card rounded-2xl shadow-lg border border-border">
                      <h3 className="text-lg font-extrabold text-destructive flex items-center gap-2 mb-3">
                        <XCircle size={20} /> דגלים אדומים ({analysis.redFlags.length})
                      </h3>
                      <div className="space-y-2">
                        {analysis.redFlags.map((flag, i) => (
                          <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
                            flag.severity === "critical"
                              ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                              : flag.severity === "warning"
                                ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
                                : "bg-muted/30 border-border"
                          }`}>
                            <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md shrink-0 mt-0.5 ${
                              flag.severity === "critical" ? "bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200"
                              : flag.severity === "warning" ? "bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200"
                              : "bg-muted text-muted-foreground"
                            }`}>
                              {flag.severity === "critical" ? "קריטי" : flag.severity === "warning" ? "אזהרה" : "מידע"}
                            </span>
                            <div>
                              <p className="font-bold text-base">{flag.he}</p>
                              <p className="text-sm text-muted-foreground">{flag.risk}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Positives */}
                  {analysis.positives.length > 0 && (
                    <div className="p-5 bg-card rounded-2xl shadow-lg border border-border">
                      <h3 className="text-lg font-extrabold text-emerald-600 flex items-center gap-2 mb-3">
                        <Star size={20} /> רכיבים חיוביים ({analysis.positives.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {analysis.positives.map((pos, i) => (
                          <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900">
                            <Zap size={14} className="text-emerald-500 shrink-0" />
                            <div>
                              <span className="font-bold text-sm">{pos.he}</span>
                              <span className="text-xs text-muted-foreground mr-1">– {pos.benefit}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* First Five Analysis */}
                  {analysis.firstFiveAnalysis && (
                    <div className="p-5 bg-card rounded-2xl shadow-lg border border-border">
                      <h3 className="text-lg font-extrabold flex items-center gap-2 mb-2">
                        <FlaskConical size={20} /> ניתוח 5 הרכיבים הראשונים
                      </h3>
                      <p className="text-base leading-relaxed">{analysis.firstFiveAnalysis}</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between p-4 bg-card rounded-2xl shadow-lg border border-border">
                <Button variant="outline" onClick={() => goToStep(1)} className="gap-2 font-bold">
                  <ChevronRight size={16} /> חזרה
                </Button>
                <Button onClick={() => { if (!analysis && editData.ingredients) runIngredientAnalysis(); goToStep(3); }} className="gap-2 text-base font-bold" size="lg">
                  המשך ללוגיקת האכלה <ChevronLeft size={18} />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 3: FEEDING LOGIC ═══ */}
          {step === 3 && editData && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="p-6 bg-card rounded-2xl shadow-lg border border-border">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-3 bg-orange-500 rounded-xl text-white">
                    <Flame size={24} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold">שלב 3: לוגיקת האכלה</h2>
                    <p className="text-muted-foreground text-base">חישוב קלוריות ואימות כמויות מול נוסחאות מדעיות</p>
                  </div>
                </div>

                {/* Kcal Estimation */}
                {analysis?.estimatedKcalPerKg ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-extrabold">{analysis.estimatedKcalPerKg} Kcal/kg</p>
                        <p className="text-sm text-muted-foreground font-medium">
                          {analysis.kcalEstimationMethod || "חישוב AI"}
                        </p>
                      </div>
                      <Scale size={32} className="text-amber-500" />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-muted/50 rounded-xl border border-border mb-4">
                    <div className="flex items-center gap-3">
                      <Scale size={24} className="text-muted-foreground" />
                      <div>
                        <p className="text-base font-bold">אין נתוני קלוריות זמינים</p>
                        <p className="text-sm text-muted-foreground">הזן ידנית או המשך ללא – יחושב מנתוני היצרן</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Feeding Table Editor */}
                <div className="space-y-3">
                  <h3 className="text-lg font-extrabold flex items-center gap-2">
                    <Utensils size={20} /> טבלת האכלה
                  </h3>

                  {editData.feeding_guide.length > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-3 text-sm font-bold text-muted-foreground px-1">
                        <span>טווח משקל</span>
                        <span>כמות יומית</span>
                        <span></span>
                      </div>
                      {editData.feeding_guide.map((row: any, i: number) => (
                        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center">
                          <Input
                            value={row.range || ""}
                            onChange={(e) => updateFeedingRow(i, "range", e.target.value)}
                            className="text-base h-11 font-medium"
                            dir="ltr"
                            placeholder="1-5 kg"
                          />
                          <Input
                            value={row.amount || ""}
                            onChange={(e) => updateFeedingRow(i, "amount", e.target.value)}
                            className="text-base h-11 font-medium"
                            dir="ltr"
                            placeholder="50-100g"
                          />
                          <Button variant="ghost" size="icon" className="h-11 w-11 text-destructive hover:text-destructive" onClick={() => removeFeedingRow(i)}>
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Utensils size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-base font-medium">לא נמצאה טבלת האכלה</p>
                      <p className="text-sm">הוסף שורות ידנית או דלג</p>
                    </div>
                  )}
                  <Button variant="outline" onClick={addFeedingRow} className="gap-2 font-bold">
                    <Plus size={14} /> הוסף שורה
                  </Button>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between p-4 bg-card rounded-2xl shadow-lg border border-border">
                <Button variant="outline" onClick={() => goToStep(2)} className="gap-2 font-bold">
                  <ChevronRight size={16} /> חזרה
                </Button>
                <Button onClick={() => goToStep(4)} className="gap-2 text-base font-bold" size="lg">
                  המשך לפרסום <ChevronLeft size={18} />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 4: VARIANT & PUBLISH ═══ */}
          {step === 4 && editData && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {stepStatus[4] !== "done" ? (
                <>
                  {/* Variants Manager */}
                  <div className="p-6 bg-card rounded-2xl shadow-lg border border-border">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-3 bg-violet-500 rounded-xl text-white">
                        <Package size={24} strokeWidth={1.5} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-extrabold">שלב 4: וריאנטים ופרסום</h2>
                        <p className="text-muted-foreground text-base">נהל משקלים/מידות וצפה בתצוגה מקדימה</p>
                      </div>
                    </div>

                    {/* Variant list */}
                    <h3 className="text-lg font-extrabold mb-3">וריאנטים ({editData.variants.length})</h3>
                    {editData.variants.length > 0 ? (
                      <div className="space-y-2 mb-4">
                        {editData.variants.map((v: any, i: number) => (
                          <div key={i} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center">
                            <Input
                              value={v.label || ""}
                              onChange={(e) => updateVariant(i, "label", e.target.value)}
                              className="text-base h-11 font-medium"
                              placeholder='תיאור (למשל 12 ק"ג)'
                              dir="rtl"
                            />
                            <Input
                              type="number"
                              value={v.weight || ""}
                              onChange={(e) => updateVariant(i, "weight", parseFloat(e.target.value) || null)}
                              className="text-base h-11 font-medium"
                              placeholder="משקל"
                              dir="ltr"
                            />
                            <Input
                              type="number"
                              value={v.price || ""}
                              onChange={(e) => updateVariant(i, "price", parseFloat(e.target.value) || null)}
                              className="text-base h-11 font-medium"
                              placeholder="מחיר ₪"
                              dir="ltr"
                            />
                            <Button variant="ghost" size="icon" className="h-11 w-11 text-destructive" onClick={() => removeVariant(i)}>
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-4 text-muted-foreground text-base">אין וריאנטים – ניתן להוסיף</p>
                    )}
                    <Button variant="outline" onClick={addVariant} className="gap-2 font-bold">
                      <Plus size={14} /> הוסף וריאנט
                    </Button>
                  </div>

                  {/* ═══ SUPPLIER CARD ═══ */}
                  <div className="p-6 bg-card rounded-2xl shadow-lg border border-border">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-3 bg-sky-500 rounded-xl text-white">
                        <Building2 size={24} strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="text-xl font-extrabold">כרטיס ספק</h3>
                        <p className="text-muted-foreground text-sm">קשר מוצר לספק, הגדר מחיר עלות וסנכרון מלאי</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Supplier Select */}
                      <div>
                        <Label className="text-sm font-bold mb-1.5 block">ספק</Label>
                        <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                          <SelectTrigger className="h-11 text-base font-medium">
                            <SelectValue placeholder="בחר ספק..." />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                <div className="flex items-center gap-2">
                                  <Building2 size={14} />
                                  <span>{s.name}</span>
                                  {s.shipping_days && (
                                    <span className="text-xs text-muted-foreground">({s.shipping_days} ימי משלוח)</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Cost Price + Margin */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-bold mb-1.5 block">מחיר עלות (₪)</Label>
                          <Input
                            type="number"
                            value={costPrice}
                            onChange={(e) => setCostPrice(e.target.value)}
                            placeholder="0.00"
                            className="h-11 text-base font-medium"
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-bold mb-1.5 block">מרווח רווח</Label>
                          <div className="h-11 flex items-center px-4 rounded-xl border border-border bg-muted/50">
                            {costPrice && editData.price ? (
                              <>
                                <span className="text-lg font-extrabold text-emerald-600">
                                  {Math.round(((editData.price - parseFloat(costPrice)) / editData.price) * 100)}%
                                </span>
                                <span className="text-sm text-muted-foreground mr-2">
                                  (₪{(editData.price - parseFloat(costPrice)).toFixed(0)} רווח)
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground text-sm">הזן מחיר עלות</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* API Sync Toggle */}
                      {selectedSupplierId && suppliers.find(s => s.id === selectedSupplierId)?.api_endpoint && (
                        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                          <div className="flex items-center gap-3">
                            <Truck size={20} className="text-muted-foreground" />
                            <div>
                              <p className="text-sm font-bold">סנכרון מלאי אוטומטי</p>
                              <p className="text-xs text-muted-foreground">עדכון זמינות דרך API הספק</p>
                            </div>
                          </div>
                          <Switch checked={apiSyncEnabled} onCheckedChange={setApiSyncEnabled} />
                        </div>
                      )}

                      {/* Supplier Info Summary */}
                      {selectedSupplierId && (() => {
                        const sup = suppliers.find(s => s.id === selectedSupplierId);
                        if (!sup) return null;
                        return (
                          <div className="flex items-center gap-4 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 text-sm">
                            <Building2 size={16} className="text-sky-600 shrink-0" />
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              <span className="font-bold">{sup.name}</span>
                              {sup.shipping_days && <span>🚚 {sup.shipping_days} ימים</span>}
                              {sup.payment_terms && <span>💳 {sup.payment_terms}</span>}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>


                  <div className="p-6 bg-card rounded-2xl shadow-lg border border-border">
                    <h3 className="text-lg font-extrabold mb-4 flex items-center gap-2">
                      <Pencil size={18} /> עריכה מהירה
                    </h3>
                    <div className="space-y-3">
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
                      <div>
                        <label className="text-sm font-bold text-muted-foreground mb-1 block">תיאור</label>
                        <textarea
                          value={editData.description}
                          onChange={(e) => updateField("description", e.target.value)}
                          className="w-full min-h-[80px] p-3 rounded-xl border-2 border-border bg-background text-foreground text-base resize-y focus:ring-2 focus:ring-ring focus:outline-none font-medium"
                          dir="rtl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Product Card Preview */}
                  <div className="p-6 bg-card rounded-2xl shadow-lg border border-border">
                    <h3 className="text-lg font-extrabold mb-4 flex items-center gap-2">
                      <Eye size={18} /> תצוגה מקדימה
                    </h3>
                    <div className="max-w-sm mx-auto">
                      <div className="bg-background rounded-2xl border-2 border-border overflow-hidden shadow-md">
                        <div className="aspect-square bg-muted relative">
                          <img src={editData.image_url} alt="" className="w-full h-full object-cover" />
                          {analysis && (
                            <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-lg text-xs font-extrabold ${
                              analysis.verdict === "safe"
                                ? "bg-emerald-500 text-white"
                                : analysis.verdict === "caution"
                                  ? "bg-amber-500 text-white"
                                  : "bg-red-500 text-white"
                            }`}>
                              {analysis.qualityScore && `${analysis.qualityScore}/10`}
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          {editData.brand && <p className="text-xs text-muted-foreground font-semibold mb-1">{editData.brand}</p>}
                          <h4 className="text-base font-extrabold leading-tight mb-2">{editData.name}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-extrabold text-primary">₪{editData.sale_price || editData.price}</span>
                            {editData.sale_price && editData.price > editData.sale_price && (
                              <span className="text-sm text-muted-foreground line-through">₪{editData.price}</span>
                            )}
                          </div>
                          {editData.variants.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {editData.variants.slice(0, 4).map((v: any, i: number) => (
                                <span key={i} className="text-xs bg-muted px-2 py-1 rounded-lg font-semibold">{v.label}</span>
                              ))}
                              {editData.variants.length > 4 && <span className="text-xs text-muted-foreground font-bold">+{editData.variants.length - 4}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Publish Bar */}
                  <div className="flex items-center justify-between p-4 bg-card rounded-2xl shadow-lg border border-border">
                    <Button variant="outline" onClick={() => goToStep(3)} className="gap-2 font-bold">
                      <ChevronRight size={16} /> חזרה
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleReset} className="gap-2 font-bold">
                        <RotateCcw size={14} /> התחל מחדש
                      </Button>
                      <Button onClick={handlePublish} disabled={stepStatus[4] === "loading"} className="gap-2 px-8 text-base font-bold" size="lg">
                        {stepStatus[4] === "loading" ? (
                          <><Loader2 className="animate-spin" size={18} /> שומר...</>
                        ) : (
                          <><Save size={18} /> פרסם ב-PetID</>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                /* Success State */
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="flex items-center gap-3 p-5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 size={28} />
                    <span className="text-xl font-extrabold">המוצר פורסם בהצלחה!</span>
                  </div>

                  {publishedProduct && (
                    <div className="flex items-center gap-4 p-5 bg-card rounded-2xl border border-border">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted border border-border shrink-0">
                        <img src={publishedProduct.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xl font-extrabold truncate">{publishedProduct.name}</p>
                        <p className="text-lg text-muted-foreground font-bold">₪{publishedProduct.price}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button onClick={() => navigate(`/product/${publishedProduct?.id}`)} className="flex-1 gap-2 text-base font-bold" size="lg">
                      <ExternalLink size={18} /> צפה בדף המוצר
                    </Button>
                    <Button variant="outline" onClick={handleReset} className="gap-2 text-base font-bold" size="lg">
                      <RotateCcw size={18} /> ייבא עוד
                    </Button>
                  </div>
                </motion.div>
              )}
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
      <label className="text-sm font-bold text-muted-foreground mb-1 block">{label}</label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-base h-11 font-medium"
        dir={type === "number" ? "ltr" : "rtl"}
      />
    </div>
  );
}

// ── Utility Helpers ──
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
