import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileSpreadsheet, FileText, Image, Upload, Loader2, 
  Check, X, Edit2, ChevronDown, ChevronUp, AlertCircle, Link,
  Sparkles, Wand2, RefreshCw, Store
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "@e965/xlsx";

interface ParsedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  sku: string;
  category: string;
  image_url: string;
  in_stock: boolean;
  isValid: boolean;
  errors: string[];
  isEditing?: boolean;
  sourceUrl?: string;
  isFixing?: boolean;
  // Enrichment data
  isEnriched?: boolean;
  enrichedFrom?: string;
  originalData?: Partial<ParsedProduct>;
  brand?: string;
  petType?: string;
}

interface BulkProductImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (products: ParsedProduct[]) => void;
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

export const BulkProductImport = ({
  open,
  onOpenChange,
  onImportComplete,
}: BulkProductImportProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'url' | 'review' | 'enrich'>('upload');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [urlInput, setUrlInput] = useState("");
  const [isFixingAll, setIsFixingAll] = useState(false);
  const [fixProgress, setFixProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [isUploadingToStore, setIsUploadingToStore] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [enrichedProducts, setEnrichedProducts] = useState<ParsedProduct[]>([]);

  const fileTypes = [
    { id: 'csv', label: 'CSV', icon: FileSpreadsheet, accept: '.csv', color: 'text-green-500' },
    { id: 'excel', label: 'Excel', icon: FileSpreadsheet, accept: '.xlsx,.xls', color: 'text-blue-500' },
    { id: 'pdf', label: 'PDF', icon: FileText, accept: '.pdf', color: 'text-red-500' },
    { id: 'image', label: 'תמונה', icon: Image, accept: 'image/*', color: 'text-purple-500' },
    { id: 'url', label: 'קישור URL', icon: Link, accept: '', color: 'text-orange-500' },
  ];

  const parseCSV = (text: string): ParsedProduct[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const products: ParsedProduct[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const product: ParsedProduct = {
        id: `import-${Date.now()}-${i}`,
        name: values[headers.indexOf('name')] || values[headers.indexOf('שם')] || '',
        description: values[headers.indexOf('description')] || values[headers.indexOf('תיאור')] || '',
        price: parseFloat(values[headers.indexOf('price')] || values[headers.indexOf('מחיר')] || '0') || 0,
        sku: values[headers.indexOf('sku')] || values[headers.indexOf('מק״ט')] || values[headers.indexOf('barcode')] || '',
        category: values[headers.indexOf('category')] || values[headers.indexOf('קטגוריה')] || 'other',
        image_url: values[headers.indexOf('image')] || values[headers.indexOf('image_url')] || values[headers.indexOf('תמונה')] || '',
        in_stock: true,
        isValid: true,
        errors: [],
      };

      // Validate
      if (!product.name) {
        product.errors.push('שם המוצר חסר');
        product.isValid = false;
      }
      if (product.price <= 0) {
        product.errors.push('מחיר לא תקין');
        product.isValid = false;
      }

      products.push(product);
    }

    return products;
  };

  const parseExcel = async (file: File): Promise<ParsedProduct[]> => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    return jsonData.map((row: any, index) => {
      const product: ParsedProduct = {
        id: `import-${Date.now()}-${index}`,
        name: row['name'] || row['שם'] || row['Name'] || '',
        description: row['description'] || row['תיאור'] || row['Description'] || '',
        price: parseFloat(row['price'] || row['מחיר'] || row['Price'] || '0') || 0,
        sku: String(row['sku'] || row['מק״ט'] || row['SKU'] || row['barcode'] || row['ברקוד'] || ''),
        category: row['category'] || row['קטגוריה'] || row['Category'] || 'other',
        image_url: row['image'] || row['image_url'] || row['תמונה'] || row['Image'] || '',
        in_stock: true,
        isValid: true,
        errors: [],
      };

      if (!product.name) {
        product.errors.push('שם המוצר חסר');
        product.isValid = false;
      }
      if (product.price <= 0) {
        product.errors.push('מחיר לא תקין');
        product.isValid = false;
      }

      return product;
    });
  };

  const parseImageWithAI = async (file: File): Promise<ParsedProduct[]> => {
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    try {
      const { data, error } = await supabase.functions.invoke('scan-invoice', {
        body: { 
          image: base64,
          type: 'product_list'
        },
      });

      if (error) throw error;

      if (data?.products && Array.isArray(data.products)) {
        return data.products.map((p: any, index: number) => ({
          id: `import-${Date.now()}-${index}`,
          name: p.name || '',
          description: p.description || '',
          price: parseFloat(p.price) || 0,
          sku: p.sku || p.barcode || '',
          category: p.category || 'other',
          image_url: '',
          in_stock: true,
          isValid: Boolean(p.name && parseFloat(p.price) > 0),
          errors: !p.name ? ['שם המוצר חסר'] : parseFloat(p.price) <= 0 ? ['מחיר לא תקין'] : [],
        }));
      }

      return [];
    } catch (err) {
      console.error('AI parsing failed:', err);
      throw new Error('לא ניתן לפענח את התמונה');
    }
  };

  const parsePDFWithAI = async (file: File): Promise<ParsedProduct[]> => {
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    try {
      const { data, error } = await supabase.functions.invoke('scan-invoice', {
        body: { 
          document: base64,
          type: 'product_catalog'
        },
      });

      if (error) throw error;

      if (data?.products && Array.isArray(data.products)) {
        return data.products.map((p: any, index: number) => ({
          id: `import-${Date.now()}-${index}`,
          name: p.name || '',
          description: p.description || '',
          price: parseFloat(p.price) || 0,
          sku: p.sku || p.barcode || '',
          category: p.category || 'other',
          image_url: '',
          in_stock: true,
          isValid: Boolean(p.name && parseFloat(p.price) > 0),
          errors: !p.name ? ['שם המוצר חסר'] : parseFloat(p.price) <= 0 ? ['מחיר לא תקין'] : [],
        }));
      }

      return [];
    } catch (err) {
      console.error('PDF parsing failed:', err);
      throw new Error('לא ניתן לפענח את הקובץ');
    }
  };

  const parseURLWithAI = async (url: string): Promise<ParsedProduct[]> => {
    try {
      // Use preview mode to scrape a single product page
      const { data, error } = await supabase.functions.invoke('scrape-products', {
        body: { 
          productUrl: url,
          mode: 'preview'
        },
      });

      if (error) throw error;

      // Handle successful product scrape
      if (data?.success && data?.product) {
        const p = data.product;
        const product: ParsedProduct = {
          id: `import-${Date.now()}-0`,
          name: p.product_name || p.name || '',
          description: p.short_description || p.description || '',
          price: p.final_price || p.regular_price || parseFloat(p.price) || 0,
          sku: p.sku || '',
          category: mapCategory(p.main_category || p.category || ''),
          image_url: p.main_image_url || p.image_url || '',
          in_stock: p.stock_status === 'in_stock' || true,
          isValid: Boolean((p.product_name || p.name) && (p.final_price || p.regular_price || parseFloat(p.price) > 0)),
          errors: [],
        };
        
        if (!product.name) product.errors.push('שם המוצר חסר');
        if (product.price <= 0) product.errors.push('מחיר לא תקין');
        product.isValid = product.errors.length === 0;
        
        return [product];
      }

      // Handle array of products
      if (data?.products && Array.isArray(data.products)) {
        return data.products.map((p: any, index: number) => {
          const product: ParsedProduct = {
            id: `import-${Date.now()}-${index}`,
            name: p.product_name || p.name || '',
            description: p.short_description || p.description || '',
            price: p.final_price || p.regular_price || parseFloat(p.price) || 0,
            sku: p.sku || '',
            category: mapCategory(p.main_category || p.category || ''),
            image_url: p.main_image_url || p.image_url || '',
            in_stock: p.stock_status === 'in_stock' || true,
            isValid: true,
            errors: [],
          };
          
          if (!product.name) product.errors.push('שם המוצר חסר');
          if (product.price <= 0) product.errors.push('מחיר לא תקין');
          product.isValid = product.errors.length === 0;
          
          return product;
        });
      }

      return [];
    } catch (err) {
      console.error('URL parsing failed:', err);
      throw new Error('לא ניתן לטעון מוצרים מהקישור');
    }
  };

  // Helper to map scraped category to our categories
  const mapCategory = (category: string): string => {
    const categoryLower = category.toLowerCase();
    const categoryMap: Record<string, string> = {
      'אוכל יבש': 'dry-food',
      'מזון יבש': 'dry-food',
      'אוכל רטוב': 'wet-food',
      'מזון רטוב': 'wet-food',
      'חטיפים': 'treats',
      'צעצועים': 'toys',
      'אביזרים': 'accessories',
      'בריאות': 'health',
      'טיפוח': 'grooming',
      'מיטות': 'beds',
      'קולרים': 'collars',
      'רצועות': 'collars',
      'קערות': 'bowls',
    };
    
    for (const [key, value] of Object.entries(categoryMap)) {
      if (categoryLower.includes(key)) {
        return value;
      }
    }
    return 'other';
  };

  const handleURLImport = async () => {
    if (!urlInput.trim()) {
      toast({
        title: "נא להזין קישור",
        description: "הזן כתובת URL של דף מוצר או קטלוג",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const products = await parseURLWithAI(urlInput.trim());

      if (products.length === 0) {
        toast({
          title: "לא נמצאו מוצרים",
          description: "לא ניתן לזהות מוצרים בדף זה",
          variant: "destructive",
        });
        return;
      }

      setParsedProducts(products);
      setStep('review');

      toast({
        title: `נמצאו ${products.length} מוצרים`,
        description: "בדוק ואשר את המוצרים לפני הייבוא",
      });
    } catch (err: any) {
      console.error('URL import error:', err);
      toast({
        title: "שגיאה בטעינה מהקישור",
        description: err.message || "נסה קישור אחר",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsProcessing(true);

    try {
      let products: ParsedProduct[] = [];
      const fileType = file.type;
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.csv') || fileType === 'text/csv') {
        const text = await file.text();
        products = parseCSV(text);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileType.includes('spreadsheet')) {
        products = await parseExcel(file);
      } else if (fileType.startsWith('image/')) {
        products = await parseImageWithAI(file);
      } else if (fileType === 'application/pdf') {
        products = await parsePDFWithAI(file);
      } else {
        throw new Error('סוג קובץ לא נתמך');
      }

      if (products.length === 0) {
        toast({
          title: "לא נמצאו מוצרים",
          description: "הקובץ לא מכיל מוצרים או שהפורמט אינו תקין",
          variant: "destructive",
        });
        return;
      }

      setParsedProducts(products);
      setStep('review');

      toast({
        title: `נמצאו ${products.length} מוצרים`,
        description: "בדוק ואשר את המוצרים לפני הייבוא",
      });
    } catch (err: any) {
      console.error('File parsing error:', err);
      toast({
        title: "שגיאה בקריאת הקובץ",
        description: err.message || "נסה קובץ אחר",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleProductExpand = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const updateProduct = (productId: string, updates: Partial<ParsedProduct>) => {
    setParsedProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const updated = { ...p, ...updates };
        // Re-validate
        updated.errors = [];
        if (!updated.name) updated.errors.push('שם המוצר חסר');
        if (updated.price <= 0) updated.errors.push('מחיר לא תקין');
        updated.isValid = updated.errors.length === 0;
        return updated;
      }
      return p;
    }));
  };

  const removeProduct = (productId: string) => {
    setParsedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleImport = () => {
    const validProducts = parsedProducts.filter(p => p.isValid);
    if (validProducts.length === 0) {
      toast({
        title: "אין מוצרים תקינים",
        description: "תקן את השגיאות או הוסף מוצרים חדשים",
        variant: "destructive",
      });
      return;
    }

    onImportComplete(validProducts);
    handleClose();

    toast({
      title: `${validProducts.length} מוצרים יובאו בהצלחה`,
      description: "המוצרים נוספו לחנות",
    });
  };

  const handleClose = () => {
    setStep('upload');
    setParsedProducts([]);
    setSelectedFile(null);
    setExpandedProducts(new Set());
    setUrlInput("");
    setIsFixingAll(false);
    setFixProgress({ current: 0, total: 0 });
    setIsEnriching(false);
    setEnrichProgress({ current: 0, total: 0 });
    setEnrichedProducts([]);
    onOpenChange(false);
  };

  // Fix a single product using AI/scraping
  const fixProductWithAI = async (product: ParsedProduct): Promise<ParsedProduct> => {
    try {
      // Try to find and scrape product by name/SKU
      const { data, error } = await supabase.functions.invoke("scrape-product", {
        body: { 
          mode: "sku", 
          sku: product.sku || product.name,
          query: product.name,
          preferredDomains: ["pet-shop.co.il", "petshop.co.il", "zooplus.co.il"]
        },
      });

      if (error || !data?.success || !data?.data) {
        console.error("AI fix failed for product:", product.name, error);
        return product;
      }

      const scraped = data.data;
      const productInfo = scraped.product || scraped;
      
      // Build fixed product with scraped data
      const fixedProduct: ParsedProduct = {
        ...product,
        name: productInfo.title || product.name,
        description: productInfo.description || product.description,
        price: productInfo.basePrice || productInfo.salePrice || product.price,
        image_url: productInfo.images?.[0] || product.image_url,
        category: product.category || mapCategory(scraped.source?.finalUrl || ""),
        sourceUrl: scraped.source?.finalUrl,
        errors: [],
        isValid: true,
        isFixing: false,
      };

      // Re-validate
      if (!fixedProduct.name) {
        fixedProduct.errors.push('שם המוצר חסר');
        fixedProduct.isValid = false;
      }
      if (fixedProduct.price <= 0) {
        fixedProduct.errors.push('מחיר לא תקין');
        fixedProduct.isValid = false;
      }

      return fixedProduct;
    } catch (err) {
      console.error("AI fix error:", err);
      return { ...product, isFixing: false };
    }
  };

  // Fix all invalid products with AI
  const handleFixAllWithAI = async () => {
    const invalidProducts = parsedProducts.filter(p => !p.isValid);
    
    if (invalidProducts.length === 0) {
      toast({
        title: "אין מוצרים לתיקון",
        description: "כל המוצרים תקינים",
      });
      return;
    }

    setIsFixingAll(true);
    setFixProgress({ current: 0, total: invalidProducts.length });

    // Mark all invalid products as fixing
    setParsedProducts(prev => prev.map(p => 
      !p.isValid ? { ...p, isFixing: true } : p
    ));

    let fixedCount = 0;
    const BATCH_SIZE = 3;

    // Process in batches
    for (let i = 0; i < invalidProducts.length; i += BATCH_SIZE) {
      const batch = invalidProducts.slice(i, i + BATCH_SIZE);
      
      const fixedBatch = await Promise.all(
        batch.map(product => fixProductWithAI(product))
      );

      // Update products with fixed versions
      setParsedProducts(prev => {
        const newProducts = [...prev];
        for (const fixed of fixedBatch) {
          const idx = newProducts.findIndex(p => p.id === fixed.id);
          if (idx !== -1) {
            newProducts[idx] = fixed;
            if (fixed.isValid) fixedCount++;
          }
        }
        return newProducts;
      });

      setFixProgress({ current: Math.min(i + BATCH_SIZE, invalidProducts.length), total: invalidProducts.length });
      
      // Small delay between batches
      if (i + BATCH_SIZE < invalidProducts.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    setIsFixingAll(false);

    toast({
      title: `תוקנו ${fixedCount} מוצרים`,
      description: fixedCount < invalidProducts.length 
        ? `${invalidProducts.length - fixedCount} מוצרים לא נמצאו ברשת`
        : "כל המוצרים תוקנו בהצלחה!",
      variant: fixedCount > 0 ? "default" : "destructive",
    });
  };

  // Enrich a single product using AI - fill in missing data
  const enrichProductWithAI = async (product: ParsedProduct): Promise<ParsedProduct> => {
    // Check if product needs enrichment (missing key data)
    const needsEnrichment = !product.description || !product.image_url || !product.category || product.category === 'other';
    
    if (!needsEnrichment && product.isValid) {
      return { ...product, isEnriched: true, enrichedFrom: 'קיים' };
    }

    try {
      // Use enrich-product-ai to fill missing data
      const { data, error } = await supabase.functions.invoke("enrich-product-ai", {
        body: { 
          productName: product.name,
          sku: product.sku,
          category: product.category !== 'other' ? product.category : undefined
        },
      });

      if (error || !data?.success || !data?.data) {
        // Try scrape-product as fallback
        const scrapeResult = await supabase.functions.invoke("scrape-product", {
          body: { 
            mode: "sku", 
            sku: product.sku || product.name,
            query: product.name,
            preferredDomains: ["pet-shop.co.il", "petshop.co.il", "zooplus.co.il", "homepetcenter.co.il"]
          },
        });

        if (scrapeResult.error || !scrapeResult.data?.success) {
          return { ...product, isEnriched: false };
        }

        const scraped = scrapeResult.data.data;
        const productInfo = scraped.product || scraped;
        
        return {
          ...product,
          description: product.description || productInfo.description || '',
          image_url: product.image_url || productInfo.images?.[0] || productInfo.imageUrl || '',
          category: product.category === 'other' ? mapCategory(scraped.source?.finalUrl || '') : product.category,
          brand: productInfo.brand,
          petType: productInfo.petType,
          isEnriched: true,
          enrichedFrom: scraped.source?.finalUrl || 'סריקה',
          originalData: { 
            description: product.description, 
            image_url: product.image_url, 
            category: product.category 
          },
          isValid: true,
          errors: [],
        };
      }

      const enriched = data.data;
      
      return {
        ...product,
        description: product.description || enriched.description || '',
        image_url: product.image_url || enriched.imageUrl || enriched.allImageUrls?.[0] || '',
        category: product.category === 'other' ? mapCategory(enriched.category || '') : product.category,
        brand: enriched.brand,
        petType: enriched.petType,
        isEnriched: true,
        enrichedFrom: 'AI',
        originalData: { 
          description: product.description, 
          image_url: product.image_url, 
          category: product.category 
        },
        isValid: true,
        errors: [],
      };
    } catch (err) {
      console.error("Enrichment error:", err);
      return { ...product, isEnriched: false };
    }
  };

  // Start enrichment process before upload
  const handleEnrichAndUpload = async () => {
    const validProducts = parsedProducts.filter(p => p.isValid);
    
    if (validProducts.length === 0) {
      toast({
        title: "אין מוצרים תקינים",
        description: "תקן את השגיאות לפני העלאה",
        variant: "destructive",
      });
      return;
    }

    setIsEnriching(true);
    setEnrichProgress({ current: 0, total: validProducts.length });

    const enrichedList: ParsedProduct[] = [];
    const BATCH_SIZE = 3;

    // Process in batches
    for (let i = 0; i < validProducts.length; i += BATCH_SIZE) {
      const batch = validProducts.slice(i, i + BATCH_SIZE);
      
      const enrichedBatch = await Promise.all(
        batch.map(product => enrichProductWithAI(product))
      );

      enrichedList.push(...enrichedBatch);
      setEnrichProgress({ current: Math.min(i + BATCH_SIZE, validProducts.length), total: validProducts.length });
      
      // Small delay between batches
      if (i + BATCH_SIZE < validProducts.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    setEnrichedProducts(enrichedList);
    setIsEnriching(false);
    setStep('enrich');

    const enrichedCount = enrichedList.filter(p => p.isEnriched).length;
    toast({
      title: `${enrichedCount} מוצרים הועשרו`,
      description: "בדוק ואשר לפני העלאה לחנות",
    });
  };

  // Final upload after enrichment approval
  const handleFinalUpload = async () => {
    if (enrichedProducts.length === 0) {
      toast({
        title: "אין מוצרים להעלאה",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingToStore(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const product of enrichedProducts) {
        try {
          const { error } = await supabase.from("business_products").insert({
            name: product.name,
            description: product.description || null,
            price: product.price,
            sku: product.sku || null,
            category: product.category || "other",
            image_url: product.image_url || "/placeholder.svg",
            in_stock: product.in_stock,
            is_featured: false,
            business_id: "cf941cc4-e1d1-4d7c-8122-a5df81a1e53c",
            pet_type: product.petType as any || null,
          });

          if (error) {
            console.error("Insert error:", error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error("Error inserting product:", err);
          errorCount++;
        }
      }

      toast({
        title: `${successCount} מוצרים הועלו לחנות`,
        description: errorCount > 0 ? `${errorCount} מוצרים נכשלו` : "כל המוצרים הועלו בהצלחה!",
        variant: errorCount > 0 && successCount === 0 ? "destructive" : "default",
      });

      if (successCount > 0) {
        handleClose();
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast({
        title: "שגיאה בהעלאה",
        description: "אירעה שגיאה בהעלאת המוצרים",
        variant: "destructive",
      });
    } finally {
      setIsUploadingToStore(false);
    }
  };

  // Remove enriched product
  const removeEnrichedProduct = (productId: string) => {
    setEnrichedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const validCount = parsedProducts.filter(p => p.isValid).length;
  const invalidCount = parsedProducts.filter(p => !p.isValid).length;
  const enrichedCount = enrichedProducts.filter(p => p.isEnriched).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            ייבוא מוצרים מקובץ
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 py-4"
            >
              <p className="text-sm text-muted-foreground text-center">
                בחר סוג קובץ לייבוא מוצרים
              </p>

              <div className="grid grid-cols-2 gap-3">
                {fileTypes.filter(t => t.id !== 'url').map((type) => (
                  <motion.button
                    key={type.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = type.accept;
                        fileInputRef.current.click();
                      }
                    }}
                    disabled={isProcessing}
                    className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50"
                  >
                    <type.icon className={`w-10 h-10 ${type.color}`} />
                    <span className="text-sm font-medium">{type.label}</span>
                  </motion.button>
                ))}
              </div>

              {/* URL Import Option */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setStep('url')}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed border-orange-500/30 hover:border-orange-500 hover:bg-orange-500/5 transition-all disabled:opacity-50"
              >
                <Link className="w-6 h-6 text-orange-500" />
                <span className="text-sm font-medium">ייבוא מקישור URL (דף מוצר או קטלוג)</span>
              </motion.button>

              {isProcessing && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">מעבד את הקובץ...</p>
                  {selectedFile && (
                    <Badge variant="secondary">{selectedFile.name}</Badge>
                  )}
                </div>
              )}

              <div className="bg-muted/30 p-4 rounded-lg text-xs text-muted-foreground">
                <p className="font-medium mb-2">פורמט נתמך:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>CSV/Excel: עמודות name, price, sku, category, description</li>
                  <li>PDF: קטלוג מוצרים או רשימת מחיר</li>
                  <li>תמונה: צילום של מחירון או רשימת מוצרים</li>
                  <li>URL: קישור לדף מוצר או קטלוג אונליין</li>
                </ul>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />
            </motion.div>
          )}

          {step === 'url' && (
            <motion.div
              key="url"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 py-4"
            >
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('upload')}
                >
                  חזרה
                </Button>
                <p className="text-sm font-medium">ייבוא מקישור URL</p>
              </div>

              <div className="space-y-3">
                <Label>הזן קישור לדף מוצר או קטלוג</Label>
                <div className="flex gap-2">
                  <Input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/product/..."
                    className="flex-1"
                    dir="ltr"
                  />
                  <Button 
                    onClick={handleURLImport}
                    disabled={isProcessing || !urlInput.trim()}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Link className="w-4 h-4 ml-2" />
                        טען
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {isProcessing && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">טוען מוצרים מהקישור...</p>
                </div>
              )}

              <div className="bg-muted/30 p-4 rounded-lg text-xs text-muted-foreground">
                <p className="font-medium mb-2">דוגמאות לקישורים נתמכים:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>דף מוצר בודד מחנות אונליין</li>
                  <li>עמוד קטגוריה עם רשימת מוצרים</li>
                  <li>קטלוג דיגיטלי</li>
                </ul>
              </div>
            </motion.div>
          )}

          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Stats & Actions */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-4">
                    <Badge variant="default" className="gap-1">
                      <Check className="w-3 h-3" />
                      {validCount} תקינים
                    </Badge>
                    {invalidCount > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {invalidCount} לתיקון
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep('upload')}
                  >
                    העלאה חדשה
                  </Button>
                </div>

                {/* AI Fix & Upload Actions */}
                <div className="flex items-center gap-2">
                  {invalidCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFixAllWithAI}
                      disabled={isFixingAll || isUploadingToStore}
                      className="gap-2 flex-1 border-purple-500/50 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                    >
                      {isFixingAll ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          מתקן... ({fixProgress.current}/{fixProgress.total})
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4" />
                          תקן הכל עם AI ({invalidCount})
                        </>
                      )}
                    </Button>
                  )}
                  
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleEnrichAndUpload}
                    disabled={validCount === 0 || isFixingAll || isEnriching}
                    className="gap-2 flex-1"
                  >
                    {isEnriching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        מעשיר נתונים... ({enrichProgress.current}/{enrichProgress.total})
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        העשר והעלה לחנות ({validCount})
                      </>
                    )}
                  </Button>
                </div>

                {/* Progress indicator during AI fix */}
                {isFixingAll && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-purple-700">
                      <Sparkles className="w-4 h-4" />
                      <span>ה-AI מחפש ומתקן את המוצרים...</span>
                    </div>
                    <div className="mt-2 w-full bg-purple-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${fixProgress.total > 0 ? (fixProgress.current / fixProgress.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Progress indicator during enrichment */}
                {isEnriching && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Sparkles className="w-4 h-4" />
                      <span>משלים נתונים חסרים ממקורות אמינים...</span>
                    </div>
                    <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${enrichProgress.total > 0 ? (enrichProgress.current / enrichProgress.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Products List */}
              <ScrollArea className="h-[400px] pr-2">
                <div className="space-y-3">
                  {parsedProducts.map((product) => (
                    <Collapsible
                      key={product.id}
                      open={expandedProducts.has(product.id)}
                      onOpenChange={() => toggleProductExpand(product.id)}
                    >
                      <Card className={`overflow-hidden ${product.isFixing ? 'border-purple-500/50 bg-purple-50/50' : !product.isValid ? 'border-destructive/50 bg-destructive/5' : 'hover:border-primary/50'} transition-colors`}>
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center gap-3 p-3 cursor-pointer">
                            {/* Product Image */}
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 border relative">
                              {product.isFixing && (
                                <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center z-10">
                                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                                </div>
                              )}
                              {product.image_url ? (
                                <img 
                                  src={product.image_url} 
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <Image className="w-6 h-6" />
                                </div>
                              )}
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  product.isFixing ? 'bg-purple-100 text-purple-600' :
                                  product.isValid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                }`}>
                                  {product.isFixing ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : product.isValid ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <AlertCircle className="w-3 h-3" />
                                  )}
                                </div>
                                <p className="font-medium truncate">{product.name || 'ללא שם'}</p>
                                {product.isFixing && (
                                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                                    מתקן...
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                <span className="font-semibold text-foreground">₪{product.price}</span>
                                {product.sku && <span className="text-xs">מק״ט: {product.sku}</span>}
                                {product.category && (
                                  <Badge variant="secondary" className="text-xs">
                                    {categories.find(c => c.value === product.category)?.label || product.category}
                                  </Badge>
                                )}
                              </div>
                              {product.description && (
                                <p className="text-xs text-muted-foreground truncate mt-1">
                                  {product.description}
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {/* Individual AI Fix Button */}
                              {!product.isValid && !product.isFixing && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-purple-500 hover:text-purple-700 hover:bg-purple-50"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setParsedProducts(prev => prev.map(p => 
                                      p.id === product.id ? { ...p, isFixing: true } : p
                                    ));
                                    const fixed = await fixProductWithAI(product);
                                    setParsedProducts(prev => prev.map(p => 
                                      p.id === product.id ? fixed : p
                                    ));
                                  }}
                                  title="תקן עם AI"
                                >
                                  <Wand2 className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProductExpand(product.id);
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeProduct(product.id);
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                              {expandedProducts.has(product.id) ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent className="px-3 pb-3 border-t bg-muted/20">
                          <div className="pt-3 space-y-3">
                            {product.errors.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {product.errors.map((err, i) => (
                                  <Badge key={i} variant="destructive" className="text-xs">
                                    {err}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                              <div className="col-span-2 flex gap-3">
                                {/* Image preview in edit mode */}
                                <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 border">
                                  {product.image_url ? (
                                    <img 
                                      src={product.image_url} 
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                      <Image className="w-6 h-6" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <Label className="text-xs">קישור לתמונה</Label>
                                  <Input
                                    value={product.image_url}
                                    onChange={(e) => updateProduct(product.id, { image_url: e.target.value })}
                                    className="h-8 text-sm"
                                    placeholder="https://..."
                                    dir="ltr"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs">שם המוצר</Label>
                                <Input
                                  value={product.name}
                                  onChange={(e) => updateProduct(product.id, { name: e.target.value })}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">מחיר</Label>
                                <Input
                                  type="number"
                                  value={product.price}
                                  onChange={(e) => updateProduct(product.id, { price: parseFloat(e.target.value) || 0 })}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">מק״ט</Label>
                                <Input
                                  value={product.sku}
                                  onChange={(e) => updateProduct(product.id, { sku: e.target.value })}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">קטגוריה</Label>
                                <Select
                                  value={product.category}
                                  onValueChange={(value) => updateProduct(product.id, { category: value })}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categories.map((cat) => (
                                      <SelectItem key={cat.value} value={cat.value}>
                                        {cat.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs">תיאור</Label>
                                <Input
                                  value={product.description}
                                  onChange={(e) => updateProduct(product.id, { description: e.target.value })}
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>
          )}

          {/* Enrichment Review Step */}
          {step === 'enrich' && (
            <motion.div
              key="enrich"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 py-4"
            >
              {/* Summary Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {enrichedCount} הועשרו
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    מתוך {enrichedProducts.length} מוצרים
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('review')}
                >
                  חזרה לעריכה
                </Button>
              </div>

              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2 text-sm text-blue-700">
                  <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">בדוק את הנתונים המועשרים</p>
                    <p className="text-blue-600 text-xs mt-1">
                      הנתונים הושלמו ממקורות אמינים. וודא שהם נכונים לפני העלאה לחנות.
                    </p>
                  </div>
                </div>
              </div>

              {/* Enriched Products List */}
              <ScrollArea className="h-[350px] pr-2">
                <div className="space-y-3">
                  {enrichedProducts.map((product) => (
                    <Card key={product.id} className={`overflow-hidden transition-colors ${product.isEnriched ? 'border-green-500/30' : 'border-orange-500/30'}`}>
                      <div className="flex items-start gap-3 p-3">
                        {/* Product Image */}
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 border">
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder.svg';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Image className="w-6 h-6" />
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{product.name}</p>
                            {product.isEnriched && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                <Check className="w-3 h-3 mr-1" />
                                הועשר
                              </Badge>
                            )}
                            {!product.isEnriched && (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                                לא הועשר
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="font-semibold text-foreground">₪{product.price}</span>
                            {product.sku && <span className="text-xs">מק״ט: {product.sku}</span>}
                            {product.category && (
                              <Badge variant="secondary" className="text-xs">
                                {categories.find(c => c.value === product.category)?.label || product.category}
                              </Badge>
                            )}
                          </div>
                          
                          {product.description && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {product.description}
                            </p>
                          )}
                          
                          {product.enrichedFrom && product.enrichedFrom !== 'קיים' && (
                            <p className="text-xs text-green-600 mt-1">
                              מקור: {product.enrichedFrom}
                            </p>
                          )}
                        </div>

                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive flex-shrink-0"
                          onClick={() => removeEnrichedProduct(product.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setStep('review')} className="flex-1">
                  חזרה לעריכה
                </Button>
                <Button 
                  onClick={handleFinalUpload}
                  disabled={enrichedProducts.length === 0 || isUploadingToStore}
                  className="flex-1 gap-2"
                >
                  {isUploadingToStore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      מעלה...
                    </>
                  ) : (
                    <>
                      <Store className="w-4 h-4" />
                      אשר והעלה לחנות ({enrichedProducts.length})
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {step === 'review' && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose}>
              ביטול
            </Button>
            <Button 
              onClick={handleImport}
              disabled={validCount === 0}
              className="gap-2"
            >
              <Check className="w-4 h-4" />
              ייבא {validCount} מוצרים
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
