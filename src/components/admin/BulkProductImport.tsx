import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileSpreadsheet, FileText, Image, Upload, Loader2, 
  Check, X, Edit2, ChevronDown, ChevronUp, AlertCircle, Link
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
import * as XLSX from "xlsx";

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
  const [step, setStep] = useState<'upload' | 'url' | 'review'>('upload');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [urlInput, setUrlInput] = useState("");

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
    onOpenChange(false);
  };

  const validCount = parsedProducts.filter(p => p.isValid).length;
  const invalidCount = parsedProducts.filter(p => !p.isValid).length;

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
              {/* Stats */}
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

              {/* Products List */}
              <ScrollArea className="h-[400px] pr-2">
                <div className="space-y-3">
                  {parsedProducts.map((product) => (
                    <Collapsible
                      key={product.id}
                      open={expandedProducts.has(product.id)}
                      onOpenChange={() => toggleProductExpand(product.id)}
                    >
                      <Card className={`overflow-hidden ${!product.isValid ? 'border-destructive/50 bg-destructive/5' : 'hover:border-primary/50'} transition-colors`}>
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center gap-3 p-3 cursor-pointer">
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
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  product.isValid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                }`}>
                                  {product.isValid ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                </div>
                                <p className="font-medium truncate">{product.name || 'ללא שם'}</p>
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
