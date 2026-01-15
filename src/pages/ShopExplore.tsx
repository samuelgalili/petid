import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Heart, TrendingUp, Sparkles, Grid3X3, LayoutList, Filter, ShoppingBag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BottomNav from '@/components/BottomNav';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductCollectionsDisplay } from '@/components/shop/ProductCollectionsDisplay';

const ShopExplore = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('discover');

  // Featured products
  const { data: featuredProducts = [] } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_products')
        .select(`
          *,
          business_profiles(id, business_name, logo_url, is_verified)
        `)
        .eq('is_featured', true)
        .eq('in_stock', true)
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Trending products (most reviewed/highest rated)
  const { data: trendingProducts = [] } = useQuery({
    queryKey: ['trending-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_products')
        .select(`
          *,
          business_profiles(id, business_name, logo_url, is_verified)
        `)
        .eq('in_stock', true)
        .order('review_count', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Deals / On sale products
  const { data: dealsProducts = [] } = useQuery({
    queryKey: ['deals-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_products')
        .select(`
          *,
          business_profiles(id, business_name, logo_url, is_verified)
        `)
        .not('sale_price', 'is', null)
        .eq('in_stock', true)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // User's wishlist
  const { data: wishlist = [] } = useQuery({
    queryKey: ['user-wishlist', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          *,
          business_products(
            *,
            business_profiles(id, business_name, logo_url)
          )
        `)
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Search results
  const { data: searchResults = [] } = useQuery({
    queryKey: ['search-products', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const { data, error } = await supabase
        .from('business_products')
        .select(`
          *,
          business_profiles(id, business_name, logo_url, is_verified)
        `)
        .ilike('name', `%${searchQuery}%`)
        .eq('in_stock', true)
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length > 2,
  });

  const categories = [
    { id: 'all', label: 'הכל', icon: Grid3X3 },
    { id: 'food', label: 'אוכל', icon: ShoppingBag },
    { id: 'toys', label: 'צעצועים', icon: Sparkles },
    { id: 'health', label: 'בריאות', icon: Heart },
  ];

  return (
    <div className="h-screen bg-background overflow-hidden" dir="rtl">
      <div className="h-full overflow-y-auto pb-[70px]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="חפש מוצרים..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 rounded-xl bg-muted/50"
              />
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/favorites')}
              className="relative"
            >
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 bg-transparent h-10 p-0 border-b">
            <TabsTrigger value="discover" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs">
              <Sparkles className="w-4 h-4 ml-1" />
              גלה
            </TabsTrigger>
            <TabsTrigger value="trending" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs">
              <TrendingUp className="w-4 h-4 ml-1" />
              פופולרי
            </TabsTrigger>
            <TabsTrigger value="deals" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs">
              🔥
              מבצעים
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs">
              <Heart className="w-4 h-4 ml-1" />
              שמורים
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search Results */}
      {searchQuery.length > 2 && (
        <div className="p-4">
          <h2 className="font-bold mb-3">תוצאות חיפוש</h2>
          <div className="grid grid-cols-2 gap-3">
            {searchResults.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {searchResults.length === 0 && (
            <p className="text-center text-muted-foreground py-8">לא נמצאו מוצרים</p>
          )}
        </div>
      )}

      {/* Main Content */}
      {!searchQuery && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="discover" className="mt-0">
            {/* Featured Section */}
            {featuredProducts.length > 0 && (
              <section className="p-4">
                <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  מומלצים
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                  {featuredProducts.map((product: any) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="min-w-[160px]"
                    >
                      <ProductCard product={product} compact />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Categories */}
            <section className="px-4 py-2">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant="outline"
                    size="sm"
                    className="rounded-full whitespace-nowrap"
                  >
                    <cat.icon className="w-4 h-4 ml-1" />
                    {cat.label}
                  </Button>
                ))}
              </div>
            </section>

            {/* All Products Grid */}
            <section className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold">כל המוצרים</h2>
                <div className="flex gap-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode('list')}
                  >
                    <LayoutList className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
                {trendingProducts.map((product: any) => (
                  <ProductCard key={product.id} product={product} viewMode={viewMode} />
                ))}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="trending" className="mt-0 p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">הכי פופולרי</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {trendingProducts.map((product: any, index: number) => (
                <div key={product.id} className="relative">
                  <Badge className="absolute top-2 right-2 z-10 bg-primary">
                    #{index + 1}
                  </Badge>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="deals" className="mt-0 p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🔥</span>
              <h2 className="font-bold text-lg">מבצעים חמים</h2>
            </div>
            {dealsProducts.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">אין מבצעים כרגע</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {dealsProducts.map((product: any) => (
                  <ProductCard key={product.id} product={product} showDiscount />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="wishlist" className="mt-0 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-primary fill-primary" />
              <h2 className="font-bold text-lg">רשימת המשאלות שלי</h2>
            </div>
            {!user ? (
              <div className="text-center py-12">
                <Heart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground mb-3">התחבר כדי לשמור מוצרים</p>
                <Button onClick={() => navigate('/auth')}>התחבר</Button>
              </div>
            ) : wishlist.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">עדיין לא שמרת מוצרים</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {wishlist.map((item: any) => (
                  <ProductCard 
                    key={item.id} 
                    product={item.business_products} 
                    isInWishlist 
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ShopExplore;
