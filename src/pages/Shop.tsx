import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ChevronDown, ChevronUp, ShoppingCart, Plus, Minus, SlidersHorizontal, TrendingUp, DollarSign, Tag, Info, Check, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VirtuosoGrid } from "react-virtuoso";
import petidLogo from "@/assets/petid-logo.png";
import confetti from "canvas-confetti";

const Shop = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("petid");
  const [selectedCategory, setSelectedCategory] = useState("קופונים והטבות");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedPetType, setSelectedPetType] = useState<"dog" | "cat">("dog");
  const [showCategories, setShowCategories] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"none" | "price-low" | "price-high" | "popularity">("none");
  const [showDealsOnly, setShowDealsOnly] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<number[]>(() => {
    const saved = localStorage.getItem("petid-favorites");
    return saved ? JSON.parse(saved) : [];
  });

  const toggleFavorite = useCallback((productId: number) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      localStorage.setItem("petid-favorites", JSON.stringify(newFavorites));
      return newFavorites;
    });
    
    const isFavorite = favorites.includes(productId);
    toast({
      title: isFavorite ? "הוסר מהמועדפים" : "❤️ נוסף למועדפים",
      description: isFavorite ? "המוצר הוסר מרשימת המועדפים" : "המוצר נשמר למועדפים שלך",
      duration: 2000,
    });
  }, [favorites, toast]);

  const sizes = ["S", "M", "L", "XL"];
  const colors = [
    { name: "שחור", value: "#1a1a1a" },
    { name: "לבן", value: "#ffffff" },
    { name: "כחול", value: "#3b82f6" },
    { name: "אדום", value: "#ef4444" },
  ];

  const tabs = [
    { id: "petid", label: "Petid" },
    { id: "top-deals", label: "מבצעי השבוע" },
    { id: "all-products", label: "כל המוצרים" },
  ];

  const mainCategories = [
    { id: "coupons", label: "קופונים והטבות" },
    { id: "tuesday-deals", label: "מבצעי יום ג'" },
    { id: "hot-deals", label: "מבצעים חמים" },
    { id: "new-arrivals", label: "חדש" },
  ];

  // Product categories with dog/cat subcategories
  const productCategories = {
    dog: [
      { id: "puppy-food", label: "אוכל לגורי כלבים", icon: "🐕" },
      { id: "dry-food", label: "שקי מזון לכלב", icon: "🥘" },
      { id: "bones-chew", label: "עצמות ומוצרי לעיסה", icon: "🦴" },
      { id: "treats", label: "חטיפים לכלב", icon: "🍖" },
      { id: "medical-food", label: "אוכל רפואי לכלב", icon: "💊" },
      { id: "natural-food", label: "אוכל טבעי לכלב", icon: "🌿" },
      { id: "canned-food", label: "שימורים ומעדנים לכלב", icon: "🥫" },
      { id: "kibble", label: "מזון יבש לכלב", icon: "🍚" },
      { id: "carriers", label: "כלובי הסעה", icon: "🚗" },
      { id: "puppy-gates", label: "גדר גורים", icon: "🚧" },
      { id: "training-crate", label: "כלוב אילוף", icon: "🏠" },
      { id: "dog-houses", label: "בתים לכלב", icon: "🏡" },
      { id: "leash-harness", label: "רצועות רתמות וקולרים", icon: "🦮" },
      { id: "toys", label: "צעצועים ומשחקים", icon: "🎾" },
      { id: "bowls", label: "כלי אוכל ושתייה", icon: "🥣" },
      { id: "beds", label: "מיטה / מזרון לכלב", icon: "🛏️" },
      { id: "accessories", label: "ציוד משלים", icon: "🎒" },
      { id: "grooming", label: "מוצרי טיפוח והיגיינה", icon: "🧴" },
      { id: "training", label: "אילוף לכלב", icon: "📚" },
      { id: "carriers-bag", label: "תיקי נשיאה", icon: "👜" },
    ],
    cat: [
      { id: "kitten-food", label: "אוכל לגורי חתולים", icon: "🐱" },
      { id: "dry-food", label: "שקי מזון לחתול", icon: "🥘" },
      { id: "treats", label: "חטיפים לחתול", icon: "🐟" },
      { id: "medical-food", label: "אוכל רפואי לחתול", icon: "💊" },
      { id: "natural-food", label: "אוכל טבעי לחתול", icon: "🌿" },
      { id: "canned-food", label: "שימורים ומעדנים", icon: "🥫" },
      { id: "kibble", label: "מזון יבש לחתול", icon: "🍚" },
      { id: "litter-boxes", label: "ארגזי חול", icon: "📦" },
      { id: "scratching-posts", label: "עמודי גירוד", icon: "🪵" },
      { id: "toys", label: "צעצועים ומשחקים", icon: "🧶" },
      { id: "bowls", label: "כלי אוכל ושתייה", icon: "🥣" },
      { id: "beds", label: "מיטה / מזרון", icon: "🛏️" },
      { id: "accessories", label: "ציוד משלים", icon: "🎒" },
      { id: "grooming", label: "מוצרי טיפוח והיגיינה", icon: "🧴" },
      { id: "carriers", label: "תיקי נשיאה", icon: "👜" },
      { id: "collars", label: "קולרים", icon: "🔗" },
    ],
  };

  const offerCard = {
    badge: "הטבה באהבה",
    title: "50 ש״ח הנחה על קנייה ראשונה",
    subtitle: "חדשים אצלנו? קבלו הטבה מיוחדת!",
    validUntil: "בתוקף עד ה- 31.12.25",
  };

  const products = [
    {
      id: 1,
      name: "מזון יבש פרימיום לכלבים",
      description: "15 ק״ג - מלא בשר",
      price: 189,
      originalPrice: 249,
      image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=500&h=500&fit=crop",
      terms: "עד נגמר המלאי | בתוקף עד ה- 31.12.25\nמחיר לק״ג: 12.60 ש״ח. מזון איכותי מתאים לכלבים בוגרים. תקף בכל סניפי Petid. מוגבל ל-2 יחידות לקונה. בכפוף לתקנון המועדון.",
      popularity: 95,
    },
    {
      id: 2,
      name: "חטיפי עוף מיובשים",
      description: "500 גר׳",
      price: 45,
      originalPrice: null,
      image: "https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=500&h=500&fit=crop",
      popularity: 78,
    },
    {
      id: 3,
      name: "מיטה אורתופדית",
      description: "גודל L - זיכרון צורה",
      price: 299,
      originalPrice: 399,
      image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&h=500&fit=crop",
      popularity: 88,
    },
    {
      id: 4,
      name: "צעצוע אינטראקטיבי",
      description: "משחק חכם",
      price: 129,
      originalPrice: null,
      image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=500&h=500&fit=crop",
      popularity: 65,
    },
    {
      id: 5,
      name: "שמפו טיפולי",
      description: "500 מ״ל",
      price: 59,
      originalPrice: 79,
      image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&h=500&fit=crop",
      popularity: 72,
    },
    {
      id: 6,
      name: "קערה אוטומטית",
      description: "עם מתקן מים",
      price: 169,
      originalPrice: null,
      image: "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=500&h=500&fit=crop",
      popularity: 81,
    },
  ];

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    // Filter by deals only
    if (showDealsOnly) {
      result = result.filter(p => p.originalPrice);
    }

    // Sort products
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
      default:
        break;
    }

    return result;
  }, [sortBy, showDealsOnly]);

  const handleProductClick = useCallback((product: any) => {
    setSelectedProduct(product);
    setQuantity(1);
    setSelectedSize(null);
    setSelectedColor(null);
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!selectedProduct) return;

    addToCart({
      id: `${selectedProduct.id}-${selectedSize || 'default'}-${selectedColor || 'default'}`,
      name: selectedProduct.name,
      price: selectedProduct.price,
      image: selectedProduct.image,
      quantity: quantity,
      size: selectedSize || undefined,
      variant: selectedColor ? colors.find(c => c.value === selectedColor)?.name : undefined,
    });

    // Play success sound
    const audio = new Audio('https://cdn.pixabay.com/audio/2022/03/24/audio_805cb46880.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {}); // Ignore errors if autoplay is blocked

    // Trigger confetti animation
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.8 },
      colors: ['#FFC107', '#FF9800', '#E91E63', '#4CAF50', '#2196F3'],
    });

    toast({
      title: "🎉 נוסף לעגלה",
      description: `${selectedProduct.name} (${quantity} יח') נוסף לעגלה שלך`,
      duration: 2000,
    });

    setSelectedProduct(null);
    setQuantity(1);
    setSelectedSize(null);
    setSelectedColor(null);
  }, [selectedProduct, quantity, addToCart, toast, selectedSize, selectedColor, colors]);

  const increaseQuantity = useCallback(() => setQuantity(prev => prev + 1), []);
  const decreaseQuantity = useCallback(() => setQuantity(prev => Math.max(1, prev - 1)), []);

  // Memoize active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (sortBy !== "none") count++;
    if (showDealsOnly) count++;
    return count;
  }, [sortBy, showDealsOnly]);

  return (
    <div className="min-h-screen bg-white pb-20" dir="rtl">
      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      {/* Instagram-style Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-[44px] flex items-center justify-center">
          <h1 
            className="text-[24px] font-semibold bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] bg-clip-text text-transparent"
            style={{ fontFamily: "'Billabong', cursive, -apple-system, BlinkMacSystemFont, sans-serif" }}
          >
            Petid Shop
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex justify-center gap-8 py-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`text-[13px] font-semibold pb-2 transition-all relative ${
                  selectedTab === tab.id
                    ? "text-[#262626]"
                    : "text-[#8E8E8E]"
                }`}
              >
                {tab.label}
                {selectedTab === tab.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#262626] rounded-full" 
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white">
        <div className="max-w-lg mx-auto px-4 pt-4">
          {/* Main Category Filters - Instagram style */}
          <div className="flex flex-wrap gap-2 mb-4">
            {mainCategories.map((category) => (
              <motion.button
                key={category.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedCategory(category.label);
                  setShowCategories(false);
                }}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                  selectedCategory === category.label
                    ? "bg-[#262626] text-white"
                    : "bg-white text-[#262626] border border-gray-300"
                }`}
              >
                {category.label}
              </motion.button>
            ))}
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCategories(!showCategories)}
              className="px-4 py-2 rounded-full text-[13px] font-medium bg-white text-[#262626] border border-gray-300 flex items-center gap-1.5"
            >
              קטגוריות
              {showCategories ? (
                <ChevronUp className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
              )}
            </motion.button>
            
            {/* Filter Button - Instagram blue */}
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-full text-[13px] font-medium flex items-center gap-1.5 transition-all ${
                showFilters || sortBy !== "none" || showDealsOnly
                  ? "bg-[#0095F6] text-white"
                  : "bg-white text-[#262626] border border-gray-300"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />
              סינון
              {(sortBy !== "none" || showDealsOnly) && (
                <span className="w-2 h-2 bg-white rounded-full" />
              )}
            </motion.button>
          </div>

          {/* Filter Options Panel - Instagram style */}
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden mb-4"
              >
                <div className="bg-[#FAFAFA] rounded-2xl p-4 border border-gray-200">
                  {/* Sort Options */}
                  <div className="mb-4">
                    <h3 className="text-[13px] font-semibold text-[#262626] mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#0095F6]" strokeWidth={1.5} />
                      מיון לפי
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSortBy("none")}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                          sortBy === "none"
                            ? "bg-[#262626] text-white"
                            : "bg-white text-[#262626] border border-gray-300"
                        }`}
                      >
                        ברירת מחדל
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSortBy("popularity")}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all flex items-center gap-1 ${
                          sortBy === "popularity"
                            ? "bg-[#262626] text-white"
                            : "bg-white text-[#262626] border border-gray-300"
                        }`}
                      >
                        <TrendingUp className="w-3 h-3" strokeWidth={1.5} />
                        פופולריים
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSortBy("price-low")}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all flex items-center gap-1 ${
                          sortBy === "price-low"
                            ? "bg-[#262626] text-white"
                            : "bg-white text-[#262626] border border-gray-300"
                        }`}
                      >
                        <DollarSign className="w-3 h-3" strokeWidth={1.5} />
                        מחיר נמוך
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSortBy("price-high")}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all flex items-center gap-1 ${
                          sortBy === "price-high"
                            ? "bg-[#262626] text-white"
                            : "bg-white text-[#262626] border border-gray-300"
                        }`}
                      >
                        <DollarSign className="w-3 h-3" strokeWidth={1.5} />
                        מחיר גבוה
                      </motion.button>
                    </div>
                  </div>

                  {/* Deals Only Toggle - Instagram red */}
                  <div className="border-t border-gray-200 pt-3">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowDealsOnly(!showDealsOnly)}
                      className={`w-full px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-between ${
                        showDealsOnly
                          ? "bg-[#ED4956] text-white"
                          : "bg-white text-[#262626] border border-gray-300"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Tag className="w-4 h-4" strokeWidth={1.5} />
                        הצג מבצעים בלבד
                      </span>
                      <div className={`w-10 h-5 rounded-full transition-all ${
                        showDealsOnly ? "bg-white/30" : "bg-gray-200"
                      }`}>
                        <motion.div 
                          animate={{ x: showDealsOnly ? 20 : 2 }}
                          className={`w-4 h-4 rounded-full mt-0.5 ${
                            showDealsOnly ? "bg-white" : "bg-gray-400"
                          }`}
                        />
                      </div>
                    </motion.button>
                  </div>

                  {/* Active Filters Count */}
                  {(sortBy !== "none" || showDealsOnly) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 text-[11px] text-[#8E8E8E] text-center"
                    >
                      {[sortBy !== "none" && "מיון פעיל", showDealsOnly && "מבצעים בלבד"]
                        .filter(Boolean)
                        .join(" • ")}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Product Categories Section - Instagram style */}
          <AnimatePresence>
            {showCategories && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden mb-4"
              >
                <div className="bg-[#FAFAFA] rounded-2xl p-4">
                  {/* Pet Type Selector - Instagram gradient active */}
                  <div className="flex gap-3 mb-4">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedPetType("dog")}
                      className={`flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-all ${
                        selectedPetType === "dog"
                          ? "bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white"
                          : "bg-white text-[#262626] border border-gray-300"
                      }`}
                    >
                      🐕 כלבים
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedPetType("cat")}
                      className={`flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-all ${
                        selectedPetType === "cat"
                          ? "bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white"
                          : "bg-white text-[#262626] border border-gray-300"
                      }`}
                    >
                      🐱 חתולים
                    </motion.button>
                  </div>

                  {/* Categories Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {productCategories[selectedPetType].map((category) => (
                      <motion.button
                        key={category.id}
                        whileTap={{ scale: 0.98 }}
                        className="bg-white border border-gray-200 rounded-xl p-3 active:bg-gray-50 transition-all text-center"
                      >
                        <div className="text-xl mb-1">{category.icon}</div>
                        <div className="text-[10px] font-medium text-[#262626] leading-tight">
                          {category.label}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Section Title */}
          <h2 className="text-[16px] font-semibold text-[#262626] text-center mb-4">
            {selectedCategory}
          </h2>

          {/* Offer Card - Instagram style */}
          {selectedCategory === "קופונים והטבות" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="mb-4 overflow-hidden border border-gray-200 shadow-sm">
                <div className="relative p-4 bg-white">
                  {/* Badge with Instagram gradient */}
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white px-3 py-1 rounded-full text-[11px] font-semibold">
                    {offerCard.badge}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Coin Illustration */}
                    <div className="relative flex-shrink-0">
                      <motion.div 
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="w-24 h-24 rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center shadow-lg"
                      >
                        <span className="text-2xl font-bold text-white">
                          50₪
                        </span>
                      </motion.div>
                      {/* Decorative Elements - Instagram colors */}
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-[#DD2A7B] rounded-full" 
                      />
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute top-1/2 -right-3 w-3 h-3 bg-[#0095F6] rotate-45" 
                      />
                      <motion.div 
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                        className="absolute -bottom-1 right-6 w-3 h-3 bg-[#8134AF] rotate-45" 
                      />
                    </div>
                    
                    {/* Text Content */}
                    <div className="flex-1">
                      <h3 className="text-[15px] font-semibold text-[#262626] mb-1">
                        {offerCard.title}
                      </h3>
                      <p className="text-[12px] text-[#8E8E8E] mb-1">
                        {offerCard.subtitle}
                      </p>
                      <p className="text-[11px] text-[#8E8E8E]">
                        {offerCard.validUntil}
                      </p>
                    </div>
                  </div>
                  
                  {/* Dotted Separator */}
                  <div className="border-t border-dashed border-gray-200 my-3" />
                  
                  {/* Link - Instagram blue */}
                  <motion.button 
                    whileHover={{ x: -5 }}
                    className="text-[#0095F6] text-[13px] font-semibold flex items-center gap-1"
                  >
                    <span>{"<"}</span>
                    לפרטים נוספים
                  </motion.button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Products Grid - Instagram style */}
          <div className="pb-8">
            <VirtuosoGrid
              style={{ height: '600px' }}
              totalCount={filteredAndSortedProducts.length}
              overscan={4}
              listClassName="grid grid-cols-2 gap-3"
              itemContent={(index) => {
                const product = filteredAndSortedProducts[index];
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card
                      className="overflow-hidden cursor-pointer active:opacity-70 transition-all border border-gray-200"
                      onClick={() => handleProductClick(product)}
                    >
                      {/* Product Image */}
                      <div className="aspect-square bg-[#FAFAFA] flex items-center justify-center p-3 relative">
                        {product.originalPrice && (
                          <div className="absolute top-2 right-2 bg-[#ED4956] text-white px-2 py-0.5 rounded-full text-[10px] font-semibold z-10">
                            מבצע
                          </div>
                        )}
                        <OptimizedImage
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full"
                          objectFit="contain"
                          sizes="(max-width: 768px) 50vw, 300px"
                        />
                      </div>
                      
                      {/* Product Info */}
                      <div className="p-3 text-center bg-white">
                        <h3 className="font-semibold text-[#262626] mb-0.5 text-[13px] leading-tight">
                          {product.name}
                        </h3>
                        <p className="text-[11px] text-[#8E8E8E] mb-2">
                          {product.description}
                        </p>
                        
                        {/* Price - Instagram red for deals */}
                        <div className="flex items-center justify-center gap-2">
                          <div className={`text-lg font-bold ${product.originalPrice ? 'text-[#ED4956]' : 'text-[#262626]'}`}>
                            {product.price}₪
                          </div>
                          {product.originalPrice && (
                            <div className="text-[12px] text-[#8E8E8E] line-through">
                              {product.originalPrice}₪
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              }}
            />
          </div>
        </div>
      </div>

      {/* Product Details Sheet */}
      {/* Product Details Sheet - Compact Layout */}
      <Sheet open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-3xl bg-white p-0">
          {selectedProduct && (
            <div className="flex flex-col" dir="rtl">
              {/* Drag Handle */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Content - Single scrollable area */}
              <div className="px-4 pb-4 overflow-y-auto max-h-[calc(70vh-80px)]">
                {/* Large Product Image */}
                <div className="relative mb-4">
                  {selectedProduct.originalPrice && (
                    <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full text-sm font-bold font-jakarta shadow-lg">
                      {Math.round((1 - selectedProduct.price / selectedProduct.originalPrice) * 100)}%-
                    </div>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleFavorite(selectedProduct.id)}
                    className={`absolute top-3 left-3 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                      favorites.includes(selectedProduct.id)
                        ? "bg-white text-red-500"
                        : "bg-white/90 text-gray-500"
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${favorites.includes(selectedProduct.id) ? "fill-current" : ""}`} strokeWidth={1.5} />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setSelectedProduct(null);
                      navigate(`/product/${selectedProduct.id}`);
                    }}
                    className="absolute top-3 left-14 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-white/90 text-gray-600 hover:bg-white hover:text-[#FFC107] transition-colors"
                  >
                    <Info className="w-5 h-5" strokeWidth={1.5} />
                  </motion.button>
                  <div className="w-full h-52 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden">
                    <OptimizedImage
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-full h-full"
                      objectFit="contain"
                      sizes="(max-width: 768px) 100vw, 400px"
                      priority
                    />
                  </div>
                </div>

                {/* Product Info */}
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-900 font-jakarta leading-tight mb-1">
                    {selectedProduct.name}
                  </h2>
                  <p className="text-sm text-gray-500 font-jakarta mb-3">{selectedProduct.description}</p>
                  
                  {/* Price */}
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="text-3xl font-black text-[#E91E63] font-jakarta">₪{selectedProduct.price}</span>
                    {selectedProduct.originalPrice && (
                      <span className="text-base text-gray-400 line-through font-jakarta">₪{selectedProduct.originalPrice}</span>
                    )}
                  </div>

                  {/* Quick Info */}
                  <div className="flex gap-2">
                    <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold font-jakarta">במלאי</span>
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold font-jakarta">משלוח חינם</span>
                  </div>
                </div>

                {/* Compact Variant Selectors - Horizontal */}
                <div className="flex gap-4 mb-3">
                  {/* Size */}
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-600 mb-1.5 block font-jakarta">גודל</label>
                    <div className="flex gap-1.5">
                      {sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`w-9 h-9 rounded-lg text-xs font-bold transition-all font-jakarta ${
                            selectedSize === size
                              ? "bg-[#FFC107] text-gray-900"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1.5 block font-jakarta">צבע</label>
                    <div className="flex gap-1.5">
                      {colors.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setSelectedColor(color.value)}
                          className={`w-9 h-9 rounded-full border-2 ${
                            selectedColor === color.value
                              ? "ring-2 ring-[#FFC107] ring-offset-1 border-[#FFC107]"
                              : "border-gray-200"
                          }`}
                          style={{ backgroundColor: color.value }}
                        >
                          {selectedColor === color.value && (
                            <Check className={`w-4 h-4 mx-auto ${color.value === '#ffffff' ? 'text-gray-900' : 'text-white'}`} strokeWidth={2.5} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Terms - Collapsed */}
                {selectedProduct.terms && (
                  <p className="text-xs text-gray-400 mb-3 font-jakarta line-clamp-2">{selectedProduct.terms}</p>
                )}
              </div>

              {/* Bottom Action Bar - Quantity + Add to Cart in one row */}
              <div className="border-t border-gray-100 px-4 py-3 bg-white">
                <div className="flex items-center gap-3">
                  {/* Compact Quantity Selector */}
                  <div className="flex items-center gap-2 bg-gray-100 rounded-full px-1 py-1">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={decreaseQuantity}
                      className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4 text-gray-600" strokeWidth={2} />
                    </motion.button>
                    <span className="text-lg font-bold text-gray-900 w-8 text-center font-jakarta">{quantity}</span>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={increaseQuantity}
                      className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4 text-gray-600" strokeWidth={2} />
                    </motion.button>
                  </div>

                  {/* Add to Cart Button */}
                  <motion.div className="flex-1" whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={handleAddToCart}
                      className="w-full h-12 bg-[#FFC107] hover:bg-[#FFB300] text-gray-900 text-base font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 font-jakarta"
                    >
                      <ShoppingCart className="w-5 h-5" strokeWidth={2} />
                      הוסף לעגלה - ₪{(selectedProduct.price * quantity).toFixed(0)}
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
