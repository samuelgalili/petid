import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ChevronDown, ChevronUp, ShoppingCart, Plus, Minus, SlidersHorizontal, TrendingUp, DollarSign, Tag, Info, Check } from "lucide-react";
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
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!selectedProduct) return;

    addToCart({
      id: selectedProduct.id.toString(),
      name: selectedProduct.name,
      price: selectedProduct.price,
      image: selectedProduct.image,
      quantity: quantity,
    });

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
  }, [selectedProduct, quantity, addToCart, toast]);

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
      
      {/* Header Section */}
      <div className="bg-white pt-6 pb-6 border-b border-border">
        <div className="max-w-md mx-auto px-4">
          <h1 className="text-2xl font-semibold text-foreground text-center mb-6 font-jakarta">
            מבצעים והטבות
          </h1>
          
          {/* Tabs */}
          <div className="flex justify-center gap-8 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`text-base font-medium pb-2 transition-all relative font-jakarta ${
                  selectedTab === tab.id
                    ? "text-gray-900"
                    : "text-gray-700"
                }`}
              >
                {tab.label}
                {selectedTab === tab.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-gray-900 rounded-full" 
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white">
        <div className="max-w-md mx-auto px-4 pt-6">
          {/* Main Category Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            {mainCategories.map((category) => (
              <motion.button
                key={category.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedCategory(category.label);
                  setShowCategories(false);
                }}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all font-jakarta ${
                  selectedCategory === category.label
                  ? "bg-foreground text-background"
                    : "bg-white text-foreground border border-border hover:bg-muted/50"
                }`}
              >
                {category.label}
              </motion.button>
            ))}
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCategories(!showCategories)}
              className="px-5 py-2.5 rounded-full text-sm font-medium bg-background text-foreground border-2 border-border flex items-center gap-2 hover:border-border-light transition-all font-jakarta"
            >
              קטגוריות
              {showCategories ? (
                <ChevronUp className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
              )}
            </motion.button>
            
            {/* Filter Button */}
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all font-jakarta ${
                showFilters || sortBy !== "none" || showDealsOnly
                  ? "bg-accent text-foreground shadow-md"
                  : "bg-background text-foreground border-2 border-border hover:border-border-light"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />
              סינון
              {(sortBy !== "none" || showDealsOnly) && (
                <span className="w-2 h-2 bg-error rounded-full" />
              )}
            </motion.button>
          </div>

          {/* Filter Options Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden mb-6"
              >
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border-2 border-gray-200 shadow-lg">
                  {/* Sort Options */}
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 font-jakarta">
                      <TrendingUp className="w-4 h-4 text-accent" strokeWidth={1.5} />
                      מיון לפי
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSortBy("none")}
                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-all font-jakarta ${
                          sortBy === "none"
                            ? "bg-foreground text-background shadow-md"
                            : "bg-background text-foreground border border-border"
                        }`}
                      >
                        ברירת מחדל
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSortBy("popularity")}
                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-all font-jakarta flex items-center gap-1 ${
                          sortBy === "popularity"
                            ? "bg-foreground text-background shadow-md"
                            : "bg-background text-foreground border border-border"
                        }`}
                      >
                        <TrendingUp className="w-3 h-3" strokeWidth={1.5} />
                        פופולריים
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSortBy("price-low")}
                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-all font-jakarta flex items-center gap-1 ${
                          sortBy === "price-low"
                            ? "bg-foreground text-background shadow-md"
                            : "bg-background text-foreground border border-border"
                        }`}
                      >
                        <DollarSign className="w-3 h-3" strokeWidth={1.5} />
                        מחיר נמוך
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSortBy("price-high")}
                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-all font-jakarta flex items-center gap-1 ${
                          sortBy === "price-high"
                            ? "bg-foreground text-background shadow-md"
                            : "bg-background text-foreground border border-border"
                        }`}
                      >
                        <DollarSign className="w-3 h-3" strokeWidth={1.5} />
                        מחיר גבוה
                      </motion.button>
                    </div>
                  </div>

                  {/* Deals Only Toggle */}
                  <div className="border-t border-gray-200 pt-4">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowDealsOnly(!showDealsOnly)}
                      className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition-all font-jakarta flex items-center justify-between ${
                        showDealsOnly
                          ? "bg-error text-error-foreground shadow-lg"
                          : "bg-background text-foreground border-2 border-border"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Tag className="w-4 h-4" strokeWidth={1.5} />
                        הצג מבצעים בלבד
                      </span>
                      <div className={`w-12 h-6 rounded-full transition-all ${
                        showDealsOnly ? "bg-background" : "bg-muted"
                      }`}>
                        <motion.div 
                          animate={{ x: showDealsOnly ? 24 : 2 }}
                          className={`w-5 h-5 rounded-full mt-0.5 ${
                            showDealsOnly ? "bg-error" : "bg-background"
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
                      className="mt-4 text-xs text-gray-600 text-center font-jakarta"
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

          {/* Product Categories Section with Animation */}
          <AnimatePresence>
            {showCategories && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden mb-8"
              >
                <div className="bg-gray-50 rounded-2xl p-4">
                  {/* Pet Type Selector */}
                  <div className="flex gap-3 mb-6">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedPetType("dog")}
                      className={`flex-1 py-3 rounded-xl text-base font-medium transition-all font-jakarta ${
                        selectedPetType === "dog"
                          ? "bg-gray-900 text-white shadow-lg"
                          : "bg-white text-gray-700 border-2 border-gray-300"
                      }`}
                    >
                      🐕 כלבים
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedPetType("cat")}
                      className={`flex-1 py-3 rounded-xl text-base font-medium transition-all font-jakarta ${
                        selectedPetType === "cat"
                          ? "bg-gray-900 text-white shadow-lg"
                          : "bg-white text-gray-700 border-2 border-gray-300"
                      }`}
                    >
                      🐱 חתולים
                    </motion.button>
                  </div>

                  {/* Categories Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {productCategories[selectedPetType].map((category) => (
                      <motion.button
                        key={category.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="bg-white border-2 border-gray-200 rounded-2xl p-4 hover:shadow-lg transition-all hover:border-gray-400 text-right"
                      >
                        <div className="text-2xl mb-2">{category.icon}</div>
                        <div className="text-xs font-medium text-gray-900 font-jakarta leading-tight">
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
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6 font-jakarta">
            {selectedCategory}
          </h2>

          {/* Offer Card */}
          {selectedCategory === "קופונים והטבות" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="mb-6 overflow-hidden border-0 shadow-xl">
                <div className="relative p-6 bg-gradient-to-br from-white to-gray-50">
                  {/* Badge */}
                  <div className="absolute top-4 right-4 bg-[#FFC107] text-gray-900 px-4 py-1.5 rounded-full text-xs font-bold shadow-md font-jakarta">
                    {offerCard.badge}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Coin Illustration */}
                    <div className="relative flex-shrink-0">
                      <motion.div 
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="w-32 h-32 rounded-full bg-gradient-to-br from-[#FFD700] via-[#FFC107] to-[#FFA500] flex items-center justify-center shadow-2xl"
                      >
                        <span className="text-3xl font-bold text-white drop-shadow-lg font-jakarta">
                          50₪
                        </span>
                      </motion.div>
                      {/* Decorative Elements */}
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-pink-400 rounded-full shadow-lg" 
                      />
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute top-1/2 -right-4 w-4 h-4 bg-blue-400 rotate-45 shadow-lg" 
                      />
                      <motion.div 
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                        className="absolute -bottom-2 right-8 w-4 h-4 bg-green-400 rotate-45 shadow-lg" 
                      />
                      <motion.div 
                        animate={{ y: [-2, 2, -2] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute bottom-4 -left-2 w-5 h-5 bg-orange-400 shadow-lg" 
                      />
                    </div>
                    
                    {/* Text Content */}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 font-jakarta">
                        {offerCard.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2 font-jakarta">
                        {offerCard.subtitle}
                      </p>
                      <p className="text-sm text-gray-500 font-jakarta">
                        {offerCard.validUntil}
                      </p>
                    </div>
                  </div>
                  
                  {/* Dotted Separator */}
                  <div className="border-t-2 border-dashed border-gray-300 my-4" />
                  
                  {/* Link */}
                  <motion.button 
                    whileHover={{ x: -5 }}
                    className="text-blue-600 text-sm font-bold flex items-center gap-2 hover:text-blue-700 transition-colors font-jakarta"
                  >
                    <span>{"<"}</span>
                    לפרטים נוספים
                  </motion.button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Products Grid - 2 Columns with Virtual Scrolling */}
          <div className="pb-8">
            <VirtuosoGrid
              style={{ height: '600px' }}
              totalCount={filteredAndSortedProducts.length}
              overscan={4}
              listClassName="grid grid-cols-2 gap-4"
              itemContent={(index) => {
                const product = filteredAndSortedProducts[index];
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card
                      className="overflow-hidden cursor-pointer hover:shadow-2xl transition-all border-0 shadow-md"
                      onClick={() => handleProductClick(product)}
                    >
                      {/* Product Image */}
                      <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 relative">
                        {product.originalPrice && (
                          <div className="absolute top-2 right-2 bg-[#E91E63] text-white px-2 py-1 rounded-full text-xs font-bold shadow-md font-jakarta z-10">
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
                      <div className="p-4 text-center bg-white">
                        <h3 className="font-bold text-gray-900 mb-1 text-sm leading-tight font-jakarta">
                          {product.name}
                        </h3>
                        <p className="text-xs text-gray-600 mb-3 font-jakarta">
                          {product.description}
                        </p>
                        
                        {/* Price */}
                        <div className="flex items-center justify-center gap-2">
                          <div className="text-2xl font-bold text-[#E91E63] font-jakarta">
                            {product.price}₪
                          </div>
                          {product.originalPrice && (
                            <div className="text-sm text-gray-400 line-through font-jakarta">
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
      <Sheet open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl bg-white p-0">
          {selectedProduct && (
            <div className="flex flex-col h-full" dir="rtl">
              <div className="flex-1 overflow-y-auto pb-36">
                {/* Header with Logo */}
                <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
                  {/* Drag Handle */}
                  <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                  </div>
                  
                  {/* Logo + Info Button Row */}
                  <div className="flex items-center justify-between px-4 pb-4">
                    <div className="w-10" />
                    <img 
                      src={petidLogo} 
                      alt="Petid" 
                      className="h-10 object-contain"
                    />
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setSelectedProduct(null);
                        navigate(`/product/${selectedProduct.id}`);
                      }}
                      className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                      aria-label="פרטי מוצר מלאים"
                    >
                      <Info className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
                    </motion.button>
                  </div>
                </div>

                {/* Product Image with Sale Badge */}
                <div className="relative flex justify-center py-6 px-4">
                  {selectedProduct.originalPrice && (
                    <motion.div 
                      initial={{ scale: 0, rotate: -12 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute top-4 right-6 z-10"
                    >
                      <div className="bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg font-jakarta">
                        {Math.round((1 - selectedProduct.price / selectedProduct.originalPrice) * 100)}% הנחה
                      </div>
                    </motion.div>
                  )}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="w-52 h-52 bg-gradient-to-b from-gray-50 to-white rounded-3xl p-4 shadow-sm"
                  >
                    <OptimizedImage
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-full h-full rounded-2xl"
                      objectFit="contain"
                      sizes="208px"
                      priority
                    />
                  </motion.div>
                </div>

                {/* Product Details */}
                <div className="text-center px-6">
                  <motion.h2 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-bold text-gray-900 mb-2 font-jakarta"
                  >
                    {selectedProduct.name}
                  </motion.h2>
                  <p className="text-base text-gray-500 mb-5 font-jakarta">
                    {selectedProduct.description}
                  </p>

                  {/* Price Section */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center justify-center gap-3 mb-6"
                  >
                    <div className="text-4xl font-black text-[#E91E63] font-jakarta">
                      ₪{selectedProduct.price}
                    </div>
                    {selectedProduct.originalPrice && (
                      <div className="flex flex-col items-start">
                        <div className="text-lg text-gray-400 line-through font-jakarta">
                          ₪{selectedProduct.originalPrice}
                        </div>
                        <div className="text-xs text-green-600 font-medium font-jakarta">
                          חסכת ₪{selectedProduct.originalPrice - selectedProduct.price}
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {/* Quick Info Pills */}
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-medium font-jakarta">
                      <Check className="w-3.5 h-3.5" strokeWidth={2} />
                      במלאי
                    </div>
                    <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium font-jakarta">
                      <ShoppingCart className="w-3.5 h-3.5" strokeWidth={2} />
                      משלוח חינם מעל ₪199
                    </div>
                  </div>

                  {/* Terms */}
                  {selectedProduct.terms && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-xs text-gray-500 leading-relaxed bg-gray-50 p-4 rounded-2xl font-jakarta text-right"
                    >
                      {selectedProduct.terms}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Fixed Bottom Section with Quantity and Add to Cart */}
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 p-4 shadow-2xl z-50">
                <div className="max-w-md mx-auto">
                  {/* Quantity Selector */}
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <span className="text-base font-medium text-gray-700 font-jakarta">כמות:</span>
                    <div className="flex items-center gap-3 bg-gray-100 rounded-full px-2 py-1">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={decreaseQuantity}
                        className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
                      >
                        <Minus className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                      </motion.button>
                      <span className="text-2xl font-bold text-gray-900 w-12 text-center font-jakarta">
                        {quantity}
                      </span>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={increaseQuantity}
                        className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
                      >
                        <Plus className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={handleAddToCart}
                      className="w-full h-14 bg-[#FFC107] hover:bg-[#FFB300] text-gray-900 text-lg font-bold rounded-2xl shadow-xl flex items-center justify-center gap-3 font-jakarta"
                    >
                      <ShoppingCart className="w-6 h-6" strokeWidth={1.5} />
                      הוסף לעגלה - {(selectedProduct.price * quantity).toFixed(0)}₪
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
