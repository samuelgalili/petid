import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowRight, Search, Plus, Check, FlaskConical,
  ShoppingBag, Filter, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const ProductSourcing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // ─── Global Catalog ───
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['global-catalog', search, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('business_products')
        .select('*')
        .eq('in_stock', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      if (categoryFilter) {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // ─── User's linked products ───
  const { data: myProductIds = [] } = useQuery({
    queryKey: ['my-product-ids', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_products' as any)
        .select('product_id')
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data as any[]).map((d: any) => d.product_id);
    },
    enabled: !!user,
  });

  // ─── Add to shop ───
  const addMutation = useMutation({
    mutationFn: async (productId: string) => {
      const product = products.find(p => p.id === productId);
      const { error } = await supabase
        .from('user_products' as any)
        .insert({
          user_id: user!.id,
          product_id: productId,
          custom_commission_rate: product?.commission_rate || 0.15,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-product-ids'] });
      toast.success('המוצר נוסף לחנות שלך');
    },
    onError: (err: any) => {
      if (err.message?.includes('duplicate')) {
        toast.info('המוצר כבר בחנות שלך');
      } else {
        toast.error('שגיאה בהוספת המוצר');
      }
    },
  });

  // ─── Categories ───
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  // ─── Science check (NRC 2006) ───
  const isNrcVerified = (product: any): boolean => {
    const tags = product.medical_tags || [];
    const diet = product.special_diet || [];
    const desc = (product.description || '').toLowerCase();
    return (
      tags.some((t: string) => t.toLowerCase().includes('nrc')) ||
      diet.some((d: string) => d.toLowerCase().includes('nrc')) ||
      desc.includes('nrc 2006') ||
      desc.includes('nrc2006')
    );
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-5 h-14 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-lg font-bold tracking-tight">קטלוג מוצרים</span>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-6">
        {/* Search & Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש מוצרים בקטלוג הגלובלי..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 h-11 rounded-2xl bg-muted/30 border-border/50 text-sm"
            />
          </div>

          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <Button
                variant={categoryFilter === null ? 'default' : 'outline'}
                size="sm"
                className="rounded-full text-[11px] h-8 flex-shrink-0"
                onClick={() => setCategoryFilter(null)}
              >
                הכל
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full text-[11px] h-8 flex-shrink-0"
                  onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-[20px] bg-muted animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">לא נמצאו מוצרים</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product, i) => {
              const isAdded = myProductIds.includes(product.id);
              const commission = product.commission_rate || 0.15;
              const earnings = (product.price * commission).toFixed(0);
              const verified = isNrcVerified(product);

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-[20px] bg-card border border-border/50 overflow-hidden shadow-sm group"
                >
                  {/* Image */}
                  <div className="relative aspect-square bg-muted">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-muted-foreground/20" strokeWidth={1.5} />
                      </div>
                    )}

                    {/* Science Badge */}
                    {verified && (
                      <div className="absolute top-2 right-2">
                        <div className="flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm">
                          <FlaskConical className="w-3 h-3 text-primary" strokeWidth={1.5} />
                          <span className="text-[9px] font-semibold text-primary">NRC 2006</span>
                        </div>
                      </div>
                    )}

                    {/* Commission badge */}
                    <div className="absolute bottom-2 left-2">
                      <div className="bg-primary/90 backdrop-blur-sm text-primary-foreground rounded-full px-2.5 py-1 shadow-sm">
                        <span className="text-[10px] font-bold">₪{earnings} עמלה</span>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3.5 space-y-2.5">
                    <div>
                      <h3 className="text-[13px] font-semibold leading-snug line-clamp-2">
                        {product.name}
                      </h3>
                      {product.brand && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{product.brand}</p>
                      )}
                    </div>

                    {/* Price row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-bold">₪{product.price}</span>
                        {product.sale_price && product.sale_price < product.price && (
                          <span className="text-[11px] text-muted-foreground line-through">
                            ₪{product.original_price || product.price}
                          </span>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[9px] border-0 rounded-lg">
                        {(commission * 100).toFixed(0)}%
                      </Badge>
                    </div>

                    {/* Rating */}
                    {product.average_rating && product.average_rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-primary text-primary" />
                        <span className="text-[11px] text-muted-foreground">
                          {product.average_rating.toFixed(1)}
                          {product.review_count ? ` (${product.review_count})` : ''}
                        </span>
                      </div>
                    )}

                    {/* CTA */}
                    <Button
                      size="sm"
                      variant={isAdded ? 'outline' : 'default'}
                      className="w-full rounded-xl text-xs h-9 gap-1.5"
                      disabled={isAdded || addMutation.isPending}
                      onClick={() => addMutation.mutate(product.id)}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                          בחנות שלך
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                          הוסף לחנות
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductSourcing;
