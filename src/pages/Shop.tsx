import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, ShoppingBag, Plus, Minus, SlidersHorizontal, TrendingUp, Tag, Heart, Grid3X3, Bookmark, X, Search, Clock, Share2, Truck, Shield, Star, ChevronLeft, ChevronRight, Dog, Cat, Info, Loader2, Flag, AlertTriangle, Sparkles, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useFlyingCart } from "@/components/FlyingCartAnimation";
import { useToast } from "@/hooks/use-toast";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { SkeletonProductGrid } from "@/components/ui/enhanced-skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { PetidLogo } from "@/components/PetidLogo";
import { SmartRecommendations } from "@/components/shop/SmartRecommendations";
import { MedicalPharmacy } from "@/components/shop/MedicalPharmacy";

import { SubscribeAndSave } from "@/components/shop/SubscribeAndSave";
import { checkProductSafety, SafetyBadge } from "@/components/shop/ShopSafetyFilter";
import { useActivePet } from "@/hooks/useActivePet";
import { FleetSafetyAlert } from "@/components/fleet/FleetSafetyAlert";
import { SlideToConfirm } from "@/components/shop/SlideToConfirm";
import { ProductInfoDrawer } from "@/components/shop/ProductInfoDrawer";
import { useCarePlan } from "@/hooks/useCarePlan";
import { createContentReport, getShopProducts } from "@/lib/mipoApi";

const asPrice = (value: number | string | null | undefined) => {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
};

const readStoredStrings = (key: string): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
};

const subCategories = [
  { id: "all", label: "הכל" },
  { id: "food", label: "מזון" },
  { id: "treats", label: "חטיפים" },
  { id: "toys", label: "צעצועים" },
  { id: "beds", label: "מיטות" },
  { id: "grooming", label: "טיפוח" },
  { id: "accessories", label: "אביזרים" },
];

const Shop = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, getTotalItems, cartShake } = useCart();
  const { triggerFly, setCartIconPosition } = useFlyingCart();
  const { pet: activePet } = useActivePet();
  const { toast } = useToast();
  const { addToCarePlan } = useCarePlan(activePet?.id);
  const cartIconRef = useRef<HTMLButtonElement>(null);
  const productImageRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
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
  const [infoDrawerProduct, setInfoDrawerProduct] = useState<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => readStoredStrings("petid-search-history"));
  const [favorites, setFavorites] = useState<string[]>(() => readStoredStrings("petid-favorites"));

  // Report dialog state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("price");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  const handleReportIssue = async () => {
    if (!selectedProduct) return;
    setIsReporting(true);
    try {
      await createContentReport({
        content_type: 'product',
        content_id: selectedProduct.id || 'unknown',
        reason: reportReason,
        description: reportDetails || `דיווח על ${reportReason === 'price' ? 'מחיר שגוי' : reportReason === 'image' ? 'תמונה לא מתאימה' : reportReason === 'description' ? 'תיאור שגוי' : 'בעיה אחרת'}`,
        reporter_id: user?.id || null,
      });

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
        description: "נסו שוב מאוחר יותר",
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

  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;
    setCurrentImageIndex(carouselApi.selectedScrollSnap());
    carouselApi.on("select", () => {
      setCurrentImageIndex(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  // Fetch products from the AWS API backed by RDS.
  const { data: dbProducts = [], isLoading: isLoadingProducts, isFetching, isError: isProductsError } = useQuery({
    queryKey: ["shop-products-aws"],
    queryFn: async () => {
      const products = await getShopProducts();
      return products.filter((product) => product.in_stock !== false);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  // Transform database products to the format expected by the UI
  const products = useMemo(() => {
    console.log("Transforming products, dbProducts count:", dbProducts.length);
    return dbProducts.map((p) => {
      const regularPrice = asPrice(p.price);
      const salePrice = asPrice(p.sale_price);
      const listedOriginalPrice = asPrice(p.original_price);
      const price = salePrice > 0 ? salePrice : regularPrice;
      const originalPrice = salePrice > 0 && regularPrice > salePrice
        ? regularPrice
        : listedOriginalPrice > price
          ? listedOriginalPrice
          : null;

      return {
        id: p.id,
        name: p.name,
        description: p.description || "",
        price,
        originalPrice,
        images: p.images?.length ? p.images : [p.image_url],
        image: p.image_url || "/placeholder.svg",
        inStock: p.in_stock ?? true,
        freeShipping: price >= 199,
        category: p.category,
        petType: p.pet_type,
        isFlagged: p.is_flagged || false,
        flaggedReason: p.flagged_reason,
        flavors: p.flavors || [],
        safetyScore: p.safety_score ?? null,
        brand: p.brand || null,
        ingredients: p.ingredients || null,
        weightUnit: p.weight_unit || null,
      };
    });
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

    if (selectedCategory !== "all") {
      const selected = subCategories.find((category) => category.id === selectedCategory);
      const categoryTerms = [selectedCategory, selected?.label || ""]
        .map((term) => term.toLowerCase())
        .filter(Boolean);
      result = result.filter((product) => {
        const category = product.category?.toLowerCase() || "";
        return categoryTerms.some((term) => category === term || category.includes(term));
      });
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
        break;
    }

    console.log("Filtered products:", result.length);
    return result;
  }, [products, sortBy, showDealsOnly, activeTab, favorites, searchQuery, selectedCategory]);

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
      productId: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedProduct.price,
      image: selectedProduct.image,
      quantity: quantity,
      variant: selectedSize || undefined,
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
    <div className="mipo-shell min-h-screen bg-white pb-[calc(80px+env(safe-area-inset-bottom))]" dir="rtl">
      <SEO 
        title="חנות"
        description="מוצרים איכותיים לחיות מחמד במחירים משתלמים - מזון, צעצועים, ציוד ועוד"
        url="/shop"
      />
      <div>
      {/* Instagram-style Header */}
      <motion.div 
        className="sticky top-0 z-sticky border-b border-black/[0.05] bg-white/90 backdrop-blur-xl"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          {/* Top Row: Back + Logo + Cart */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate("/feed")}
                className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
                aria-label="חזרה לפיד"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </motion.button>
              
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold text-mipo-ink">חנות</h1>
                <PetidLogo variant="horizontal" size="sm" showAnimals={false} />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/chat')}
                className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-muted/80 transition-colors"
                aria-label="MIPO AI"
              >
                <Sparkles className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </motion.button>
              <motion.button 
                ref={cartIconRef}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/cart')}
                className={`relative flex h-11 w-11 items-center justify-center rounded-xl bg-muted hover:bg-muted/80 transition-colors ${cartShake ? 'animate-[wiggle_0.3s_ease-in-out]' : ''}`}
                aria-label="עגלת קניות"
                onAnimationComplete={() => {
                  if (cartIconRef.current) {
                    const rect = cartIconRef.current.getBoundingClientRect();
                    setCartIconPosition(rect.left + rect.width / 2, rect.top + rect.height / 2);
                  }
                }}
              >
                <ShoppingBag className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                <AnimatePresence>
                  {getTotalItems() > 0 && (
                    <motion.span 
                      className="absolute -top-1 -end-1 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
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
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <div className={`mipo-input flex min-h-12 items-center gap-3 px-4 py-2 transition-all ${
              isSearchFocused ? 'ring-2 ring-mipo-cyan/20' : ''
            }`}>
              <Search className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
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
                placeholder="חפש מוצרים..."
                className="h-11 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {searchQuery && (
                <button onClick={clearSearch} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-background transition-colors" aria-label="נקה חיפוש">
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
                  className="absolute top-full left-0 right-0 mt-2 bg-card rounded-xl border border-border shadow-lg overflow-hidden z-50"
                >
                  {searchSuggestions.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSearchSelect(product)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-right"
                    >
                      <div className="w-10 h-10 bg-muted rounded-lg overflow-hidden">
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
      </motion.div>

      {/* Tabs - Instagram style */}
      <div className="sticky top-[104px] z-40 bg-background border-b border-border">
        <div className="mx-auto flex max-w-6xl px-4 sm:px-6">
          {[
            { id: "grid", label: "חנות" },
            { id: "saved", label: "מועדפים" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "grid" | "saved")}
              className={`flex-1 py-3 text-sm font-medium transition-all border-b-2 ${
                activeTab === tab.id
                  ? "text-foreground border-foreground"
                  : "text-muted-foreground border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Categories - Clean pill style */}
      <div className="bg-background">
        <div className="mx-auto max-w-6xl">
          <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide sm:px-6">
            {subCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`min-h-11 px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category.id
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

      {/* Fleet Safety Alert — Cross-Pet Medical Banner */}
      <FleetSafetyAlert />

      {/* Instagram-style Category Carousels */}
      <div className="mx-auto max-w-6xl pb-28">
        {/* Smart Recommendations — Top Priority */}
        {activeTab === "grid" && <SmartRecommendations />}

        {/* Medical Pharmacy Section */}
        {activeTab === "grid" && <MedicalPharmacy />}

        {/* Group products by category and display as carousels */}
        {activeTab === "grid" && filteredAndSortedProducts.length > 0 && (
          <>
            {/* Get unique categories from products */}
            {(() => {
              const productsByCategory = filteredAndSortedProducts.reduce((acc, product) => {
                const category = product.category || 'אחר';
                if (!acc[category]) {
                  acc[category] = [];
                }
                acc[category].push(product);
                return acc;
              }, {} as Record<string, typeof filteredAndSortedProducts>);

              return Object.entries(productsByCategory).map(([category, categoryProducts]) => (
                <div key={category} className="mb-6">
                  {/* Category Header */}
                  <div className="flex items-center justify-between px-4 py-3 sm:px-6">
                    <h2 className="text-base font-bold text-foreground">{category}</h2>
                    <button className="min-h-11 px-3 text-sm text-primary font-medium">הכל ←</button>
                  </div>
                  
                  {/* Horizontal Carousel - Compact for quick shopping */}
                  <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory sm:px-6">
                    {categoryProducts.slice(0, 10).map((product) => (
                      <div
                        key={product.id}
                        onClick={() => handleProductClick(product)}
                        className="w-32 flex-shrink-0 cursor-pointer snap-start sm:w-40"
                      >
                        {/* Compact Card */}
                        <div className="relative rounded-lg overflow-hidden bg-card shadow-sm border border-border/30">
                          {/* Small Square Image */}
                          <div className="relative aspect-square bg-muted">
                            {(() => {
                              const safety = checkProductSafety(`${product.name} ${product.description}`, activePet);
                              return safety.level !== "safe" && (
                                <SafetyBadge level={safety.level} reason={safety.reason} compact />
                              );
                            })()}
                            <OptimizedImage
                              src={product.image}
                              alt={product.name}
                              className={`w-full h-full ${product.isFlagged ? 'opacity-50' : ''} ${
                                checkProductSafety(`${product.name} ${product.description}`, activePet).level === "unsafe" ? 'opacity-40 grayscale' : ''
                              }`}
                              objectFit="cover"
                              sizes="(max-width: 639px) 128px, 160px"
                            />
                            
                            {/* Wishlist button - smaller */}
                            <button
                              onClick={(e) => toggleFavorite(product.id, e)}
                              className="absolute top-1 right-1 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm"
                              aria-label={favorites.includes(product.id) ? "הסר ממועדפים" : "הוסף למועדפים"}
                            >
                              <Heart 
                                className={`w-4 h-4 ${favorites.includes(product.id) ? "fill-destructive text-destructive" : "text-muted-foreground"}`}
                                strokeWidth={2} 
                              />
                            </button>

                            {/* Sale badge - smaller */}
                            {product.originalPrice && product.originalPrice > product.price && (
                              <div className="absolute top-1 left-1 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                                -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                              </div>
                            )}
                          </div>
                          
                          {/* Minimal Product Info */}
                          <div className="p-2">
                            <h3 className="mb-0.5 line-clamp-1 text-xs font-medium text-foreground sm:text-sm">
                              {product.name}
                            </h3>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-primary">₪{product.price}</span>
                              
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </>
        )}

        {/* Loading State */}
        {(isLoadingProducts || isFetching) && filteredAndSortedProducts.length === 0 && (
          <div className="py-20 text-center">
            <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" strokeWidth={1.5} />
            <p className="text-sm font-medium text-foreground mb-1">טוען מוצרים...</p>
          </div>
        )}

        {/* Error State */}
        {isProductsError && !isLoadingProducts && (
          <div className="py-20 text-center px-6">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-destructive" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">משהו השתבש</p>
            <p className="text-xs text-muted-foreground mb-4">לא הצלחנו לטעון את המוצרים. נסו שוב מאוחר יותר.</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingProducts && !isFetching && !isProductsError && filteredAndSortedProducts.length === 0 && (
          <div className="py-20 text-center">
            <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" strokeWidth={1} />
            <p className="text-sm font-medium text-foreground mb-1">אין מוצרים עדיין</p>
            <p className="text-xs text-muted-foreground">בקרוב יעלו מוצרים חדשים</p>
          </div>
        )}
      </div>

      {/* Product Details Sheet - Instagram style */}
      <Sheet open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <SheetContent 
          side="bottom" 
          className="rounded-t-[28px] bg-background p-0 border-0 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] !pb-0"
          aria-describedby="product-details-description"
        >
          {/* Background extension to cover gap above BottomNav */}
          <div className="absolute -bottom-20 left-0 right-0 h-20 bg-background" />
          <SheetTitle className="sr-only">פרטי מוצר</SheetTitle>
          <SheetDescription id="product-details-description" className="sr-only">צפה בפרטי המוצר והוסף לעגלה</SheetDescription>
          {selectedProduct && (
            <motion.div 
              className="flex flex-col h-full" 
              dir="rtl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 rounded-full bg-foreground/10" />
              </div>
              
              {/* Main Content - Card Style */}
              <div className="flex gap-4 px-5 py-3">
                {/* Product Image - Elevated */}
                <motion.div 
                  ref={productImageRef}
                  className="relative w-[100px] h-[100px] flex-shrink-0 rounded-2xl overflow-hidden bg-card shadow-lg"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  <OptimizedImage
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-full h-full"
                    objectFit="cover"
                  />
                  {/* Sale badge */}
                  {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                    <div className="absolute top-2 left-2 bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      -{Math.round((1 - selectedProduct.price / selectedProduct.originalPrice) * 100)}%
                    </div>
                  )}
                </motion.div>

                {/* Product Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <h2 className="text-base font-bold text-foreground leading-snug line-clamp-2 mb-1">
                      {selectedProduct.name}
                    </h2>
                    {/* Rating */}
                    {selectedProduct.rating && (
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < Math.floor(selectedProduct.rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">({selectedProduct.reviews || 0})</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Price */}
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-foreground">₪{selectedProduct.price}</span>
                    {selectedProduct.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through">₪{selectedProduct.originalPrice}</span>
                    )}
                  </div>
                  
                </div>

                {/* Quick Actions */}
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    onClick={() => toggleFavorite(selectedProduct.id)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      favorites.includes(selectedProduct.id) 
                        ? "bg-red-50 shadow-sm" 
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <Heart 
                      className={`w-5 h-5 transition-all ${favorites.includes(selectedProduct.id) ? "fill-destructive text-destructive scale-110" : "text-muted-foreground"}`} 
                      strokeWidth={1.5} 
                    />
                  </button>
                  <button
                    onClick={() => {
                      setInfoDrawerProduct(selectedProduct);
                    }}
                    className="w-10 h-10 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
                  >
                    <Info className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Variants - Pills style */}
              {selectedProduct.flavors && selectedProduct.flavors.length > 0 && (
                <div className="px-5 pb-3">
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                    {selectedProduct.flavors.map((flavor: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedSize(flavor)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                          selectedSize === flavor
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-card border border-border/50 text-foreground hover:border-primary/50"
                        }`}
                      >
                        {flavor}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Safety Warning */}
              {(() => {
                const safety = checkProductSafety(`${selectedProduct.name} ${selectedProduct.description}`, activePet);
                return safety.level !== "safe" && (
                  <div className="px-5 pb-2">
                    <SafetyBadge level={safety.level} reason={safety.reason} petName={activePet?.name} />
                  </div>
                );
              })()}

              {/* Subscribe & Save */}
              <div className="px-5">
                <SubscribeAndSave
                  productName={selectedProduct.name}
                  productPrice={selectedProduct.price}
                  productWeight={null}
                  onSubscribe={(days) => toast({ title: `מנוי נוצר! 📦`, description: `נשלח כל ${days} ימים`, duration: 2000 })}
                />
              </div>

              {/* Action Bar - Slide to Confirm */}
              <div className="px-5 pt-4 pb-24 bg-background border-t border-border/20 mt-auto">
                {selectedProduct.isFlagged ? (
                  <div className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-destructive/5 text-destructive border border-destructive/10">
                    <Flag className="w-4 h-4" />
                    <span className="text-sm font-medium">מוצר בבדיקה</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-muted/80 rounded-2xl p-1">
                      <button onClick={decreaseQuantity} className="w-11 h-11 rounded-xl bg-card shadow-sm flex items-center justify-center active:scale-95 transition-transform">
                        <Minus className="w-5 h-5 text-foreground" />
                      </button>
                      <span className="text-lg font-bold w-10 text-center">{quantity}</span>
                      <button onClick={increaseQuantity} className="w-11 h-11 rounded-xl bg-card shadow-sm flex items-center justify-center active:scale-95 transition-transform">
                        <Plus className="w-5 h-5 text-foreground" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <SlideToConfirm onConfirm={handleAddToCart} label="החלק לרכישה" confirmLabel="נוסף לסל!" price={`₪${selectedProduct.price * quantity}`} disabled={!selectedProduct.inStock} />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </SheetContent>
      </Sheet>

      {/* Product Info Drawer */}
      <AnimatePresence>
        {infoDrawerProduct && (
          <ProductInfoDrawer product={infoDrawerProduct} petName={activePet?.name} onClose={() => setInfoDrawerProduct(null)} onAddToCart={() => { handleAddToCart(); setInfoDrawerProduct(null); }} onAddToCarePlan={() => { if (infoDrawerProduct) addToCarePlan({ id: infoDrawerProduct.id, name: infoDrawerProduct.name, image: infoDrawerProduct.image, price: infoDrawerProduct.price, safetyScore: infoDrawerProduct.safetyScore, category: infoDrawerProduct.category }); }} />
        )}
      </AnimatePresence>
      </div>

    </div>
  );
};

export default Shop;
