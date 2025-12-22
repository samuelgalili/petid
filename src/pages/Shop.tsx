import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, ShoppingBag, Plus, Minus, SlidersHorizontal, TrendingUp, Tag, Heart, Grid3X3, Bookmark, X, Search, Clock, Share2, Truck, Shield, Star, ChevronLeft, Dog, Cat, Info, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useFlyingCart } from "@/components/FlyingCartAnimation";
import { useToast } from "@/hooks/use-toast";
import { OptimizedImage } from "@/components/OptimizedImage";
import confetti from "canvas-confetti";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";

const Shop = () => {
  const navigate = useNavigate();
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

  // Fetch products from database
  const { data: dbProducts = [], isLoading: isLoadingProducts, refetch } = useQuery({
    queryKey: ["shop-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_products")
        .select("*")
        .eq("in_stock", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Refetch on component mount to ensure fresh data
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Transform database products to the format expected by the UI
  const products = useMemo(() => {
    return dbProducts.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      price: p.price,
      originalPrice: p.original_price || p.sale_price ? p.price : null,
      salePrice: p.sale_price,
      images: p.images?.length ? p.images : [p.image_url],
      image: p.image_url,
      popularity: 80, // Default values for now
      likes: Math.floor(Math.random() * 1000) + 100,
      rating: 4.5,
      reviews: Math.floor(Math.random() * 200) + 50,
      inStock: p.in_stock ?? true,
      freeShipping: p.price > 200,
      category: p.category,
      petType: p.pet_type,
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

    return result;
  }, [sortBy, showDealsOnly, activeTab, favorites, searchQuery]);

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
      colors: ['#0095F6', '#ED4956', '#262626'],
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
      {/* Instagram-style Header */}
      <div className="bg-background border-b border-border sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3">
          {/* Top Row: Title + Cart */}
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold text-foreground">Shop</h1>
            <motion.button 
              ref={cartIconRef}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/cart')}
              className={`p-2 relative ${cartShake ? 'animate-[wiggle_0.3s_ease-in-out]' : ''}`}
              onAnimationComplete={() => {
                if (cartIconRef.current) {
                  const rect = cartIconRef.current.getBoundingClientRect();
                  setCartIconPosition(rect.left + rect.width / 2, rect.top + rect.height / 2);
                }
              }}
            >
              <ShoppingBag className="w-6 h-6 text-foreground" strokeWidth={1.5} />
              <AnimatePresence>
                {getTotalItems() > 0 && (
                  <motion.span 
                    className="absolute -top-0.5 -right-0.5 bg-[#FF3040] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
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
          
          {/* Instagram-style Search Bar */}
          <div className="relative">
            <div className={`flex items-center gap-3 bg-muted rounded-lg px-4 py-2 transition-all ${
              isSearchFocused ? 'bg-muted/80' : ''
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
                placeholder="חיפוש"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {searchQuery && (
                <button onClick={clearSearch} className="p-0.5">
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
                  className="absolute top-full left-0 right-0 mt-1 bg-background rounded-lg border border-border shadow-lg overflow-hidden z-50"
                >
                  {searchSuggestions.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSearchSelect(product)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-right"
                    >
                      <div className="w-10 h-10 bg-muted rounded-md overflow-hidden">
                        <OptimizedImage src={product.image} alt={product.name} className="w-full h-full" objectFit="cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">₪{product.price}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Instagram-style Tabs - Shop & Guides */}
      <div className="bg-background border-b border-border">
        <div className="max-w-lg mx-auto flex">
          <button
            onClick={() => setActiveTab("grid")}
            className={`flex-1 py-3 text-center text-sm font-medium border-b transition-colors ${
              activeTab === "grid"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground"
            }`}
          >
            Shop
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex-1 py-3 text-center text-sm font-medium border-b transition-colors ${
              activeTab === "saved"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground"
            }`}
          >
            Wishlist
          </button>
        </div>
      </div>

      {/* Categories - Instagram pill style */}
      <div className="bg-background border-b border-border">
        <div className="max-w-lg mx-auto">
          <div className="flex gap-2 px-4 py-3 overflow-x-auto hide-scrollbar">
            {subCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.label)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.label
                    ? "bg-foreground text-background"
                    : "border border-border text-foreground hover:bg-muted"
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
                  className="w-full h-full"
                  objectFit="cover"
                  sizes="(max-width: 768px) 50vw, 200px"
                />
                
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

        {/* Empty State */}
        {filteredAndSortedProducts.length === 0 && (
          <div className="py-20 text-center">
            <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" strokeWidth={1} />
            <p className="text-sm font-medium text-foreground mb-1">No products yet</p>
            <p className="text-xs text-muted-foreground">Check back later for new items</p>
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
                
                <div className="flex items-center gap-3">
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

                  {/* Size Selector */}
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-2">גודל</h3>
                    <div className="flex gap-2">
                      {sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                            selectedSize === size
                              ? "border-foreground text-foreground"
                              : "border-border text-muted-foreground hover:border-foreground/50"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

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
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <p className="text-xs text-muted-foreground">סה״כ</p>
                    <p className="text-lg font-semibold text-foreground">
                      ₪{selectedProduct.price * quantity}
                    </p>
                  </div>
                  
                  <button
                    onClick={handleAddToCart}
                    disabled={!selectedProduct.inStock}
                    className="flex-1 h-11 text-sm font-semibold rounded-lg bg-primary text-primary-foreground flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {selectedProduct.inStock ? 'הוסף לעגלה' : 'אזל מהמלאי'}
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
