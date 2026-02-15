import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Link2,
  Barcode,
  Type,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  Search,
  ImageIcon,
  RefreshCw,
  ExternalLink,
  Package,
  Plus,
  Trash2,
  Weight,
  Palette,
  Ruler,
  Drumstick,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_BUSINESS_ID = "cf941cc4-e1d1-4d7c-8122-a5df81a1e53c";

type InputMethod = "url" | "barcode" | "name";
type WizardStep = 1 | 2 | 3 | 4;

interface ScrapedData {
  title: string;
  description: string | null;
  images: string[];
  basePrice: number | null;
  salePrice: number | null;
  sku: string | null;
  category: string | null;
  petType: string | null;
  source_url: string;
  feedingGuide?: any[];
  ingredients?: string | null;
  benefits?: { title: string; description: string }[];
  lifeStage?: string | null;
  dogSize?: string | null;
  specialDiet?: string[];
  productAttributes?: Record<string, string>;
  brand?: string | null;
  variants?: any[];
}

interface VariantRow {
  id: string;
  variant_type: string;
  label: string;
  value: string;
  weight_kg: number | null;
  weight_unit: string | null;
  price: number | null;
  sale_price: number | null;
  sku: string | null;
  in_stock: boolean;
}

interface ProductImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const VARIANT_TYPES = [
  { key: "weight", label: "משקל", icon: Weight, placeholder: '3 ק"ג' },
  { key: "color", label: "צבע", icon: Palette, placeholder: "שחור" },
  { key: "size", label: "מידה", icon: Ruler, placeholder: "Large" },
  { key: "protein", label: "סוג חלבון", icon: Drumstick, placeholder: "סלמון" },
];

const SIZE_OPTIONS = ["Small", "Medium", "Large", "X-Large"];

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function detectVariantTypes(category: string | null, scrapedData: ScrapedData): string[] {
  const cat = (category || "").toLowerCase();
  const title = (scrapedData.title || "").toLowerCase();
  const combined = `${cat} ${title}`;

  if (combined.includes("מזון") || combined.includes("food") || cat.includes("dry") || cat.includes("wet") || cat.includes("treats")) {
    return ["weight", "protein"];
  }
  if (combined.includes("רצועה") || combined.includes("קולר") || combined.includes("collar") || combined.includes("leash") || combined.includes("harness")) {
    return ["color", "size"];
  }
  if (combined.includes("בגד") || combined.includes("clothing") || combined.includes("costume")) {
    return ["size", "color"];
  }
  return ["weight"];
}

function scrapedVariantsToRows(variants: any[]): VariantRow[] {
  return variants.map((v) => ({
    id: generateId(),
    variant_type: v.weight ? "weight" : "size",
    label: v.label || "",
    value: v.label || "",
    weight_kg: v.weight || null,
    weight_unit: v.weight_unit || null,
    price: v.price || null,
    sale_price: v.sale_price || null,
    sku: v.sku || null,
    in_stock: true,
  }));
}

export const ProductImportWizard = ({
  open,
  onOpenChange,
  onSuccess,
}: ProductImportWizardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<WizardStep>(1);
  const [inputMethod, setInputMethod] = useState<InputMethod>("url");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedPrice, setEditedPrice] = useState<number>(0);
  const [editedCategory, setEditedCategory] = useState("");
  const [searchingImage, setSearchingImage] = useState(false);
  const [googleImages, setGoogleImages] = useState<string[]>([]);
  const [showGoogleSearch, setShowGoogleSearch] = useState(false);
  const [savedProductId, setSavedProductId] = useState<string | null>(null);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [activeVariantTypes, setActiveVariantTypes] = useState<string[]>([]);

  const resetWizard = () => {
    setStep(1);
    setInputValue("");
    setScrapedData(null);
    setSelectedImage("");
    setEditedName("");
    setEditedDescription("");
    setEditedPrice(0);
    setEditedCategory("");
    setGoogleImages([]);
    setShowGoogleSearch(false);
    setSavedProductId(null);
    setLoading(false);
    setSaving(false);
    setVariants([]);
    setActiveVariantTypes([]);
  };

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  // Step 1: Fetch product data
  const handleFetchProduct = async () => {
    if (!inputValue.trim()) return;
    setLoading(true);

    try {
      let url = inputValue.trim();

      if (inputMethod === "url") {
        if (!url.startsWith("http")) {
          toast({ title: "כתובת לא תקינה", variant: "destructive" });
          setLoading(false);
          return;
        }
      } else if (inputMethod === "name") {
        const data: ScrapedData = {
          title: url, description: null, images: [], basePrice: null,
          salePrice: null, sku: null, category: null, petType: null, source_url: "",
        };
        setScrapedData(data);
        setEditedName(url);
        setSelectedImage("");
        setStep(2);
        setLoading(false);
        return;
      } else if (inputMethod === "barcode") {
        const data: ScrapedData = {
          title: "", description: null, images: [], basePrice: null,
          salePrice: null, sku: url, category: null, petType: null, source_url: "",
        };
        setScrapedData(data);
        setEditedName("");
        setSelectedImage("");
        setStep(2);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "import-products-from-url",
        { body: { url, maxProducts: 1, maxPages: 1, sameDomainOnly: true } }
      );

      if (error) throw new Error(error.message);

      if (!data?.success || !data?.data?.products?.length) {
        toast({ title: "לא נמצא מוצר", description: "וודא שזה דף מוצר ספציפי", variant: "destructive" });
        setLoading(false);
        return;
      }

      const scraped = data.data.products[0];
      setScrapedData(scraped);
      setEditedName(scraped.title || "");
      setSelectedImage(scraped.images?.[0] || "");
      setEditedDescription(scraped.description || "");
      setEditedPrice(scraped.salePrice || scraped.basePrice || 0);
      setEditedCategory(scraped.category || "");

      // Pre-populate variants from scraped data
      if (scraped.variants?.length > 0) {
        setVariants(scrapedVariantsToRows(scraped.variants));
      }

      setStep(2);
    } catch (err: any) {
      console.error("Fetch failed:", err);
      toast({ title: "שגיאה בשליפת הנתונים", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchGoogleImages = async () => {
    if (!editedName.trim()) return;
    setSearchingImage(true);
    setShowGoogleSearch(true);
    try {
      const query = encodeURIComponent(editedName);
      window.open(`https://www.google.com/search?tbm=isch&q=${query}`, "_blank");
    } catch (err) {
      console.error("Image search failed:", err);
    } finally {
      setSearchingImage(false);
    }
  };

  const [manualImageUrl, setManualImageUrl] = useState("");
  const handleAddManualImage = () => {
    if (manualImageUrl.trim() && manualImageUrl.startsWith("http")) {
      setSelectedImage(manualImageUrl.trim());
      setManualImageUrl("");
    }
  };

  // Moving to step 3 (variants) - auto-detect variant types
  const handleGoToVariants = () => {
    if (scrapedData) {
      const detected = detectVariantTypes(editedCategory || scrapedData.category, scrapedData);
      setActiveVariantTypes(detected);

      // If no variants yet and we have scraped variants, populate them
      if (variants.length === 0 && scrapedData.variants?.length) {
        setVariants(scrapedVariantsToRows(scrapedData.variants));
      }
    }
    setStep(3);
  };

  // Variant management
  const addVariant = (type: string) => {
    const typeInfo = VARIANT_TYPES.find(t => t.key === type);
    setVariants(prev => [...prev, {
      id: generateId(),
      variant_type: type,
      label: "",
      value: "",
      weight_kg: null,
      weight_unit: type === "weight" ? "kg" : null,
      price: editedPrice || null,
      sale_price: null,
      sku: null,
      in_stock: true,
    }]);
  };

  const removeVariant = (id: string) => {
    setVariants(prev => prev.filter(v => v.id !== id));
  };

  const updateVariant = (id: string, field: keyof VariantRow, value: any) => {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const addSizeVariants = () => {
    const newVariants = SIZE_OPTIONS.map((size, i) => ({
      id: generateId(),
      variant_type: "size",
      label: size,
      value: size,
      weight_kg: null,
      weight_unit: null,
      price: editedPrice || null,
      sale_price: null,
      sku: null,
      in_stock: true,
    }));
    setVariants(prev => [...prev, ...newVariants]);
  };

  // Step 4: Save the product + variants
  const handleSaveProduct = async () => {
    if (!editedName.trim()) {
      toast({ title: "שם מוצר הוא שדה חובה", variant: "destructive" });
      return;
    }
    if (editedPrice <= 0) {
      toast({ title: "יש להזין מחיר תקין", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const productData: any = {
        business_id: DEFAULT_BUSINESS_ID,
        name: editedName.trim(),
        description: editedDescription || null,
        price: editedPrice,
        original_price:
          scrapedData?.basePrice && scrapedData?.salePrice && scrapedData.salePrice < scrapedData.basePrice
            ? scrapedData.basePrice : null,
        sale_price: scrapedData?.salePrice || null,
        image_url: selectedImage || "/placeholder.svg",
        images: scrapedData?.images || [],
        sku: scrapedData?.sku || null,
        source_url: scrapedData?.source_url || null,
        category: editedCategory || null,
        in_stock: true,
        pet_type: scrapedData?.petType || "all",
        brand: scrapedData?.brand || null,
        ingredients: scrapedData?.ingredients || null,
        benefits: scrapedData?.benefits || [],
        feeding_guide: scrapedData?.feedingGuide || [],
        product_attributes: scrapedData?.productAttributes || {},
        life_stage: scrapedData?.lifeStage || null,
        dog_size: scrapedData?.dogSize || null,
        special_diet: scrapedData?.specialDiet || [],
      };

      const { data: inserted, error } = await supabase
        .from("business_products")
        .insert(productData)
        .select("id, name, price, image_url")
        .single();

      if (error) throw error;

      // Save variants
      if (variants.length > 0 && inserted?.id) {
        const variantRows = variants
          .filter(v => v.label.trim())
          .map((v, i) => ({
            product_id: inserted.id,
            variant_type: v.variant_type,
            label: v.label.trim(),
            value: v.value.trim() || v.label.trim(),
            weight_kg: v.weight_kg,
            weight_unit: v.weight_unit,
            price: v.price,
            sale_price: v.sale_price,
            sku: v.sku,
            in_stock: v.in_stock,
            display_order: i,
          }));

        if (variantRows.length > 0) {
          const { error: variantError } = await supabase
            .from("product_variants")
            .insert(variantRows);
          if (variantError) console.error("Variant save error:", variantError);
        }
      }

      // Save feeding guide if available
      if (scrapedData?.feedingGuide?.length && inserted?.id) {
        const guidelines = scrapedData.feedingGuide
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

      setSavedProductId(inserted.id);
      toast({ title: "המוצר נשמר בהצלחה!", description: inserted.name });
      onSuccess();
    } catch (err: any) {
      console.error("Save failed:", err);
      toast({ title: "שגיאה בשמירה", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const inputMethods: { key: InputMethod; label: string; icon: typeof Link2; placeholder: string }[] = [
    { key: "url", label: "קישור URL", icon: Link2, placeholder: "https://example.com/product/..." },
    { key: "barcode", label: "ברקוד / מק״ט", icon: Barcode, placeholder: "7290000000000" },
    { key: "name", label: "שם מוצר", icon: Type, placeholder: "הזן שם מוצר..." },
  ];

  const currentMethod = inputMethods.find((m) => m.key === inputMethod)!;
  const stepLabels = ["הזנת מוצר", "תמונה ושם", "וריאנטים", "אישור"];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden max-h-[90vh]" dir="rtl">
        {/* Step indicator */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-1.5 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0 ${
                  step > i + 1
                    ? "bg-primary text-primary-foreground"
                    : step === i + 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > i + 1 ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-[10px] hidden sm:inline ${step === i + 1 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {label}
              </span>
              {i < 3 && <div className={`flex-1 h-0.5 mx-0.5 ${step > i + 1 ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ============ STEP 1: Input ============ */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-6 pb-6 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-lg">איך תרצה להוסיף את המוצר?</DialogTitle>
              </DialogHeader>

              <div className="flex gap-2">
                {inputMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.key}
                      onClick={() => { setInputMethod(method.key); setInputValue(""); }}
                      className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm ${
                        inputMethod === method.key
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{method.label}</span>
                    </button>
                  );
                })}
              </div>

              <Input
                placeholder={currentMethod.placeholder}
                dir={inputMethod === "url" ? "ltr" : "rtl"}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleFetchProduct()}
                disabled={loading}
                className="pr-4 pl-4 py-6 text-base"
              />

              <Button onClick={handleFetchProduct} disabled={loading || !inputValue.trim()} className="w-full py-6 text-base font-bold">
                {loading ? (<><Loader2 className="w-5 h-5 animate-spin ml-2" />מעבד נתונים...</>) : (<><ChevronLeft className="w-5 h-5 ml-2" />המשך</>)}
              </Button>
            </motion.div>
          )}

          {/* ============ STEP 2: Image & Name ============ */}
          {step === 2 && scrapedData && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-6 pb-6 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-lg">אישור תמונה ושם המוצר</DialogTitle>
              </DialogHeader>

              <div className="flex flex-col items-center gap-3">
                <div className="w-40 h-40 rounded-2xl border-2 border-border overflow-hidden bg-muted flex items-center justify-center">
                  {selectedImage ? (
                    <img src={selectedImage} alt={editedName} className="w-full h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ImageIcon className="w-10 h-10" />
                      <span className="text-xs">אין תמונה</span>
                    </div>
                  )}
                </div>

                {scrapedData.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto w-full py-1">
                    {scrapedData.images.slice(0, 6).map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(img)}
                        className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                          selectedImage === img ? "border-primary ring-2 ring-primary/30" : "border-border"
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 w-full">
                  <Button variant="outline" size="sm" onClick={handleSearchGoogleImages} className="flex-1 gap-1.5">
                    <Search className="w-4 h-4" />חפש בגוגל
                  </Button>
                </div>

                <div className="flex gap-2 w-full">
                  <Input placeholder="הדבק קישור לתמונה..." dir="ltr" value={manualImageUrl} onChange={(e) => setManualImageUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddManualImage()} className="flex-1" />
                  <Button variant="outline" size="icon" onClick={handleAddManualImage} disabled={!manualImageUrl.trim()}>
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">שם המוצר</label>
                <Input value={editedName} onChange={(e) => setEditedName(e.target.value)} dir="rtl" className="text-base font-medium" />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5">
                  <ChevronRight className="w-4 h-4" />חזרה
                </Button>
                <Button onClick={handleGoToVariants} disabled={!editedName.trim()} className="flex-1 gap-1.5">
                  <ChevronLeft className="w-4 h-4" />המשך
                </Button>
              </div>
            </motion.div>
          )}

          {/* ============ STEP 3: Variants ============ */}
          {step === 3 && scrapedData && !savedProductId && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-6 pb-6 space-y-4 overflow-y-auto max-h-[65vh]">
              <DialogHeader>
                <DialogTitle className="text-lg">וריאנטים של המוצר</DialogTitle>
              </DialogHeader>

              <p className="text-sm text-muted-foreground">
                הוסף וריאנטים כמו משקלים, צבעים או מידות שונות למוצר
              </p>

              {/* Variant type buttons */}
              <div className="flex flex-wrap gap-2">
                {VARIANT_TYPES.map(vt => {
                  const Icon = vt.icon;
                  const isActive = activeVariantTypes.includes(vt.key);
                  return (
                    <button
                      key={vt.key}
                      onClick={() => {
                        if (isActive) {
                          setActiveVariantTypes(prev => prev.filter(t => t !== vt.key));
                          setVariants(prev => prev.filter(v => v.variant_type !== vt.key));
                        } else {
                          setActiveVariantTypes(prev => [...prev, vt.key]);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {vt.label}
                    </button>
                  );
                })}
              </div>

              {/* Quick add sizes */}
              {activeVariantTypes.includes("size") && variants.filter(v => v.variant_type === "size").length === 0 && (
                <Button variant="outline" size="sm" onClick={addSizeVariants} className="gap-1.5 text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  הוסף S / M / L / XL
                </Button>
              )}

              {/* Variant rows grouped by type */}
              {activeVariantTypes.map(type => {
                const typeInfo = VARIANT_TYPES.find(t => t.key === type)!;
                const typeVariants = variants.filter(v => v.variant_type === type);
                const Icon = typeInfo.icon;

                return (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Icon className="w-4 h-4 text-primary" />
                        {typeInfo.label}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => addVariant(type)} className="gap-1 text-xs h-7">
                        <Plus className="w-3 h-3" />
                        הוסף
                      </Button>
                    </div>

                    {typeVariants.length === 0 && (
                      <p className="text-xs text-muted-foreground pr-6">אין וריאנטים. לחץ על "הוסף" ליצירת וריאנט.</p>
                    )}

                    {typeVariants.map((v) => (
                      <div key={v.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border">
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder={typeInfo.placeholder}
                            value={v.label}
                            onChange={(e) => {
                              updateVariant(v.id, "label", e.target.value);
                              updateVariant(v.id, "value", e.target.value);
                              if (type === "weight") {
                                const match = e.target.value.match(/(\d+(?:[.,]\d+)?)/);
                                if (match) updateVariant(v.id, "weight_kg", parseFloat(match[1].replace(",", ".")));
                              }
                            }}
                            dir="rtl"
                            className="h-8 text-sm"
                          />
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              placeholder="מחיר ₪"
                              value={v.price ?? ""}
                              onChange={(e) => updateVariant(v.id, "price", e.target.value ? parseFloat(e.target.value) : null)}
                              dir="ltr"
                              className="h-7 text-xs w-24"
                            />
                            <Input
                              placeholder="מק״ט"
                              value={v.sku ?? ""}
                              onChange={(e) => updateVariant(v.id, "sku", e.target.value || null)}
                              dir="ltr"
                              className="h-7 text-xs w-24"
                            />
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeVariant(v.id)} className="h-8 w-8 text-destructive hover:text-destructive shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                );
              })}

              {variants.length > 0 && (
                <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
                  <Package className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs text-primary font-medium">
                    {variants.filter(v => v.label.trim()).length} וריאנטים יישמרו עם המוצר
                  </span>
                </div>
              )}

              <div className="flex gap-2 sticky bottom-0 bg-background pt-2">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5">
                  <ChevronRight className="w-4 h-4" />חזרה
                </Button>
                <Button onClick={() => setStep(4)} className="flex-1 gap-1.5">
                  <ChevronLeft className="w-4 h-4" />המשך
                </Button>
              </div>
            </motion.div>
          )}

          {/* ============ STEP 4: Details & Save ============ */}
          {step === 4 && scrapedData && !savedProductId && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-6 pb-6 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-lg">פרטי המוצר ואישור</DialogTitle>
              </DialogHeader>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-background border border-border shrink-0">
                  {selectedImage ? (
                    <img src={selectedImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate text-sm">{editedName}</p>
                  {scrapedData.sku && <p className="text-xs text-muted-foreground">מק״ט: {scrapedData.sku}</p>}
                  {variants.filter(v => v.label.trim()).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {variants.filter(v => v.label.trim()).slice(0, 4).map(v => (
                        <Badge key={v.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {v.label}
                        </Badge>
                      ))}
                      {variants.filter(v => v.label.trim()).length > 4 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          +{variants.filter(v => v.label.trim()).length - 4}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">תיאור</label>
                  <Textarea value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} dir="rtl" rows={3} placeholder="תיאור המוצר..." className="resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">מחיר (₪)</label>
                    <Input type="number" min="0" step="0.01" value={editedPrice || ""} onChange={(e) => setEditedPrice(parseFloat(e.target.value) || 0)} dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">קטגוריה</label>
                    <select value={editedCategory} onChange={(e) => setEditedCategory(e.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm">
                      <option value="">ללא קטגוריה</option>
                      <option value="dry-food">מזון יבש</option>
                      <option value="wet-food">מזון רטוב</option>
                      <option value="treats">חטיפים</option>
                      <option value="toys">צעצועים</option>
                      <option value="accessories">אביזרים</option>
                      <option value="health">בריאות</option>
                      <option value="grooming">טיפוח</option>
                      <option value="food">מזון</option>
                    </select>
                  </div>
                </div>

                {scrapedData.source_url && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Link2 className="w-3 h-3" />
                    <span className="truncate" dir="ltr">{scrapedData.source_url}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)} className="gap-1.5">
                  <ChevronRight className="w-4 h-4" />חזרה
                </Button>
                <Button onClick={handleSaveProduct} disabled={saving || !editedName.trim() || editedPrice <= 0} className="flex-1 gap-1.5 font-bold">
                  {saving ? (<><Loader2 className="w-5 h-5 animate-spin ml-2" />שומר...</>) : (<><Check className="w-5 h-5" />שמור מוצר</>)}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ============ SUCCESS ============ */}
          {savedProductId && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="px-6 pb-6 space-y-4 text-center">
              <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-950 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold">המוצר נשמר בהצלחה!</h3>
              <p className="text-muted-foreground text-sm">{editedName}</p>
              {variants.filter(v => v.label.trim()).length > 0 && (
                <p className="text-xs text-muted-foreground">
                  כולל {variants.filter(v => v.label.trim()).length} וריאנטים
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => resetWizard()} className="flex-1 gap-1.5">
                  <RefreshCw className="w-4 h-4" />הוסף עוד
                </Button>
                <Button onClick={() => { handleClose(); navigate(`/product/${savedProductId}`); }} className="flex-1 gap-1.5">
                  <ExternalLink className="w-4 h-4" />צפה במוצר
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

// --- Weight/gram parsing helpers ---
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
