import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Package, 
  Search, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp,
  RefreshCw,
  Filter,
  Download,
  Bell,
  Plus,
  Minus
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Product {
  id: string;
  name: string;
  category: string | null;
  price: number;
  image_url: string;
  in_stock: boolean | null;
  quantity: number;
  low_stock_threshold: number;
  source: 'manual' | 'scraped';
}

const AdminInventory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [quantityInput, setQuantityInput] = useState(0);
  const queryClient = useQueryClient();

  // Fetch products from both tables
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ["inventory-products-unified"],
    queryFn: async () => {
      // Fetch from business_products
      const { data: manualProducts, error: manualError } = await supabase
        .from("business_products")
        .select("id, name, category, price, image_url, in_stock")
        .order("name");
      
      if (manualError) throw manualError;

      // Fetch from scraped_products
      const { data: scrapedProducts, error: scrapedError } = await supabase
        .from("scraped_products")
        .select("id, product_name, category, price, image_url")
        .order("product_name");
      
      if (scrapedError) throw scrapedError;

      // Combine with source indicator
      const manual: Product[] = (manualProducts || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        image_url: p.image_url,
        in_stock: p.in_stock,
        quantity: p.in_stock ? 10 : 0,
        low_stock_threshold: 5,
        source: 'manual' as const,
      }));

      const scraped: Product[] = (scrapedProducts || []).map((p: any) => ({
        id: p.id,
        name: p.product_name,
        category: p.category,
        price: p.price,
        image_url: p.image_url,
        in_stock: true,
        quantity: 10,
        low_stock_threshold: 5,
        source: 'scraped' as const,
      }));

      return [...manual, ...scraped];
    },
  });

  const filteredProducts = products?.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const isLowStock = product.quantity <= product.low_stock_threshold;
    if (filterLowStock) return matchesSearch && isLowStock;
    return matchesSearch;
  });

  const totalProducts = products?.length || 0;
  const inStockProducts = products?.filter(p => p.quantity > 0).length || 0;
  const outOfStockProducts = products?.filter(p => p.quantity === 0).length || 0;
  const lowStockProducts = products?.filter(p => p.quantity > 0 && p.quantity <= p.low_stock_threshold).length || 0;
  const totalInventoryValue = products?.reduce((sum, p) => sum + (p.price * p.quantity), 0) || 0;

  const stats = [
    {
      title: "סה״כ מוצרים",
      value: totalProducts,
      icon: Package,
      gradient: "from-violet-500 to-purple-600",
    },
    {
      title: "במלאי",
      value: inStockProducts,
      icon: TrendingUp,
      gradient: "from-emerald-500 to-green-600",
    },
    {
      title: "אזל מהמלאי",
      value: outOfStockProducts,
      icon: TrendingDown,
      gradient: "from-red-500 to-rose-600",
    },
    {
      title: "מלאי נמוך",
      value: lowStockProducts,
      icon: AlertTriangle,
      gradient: "from-amber-500 to-orange-600",
    },
  ];

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, quantity, source }: { id: string; quantity: number; source: 'manual' | 'scraped' }) => {
      const tableName = source === 'scraped' ? 'scraped_products' : 'business_products';
      const { error } = await supabase
        .from(tableName)
        .update({ 
          quantity, 
          in_stock: quantity > 0 
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-products-unified"] });
      toast.success("הכמות עודכנה בהצלחה");
      setEditProduct(null);
    },
    onError: () => {
      toast.error("שגיאה בעדכון הכמות");
    },
  });

  const toggleStock = useMutation({
    mutationFn: async ({ id, inStock, source }: { id: string; inStock: boolean; source: 'manual' | 'scraped' }) => {
      const tableName = source === 'scraped' ? 'scraped_products' : 'business_products';
      const { error } = await supabase
        .from(tableName)
        .update({ 
          in_stock: inStock,
          quantity: inStock ? 10 : 0 
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-products-unified"] });
      toast.success("המלאי עודכן בהצלחה");
    },
  });

  const getStockStatus = (product: Product) => {
    if (product.quantity === 0) {
      return { label: "אזל", color: "bg-red-100 text-red-700 border-red-200" };
    }
    if (product.quantity <= product.low_stock_threshold) {
      return { label: `נמוך (${product.quantity})`, color: "bg-amber-100 text-amber-700 border-amber-200" };
    }
    return { label: `במלאי (${product.quantity})`, color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  };

  return (
    <AdminLayout title="ניהול מלאי" icon={Package}>
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-10`} />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Inventory Value Card */}
        <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">שווי מלאי כולל</p>
                <p className="text-3xl font-bold">₪{totalInventoryValue.toLocaleString()}</p>
              </div>
              <Package className="w-12 h-12 opacity-60" />
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש מוצר..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Button
                variant={filterLowStock ? "default" : "outline"}
                onClick={() => setFilterLowStock(!filterLowStock)}
              >
                <AlertTriangle className="w-4 h-4 ml-2" />
                מלאי נמוך בלבד ({lowStockProducts})
              </Button>
              <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  const csvContent = [
                    ['שם מוצר', 'קטגוריה', 'מחיר', 'כמות', 'סף מלאי נמוך', 'מקור'].join(','),
                    ...(filteredProducts || []).map(p => [
                      `"${p.name}"`,
                      `"${p.category || 'ללא'}"`,
                      p.price,
                      p.quantity,
                      p.low_stock_threshold,
                      p.source === 'scraped' ? 'מיובא' : 'ידני'
                    ].join(','))
                  ].join('\n');
                  
                  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
                  link.click();
                  toast.success('הקובץ יורד');
                }}
              >
                <Download className="w-4 h-4 ml-2" />
                ייצוא
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Products List */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              רשימת מוצרים ({filteredProducts?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                טוען...
              </div>
            ) : filteredProducts?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">לא נמצאו מוצרים</div>
            ) : (
              <div className="divide-y">
                {filteredProducts?.map((product) => {
                  const stockStatus = getStockStatus(product);
                  return (
                    <div key={product.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">{product.name}</h3>
                            {product.source === 'scraped' && (
                              <Badge variant="outline" className="text-xs">מיובא</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{product.category || "ללא קטגוריה"}</p>
                          <p className="text-sm text-primary">₪{product.price}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Quantity Progress */}
                          <div className="w-24 text-center">
                            <Progress 
                              value={Math.min(100, (product.quantity / 50) * 100)} 
                              className="h-2 mb-1"
                            />
                            <p className="text-xs text-muted-foreground">{product.quantity} יח'</p>
                          </div>
                          <Badge className={stockStatus.color}>
                            {stockStatus.label}
                          </Badge>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditProduct(product);
                                setQuantityInput(product.quantity);
                              }}
                            >
                              עדכן
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => updateQuantityMutation.mutate({
                                id: product.id,
                                quantity: Math.max(0, product.quantity - 1),
                                source: product.source,
                              })}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => updateQuantityMutation.mutate({
                                id: product.id,
                                quantity: product.quantity + 1,
                                source: product.source,
                              })}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Quantity Dialog */}
        <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>עדכון כמות מלאי</DialogTitle>
            </DialogHeader>
            {editProduct && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <img 
                    src={editProduct.image_url} 
                    alt={editProduct.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div>
                    <h3 className="font-medium">{editProduct.name}</h3>
                    <p className="text-sm text-muted-foreground">כמות נוכחית: {editProduct.quantity}</p>
                  </div>
                </div>
                <div>
                  <Label>כמות חדשה</Label>
                  <Input
                    type="number"
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(Number(e.target.value))}
                    min={0}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setEditProduct(null)}>
                    ביטול
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => updateQuantityMutation.mutate({
                      id: editProduct.id,
                      quantity: quantityInput,
                      source: editProduct.source,
                    })}
                    disabled={updateQuantityMutation.isPending}
                  >
                    עדכן
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminInventory;