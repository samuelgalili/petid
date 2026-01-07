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
  Bell
} from "lucide-react";
import { toast } from "sonner";

const AdminInventory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["inventory-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_products")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const filteredProducts = products?.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const isLowStock = !product.in_stock;
    if (filterLowStock) return matchesSearch && isLowStock;
    return matchesSearch;
  });

  const totalProducts = products?.length || 0;
  const inStockProducts = products?.filter(p => p.in_stock).length || 0;
  const outOfStockProducts = products?.filter(p => !p.in_stock).length || 0;
  const lowStockProducts = products?.filter(p => !p.in_stock).length || 0;

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

  const toggleStock = useMutation({
    mutationFn: async ({ id, inStock }: { id: string; inStock: boolean }) => {
      const { error } = await supabase
        .from("business_products")
        .update({ in_stock: inStock })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      toast.success("המלאי עודכן בהצלחה");
    },
  });

  return (
    <AdminLayout title="ניהול מלאי" icon={Package}>
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 to-slate-800">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-10`} />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Controls */}
        <Card className="border-0 bg-gradient-to-br from-slate-900 to-slate-800">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="חיפוש מוצר..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <Button
                variant={filterLowStock ? "default" : "outline"}
                onClick={() => setFilterLowStock(!filterLowStock)}
                className={filterLowStock ? "bg-gradient-to-r from-amber-500 to-orange-600" : "border-slate-700 text-slate-300"}
              >
                <AlertTriangle className="w-4 h-4 ml-2" />
                מלאי נמוך בלבד
              </Button>
              <Button variant="outline" className="border-slate-700 text-slate-300">
                <Download className="w-4 h-4 ml-2" />
                ייצוא
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Products List */}
        <Card className="border-0 bg-gradient-to-br from-slate-900 to-slate-800">
          <CardHeader className="border-b border-slate-700/50">
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-violet-400" />
              רשימת מוצרים ({filteredProducts?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">טוען...</div>
            ) : filteredProducts?.length === 0 ? (
              <div className="p-8 text-center text-slate-400">לא נמצאו מוצרים</div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {filteredProducts?.map((product) => (
                  <div key={product.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-slate-800 overflow-hidden shrink-0">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{product.name}</h3>
                        <p className="text-sm text-slate-400">{product.category || "ללא קטגוריה"}</p>
                        <p className="text-sm text-violet-400">₪{product.price}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          className={product.in_stock 
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                          }
                        >
                          {product.in_stock ? "במלאי" : "אזל"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-700 text-slate-300 hover:bg-slate-700"
                          onClick={() => toggleStock.mutate({ id: product.id, inStock: !product.in_stock })}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminInventory;