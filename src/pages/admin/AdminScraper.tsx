import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  Download, 
  Play, 
  RefreshCw, 
  Package, 
  ExternalLink,
  Filter,
  X,
  FileJson,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Square,
  Pause,
  Dog,
  Cat,
  Bird
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ScrapedProduct {
  id: string;
  product_id: string | null;
  sku: string | null;
  product_name: string;
  product_url: string;
  brand: string | null;
  category_path: string | null;
  main_category: string | null;
  sub_category: string | null;
  regular_price: number | null;
  sale_price: number | null;
  final_price: number | null;
  currency: string | null;
  discount_text: string | null;
  stock_status: string | null;
  stock_badge: string | null;
  short_description: string | null;
  long_description: string | null;
  main_image_url: string | null;
  meta_title: string | null;
  badges: string[] | null;
  rating: number | null;
  review_count: number | null;
  scraped_at: string;
}

interface ScrapingJob {
  id: string;
  base_url: string;
  status: string;
  total_pages: number;
  scraped_pages: number;
  total_products: number;
  scraped_products: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface PreviewProduct {
  product_name: string;
  product_url: string;
  final_price?: number;
  regular_price?: number;
  sale_price?: number;
  stock_status?: string;
  main_image_url?: string;
  category_path?: string;
  brand?: string;
  short_description?: string;
}

interface ScanResult {
  totalUrls: number;
  productUrls: string[];
}

const AdminScraper = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ScrapedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [currentJob, setCurrentJob] = useState<ScrapingJob | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ScrapedProduct | null>(null);
  
  // Preview/Approval flow state
  const [scanningUrls, setScanningUrls] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [previewProduct, setPreviewProduct] = useState<PreviewProduct | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showScanResultDialog, setShowScanResultDialog] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [stockFilter, setStockFilter] = useState<string>("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  
  // Scraping config
  const [baseUrl, setBaseUrl] = useState("https://homepetcenter.co.il");
  const [maxProducts, setMaxProducts] = useState("");
  
  // Scraping filters
  const [scrapePetTypes, setScrapePetTypes] = useState<string[]>(['dog', 'cat', 'bird']);
  const [scrapeProductCategories, setScrapeProductCategories] = useState<string[]>(['dry-food', 'wet-food', 'treats', 'toys', 'accessories']);
  
  // Categories for filter
  const [categories, setCategories] = useState<string[]>([]);
  
  // Available scraping options
  const petTypeOptions = [
    { id: 'dog', label: 'כלבים', icon: Dog },
    { id: 'cat', label: 'חתולים', icon: Cat },
    { id: 'bird', label: 'ציפורים', icon: Bird },
  ];
  
  const productCategoryOptions = [
    { id: 'dry-food', label: 'מזון יבש' },
    { id: 'wet-food', label: 'מזון רטוב' },
    { id: 'treats', label: 'חטיפים' },
    { id: 'toys', label: 'צעצועים' },
    { id: 'accessories', label: 'אביזרים' },
    { id: 'health', label: 'בריאות' },
    { id: 'grooming', label: 'טיפוח' },
  ];

  useEffect(() => {
    fetchProducts();
    fetchCurrentJob();
  }, []);

  // Subscribe to job updates
  useEffect(() => {
    if (!currentJob?.id) return;

    const channel = supabase
      .channel(`job-${currentJob.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scraping_jobs',
          filter: `id=eq.${currentJob.id}`,
        },
        (payload) => {
          setCurrentJob(payload.new as ScrapingJob);
          if (payload.new.status === 'completed') {
            setScraping(false);
            fetchProducts();
            toast.success("הסקראפינג הושלם בהצלחה!");
          } else if (payload.new.status === 'failed') {
            setScraping(false);
            toast.error("הסקראפינג נכשל: " + payload.new.error_message);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentJob?.id]);

  const fetchProducts = async () => {
    try {
      let query = supabase
        .from('scraped_products')
        .select('*')
        .order('scraped_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      setProducts((data as ScrapedProduct[]) || []);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(
        (data || [])
          .map(p => p.main_category)
          .filter(Boolean)
      )] as string[];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("שגיאה בטעינת המוצרים");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentJob = async () => {
    const { data } = await supabase
      .from('scraping_jobs')
      .select('*')
      .in('status', ['pending', 'running'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setCurrentJob(data as ScrapingJob);
      if (data.status === 'running') {
        setScraping(true);
      }
    }
  };

  // Step 1: Scan URL to find products
  const scanForProducts = async () => {
    if (!baseUrl) {
      toast.error("יש להזין כתובת אתר");
      return;
    }
    
    try {
      setScanningUrls(true);
      setScanResult(null);
      
      const { data, error } = await supabase.functions.invoke('scrape-products', {
        body: {
          mode: 'scan',
          baseUrl,
          petTypes: scrapePetTypes,
          productCategories: scrapeProductCategories,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setScanResult({
          totalUrls: data.totalUrls,
          productUrls: data.productUrls,
        });
        setShowScanResultDialog(true);
      } else {
        throw new Error(data?.error || 'Failed to scan');
      }
    } catch (error) {
      console.error("Error scanning:", error);
      toast.error("שגיאה בסריקת האתר");
    } finally {
      setScanningUrls(false);
    }
  };

  // Step 2: Get preview of first product
  const getProductPreview = async () => {
    if (!scanResult?.productUrls?.length) return;
    
    try {
      setLoadingPreview(true);
      setShowScanResultDialog(false);
      
      const { data, error } = await supabase.functions.invoke('scrape-products', {
        body: {
          mode: 'preview',
          baseUrl,
          productUrl: scanResult.productUrls[0],
        },
      });

      if (error) throw error;

      if (data?.success && data?.product) {
        setPreviewProduct(data.product);
        setShowPreviewDialog(true);
      } else {
        throw new Error(data?.error || 'Failed to get preview');
      }
    } catch (error) {
      console.error("Error getting preview:", error);
      toast.error("שגיאה בטעינת תצוגה מקדימה");
    } finally {
      setLoadingPreview(false);
    }
  };

  // Step 3: Start full scraping after approval
  const startFullScraping = async () => {
    setShowPreviewDialog(false);
    
    try {
      setScraping(true);
      
      // Create a new job
      const { data: job, error: jobError } = await supabase
        .from('scraping_jobs')
        .insert({
          base_url: baseUrl,
          status: 'pending',
        })
        .select()
        .single();

      if (jobError) throw jobError;

      setCurrentJob(job as ScrapingJob);

      // Start the scraping function with filters
      const { error } = await supabase.functions.invoke('scrape-products', {
        body: {
          mode: 'full',
          jobId: job.id,
          baseUrl,
          maxProducts: maxProducts ? parseInt(maxProducts) : undefined,
          petTypes: scrapePetTypes,
          productCategories: scrapeProductCategories,
          productUrls: scanResult?.productUrls,
        },
      });

      if (error) throw error;

      toast.success("הסקראפינג המלא התחיל!");
      setScanResult(null);
      setPreviewProduct(null);
    } catch (error) {
      console.error("Error starting scrape:", error);
      toast.error("שגיאה בהתחלת הסקראפינג");
      setScraping(false);
    }
  };

  const cancelScraping = () => {
    setShowScanResultDialog(false);
    setShowPreviewDialog(false);
    setScanResult(null);
    setPreviewProduct(null);
  };

  const stopScraping = async () => {
    if (!currentJob) return;
    
    try {
      await supabase
        .from('scraping_jobs')
        .update({ 
          status: 'stopped', 
          error_message: 'Stopped by user',
          completed_at: new Date().toISOString() 
        })
        .eq('id', currentJob.id);

      setScraping(false);
      setCurrentJob(prev => prev ? { ...prev, status: 'stopped' } : null);
      toast.success("הסקראפינג נעצר");
    } catch (error) {
      console.error("Error stopping scrape:", error);
      toast.error("שגיאה בעצירת הסקראפינג");
    }
  };

  const pauseScraping = async () => {
    if (!currentJob) return;
    
    try {
      await supabase
        .from('scraping_jobs')
        .update({ status: 'paused' })
        .eq('id', currentJob.id);

      setCurrentJob(prev => prev ? { ...prev, status: 'paused' } : null);
      toast.success("הסקראפינג הושהה");
    } catch (error) {
      console.error("Error pausing scrape:", error);
      toast.error("שגיאה בהשהיית הסקראפינג");
    }
  };

  const resumeScraping = async () => {
    if (!currentJob) return;
    
    try {
      await supabase
        .from('scraping_jobs')
        .update({ status: 'running' })
        .eq('id', currentJob.id);

      setCurrentJob(prev => prev ? { ...prev, status: 'running' } : null);
      toast.success("הסקראפינג ממשיך");
    } catch (error) {
      console.error("Error resuming scrape:", error);
      toast.error("שגיאה בהמשך הסקראפינג");
    }
  };

  const togglePetType = (petType: string) => {
    setScrapePetTypes(prev => 
      prev.includes(petType) 
        ? prev.filter(p => p !== petType)
        : [...prev, petType]
    );
  };

  const toggleProductCategory = (category: string) => {
    setScrapeProductCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const exportToCSV = () => {
    const filteredProducts = getFilteredProducts();
    
    const headers = [
      'ID', 'שם מוצר', 'מק"ט', 'מותג', 'קטגוריה', 'מחיר רגיל', 'מחיר מבצע', 
      'מחיר סופי', 'סטטוס מלאי', 'תיאור קצר', 'URL'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredProducts.map(p => [
        p.product_id || '',
        `"${(p.product_name || '').replace(/"/g, '""')}"`,
        p.sku || '',
        p.brand || '',
        p.main_category || '',
        p.regular_price || '',
        p.sale_price || '',
        p.final_price || '',
        p.stock_status || '',
        `"${(p.short_description || '').replace(/"/g, '""').substring(0, 100)}"`,
        p.product_url
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success("הקובץ יורד!");
  };

  const exportToJSON = () => {
    const filteredProducts = getFilteredProducts();
    
    const blob = new Blob([JSON.stringify(filteredProducts, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `products_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    toast.success("הקובץ יורד!");
  };

  const getFilteredProducts = () => {
    return products.filter(p => {
      // Search filter
      if (searchQuery && !p.product_name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Category filter
      if (categoryFilter && p.main_category !== categoryFilter) {
        return false;
      }
      
      // Stock filter
      if (stockFilter && p.stock_status !== stockFilter) {
        return false;
      }
      
      // Price range filter
      if (priceMin && p.final_price && p.final_price < parseFloat(priceMin)) {
        return false;
      }
      if (priceMax && p.final_price && p.final_price > parseFloat(priceMax)) {
        return false;
      }
      
      return true;
    });
  };

  const filteredProducts = getFilteredProducts();

  const getStockBadgeVariant = (status: string | null) => {
    switch (status) {
      case 'in_stock': return 'default';
      case 'out_of_stock': return 'destructive';
      case 'preorder': return 'secondary';
      default: return 'outline';
    }
  };

  const getStockLabel = (status: string | null) => {
    switch (status) {
      case 'in_stock': return 'במלאי';
      case 'out_of_stock': return 'אזל';
      case 'preorder': return 'הזמנה מראש';
      default: return 'לא ידוע';
    }
  };

  const getJobProgress = () => {
    if (!currentJob || currentJob.total_products === 0) return 0;
    return (currentJob.scraped_products / currentJob.total_products) * 100;
  };

  return (
    <AdminLayout title="סקראפר מוצרים" icon={Package}>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">סקראפר מוצרים</h1>
            <p className="text-muted-foreground">איסוף וניהול מוצרים מאתרי חנויות</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportToCSV} disabled={products.length === 0}>
              <FileSpreadsheet className="w-4 h-4 ml-2" />
              ייצוא ל-CSV
            </Button>
            <Button variant="outline" onClick={exportToJSON} disabled={products.length === 0}>
              <FileJson className="w-4 h-4 ml-2" />
              ייצוא ל-JSON
            </Button>
          </div>
        </div>

        {/* Scraping Control Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              הגדרות סקראפינג
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">כתובת האתר</label>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://homepetcenter.co.il"
                  disabled={scraping}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">מקסימום מוצרים (ריק = הכל)</label>
                <Input
                  type="number"
                  value={maxProducts}
                  onChange={(e) => setMaxProducts(e.target.value)}
                  placeholder="ללא הגבלה"
                  disabled={scraping}
                />
              </div>
              <div className="flex items-end gap-2">
                {!scraping && !scanningUrls && !loadingPreview ? (
                  <Button 
                    onClick={scanForProducts} 
                    disabled={!baseUrl || scrapePetTypes.length === 0 || scrapeProductCategories.length === 0}
                    className="flex-1"
                  >
                    <Search className="w-4 h-4 ml-2" />
                    סרוק אתר
                  </Button>
                ) : scanningUrls || loadingPreview ? (
                  <Button disabled className="flex-1">
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    {scanningUrls ? 'סורק...' : 'טוען תצוגה מקדימה...'}
                  </Button>
                ) : (
                  <Button 
                    onClick={stopScraping} 
                    variant="destructive"
                    className="flex-1"
                  >
                    <Square className="w-4 h-4 ml-2" />
                    עצור סקראפינג
                  </Button>
                )}
              </div>
            </div>

            {/* Pet type filters */}
            <div className="space-y-3">
              <label className="text-sm font-medium block">סוג חיית מחמד לסריקה</label>
              <div className="flex flex-wrap gap-4">
                {petTypeOptions.map(pet => {
                  const Icon = pet.icon;
                  return (
                    <div key={pet.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`pet-${pet.id}`}
                        checked={scrapePetTypes.includes(pet.id)}
                        onCheckedChange={() => togglePetType(pet.id)}
                        disabled={scraping}
                      />
                      <Label 
                        htmlFor={`pet-${pet.id}`} 
                        className="flex items-center gap-1 cursor-pointer"
                      >
                        <Icon className="w-4 h-4" />
                        {pet.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Product category filters */}
            <div className="space-y-3">
              <label className="text-sm font-medium block">קטגוריות מוצרים לסריקה</label>
              <div className="flex flex-wrap gap-4">
                {productCategoryOptions.map(cat => (
                  <div key={cat.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`cat-${cat.id}`}
                      checked={scrapeProductCategories.includes(cat.id)}
                      onCheckedChange={() => toggleProductCategory(cat.id)}
                      disabled={scraping}
                    />
                    <Label htmlFor={`cat-${cat.id}`} className="cursor-pointer">
                      {cat.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress */}
            {currentJob && (currentJob.status === 'running' || currentJob.status === 'pending' || currentJob.status === 'paused') && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {currentJob.status === 'running' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : currentJob.status === 'paused' ? (
                      <Pause className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">
                      {currentJob.status === 'running' ? 'סורק מוצרים...' : 
                       currentJob.status === 'paused' ? 'הסריקה מושהית' : 'ממתין להתחלה...'}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {currentJob.scraped_products} / {currentJob.total_products || '?'} מוצרים
                  </span>
                </div>
                <Progress value={getJobProgress()} className="h-2" />
                
                {/* Control buttons */}
                <div className="flex gap-2 pt-2">
                  {currentJob.status === 'running' && (
                    <Button 
                      onClick={pauseScraping} 
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Pause className="w-4 h-4 ml-2" />
                      השהה
                    </Button>
                  )}
                  {currentJob.status === 'paused' && (
                    <Button 
                      onClick={resumeScraping} 
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Play className="w-4 h-4 ml-2" />
                      המשך
                    </Button>
                  )}
                  <Button 
                    onClick={stopScraping} 
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                  >
                    <Square className="w-4 h-4 ml-2" />
                    עצור
                  </Button>
                </div>
              </div>
            )}

            {currentJob?.status === 'completed' && (
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm">
                  הסקראפינג הושלם! נמצאו {currentJob.scraped_products} מוצרים.
                </span>
              </div>
            )}

            {currentJob?.status === 'stopped' && (
              <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
                <Square className="w-5 h-5 text-amber-600" />
                <span className="text-sm">
                  הסקראפינג נעצר. נמצאו {currentJob.scraped_products} מוצרים.
                </span>
              </div>
            )}

            {currentJob?.status === 'failed' && (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-600">
                  שגיאה: {currentJob.error_message}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש לפי שם מוצר..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              
              <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="כל הקטגוריות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הקטגוריות</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={stockFilter || "all"} onValueChange={(v) => setStockFilter(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="סטטוס מלאי" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="in_stock">במלאי</SelectItem>
                  <SelectItem value="out_of_stock">אזל מהמלאי</SelectItem>
                  <SelectItem value="preorder">הזמנה מראש</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                type="number"
                placeholder="מחיר מינימלי"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
              />
              
              <Input
                type="number"
                placeholder="מחיר מקסימלי"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
              />
            </div>
            
            {(searchQuery || categoryFilter || stockFilter || priceMin || priceMax) && (
              <div className="flex items-center gap-2 mt-4">
                <span className="text-sm text-muted-foreground">
                  מציג {filteredProducts.length} מתוך {products.length} מוצרים
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("");
                    setStockFilter("");
                    setPriceMin("");
                    setPriceMax("");
                  }}
                >
                  <X className="w-4 h-4 ml-1" />
                  נקה פילטרים
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>מוצרים ({filteredProducts.length})</span>
              <Button variant="ghost" size="sm" onClick={fetchProducts}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>לא נמצאו מוצרים</p>
                <p className="text-sm">התחל סקראפינג כדי לאסוף מוצרים מהאתר</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">תמונה</TableHead>
                    <TableHead>שם מוצר</TableHead>
                    <TableHead>קטגוריה</TableHead>
                    <TableHead>מחיר</TableHead>
                    <TableHead>מלאי</TableHead>
                    <TableHead>פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow 
                      key={product.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <TableCell>
                        {product.main_image_url ? (
                          <img 
                            src={product.main_image_url} 
                            alt={product.product_name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium line-clamp-1">{product.product_name}</p>
                          {product.sku && (
                            <p className="text-xs text-muted-foreground">מק"ט: {product.sku}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{product.main_category || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {product.sale_price && product.regular_price ? (
                            <>
                              <span className="font-bold text-green-600">₪{product.sale_price}</span>
                              <span className="text-xs text-muted-foreground line-through">₪{product.regular_price}</span>
                            </>
                          ) : (
                            <span className="font-medium">₪{product.final_price || '-'}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStockBadgeVariant(product.stock_status)}>
                          {getStockLabel(product.stock_status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(product.product_url, '_blank');
                          }}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Product Detail Sheet */}
        <Sheet open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
          <SheetContent side="left" className="w-[500px] sm:w-[600px]" dir="rtl">
            <SheetHeader>
              <SheetTitle>פרטי מוצר</SheetTitle>
            </SheetHeader>
            {selectedProduct && (
              <ScrollArea className="h-[calc(100vh-100px)] mt-6">
                <div className="space-y-6 pb-6">
                  {/* Image */}
                  {selectedProduct.main_image_url && (
                    <img 
                      src={selectedProduct.main_image_url} 
                      alt={selectedProduct.product_name}
                      className="w-full h-64 object-contain bg-muted rounded-lg"
                    />
                  )}
                  
                  {/* Name & Price */}
                  <div>
                    <h3 className="text-xl font-bold">{selectedProduct.product_name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={getStockBadgeVariant(selectedProduct.stock_status)}>
                        {getStockLabel(selectedProduct.stock_status)}
                      </Badge>
                      {selectedProduct.brand && (
                        <Badge variant="outline">{selectedProduct.brand}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      {selectedProduct.sale_price ? (
                        <>
                          <span className="text-2xl font-bold text-green-600">₪{selectedProduct.sale_price}</span>
                          <span className="text-lg text-muted-foreground line-through">₪{selectedProduct.regular_price}</span>
                        </>
                      ) : (
                        <span className="text-2xl font-bold">₪{selectedProduct.final_price}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Details */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedProduct.sku && (
                        <div>
                          <span className="text-muted-foreground">מק"ט:</span>
                          <span className="mr-2 font-medium">{selectedProduct.sku}</span>
                        </div>
                      )}
                      {selectedProduct.category_path && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">קטגוריה:</span>
                          <span className="mr-2">{selectedProduct.category_path}</span>
                        </div>
                      )}
                    </div>
                    
                    {selectedProduct.short_description && (
                      <div>
                        <h4 className="font-medium mb-1">תיאור קצר</h4>
                        <p className="text-sm text-muted-foreground">{selectedProduct.short_description}</p>
                      </div>
                    )}
                    
                    {selectedProduct.long_description && (
                      <div>
                        <h4 className="font-medium mb-1">תיאור מלא</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedProduct.long_description}</p>
                      </div>
                    )}
                    
                    {selectedProduct.badges && selectedProduct.badges.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">תגיות</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedProduct.badges.map((badge, i) => (
                            <Badge key={i} variant="secondary">{badge}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedProduct.rating && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">דירוג:</span>
                        <span className="font-medium">{selectedProduct.rating}/5</span>
                        {selectedProduct.review_count && (
                          <span className="text-sm text-muted-foreground">
                            ({selectedProduct.review_count} ביקורות)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* URL */}
                  <div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.open(selectedProduct.product_url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 ml-2" />
                      פתח בחנות המקורית
                    </Button>
                  </div>
                  
                  {/* Meta */}
                  <div className="text-xs text-muted-foreground">
                    נסרק בתאריך: {new Date(selectedProduct.scraped_at).toLocaleString('he-IL')}
                  </div>
                </div>
              </ScrollArea>
            )}
          </SheetContent>
        </Sheet>

        {/* Scan Result Dialog */}
        <Dialog open={showScanResultDialog} onOpenChange={setShowScanResultDialog}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                תוצאות סריקה
              </DialogTitle>
              <DialogDescription>
                הסריקה הראשונית הושלמה
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {scanResult?.productUrls?.length || 0}
                </div>
                <div className="text-muted-foreground">
                  מוצרים נמצאו באתר
                </div>
              </div>
              <div className="text-sm text-muted-foreground text-center">
                כדי להמשיך, נציג לך את המוצר הראשון לאישור
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="outline" onClick={cancelScraping}>
                ביטול
              </Button>
              <Button onClick={getProductPreview}>
                הצג מוצר לדוגמה
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Product Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>תצוגה מקדימה של מוצר</DialogTitle>
              <DialogDescription>
                בדוק שהנתונים נראים תקינים לפני שתמשיך לסריקה מלאה
              </DialogDescription>
            </DialogHeader>
            {previewProduct && (
              <div className="space-y-4 py-4">
                {/* Product Image */}
                {previewProduct.main_image_url && (
                  <div className="flex justify-center">
                    <img 
                      src={previewProduct.main_image_url} 
                      alt={previewProduct.product_name}
                      className="max-w-[200px] max-h-[200px] object-contain rounded-lg border"
                    />
                  </div>
                )}
                
                {/* Product Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">שם המוצר:</span>
                    <div className="font-semibold">{previewProduct.product_name}</div>
                  </div>
                  
                  <div>
                    <span className="font-medium text-muted-foreground">מחיר:</span>
                    <div className="font-semibold text-primary">
                      {previewProduct.final_price ? `₪${previewProduct.final_price.toFixed(2)}` : 'לא זמין'}
                      {previewProduct.sale_price && previewProduct.regular_price && (
                        <span className="text-muted-foreground line-through mr-2 text-xs">
                          ₪{previewProduct.regular_price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium text-muted-foreground">מותג:</span>
                    <div>{previewProduct.brand || 'לא זמין'}</div>
                  </div>
                  
                  <div>
                    <span className="font-medium text-muted-foreground">סטטוס מלאי:</span>
                    <Badge variant={previewProduct.stock_status === 'in_stock' ? 'default' : 'destructive'}>
                      {previewProduct.stock_status === 'in_stock' ? 'במלאי' : 'אזל'}
                    </Badge>
                  </div>
                  
                  <div className="col-span-2">
                    <span className="font-medium text-muted-foreground">קטגוריה:</span>
                    <div>{previewProduct.category_path || 'לא זמין'}</div>
                  </div>
                  
                  {previewProduct.short_description && (
                    <div className="col-span-2">
                      <span className="font-medium text-muted-foreground">תיאור:</span>
                      <div className="text-sm">{previewProduct.short_description}</div>
                    </div>
                  )}
                  
                  <div className="col-span-2">
                    <span className="font-medium text-muted-foreground">URL:</span>
                    <a 
                      href={previewProduct.product_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-xs break-all"
                    >
                      {previewProduct.product_url}
                    </a>
                  </div>
                </div>
                
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="text-sm text-center text-muted-foreground">
                    אם הנתונים נראים תקינים, לחץ "אשר והתחל סריקה" כדי לסרוק את כל {scanResult?.productUrls?.length || 0} המוצרים
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="outline" onClick={cancelScraping}>
                ביטול
              </Button>
              <Button onClick={startFullScraping}>
                <Play className="w-4 h-4 ml-2" />
                אשר והתחל סריקה
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminScraper;
