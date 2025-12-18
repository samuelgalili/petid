import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ShoppingCart, ShoppingBag, Plus, Minus, SlidersHorizontal, TrendingUp, Tag, Heart, Grid3X3, Bookmark, X, Search, Clock, Share2, Truck, Shield, Star, ChevronLeft, Dog, Cat } from "lucide-react";
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
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      {/* Clean Header */}
      <div className="bg-background/95 backdrop-blur-xl border-b border-border/40 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3">
          {/* Top Row: Title + Cart */}
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-foreground">חנות</h1>
            <motion.button 
              ref={cartIconRef}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/cart')}
              className={`active:opacity-50 transition-opacity p-1 relative ${cartShake ? 'animate-[wiggle_0.3s_ease-in-out]' : ''}`}
              onAnimationComplete={() => {
                if (cartIconRef.current) {
                  const rect = cartIconRef.current.getBoundingClientRect();
                  setCartIconPosition(rect.left + rect.width / 2, rect.top + rect.height / 2);
                }
              }}
            >
              <ShoppingCart className="w-6 h-6 text-petid-gold" strokeWidth={1.5} />
              <AnimatePresence>
                {getTotalItems() > 0 && (
                  <motion.span 
                    className="absolute -top-1 -right-1 bg-petid-gold text-petid-blue-dark text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
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
          
          {/* Clean Search Bar */}
          <div className="relative">
            <div className={`flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5 transition-all ${
              isSearchFocused ? 'ring-2 ring-petid-gold/30 border-petid-gold/50' : ''
            }`}>
              <Search className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
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
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {searchQuery && (
                <button onClick={clearSearch} className="p-1">
                  <X className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                </button>
              )}
            </div>
            
            {/* Search Suggestions */}
            <AnimatePresence>
              {showSearchResults && searchQuery.trim() && searchSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-background rounded-xl border border-border shadow-lg overflow-hidden z-50"
                >
                  {searchSuggestions.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSearchSelect(product)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-right"
                    >
                      <div className="w-10 h-10 bg-muted rounded-lg overflow-hidden">
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

      {/* Pet Type Selection - Gradient style */}
      <div className="bg-white">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setSelectedPetType("all")}
              className={`flex items-center justify-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all ${
                selectedPetType === "all"
                  ? "bg-gradient-to-r from-petid-blue via-petid-gold to-petid-blue-dark text-white shadow-md"
                  : "text-gray-700"
              }`}
              style={selectedPetType !== "all" ? { background: 'linear-gradient(white, white) padding-box, linear-gradient(to right, #1E90FF, #FFB347, #1565C0) border-box', border: '2px solid transparent', borderRadius: '9999px' } : {}}
            >
              הכל
            </button>
            <button
              onClick={() => setSelectedPetType("dog")}
              className={`flex items-center justify-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all ${
                selectedPetType === "dog"
                  ? "bg-gradient-to-r from-petid-blue via-petid-gold to-petid-blue-dark text-white shadow-md"
                  : "text-gray-700"
              }`}
              style={selectedPetType !== "dog" ? { background: 'linear-gradient(white, white) padding-box, linear-gradient(to right, #1E90FF, #FFB347, #1565C0) border-box', border: '2px solid transparent', borderRadius: '9999px' } : {}}
            >
              <Dog className="w-4 h-4" strokeWidth={1.5} />
              כלב
            </button>
            <button
              onClick={() => setSelectedPetType("cat")}
              className={`flex items-center justify-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all ${
                selectedPetType === "cat"
                  ? "bg-gradient-to-r from-petid-blue via-petid-gold to-petid-blue-dark text-white shadow-md"
                  : "text-gray-700"
              }`}
              style={selectedPetType !== "cat" ? { background: 'linear-gradient(white, white) padding-box, linear-gradient(to right, #1E90FF, #FFB347, #1565C0) border-box', border: '2px solid transparent', borderRadius: '9999px' } : {}}
            >
              <Cat className="w-4 h-4" strokeWidth={1.5} />
              חתול
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Categories Scroll */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto">
          <div className="flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide">
            {subCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.label)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category.label
                    ? "bg-gradient-to-r from-petid-blue via-petid-gold to-petid-blue-dark text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
                style={selectedCategory !== category.label ? { background: 'linear-gradient(white, white) padding-box, linear-gradient(to right, #1E90FF, #FFB347, #1565C0) border-box', border: '1.5px solid transparent', borderRadius: '9999px' } : {}}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDealsOnly(!showDealsOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                showDealsOnly
                  ? "bg-gradient-to-r from-petid-blue via-petid-gold to-petid-blue-dark text-white shadow-sm"
                  : "text-gray-600"
              }`}
              style={!showDealsOnly ? { background: 'linear-gradient(white, white) padding-box, linear-gradient(to right, #1E90FF, #FFB347, #1565C0) border-box', border: '1.5px solid transparent', borderRadius: '9999px' } : {}}
            >
              <Tag className="w-3.5 h-3.5" strokeWidth={2} />
              מבצעים
            </button>
            
            <button
              onClick={() => setSortBy(sortBy === "price-low" ? "none" : "price-low")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                sortBy === "price-low"
                  ? "bg-gradient-to-r from-petid-blue via-petid-gold to-petid-blue-dark text-white shadow-sm"
                  : "text-gray-600"
              }`}
              style={sortBy !== "price-low" ? { background: 'linear-gradient(white, white) padding-box, linear-gradient(to right, #1E90FF, #FFB347, #1565C0) border-box', border: '1.5px solid transparent', borderRadius: '9999px' } : {}}
            >
              מחיר ↑
            </button>
          </div>

          <span className="text-xs text-gray-500">
            {filteredAndSortedProducts.length} מוצרים
          </span>
        </div>
      </div>

      {/* Clean Products Grid */}
      <div className="max-w-lg mx-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {filteredAndSortedProducts.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.98 }}
              className="bg-background rounded-xl overflow-hidden border border-border cursor-pointer"
              onClick={() => handleProductClick(product)}
            >
              {/* Image */}
              <div className="relative aspect-square bg-muted">
                <OptimizedImage
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full"
                  objectFit="cover"
                  sizes="(max-width: 768px) 50vw, 200px"
                />
                
                {/* Sale Badge */}
                {product.originalPrice && (
                  <div className="absolute top-2 right-2 bg-destructive text-white px-2 py-0.5 rounded text-[10px] font-bold">
                    -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                  </div>
                )}

                {/* Save Button */}
                <button
                  onClick={(e) => toggleFavorite(product.id, e)}
                  className="absolute top-2 left-2 w-7 h-7 rounded-full bg-background/90 flex items-center justify-center"
                >
                  <Bookmark 
                    className={`w-3.5 h-3.5 ${favorites.includes(product.id) ? "fill-foreground text-foreground" : "text-muted-foreground"}`} 
                    strokeWidth={1.5} 
                  />
                </button>
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="text-sm font-semibold text-foreground line-clamp-1 mb-1">
                  {product.name}
                </h3>
                
                <div className="flex items-center gap-1 mb-2">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs text-muted-foreground">{product.rating}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${product.originalPrice ? 'text-destructive' : 'text-foreground'}`}>
                    ₪{product.price}
                  </span>
                  {product.originalPrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      ₪{product.originalPrice}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredAndSortedProducts.length === 0 && (
          <div className="py-16 text-center">
            <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-3" strokeWidth={1} />
            <p className="text-sm text-muted-foreground">לא נמצאו מוצרים</p>
          </div>
        )}
      </div>

      {/* Product Details Sheet */}
      <Sheet open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl bg-background p-0 overflow-hidden" aria-describedby="product-details-description">
          <SheetTitle className="sr-only">פרטי מוצר</SheetTitle>
          <SheetDescription id="product-details-description" className="sr-only">צפה בפרטי המוצר והוסף לעגלה</SheetDescription>
          {selectedProduct && (
            <div className="flex flex-col h-full" dir="rtl">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
              
              {/* Top Actions */}
              <div className="flex items-center justify-between px-4 pb-3">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
                >
                  <ChevronLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                </button>
                
                <button
                  onClick={() => toggleFavorite(selectedProduct.id)}
                  className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
                >
                  <Bookmark 
                    className={`w-4 h-4 ${favorites.includes(selectedProduct.id) ? "fill-foreground" : ""} text-foreground`} 
                    strokeWidth={1.5} 
                  />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Product Image */}
                <div className="relative px-4 mb-4">
                  <Carousel className="w-full" dir="ltr" setApi={setCarouselApi} opts={{ direction: "ltr" }}>
                    <CarouselContent>
                      {(selectedProduct.images || [selectedProduct.image]).map((img: string, index: number) => (
                        <CarouselItem key={index}>
                          <div 
                            ref={index === 0 ? productImageRef : undefined}
                            className="w-full aspect-square bg-muted rounded-xl overflow-hidden"
                          >
                            <OptimizedImage
                              src={img}
                              alt={selectedProduct.name}
                              className="w-full h-full"
                              objectFit="cover"
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </Carousel>
                  
                  {/* Dots */}
                  {(selectedProduct.images?.length || 1) > 1 && (
                    <div className="flex justify-center gap-1.5 mt-3">
                      {(selectedProduct.images || [selectedProduct.image]).map((_: string, index: number) => (
                        <div
                          key={index}
                          className={`h-1.5 rounded-full transition-all ${currentImageIndex === index ? 'w-5 bg-foreground' : 'w-1.5 bg-muted-foreground/30'}`}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Sale Badge */}
                  {selectedProduct.originalPrice && (
                    <div className="absolute top-2 right-6 bg-destructive text-white px-2 py-1 rounded text-xs font-bold">
                      -{Math.round((1 - selectedProduct.price / selectedProduct.originalPrice) * 100)}%
                    </div>
                  )}
                </div>

                <div className="px-4 space-y-4">
                  {/* Title & Rating */}
                  <div>
                    <h2 className="text-lg font-bold text-foreground mb-1">{selectedProduct.name}</h2>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-medium text-foreground">{selectedProduct.rating}</span>
                      <span className="text-xs text-muted-foreground">({selectedProduct.reviews} ביקורות)</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-end gap-2">
                    <span className={`text-2xl font-bold ${selectedProduct.originalPrice ? 'text-destructive' : 'text-foreground'}`}>
                      ₪{selectedProduct.price}
                    </span>
                    {selectedProduct.originalPrice && (
                      <span className="text-base text-muted-foreground line-through">₪{selectedProduct.originalPrice}</span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>

                  {/* Size Selector */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">גודל</h3>
                    <div className="flex gap-2">
                      {sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            selectedSize === size
                              ? "bg-foreground text-background"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quantity */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">כמות</h3>
                    <div className="flex items-center gap-4 bg-muted rounded-lg p-1 w-fit">
                      <button
                        onClick={decreaseQuantity}
                        className="w-9 h-9 rounded-md bg-background flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4 text-foreground" />
                      </button>
                      <span className="text-lg font-bold text-foreground w-8 text-center">{quantity}</span>
                      <button
                        onClick={increaseQuantity}
                        className="w-9 h-9 rounded-md bg-background flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4 text-foreground" />
                      </button>
                    </div>
                  </div>

                  <div className="h-4" />
                </div>
              </div>

              {/* Bottom Bar */}
              <div className="flex-shrink-0 border-t border-border px-4 py-4 bg-background">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">סה״כ</p>
                    <p className="text-xl font-bold text-foreground">₪{selectedProduct.price * quantity}</p>
                  </div>
                  
                  <Button
                    onClick={handleAddToCart}
                    disabled={!selectedProduct.inStock}
                    className="flex-1 h-12 text-sm font-semibold rounded-lg"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {selectedProduct.inStock ? 'הוסף לעגלה' : 'אזל מהמלאי'}
                  </Button>
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
