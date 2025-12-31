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
import { Trash2 } from "lucide-react";

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

interface ProductVariant {
  name: string;
  value: string;
  price?: number;
  sku?: string;
  stock_status?: string;
  image_url?: string;
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
  sku?: string;
  // New fields
  variants?: ProductVariant[];
  pet_type?: string;
  weight?: string;
  weight_unit?: string;
  flavors?: string[];
  sizes?: string[];
  colors?: string[];
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
  
  // Scraping filters - default empty, user must select
  const [scrapePetTypes, setScrapePetTypes] = useState<string[]>([]);
  const [scrapeProductCategories, setScrapeProductCategories] = useState<string[]>([]);
  
  // Categories for filter
  const [categories, setCategories] = useState<string[]>([]);
  
  // Selection for bulk delete
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
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

  // Subscribe to job updates with polling fallback
  useEffect(() => {
    if (!currentJob?.id) return;

    // Polling fallback since Realtime may not always work
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('scraping_jobs')
        .select('*')
        .eq('id', currentJob.id)
        .single();
      
      if (data) {
        setCurrentJob(data as ScrapingJob);
        if (data.status === 'completed') {
          setScraping(false);
          fetchProducts();
          toast.success("הסקראפינג הושלם בהצלחה!");
          clearInterval(pollInterval);
        } else if (data.status === 'failed') {
          setScraping(false);
          toast.error("הסקראפינג נכשל: " + data.error_message);
          clearInterval(pollInterval);
        } else if (data.status === 'stopped') {
          setScraping(false);
          clearInterval(pollInterval);
        }
      }
    }, 2000); // Poll every 2 seconds

    // Also try Realtime subscription
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
            clearInterval(pollInterval);
          } else if (payload.new.status === 'failed') {
            setScraping(false);
            toast.error("הסקראפינג נכשל: " + payload.new.error_message);
            clearInterval(pollInterval);
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
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

  // Selection handlers
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const deleteSelectedProducts = async () => {
    if (selectedProducts.size === 0) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('scraped_products')
        .delete()
        .in('id', Array.from(selectedProducts));

      if (error) throw error;

      toast.success(`${selectedProducts.size} מוצרים נמחקו בהצלחה`);
      setSelectedProducts(new Set());
      setShowDeleteConfirm(false);
      fetchProducts();
    } catch (error) {
      console.error("Error deleting products:", error);
      toast.error("שגיאה במחיקת המוצרים");
    } finally {
      setDeleting(false);
    }
  };

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
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">סקראפר מוצרים</h1>
              <p className="text-muted-foreground text-xs sm:text-sm truncate">איסוף וניהול מוצרים מאתרי חנויות</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportToCSV} disabled={products.length === 0} size="sm" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              CSV
            </Button>
            <Button variant="outline" onClick={exportToJSON} disabled={products.length === 0} size="sm" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <FileJson className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              JSON
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-medium truncate">סה"כ מוצרים</p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-700 dark:text-blue-300">{products.length}</p>
                </div>
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500/50 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 font-medium truncate">במלאי</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-700 dark:text-green-300">
                    {products.filter(p => p.stock_status === 'in_stock').length}
                  </p>
                </div>
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500/50 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 font-medium truncate">קטגוריות</p>
                  <p className="text-lg sm:text-2xl font-bold text-amber-700 dark:text-amber-300">{categories.length}</p>
                </div>
                <Filter className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500/50 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          
          <Card className={`border ${scraping ? 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800 animate-pulse' : 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 border-slate-200 dark:border-slate-800'}`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-[10px] sm:text-xs font-medium truncate ${scraping ? 'text-purple-600 dark:text-purple-400' : 'text-slate-600 dark:text-slate-400'}`}>סטטוס</p>
                  <p className={`text-base sm:text-lg font-bold ${scraping ? 'text-purple-700 dark:text-purple-300' : 'text-slate-700 dark:text-slate-300'}`}>
                    {scraping ? 'פעיל' : 'לא פעיל'}
                  </p>
                </div>
                {scraping ? (
                  <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 animate-spin flex-shrink-0" />
                ) : (
                  <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-slate-500/50 flex-shrink-0" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scraping Control Card */}
        <Card className="border-2 border-dashed">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Search className="w-4 h-4 text-primary" />
              </div>
              הגדרות סריקה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic settings */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  כתובת האתר
                </label>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://example.com"
                  disabled={scraping}
                  className="font-mono text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  מקסימום מוצרים
                </label>
                <Input
                  type="number"
                  value={maxProducts}
                  onChange={(e) => setMaxProducts(e.target.value)}
                  placeholder="ללא הגבלה"
                  disabled={scraping}
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Pet type filters */}
            <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 bg-muted/30 rounded-xl">
              <label className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                <Dog className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                סוג חיית מחמד
              </label>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {petTypeOptions.map(pet => {
                  const Icon = pet.icon;
                  const isChecked = scrapePetTypes.includes(pet.id);
                  return (
                    <button
                      key={pet.id}
                      onClick={() => !scraping && togglePetType(pet.id)}
                      disabled={scraping}
                      className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 transition-all ${
                        isChecked 
                          ? 'bg-primary text-primary-foreground border-primary shadow-md' 
                          : 'bg-background text-muted-foreground border-muted-foreground/20 hover:border-primary/50'
                      } ${scraping ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isChecked ? '' : 'opacity-50'}`} />
                      <span className="text-xs sm:text-sm font-medium">{pet.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Product category filters */}
            <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 bg-muted/30 rounded-xl">
              <label className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                קטגוריות מוצרים
              </label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {productCategoryOptions.map(cat => {
                  const isChecked = scrapeProductCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => !scraping && toggleProductCategory(cat.id)}
                      disabled={scraping}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border transition-all text-xs sm:text-sm ${
                        isChecked 
                          ? 'bg-primary/10 text-primary border-primary/30 font-medium' 
                          : 'bg-background text-muted-foreground border-muted-foreground/20 hover:border-primary/50'
                      } ${scraping ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scan button - moved to bottom */}
            <div className="flex gap-2">
              {!scraping && !scanningUrls && !loadingPreview ? (
                <Button 
                  onClick={scanForProducts} 
                  disabled={!baseUrl || scrapePetTypes.length === 0 || scrapeProductCategories.length === 0}
                  className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-lg text-xs sm:text-sm"
                >
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
                  סרוק אתר
                </Button>
              ) : scanningUrls || loadingPreview ? (
                <Button disabled className="flex-1 text-xs sm:text-sm">
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2 animate-spin" />
                  {scanningUrls ? 'סורק...' : 'טוען...'}
                </Button>
              ) : (
                <Button 
                  onClick={stopScraping} 
                  variant="destructive"
                  className="flex-1 text-xs sm:text-sm"
                >
                  <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
                  עצור
                </Button>
              )}
            </div>

            {/* Progress */}
            {currentJob && (currentJob.status === 'running' || currentJob.status === 'pending' || currentJob.status === 'paused') && (
              <div className="space-y-4 p-5 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      currentJob.status === 'running' ? 'bg-primary/20' : 
                      currentJob.status === 'paused' ? 'bg-amber-500/20' : 'bg-muted'
                    }`}>
                      {currentJob.status === 'running' ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      ) : currentJob.status === 'paused' ? (
                        <Pause className="w-5 h-5 text-amber-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">
                        {currentJob.status === 'running' ? 'סורק מוצרים...' : 
                         currentJob.status === 'paused' ? 'הסריקה מושהית' : 'ממתין להתחלה...'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {currentJob.scraped_products} מתוך {currentJob.total_products || '?'} מוצרים
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-primary">{Math.round(getJobProgress())}%</p>
                  </div>
                </div>
                <Progress value={getJobProgress()} className="h-3 bg-primary/20" />
                
                {/* Control buttons */}
                <div className="flex gap-3 pt-1">
                  {currentJob.status === 'running' && (
                    <Button 
                      onClick={pauseScraping} 
                      variant="outline"
                      size="lg"
                      className="flex-1 gap-2"
                    >
                      <Pause className="w-4 h-4" />
                      השהה
                    </Button>
                  )}
                  {currentJob.status === 'paused' && (
                    <Button 
                      onClick={resumeScraping} 
                      size="lg"
                      className="flex-1 gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    >
                      <Play className="w-4 h-4" />
                      המשך
                    </Button>
                  )}
                  <Button 
                    onClick={stopScraping} 
                    variant="destructive"
                    size="lg"
                    className="flex-1 gap-2"
                  >
                    <Square className="w-4 h-4" />
                    עצור
                  </Button>
                </div>
              </div>
            )}

            {currentJob?.status === 'completed' && (
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-xl border border-green-200 dark:border-green-800">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-300">הסקראפינג הושלם!</p>
                  <p className="text-sm text-green-600 dark:text-green-400">נמצאו {currentJob.scraped_products} מוצרים</p>
                </div>
              </div>
            )}

            {currentJob?.status === 'stopped' && (
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Square className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-700 dark:text-amber-300">הסקראפינג נעצר</p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">נמצאו {currentJob.scraped_products} מוצרים</p>
                </div>
              </div>
            )}

            {currentJob?.status === 'failed' && (
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950 rounded-xl border border-red-200 dark:border-red-800">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-red-700 dark:text-red-300">שגיאה</p>
                  <p className="text-sm text-red-600 dark:text-red-400">{currentJob.error_message}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-5">
              <div className="relative col-span-2 md:col-span-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 sm:pr-10 text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>
              
              <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="text-xs sm:text-sm h-9 sm:h-10">
                  <SelectValue placeholder="קטגוריות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הקטגוריות</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={stockFilter || "all"} onValueChange={(v) => setStockFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="text-xs sm:text-sm h-9 sm:h-10">
                  <SelectValue placeholder="מלאי" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="in_stock">במלאי</SelectItem>
                  <SelectItem value="out_of_stock">אזל</SelectItem>
                  <SelectItem value="preorder">הזמנה מראש</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                type="number"
                placeholder="מחיר מינ׳"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="text-xs sm:text-sm h-9 sm:h-10"
              />
              
              <Input
                type="number"
                placeholder="מחיר מקס׳"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="text-xs sm:text-sm h-9 sm:h-10"
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
              <div className="flex items-center gap-3">
                <span>מוצרים ({filteredProducts.length})</span>
                {selectedProducts.size > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedProducts.size} נבחרו
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedProducts.size > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    מחק ({selectedProducts.size})
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={fetchProducts}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
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
              <div className="text-center py-8 sm:py-12 text-muted-foreground">
                <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-sm sm:text-base">לא נמצאו מוצרים</p>
                <p className="text-xs sm:text-sm">התחל סקראפינג כדי לאסוף מוצרים מהאתר</p>
              </div>
            ) : (
              <>
                {/* Mobile Cards View */}
                <div className="block sm:hidden space-y-3">
                  {/* Select all for mobile */}
                  <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                    <Checkbox 
                      id="select-all-mobile"
                      checked={filteredProducts.length > 0 && selectedProducts.size === filteredProducts.length}
                      onCheckedChange={toggleSelectAll}
                    />
                    <Label htmlFor="select-all-mobile" className="text-sm cursor-pointer">
                      בחר הכל
                    </Label>
                  </div>
                  {filteredProducts.slice(0, 20).map((product) => (
                    <div 
                      key={product.id}
                      className={`flex gap-3 p-3 border rounded-lg transition-colors ${
                        selectedProducts.has(product.id) ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center">
                        <Checkbox 
                          checked={selectedProducts.has(product.id)}
                          onCheckedChange={() => toggleProductSelection(product.id)}
                        />
                      </div>
                      <div 
                        className="flex gap-3 flex-1 cursor-pointer"
                        onClick={() => setSelectedProduct(product)}
                      >
                        {product.main_image_url ? (
                          <img 
                            src={product.main_image_url} 
                            alt={product.product_name}
                            className="w-16 h-16 object-cover rounded flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-2">{product.product_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{product.main_category || '-'}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1.5">
                              {product.sale_price && product.regular_price ? (
                                <>
                                  <span className="font-bold text-sm text-green-600">₪{product.sale_price}</span>
                                  <span className="text-[10px] text-muted-foreground line-through">₪{product.regular_price}</span>
                                </>
                              ) : (
                                <span className="font-medium text-sm">₪{product.final_price || '-'}</span>
                              )}
                            </div>
                            <Badge variant={getStockBadgeVariant(product.stock_status)} className="text-[10px] px-1.5 py-0.5">
                              {getStockLabel(product.stock_status)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredProducts.length > 20 && (
                    <p className="text-center text-xs text-muted-foreground py-2">
                      מציג 20 מתוך {filteredProducts.length} מוצרים
                    </p>
                  )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox 
                            checked={filteredProducts.length > 0 && selectedProducts.size === filteredProducts.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
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
                          className={`cursor-pointer ${
                            selectedProducts.has(product.id) ? 'bg-primary/5' : 'hover:bg-muted/50'
                          }`}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={selectedProducts.has(product.id)}
                              onCheckedChange={() => toggleProductSelection(product.id)}
                            />
                          </TableCell>
                          <TableCell onClick={() => setSelectedProduct(product)}>
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
                          <TableCell onClick={() => setSelectedProduct(product)}>
                            <div>
                              <p className="font-medium line-clamp-1">{product.product_name}</p>
                              {product.sku && (
                                <p className="text-xs text-muted-foreground">מק"ט: {product.sku}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell onClick={() => setSelectedProduct(product)}>
                            <span className="text-sm">{product.main_category || '-'}</span>
                          </TableCell>
                          <TableCell onClick={() => setSelectedProduct(product)}>
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
                          <TableCell onClick={() => setSelectedProduct(product)}>
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
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Product Detail Sheet */}
        <Sheet open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
          <SheetContent side="left" className="w-[90vw] sm:w-[500px] md:w-[600px]" dir="rtl">
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

                  {previewProduct.sku && (
                    <div>
                      <span className="font-medium text-muted-foreground">מק״ט:</span>
                      <div className="font-mono text-xs">{previewProduct.sku}</div>
                    </div>
                  )}

                  {previewProduct.pet_type && (
                    <div>
                      <span className="font-medium text-muted-foreground">סוג חיה:</span>
                      <Badge variant="outline">
                        {previewProduct.pet_type === 'dog' ? '🐕 כלב' : 
                         previewProduct.pet_type === 'cat' ? '🐈 חתול' :
                         previewProduct.pet_type === 'bird' ? '🐦 ציפור' :
                         previewProduct.pet_type === 'fish' ? '🐟 דג' : previewProduct.pet_type}
                      </Badge>
                    </div>
                  )}

                  {previewProduct.weight && (
                    <div>
                      <span className="font-medium text-muted-foreground">משקל:</span>
                      <div>{previewProduct.weight} {previewProduct.weight_unit || ''}</div>
                    </div>
                  )}
                  
                  <div className="col-span-2">
                    <span className="font-medium text-muted-foreground">קטגוריה:</span>
                    <div>{previewProduct.category_path || 'לא זמין'}</div>
                  </div>

                  {/* Sizes */}
                  {previewProduct.sizes && previewProduct.sizes.length > 0 && (
                    <div className="col-span-2">
                      <span className="font-medium text-muted-foreground">גדלים זמינים:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {previewProduct.sizes.map((size, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{size}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Flavors */}
                  {previewProduct.flavors && previewProduct.flavors.length > 0 && (
                    <div className="col-span-2">
                      <span className="font-medium text-muted-foreground">טעמים זמינים:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {previewProduct.flavors.map((flavor, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{flavor}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Colors */}
                  {previewProduct.colors && previewProduct.colors.length > 0 && (
                    <div className="col-span-2">
                      <span className="font-medium text-muted-foreground">צבעים זמינים:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {previewProduct.colors.map((color, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{color}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Variants */}
                  {previewProduct.variants && previewProduct.variants.length > 0 && (
                    <div className="col-span-2">
                      <span className="font-medium text-muted-foreground">וריאנטים ({previewProduct.variants.length}):</span>
                      <div className="mt-1 max-h-32 overflow-y-auto">
                        <div className="grid gap-1">
                          {previewProduct.variants.slice(0, 10).map((variant, i) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-muted/50 p-1.5 rounded">
                              <span>{variant.name}: {variant.value}</span>
                              {variant.price && <span className="font-medium">₪{variant.price}</span>}
                            </div>
                          ))}
                          {previewProduct.variants.length > 10 && (
                            <div className="text-xs text-muted-foreground text-center">
                              +{previewProduct.variants.length - 10} וריאנטים נוספים
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
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

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                אישור מחיקה
              </DialogTitle>
              <DialogDescription>
                האם אתה בטוח שברצונך למחוק {selectedProducts.size} מוצרים?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground text-center">
                פעולה זו לא ניתנת לביטול. כל המוצרים הנבחרים יימחקו לצמיתות.
              </p>
            </div>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                ביטול
              </Button>
              <Button 
                variant="destructive" 
                onClick={deleteSelectedProducts}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    מוחק...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 ml-2" />
                    מחק {selectedProducts.size} מוצרים
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminScraper;
