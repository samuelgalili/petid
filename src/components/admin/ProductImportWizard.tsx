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
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_BUSINESS_ID = "cf941cc4-e1d1-4d7c-8122-a5df81a1e53c";

type InputMethod = "url" | "barcode" | "name";
type WizardStep = 1 | 2 | 3;

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
}

interface ProductImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
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
        // For name-based search, create a manual product
        setScrapedData({
          title: url,
          description: null,
          images: [],
          basePrice: null,
          salePrice: null,
          sku: null,
          category: null,
          petType: null,
          source_url: "",
        });
        setEditedName(url);
        setSelectedImage("");
        setStep(2);
        setLoading(false);
        return;
      } else if (inputMethod === "barcode") {
        // For barcode, store as SKU and create manual entry
        setScrapedData({
          title: "",
          description: null,
          images: [],
          basePrice: null,
          salePrice: null,
          sku: url,
          category: null,
          petType: null,
          source_url: "",
        });
        setEditedName("");
        setSelectedImage("");
        setStep(2);
        setLoading(false);
        return;
      }

      // URL-based scraping
      const { data, error } = await supabase.functions.invoke(
        "import-products-from-url",
        {
          body: { url, maxProducts: 1, maxPages: 1, sameDomainOnly: true },
        }
      );

      if (error) throw new Error(error.message);

      if (!data?.success || !data?.data?.products?.length) {
        toast({
          title: "לא נמצא מוצר",
          description: "וודא שזה דף מוצר ספציפי",
          variant: "destructive",
        });
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
      setStep(2);
    } catch (err: any) {
      console.error("Fetch failed:", err);
      toast({
        title: "שגיאה בשליפת הנתונים",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Search Google Images
  const handleSearchGoogleImages = async () => {
    if (!editedName.trim()) return;
    setSearchingImage(true);
    setShowGoogleSearch(true);

    try {
      // Use a simple image search approach - open in new tab
      const query = encodeURIComponent(editedName);
      const searchUrl = `https://www.google.com/search?tbm=isch&q=${query}`;
      window.open(searchUrl, "_blank");
    } catch (err) {
      console.error("Image search failed:", err);
    } finally {
      setSearchingImage(false);
    }
  };

  // Manual image URL input
  const [manualImageUrl, setManualImageUrl] = useState("");
  const handleAddManualImage = () => {
    if (manualImageUrl.trim() && manualImageUrl.startsWith("http")) {
      setSelectedImage(manualImageUrl.trim());
      setManualImageUrl("");
    }
  };

  // Step 3: Save the product
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
          scrapedData?.basePrice &&
          scrapedData?.salePrice &&
          scrapedData.salePrice < scrapedData.basePrice
            ? scrapedData.basePrice
            : null,
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
      toast({
        title: "שגיאה בשמירה",
        description: err.message,
        variant: "destructive",
      });
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

  const stepLabels = ["הזנת מוצר", "תמונה ושם", "פרטים ואישור"];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-lg p-0 overflow-hidden"
        dir="rtl"
      >
        {/* Step indicator */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step > i + 1
                    ? "bg-primary text-primary-foreground"
                    : step === i + 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > i + 1 ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-xs hidden sm:inline ${
                  step === i + 1
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
              {i < 2 && (
                <div
                  className={`flex-1 h-0.5 mx-1 ${
                    step > i + 1 ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ============ STEP 1: Input ============ */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-6 pb-6 space-y-4"
            >
              <DialogHeader>
                <DialogTitle className="text-lg">
                  איך תרצה להוסיף את המוצר?
                </DialogTitle>
              </DialogHeader>

              {/* Method selector */}
              <div className="flex gap-2">
                {inputMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.key}
                      onClick={() => {
                        setInputMethod(method.key);
                        setInputValue("");
                      }}
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

              {/* Input field */}
              <div className="relative">
                <Input
                  placeholder={currentMethod.placeholder}
                  dir={inputMethod === "url" ? "ltr" : "rtl"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !loading && handleFetchProduct()
                  }
                  disabled={loading}
                  className="pr-4 pl-4 py-6 text-base"
                />
              </div>

              <Button
                onClick={handleFetchProduct}
                disabled={loading || !inputValue.trim()}
                className="w-full py-6 text-base font-bold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin ml-2" />
                    מעבד נתונים...
                  </>
                ) : (
                  <>
                    <ChevronLeft className="w-5 h-5 ml-2" />
                    המשך
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* ============ STEP 2: Image & Name ============ */}
          {step === 2 && scrapedData && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-6 pb-6 space-y-4"
            >
              <DialogHeader>
                <DialogTitle className="text-lg">
                  אישור תמונה ושם המוצר
                </DialogTitle>
              </DialogHeader>

              {/* Image preview */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-40 h-40 rounded-2xl border-2 border-border overflow-hidden bg-muted flex items-center justify-center">
                  {selectedImage ? (
                    <img
                      src={selectedImage}
                      alt={editedName}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ImageIcon className="w-10 h-10" />
                      <span className="text-xs">אין תמונה</span>
                    </div>
                  )}
                </div>

                {/* Image gallery from scraping */}
                {scrapedData.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto w-full py-1">
                    {scrapedData.images.slice(0, 6).map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(img)}
                        className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                          selectedImage === img
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border"
                        }`}
                      >
                        <img
                          src={img}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Image actions */}
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSearchGoogleImages}
                    className="flex-1 gap-1.5"
                  >
                    <Search className="w-4 h-4" />
                    חפש בגוגל
                  </Button>
                </div>

                {/* Manual image URL */}
                <div className="flex gap-2 w-full">
                  <Input
                    placeholder="הדבק קישור לתמונה..."
                    dir="ltr"
                    value={manualImageUrl}
                    onChange={(e) => setManualImageUrl(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleAddManualImage()
                    }
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleAddManualImage}
                    disabled={!manualImageUrl.trim()}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Name editing */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  שם המוצר
                </label>
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  dir="rtl"
                  className="text-base font-medium"
                />
              </div>

              {/* Navigation */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="gap-1.5"
                >
                  <ChevronRight className="w-4 h-4" />
                  חזרה
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!editedName.trim()}
                  className="flex-1 gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  המשך
                </Button>
              </div>
            </motion.div>
          )}

          {/* ============ STEP 3: Details & Save ============ */}
          {step === 3 && scrapedData && !savedProductId && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-6 pb-6 space-y-4"
            >
              <DialogHeader>
                <DialogTitle className="text-lg">
                  פרטי המוצר ואישור
                </DialogTitle>
              </DialogHeader>

              {/* Product summary card */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-background border border-border shrink-0">
                  {selectedImage ? (
                    <img
                      src={selectedImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate text-sm">{editedName}</p>
                  {scrapedData.sku && (
                    <p className="text-xs text-muted-foreground">
                      מק״ט: {scrapedData.sku}
                    </p>
                  )}
                </div>
              </div>

              {/* Editable fields */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">
                    תיאור
                  </label>
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    dir="rtl"
                    rows={3}
                    placeholder="תיאור המוצר..."
                    className="resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">
                      מחיר (₪)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editedPrice || ""}
                      onChange={(e) =>
                        setEditedPrice(parseFloat(e.target.value) || 0)
                      }
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">
                      קטגוריה
                    </label>
                    <select
                      value={editedCategory}
                      onChange={(e) => setEditedCategory(e.target.value)}
                      className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
                    >
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
                    <span className="truncate" dir="ltr">
                      {scrapedData.source_url}
                    </span>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="gap-1.5"
                >
                  <ChevronRight className="w-4 h-4" />
                  חזרה
                </Button>
                <Button
                  onClick={handleSaveProduct}
                  disabled={saving || !editedName.trim() || editedPrice <= 0}
                  className="flex-1 gap-1.5 font-bold"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin ml-2" />
                      שומר...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      שמור מוצר
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ============ SUCCESS ============ */}
          {savedProductId && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-6 pb-6 space-y-4 text-center"
            >
              <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-950 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold">המוצר נשמר בהצלחה!</h3>
              <p className="text-muted-foreground text-sm">{editedName}</p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetWizard();
                  }}
                  className="flex-1 gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  הוסף עוד
                </Button>
                <Button
                  onClick={() => {
                    handleClose();
                    navigate(`/product/${savedProductId}`);
                  }}
                  className="flex-1 gap-1.5"
                >
                  <ExternalLink className="w-4 h-4" />
                  צפה במוצר
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
  return matches && matches.length >= 2
    ? parseFloat(matches[1])
    : parseWeightMin(range);
}
function parseGramsMin(amount: string): number | null {
  const match = amount.match(/(\d+(?:\.\d+)?)/);
  return match ? Math.round(parseFloat(match[1])) : null;
}
function parseGramsMax(amount: string): number | null {
  const matches = amount.match(/(\d+(?:\.\d+)?)/g);
  return matches && matches.length >= 2
    ? Math.round(parseFloat(matches[1]))
    : parseGramsMin(amount);
}
