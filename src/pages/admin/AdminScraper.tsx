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
  Clock
} from "lucide-react";

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

const AdminScraper = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ScrapedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [currentJob, setCurrentJob] = useState<ScrapingJob | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ScrapedProduct | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [stockFilter, setStockFilter] = useState<string>("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  
  // Scraping config
  const [baseUrl, setBaseUrl] = useState("https://homepetcenter.co.il");
  const [maxProducts, setMaxProducts] = useState("");
  
  // Categories for filter
  const [categories, setCategories] = useState<string[]>([]);

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

  const startScraping = async () => {
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

      // Start the scraping function
      const { error } = await supabase.functions.invoke('scrape-products', {
        body: {
          jobId: job.id,
          baseUrl,
          maxProducts: maxProducts ? parseInt(maxProducts) : undefined,
        },
      });

      if (error) throw error;

      toast.success("הסקראפינג התחיל!");
    } catch (error) {
      console.error("Error starting scrape:", error);
      toast.error("שגיאה בהתחלת הסקראפינג");
      setScraping(false);
    }
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
          <CardContent className="space-y-4">
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
              <div className="flex items-end">
                <Button 
                  onClick={startScraping} 
                  disabled={scraping || !baseUrl}
                  className="w-full"
                >
                  {scraping ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      סורק...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 ml-2" />
                      התחל סקראפינג
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Progress */}
            {currentJob && (currentJob.status === 'running' || currentJob.status === 'pending') && (
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {currentJob.status === 'running' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">
                      {currentJob.status === 'running' ? 'סורק מוצרים...' : 'ממתין להתחלה...'}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {currentJob.scraped_products} / {currentJob.total_products || '?'} מוצרים
                  </span>
                </div>
                <Progress value={getJobProgress()} className="h-2" />
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
      </div>
    </AdminLayout>
  );
};

export default AdminScraper;
