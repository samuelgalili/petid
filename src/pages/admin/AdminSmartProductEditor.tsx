/**
 * AdminSmartProductEditor — Full-page product editor with:
 * 1. Core fields (name, brand, category, price, stock, image drag & drop)
 * 2. Smart Intelligence (medical tags, breed tags, AI analysis)
 * 3. Subscription logic (auto-restock toggle, interval days)
 * 4. Live Preview card (right panel)
 */

import { useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Package, Upload, ImageIcon, X, Sparkles, Loader2, Save,
  Heart, ShieldCheck, Repeat, Brain, Tag, Dog, Cat,
  DollarSign, BarChart3, Star, ShoppingCart,
} from "lucide-react";

const DEFAULT_BUSINESS_ID = "cf941cc4-e1d1-4d7c-8122-a5df81a1e53c";

const CATEGORIES = [
  { value: "dry-food", label: "אוכל יבש" },
  { value: "wet-food", label: "אוכל רטוב" },
  { value: "treats", label: "חטיפים" },
  { value: "toys", label: "צעצועים" },
  { value: "accessories", label: "אביזרים" },
  { value: "health", label: "בריאות / תרופות" },
  { value: "grooming", label: "טיפוח" },
  { value: "beds", label: "מיטות" },
  { value: "collars", label: "קולרים ורצועות" },
  { value: "bowls", label: "קערות" },
  { value: "other", label: "אחר" },
];

const MEDICAL_TAGS = [
  { value: "urinary", label: "בעיות שתן" },
  { value: "gastro", label: "עיכול רגיש" },
  { value: "weight-loss", label: "ירידה במשקל" },
  { value: "renal", label: "כליות" },
  { value: "diabetic", label: "סוכרת" },
  { value: "dermatosis", label: "עור רגיש" },
  { value: "hypoallergenic", label: "היפואלרגני" },
  { value: "hairball", label: "כדורי שיער" },
  { value: "puppy", label: "גורים" },
  { value: "senior", label: "מבוגרים" },
  { value: "joint", label: "מפרקים" },
  { value: "dental", label: "שיניים" },
];

const POPULAR_BREEDS = [
  "שי טסו", "גולדן רטריבר", "לברדור", "פודל", "בולדוג צרפתי",
  "האסקי", "ביגל", "יורקשייר", "צ'יוואווה", "ג'רמן שפרד",
  "פקינז", "מאלטז", "פומרניאן", "בורדר קולי", "קוקר ספניאל",
  "פרסי", "סיאמי", "מיין קון", "בריטי קצר שיער", "רגדול",
];

interface ProductForm {
  name: string;
  brand: string;
  description: string;
  category: string;
  price: number;
  sale_price: number | null;
  in_stock: boolean;
  stock_quantity: number;
  image_url: string;
  pet_type: string;
  medical_tags: string[];
  breed_tags: string[];
  auto_restock: boolean;
  restock_interval_days: number | null;
  is_featured: boolean;
}

const defaultForm: ProductForm = {
  name: "",
  brand: "",
  description: "",
  category: "",
  price: 0,
  sale_price: null,
  in_stock: true,
  stock_quantity: 0,
  image_url: "",
  pet_type: "dog",
  medical_tags: [],
  breed_tags: [],
  auto_restock: false,
  restock_interval_days: null,
  is_featured: false,
};

const AdminSmartProductEditor = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ProductForm>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const updateForm = (field: keyof ProductForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleTag = (field: "medical_tags" | "breed_tags", value: string) => {
    setForm(prev => {
      const current = prev[field];
      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter(t => t !== value)
          : [...current, value],
      };
    });
  };

  // Image upload
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "קובץ לא תקין", description: "יש להעלות תמונה בלבד", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `products/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
      updateForm("image_url", publicUrl);
      toast({ title: "התמונה הועלתה בהצלחה" });
    } catch (err: any) {
      toast({ title: "שגיאה בהעלאה", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  }, [handleImageUpload]);

  // AI Analysis
  const handleAIAnalysis = async () => {
    if (!form.name && !form.description) {
      toast({ title: "נדרש שם או תיאור מוצר", variant: "destructive" });
      return;
    }
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-product-ai", {
        body: {
          productName: form.name,
          category: form.category,
          description: form.description,
        },
      });
      if (error) throw error;

      if (data?.success && data?.data) {
        const enriched = data.data;
        // Auto-suggest tags based on AI analysis
        const suggestedMedical: string[] = [];
        const text = `${form.name} ${form.description} ${enriched.description || ""}`.toLowerCase();

        MEDICAL_TAGS.forEach(tag => {
          if (text.includes(tag.label) || text.includes(tag.value)) {
            suggestedMedical.push(tag.value);
          }
        });

        // Special keyword matching
        if (text.includes("urinary") || text.includes("שתן")) suggestedMedical.push("urinary");
        if (text.includes("gastro") || text.includes("עיכול")) suggestedMedical.push("gastro");
        if (text.includes("renal") || text.includes("כליות")) suggestedMedical.push("renal");
        if (text.includes("diet") || text.includes("דיאטה") || text.includes("light")) suggestedMedical.push("weight-loss");
        if (text.includes("puppy") || text.includes("גור")) suggestedMedical.push("puppy");
        if (text.includes("senior") || text.includes("מבוגר")) suggestedMedical.push("senior");
        if (text.includes("hypoallergenic") || text.includes("היפואלרגני")) suggestedMedical.push("hypoallergenic");

        const uniqueTags = [...new Set([...form.medical_tags, ...suggestedMedical])];
        updateForm("medical_tags", uniqueTags);

        // Fill description if empty
        if (!form.description && enriched.description) {
          updateForm("description", enriched.description);
        }
        // Fill category if empty
        if (!form.category && enriched.category) {
          const mapped = CATEGORIES.find(c => enriched.category?.includes(c.label));
          if (mapped) updateForm("category", mapped.value);
        }

        toast({
          title: "ניתוח AI הושלם",
          description: `נמצאו ${uniqueTags.length} תגיות רפואיות`,
        });
      }
    } catch (err: any) {
      toast({ title: "שגיאה בניתוח AI", description: err.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save product
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "שם מוצר הוא שדה חובה", variant: "destructive" });
      return;
    }
    if (form.price <= 0) {
      toast({ title: "יש להזין מחיר תקין", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("business_products").insert({
        business_id: DEFAULT_BUSINESS_ID,
        name: form.name.trim(),
        brand: form.brand || null,
        description: form.description || null,
        category: form.category || null,
        price: form.price,
        sale_price: form.sale_price,
        image_url: form.image_url || "/placeholder.svg",
        in_stock: form.in_stock,
        pet_type: form.pet_type || "dog",
        is_featured: form.is_featured,
        medical_tags: form.medical_tags,
        breed_tags: form.breed_tags,
        auto_restock: form.auto_restock,
        restock_interval_days: form.restock_interval_days,
        special_diet: form.medical_tags, // sync with special_diet
      } as any);

      if (error) throw error;
      toast({ title: "המוצר נשמר בהצלחה!" });
      navigate("/admin/products");
    } catch (err: any) {
      toast({ title: "שגיאה בשמירה", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Category label
  const categoryLabel = useMemo(() => {
    return CATEGORIES.find(c => c.value === form.category)?.label || "לא נבחר";
  }, [form.category]);

  return (
    <AdminLayout title="עורך מוצר חכם" icon={Package}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 min-h-[calc(100vh-140px)]" dir="rtl">
        {/* LEFT — Form */}
        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="space-y-6 pr-2 pb-6">
            {/* Section 1: Core Fields */}
            <Card className="border-none bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  פרטי מוצר
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="text-xs">שם מוצר *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => updateForm("name", e.target.value)}
                      placeholder="שם המוצר"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">מותג</Label>
                    <Input
                      value={form.brand}
                      onChange={(e) => updateForm("brand", e.target.value)}
                      placeholder="למשל: Royal Canin"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">קטגוריה</Label>
                    <Select value={form.category} onValueChange={(v) => updateForm("category", v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="בחר קטגוריה" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">תיאור</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    placeholder="תיאור המוצר..."
                    className="mt-1 min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs">מחיר (₪) *</Label>
                    <Input
                      type="number"
                      value={form.price || ""}
                      onChange={(e) => updateForm("price", parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">מחיר מבצע (₪)</Label>
                    <Input
                      type="number"
                      value={form.sale_price ?? ""}
                      onChange={(e) => updateForm("sale_price", e.target.value ? parseFloat(e.target.value) : null)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">סוג חיה</Label>
                    <Select value={form.pet_type} onValueChange={(v) => updateForm("pet_type", v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dog">🐕 כלב</SelectItem>
                        <SelectItem value="cat">🐈 חתול</SelectItem>
                        <SelectItem value="both">🐾 שניהם</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.in_stock} onCheckedChange={(v) => updateForm("in_stock", v)} />
                    <Label className="text-xs">במלאי</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_featured} onCheckedChange={(v) => updateForm("is_featured", v)} />
                    <Label className="text-xs">מוצר מומלץ</Label>
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <Label className="text-xs">תמונה</Label>
                  <div
                    className={`mt-1 border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                      isDragging ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/40"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                  >
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin" />
                    ) : form.image_url ? (
                      <div className="relative">
                        <img src={form.image_url} alt="" className="w-24 h-24 mx-auto rounded-xl object-cover" />
                        <button
                          onClick={(e) => { e.stopPropagation(); updateForm("image_url", ""); }}
                          className="absolute top-0 right-1/2 translate-x-12 -translate-y-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-xs text-muted-foreground">גרור תמונה לכאן או לחץ לבחירה</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                  />
                  {/* Or paste URL */}
                  <Input
                    value={form.image_url}
                    onChange={(e) => updateForm("image_url", e.target.value)}
                    placeholder="או הדבק קישור לתמונה..."
                    className="mt-2 text-xs"
                    dir="ltr"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Smart Intelligence */}
            <Card className="border-none bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    אינטליגנציה חכמה
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAIAnalysis}
                    disabled={isAnalyzing}
                    className="gap-1.5"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    ניתוח AI
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Medical Tags */}
                <div>
                  <Label className="text-xs flex items-center gap-1.5 mb-2">
                    <Heart className="w-3.5 h-3.5 text-destructive" strokeWidth={1.5} />
                    תגיות רפואיות
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {MEDICAL_TAGS.map(tag => (
                      <button
                        key={tag.value}
                        onClick={() => toggleTag("medical_tags", tag.value)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                          form.medical_tags.includes(tag.value)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/30 text-muted-foreground border-border/30 hover:border-primary/40"
                        }`}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Breed Tags */}
                <div>
                  <Label className="text-xs flex items-center gap-1.5 mb-2">
                    <Dog className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                    גזעים ספציפיים
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_BREEDS.map(breed => (
                      <button
                        key={breed}
                        onClick={() => toggleTag("breed_tags", breed)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                          form.breed_tags.includes(breed)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/30 text-muted-foreground border-border/30 hover:border-primary/40"
                        }`}
                      >
                        {breed}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Subscription Logic */}
            <Card className="border-none bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  מנוי ומילוי מחדש
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">זמין למילוי אוטומטי</p>
                    <p className="text-[10px] text-muted-foreground">
                      מאפשר למשתמשים להירשם למנוי על מוצר זה
                    </p>
                  </div>
                  <Switch
                    checked={form.auto_restock}
                    onCheckedChange={(v) => updateForm("auto_restock", v)}
                  />
                </div>

                {form.auto_restock && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="pt-2"
                  >
                    <Label className="text-xs">כמה ימים מוצר זה מחזיק בממוצע?</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        value={form.restock_interval_days ?? ""}
                        onChange={(e) => updateForm("restock_interval_days", e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="30"
                        className="w-24"
                      />
                      <span className="text-xs text-muted-foreground">ימים</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      המערכת תציע למשתמש להזמין מחדש בהתאם
                    </p>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={isSaving || !form.name.trim() || form.price <= 0}
              className="w-full py-6 text-base font-bold gap-2"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              שמור מוצר
            </Button>
          </div>
        </ScrollArea>

        {/* RIGHT — Live Preview */}
        <div className="hidden lg:block">
          <div className="sticky top-4 space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" strokeWidth={1.5} />
              תצוגה מקדימה
            </h3>

            {/* Shop Card Preview */}
            <Card className="overflow-hidden border-none shadow-lg">
              <div className="aspect-square bg-muted/30 relative">
                {form.image_url ? (
                  <img src={form.image_url} alt={form.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-muted-foreground/20" />
                  </div>
                )}
                {form.sale_price && form.sale_price < form.price && (
                  <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px]">
                    -{Math.round(((form.price - form.sale_price) / form.price) * 100)}%
                  </Badge>
                )}
                {form.is_featured && (
                  <Badge className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] gap-0.5">
                    <Star className="w-2.5 h-2.5" fill="currentColor" />
                    מומלץ
                  </Badge>
                )}
                {!form.in_stock && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <Badge variant="secondary" className="text-xs">אזל מהמלאי</Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-3 space-y-2">
                {form.brand && (
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">{form.brand}</p>
                )}
                <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
                  {form.name || "שם המוצר"}
                </h4>
                <div className="flex items-center gap-2">
                  {form.sale_price && form.sale_price < form.price ? (
                    <>
                      <span className="text-base font-bold text-primary">₪{form.sale_price}</span>
                      <span className="text-xs text-muted-foreground line-through">₪{form.price}</span>
                    </>
                  ) : (
                    <span className="text-base font-bold text-primary">
                      {form.price > 0 ? `₪${form.price}` : "—"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-[9px] px-1.5">
                    {categoryLabel}
                  </Badge>
                  {form.pet_type === "dog" && <Dog className="w-3 h-3 text-muted-foreground" />}
                  {form.pet_type === "cat" && <Cat className="w-3 h-3 text-muted-foreground" />}
                </div>
              </CardContent>
            </Card>

            {/* Tags Preview */}
            {(form.medical_tags.length > 0 || form.breed_tags.length > 0) && (
              <Card className="border-none">
                <CardContent className="p-3 space-y-2">
                  {form.medical_tags.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1">תגיות רפואיות</p>
                      <div className="flex flex-wrap gap-1">
                        {form.medical_tags.map(tag => {
                          const info = MEDICAL_TAGS.find(t => t.value === tag);
                          return (
                            <Badge key={tag} variant="outline" className="text-[9px] gap-0.5">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              {info?.label || tag}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {form.breed_tags.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1">גזעים</p>
                      <div className="flex flex-wrap gap-1">
                        {form.breed_tags.map(breed => (
                          <Badge key={breed} variant="outline" className="text-[9px]">
                            {breed}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Subscription Preview */}
            {form.auto_restock && (
              <Card className="border-none bg-primary/5">
                <CardContent className="p-3 flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">מנוי זמין</p>
                    <p className="text-[10px] text-muted-foreground">
                      {form.restock_interval_days
                        ? `מילוי כל ${form.restock_interval_days} ימים`
                        : "תקופת מילוי לא הוגדרה"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Feed Preview */}
            <Card className="border-none">
              <CardHeader className="pb-2 pt-3">
                <p className="text-[10px] font-semibold text-muted-foreground">תצוגה בפיד</p>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/20">
                  {form.image_url ? (
                    <img src={form.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate">{form.name || "שם המוצר"}</p>
                    <p className="text-[10px] text-primary font-bold">
                      {form.price > 0 ? `₪${form.sale_price && form.sale_price < form.price ? form.sale_price : form.price}` : "—"}
                    </p>
                  </div>
                  <Button size="sm" className="h-7 text-[10px] px-2.5 gap-1">
                    <ShoppingCart className="w-3 h-3" />
                    הוסף
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSmartProductEditor;
