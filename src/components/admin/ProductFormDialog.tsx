import { useState, useRef, useCallback } from "react";
import { Sparkles, ImageIcon, Loader2, ExternalLink, Search, Upload, Globe, X, Check, FileSpreadsheet, Package, ChevronDown, ChevronUp, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BulkProductImport } from "./BulkProductImport";
import { CompetitorPriceManager } from "./products/CompetitorPriceManager";

interface ScrapedProductVariant {
  label: string;
  weight?: number | null;
  weight_unit?: string | null;
  price?: number | null;
  sale_price?: number | null;
  sku?: string | null;
  options?: Record<string, string>;
}

interface ScrapedProduct {
  source_url: string;
  title: string;
  brand: string | null;
  description: string | null;
  images: string[];
  currency: string | null;
  basePrice: number | null;
  salePrice: number | null;
  sku: string | null;
  variants: ScrapedProductVariant[];
}

interface ProductData {
  id?: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  sale_price?: number | null;
  image_url: string;
  images?: string[] | null;
  category: string | null;
  in_stock: boolean | null;
  is_featured: boolean | null;
  sku?: string | null;
  flavors?: string[] | null;
  pet_type?: string | null;
  weight_unit?: string | null;
  price_per_weight?: number | null;
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
  salePrice?: number;
  priceReason?: string;
  petType?: string;
  imageSearchQuery?: string;
  imageUrl?: string;
  allImageUrls?: string[];
  variants?: { name: string; value: string; price?: number }[];
  weight?: string;
  weightUnit?: string;
  sku?: string;
  brand?: string;
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
  const additionalImageInputRef = useRef<HTMLInputElement>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichedData, setEnrichedData] = useState<EnrichedData | null>(null);
  const [showEnrichmentDetails, setShowEnrichmentDetails] = useState(false);
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState("");
  const [imageSearchResults, setImageSearchResults] = useState<string[]>([]);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [selectedSearchImages, setSelectedSearchImages] = useState<string[]>([]);
  const [newFlavor, setNewFlavor] = useState("");
  const enrichTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [productUrl, setProductUrl] = useState("");
  
  // List import review modal state
  const [showImportReview, setShowImportReview] = useState(false);
  const [scrapedProducts, setScrapedProducts] = useState<ScrapedProduct[]>([]);
  const [selectedProductIndices, setSelectedProductIndices] = useState<Set<number>>(new Set());
  const [importDebugInfo, setImportDebugInfo] = useState<{ productLinksFound: number; pagesCrawled: number } | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const enrichProduct = useCallback(async (productName: string, sku?: string, url?: string) => {
    if (!productName && !sku && !url) return;
    
    setIsEnriching(true);
    setEnrichedData(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("enrich-product-ai", {
        body: { 
          productName, 
          sku,
          category: product?.category,
          productUrl: url
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
        
        // Fill name if enriched
        if (enriched.name) {
          updates.name = enriched.name;
        }
        
        if (enriched.description) {
          updates.description = enriched.description;
        }
        
        // Fill price - prefer sale price if available
        if (enriched.suggestedPrice) {
          updates.price = enriched.suggestedPrice;
        }
        if (enriched.salePrice) {
          updates.sale_price = enriched.salePrice;
          updates.original_price = enriched.suggestedPrice || null;
        }
        
        // Fill flavors - combine with sizes for variants display
        const allVariants: string[] = [];
        if (enriched.flavors && enriched.flavors.length > 0) {
          allVariants.push(...enriched.flavors);
        }
        if (enriched.sizes && enriched.sizes.length > 0) {
          allVariants.push(...enriched.sizes);
        }
        if (allVariants.length > 0) {
          updates.flavors = allVariants;
        }
        
        if (enriched.petType) {
          updates.pet_type = enriched.petType === "dog" ? "dog" : 
                            enriched.petType === "cat" ? "cat" : 
                            enriched.petType === "both" ? "both" : "other";
        }
        
        // Auto-fill image if found
        if (enriched.imageUrl) {
          updates.image_url = enriched.imageUrl;
        }
        
        // Add additional images
        if (enriched.allImageUrls && enriched.allImageUrls.length > 1) {
          updates.images = enriched.allImageUrls.slice(1);
        }
        
        // Fill SKU if found
        if (enriched.sku && !product?.sku) {
          updates.sku = enriched.sku;
        }
        
        // Fill weight unit if available
        if (enriched.weightUnit) {
          updates.weight_unit = enriched.weightUnit;
        }
        
        // Map enriched category to our category values
        if (enriched.category) {
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
        
        const source = url ? "מ-URL" : (sku ? "ממק״ט" : "מחיפוש");
        toast({
          title: "המוצר הועשר בהצלחה",
          description: `המידע נמשך ${source} ועודכן`,
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

  // Helper function to process scraped product data (used by both URL and SKU imports)
  const processScrapedData = useCallback((scraped: any) => {
    console.log("Processing scraped product data:", scraped);
    
    // Build updates from scraped data
    const updates: Partial<ProductData> = { ...product };
    
    // Extract product info
    const productInfo = scraped.product || scraped;
    
    // Title
    if (productInfo.title) {
      updates.name = productInfo.title;
    }
    
    // Description
    if (productInfo.description) {
      updates.description = productInfo.description;
    }
    
    // Images
    const images = productInfo.images || scraped.images || [];
    if (images.length > 0) {
      updates.image_url = images[0];
      if (images.length > 1) {
        updates.images = images.slice(1);
      }
    }
    
    // Base price and sale price
    if (productInfo.basePrice) {
      updates.price = productInfo.basePrice;
    }
    if (productInfo.salePrice) {
      updates.sale_price = productInfo.salePrice;
      if (!updates.price && productInfo.salePrice) {
        // If only sale price, it becomes the price
        updates.price = productInfo.salePrice;
      }
    }
    
    // CRITICAL: Process ALL variants
    const variants = scraped.variants || [];
    if (variants.length > 0) {
      console.log(`Found ${variants.length} variants - processing ALL`);
      
      // Clear existing flavors and add all variants
      const variantLabels: string[] = [];
      let firstWeightUnit: string | null = null;
      let firstPrice: number | null = null;
      
      for (const v of variants) {
        // Build variant label with price info
        let label = v.label || "";
        
        // Add weight info if available
        if (v.weight && v.weight_unit) {
          const weightStr = v.weight_unit === "kg" ? `${v.weight} ק"ג` : 
                           v.weight_unit === "g" ? `${v.weight} גרם` : 
                           `${v.weight} ${v.weight_unit}`;
          if (!label.includes(weightStr) && !label.match(/\d+\s*(kg|ק"ג|גרם|g)/i)) {
            label = label ? `${label} (${weightStr})` : weightStr;
          }
        }
        
        // Add price to label
        if (v.price) {
          if (v.sale_price && v.sale_price < v.price) {
            label += ` - ₪${v.sale_price} (במקום ₪${v.price})`;
          } else {
            label += ` - ₪${v.price}`;
          }
        }
        
        variantLabels.push(label);
        
        // Track first weight unit and price for default
        if (!firstWeightUnit && v.weight_unit) {
          firstWeightUnit = v.weight_unit;
        }
        if (!firstPrice && v.price) {
          firstPrice = v.price;
        }
      }
      
      updates.flavors = variantLabels;
      
      // Set weight unit from first variant with weight
      if (firstWeightUnit) {
        updates.weight_unit = firstWeightUnit;
      }
      
      // Set price from first variant if not already set
      if (!updates.price && firstPrice) {
        updates.price = firstPrice;
      }
    }
    
    // Category detection from URL patterns
    const sourceUrl = scraped.source?.finalUrl || "";
    let decodedUrl = sourceUrl.toLowerCase();
    try { decodedUrl = decodeURIComponent(sourceUrl).toLowerCase(); } catch {}
    
    if (decodedUrl.includes("מזון-יבש") || decodedUrl.includes("dry")) {
      updates.category = "dry-food";
    } else if (decodedUrl.includes("מזון-רטוב") || decodedUrl.includes("wet")) {
      updates.category = "wet-food";
    } else if (decodedUrl.includes("חטיפ") || decodedUrl.includes("treats")) {
      updates.category = "treats";
    }
    
    // Pet type detection
    if (decodedUrl.includes("כלב") || decodedUrl.includes("dog")) {
      updates.pet_type = "dog";
    } else if (decodedUrl.includes("חתול") || decodedUrl.includes("cat")) {
      updates.pet_type = "cat";
    }
    
    onProductChange(updates);
    
    // Store enriched data for display
    setEnrichedData({
      name: productInfo.title,
      description: productInfo.description,
      suggestedPrice: productInfo.basePrice,
      salePrice: productInfo.salePrice,
      imageUrl: images[0],
      allImageUrls: images,
      category: updates.category,
      petType: updates.pet_type,
      brand: productInfo.brand,
      sizes: variants.map((v: any) => v.label || ""),
      variants: variants.map((v: any) => ({
        name: v.label || "",
        value: v.weight ? `${v.weight} ${v.weight_unit || ""}` : "",
        price: v.price,
      })),
    });
    setShowEnrichmentDetails(true);
    
    const variantCount = variants.length;
    const imageCount = images.length;
    
    toast({
      title: "הנתונים יובאו בהצלחה",
      description: `נמצאו ${variantCount} וריאנטים ו-${imageCount} תמונות`,
    });
  }, [product, onProductChange, toast]);

  const handleUrlImport = async () => {
    if (!productUrl || !productUrl.startsWith("http")) {
      toast({
        title: "כתובת לא תקינה",
        description: "הזן כתובת URL מלאה של דף מוצר או קטגוריה",
        variant: "destructive",
      });
      return;
    }

    setIsEnriching(true);
    
    try {
      // Use the new unified import function that handles both products and lists
      const { data, error } = await supabase.functions.invoke("import-products-from-url", {
        body: { 
          url: productUrl,
          maxProducts: 30,
          maxPages: 5,
          sameDomainOnly: true 
        },
      });

      if (error) {
        console.error("Import error:", error);
        toast({
          title: "שגיאה בייבוא",
          description: error.message || "לא ניתן לייבא נתונים מהכתובת",
          variant: "destructive",
        });
        return;
      }

      if (data?.success && data?.data) {
        const result = data.data;
        console.log("Import result:", result.mode, "products:", result.products?.length);
        
        // Store debug info
        setImportDebugInfo({
          productLinksFound: result.debug?.productLinksFound || 0,
          pagesCrawled: result.debug?.pagesCrawled || 1,
        });
        
        if (result.mode === "product" && result.products?.length === 1) {
          // Single product - auto-fill form directly
          const scrapedProduct = result.products[0];
          processScrapedProductData(scrapedProduct);
          toast({
            title: "המוצר יובא בהצלחה",
            description: `נמצאו ${scrapedProduct.variants?.length || 0} וריאנטים ו-${scrapedProduct.images?.length || 0} תמונות`,
          });
        } else if (result.products?.length > 0) {
          // Multiple products - show review modal
          setScrapedProducts(result.products);
          setSelectedProductIndices(new Set(result.products.map((_: any, i: number) => i)));
          setShowImportReview(true);
          toast({
            title: `נמצאו ${result.products.length} מוצרים`,
            description: "בחר אילו מוצרים לייבא",
          });
        } else {
          toast({
            title: "לא נמצאו מוצרים",
            description: "נסה קישור אחר או בדוק שהקישור תקין",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "לא נמצאו נתונים",
          description: data?.error || "לא ניתן לחלץ מידע מהדף",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("URL import failed:", err);
      toast({
        title: "שגיאה בייבוא",
        description: "אירעה שגיאה בייבוא הנתונים מהקישור",
        variant: "destructive",
      });
    } finally {
      setIsEnriching(false);
    }
  };

  // Process a single scraped product and fill the form
  const processScrapedProductData = useCallback((scrapedProduct: ScrapedProduct) => {
    const updates: Partial<ProductData> = { ...product };
    
    // Title
    if (scrapedProduct.title) {
      updates.name = scrapedProduct.title;
    }
    
    // Description
    if (scrapedProduct.description) {
      updates.description = scrapedProduct.description;
    }
    
    // Images
    if (scrapedProduct.images?.length > 0) {
      updates.image_url = scrapedProduct.images[0];
      if (scrapedProduct.images.length > 1) {
        updates.images = scrapedProduct.images.slice(1);
      }
    }
    
    // Base price and sale price
    if (scrapedProduct.basePrice) {
      updates.price = scrapedProduct.basePrice;
    }
    if (scrapedProduct.salePrice) {
      updates.sale_price = scrapedProduct.salePrice;
      if (!updates.price) {
        updates.price = scrapedProduct.salePrice;
      }
    }
    
    // SKU
    if (scrapedProduct.sku) {
      updates.sku = scrapedProduct.sku;
    }
    
    // CRITICAL: Process ALL variants
    const variants = scrapedProduct.variants || [];
    if (variants.length > 0) {
      console.log(`Processing ${variants.length} variants`);
      
      const variantLabels: string[] = [];
      let firstWeightUnit: string | null = null;
      let firstPrice: number | null = null;
      
      for (const v of variants) {
        let label = v.label || "";
        
        // Add weight info if available
        if (v.weight && v.weight_unit) {
          const weightStr = v.weight_unit === "kg" ? `${v.weight} ק"ג` : 
                           v.weight_unit === "g" ? `${v.weight} גרם` : 
                           `${v.weight} ${v.weight_unit}`;
          if (!label.includes(weightStr) && !label.match(/\d+\s*(kg|ק"ג|גרם|g)/i)) {
            label = label ? `${label} (${weightStr})` : weightStr;
          }
        }
        
        // Add price to label
        if (v.price) {
          if (v.sale_price && v.sale_price < v.price) {
            label += ` - ₪${v.sale_price} (במקום ₪${v.price})`;
          } else {
            label += ` - ₪${v.price}`;
          }
        }
        
        variantLabels.push(label);
        
        if (!firstWeightUnit && v.weight_unit) {
          firstWeightUnit = v.weight_unit;
        }
        if (!firstPrice && v.price) {
          firstPrice = v.price;
        }
      }
      
      updates.flavors = variantLabels;
      
      if (firstWeightUnit) {
        updates.weight_unit = firstWeightUnit;
      }
      
      if (!updates.price && firstPrice) {
        updates.price = firstPrice;
      }
    }
    
    // Category detection from URL
    const sourceUrl = scrapedProduct.source_url || "";
    let decodedUrl = sourceUrl.toLowerCase();
    try { decodedUrl = decodeURIComponent(sourceUrl).toLowerCase(); } catch {}
    
    if (decodedUrl.includes("מזון-יבש") || decodedUrl.includes("dry")) {
      updates.category = "dry-food";
    } else if (decodedUrl.includes("מזון-רטוב") || decodedUrl.includes("wet")) {
      updates.category = "wet-food";
    } else if (decodedUrl.includes("חטיפ") || decodedUrl.includes("treats")) {
      updates.category = "treats";
    }
    
    // Pet type detection
    if (decodedUrl.includes("כלב") || decodedUrl.includes("dog")) {
      updates.pet_type = "dog";
    } else if (decodedUrl.includes("חתול") || decodedUrl.includes("cat")) {
      updates.pet_type = "cat";
    }
    
    onProductChange(updates);
    
    // Store enriched data for display
    setEnrichedData({
      name: scrapedProduct.title,
      description: scrapedProduct.description || undefined,
      suggestedPrice: scrapedProduct.basePrice || undefined,
      salePrice: scrapedProduct.salePrice || undefined,
      imageUrl: scrapedProduct.images?.[0],
      allImageUrls: scrapedProduct.images,
      category: updates.category,
      petType: updates.pet_type,
      brand: scrapedProduct.brand || undefined,
      sizes: variants.map(v => v.label || ""),
      variants: variants.map(v => ({
        name: v.label || "",
        value: v.weight ? `${v.weight} ${v.weight_unit || ""}` : "",
        price: v.price || undefined,
      })),
    });
    setShowEnrichmentDetails(true);
  }, [product, onProductChange]);

  // Toggle product selection for bulk import
  const toggleProductSelection = (index: number) => {
    setSelectedProductIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Select/deselect all products
  const toggleSelectAll = () => {
    if (selectedProductIndices.size === scrapedProducts.length) {
      setSelectedProductIndices(new Set());
    } else {
      setSelectedProductIndices(new Set(scrapedProducts.map((_, i) => i)));
    }
  };

  // Import selected products to database
  const handleBulkImport = async () => {
    if (selectedProductIndices.size === 0) {
      toast({
        title: "לא נבחרו מוצרים",
        description: "בחר לפחות מוצר אחד לייבוא",
        variant: "destructive",
      });
      return;
    }

    setIsBulkSaving(true);
    
    try {
      const selectedProducts = scrapedProducts.filter((_, i) => selectedProductIndices.has(i));
      let successCount = 0;
      let errorCount = 0;
      
      for (const scrapedProduct of selectedProducts) {
        try {
          // Create product record
          const productData = {
            name: scrapedProduct.title,
            description: scrapedProduct.description,
            price: scrapedProduct.basePrice || scrapedProduct.variants?.[0]?.price || 0,
            sale_price: scrapedProduct.salePrice || scrapedProduct.variants?.[0]?.sale_price || null,
            image_url: scrapedProduct.images?.[0] || "/placeholder.svg",
            images: scrapedProduct.images?.slice(1) || [],
            sku: scrapedProduct.sku,
            in_stock: true,
            is_featured: false,
            // Map variants to flavors with prices
            flavors: scrapedProduct.variants?.map(v => {
              let label = v.label || "";
              if (v.price) {
                label += ` - ₪${v.price}`;
              }
              return label;
            }) || [],
            weight_unit: scrapedProduct.variants?.[0]?.weight_unit || null,
            business_id: "cf941cc4-e1d1-4d7c-8122-a5df81a1e53c", // Default business ID
          };

          const { error } = await supabase.from("business_products").insert(productData);
          
          if (error) {
            console.error("Error inserting product:", error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error("Error processing product:", err);
          errorCount++;
        }
      }
      
      toast({
        title: `יובאו ${successCount} מוצרים`,
        description: errorCount > 0 ? `${errorCount} מוצרים נכשלו` : "כל המוצרים יובאו בהצלחה",
        variant: errorCount > 0 ? "destructive" : "default",
      });
      
      setShowImportReview(false);
      setScrapedProducts([]);
      setSelectedProductIndices(new Set());
      setProductUrl("");
      
    } catch (err) {
      console.error("Bulk import failed:", err);
      toast({
        title: "שגיאה בייבוא",
        description: "אירעה שגיאה בייבוא המוצרים",
        variant: "destructive",
      });
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Import single product from review modal
  const handleImportSingleFromReview = (scrapedProduct: ScrapedProduct) => {
    processScrapedProductData(scrapedProduct);
    setShowImportReview(false);
    setScrapedProducts([]);
    toast({
      title: "המוצר נבחר",
      description: "פרטי המוצר מולאו בטופס",
    });
  };

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

  const handleSkuSearch = async () => {
    if (!product?.sku || product.sku.length < 3) {
      toast({
        title: "מק״ט קצר מדי",
        description: "הזן לפחות 3 תווים לחיפוש",
        variant: "destructive",
      });
      return;
    }
    
    setIsEnriching(true);
    
    try {
      // Use the new scrape-product function with SKU mode
      const { data, error } = await supabase.functions.invoke("scrape-product", {
        body: { 
          mode: "sku", 
          sku: product.sku,
          query: product.name || undefined,
          preferredDomains: ["pet-shop.co.il", "petshop.co.il", "zooplus.co.il", "petfood.co.il"]
        },
      });

      if (error) {
        console.error("SKU search error:", error);
        toast({
          title: "שגיאה בחיפוש",
          description: error.message || "לא ניתן לחפש את המוצר",
          variant: "destructive",
        });
        return;
      }

      if (data?.success && data?.data) {
        processScrapedData(data.data);
        
        // Show the source URL in a toast
        if (data.data.source?.finalUrl) {
          console.log("Product found at:", data.data.source.finalUrl);
        }
      } else {
        toast({
          title: "לא נמצא מוצר",
          description: data?.error || "נסה להוסיף שם מוצר או להשתמש בקישור ישיר",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("SKU search failed:", err);
      toast({
        title: "שגיאה בחיפוש",
        description: "אירעה שגיאה בחיפוש המוצר",
        variant: "destructive",
      });
    } finally {
      setIsEnriching(false);
    }
  };

  const handleImageSearch = async () => {
    const query = imageSearchQuery || product?.name || "";
    if (!query) {
      toast({
        title: "נא להזין מילות חיפוש",
        description: "הזן שם מוצר או מילות מפתח לחיפוש",
        variant: "destructive",
      });
      return;
    }

    setIsSearchingImages(true);
    setImageSearchResults([]);

    try {
      const { data, error } = await supabase.functions.invoke("search-product-image", {
        body: { query, limit: 8 },
      });

      if (error) {
        throw error;
      }

      if (data?.images && data.images.length > 0) {
        setImageSearchResults(data.images);
      } else {
        toast({
          title: "לא נמצאו תמונות",
          description: "נסה מילות חיפוש אחרות",
        });
      }
    } catch (err) {
      console.error("Image search failed:", err);
      toast({
        title: "שגיאה בחיפוש",
        description: "לא ניתן לחפש תמונות כרגע",
        variant: "destructive",
      });
    } finally {
      setIsSearchingImages(false);
    }
  };

  const toggleSearchImageSelection = (imageUrl: string) => {
    setSelectedSearchImages(prev => {
      if (prev.includes(imageUrl)) {
        return prev.filter(url => url !== imageUrl);
      }
      return [...prev, imageUrl];
    });
  };

  const confirmSelectedImages = () => {
    if (selectedSearchImages.length === 0) {
      toast({
        title: "לא נבחרו תמונות",
        description: "בחר לפחות תמונה אחת",
        variant: "destructive",
      });
      return;
    }

    // First image becomes the main image, rest go to images array
    const [mainImage, ...additionalImages] = selectedSearchImages;
    const currentImages = product?.images || [];
    
    onProductChange({ 
      ...product, 
      image_url: mainImage,
      images: [...currentImages, ...additionalImages]
    });
    
    setShowImageSearch(false);
    setImageSearchResults([]);
    setImageSearchQuery("");
    setSelectedSearchImages([]);
    
    toast({
      title: `${selectedSearchImages.length} תמונות נבחרו`,
      description: "התמונה הראשונה הוגדרה כראשית, השאר נוספו לגלריה",
    });
  };

  const clearImageSearch = () => {
    setImageSearchResults([]);
    setSelectedSearchImages([]);
  };

  const addFlavor = () => {
    if (!newFlavor.trim()) return;
    const currentFlavors = product?.flavors || [];
    if (!currentFlavors.includes(newFlavor.trim())) {
      onProductChange({ ...product, flavors: [...currentFlavors, newFlavor.trim()] });
    }
    setNewFlavor("");
  };

  const removeFlavor = (flavor: string) => {
    const currentFlavors = product?.flavors || [];
    onProductChange({ ...product, flavors: currentFlavors.filter(f => f !== flavor) });
  };

  const addAdditionalImage = (imageUrl: string) => {
    const currentImages = product?.images || [];
    if (!currentImages.includes(imageUrl)) {
      onProductChange({ ...product, images: [...currentImages, imageUrl] });
    }
  };

  const removeAdditionalImage = (index: number) => {
    const currentImages = product?.images || [];
    onProductChange({ ...product, images: currentImages.filter((_, i) => i !== index) });
  };

  const handleAdditionalImageUpload = async (file: File) => {
    await onImageUpload(file);
    // The image_url will be set by the parent, we need to copy it to images array
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            {product?.id ? "עריכת מוצר" : "הוספת מוצר חכמה"}
            {isEnriching && (
              <Badge variant="secondary" className="animate-pulse">
                <Loader2 className="w-3 h-3 ml-1 animate-spin" />
                מייבא נתונים...
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            הדבק קישור לדף מוצר או מק״ט - המערכת תמלא את כל השדות אוטומטית
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }} className="space-y-4">
          {/* Quick Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowBulkImport(true)}
              className="gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              ייבוא מקובץ
            </Button>
          </div>

          {/* AI Import Section - Primary */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                ייבוא אוטומטי
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* URL Input - Most Important */}
              <div>
                <Label className="text-sm font-medium flex items-center gap-2 mb-1.5">
                  <ExternalLink className="w-4 h-4" />
                  קישור לדף מוצר
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    placeholder="https://example.com/product/..."
                    className="flex-1 bg-background"
                    dir="ltr"
                  />
                  <Button 
                    type="button" 
                    onClick={handleUrlImport}
                    disabled={isEnriching || !productUrl}
                    className="min-w-[100px]"
                  >
                    {isEnriching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 ml-2" />
                        ייבא
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  הדבק קישור מכל אתר - המערכת תמשוך שם, תמונות, מחיר וכל הוריאנטים
                </p>
              </div>

              {/* SKU Search - Secondary */}
              <div className="pt-2 border-t border-primary/20">
                <Label className="text-sm font-medium flex items-center gap-2 mb-1.5 text-muted-foreground">
                  <Search className="w-4 h-4" />
                  או חפש לפי מק״ט / ברקוד
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={product.sku || ""}
                    onChange={(e) => handleSkuChange(e.target.value)}
                    placeholder="הזן מק״ט, ברקוד או שם מוצר..."
                    className="flex-1 bg-background/50"
                  />
                  <Button 
                    type="button" 
                    onClick={handleSkuSearch}
                    disabled={isEnriching || !product.sku}
                    variant="secondary"
                  >
                    {isEnriching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Image Section */}
          <div className="space-y-3">
            <Label className="text-center block">תמונת המוצר</Label>
            <div className="flex flex-col items-center gap-3">
              {/* Image Preview */}
              <div className="relative">
                <div 
                  className="w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/30"
                >
                {isUploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  ) : product.image_url && product.image_url !== '/placeholder.svg' ? (
                    <img 
                      src={product.image_url} 
                      alt="" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                      <span className="text-xs">אין תמונה</span>
                    </div>
                  )}
                </div>
                {product.image_url && product.image_url !== '/placeholder.svg' && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                    onClick={() => onProductChange({ ...product, image_url: "" })}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>

              {/* Image Actions */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4 ml-2" />
                  העלה תמונה
                </Button>
                
                <Popover open={showImageSearch} onOpenChange={(open) => {
                  setShowImageSearch(open);
                  if (!open) {
                    clearImageSearch();
                  }
                }}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <Globe className="w-4 h-4 ml-2" />
                      חפש תמונות בגוגל
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px]" align="center" dir="rtl">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">חיפוש תמונות ברשת</div>
                        {selectedSearchImages.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            נבחרו: {selectedSearchImages.length}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder={product?.name || "הזן מילות חיפוש..."}
                          value={imageSearchQuery}
                          onChange={(e) => setImageSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleImageSearch()}
                          className="flex-1"
                        />
                        <Button 
                          type="button" 
                          size="sm" 
                          onClick={handleImageSearch}
                          disabled={isSearchingImages}
                        >
                          {isSearchingImages ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      
                      {/* Search Results */}
                      {imageSearchResults.length > 0 && (
                        <div className="space-y-3">
                          <div className="text-xs text-muted-foreground">
                            נמצאו {imageSearchResults.length} תמונות. לחץ לבחירה מרובה (תמונה 1 = ראשית)
                          </div>
                          <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto p-1">
                            {imageSearchResults.map((url, idx) => {
                              const selectionIndex = selectedSearchImages.indexOf(url);
                              const isSelected = selectionIndex !== -1;
                              
                              return (
                                <div
                                  key={idx}
                                  className={`relative aspect-square cursor-pointer rounded-lg overflow-hidden border-2 transition-all bg-muted ${
                                    isSelected 
                                      ? 'border-primary ring-2 ring-primary/30 scale-95' 
                                      : 'border-muted-foreground/20 hover:border-primary/50'
                                  }`}
                                  onClick={() => toggleSearchImageSelection(url)}
                                >
                                <img
                                    src={url}
                                    alt={`תמונה ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      target.parentElement?.classList.add('bg-muted');
                                    }}
                                  />
                                  {isSelected && (
                                    <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                                      <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                                        {selectionIndex + 1}
                                      </div>
                                    </div>
                                  )}
                                  {!isSelected && (
                                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                                      <span className="text-white text-xs opacity-0 hover:opacity-100 bg-black/50 px-1 rounded">
                                        {idx + 1}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Selected Images Preview */}
                          {selectedSearchImages.length > 0 && (
                            <div className="border-t pt-3">
                              <div className="text-xs text-muted-foreground mb-2">סדר התמונות:</div>
                              <div className="flex gap-1 flex-wrap">
                                {selectedSearchImages.map((url, idx) => (
                                  <div key={url} className="relative">
                                    <div className="w-10 h-10 rounded border overflow-hidden">
                                      <img src={url} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
                                      {idx + 1}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSearchImageSelection(url);
                                      }}
                                      className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <Button 
                            type="button" 
                            className="w-full" 
                            onClick={confirmSelectedImages}
                            disabled={selectedSearchImages.length === 0}
                          >
                            <Check className="w-4 h-4 ml-2" />
                            אשר בחירה ({selectedSearchImages.length} תמונות)
                          </Button>
                        </div>
                      )}
                      
                      {isSearchingImages && (
                        <div className="text-center py-8">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                          <p className="text-sm text-muted-foreground mt-3">מחפש תמונות...</p>
                        </div>
                      )}
                      
                      {!isSearchingImages && imageSearchResults.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          הזן מילות חיפוש ולחץ על חפש
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
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

            {/* SKU / Barcode */}
            <div className="col-span-2">
              <Label>מק״ט / ברקוד</Label>
              <Input
                value={product.sku || ""}
                onChange={(e) => onProductChange({ ...product, sku: e.target.value })}
                placeholder="הזן מק״ט או ברקוד של המוצר"
                dir="ltr"
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

            {/* Flavors / Variants */}
            <div className="col-span-2">
              <Label>טעמים / וריאנטים</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(product.flavors || []).map((flavor, idx) => (
                  <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                    {flavor}
                    <button
                      type="button"
                      onClick={() => removeFlavor(flavor)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newFlavor}
                  onChange={(e) => setNewFlavor(e.target.value)}
                  placeholder="הוסף טעם / וריאנט חדש"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFlavor();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addFlavor}>
                  הוסף
                </Button>
              </div>
            </div>

            {/* Additional Images */}
            <div className="col-span-2">
              <Label>תמונות נוספות</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(product.images || []).map((img, idx) => (
                  <div key={idx} className="relative w-16 h-16">
                    <img src={img} alt="" className="w-full h-full object-cover rounded-md border" />
                    <button
                      type="button"
                      onClick={() => removeAdditionalImage(idx)}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="כתובת URL לתמונה נוספת"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      if (input.value) {
                        addAdditionalImage(input.value);
                        input.value = "";
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="כתובת URL לתמונה נוספת"]') as HTMLInputElement;
                    if (input?.value) {
                      addAdditionalImage(input.value);
                      input.value = "";
                    }
                  }}
                >
                  הוסף
                </Button>
              </div>
            </div>

            {/* Weight and Unit */}
            <div>
              <Label>מחיר לפי משקל</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={product.price_per_weight || ""}
                onChange={(e) => onProductChange({ ...product, price_per_weight: parseFloat(e.target.value) || null })}
                placeholder="לדוגמה: 35.90"
              />
            </div>
            <div>
              <Label>יחידת משקל</Label>
              <Select 
                value={product.weight_unit || ""} 
                onValueChange={(value) => onProductChange({ ...product, weight_unit: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר יחידה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">ק״ג</SelectItem>
                  <SelectItem value="g">גרם</SelectItem>
                  <SelectItem value="l">ליטר</SelectItem>
                  <SelectItem value="ml">מ״ל</SelectItem>
                  <SelectItem value="unit">יחידה</SelectItem>
                </SelectContent>
              </Select>
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

            {/* Price Section with Competitor Comparison */}
            <div className="col-span-2 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {/* Main Price */}
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
                    placeholder="אופציונלי"
                  />
                </div>
              </div>

              {/* Competitor Price Comparison */}
              <CompetitorPriceManager
                productName={product.name || ""}
                currentPrice={product.price}
                sku={product.sku || undefined}
                onPriceSelect={(price) => onProductChange({ ...product, price })}
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
            <Button type="submit" disabled={isSaving || !product.name?.trim() || !product.price || product.price <= 0}>
              {isSaving ? "שומר..." : "שמור"}
            </Button>
          </DialogFooter>
        </form>

        {/* Bulk Import Dialog */}
        <BulkProductImport
          open={showBulkImport}
          onOpenChange={setShowBulkImport}
          onImportComplete={(products) => {
            // For bulk import, we'll fill the first product's data
            if (products.length > 0) {
              const firstProduct = products[0];
              onProductChange({
                ...product,
                name: firstProduct.name,
                description: firstProduct.description,
                price: firstProduct.price,
                sku: firstProduct.sku,
                category: firstProduct.category,
                image_url: firstProduct.image_url || product?.image_url,
                in_stock: firstProduct.in_stock,
              });
              
              toast({
                title: "המוצר יובא",
                description: products.length > 1 
                  ? `${products.length - 1} מוצרים נוספים ממתינים לייבוא` 
                  : "פרטי המוצר עודכנו",
              });
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
