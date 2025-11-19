import { ShoppingCart, Heart, Search, Menu, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";

const Shop = () => {
  const categories = [
    {
      title: "מוצרי טכנולוגיה",
      description: "GPS, מצלמות ועוד",
      image: "https://images.unsplash.com/photo-1609557927087-f9cf8e88de18?w=600&h=400&fit=crop",
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "מוצרי אהבה",
      description: "צעצועים ומתנות",
      image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&h=400&fit=crop",
      color: "from-pink-500 to-pink-600",
    },
    {
      title: "מוצרים חדשים",
      description: "הגיעו זה עתה",
      image: "https://images.unsplash.com/photo-1623387641168-d9803ddd3f35?w=600&h=400&fit=crop",
      color: "from-amber-400 to-amber-500",
    },
  ];

  const products = [
    {
      name: "רצועת LED חכמה",
      price: 129.90,
      originalPrice: 179.90,
      rating: 4.5,
      reviews: 45,
      image: "https://images.unsplash.com/photo-1601758123927-df98d70f9a99?w=400&h=400&fit=crop",
      badge: "חדש",
    },
    {
      name: "צעצוע אינטראקטיבי",
      price: 89.90,
      originalPrice: null,
      rating: 4.8,
      reviews: 128,
      image: "https://images.unsplash.com/photo-1603227137113-d9d0c1da2f0a?w=400&h=400&fit=crop",
      badge: null,
    },
    {
      name: "מיטה אורתופדית",
      price: 299.90,
      originalPrice: 399.90,
      rating: 4.9,
      reviews: 89,
      image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=400&fit=crop",
      badge: "מבצע",
    },
    {
      name: "קערות נירוסטה מעוצבות",
      price: 79.90,
      originalPrice: null,
      rating: 4.6,
      reviews: 234,
      image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&h=400&fit=crop",
      badge: null,
    },
    {
      name: "משאבת מים אוטומטית",
      price: 149.90,
      originalPrice: 199.90,
      rating: 4.7,
      reviews: 67,
      image: "https://images.unsplash.com/photo-1591103833648-847d8c02d1ba?w=400&h=400&fit=crop",
      badge: "פופולרי",
    },
    {
      name: "מכשיר GPS למעקב",
      price: 249.90,
      originalPrice: null,
      rating: 4.9,
      reviews: 156,
      image: "https://images.unsplash.com/photo-1609557927087-f9cf8e88de18?w=400&h=400&fit=crop",
      badge: "מומלץ",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between px-6 py-4">
          <Button variant="ghost" size="icon">
            <Menu className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">חנות חיות</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="w-6 h-6" />
              <Badge className="absolute -top-1 -left-1 w-5 h-5 flex items-center justify-center p-0 bg-coral text-[10px]">
                0
              </Badge>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="אני רוצה לקנות..."
              className="pr-10 rounded-full bg-muted"
            />
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-amber-400 blur-3xl" />
          <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full bg-coral blur-3xl" />
        </div>
        
        <div className="relative px-6 py-12 text-center">
          <Badge className="mb-4 bg-amber-400 text-black border-none">
            LIMITED TIME SALE
          </Badge>
          <h2 className="text-4xl font-bold mb-2">
            BLACK <span className="text-amber-400">NOVEMBER</span>
          </h2>
          <p className="text-lg mb-6 text-gray-300">מבצע משלוח חינם בכל הזמנה מעל 250 ש"ח</p>
          <Button className="bg-amber-400 hover:bg-amber-500 text-black font-bold text-lg h-14 px-8 rounded-full">
            לעמוד המבצעים
          </Button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="px-6 py-8">
        <div className="grid grid-cols-1 gap-4 mb-8">
          {categories.map((category, index) => (
            <Card
              key={index}
              className="relative overflow-hidden h-48 cursor-pointer hover:scale-[1.02] transition-transform group"
            >
              <img
                src={category.image}
                alt={category.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${category.color} opacity-80`} />
              <div className="relative h-full flex flex-col items-center justify-center text-white p-6 text-center">
                <h3 className="text-2xl font-bold mb-2">{category.title}</h3>
                <p className="text-sm opacity-90">{category.description}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Products Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">המוצרים שלנו</h2>
            <Button variant="link" className="text-coral">
              צפייה בכל המוצרים
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {products.map((product, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  {product.badge && (
                    <Badge className="absolute top-2 right-2 z-10 bg-coral border-none">
                      {product.badge}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 left-2 z-10 bg-background/80 hover:bg-background"
                  >
                    <Heart className="w-4 h-4" />
                  </Button>
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full aspect-square object-cover"
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-medium">{product.rating}</span>
                    <span className="text-xs text-muted-foreground">({product.reviews})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-coral">
                      ₪{product.price}
                    </span>
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
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Shop;
