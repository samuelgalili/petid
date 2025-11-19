import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, Heart, Share2, ShoppingCart, Star, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const ProductDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  const translations = {
    he: {
      back: "חזרה לחנות",
      addToCart: "הוסף לעגלה",
      buyNow: "קנה עכשיו",
      description: "תיאור המוצר",
      details: "פרטים נוספים",
      reviews: "ביקורות",
      quantity: "כמות",
      inStock: "במלאי",
      freeShipping: "משלוח חינם",
      warranty: "אחריות 12 חודשים",
      returns: "החזרה בתוך 30 יום",
    },
    en: {
      back: "Back to Shop",
      addToCart: "Add to Cart",
      buyNow: "Buy Now",
      description: "Product Description",
      details: "Additional Details",
      reviews: "Reviews",
      quantity: "Quantity",
      inStock: "In Stock",
      freeShipping: "Free Shipping",
      warranty: "12 Month Warranty",
      returns: "30 Day Returns",
    },
    ar: {
      back: "العودة إلى المتجر",
      addToCart: "أضف إلى السلة",
      buyNow: "اشتري الآن",
      description: "وصف المنتج",
      details: "تفاصيل إضافية",
      reviews: "التقييمات",
      quantity: "الكمية",
      inStock: "متوفر",
      freeShipping: "شحن مجاني",
      warranty: "ضمان 12 شهر",
      returns: "إرجاع خلال 30 يوم",
    },
  };

  const t = translations[language];
  const isRTL = language === "he" || language === "ar";

  // Get product from location state or use default
  const product = location.state?.product || {
    name: "דאודורנט מבושם לארגז החול בניחוח אוקיאנוס",
    price: 69,
    originalPrice: 89,
    rating: 4.8,
    reviews: 234,
    image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&h=600&fit=crop",
    badge: "הנמכר ביותר",
    category: "cat",
    description: "דאודורנט איכותי במיוחד לארגז החול של החתול שלך. מנטרל ריחות לא נעימים ומשאיר ניחוח אוקיאנוס רענן למשך זמן ממושך. נוסחה בטוחה ללא כימיקלים מזיקים.",
    features: [
      "450 גרם - מספיק ל-2-3 חודשים",
      "ניחוח אוקיאנוס רענן",
      "נוסחה בטוחה ללא כימיקלים",
      "מנטרל ריחות במשך 24 שעות",
      "מתאים לכל סוגי ארגזי החול",
    ],
  };

  const images = [
    product.image,
    "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop",
  ];

  const handleAddToCart = () => {
    toast.success(`${product.name} נוסף לעגלה`);
  };

  const handleBuyNow = () => {
    toast.success("מעבר לתשלום...");
  };

  return (
    <div className="min-h-screen bg-background pb-20" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/shop")}
          >
            <ArrowRight className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Share2 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Heart className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Product Images */}
      <div className="bg-muted/30">
        <div className="aspect-square max-w-2xl mx-auto">
          <img
            src={images[selectedImage]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex gap-2 justify-center py-4 px-4">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedImage(idx)}
              className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                selectedImage === idx
                  ? "border-primary"
                  : "border-transparent opacity-60"
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Product Info */}
      <div className="px-4 py-6 space-y-6">
        {/* Title & Price */}
        <div>
          {product.badge && (
            <Badge className="mb-2">{product.badge}</Badge>
          )}
          <h1 className="text-2xl font-bold mb-4">{product.name}</h1>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold text-primary">₪{product.price}</span>
            {product.originalPrice && (
              <span className="text-xl text-muted-foreground line-through">
                ₪{product.originalPrice}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold">{product.rating}</span>
              <span className="text-muted-foreground">({product.reviews} ביקורות)</span>
            </div>
            <Badge variant="secondary" className="gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              {t.inStock}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Features */}
        <Card className="p-4 bg-muted/30">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="font-semibold mb-1">{t.freeShipping}</div>
              <div className="text-muted-foreground text-xs">מעל ₪99</div>
            </div>
            <div>
              <div className="font-semibold mb-1">{t.warranty}</div>
              <div className="text-muted-foreground text-xs">אחריות מלאה</div>
            </div>
            <div>
              <div className="font-semibold mb-1">{t.returns}</div>
              <div className="text-muted-foreground text-xs">החזר כספי</div>
            </div>
          </div>
        </Card>

        {/* Description */}
        <div>
          <h2 className="text-lg font-bold mb-3">{t.description}</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {product.description}
          </p>
          <ul className="space-y-2">
            {product.features?.map((feature: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-1">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* Quantity Selector */}
        <div>
          <label className="text-sm font-semibold mb-2 block">{t.quantity}</label>
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-border rounded-lg">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-12 text-center font-semibold">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              סה"כ: <span className="font-bold text-foreground">₪{product.price * quantity}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-40">
        <div className="flex gap-3 max-w-2xl mx-auto">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="w-5 h-5 ml-2" />
            {t.addToCart}
          </Button>
          <Button
            size="lg"
            className="flex-1"
            onClick={handleBuyNow}
          >
            {t.buyNow}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
