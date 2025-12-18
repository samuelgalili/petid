import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, Heart, Share2, ShoppingCart, Star, Plus, Minus, ChevronLeft, ChevronRight, Check, Truck, Shield, PackageCheck, Sparkles, Award, Clock, Percent, Leaf, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { useCart } from "@/contexts/CartContext";

const ProductDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState("עוף ואורז");
  const [selectedSize, setSelectedSize] = useState("2.5 ק״ג");
  const [isWishlisted, setIsWishlisted] = useState(false);
  const touchStartX = useRef(0);

  // Get product from location state or use default
  const product = location.state?.product || {
    name: "מזון פרימיום לכלבים",
    subtitle: "בריאות טובה יותר. טעם מעולה. חיות מחמד מאושרות.",
    price: "₪207.84",
    originalPrice: "₪259.80",
    discount: "20% הנחה",
    image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&h=600&fit=crop",
    color: "bg-[#B8E3D5]",
    category: "מזון",
    description: "מזון פרימיום איכותי לכלבים עשוי ממרכיבים טבעיים. מתאים לכל הגזעים ושלבי החיים. מכיל ויטמינים, מינרלים וחלבונים חיוניים לבריאות מיטבית.",
    rating: 4.8,
    reviewCount: 234,
  };

  const benefits = [
    { icon: Leaf, title: "100% טבעי", description: "ללא חומרים משמרים מלאכותיים", color: "bg-green-100 text-green-600" },
    { icon: Sparkles, title: "מתאים לחיות רגישות", description: "עדין לקיבה, קל לעיכול", color: "bg-purple-100 text-purple-600" },
    { icon: Award, title: "איכות פרימיום", description: "מחיר הוגן, רכיבים יוצאי דופן", color: "bg-amber-100 text-amber-600" },
    { icon: Zap, title: "משפר אנרגיה", description: "חיונות ושמחה בכל ביס", color: "bg-blue-100 text-blue-600" },
  ];

  const relatedProducts = [
    { id: 1, name: "חטיפים לכלבים", price: "₪45.00", image: "https://images.unsplash.com/photo-1615751072497-5f5169febe17?w=300&h=300&fit=crop" },
    { id: 2, name: "ויטמינים לחיות", price: "₪89.00", image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=300&h=300&fit=crop" },
    { id: 3, name: "צעצועים לכלבים", price: "₪65.00", image: "https://images.unsplash.com/photo-1591769225440-811ad7d6eab3?w=300&h=300&fit=crop" },
    { id: 4, name: "קערת אוכל", price: "₪55.00", image: "https://images.unsplash.com/photo-1585664811087-47f65abbad64?w=300&h=300&fit=crop" },
  ];

  const images = [
    product.image,
    "https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&h=600&fit=crop",
  ];

  const reviews = [
    {
      id: 1,
      author: "שרה מ.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      rating: 5,
      date: "לפני שבועיים",
      comment: "מוצר מדהים! הכלב שלי פשוט מת על זה. האיכות יוצאת דופן ושמתי לב לשיפור משמעותי בפרווה שלו.",
      petImage: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=300&h=300&fit=crop",
      helpful: 24,
    },
    {
      id: 2,
      author: "יוחנן ד.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
      rating: 4,
      date: "לפני חודש",
      comment: "תמורה מעולה לכסף. חיית המחמד שלי בריאה יותר מאז שעברנו למוצר הזה. ממליץ בחום!",
      petImage: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&h=300&fit=crop",
      helpful: 18,
    },
  ];

  const handleAddToCart = () => {
    const priceNumeric = parseFloat(product.price.replace('₪', ''));
    addToCart({
      id: `${product.name}-${selectedVariant}-${selectedSize}`,
      name: product.name,
      price: priceNumeric,
      image: product.image,
      quantity: quantity,
      variant: selectedVariant,
      size: selectedSize,
    });
    toast({
      title: "נוסף לעגלה 🛒",
      description: `${product.name} x${quantity} נוסף בהצלחה`,
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate("/cart");
  };

  const toggleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    toast({
      title: isWishlisted ? "הוסר מהמועדפים" : "נוסף למועדפים ❤️",
      description: isWishlisted ? `${product.name} הוסר` : `${product.name} נשמר למועדפים`,
    });
  };

  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextImage();
      else prevImage();
    }
  };

  return (
    <div className="min-h-screen pb-36 bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-muted w-10 h-10"
            onClick={() => navigate(-1)}
          >
            <ArrowRight className="w-5 h-5 text-foreground" />
          </Button>
          <h1 className="text-base font-bold font-jakarta text-foreground">פרטי מוצר</h1>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full hover:bg-muted w-10 h-10"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast({ title: "הקישור הועתק", description: "קישור למוצר הועתק ללוח" });
              }}
            >
              <Share2 className="w-5 h-5 text-foreground" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className={`rounded-full hover:bg-muted w-10 h-10 transition-all duration-300 ${isWishlisted ? 'text-red-500 scale-110' : 'text-foreground'}`}
              onClick={toggleWishlist}
            >
              <Heart className={`w-5 h-5 transition-all duration-300 ${isWishlisted ? 'fill-current animate-pulse' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* Product Images Gallery */}
      <div className="relative bg-gradient-to-b from-muted/50 to-background">
        <div 
          className="aspect-square max-w-md mx-auto relative overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={selectedImage}
              src={images[selectedImage]}
              alt={product.name}
              className="w-full h-full object-cover"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
            />
          </AnimatePresence>
          
          {/* Discount Badge */}
          {product.discount && (
            <motion.div 
              className="absolute top-4 right-4"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white font-bold px-3 py-1.5 rounded-full text-sm shadow-lg shadow-red-500/30">
                <Percent className="w-3.5 h-3.5 ml-1" />
                {product.discount}
              </Badge>
            </motion.div>
          )}
          
          {images.length > 1 && (
            <>
              <button
                onClick={nextImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <button
                onClick={prevImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            </>
          )}
        </div>
        
        {/* Image Indicators */}
        <div className="flex gap-2 justify-center py-4">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedImage(idx)}
              className={`transition-all duration-300 ${
                selectedImage === idx
                  ? "w-8 h-2 bg-primary rounded-full"
                  : "w-2 h-2 bg-muted-foreground/30 rounded-full hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>
        
        {/* Image Thumbnails */}
        <div className="flex gap-2 justify-center pb-4 px-4">
          {images.map((img, idx) => (
            <motion.button
              key={idx}
              onClick={() => setSelectedImage(idx)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                selectedImage === idx
                  ? "border-primary ring-4 ring-primary/20 shadow-lg"
                  : "border-border/50 opacity-60 hover:opacity-100"
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Product Info Card */}
      <motion.div 
        className="mx-4 -mt-2 bg-card rounded-3xl shadow-xl shadow-black/5 border border-border/30 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Title & Price Section */}
        <div className="p-5 border-b border-border/30">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground font-jakarta leading-tight">{product.name}</h1>
              <p className="text-sm text-muted-foreground font-jakarta mt-1">{product.subtitle}</p>
            </div>
            <div className="flex items-center gap-1 bg-warning/10 px-3 py-1.5 rounded-full">
              <Star className="w-4 h-4 fill-warning text-warning" />
              <span className="font-bold text-foreground font-jakarta text-sm">{product.rating}</span>
            </div>
          </div>
          
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-foreground font-jakarta">{product.price}</span>
            {product.originalPrice && (
              <span className="text-base text-muted-foreground line-through font-jakarta">{product.originalPrice}</span>
            )}
          </div>
          
          {/* Delivery Info Pills */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs bg-success/10 text-success px-3 py-2 rounded-full font-medium">
              <Truck className="w-3.5 h-3.5" />
              <span className="font-jakarta">משלוח חינם מעל ₪199</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs bg-info/10 text-info px-3 py-2 rounded-full font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-jakarta">2-4 ימי עסקים</span>
            </div>
          </div>
        </div>

        {/* Variant Selectors */}
        <div className="p-5 border-b border-border/30 space-y-5">
          <div>
            <label className="text-sm font-bold mb-3 block text-foreground font-jakarta">בחר טעם</label>
            <div className="flex gap-2 flex-wrap">
              {["עוף ואורז", "בקר וירקות", "סלמון ובטטה"].map((variant) => (
                <motion.button
                  key={variant}
                  onClick={() => setSelectedVariant(variant)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`px-4 py-2.5 rounded-xl text-sm font-jakarta transition-all duration-200 ${
                    selectedVariant === variant
                      ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/30"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  {selectedVariant === variant && <Check className="w-3.5 h-3.5 inline-block ml-1" />}
                  {variant}
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-bold mb-3 block text-foreground font-jakarta">בחר גודל</label>
            <div className="flex gap-2">
              {["1 ק״ג", "2.5 ק״ג", "5 ק״ג", "10 ק״ג"].map((size) => (
                <motion.button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`px-4 py-2.5 rounded-xl text-sm font-jakarta transition-all duration-200 ${
                    selectedSize === size
                      ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/30"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  {size}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Key Benefits */}
        <div className="p-5 border-b border-border/30">
          <h3 className="text-base font-bold mb-4 text-foreground font-jakarta">למה חיית המחמד שלך תאהב את זה</h3>
          <div className="grid grid-cols-2 gap-3">
            {benefits.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <motion.div 
                  key={idx} 
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.05 }}
                >
                  <div className={`w-9 h-9 rounded-full ${benefit.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-xs font-jakarta">{benefit.title}</h4>
                    <p className="text-[10px] text-muted-foreground font-jakarta leading-tight">{benefit.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Product Details Accordion */}
        <div className="p-5">
          <Accordion type="single" collapsible className="w-full space-y-2">
            <AccordionItem value="description" className="border-0 bg-muted/30 rounded-xl px-4">
              <AccordionTrigger className="font-jakarta text-sm font-bold text-foreground hover:no-underline py-4">
                תיאור מלא
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground font-jakarta leading-relaxed pb-4">
                {product.description}
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="ingredients" className="border-0 bg-muted/30 rounded-xl px-4">
              <AccordionTrigger className="font-jakarta text-sm font-bold text-foreground hover:no-underline py-4">
                רכיבים וערכים תזונתיים
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground font-jakarta space-y-2 pb-4">
                <p><strong className="text-foreground">רכיבים עיקריים:</strong> עוף (30%), אורז (25%), ירקות (15%), ויטמינים ומינרלים חיוניים</p>
                <p><strong className="text-foreground">ערך תזונתי:</strong> חלבון 28%, שומן 15%, סיבים 3%, לחות 10%</p>
                <p><strong className="text-foreground">ללא:</strong> חומרים משמרים, צבעים או טעמים מלאכותיים</p>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="usage" className="border-0 bg-muted/30 rounded-xl px-4">
              <AccordionTrigger className="font-jakarta text-sm font-bold text-foreground hover:no-underline py-4">
                הוראות שימוש
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground font-jakarta space-y-2 pb-4">
                <p>האכילו בהתאם למשקל חיית המחמד:</p>
                <ul className="list-disc list-inside space-y-1 mr-2">
                  <li>כלבים קטנים (עד 10 ק״ג): 100-150 גרם ליום</li>
                  <li>כלבים בינוניים (10-25 ק״ג): 150-300 גרם ליום</li>
                  <li>כלבים גדולים (מעל 25 ק״ג): 300-500 גרם ליום</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="shipping" className="border-0 bg-muted/30 rounded-xl px-4">
              <AccordionTrigger className="font-jakarta text-sm font-bold text-foreground hover:no-underline py-4">
                משלוח והחזרות
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground font-jakarta space-y-2 pb-4">
                <p><strong className="text-foreground">משלוח:</strong> משלוח חינם בהזמנות מעל ₪199. משלוח רגיל 2-4 ימי עסקים.</p>
                <p><strong className="text-foreground">החזרות:</strong> אחריות החזר כספי של 30 יום.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </motion.div>

      {/* Reviews Section */}
      <motion.div 
        className="mx-4 mt-4 bg-card rounded-3xl shadow-lg shadow-black/5 border border-border/30 overflow-hidden p-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-foreground font-jakarta">ביקורות לקוחות</h3>
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 fill-warning text-warning" />
            <span className="font-bold text-foreground font-jakarta">{product.rating}</span>
            <span className="text-muted-foreground font-jakarta">({product.reviewCount})</span>
          </div>
        </div>
        
        <div className="space-y-3">
          {reviews.map((review, idx) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + idx * 0.1 }}
            >
              <Card className="p-4 bg-muted/30 border-0 rounded-xl">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                    <AvatarImage src={review.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">{review.author[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-foreground font-jakarta text-sm">{review.author}</span>
                      <span className="text-xs text-muted-foreground font-jakarta">{review.date}</span>
                    </div>
                    <div className="flex items-center gap-0.5 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < review.rating
                              ? "fill-warning text-warning"
                              : "fill-muted text-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed font-jakarta">
                      {review.comment}
                    </p>
                    {review.petImage && (
                      <img 
                        src={review.petImage} 
                        alt="Pet" 
                        className="mt-3 w-16 h-16 rounded-xl object-cover"
                      />
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-7 px-2">
                        👍 מועיל ({review.helpful})
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
        
        <Button variant="outline" className="w-full mt-4 text-primary border-primary/30 hover:bg-primary/5 rounded-xl font-jakarta font-bold">
          הצג את כל הביקורות ({product.reviewCount})
        </Button>
      </motion.div>

      {/* Recommended Products */}
      <motion.div 
        className="mx-4 mt-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-base font-bold mb-4 text-foreground font-jakarta">לקוחות גם קנו</h3>
        <div className="grid grid-cols-2 gap-3">
          {relatedProducts.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + idx * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative p-[1.5px] rounded-2xl cursor-pointer group"
              style={{
                background: 'linear-gradient(135deg, #93C5FD, #FBBF24, #60A5FA)'
              }}
              onClick={() => navigate('/product/related', { state: { product: { ...item, price: item.price } } })}
            >
              <div className="bg-white rounded-2xl overflow-hidden h-full transition-all group-hover:shadow-lg">
                <div className="aspect-square bg-gradient-to-br from-gray-50 to-white overflow-hidden">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-3 bg-white">
                  <h4 className="font-bold text-sm text-gray-800 font-jakarta mb-1 truncate">{item.name}</h4>
                  <p className="text-sm font-black bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent font-jakarta">{item.price}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Trust Section */}
      <motion.div 
        className="mx-4 mb-6 bg-gradient-to-br from-primary/5 via-success/5 to-info/5 rounded-2xl p-5 border border-primary/10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-card shadow-md flex items-center justify-center mb-2">
              <Shield className="w-5 h-5 text-success" />
            </div>
            <p className="text-xs font-bold text-foreground font-jakarta">תשלום מאובטח</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-card shadow-md flex items-center justify-center mb-2">
              <Truck className="w-5 h-5 text-info" />
            </div>
            <p className="text-xs font-bold text-foreground font-jakarta">משלוח מהיר</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-card shadow-md flex items-center justify-center mb-2">
              <PackageCheck className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs font-bold text-foreground font-jakarta">החזרות קלות</p>
          </div>
        </div>
      </motion.div>

      {/* Sticky Bottom CTA */}
      <motion.div 
        className="fixed bottom-16 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border/50 p-4 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="max-w-lg mx-auto">
          {/* Quantity & Total */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-foreground font-jakarta">כמות:</span>
              <div className="flex items-center bg-muted rounded-xl">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-9 w-9 rounded-xl hover:bg-muted-foreground/10"
                >
                  <Minus className="w-4 h-4 text-foreground" />
                </Button>
                <motion.span 
                  key={quantity}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="w-10 text-center text-base font-bold text-foreground font-jakarta"
                >
                  {quantity}
                </motion.span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-9 w-9 rounded-xl hover:bg-muted-foreground/10"
                >
                  <Plus className="w-4 h-4 text-foreground" />
                </Button>
              </div>
            </div>
            <div className="text-left">
              <p className="text-xs text-muted-foreground font-jakarta">סה״כ</p>
              <motion.p 
                key={quantity}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="text-xl font-black text-foreground font-jakarta"
              >
                ₪{(parseFloat(product.price.replace('₪', '')) * quantity).toFixed(2)}
              </motion.p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 border-2 border-foreground text-foreground hover:bg-muted rounded-xl font-bold font-jakarta h-12"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="w-4 h-4 ml-2" />
              הוסף לעגלה
            </Button>
            <Button
              size="lg"
              className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl font-bold font-jakarta shadow-lg shadow-primary/30 h-12"
              onClick={handleBuyNow}
            >
              קנה עכשיו
            </Button>
          </div>
        </div>
      </motion.div>

      <BottomNav />
    </div>
  );
};

export default ProductDetail;
