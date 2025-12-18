import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ShoppingCart, ShoppingBag, Plus, Minus, SlidersHorizontal, TrendingUp, Tag, Heart, Grid3X3, Bookmark, X, Search, Clock, Share2, Truck, Shield, Star, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useFlyingCart } from "@/components/FlyingCartAnimation";
import { useToast } from "@/hooks/use-toast";
import { OptimizedImage } from "@/components/OptimizedImage";
import confetti from "canvas-confetti";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";

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
  const [favorites, setFavorites] = useState<number[]>(() => {
    const saved = localStorage.getItem("petid-favorites");
    return saved ? JSON.parse(saved) : [];
  });

  const toggleFavorite = useCallback((productId: number, e?: React.MouseEvent) => {
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

  const categories = [
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

  const products = [
    {
      id: 1,
      name: "מזון יבש פרימיום",
      description: "מזון איכותי לכלבים בוגרים, עשיר בחלבון ובויטמינים חיוניים לבריאות מיטבית",
      price: 189,
      originalPrice: 249,
      images: [
        "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=500&h=500&fit=crop",
      ],
      image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=500&h=500&fit=crop",
      popularity: 95,
      likes: 1247,
      rating: 4.8,
      reviews: 324,
      inStock: true,
      freeShipping: true,
    },
    {
      id: 2,
      name: "חטיפי עוף מיובשים",
      description: "חטיפים טבעיים 100% מעוף איכותי, ללא תוספים או חומרים משמרים",
      price: 45,
      originalPrice: null,
      images: [
        "https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=500&h=500&fit=crop",
      ],
      image: "https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=500&h=500&fit=crop",
      popularity: 78,
      likes: 892,
      rating: 4.5,
      reviews: 156,
      inStock: true,
      freeShipping: false,
    },
    {
      id: 3,
      name: "מיטה אורתופדית",
      description: "מיטה נוחה עם קצף זיכרון לתמיכה מושלמת בגוף, מתאימה לכלבים בכל הגילאים",
      price: 299,
      originalPrice: 399,
      images: [
        "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=500&h=500&fit=crop",
      ],
      image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&h=500&fit=crop",
      popularity: 88,
      likes: 2103,
      rating: 4.9,
      reviews: 487,
      inStock: true,
      freeShipping: true,
    },
    {
      id: 4,
      name: "צעצוע אינטראקטיבי",
      description: "צעצוע חכם שמפעיל את הכלב ומעסיק אותו לשעות, מתאים לכל הגזעים",
      price: 129,
      originalPrice: null,
      images: [
        "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=500&h=500&fit=crop",
      ],
      image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=500&h=500&fit=crop",
      popularity: 65,
      likes: 567,
      rating: 4.3,
      reviews: 89,
      inStock: true,
      freeShipping: false,
    },
    {
      id: 5,
      name: "שמפו טיפולי",
      description: "שמפו עדין לעור רגיש, מפנק את הפרווה ומשאיר ניחוח נעים לאורך זמן",
      price: 59,
      originalPrice: 79,
      images: [
        "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=500&h=500&fit=crop",
      ],
      image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&h=500&fit=crop",
      popularity: 72,
      likes: 734,
      rating: 4.6,
      reviews: 203,
      inStock: true,
      freeShipping: false,
    },
    {
      id: 6,
      name: "קערה אוטומטית",
      description: "קערת מים ואוכל חכמה עם חיישן מילוי אוטומטי, שומרת על מים טריים",
      price: 169,
      originalPrice: null,
      images: [
        "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=500&h=500&fit=crop",
      ],
      image: "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=500&h=500&fit=crop",
      popularity: 81,
      likes: 1456,
      rating: 4.7,
      reviews: 312,
      inStock: true,
      freeShipping: true,
    },
    {
      id: 7,
      name: "רצועה מעוצבת",
      description: "רצועה איכותית ונוחה לאחיזה, עם חומרים עמידים ועיצוב אלגנטי",
      price: 89,
      originalPrice: 119,
      images: [
        "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=500&h=500&fit=crop",
      ],
      image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=500&h=500&fit=crop",
      popularity: 77,
      likes: 623,
      rating: 4.4,
      reviews: 178,
      inStock: false,
      freeShipping: false,
    },
    {
      id: 8,
      name: "כדור משחק",
      description: "כדור גומי עמיד במיוחד, קופץ גבוה ומושלם למשחקי אפורט",
      price: 35,
      originalPrice: null,
      images: [
        "https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=500&h=500&fit=crop",
      ],
      image: "https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=500&h=500&fit=crop",
      popularity: 69,
      likes: 445,
      rating: 4.2,
      reviews: 95,
      inStock: true,
      freeShipping: false,
    },
    {
      id: 9,
      name: "מברשת פרווה",
      description: "מברשת מקצועית להסרת פרווה מתה ולמניעת קשרים, עדינה לעור",
      price: 49,
      originalPrice: 65,
      images: [
        "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&h=500&fit=crop",
      ],
      image: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=500&h=500&fit=crop",
      popularity: 74,
      likes: 512,
      rating: 4.5,
      reviews: 134,
      inStock: true,
      freeShipping: false,
    },
  ];

  // Search suggestions based on query
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [searchQuery]);

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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-20" dir="rtl">
      {/* Enhanced Header with Search */}
      <div className="bg-gradient-to-b from-background to-background/95 backdrop-blur-xl border-b border-primary/10 sticky top-0 z-50 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3">
          {/* Top Row: Title + Cart */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                <ShoppingBag className="w-5 h-5 text-primary-foreground" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">חנות</h1>
                <p className="text-[10px] text-muted-foreground">מוצרים איכותיים לחיית המחמד</p>
              </div>
            </div>
            <button 
              ref={cartIconRef}
              onClick={() => navigate('/cart')}
              className="relative p-2"
            >
              <motion.div
                animate={cartShake ? {
                  rotate: [0, -15, 15, -10, 10, -5, 5, 0],
                  scale: [1, 1.2, 1.1, 1.15, 1.1, 1.05, 1],
                } : {}}
                transition={{ duration: 0.5 }}
                onAnimationComplete={() => {
                  if (cartIconRef.current) {
                    const rect = cartIconRef.current.getBoundingClientRect();
                    setCartIconPosition(rect.left + rect.width / 2, rect.top + rect.height / 2);
                  }
                }}
                className="w-11 h-11 rounded-2xl bg-muted/50 flex items-center justify-center border border-border/30"
              >
                <ShoppingCart className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </motion.div>
              <AnimatePresence>
                {getTotalItems() > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-0.5 -right-0.5 bg-gradient-to-br from-destructive to-destructive/80 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-destructive/30"
                  >
                    {getTotalItems()}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
          
          {/* Enhanced Search Bar */}
          <div className="relative">
            <div className={`flex items-center gap-3 bg-muted/50 rounded-2xl px-4 py-3 border-2 transition-all duration-300 ${
              isSearchFocused ? 'border-primary/50 bg-background shadow-lg shadow-primary/10' : 'border-transparent'
            }`}>
              <Search className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
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
                placeholder="חיפוש מוצרים..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-medium"
              />
              {searchQuery && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={clearSearch}
                  className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                </motion.button>
              )}
            </div>
            
            {/* Search Dropdown - Show when focused and no query */}
            <AnimatePresence>
              {isSearchFocused && !searchQuery.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-background rounded-2xl border border-border/50 shadow-xl overflow-hidden z-50"
                >
                  {/* Quick Category Tags */}
                  <div className="px-4 py-3 border-b border-border/30">
                    <span className="text-xs font-bold text-foreground mb-3 block">חיפוש מהיר</span>
                    <div className="flex flex-wrap gap-2">
                      {quickTags.map((tag, index) => (
                        <motion.button
                          key={tag.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.03 }}
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.05 }}
                          onClick={() => handleTagClick(tag)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-sm hover:shadow-md"
                          style={{ backgroundColor: tag.color }}
                        >
                          <span className="text-sm">{tag.icon}</span>
                          <span>{tag.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Recent Searches */}
                  {searchHistory.length > 0 && (
                    <>
                      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30">
                        <span className="text-xs font-bold text-foreground">חיפושים אחרונים</span>
                        <button 
                          onClick={clearSearchHistory}
                          className="text-xs text-primary font-semibold hover:underline"
                        >
                          נקה הכל
                        </button>
                      </div>
                      {searchHistory.map((query, index) => (
                        <motion.button
                          key={query}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleHistorySelect(query)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-right"
                        >
                          <Clock className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                          <span className="flex-1 text-sm text-foreground font-medium">{query}</span>
                          <button
                            onClick={(e) => removeFromHistory(query, e)}
                            className="p-1.5 hover:bg-muted rounded-full"
                          >
                            <X className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                          </button>
                        </motion.button>
                      ))}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Autocomplete Suggestions */}
            <AnimatePresence>
              {showSearchResults && searchQuery.trim() && searchSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-background rounded-2xl border border-border/50 shadow-xl overflow-hidden z-50"
                >
                  {searchSuggestions.map((product, index) => (
                    <motion.button
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSearchSelect(product)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-right"
                    >
                      <div className="w-12 h-12 bg-muted rounded-xl overflow-hidden flex-shrink-0">
                        <OptimizedImage
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full"
                          objectFit="cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">₪{product.price}</p>
                      </div>
                      {product.originalPrice && (
                        <span className="bg-gradient-to-r from-destructive to-destructive/80 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm">
                          מבצע
                        </span>
                      )}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* No Results */}
            <AnimatePresence>
              {showSearchResults && searchQuery.trim() && searchSuggestions.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-background rounded-2xl border border-border/50 shadow-xl p-6 text-center z-50"
                >
                  <Search className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" strokeWidth={1} />
                  <p className="text-sm text-muted-foreground">לא נמצאו מוצרים עבור "{searchQuery}"</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Pet Type Filter */}
      <div className="bg-background/80 backdrop-blur-sm border-b border-border/30">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex gap-2">
            {[
              { id: "all", label: "הכל", icon: "🐾" },
              { id: "dog", label: "כלבים", icon: "🐕" },
              { id: "cat", label: "חתולים", icon: "🐱" },
            ].map((type) => (
              <motion.button
                key={type.id}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedPetType(type.id as any)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  selectedPetType === type.id
                    ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-muted/50 text-foreground border border-border/30 hover:bg-muted"
                }`}
              >
                <span className="mr-1">{type.icon}</span> {type.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Categories Scroll */}
      <div className="bg-background/60 backdrop-blur-sm">
        <div className="max-w-lg mx-auto">
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
            {categories.map((category, index) => (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(category.label)}
                className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
                  selectedCategory === category.label
                    ? "bg-foreground text-background shadow-lg"
                    : "bg-muted/80 text-foreground border border-border/30 hover:bg-muted hover:border-border"
                }`}
              >
                {category.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Filter Bar */}
      <div className="bg-gradient-to-b from-background/80 to-muted/30 border-b border-border/20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                showFilters || sortBy !== "none" || showDealsOnly
                  ? "bg-gradient-to-br from-foreground to-foreground/90 text-background shadow-md"
                  : "bg-muted text-foreground border border-border/30 hover:bg-muted/80"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" strokeWidth={2} />
              סינון
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDealsOnly(!showDealsOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                showDealsOnly
                  ? "bg-gradient-to-br from-destructive to-destructive/80 text-white shadow-lg shadow-destructive/30"
                  : "bg-muted text-foreground border border-border/30 hover:bg-muted/80"
              }`}
            >
              <Tag className="w-4 h-4" strokeWidth={2} />
              מבצעים 🔥
            </motion.button>
          </div>

          {/* Grid/Saved Toggle */}
          <div className="flex bg-muted/50 rounded-xl p-1 border border-border/30">
            <button
              onClick={() => setActiveTab("grid")}
              className={`p-2 rounded-lg transition-all duration-200 ${
                activeTab === "grid" ? "bg-background shadow-sm" : "hover:bg-muted"
              }`}
            >
              <Grid3X3 className={`w-4 h-4 ${activeTab === "grid" ? "text-foreground" : "text-muted-foreground"}`} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`p-2 rounded-lg transition-all duration-200 ${
                activeTab === "saved" ? "bg-background shadow-sm" : "hover:bg-muted"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${activeTab === "saved" ? "text-foreground" : "text-muted-foreground"}`} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Options Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-background border-b border-border/30"
          >
            <div className="max-w-lg mx-auto px-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-primary" strokeWidth={2} />
                <span className="text-sm font-bold text-foreground">מיון לפי</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "none", label: "ברירת מחדל" },
                  { id: "popularity", label: "פופולריות 🔥" },
                  { id: "price-low", label: "מחיר ↑" },
                  { id: "price-high", label: "מחיר ↓" },
                ].map((option) => (
                  <motion.button
                    key={option.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSortBy(option.id as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                      sortBy === option.id
                        ? "bg-gradient-to-br from-foreground to-foreground/90 text-background shadow-md"
                        : "bg-muted text-foreground border border-border/30 hover:bg-muted/80"
                    }`}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products Count */}
      <div className="bg-muted/30">
        <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {filteredAndSortedProducts.length} מוצרים
          </span>
          <span className="text-xs text-primary font-semibold">משלוח חינם מעל ₪200</span>
        </div>
      </div>

      {/* Enhanced Products Grid */}
      <div className="bg-background">
        <div className="max-w-lg mx-auto p-3">
          <motion.div 
            className="grid grid-cols-2 gap-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.06,
                  delayChildren: 0.1,
                }
              }
            }}
          >
            {filteredAndSortedProducts.map((product, index) => (
              <motion.div
                key={product.id}
                variants={{
                  hidden: { 
                    opacity: 0, 
                    scale: 0.9,
                    y: 20,
                  },
                  visible: { 
                    opacity: 1, 
                    scale: 1,
                    y: 0,
                    transition: {
                      type: "spring",
                      stiffness: 300,
                      damping: 24,
                    }
                  }
                }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="relative bg-background rounded-2xl overflow-hidden border border-border/30 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group"
                onClick={() => handleProductClick(product)}
              >
                {/* Image Container */}
                <div className="relative aspect-square bg-gradient-to-br from-muted/50 to-muted overflow-hidden">
                  <motion.div
                    className="w-full h-full"
                    whileHover={{ scale: 1.08 }}
                    transition={{ duration: 0.4 }}
                  >
                    <OptimizedImage
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full"
                      objectFit="cover"
                      sizes="(max-width: 768px) 50vw, 200px"
                    />
                  </motion.div>
                  
                  {/* Sale Badge */}
                  {product.originalPrice && (
                    <motion.div 
                      className="absolute top-2 right-2 bg-gradient-to-br from-destructive to-destructive/80 text-white px-2 py-1 rounded-lg text-[10px] font-bold shadow-lg shadow-destructive/30"
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ 
                        type: "spring",
                        stiffness: 500,
                        damping: 15,
                        delay: index * 0.03 + 0.2
                      }}
                    >
                      -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                    </motion.div>
                  )}

                  {/* Save Button */}
                  <motion.button
                    onClick={(e) => toggleFavorite(product.id, e)}
                    className="absolute top-2 left-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    whileTap={{ scale: 1.2 }}
                  >
                    <Bookmark 
                      className={`w-4 h-4 ${favorites.includes(product.id) ? "fill-primary text-primary" : "text-foreground"}`} 
                      strokeWidth={1.5} 
                    />
                  </motion.button>

                  {/* Free Shipping Badge */}
                  {product.freeShipping && (
                    <div className="absolute bottom-2 left-2 bg-emerald-500/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      חינם
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3 space-y-2">
                  <h3 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-semibold text-foreground">{product.rating}</span>
                    <span className="text-[10px] text-muted-foreground">({product.reviews})</span>
                  </div>
                  
                  {/* Price */}
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-black ${product.originalPrice ? 'text-destructive' : 'text-foreground'}`}>
                      ₪{product.price}
                    </span>
                    {product.originalPrice && (
                      <span className="text-xs text-muted-foreground line-through">
                        ₪{product.originalPrice}
                      </span>
                    )}
                  </div>

                  {/* Stock Status */}
                  {!product.inStock && (
                    <div className="text-[10px] font-medium text-destructive">אזל מהמלאי</div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Empty State for Saved */}
          {activeTab === "saved" && filteredAndSortedProducts.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-20 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Bookmark className="w-10 h-10 text-muted-foreground" strokeWidth={1} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">עדיין אין מוצרים שמורים</h3>
              <p className="text-sm text-muted-foreground">שמור מוצרים שאהבת לצפייה מאוחרת</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Product Details Sheet - Enhanced */}
      <Sheet open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl bg-background p-0 overflow-hidden shadow-2xl" aria-describedby="product-details-description">
          <SheetTitle className="sr-only">פרטי מוצר</SheetTitle>
          <SheetDescription id="product-details-description" className="sr-only">צפה בפרטי המוצר והוסף לעגלה</SheetDescription>
          {selectedProduct && (
            <div className="flex flex-col h-full" dir="rtl">
              {/* Header with drag handle */}
              <div className="flex-shrink-0">
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-12 h-1.5 bg-gradient-to-r from-muted via-primary/30 to-muted rounded-full" />
                </div>
                
                {/* Top Actions */}
                <div className="flex items-center justify-between px-4 pb-2">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedProduct(null)}
                    className="w-10 h-10 bg-muted/50 rounded-full flex items-center justify-center border border-border/30"
                  >
                    <ChevronLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                  </motion.button>
                  
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        navigator.share?.({
                          title: selectedProduct.name,
                          text: `בדוק את ${selectedProduct.name} ב-₪${selectedProduct.price}`,
                        }).catch(() => {});
                      }}
                      className="w-10 h-10 bg-muted/50 rounded-full flex items-center justify-center border border-border/30"
                    >
                      <Share2 className="w-4 h-4 text-foreground" strokeWidth={1.5} />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleFavorite(selectedProduct.id)}
                      className="w-10 h-10 bg-muted/50 rounded-full flex items-center justify-center border border-border/30"
                    >
                      <Bookmark 
                        className={`w-4 h-4 ${favorites.includes(selectedProduct.id) ? "fill-primary text-primary" : "text-foreground"}`} 
                        strokeWidth={1.5} 
                      />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Product Image Gallery */}
                <div className="relative mb-4">
                  <Carousel 
                    className="w-full" 
                    dir="ltr"
                    setApi={setCarouselApi}
                    opts={{ direction: "ltr" }}
                  >
                    <CarouselContent>
                      {(selectedProduct.images || [selectedProduct.image]).map((img: string, index: number) => (
                        <CarouselItem key={index}>
                          <div className="px-4">
                            <motion.div 
                              ref={index === 0 ? productImageRef : undefined}
                              initial={{ scale: 0.95, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="w-full aspect-square bg-gradient-to-br from-muted/50 to-muted rounded-2xl overflow-hidden shadow-lg"
                            >
                              <OptimizedImage
                                src={img}
                                alt={`${selectedProduct.name} - תמונה ${index + 1}`}
                                className="w-full h-full"
                                objectFit="cover"
                                sizes="(max-width: 768px) 100vw, 400px"
                              />
                            </motion.div>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </Carousel>
                  
                  {/* Image Dots Pagination */}
                  {(selectedProduct.images?.length || 1) > 1 && (
                    <div className="flex justify-center gap-1.5 mt-3">
                      {(selectedProduct.images || [selectedProduct.image]).map((_: string, index: number) => (
                        <motion.div
                          key={index}
                          initial={false}
                          animate={{
                            width: currentImageIndex === index ? 20 : 6,
                          }}
                          transition={{ duration: 0.2 }}
                          className={`h-1.5 rounded-full ${currentImageIndex === index ? 'bg-foreground' : 'bg-muted-foreground/30'}`}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Image Counter */}
                  {(selectedProduct.images?.length || 1) > 1 && (
                    <div className="absolute top-6 left-6 bg-foreground/70 backdrop-blur-sm text-background text-[11px] font-semibold px-2.5 py-1 rounded-full">
                      {currentImageIndex + 1}/{selectedProduct.images?.length || 1}
                    </div>
                  )}
                  
                  {/* Sale Badge */}
                  {selectedProduct.originalPrice && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="absolute top-6 right-6 bg-gradient-to-br from-destructive to-destructive/80 text-white px-3 py-1.5 rounded-xl text-sm font-bold shadow-lg shadow-destructive/30"
                    >
                      {Math.round((1 - selectedProduct.price / selectedProduct.originalPrice) * 100)}% הנחה
                    </motion.div>
                  )}
                </div>

                <div className="px-4 space-y-4">
                  {/* Product Title & Rating */}
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2 leading-tight">
                      {selectedProduct.name}
                    </h2>
                    
                    {/* Rating & Reviews */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-lg">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-bold text-foreground">{selectedProduct.rating}</span>
                      </div>
                      <span className="text-sm text-primary font-medium">({selectedProduct.reviews} ביקורות)</span>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Heart className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span className="text-xs">{selectedProduct.likes}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price Section */}
                  <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl p-4 border border-border/30">
                    <div className="flex items-end gap-3">
                      <span className={`text-3xl font-black ${selectedProduct.originalPrice ? 'text-destructive' : 'text-foreground'}`}>
                        ₪{selectedProduct.price}
                      </span>
                      {selectedProduct.originalPrice && (
                        <span className="text-lg text-muted-foreground line-through mb-0.5">
                          ₪{selectedProduct.originalPrice}
                        </span>
                      )}
                    </div>
                    {selectedProduct.originalPrice && (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                        חסכון של ₪{selectedProduct.originalPrice - selectedProduct.price}!
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-2">תיאור המוצר</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedProduct.description}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`flex items-center gap-2 p-3 rounded-xl border ${selectedProduct.inStock ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedProduct.inStock ? 'bg-emerald-500' : 'bg-destructive'}`}>
                        <Shield className="w-4 h-4 text-white" strokeWidth={2} />
                      </div>
                      <span className={`text-xs font-semibold ${selectedProduct.inStock ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}`}>
                        {selectedProduct.inStock ? 'במלאי' : 'אזל מהמלאי'}
                      </span>
                    </div>
                    
                    <div className={`flex items-center gap-2 p-3 rounded-xl border ${selectedProduct.freeShipping ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' : 'bg-muted border-border/30'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedProduct.freeShipping ? 'bg-blue-500' : 'bg-muted-foreground/30'}`}>
                        <Truck className="w-4 h-4 text-white" strokeWidth={2} />
                      </div>
                      <span className={`text-xs font-semibold ${selectedProduct.freeShipping ? 'text-blue-700 dark:text-blue-300' : 'text-muted-foreground'}`}>
                        {selectedProduct.freeShipping ? 'משלוח חינם' : 'משלוח רגיל'}
                      </span>
                    </div>
                  </div>

                  {/* Size Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-foreground">בחר גודל</h3>
                      <button className="text-xs text-primary font-semibold">מדריך מידות</button>
                    </div>
                    <div className="flex gap-2">
                      {sizes.map((size) => (
                        <motion.button
                          key={size}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedSize(size)}
                          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                            selectedSize === size
                              ? "bg-foreground text-background shadow-lg"
                              : "bg-muted text-foreground border border-border/30 hover:bg-muted/80"
                          }`}
                        >
                          {size}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Quantity Selector */}
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-3">כמות</h3>
                    <div className="flex items-center justify-between bg-muted/50 rounded-xl p-2 border border-border/30">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={decreaseQuantity}
                        className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shadow-sm border border-border/30"
                      >
                        <Minus className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                      </motion.button>
                      <span className="text-xl font-black text-foreground">{quantity}</span>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={increaseQuantity}
                        className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shadow-sm border border-border/30"
                      >
                        <Plus className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Spacer for bottom button */}
                  <div className="h-4" />
                </div>
              </div>

              {/* Fixed Bottom Bar */}
              <div className="flex-shrink-0 border-t border-border/30 px-4 py-4 bg-background shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-3">
                  {/* Total Price */}
                  <div className="flex-shrink-0">
                    <p className="text-[10px] text-muted-foreground font-medium">סה״כ</p>
                    <p className="text-xl font-black text-foreground">₪{selectedProduct.price * quantity}</p>
                  </div>
                  
                  {/* Add to Cart Button */}
                  <motion.div className="flex-1" whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={handleAddToCart}
                      disabled={!selectedProduct.inStock}
                      className={`w-full h-14 text-base font-bold rounded-xl flex items-center justify-center gap-2 ${
                        selectedProduct.inStock 
                          ? 'bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 text-primary-foreground shadow-lg shadow-primary/30' 
                          : 'bg-muted text-muted-foreground cursor-not-allowed'
                      }`}
                    >
                      <ShoppingCart className="w-5 h-5" strokeWidth={2} />
                      {selectedProduct.inStock ? 'הוסף לעגלה' : 'אזל מהמלאי'}
                    </Button>
                  </motion.div>
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
