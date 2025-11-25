import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import BottomNav from "@/components/BottomNav";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const Shop = () => {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("yellow");
  const [selectedCategory, setSelectedCategory] = useState("קופונים וכרטיסיות");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedPetType, setSelectedPetType] = useState<"dog" | "cat" | "puppy">("dog");
  const [showCategories, setShowCategories] = useState(false);

  const tabs = [
    { id: "yellow", label: "yellow" },
    { id: "tip-top", label: "טיפ טוב" },
    { id: "all-stories", label: "לכל הסיפורים" },
  ];

  const mainCategories = [
    { id: "coupons", label: "קופונים וכרטיסיות" },
    { id: "yellow-tuesday", label: "Yellow Tuesday" },
    { id: "on-the-go", label: "מבצעים על הדרך" },
    { id: "hot-deals", label: "מבצעים חמים" },
  ];

  // Product categories with dog/cat subcategories
  const productCategories = {
    dog: [
      { id: "puppy-food", label: "אוכל לגורי כלבים", icon: "🐕" },
      { id: "dry-food", label: "שקי מזדימים לכלב", icon: "🥘" },
      { id: "bones-chew", label: "עצמות ומוצרי לעיסה", icon: "🦴" },
      { id: "treats", label: "חטיפים לכלב", icon: "🍪" },
      { id: "medical-food", label: "אוכל רפואי לכלב", icon: "💊" },
      { id: "natural-food", label: "אוכל טבעי לכלב", icon: "🌿" },
      { id: "canned-food", label: "שימורים ומעדנים לכלב", icon: "🥫" },
      { id: "kibble", label: "מזון יבש לכלב", icon: "🍚" },
      { id: "carriers", label: "כלובי הסעה", icon: "🚗" },
      { id: "puppy-gates", label: "גדר גורים", icon: "🚧" },
      { id: "training-crate", label: "כלוב איילוף", icon: "🏠" },
      { id: "dog-houses", label: "חלונות לכלב", icon: "🏡" },
      { id: "leash-harness", label: "רצועות רתמות וקולרים לכלב", icon: "🦮" },
      { id: "toys", label: "צעצועים ומשחקים לכלב", icon: "🎾" },
      { id: "bowls", label: "כלי אוכל ושתייה לכלב", icon: "🥣" },
      { id: "beds", label: "מיטה / מזרון לכלב", icon: "🛏️" },
      { id: "accessories", label: "ציוד משלים לכלב", icon: "🎒" },
      { id: "grooming", label: "מוצרי טיפוח, היגיינה וודברה לכלב", icon: "🧴" },
      { id: "training", label: "איילוף לכלב", icon: "📚" },
      { id: "carriers-bag", label: "תיקי נשיאה לכלב", icon: "👜" },
    ],
    cat: [
      { id: "kitten-food", label: "אוכל לגורי חתולים", icon: "🐱" },
      { id: "dry-food", label: "שקי מזדימים לחתול", icon: "🥘" },
      { id: "treats", label: "חטיפים לחתול", icon: "🍪" },
      { id: "medical-food", label: "אוכל רפואי לחתול", icon: "💊" },
      { id: "natural-food", label: "אוכל טבעי לחתול", icon: "🌿" },
      { id: "canned-food", label: "שימורים ומעדנים לחתול", icon: "🥫" },
      { id: "kibble", label: "מזון יבש לחתול", icon: "🍚" },
      { id: "litter-boxes", label: "ארגזי חול", icon: "📦" },
      { id: "scratching-posts", label: "עמודי גירוד", icon: "🪵" },
      { id: "toys", label: "צעצועים ומשחקים לחתול", icon: "🧶" },
      { id: "bowls", label: "כלי אוכל ושתייה לחתול", icon: "🥣" },
      { id: "beds", label: "מיטה / מזרון לחתול", icon: "🛏️" },
      { id: "accessories", label: "ציוד משלים לחתול", icon: "🎒" },
      { id: "grooming", label: "מוצרי טיפוח והיגיינה לחתול", icon: "🧴" },
      { id: "carriers", label: "תיקי נשיאה לחתול", icon: "👜" },
      { id: "collars", label: "קולרים לחתול", icon: "🔗" },
    ],
    puppy: [
      { id: "carriers", label: "תיקי נשיאה לגורי כלבים", icon: "👜" },
      { id: "food", label: "מזון לגורים", icon: "🍼" },
      { id: "gates", label: "גדרות גורים", icon: "🚧" },
      { id: "training-crates", label: "כלובי איילוף", icon: "🏠" },
      { id: "pads", label: "פדים לגורים", icon: "🧻" },
      { id: "starter-kit", label: "חבילת גורים", icon: "📦" },
    ],
  };

  const offerCard = {
    badge: "הטבה באהבה",
    title: "10 ש״ח לצבירה בקנייה הבאה ב-yellow",
    subtitle: "מזמן לא התראינו נפגש ב-yellow?",
    validUntil: "בתוקף עד ה- 28.12.25",
  };

  const products = [
    {
      id: 1,
      name: "4 יח' סופגניות",
      description: "ריבה/ריקה",
      price: 15,
      image: "/placeholder.svg",
      terms: "עד נגמר המלאי | בתוקף עד ה- 28.12.25\nמחיר יחידה בודדת: 5 ש״ח. לא כולל סופגניות משודרגות. תקף בחנויות yellow, מוגבל לניצוס אחד ביום בתקופת המבצע. בכפוף לתקנון המועדון. מדיניות הפרסות ותנאי השימוש באפליקציה.",
    },
    {
      id: 2,
      name: "2 יח' משקה אנרגיה הל",
      description: "250 מ״ל",
      price: 10,
      image: "/placeholder.svg",
    },
    {
      id: 3,
      name: "2 יח' שוופס/תפוזינה",
      description: "שוופס Fun Water/פרי... 500 מ״ל",
      price: 10,
      image: "/placeholder.svg",
    },
    {
      id: 4,
      name: "2 יח' פריגב",
      description: "תפוזים/לימונענע/ תפו... 400 מ״ל",
      price: 16,
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
      <div className="bg-[#FFC107] pt-6 pb-8">
        <div className="max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-800 text-center mb-6">
            מבצעים וקופונים
          </h1>
          
          {/* Tabs */}
          <div className="flex justify-center gap-8 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`text-lg font-medium pb-2 transition-colors relative ${
                  selectedTab === tab.id
                    ? "text-gray-900"
                    : "text-gray-700"
                }`}
              >
                {tab.label}
                {selectedTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* White Content Area with Rounded Top */}
      <div className="bg-white rounded-t-[32px] -mt-4 relative z-10">
        <div className="max-w-md mx-auto px-4 pt-6">
          {/* Main Category Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            {mainCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.label);
                  setShowCategories(false);
                }}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category.label
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-700 border border-gray-300"
                }`}
              >
                {category.label}
              </button>
            ))}
            <button 
              onClick={() => setShowCategories(!showCategories)}
              className="px-6 py-2.5 rounded-full text-sm font-medium bg-white text-gray-700 border border-gray-300 flex items-center gap-1"
            >
              קטגוריות
              <span className="text-xs">{showCategories ? "▲" : "▼"}</span>
            </button>
          </div>

          {/* Product Categories Section */}
          {showCategories && (
            <div className="mb-8">
              {/* Pet Type Selector */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => setSelectedPetType("dog")}
                  className={`flex-1 py-3 rounded-xl text-base font-medium transition-all ${
                    selectedPetType === "dog"
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-700 border border-gray-300"
                  }`}
                >
                  🐕 כלבים
                </button>
                <button
                  onClick={() => setSelectedPetType("cat")}
                  className={`flex-1 py-3 rounded-xl text-base font-medium transition-all ${
                    selectedPetType === "cat"
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-700 border border-gray-300"
                  }`}
                >
                  🐱 חתולים
                </button>
                <button
                  onClick={() => setSelectedPetType("puppy")}
                  className={`flex-1 py-3 rounded-xl text-base font-medium transition-all ${
                    selectedPetType === "puppy"
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-700 border border-gray-300"
                  }`}
                >
                  🐶 גורים
                </button>
              </div>

              {/* Categories Grid */}
              <div className="grid grid-cols-2 gap-4">
                {productCategories[selectedPetType].map((category) => (
                  <button
                    key={category.id}
                    className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-lg transition-all hover:border-gray-400 text-right"
                  >
                    <div className="text-3xl mb-2">{category.icon}</div>
                    <div className="text-sm font-medium text-gray-900">
                      {category.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section Title */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
            {selectedCategory}
          </h2>

          {/* Offer Card */}
          {selectedCategory === "קופונים וכרטיסיות" && (
            <Card className="mb-6 overflow-hidden border-0 shadow-lg">
              <div className="relative p-6">
                {/* Badge */}
                <div className="absolute top-4 right-4 bg-[#FFC107] text-gray-900 px-3 py-1 rounded-full text-sm font-medium">
                  {offerCard.badge}
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Coin Illustration */}
                  <div className="relative flex-shrink-0">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center shadow-xl">
                      <span className="text-4xl font-bold text-white">
                        10₪
                      </span>
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-pink-400 rounded-full" />
                    <div className="absolute top-1/2 -right-4 w-3 h-3 bg-blue-400 rotate-45" />
                    <div className="absolute -bottom-2 right-8 w-3 h-3 bg-green-400 rotate-45" />
                    <div className="absolute bottom-4 -left-2 w-4 h-4 bg-orange-400" />
                  </div>
                  
                  {/* Text Content */}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {offerCard.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {offerCard.subtitle}
                    </p>
                    <p className="text-sm text-gray-500">
                      {offerCard.validUntil}
                    </p>
                  </div>
                </div>
                
                {/* Dotted Separator */}
                <div className="border-t border-dashed border-gray-300 my-4" />
                
                {/* Link */}
                <button className="text-blue-500 text-sm font-medium flex items-center gap-1">
                  <span>{"<"}</span>
                  לפרטים נוספים
                </button>
              </div>
            </Card>
          )}

          {/* Section Title for Products */}
          {selectedCategory === "מבצעים על הדרך" && (
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
              מבצעים על הדרך
            </h2>
          )}

          {/* Products Grid - 2 Columns */}
          <div className="grid grid-cols-2 gap-4 pb-8">
            {products.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden cursor-pointer hover:shadow-xl transition-all border-0 shadow-md"
                onClick={() => handleProductClick(product)}
              >
                {/* Product Image */}
                <div className="aspect-square bg-gray-50 flex items-center justify-center p-4">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                
                {/* Product Info */}
                <div className="p-4 text-center">
                  <h3 className="font-bold text-gray-900 mb-1 text-base">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {product.description}
                  </p>
                  
                  {/* Price */}
                  <div className="text-3xl font-bold text-[#E91E63]">
                    {product.price}₪
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Product Details Sheet */}
      <Sheet open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          {selectedProduct && (
            <div className="flex flex-col h-full" dir="rtl">
              {/* Yellow Logo */}
              <div className="flex justify-center pt-4 pb-6">
                <div className="bg-[#FFC107] px-6 py-2 rounded-lg">
                  <span className="text-2xl font-bold text-[#E91E63]">yellow</span>
                </div>
              </div>

              {/* Product Image */}
              <div className="flex justify-center py-6">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className="w-48 h-48 object-contain"
                />
              </div>

              {/* Dotted Separator */}
              <div className="border-t border-dashed border-gray-300 my-4" />

              {/* Product Details */}
              <div className="text-center flex-1">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {selectedProduct.name}
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  {selectedProduct.description}
                </p>

                {/* Price */}
                <div className="text-5xl font-bold text-[#E91E63] mb-8">
                  {selectedProduct.price}₪
                </div>

                {/* Terms */}
                {selectedProduct.terms && (
                  <div className="text-sm text-gray-500 leading-relaxed px-4">
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
