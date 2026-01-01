import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, ShoppingBag, Plus, Minus, SlidersHorizontal, TrendingUp, Tag, Heart, Grid3X3, Bookmark, X, Search, Clock, Share2, Truck, Shield, Star, ChevronLeft, Dog, Cat, Info, Loader2, Flag, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useFlyingCart } from "@/components/FlyingCartAnimation";
import { useToast } from "@/hooks/use-toast";
import { OptimizedImage } from "@/components/OptimizedImage";
import confetti from "canvas-confetti";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonProductGrid } from "@/components/ui/enhanced-skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

const Shop = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, getTotalItems, cartShake } = useCart();
  const { triggerFly, setCartIconPosition } = useFlyingCart();
  const { toast } = useToast();
  const cartIconRef = useRef<HTMLButtonElement>(null);
  const productImageRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState("הכל");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedPetType, setSelectedPetType] = useState<"all" | "dog" | "cat">("all");
  const [quantity, setQuantity] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"none" | "price-low" | "price-high" | "popularity">("none");
  const [showDealsOnly, setShowDealsOnly] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"grid" | "saved">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem("petid-search-history");
    return saved ? JSON.parse(saved) : [];
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem("petid-favorites");
    return saved ? JSON.parse(saved) : [];
  });

  // Report dialog state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("price");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  const handleReportIssue = async () => {
    if (!selectedProduct) return;
    setIsReporting(true);
    try {
      const { error } = await supabase
        .from('content_reports')
        .insert({
          content_type: 'product',
          content_id: selectedProduct.id || 'unknown',
          reason: reportReason,
          description: reportDetails || `דיווח על ${reportReason === 'price' ? 'מחיר שגוי' : reportReason === 'image' ? 'תמונה לא מתאימה' : reportReason === 'description' ? 'תיאור שגוי' : 'בעיה אחרת'}`,
          reporter_id: user?.id || '00000000-0000-0000-0000-000000000000',
        });

      if (error) throw error;

      toast({
        title: "תודה על הדיווח! 🙏",
        description: "הדיווח התקבל ויטופל בהקדם",
      });
      setReportDialogOpen(false);
      setReportReason("price");
      setReportDetails("");
    } catch (error) {
      console.error("Error reporting issue:", error);
      toast({
        title: "שגיאה בשליחת הדיווח",
        description: "אנא נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    } finally {
      setIsReporting(false);
    }
  };

  const toggleFavorite = useCallback((productId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites(prev => {
      const newFavorites = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      localStorage.setItem("petid-favorites", JSON.stringify(newFavorites));
      return newFavorites;
    });
    
    const isFavorite = favorites.includes(productId);
    toast({
      title: isFavorite ? "הוסר משמורים" : "נשמר",
      duration: 1500,
    });
  }, [favorites, toast]);

  const sizes = ["S", "M", "L", "XL"];

  const quickTags = [
    { id: "food", label: "מזון", icon: "🍖", color: "#FF6B6B" },
    { id: "toys", label: "צעצועים", icon: "🎾", color: "#4ECDC4" },
    { id: "beds", label: "מיטות", icon: "🛏️", color: "#9B59B6" },
    { id: "grooming", label: "טיפוח", icon: "✨", color: "#F39C12" },
    { id: "treats", label: "חטיפים", icon: "🦴", color: "#E74C3C" },
    { id: "accessories", label: "אביזרים", icon: "🎀", color: "#3498DB" },
  ];

  const subCategories = [
    { id: "all", label: "הכל" },
    { id: "food", label: "מזון" },
    { id: "treats", label: "חטיפים" },
    { id: "toys", label: "צעצועים" },
    { id: "beds", label: "מיטות" },
    { id: "grooming", label: "טיפוח" },
    { id: "accessories", label: "אביזרים" },
  ];

  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;
    setCurrentImageIndex(carouselApi.selectedScrollSnap());
    carouselApi.on("select", () => {
      setCurrentImageIndex(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  // Fetch products from database - combining business_products and scraped_products
  const { data: dbProducts = [], isLoading: isLoadingProducts, isFetching } = useQuery({
    queryKey: ["shop-products-v2"],
    queryFn: async () => {
      console.log("Fetching shop products v2...");
      
      // First try to get from business_products
      const { data: businessProducts, error: bpError } = await supabase
        .from("business_products")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (bpError) console.error("Error fetching business_products:", bpError);
      console.log("Business products:", businessProducts?.length || 0);
      
      // Also get scraped products
      const { data: scrapedProducts, error: spError } = await supabase
        .from("scraped_products")
        .select("*")
        .order("scraped_at", { ascending: false });
      
      if (spError) console.error("Error fetching scraped_products:", spError);
      console.log("Scraped products:", scrapedProducts?.length || 0);
      
      // Transform scraped products to match business_products format
      const transformedScraped = (scrapedProducts || []).map(sp => ({
        id: sp.id,
        name: sp.product_name,
        description: sp.long_description || sp.short_description || "",
        price: sp.final_price || sp.regular_price || 0,
        original_price: sp.regular_price !== sp.final_price ? sp.regular_price : null,
        sale_price: sp.sale_price,
        image_url: sp.main_image_url || "/placeholder.svg",
        images: sp.main_image_url ? [sp.main_image_url] : [],
        category: sp.sub_category || sp.main_category,
        pet_type: sp.pet_type,
        in_stock: sp.stock_status === "in_stock" || !sp.stock_status,
        sku: sp.sku,
        flavors: sp.flavors,
        created_at: sp.created_at,
        is_flagged: sp.is_flagged || false,
        flagged_reason: sp.flagged_reason,
      }));
      
      // Filter business products that are in stock
      const filteredBusiness = (businessProducts || []).filter(p => p.in_stock !== false);
      
      // Combine both sources, business_products first
      const allProducts = [...filteredBusiness, ...transformedScraped];
      console.log("Total products to display:", allProducts.length);
      return allProducts;
    },
    staleTime: 0, // Always refetch
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  // Transform database products to the format expected by the UI
  const products = useMemo(() => {
    console.log("Transforming products, dbProducts count:", dbProducts.length);
    return dbProducts.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      price: typeof p.price === 'string' ? parseFloat(p.price) : (p.price || 0),
      originalPrice: p.original_price || p.sale_price ? (typeof p.price === 'string' ? parseFloat(p.price) : p.price) : null,
      salePrice: p.sale_price,
      images: p.images?.length ? p.images : [p.image_url],
      image: p.image_url || "/placeholder.svg",
      popularity: 80, // Default values for now
      likes: Math.floor(Math.random() * 1000) + 100,
      rating: 4.5,
      reviews: Math.floor(Math.random() * 200) + 50,
      inStock: p.in_stock ?? true,
      freeShipping: (typeof p.price === 'string' ? parseFloat(p.price) : p.price) > 200,
      category: p.category,
      petType: p.pet_type,
      isFlagged: p.is_flagged || false,
      flaggedReason: p.flagged_reason,
      flavors: p.flavors || [],
    }));
  }, [dbProducts]);

  // Search suggestions based on query
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [searchQuery, products]);

  const filteredAndSortedProducts = useMemo(() => {
    console.log("Filtering products, total:", products.length);
    let result = [...products];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(query));
    }

    if (showDealsOnly) {
      result = result.filter(p => p.originalPrice);
    }

    if (activeTab === "saved") {
      result = result.filter(p => favorites.includes(p.id));
    }

    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
      case "popularity":
        result.sort((a, b) => b.popularity - a.popularity);
        break;
    }

    console.log("Filtered products:", result.length);
    return result;
  }, [products, sortBy, showDealsOnly, activeTab, favorites, searchQuery]);

  const addToSearchHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item !== query);
      const newHistory = [query, ...filtered].slice(0, 5); // Keep last 5 searches
      localStorage.setItem("petid-search-history", JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const removeFromHistory = useCallback((query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory(prev => {
      const newHistory = prev.filter(item => item !== query);
      localStorage.setItem("petid-search-history", JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem("petid-search-history");
  }, []);

  const handleSearchSelect = useCallback((product: any) => {
    addToSearchHistory(product.name);
    setSearchQuery(product.name);
    setShowSearchResults(false);
    handleProductClick(product);
  }, [addToSearchHistory]);

  const handleHistorySelect = useCallback((query: string) => {
    setSearchQuery(query);
    setShowSearchResults(true);
  }, []);

  const handleTagClick = useCallback((tag: typeof quickTags[0]) => {
    setSearchQuery(tag.label);
    addToSearchHistory(tag.label);
    setShowSearchResults(false);
    searchInputRef.current?.blur();
  }, [addToSearchHistory]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setShowSearchResults(false);
    searchInputRef.current?.blur();
  }, []);

  const handleProductClick = useCallback((product: any) => {
    setSelectedProduct(product);
    setQuantity(1);
    setSelectedSize(null);
    setCurrentImageIndex(0);
    carouselApi?.scrollTo(0);
  }, [carouselApi]);

  const handleAddToCart = useCallback(() => {
    if (!selectedProduct) return;

    // Trigger flying animation
    if (productImageRef.current) {
      const rect = productImageRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      triggerFly(selectedProduct.image, centerX, centerY);
    }

    addToCart({
      id: `${selectedProduct.id}-${selectedSize || 'default'}`,
      name: selectedProduct.name,
      price: selectedProduct.price,
      image: selectedProduct.image,
      quantity: quantity,
      size: selectedSize || undefined,
    });

    confetti({
      particleCount: 60,
      spread: 55,
      origin: { y: 0.8 },
      colors: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))'],
    });

    toast({
      title: "נוסף לעגלה",
      description: `${selectedProduct.name}`,
      duration: 1500,
    });

    setSelectedProduct(null);
    setQuantity(1);
    setSelectedSize(null);
  }, [selectedProduct, quantity, addToCart, toast, selectedSize, triggerFly]);

  const increaseQuantity = useCallback(() => setQuantity(prev => prev + 1), []);
  const decreaseQuantity = useCallback(() => setQuantity(prev => Math.max(1, prev - 1)), []);

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      {/* PetID-style Header */}
      <div className="bg-gradient-to-b from-background to-muted/20 border-b border-border/30 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          {/* Top Row: Title + Cart */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-foreground">🛒 חנות PetID</h1>
            <motion.button 
              ref={cartIconRef}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/cart')}
              className={`p-2.5 relative rounded-2xl bg-card shadow-soft border border-border/30 ${cartShake ? 'animate-[wiggle_0.3s_ease-in-out]' : ''}`}
              onAnimationComplete={() => {
                if (cartIconRef.current) {
                  const rect = cartIconRef.current.getBoundingClientRect();
                  setCartIconPosition(rect.left + rect.width / 2, rect.top + rect.height / 2);
                }
              }}
            >
              <ShoppingBag className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <AnimatePresence>
                {getTotalItems() > 0 && (
                  <motion.span 
                    className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    {getTotalItems()}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
          
          {/* PetID-style Search Bar */}
          <div className="relative">
            <div className={`flex items-center gap-3 bg-card rounded-2xl px-4 py-3 border transition-all shadow-soft ${
              isSearchFocused ? 'border-primary/50 shadow-md' : 'border-border/30'
            }`}>
              <Search className="w-5 h-5 text-primary/60" strokeWidth={1.5} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => {
                  setIsSearchFocused(true);
                  if (searchQuery) setShowSearchResults(true);
                }}
                onBlur={() => {
                  setIsSearchFocused(false);
                  setTimeout(() => setShowSearchResults(false), 200);
                }}
                placeholder="🔍 חפש מוצרים, קטגוריות..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {searchQuery && (
                <button onClick={clearSearch} className="p-1 rounded-full hover:bg-muted transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                </button>
              )}
            </div>
            
            {/* Search Suggestions */}
            <AnimatePresence>
              {showSearchResults && searchQuery.trim() && searchSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-card rounded-2xl border border-border/30 shadow-elevated overflow-hidden z-50"
                >
                  {searchSuggestions.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSearchSelect(product)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-right"
                    >
                      <div className="w-12 h-12 bg-muted rounded-xl overflow-hidden">
                        <OptimizedImage src={product.image} alt={product.name} className="w-full h-full" objectFit="cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                        <p className="text-xs text-primary font-semibold">₪{product.price}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* PetID-style Tabs */}
      <div className="bg-background/80 backdrop-blur-sm border-b border-border/30">
        <div className="max-w-lg mx-auto flex px-4 gap-2 py-2">
          <button
            onClick={() => setActiveTab("grid")}
            className={`flex-1 py-2.5 text-center text-sm font-medium rounded-xl transition-all ${
              activeTab === "grid"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            🛍️ חנות
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex-1 py-2.5 text-center text-sm font-medium rounded-xl transition-all ${
              activeTab === "saved"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            ❤️ מועדפים
          </button>
        </div>
      </div>

      {/* Categories - PetID pill style */}
      <div className="bg-gradient-to-b from-background to-muted/10">
        <div className="max-w-lg mx-auto">
          <div className="flex gap-2 px-4 py-3 overflow-x-auto hide-scrollbar">
            {subCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.label)}
                className={`px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category.label
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card border border-border/30 text-foreground hover:bg-muted/50 hover:border-primary/30"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Instagram-style Products Grid with thin borders */}
      <div className="max-w-lg mx-auto">
        {/* Editors' Picks Section */}
        {activeTab === "grid" && filteredAndSortedProducts.length > 0 && (
          <div className="px-4 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground mb-3">Editors' picks</h2>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar">
              {filteredAndSortedProducts.slice(0, 4).map((product) => (
                <div
                  key={`pick-${product.id}`}
                  onClick={() => handleProductClick(product)}
                  className="flex-shrink-0 w-28 cursor-pointer"
                >
                  <div className="w-28 h-28 rounded-lg overflow-hidden bg-muted mb-2">
                    <OptimizedImage
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full"
                      objectFit="cover"
                    />
                  </div>
                  <p className="text-xs text-foreground line-clamp-1">{product.name}</p>
                  <p className="text-xs font-semibold text-foreground">₪{product.price}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div className="grid grid-cols-2">
          {filteredAndSortedProducts.map((product, index) => (
            <div
              key={product.id}
              onClick={() => handleProductClick(product)}
              className={`bg-background cursor-pointer border-b border-border ${
                index % 2 === 0 ? 'border-l border-l-border' : ''
              }`}
            >
              {/* Square Image */}
              <div className="relative aspect-square bg-muted">
                <OptimizedImage
                  src={product.image}
                  alt={product.name}
                  className={`w-full h-full ${product.isFlagged ? 'opacity-50' : ''}`}
                  objectFit="cover"
                  sizes="(max-width: 768px) 50vw, 200px"
                />
                
                {/* Flagged indicator */}
                {product.isFlagged && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="bg-red-500 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-lg">
                      <Flag className="w-3.5 h-3.5" />
                      <span>בבדיקה</span>
                    </div>
                  </div>
                )}
                
                {/* Wishlist button - transparent Instagram style */}
                <button
                  onClick={(e) => toggleFavorite(product.id, e)}
                  className="absolute top-2 right-2"
                >
                  <Heart 
                    className={`w-5 h-5 drop-shadow-md ${favorites.includes(product.id) ? "fill-[#FF3040] text-[#FF3040]" : "text-white"}`} 
                    strokeWidth={2} 
                  />
                </button>
              </div>

              {/* Product Info */}
              <div className="p-3">
                <h3 className="text-sm font-normal text-foreground line-clamp-1">
                  {product.name}
                </h3>
                <p className="text-xs text-[#8E8E8E] mb-1">Petid Shop</p>
                <span className="text-sm font-bold text-foreground">
                  ₪{product.price}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Loading State */}
        {(isLoadingProducts || isFetching) && filteredAndSortedProducts.length === 0 && (
          <div className="py-20 text-center">
            <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" strokeWidth={1.5} />
            <p className="text-sm font-medium text-foreground mb-1">טוען מוצרים...</p>
          </div>
        )}

        {/* Empty State - only show when not loading and no products */}
        {!isLoadingProducts && !isFetching && filteredAndSortedProducts.length === 0 && (
          <div className="py-20 text-center">
            <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" strokeWidth={1} />
            <p className="text-sm font-medium text-foreground mb-1">אין מוצרים עדיין</p>
            <p className="text-xs text-muted-foreground">בקרוב יעלו מוצרים חדשים</p>
          </div>
        )}
      </div>

      {/* Product Details Sheet - Instagram style */}
      <Sheet open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl bg-background p-0 overflow-hidden border-t border-border pb-20" aria-describedby="product-details-description">
          <SheetTitle className="sr-only">פרטי מוצר</SheetTitle>
          <SheetDescription id="product-details-description" className="sr-only">צפה בפרטי המוצר והוסף לעגלה</SheetDescription>
          {selectedProduct && (
            <div className="flex flex-col h-full" dir="rtl">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              
              {/* Top Actions */}
              <div className="flex items-center justify-between px-4 pb-3">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-2"
                >
                  <X className="w-6 h-6 text-foreground" strokeWidth={1.5} />
                </button>
                
                <div className="flex items-center gap-2">
                  {/* Report Issue Button */}
                  <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                    <DialogTrigger asChild>
                      <button className="p-2 hover:bg-orange-50 rounded-full transition-colors">
                        <Flag className="w-5 h-5 text-muted-foreground hover:text-orange-500" strokeWidth={1.5} />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md" dir="rtl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-right">
                          <AlertTriangle className="w-5 h-5 text-orange-500" />
                          דיווח על תקלה
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                          מצאת משהו שלא נראה נכון? ספר לנו ונטפל בזה
                        </p>
                        
                        <RadioGroup value={reportReason} onValueChange={setReportReason} className="space-y-3">
                          <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                            <RadioGroupItem value="price" id="sheet-price" />
                            <Label htmlFor="sheet-price" className="flex-1 cursor-pointer">
                              <span className="font-medium">מחיר שגוי</span>
                              <p className="text-xs text-muted-foreground">המחיר לא נכון או שהמבצע לא אמיתי</p>
                            </Label>
                          </div>
                          <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                            <RadioGroupItem value="image" id="sheet-image" />
                            <Label htmlFor="sheet-image" className="flex-1 cursor-pointer">
                              <span className="font-medium">תמונה לא מתאימה</span>
                              <p className="text-xs text-muted-foreground">התמונה לא מייצגת את המוצר</p>
                            </Label>
                          </div>
                          <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                            <RadioGroupItem value="description" id="sheet-description" />
                            <Label htmlFor="sheet-description" className="flex-1 cursor-pointer">
                              <span className="font-medium">תיאור שגוי</span>
                              <p className="text-xs text-muted-foreground">המידע על המוצר לא מדויק</p>
                            </Label>
                          </div>
                          <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                            <RadioGroupItem value="other" id="sheet-other" />
                            <Label htmlFor="sheet-other" className="flex-1 cursor-pointer">
                              <span className="font-medium">בעיה אחרת</span>
                              <p className="text-xs text-muted-foreground">משהו אחר שצריך לתקן</p>
                            </Label>
                          </div>
                        </RadioGroup>
                        
                        <Textarea
                          placeholder="פרטים נוספים (אופציונלי)..."
                          value={reportDetails}
                          onChange={(e) => setReportDetails(e.target.value)}
                          className="min-h-[80px] resize-none"
                        />
                      </div>
                      <DialogFooter className="gap-2 sm:gap-0">
                        <DialogClose asChild>
                          <Button variant="outline" className="rounded-xl">
                            ביטול
                          </Button>
                        </DialogClose>
                        <Button 
                          onClick={handleReportIssue}
                          disabled={isReporting}
                          className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white gap-2"
                        >
                          {isReporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Flag className="w-4 h-4" />
                          )}
                          שלח דיווח
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast({ title: "הקישור הועתק", duration: 1500 });
                    }}
                    className="p-2"
                  >
                    <Share2 className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => toggleFavorite(selectedProduct.id)}
                    className="p-2"
                  >
                    <Heart 
                      className={`w-5 h-5 transition-colors ${favorites.includes(selectedProduct.id) ? "fill-[#FF3040] text-[#FF3040]" : "text-foreground"}`} 
                      strokeWidth={1.5} 
                    />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <ScrollArea className="flex-1">
                {/* Product Image */}
                <div className="relative px-4 mb-4">
                  <Carousel className="w-full" dir="ltr" setApi={setCarouselApi} opts={{ direction: "ltr" }}>
                    <CarouselContent>
                      {(selectedProduct.images || [selectedProduct.image]).map((img: string, index: number) => (
                        <CarouselItem key={index}>
                          <motion.div 
                            ref={index === 0 ? productImageRef : undefined}
                            className="rounded-lg overflow-hidden bg-muted"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="w-full aspect-square">
                              <OptimizedImage
                                src={img}
                                alt={selectedProduct.name}
                                className="w-full h-full"
                                objectFit="cover"
                              />
                            </div>
                          </motion.div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </Carousel>
                  
                  {/* Dots Indicator */}
                  {(selectedProduct.images?.length || 1) > 1 && (
                    <div className="flex justify-center gap-1 mt-3">
                      {(selectedProduct.images || [selectedProduct.image]).map((_: string, index: number) => (
                        <div
                          key={index}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            currentImageIndex === index ? 'bg-primary' : 'bg-muted-foreground/30'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Details - Instagram style */}
                <div className="px-4 space-y-4 pb-4">
                  {/* Title */}
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{selectedProduct.name}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Petid Shop</p>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-semibold text-foreground">
                      ₪{selectedProduct.price}
                    </span>
                    {selectedProduct.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through">₪{selectedProduct.originalPrice}</span>
                    )}
                  </div>

                  {/* Rating */}
                  {selectedProduct.rating && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < Math.floor(selectedProduct.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} 
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">({selectedProduct.reviews} ביקורות)</span>
                    </div>
                  )}

                  {/* Info badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedProduct.freeShipping && (
                      <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted text-foreground">
                        <Truck className="w-3.5 h-3.5" />
                        <span>משלוח חינם</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted text-foreground">
                      <Shield className="w-3.5 h-3.5" />
                      <span>אחריות מלאה</span>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedProduct.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedProduct.description}
                    </p>
                  )}

                  {/* Variants/Flavors Selector - only show if product has flavors */}
                  {selectedProduct.flavors && selectedProduct.flavors.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-foreground mb-2">טעמים זמינים</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.flavors.map((flavor: string, index: number) => (
                          <button
                            key={index}
                            onClick={() => setSelectedSize(flavor)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                              selectedSize === flavor
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {flavor}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity */}
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-2">כמות</h3>
                    <div className="flex items-center gap-4 w-fit">
                      <button
                        onClick={decreaseQuantity}
                        className="w-10 h-10 rounded-full border border-border flex items-center justify-center transition-colors hover:bg-muted"
                      >
                        <Minus className="w-4 h-4 text-foreground" />
                      </button>
                      <span className="text-lg font-medium text-foreground w-8 text-center">{quantity}</span>
                      <button
                        onClick={increaseQuantity}
                        className="w-10 h-10 rounded-full border border-border flex items-center justify-center transition-colors hover:bg-muted"
                      >
                        <Plus className="w-4 h-4 text-foreground" />
                      </button>
                    </div>
                  </div>

                  {/* View more link */}
                  <button
                    onClick={() => {
                      navigate(`/product/${selectedProduct.id}`, { state: { product: selectedProduct } });
                      setSelectedProduct(null);
                    }}
                    className="text-sm text-primary font-medium"
                  >
                    לפרטים נוספים ולביקורות
                  </button>

                  <div className="h-4" />
                </div>
              </ScrollArea>
              {/* Bottom Bar - Instagram style */}
              <div className="flex-shrink-0 border-t border-border px-4 py-3 bg-background">
                {/* Flagged product warning */}
                {selectedProduct.isFlagged && (
                  <div className="flex items-center gap-2 p-3 mb-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
                    <Flag className="w-4 h-4 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">מוצר זה נמצא בבדיקה</p>
                      <p className="text-xs text-red-600">לא ניתן לרכוש עד לסיום הטיפול</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <p className="text-xs text-muted-foreground">סה״כ</p>
                    <p className="text-lg font-semibold text-foreground">
                      ₪{selectedProduct.price * quantity}
                    </p>
                  </div>
                  
                  <button
                    onClick={handleAddToCart}
                    disabled={!selectedProduct.inStock || selectedProduct.isFlagged}
                    className={`flex-1 h-11 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 ${
                      selectedProduct.isFlagged 
                        ? 'bg-red-100 text-red-600 cursor-not-allowed' 
                        : 'bg-primary text-primary-foreground hover:opacity-90'
                    }`}
                  >
                    {selectedProduct.isFlagged ? (
                      <>
                        <Flag className="w-4 h-4" />
                        מוצר בבדיקה
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        {selectedProduct.inStock ? 'הוסף לעגלה' : 'אזל מהמלאי'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
};

export default Shop;
