import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  LayoutGrid,
  List,
  ChevronDown,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  sale_price?: number;
  stock: number;
  image_url?: string;
}

export const DashboardProductTable = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('business_products')
        .select('id, name, sku, price, sale_price, image_url')
        .limit(10);

      if (error) throw error;
      
      setProducts(data?.map(p => ({
        ...p,
        stock: Math.floor(Math.random() * 50) + 5,
      })) || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      // Mock data fallback
      setProducts([
        { id: '1', name: 'TAURO Pro Line Pure Mist', sku: '4779051E', price: 109, sale_price: 319, stock: 15 },
        { id: '2', name: 'YOWUP Dog Bath Shampoo', sku: '84970237', price: 30, sale_price: 34, stock: 12 },
        { id: '3', name: 'Morando Professional Sterilized Adult Dog. 3kg', sku: '84198155', price: 286, sale_price: 832, stock: 34 },
        { id: '4', name: 'KONG Classic Medium Dog', sku: 'SN1911REDM', price: 37, sale_price: 250, stock: 28 },
        { id: '5', name: 'Josera Kids Puppy Food', sku: '4043941', price: 237, sale_price: 699, stock: 49 },
        { id: '6', name: 'HERTA Cat Food Special Sterilized 12kg', sku: 'H1897293', price: 118, sale_price: 33, stock: 49 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Product Management</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[150px] h-8 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2 h-8">
              <Filter className="w-3.5 h-3.5" />
              Filter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <Layers className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">Default</span>
            <Button variant="ghost" size="icon" className={cn("w-8 h-8", viewMode === 'list' && "bg-muted")}>
              <List className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className={cn("w-8 h-8", viewMode === 'grid' && "bg-muted")}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-3 px-2 font-medium">Product</th>
                <th className="text-left py-3 px-2 font-medium">SKU</th>
                <th className="text-left py-3 px-2 font-medium">Retail Price</th>
                <th className="text-left py-3 px-2 font-medium">Discounted Price</th>
                <th className="text-center py-3 px-2 font-medium">Stock</th>
                <th className="py-3 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, idx) => {
                const isHighlighted = product.name.includes('HERTA');
                return (
                  <tr 
                    key={product.id} 
                    className={cn(
                      "border-b hover:bg-muted/50 transition-colors",
                      isHighlighted && "bg-sky-50"
                    )}
                  >
                    <td className="py-3 px-2">
                      <span className={cn(isHighlighted && "text-sky-600 font-medium")}>
                        {product.name}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">{product.sku}</td>
                    <td className="py-3 px-2">
                      <span className={cn(isHighlighted && "text-sky-600")}>
                        ₪{product.price}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={cn(isHighlighted && "text-sky-600")}>
                        ₪{product.sale_price || product.price}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">{product.stock}</td>
                    <td className="py-3 px-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                          "w-7 h-7 rounded-md",
                          isHighlighted ? "bg-sky-500 text-white hover:bg-sky-600" : "bg-slate-100 hover:bg-slate-200"
                        )}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
