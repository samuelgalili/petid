import { useState, useRef, useCallback } from "react";
import { Sparkles, ImageIcon, Loader2, ExternalLink } from "lucide-react";
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
  description?: string;
  dimensions?: string;
  colors?: string[];
  flavors?: string[];
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
  { value: "food", label: "מזון" },
  { value: "treats", label: "חטיפים" },
  { value: "toys", label: "צעצועים" },
  { value: "accessories", label: "אביזרים" },
  { value: "health", label: "בריאות" },
  { value: "grooming", label: "טיפוח" },
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
        
        if (enriched.description && !product?.description) {
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
                            enriched.petType === "cat" ? "cat" : null;
        }
        
        onProductChange(updates);
        
        toast({
          title: "המוצר הועשר בהצלחה",
          description: "המידע הושלם אוטומטית - ניתן לערוך",
        });
      }
    } catch (err) {
      console.error("Enrichment failed:", err);
    } finally {
      setIsEnriching(false);
    }
  }, [product, onProductChange, toast]);

  const handleNameChange = (name: string) => {
    onProductChange({ ...product, name });
    
    // Debounce enrichment
    if (enrichTimeoutRef.current) {
      clearTimeout(enrichTimeoutRef.current);
    }
    
    if (name.length >= 3 && !product?.id) { // Only auto-enrich for new products
      enrichTimeoutRef.current = setTimeout(() => {
        enrichProduct(name, product?.sku || undefined);
      }, 1500);
    }
  };

  const handleSkuChange = (sku: string) => {
    onProductChange({ ...product, sku });
    
    if (enrichTimeoutRef.current) {
      clearTimeout(enrichTimeoutRef.current);
    }
    
    if (sku.length >= 5 && !product?.id) {
      enrichTimeoutRef.current = setTimeout(() => {
        enrichProduct(product?.name || "", sku);
      }, 1500);
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
                מעשיר...
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }} className="space-y-4">
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
            {/* Product Name with AI enrichment */}
            <div className="col-span-2">
              <Label className="flex items-center gap-2">
                שם המוצר *
                {!product.id && (
                  <span className="text-xs text-muted-foreground font-normal">
                    (הקלד 3 תווים להעשרה אוטומטית)
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  value={product.name || ""}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  className="pl-10"
                />
                {isEnriching && (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                )}
              </div>
            </div>

            {/* SKU */}
            <div>
              <Label>מק״ט</Label>
              <Input
                value={product.sku || ""}
                onChange={(e) => handleSkuChange(e.target.value)}
                placeholder="לדוגמה: ABC123"
              />
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
            
            {/* Description */}
            <div className="col-span-2">
              <Label>תיאור</Label>
              <Textarea
                value={product.description || ""}
                onChange={(e) => onProductChange({ ...product, description: e.target.value })}
                rows={3}
                placeholder="תיאור המוצר יושלם אוטומטית..."
              />
            </div>

            {/* Enrichment Details Panel */}
            {showEnrichmentDetails && enrichedData && (
              <div className="col-span-2 bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    מידע שהושלם אוטומטית
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
                  
                  {enrichedData.feedingGuide && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">הוראות האכלה:</span>
                      <p className="text-xs mt-1">{enrichedData.feedingGuide}</p>
                    </div>
                  )}
                  
                  {enrichedData.brandWebsite && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">אתר המותג:</span>
                      <a 
                        href={enrichedData.brandWebsite} 
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
                      <span className="text-muted-foreground">הסבר למחיר המומלץ:</span>
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
                  מעשיר...
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
