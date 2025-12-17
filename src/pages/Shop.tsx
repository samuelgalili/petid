import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ShoppingCart, Plus, Minus, SlidersHorizontal, TrendingUp, Tag, Heart, Grid3X3, Bookmark, X, Search, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { OptimizedImage } from "@/components/OptimizedImage";
import confetti from "canvas-confetti";

const Shop = () => {
  const navigate = useNavigate();
  const { addToCart, getTotalItems } = useCart();
  const { toast } = useToast();
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

  const products = [
    {
      id: 1,
      name: "מזון יבש פרימיום",
      price: 189,
      originalPrice: 249,
      image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=500&h=500&fit=crop",
      popularity: 95,
      likes: 1247,
    },
    {
      id: 2,
      name: "חטיפי עוף מיובשים",
      price: 45,
      originalPrice: null,
      image: "https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=500&h=500&fit=crop",
      popularity: 78,
      likes: 892,
    },
    {
      id: 3,
      name: "מיטה אורתופדית",
      price: 299,
      originalPrice: 399,
      image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&h=500&fit=crop",
      popularity: 88,
      likes: 2103,
    },
    {
      id: 4,
      name: "צעצוע אינטראקטיבי",
      price: 129,
      originalPrice: null,
      image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=500&h=500&fit=crop",
      popularity: 65,
      likes: 567,
    },
    {
      id: 5,
      name: "שמפו טיפולי",
      price: 59,
      originalPrice: 79,
      image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&h=500&fit=crop",
      popularity: 72,
      likes: 734,
    },
    {
      id: 6,
      name: "קערה אוטומטית",
      price: 169,
      originalPrice: null,
      image: "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=500&h=500&fit=crop",
      popularity: 81,
      likes: 1456,
    },
    {
      id: 7,
      name: "רצועה מעוצבת",
      price: 89,
      originalPrice: 119,
      image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=500&h=500&fit=crop",
      popularity: 77,
      likes: 623,
    },
    {
      id: 8,
      name: "כדור משחק",
      price: 35,
      originalPrice: null,
      image: "https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=500&h=500&fit=crop",
      popularity: 69,
      likes: 445,
    },
    {
      id: 9,
      name: "מברשת פרווה",
      price: 49,
      originalPrice: 65,
      image: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=500&h=500&fit=crop",
      popularity: 74,
      likes: 512,
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
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!selectedProduct) return;

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
  }, [selectedProduct, quantity, addToCart, toast, selectedSize]);

  const increaseQuantity = useCallback(() => setQuantity(prev => prev + 1), []);
  const decreaseQuantity = useCallback(() => setQuantity(prev => Math.max(1, prev - 1)), []);

  return (
    <div className="min-h-screen bg-white pb-20" dir="rtl">
      {/* Instagram-style Header with Search */}
      <div className="bg-white border-b border-[#DBDBDB] sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-2">
          {/* Top Row: Title + Cart */}
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-[20px] font-semibold text-[#262626]">חנות</h1>
            <button 
              onClick={() => navigate('/cart')}
              className="relative"
            >
              <ShoppingCart className="w-6 h-6 text-[#262626]" strokeWidth={1.5} />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#ED4956] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <div className={`flex items-center gap-2 bg-[#FAFAFA] rounded-xl px-3 py-2.5 border transition-all ${
              isSearchFocused ? 'border-[#262626]' : 'border-transparent'
            }`}>
              <Search className="w-4 h-4 text-[#8E8E8E]" strokeWidth={1.5} />
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
                  // Delay hiding to allow click on suggestions
                  setTimeout(() => setShowSearchResults(false), 200);
                }}
                placeholder="חיפוש מוצרים..."
                className="flex-1 bg-transparent text-[14px] text-[#262626] placeholder:text-[#8E8E8E] outline-none"
              />
              {searchQuery && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={clearSearch}
                  className="p-1"
                >
                  <X className="w-4 h-4 text-[#8E8E8E]" strokeWidth={1.5} />
                </motion.button>
              )}
            </div>
            
            {/* Search Dropdown - Show when focused and no query */}
            <AnimatePresence>
              {isSearchFocused && !searchQuery.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-[#DBDBDB] shadow-lg overflow-hidden z-50"
                >
                  {/* Quick Category Tags */}
                  <div className="px-3 py-3 border-b border-[#EFEFEF]">
                    <span className="text-[12px] font-semibold text-[#262626] mb-2 block">חיפוש מהיר</span>
                    <div className="flex flex-wrap gap-2">
                      {quickTags.map((tag, index) => (
                        <motion.button
                          key={tag.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.03 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleTagClick(tag)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium text-white transition-all hover:opacity-90"
                          style={{ backgroundColor: tag.color }}
                        >
                          <span>{tag.icon}</span>
                          <span>{tag.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Recent Searches */}
                  {searchHistory.length > 0 && (
                    <>
                      <div className="flex items-center justify-between px-3 py-2 border-b border-[#EFEFEF]">
                        <span className="text-[12px] font-semibold text-[#262626]">חיפושים אחרונים</span>
                        <button 
                          onClick={clearSearchHistory}
                          className="text-[11px] text-[#0095F6] font-medium"
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
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#FAFAFA] transition-colors text-right"
                        >
                          <Clock className="w-4 h-4 text-[#8E8E8E]" strokeWidth={1.5} />
                          <span className="flex-1 text-[13px] text-[#262626]">{query}</span>
                          <button
                            onClick={(e) => removeFromHistory(query, e)}
                            className="p-1 hover:bg-[#EFEFEF] rounded-full"
                          >
                            <X className="w-3.5 h-3.5 text-[#8E8E8E]" strokeWidth={1.5} />
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
                  className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-[#DBDBDB] shadow-lg overflow-hidden z-50"
                >
                  {searchSuggestions.map((product, index) => (
                    <motion.button
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSearchSelect(product)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-[#FAFAFA] transition-colors text-right"
                    >
                      <div className="w-10 h-10 bg-[#FAFAFA] rounded-lg overflow-hidden flex-shrink-0">
                        <OptimizedImage
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full"
                          objectFit="cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#262626] truncate">{product.name}</p>
                        <p className="text-[12px] text-[#8E8E8E]">₪{product.price}</p>
                      </div>
                      {product.originalPrice && (
                        <span className="bg-[#ED4956] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
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
                  className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-[#DBDBDB] shadow-lg p-4 text-center z-50"
                >
                  <Search className="w-8 h-8 text-[#DBDBDB] mx-auto mb-2" strokeWidth={1} />
                  <p className="text-[13px] text-[#8E8E8E]">לא נמצאו מוצרים עבור "{searchQuery}"</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Pet Type Filter */}
      <div className="bg-white border-b border-[#DBDBDB]">
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
                onClick={() => setSelectedPetType(type.id as any)}
                className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  selectedPetType === type.id
                    ? "bg-[#262626] text-white"
                    : "bg-[#FAFAFA] text-[#262626] border border-[#DBDBDB]"
                }`}
              >
                {type.icon} {type.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Categories Scroll */}
      <div className="bg-white border-b border-[#DBDBDB]">
        <div className="max-w-lg mx-auto">
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
            {categories.map((category) => (
              <motion.button
                key={category.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(category.label)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category.label
                    ? "bg-[#262626] text-white"
                    : "bg-[#FAFAFA] text-[#262626] border border-[#DBDBDB]"
                }`}
              >
                {category.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-[#DBDBDB]">
        <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium ${
                showFilters || sortBy !== "none" || showDealsOnly
                  ? "bg-[#262626] text-white"
                  : "bg-[#FAFAFA] text-[#262626] border border-[#DBDBDB]"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.5} />
              סינון
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDealsOnly(!showDealsOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium ${
                showDealsOnly
                  ? "bg-[#ED4956] text-white"
                  : "bg-[#FAFAFA] text-[#262626] border border-[#DBDBDB]"
              }`}
            >
              <Tag className="w-3.5 h-3.5" strokeWidth={1.5} />
              מבצעים
            </motion.button>
          </div>

          {/* Grid/Saved Toggle */}
          <div className="flex bg-[#FAFAFA] rounded-lg p-0.5 border border-[#DBDBDB]">
            <button
              onClick={() => setActiveTab("grid")}
              className={`p-1.5 rounded-md transition-all ${
                activeTab === "grid" ? "bg-white shadow-sm" : ""
              }`}
            >
              <Grid3X3 className={`w-4 h-4 ${activeTab === "grid" ? "text-[#262626]" : "text-[#8E8E8E]"}`} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`p-1.5 rounded-md transition-all ${
                activeTab === "saved" ? "bg-white shadow-sm" : ""
              }`}
            >
              <Bookmark className={`w-4 h-4 ${activeTab === "saved" ? "text-[#262626]" : "text-[#8E8E8E]"}`} strokeWidth={1.5} />
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
            className="overflow-hidden bg-white border-b border-[#DBDBDB]"
          >
            <div className="max-w-lg mx-auto px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-[#0095F6]" strokeWidth={1.5} />
                <span className="text-[12px] font-semibold text-[#262626]">מיון לפי</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "none", label: "ברירת מחדל" },
                  { id: "popularity", label: "פופולריות" },
                  { id: "price-low", label: "מחיר ↑" },
                  { id: "price-high", label: "מחיר ↓" },
                ].map((option) => (
                  <motion.button
                    key={option.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSortBy(option.id as any)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium ${
                      sortBy === option.id
                        ? "bg-[#262626] text-white"
                        : "bg-[#FAFAFA] text-[#262626] border border-[#DBDBDB]"
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
      <div className="bg-[#FAFAFA]">
        <div className="max-w-lg mx-auto px-4 py-2">
          <span className="text-[12px] text-[#8E8E8E]">
            {filteredAndSortedProducts.length} מוצרים
          </span>
        </div>
      </div>

      {/* Instagram-style Products Grid */}
      <div className="bg-white">
        <div className="max-w-lg mx-auto">
          <div className="grid grid-cols-3 gap-[1px] bg-[#DBDBDB]">
            {filteredAndSortedProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
                className="relative aspect-square bg-white cursor-pointer group"
                onClick={() => handleProductClick(product)}
              >
                <OptimizedImage
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full"
                  objectFit="cover"
                  sizes="(max-width: 768px) 33vw, 200px"
                />
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1 text-white text-[13px] font-semibold">
                    <Heart className="w-4 h-4 fill-white" />
                    {product.likes}
                  </div>
                </div>

                {/* Sale Badge */}
                {product.originalPrice && (
                  <div className="absolute top-2 right-2 bg-[#ED4956] text-white px-1.5 py-0.5 rounded text-[10px] font-semibold">
                    SALE
                  </div>
                )}

                {/* Price Tag */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-[13px] font-bold">₪{product.price}</span>
                    {product.originalPrice && (
                      <span className="text-white/70 text-[10px] line-through">₪{product.originalPrice}</span>
                    )}
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={(e) => toggleFavorite(product.id, e)}
                  className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Bookmark 
                    className={`w-5 h-5 ${favorites.includes(product.id) ? "fill-white text-white" : "text-white"}`} 
                    strokeWidth={1.5} 
                  />
                </button>
              </motion.div>
            ))}
          </div>

          {/* Empty State for Saved */}
          {activeTab === "saved" && filteredAndSortedProducts.length === 0 && (
            <div className="py-16 text-center">
              <Bookmark className="w-16 h-16 text-[#DBDBDB] mx-auto mb-4" strokeWidth={1} />
              <h3 className="text-[16px] font-semibold text-[#262626] mb-1">עדיין אין מוצרים שמורים</h3>
              <p className="text-[14px] text-[#8E8E8E]">שמור מוצרים שאהבת לצפייה מאוחרת</p>
            </div>
          )}
        </div>
      </div>

      {/* Product Details Sheet */}
      <Sheet open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <SheetContent side="bottom" className="h-auto max-h-[75vh] rounded-t-2xl bg-white p-0">
          {selectedProduct && (
            <div className="flex flex-col" dir="rtl">
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-[#DBDBDB] rounded-full" />
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 left-4 w-8 h-8 bg-[#FAFAFA] rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-[#262626]" strokeWidth={1.5} />
              </button>

              {/* Content */}
              <div className="px-4 pb-4 overflow-y-auto">
                {/* Product Image */}
                <div className="relative mb-4">
                  <div className="w-full aspect-square bg-[#FAFAFA] rounded-xl overflow-hidden">
                    <OptimizedImage
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-full h-full"
                      objectFit="cover"
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                  </div>
                  
                  {/* Save Button */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleFavorite(selectedProduct.id)}
                    className="absolute top-3 right-3 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-sm"
                  >
                    <Bookmark 
                      className={`w-5 h-5 ${favorites.includes(selectedProduct.id) ? "fill-[#262626] text-[#262626]" : "text-[#262626]"}`} 
                      strokeWidth={1.5} 
                    />
                  </motion.button>

                  {/* Sale Badge */}
                  {selectedProduct.originalPrice && (
                    <div className="absolute top-3 left-3 bg-[#ED4956] text-white px-2.5 py-1 rounded-lg text-[12px] font-semibold">
                      {Math.round((1 - selectedProduct.price / selectedProduct.originalPrice) * 100)}% הנחה
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="mb-4">
                  <h2 className="text-[18px] font-semibold text-[#262626] mb-2">
                    {selectedProduct.name}
                  </h2>
                  
                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className={`text-[24px] font-bold ${selectedProduct.originalPrice ? 'text-[#ED4956]' : 'text-[#262626]'}`}>
                      ₪{selectedProduct.price}
                    </span>
                    {selectedProduct.originalPrice && (
                      <span className="text-[14px] text-[#8E8E8E] line-through">
                        ₪{selectedProduct.originalPrice}
                      </span>
                    )}
                  </div>

                  {/* Likes */}
                  <div className="flex items-center gap-1 text-[#8E8E8E] text-[13px]">
                    <Heart className="w-4 h-4" strokeWidth={1.5} />
                    {selectedProduct.likes} לייקים
                  </div>
                </div>

                {/* Size Selector */}
                <div className="mb-4">
                  <label className="text-[13px] font-semibold text-[#262626] mb-2 block">בחר גודל</label>
                  <div className="flex gap-2">
                    {sizes.map((size) => (
                      <motion.button
                        key={size}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedSize(size)}
                        className={`w-12 h-10 rounded-lg text-[13px] font-medium transition-all ${
                          selectedSize === size
                            ? "bg-[#262626] text-white"
                            : "bg-[#FAFAFA] text-[#262626] border border-[#DBDBDB]"
                        }`}
                      >
                        {size}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div className="mb-4">
                  <label className="text-[13px] font-semibold text-[#262626] mb-2 block">כמות</label>
                  <div className="flex items-center gap-3 w-fit bg-[#FAFAFA] rounded-lg p-1 border border-[#DBDBDB]">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={decreaseQuantity}
                      className="w-8 h-8 rounded-md bg-white flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4 text-[#262626]" strokeWidth={1.5} />
                    </motion.button>
                    <span className="text-[16px] font-semibold text-[#262626] w-8 text-center">{quantity}</span>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={increaseQuantity}
                      className="w-8 h-8 rounded-md bg-white flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4 text-[#262626]" strokeWidth={1.5} />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Add to Cart Button */}
              <div className="border-t border-[#DBDBDB] px-4 py-3 bg-white">
                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleAddToCart}
                    className="w-full h-12 bg-[#0095F6] hover:bg-[#0086E0] text-white text-[15px] font-semibold rounded-xl"
                  >
                    הוסף לעגלה · ₪{(selectedProduct.price * quantity)}
                  </Button>
                </motion.div>
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
