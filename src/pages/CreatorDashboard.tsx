import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Wallet, Eye, MousePointerClick, TrendingUp,
  Upload, Plus, Search, Play, Package, ChevronLeft, ChevronRight,
  DollarSign, Clock, CheckCircle2, Video, X, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTitle, SheetHeader } from '@/components/ui/sheet';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';

const CreatorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wallet data
  const { data: wallet } = useQuery({
    queryKey: ['creator-wallet', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_wallets' as any)
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Auto-create wallet
        const { data: newWallet, error: createError } = await supabase
          .from('creator_wallets' as any)
          .insert({ user_id: user!.id })
          .select()
          .single();
        if (createError) throw createError;
        return newWallet as any;
      }
      return data as any;
    },
    enabled: !!user,
  });

  // User promoted products
  const { data: promotedProducts = [] } = useQuery({
    queryKey: ['user-products', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_products' as any)
        .select('*, product:product_id(id, name, price, image_url, commission_rate)')
        .eq('user_id', user!.id)
        .eq('is_active', true);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user,
  });

  // User videos
  const { data: videos = [] } = useQuery({
    queryKey: ['creator-videos-own', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_posts')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user,
  });

  // Global catalog search
  const { data: catalogProducts = [] } = useQuery({
    queryKey: ['global-catalog', catalogSearch],
    queryFn: async () => {
      let query = supabase
        .from('business_products')
        .select('id, name, price, image_url, commission_rate, brand, category')
        .eq('in_stock', true)
        .limit(20);
      if (catalogSearch) {
        query = query.ilike('name', `%${catalogSearch}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: showCatalog,
  });

  // Add product to promotions
  const addProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('user_products' as any)
        .insert({ user_id: user!.id, product_id: productId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-products'] });
      toast.success('המוצר נוסף לחנות שלך');
      setShowCatalog(false);
    },
    onError: () => toast.error('שגיאה בהוספת המוצר'),
  });

  const totalBalance = Number(wallet?.total_balance || 0);
  const pendingAmount = Number(wallet?.pending_amount || 0);
  const availableAmount = Number(wallet?.available_amount || 0);
  const totalViews = videos.reduce((s: number, v: any) => s + (v.view_count || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-5 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">PetID</span>
            <span className="text-lg font-light text-muted-foreground">Creator Studio</span>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-8">

        {/* ═══════════════════════════════
            WALLET SECTION
        ═══════════════════════════════ */}
        <section>
          <SectionLabel>MY WALLET</SectionLabel>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[20px] bg-card border border-border/50 p-6 shadow-sm"
          >
            {/* Total Balance */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Balance</p>
                <p className="text-4xl font-bold tracking-tight">
                  ₪{totalBalance.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-2xl bg-muted/50 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Pending</span>
                </div>
                <p className="text-xl font-bold">₪{pendingAmount.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl bg-primary/5 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] text-primary uppercase tracking-wide">Available</span>
                </div>
                <p className="text-xl font-bold text-primary">₪{availableAmount.toFixed(2)}</p>
              </div>
            </div>

            {/* Withdraw Button */}
            <Button
              className="w-full h-12 rounded-2xl text-sm font-semibold"
              disabled={availableAmount <= 0}
            >
              <DollarSign className="w-4 h-4 ml-1" />
              Withdraw ₪{availableAmount.toFixed(2)}
            </Button>
          </motion.div>
        </section>

        {/* ═══════════════════════════════
            PERFORMANCE ANALYTICS
        ═══════════════════════════════ */}
        <section>
          <SectionLabel>PERFORMANCE</SectionLabel>
          <div className="grid grid-cols-3 gap-3">
            <AnalyticsCard
              icon={<Eye className="w-4 h-4" />}
              label="Profile Views"
              value={totalViews.toLocaleString()}
              delay={0}
            />
            <AnalyticsCard
              icon={<MousePointerClick className="w-4 h-4" />}
              label="Product Clicks"
              value={promotedProducts.reduce((s: number, p: any) => s + (p.total_clicks || 0), 0).toLocaleString()}
              delay={0.05}
            />
            <AnalyticsCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Total Sales"
              value={promotedProducts.reduce((s: number, p: any) => s + (p.total_sales || 0), 0).toLocaleString()}
              delay={0.1}
            />
          </div>
        </section>

        {/* ═══════════════════════════════
            MY SHOP FEED (Content Manager)
        ═══════════════════════════════ */}
        <section>
          <SectionLabel>MY SHOP FEED</SectionLabel>

          {/* Upload Button */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowUpload(true)}
            className="w-full rounded-[20px] border-2 border-dashed border-border/60 bg-muted/30 p-6 flex flex-col items-center gap-3 hover:border-primary/40 hover:bg-primary/5 transition-all mb-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Upload New Post</p>
              <p className="text-xs text-muted-foreground mt-0.5">Upload a video and tag products</p>
            </div>
          </motion.button>

          {/* Videos Grid */}
          {videos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {videos.map((video: any, i: number) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="aspect-[9/16] rounded-2xl bg-muted overflow-hidden relative group cursor-pointer"
                >
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2.5">
                    <div className="flex items-center gap-1 text-white text-[10px]">
                      <Eye className="w-3 h-3" />
                      {(video.view_count || 0).toLocaleString()}
                    </div>
                  </div>
                  {(video.product_ids?.length || 0) > 0 && (
                    <div className="absolute top-2 right-2">
                      <Badge className="text-[8px] px-1.5 py-0.5 bg-primary/90 text-primary-foreground">
                        <Tag className="w-2.5 h-2.5 ml-0.5" />
                        {video.product_ids.length}
                      </Badge>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Video className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No videos yet</p>
            </div>
          )}
        </section>

        {/* ═══════════════════════════════
            ACTIVE LISTINGS (Promoted Products)
        ═══════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel className="mb-0">TOP PRODUCTS TO PROMOTE</SectionLabel>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-primary"
              onClick={() => setShowCatalog(true)}
            >
              <Search className="w-3.5 h-3.5" />
              Browse Catalog
            </Button>
          </div>

          {promotedProducts.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {promotedProducts.map((item: any, i: number) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex-shrink-0 w-[140px] rounded-[20px] bg-card border border-border/50 overflow-hidden shadow-sm"
                >
                  <div className="w-full h-[120px] bg-muted">
                    {item.product?.image_url ? (
                      <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-medium truncate">{item.product?.name || 'Product'}</p>
                    <p className="text-sm font-bold mt-1">₪{item.product?.price || 0}</p>
                    <Badge className="mt-2 text-[10px] bg-primary/10 text-primary border-0">
                      {item.custom_commission_rate || item.product?.commission_rate || 15}% Commission
                    </Badge>
                  </div>
                </motion.div>
              ))}

              {/* Add More Card */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowCatalog(true)}
                className="flex-shrink-0 w-[140px] rounded-[20px] border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-2 min-h-[200px] hover:border-primary/40 transition-colors"
              >
                <Plus className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Add Product</span>
              </motion.button>
            </div>
          ) : (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setShowCatalog(true)}
              className="w-full rounded-[20px] border-2 border-dashed border-border/50 p-8 flex flex-col items-center gap-3 hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <Package className="w-10 h-10 text-muted-foreground/40" />
              <div className="text-center">
                <p className="font-medium text-sm">No products yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">Browse the global catalog and start promoting</p>
              </div>
            </motion.button>
          )}
        </section>
      </div>

      {/* ═══════════════════════════════
          UPLOAD VIDEO SHEET
      ═══════════════════════════════ */}
      <Sheet open={showUpload} onOpenChange={setShowUpload}>
        <SheetContent side="bottom" className="rounded-t-[20px] max-h-[80vh]">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-right">העלאת וידאו חדש</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 pb-6">
            {/* Video Upload Area */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-video rounded-2xl border-2 border-dashed border-border/60 bg-muted/30 flex flex-col items-center justify-center gap-3 hover:border-primary/40 transition-colors"
            >
              <Video className="w-10 h-10 text-muted-foreground/40" />
              <div className="text-center">
                <p className="text-sm font-medium">בחר קובץ וידאו</p>
                <p className="text-xs text-muted-foreground">MP4, MOV · עד 100MB</p>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={() => toast.info('העלאת וידאו תתמך בקרוב')}
            />

            {/* Tag Product */}
            <div>
              <label className="text-sm font-medium mb-2 block">תייג מוצר</label>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 rounded-2xl h-12"
                onClick={() => {
                  setShowUpload(false);
                  setShowCatalog(true);
                }}
              >
                <Tag className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">חפש מוצר מהקטלוג...</span>
              </Button>
            </div>

            <Button className="w-full h-12 rounded-2xl font-semibold" disabled>
              <Upload className="w-4 h-4 ml-2" />
              פרסם
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ═══════════════════════════════
          GLOBAL CATALOG SHEET
      ═══════════════════════════════ */}
      <Sheet open={showCatalog} onOpenChange={setShowCatalog}>
        <SheetContent side="bottom" className="rounded-t-[20px] max-h-[85vh]">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-right">קטלוג מוצרים גלובלי</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="חפש מוצרים..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="pr-10 rounded-2xl h-11"
              />
            </div>

            {/* Products List */}
            <div className="space-y-2 max-h-[55vh] overflow-y-auto">
              {catalogProducts.map((product: any) => {
                const isPromoted = promotedProducts.some((p: any) => p.product_id === product.id);
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-border/50 bg-card"
                  >
                    <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold">₪{product.price}</span>
                        <Badge variant="secondary" className="text-[10px] border-0">
                          {product.commission_rate || 15}% עמלה
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isPromoted ? 'secondary' : 'default'}
                      className="rounded-xl text-xs"
                      disabled={isPromoted}
                      onClick={() => addProductMutation.mutate(product.id)}
                    >
                      {isPromoted ? 'מקודם' : 'הוסף'}
                    </Button>
                  </motion.div>
                );
              })}
              {catalogProducts.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">חפש מוצרים מהקטלוג הגלובלי</p>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
};

/* Section Label */
const SectionLabel = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3 ${className}`}>
    {children}
  </p>
);

/* Analytics Card */
const AnalyticsCard = ({ icon, label, value, delay }: { icon: React.ReactNode; label: string; value: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="rounded-[20px] bg-card border border-border/50 p-4 shadow-sm text-center"
  >
    <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center mx-auto mb-2 text-muted-foreground">
      {icon}
    </div>
    <p className="text-xl font-bold">{value}</p>
    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">{label}</p>
  </motion.div>
);

export default CreatorDashboard;
