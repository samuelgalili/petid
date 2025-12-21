import { useState, useRef, useCallback } from "react";
import { Sparkles, ImageIcon, Loader2, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProductData {
  id?: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  sale_price?: number | null;
  image_url: string;
  category: string | null;
  in_stock: boolean | null;
  is_featured: boolean | null;
  sku?: string | null;
  flavors?: string[] | null;
  pet_type?: string | null;
}

interface EnrichedData {
  name?: string;
  description?: string;
  category?: string;
  dimensions?: string;
  sizes?: string[];
  colors?: string[];
  flavors?: string[];
  benefits?: string[];
  feedingGuide?: string;
  brandWebsite?: string;
  suggestedPrice?: number;
  priceReason?: string;
  petType?: string;
  imageSearchQuery?: string;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Partial<ProductData> | null;
  onProductChange: (product: Partial<ProductData>) => void;
  onSave: () => void;
  isSaving: boolean;
  onImageUpload: (file: File) => Promise<void>;
  isUploading: boolean;
}

const categories = [
  { value: "dry-food", label: "אוכל יבש" },
  { value: "wet-food", label: "אוכל רטוב" },
  { value: "treats", label: "חטיפים" },
  { value: "toys", label: "צעצועים" },
  { value: "accessories", label: "אביזרים" },
  { value: "health", label: "בריאות" },
  { value: "grooming", label: "טיפוח" },
  { value: "beds", label: "מיטות" },
  { value: "collars", label: "קולרים ורצועות" },
  { value: "bowls", label: "קערות" },
  { value: "other", label: "אחר" },
];

export const ProductFormDialog = ({
  open,
  onOpenChange,
  product,
  onProductChange,
  onSave,
  isSaving,
  onImageUpload,
  isUploading,
}: ProductFormDialogProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichedData, setEnrichedData] = useState<EnrichedData | null>(null);
  const [showEnrichmentDetails, setShowEnrichmentDetails] = useState(false);
  const enrichTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const enrichProduct = useCallback(async (productName: string, sku?: string) => {
    if (!productName && !sku) return;
    
    setIsEnriching(true);
    setEnrichedData(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("enrich-product-ai", {
        body: { 
          productName, 
          sku,
          category: product?.category 
        },
      });

      if (error) {
        console.error("Enrichment error:", error);
        toast({
          title: "שגיאה בהעשרה",
          description: "לא ניתן להעשיר את המוצר כרגע",
          variant: "destructive",
        });
        return;
      }

      if (data?.success && data?.data) {
        const enriched = data.data as EnrichedData;
        setEnrichedData(enriched);
        setShowEnrichmentDetails(true);
        
        // Auto-fill fields
        const updates: Partial<ProductData> = { ...product };
        
        // Fill name if enriched from SKU search
        if (enriched.name && !product?.name) {
          updates.name = enriched.name;
        }
        
        if (enriched.description) {
          updates.description = enriched.description;
        }
        
        if (enriched.suggestedPrice && !product?.price) {
          updates.price = enriched.suggestedPrice;
        }
        
        if (enriched.flavors && enriched.flavors.length > 0) {
          updates.flavors = enriched.flavors;
        }
        
        if (enriched.petType) {
          updates.pet_type = enriched.petType === "dog" ? "dog" : 
                            enriched.petType === "cat" ? "cat" : 
                            enriched.petType === "both" ? "both" : "other";
        }
        
        // Map enriched category to our category values
        if (enriched.category && !product?.category) {
          const categoryMap: Record<string, string> = {
            "אוכל יבש": "dry-food",
            "אוכל רטוב": "wet-food",
            "חטיפים": "treats",
            "צעצועים": "toys",
            "אביזרים": "accessories",
            "בריאות": "health",
            "טיפוח": "grooming",
            "מיטות": "beds",
            "קולרים ורצועות": "collars",
            "קערות": "bowls",
          };
          const mappedCategory = Object.entries(categoryMap).find(
            ([key]) => enriched.category?.includes(key)
          );
          if (mappedCategory) {
            updates.category = mappedCategory[1];
          }
        }
        
        onProductChange(updates);
        
        toast({
          title: "המוצר הועשר בהצלחה",
          description: sku ? "המידע נמשך מהרשת ועודכן" : "המידע הושלם אוטומטית",
        });
      }
    } catch (err) {
      console.error("Enrichment failed:", err);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהעשרת המוצר",
        variant: "destructive",
      });
    } finally {
      setIsEnriching(false);
    }
  }, [product, onProductChange, toast]);

  const handleNameChange = (name: string) => {
    onProductChange({ ...product, name });
    
    // Clear any pending enrichment
    if (enrichTimeoutRef.current) {
      clearTimeout(enrichTimeoutRef.current);
    }
    
    // Only auto-enrich for new products after 3 chars
    if (name.length >= 3 && !product?.id) {
      enrichTimeoutRef.current = setTimeout(() => {
        enrichProduct(name, product?.sku || undefined);
      }, 2000);
    }
  };

  const handleSkuChange = (sku: string) => {
    onProductChange({ ...product, sku });
    
    if (enrichTimeoutRef.current) {
      clearTimeout(enrichTimeoutRef.current);
    }
    
    // Trigger enrichment after 5+ chars for SKU (more reliable search)
    if (sku.length >= 5 && !product?.id) {
      enrichTimeoutRef.current = setTimeout(() => {
        enrichProduct(product?.name || "", sku);
      }, 1500);
    }
  };

  const handleSkuSearch = () => {
    if (product?.sku && product.sku.length >= 3) {
      enrichProduct(product?.name || "", product.sku);
    } else {
      toast({
        title: "מק״ט קצר מדי",
        description: "הזן לפחות 3 תווים לחיפוש",
        variant: "destructive",
      });
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {product?.id ? "עריכת מוצר" : "הוספת מוצר"}
            {isEnriching && (
              <Badge variant="secondary" className="animate-pulse">
                <Sparkles className="w-3 h-3 ml-1" />
                מחפש ברשת...
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            הזן מק״ט לחיפוש אוטומטי של פרטי המוצר מהרשת
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }} className="space-y-4">
          {/* SKU with Search Button - Primary Input */}
          <div className="bg-muted/30 p-4 rounded-lg border border-dashed border-primary/30">
            <Label className="flex items-center gap-2 text-primary font-medium">
              <Search className="w-4 h-4" />
              חיפוש לפי מק״ט
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              הזן מק״ט והמערכת תמלא את כל הפרטים אוטומטית מהרשת
            </p>
            <div className="flex gap-2">
              <Input
                value={product.sku || ""}
                onChange={(e) => handleSkuChange(e.target.value)}
                placeholder="לדוגמה: 7290016026429"
                className="flex-1"
              />
              <Button 
                type="button" 
                onClick={handleSkuSearch}
                disabled={isEnriching || !product.sku}
                variant="default"
              >
                {isEnriching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4 ml-2" />
                    חפש
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Image Upload */}
          <div className="flex justify-center">
            <div 
              className="w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden relative"
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              ) : product.image_url ? (
                <img src={product.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                  <span className="text-xs">העלה תמונה</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImageUpload(file);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Product Name */}
            <div className="col-span-2">
              <Label>שם המוצר *</Label>
              <div className="relative">
                <Input
                  value={product.name || ""}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  placeholder="ימולא אוטומטית מחיפוש מק״ט"
                  className="pl-10"
                />
                {isEnriching && (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                )}
              </div>
            </div>

            {/* Category */}
            <div>
              <Label>קטגוריה</Label>
              <Select 
                value={product.category || ""} 
                onValueChange={(value) => onProductChange({ ...product, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pet Type */}
            <div>
              <Label>סוג חיה</Label>
              <Select 
                value={product.pet_type || ""} 
                onValueChange={(value) => onProductChange({ ...product, pet_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר סוג" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dog">כלב</SelectItem>
                  <SelectItem value="cat">חתול</SelectItem>
                  <SelectItem value="both">כלב וחתול</SelectItem>
                  <SelectItem value="other">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Description */}
            <div className="col-span-2">
              <Label>תיאור</Label>
              <Textarea
                value={product.description || ""}
                onChange={(e) => onProductChange({ ...product, description: e.target.value })}
                rows={3}
                placeholder="ימולא אוטומטית מחיפוש..."
              />
            </div>

            {/* Enrichment Details Panel */}
            {showEnrichmentDetails && enrichedData && (
              <div className="col-span-2 bg-primary/5 rounded-lg p-4 space-y-3 border border-primary/20">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    מידע שנמשך מהרשת
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEnrichmentDetails(false)}
                  >
                    הסתר
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {enrichedData.dimensions && (
                    <div>
                      <span className="text-muted-foreground">מידות:</span>
                      <p>{enrichedData.dimensions}</p>
                    </div>
                  )}
                  
                  {enrichedData.sizes && enrichedData.sizes.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">גדלים זמינים:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {enrichedData.sizes.map((size, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{size}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {enrichedData.colors && enrichedData.colors.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">צבעים:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {enrichedData.colors.map((color, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{color}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {enrichedData.flavors && enrichedData.flavors.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">טעמים:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {enrichedData.flavors.map((flavor, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{flavor}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {enrichedData.benefits && enrichedData.benefits.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">יתרונות המוצר:</span>
                      <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                        {enrichedData.benefits.map((benefit, i) => (
                          <li key={i}>{benefit}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {enrichedData.feedingGuide && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">הוראות האכלה מומלצות:</span>
                      <p className="text-xs mt-1 whitespace-pre-wrap">{enrichedData.feedingGuide}</p>
                    </div>
                  )}
                  
                  {enrichedData.brandWebsite && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">אתר המותג הרשמי:</span>
                      <a 
                        href={enrichedData.brandWebsite.startsWith("http") ? enrichedData.brandWebsite : `https://${enrichedData.brandWebsite}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 text-xs mt-1"
                      >
                        {enrichedData.brandWebsite}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  
                  {enrichedData.priceReason && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">מקור המחיר המומלץ:</span>
                      <p className="text-xs mt-1">{enrichedData.priceReason}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Price with suggestion */}
            <div>
              <Label className="flex items-center gap-2">
                מחיר *
                {enrichedData?.suggestedPrice && (
                  <Badge 
                    variant="outline" 
                    className="text-xs cursor-pointer hover:bg-primary/10"
                    onClick={() => onProductChange({ ...product, price: enrichedData.suggestedPrice! })}
                  >
                    מומלץ: ₪{enrichedData.suggestedPrice}
                  </Badge>
                )}
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={product.price || ""}
                onChange={(e) => onProductChange({ ...product, price: parseFloat(e.target.value) })}
                required
              />
            </div>

            {/* Sale Price */}
            <div>
              <Label>מחיר הנחה</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={product.sale_price || ""}
                onChange={(e) => onProductChange({ ...product, sale_price: parseFloat(e.target.value) || null })}
                placeholder="השאר ריק אם אין הנחה"
              />
            </div>

            {/* Original Price (for display) */}
            <div>
              <Label>מחיר מקורי (לתצוגה)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={product.original_price || ""}
                onChange={(e) => onProductChange({ ...product, original_price: parseFloat(e.target.value) || null })}
                placeholder="מחיר לפני הנחה"
              />
            </div>

            {/* Switches */}
            <div className="col-span-2 flex gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={product.in_stock ?? true}
                  onCheckedChange={(checked) => onProductChange({ ...product, in_stock: checked })}
                />
                <Label>במלאי</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={product.is_featured ?? false}
                  onCheckedChange={(checked) => onProductChange({ ...product, is_featured: checked })}
                />
                <Label>מקודם</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => enrichProduct(product.name || "", product.sku || undefined)}
              disabled={isEnriching || (!product.name && !product.sku)}
            >
              {isEnriching ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מחפש...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 ml-2" />
                  העשר עם AI
                </>
              )}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "שומר..." : "שמור"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
