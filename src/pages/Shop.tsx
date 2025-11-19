import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Heart, Search, Menu, Star, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import PetSelector from "@/components/PetSelector";

const Shop = () => {
  const navigate = useNavigate();
  const { petType } = usePetPreference();
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");

  const translations = {
    he: {
      title: "חנות חיות",
      search: "אני רוצה לקנות...",
      categories: "קטגוריות",
      featured: "מוצרים מומלצים",
      reviews: "ביקורות",
      selectPet: "בחר את חיית המחמד שלך",
    },
    en: {
      title: "Pet Store",
      search: "I want to buy...",
      categories: "Categories",
      featured: "Featured Products",
      reviews: "reviews",
      selectPet: "Select your pet",
    },
    ar: {
      title: "متجر الحيوانات الأليفة",
      search: "أريد أن أشتري...",
      categories: "الفئات",
      featured: "المنتجات المميزة",
      reviews: "تقييم",
      selectPet: "اختر حيوانك الأليف",
    },
  };

  const t = translations[language];
  const isRTL = language === "he" || language === "ar";

  const categories = {
    dog: [
      {
        title: "מזון כלבים",
        description: "מזון יבש ורטוב",
        image: "https://images.unsplash.com/photo-1591768793355-74d04bb6608f?w=600&h=400&fit=crop",
      },
      {
        title: "צעצועים",
        description: "משחקים ובידור",
        image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&h=400&fit=crop",
      },
      {
        title: "אביזרים",
        description: "רצועות וקולרים",
        image: "https://images.unsplash.com/photo-1609557927087-f9cf8e88de18?w=600&h=400&fit=crop",
      },
    ],
    cat: [
      {
        title: "מזון חתולים",
        description: "מזון יבש ורטוב",
        image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&h=400&fit=crop",
      },
      {
        title: "ארגזי חול",
        description: "חול וארגזים",
        image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&h=600&fit=crop",
      },
      {
        title: "משחקים",
        description: "צעצועים מרתקים",
        image: "https://images.unsplash.com/photo-1603227137113-d9d0c1da2f0a?w=600&h=400&fit=crop",
      },
    ],
  };

  const products = {
    dog: [
      {
        id: 1,
        name: "מזון יבש פרימיום",
        price: 189.90,
        originalPrice: 229.90,
        rating: 4.8,
        reviews: 342,
        image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&h=400&fit=crop",
        badge: "מבצע",
        category: "dog",
      },
      {
        id: 2,
        name: "צעצוע גומי חזק",
        price: 49.90,
        originalPrice: null,
        rating: 4.6,
        reviews: 128,
        image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=400&fit=crop",
        badge: null,
        category: "dog",
      },
      {
        id: 3,
        name: "רצועה נשלפת 5 מטר",
        price: 129.90,
        originalPrice: 159.90,
        rating: 4.9,
        reviews: 267,
        image: "https://images.unsplash.com/photo-1609557927087-f9cf8e88de18?w=400&h=400&fit=crop",
        badge: "פופולרי",
        category: "dog",
      },
      {
        id: 4,
        name: "מיטה אורתופדית",
        price: 299.90,
        originalPrice: 399.90,
        rating: 4.9,
        reviews: 189,
        image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=400&fit=crop",
        badge: "מבצע",
        category: "dog",
      },
      {
        id: 5,
        name: "קערת נירוסטה כפולה",
        price: 89.90,
        originalPrice: null,
        rating: 4.7,
        reviews: 234,
        image: "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=400&h=400&fit=crop",
        badge: null,
        category: "dog",
      },
      {
        id: 6,
        name: "משאבת מים אוטומטית",
        price: 149.90,
        originalPrice: 199.90,
        rating: 4.8,
        reviews: 156,
        image: "https://images.unsplash.com/photo-1591103833648-847d8c02d1ba?w=400&h=400&fit=crop",
        badge: "חדש",
        category: "dog",
      },
    ],
    cat: [
      {
        id: 7,
        name: "מזון פרימיום לחתולים",
        price: 169.90,
        originalPrice: 209.90,
        rating: 4.9,
        reviews: 428,
        image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&h=400&fit=crop",
        badge: "מבצע",
        category: "cat",
      },
      {
        id: 8,
        name: "דאודורנט מבושם לארגז החול",
        price: 69,
        originalPrice: 89,
        rating: 4.8,
        reviews: 234,
        image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=400&fit=crop",
        badge: "הנמכר ביותר",
        category: "cat",
        description: "דאודורנט איכותי במיוחד לארגז החול של החתול שלך. מנטרל ריחות לא נעימים ומשאיר ניחוח אוקיאנוס רענן למשך זמן ממושך.",
        features: [
          "450 גרם - מספיק ל-2-3 חודשים",
          "ניחוח אוקיאנוס רענן",
          "נוסחה בטוחה ללא כימיקלים",
          "מנטרל ריחות במשך 24 שעות",
        ],
      },
      {
        id: 9,
        name: "עמוד גירוד מפואר",
        price: 349.90,
        originalPrice: null,
        rating: 4.9,
        reviews: 312,
        image: "https://images.unsplash.com/photo-1603227137113-d9d0c1da2f0a?w=400&h=400&fit=crop",
        badge: "פופולרי",
        category: "cat",
      },
      {
        id: 10,
        name: "צעצוע אינטראקטיבי",
        price: 89.90,
        originalPrice: null,
        rating: 4.7,
        reviews: 156,
        image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop",
        badge: null,
        category: "cat",
      },
      {
        id: 11,
        name: "קערת קרמיקה מעוצבת",
        price: 79.90,
        originalPrice: 99.90,
        rating: 4.6,
        reviews: 189,
        image: "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=400&h=400&fit=crop",
        badge: "מבצע",
        category: "cat",
      },
      {
        id: 12,
        name: "מברשת הסרת פרווה",
        price: 59.90,
        originalPrice: null,
        rating: 4.8,
        reviews: 267,
        image: "https://images.unsplash.com/photo-1601758123927-df98d70f9a99?w=400&h=400&fit=crop",
        badge: "חדש",
        category: "cat",
      },
    ],
  };

  // If no pet type selected, show selector
  if (!petType) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <PetSelector />
        <BottomNav />
      </div>
    );
  }

  const currentCategories = categories[petType];
  const currentProducts = products[petType].filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProductClick = (product: any) => {
    navigate("/product", { state: { product } });
  };

  return (
    <div className="min-h-screen bg-background pb-20" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between px-6 py-4">
          <Button variant="ghost" size="icon">
            <Menu className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">{t.title}</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="w-6 h-6" />
              <Badge className="absolute -top-1 -left-1 w-5 h-5 flex items-center justify-center p-0 bg-primary text-[10px]">
                0
              </Badge>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 pb-4">
          <div className="relative">
            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground`} />
            <Input
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${isRTL ? 'pr-10' : 'pl-10'} rounded-full bg-muted`}
            />
          </div>
        </div>
      </header>

      <main className="px-6 py-6 space-y-8">
        {/* Categories */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{t.categories}</h2>
            <Button variant="ghost" size="sm">
              <Filter className="w-4 h-4 ml-2" />
              סינון
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {currentCategories.map((category, index) => (
              <Card
                key={index}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="aspect-square">
                  <img
                    src={category.image}
                    alt={category.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 text-center">
                  <h3 className="font-semibold text-sm mb-1">{category.title}</h3>
                  <p className="text-xs text-muted-foreground">{category.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section>
          <h2 className="text-xl font-bold mb-4">{t.featured}</h2>
          <div className="grid grid-cols-2 gap-4">
            {currentProducts.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => handleProductClick(product)}
              >
                <div className="relative aspect-square">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  {product.badge && (
                    <Badge className="absolute top-2 right-2 bg-primary">
                      {product.badge}
                    </Badge>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 left-2 bg-background/80 hover:bg-background"
                  >
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-3 space-y-2">
                  <h3 className="font-semibold text-sm line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-medium">{product.rating}</span>
                    <span className="text-xs text-muted-foreground">
                      ({product.reviews})
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-primary">₪{product.price}</span>
                    {product.originalPrice && (
                      <span className="text-xs text-muted-foreground line-through">
                        ₪{product.originalPrice}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Shop;
