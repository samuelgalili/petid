import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import BottomNav from "@/components/BottomNav";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Shop = () => {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("petid");
  const [selectedCategory, setSelectedCategory] = useState("קופונים והטבות");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedPetType, setSelectedPetType] = useState<"dog" | "cat">("dog");
  const [showCategories, setShowCategories] = useState(false);

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
      image: "/placeholder.svg",
      terms: "עד נגמר המלאי | בתוקף עד ה- 31.12.25\nמחיר לק״ג: 12.60 ש״ח. מזון איכותי מתאים לכלבים בוגרים. תקף בכל סניפי Petid. מוגבל ל-2 יחידות לקונה. בכפוף לתקנון המועדון.",
    },
    {
      id: 2,
      name: "חטיפי עוף מיובשים",
      description: "500 גר׳",
      price: 45,
      originalPrice: null,
      image: "/placeholder.svg",
    },
    {
      id: 3,
      name: "מיטה אורתופדית",
      description: "גודל L - זיכרון צורה",
      price: 299,
      originalPrice: 399,
      image: "/placeholder.svg",
    },
    {
      id: 4,
      name: "צעצוע אינטראקטיבי",
      description: "משחק חכם",
      price: 129,
      originalPrice: null,
      image: "/placeholder.svg",
    },
    {
      id: 5,
      name: "שמפו טיפולי",
      description: "500 מ״ל",
      price: 59,
      originalPrice: 79,
      image: "/placeholder.svg",
    },
    {
      id: 6,
      name: "קערה אוטומטית",
      description: "עם מתקן מים",
      price: 169,
      originalPrice: null,
      image: "/placeholder.svg",
    },
  ];

  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
  };

  return (
    <div className="min-h-screen bg-white pb-20" dir="rtl">
      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      {/* Yellow Header Section */}
      <div className="bg-[#FFC107] pt-6 pb-8 shadow-md">
        <div className="max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-6 font-jakarta">
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

      {/* White Content Area with Rounded Top */}
      <div className="bg-white rounded-t-[32px] -mt-4 relative z-10 shadow-lg">
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
                    ? "bg-gray-900 text-white shadow-md"
                    : "bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400"
                }`}
              >
                {category.label}
              </motion.button>
            ))}
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCategories(!showCategories)}
              className="px-5 py-2.5 rounded-full text-sm font-medium bg-white text-gray-700 border-2 border-gray-300 flex items-center gap-2 hover:border-gray-400 transition-all font-jakarta"
            >
              קטגוריות
              {showCategories ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </motion.button>
          </div>

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

          {/* Products Grid - 2 Columns */}
          <div className="grid grid-cols-2 gap-4 pb-8">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
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
                      <div className="absolute top-2 right-2 bg-[#E91E63] text-white px-2 py-1 rounded-full text-xs font-bold shadow-md font-jakarta">
                        מבצע
                      </div>
                    )}
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-contain"
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
            ))}
          </div>
        </div>
      </div>

      {/* Product Details Sheet */}
      <Sheet open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl bg-white">
          {selectedProduct && (
            <div className="flex flex-col h-full overflow-y-auto" dir="rtl">
              {/* Petid Logo */}
              <div className="flex justify-center pt-6 pb-6 sticky top-0 bg-white z-10">
                <div className="bg-[#FFC107] px-8 py-2.5 rounded-xl shadow-lg">
                  <span className="text-2xl font-bold text-gray-900 font-jakarta">Petid</span>
                </div>
              </div>

              {/* Product Image */}
              <div className="flex justify-center py-6">
                <motion.img
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className="w-56 h-56 object-contain"
                />
              </div>

              {/* Dotted Separator */}
              <div className="border-t-2 border-dashed border-gray-300 my-4" />

              {/* Product Details */}
              <div className="text-center flex-1 px-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-3 font-jakarta">
                  {selectedProduct.name}
                </h2>
                <p className="text-lg text-gray-600 mb-6 font-jakarta">
                  {selectedProduct.description}
                </p>

                {/* Price */}
                <div className="flex items-center justify-center gap-3 mb-8">
                  <div className="text-5xl font-bold text-[#E91E63] font-jakarta">
                    {selectedProduct.price}₪
                  </div>
                  {selectedProduct.originalPrice && (
                    <div className="text-xl text-gray-400 line-through font-jakarta">
                      {selectedProduct.originalPrice}₪
                    </div>
                  )}
                </div>

                {/* Terms */}
                {selectedProduct.terms && (
                  <div className="text-sm text-gray-500 leading-relaxed bg-gray-50 p-4 rounded-2xl font-jakarta">
                    {selectedProduct.terms}
                  </div>
                )}
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
