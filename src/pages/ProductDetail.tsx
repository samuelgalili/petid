import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, Heart, Share2, ShoppingCart, Star, Plus, Minus, ChevronLeft, ChevronRight, Check, Truck, Shield, PackageCheck, Sparkles, Award, Clock, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
    { icon: Sparkles, title: "מתאים לחיות רגישות", description: "עדין לקיבה, קל לעיכול" },
    { icon: Award, title: "איכות פרימיום", description: "מחיר הוגן, רכיבים יוצאי דופן" },
    { icon: Truck, title: "משלוח טרי", description: "נמסר טרי עד הבית" },
    { icon: Shield, title: "מאושר ע״י וטרינרים", description: "מהימן על ידי וטרינרים" },
    { icon: Heart, title: "משפר את האושר", description: "אנרגיה ושמחה בכל ביס" },
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
    },
    {
      id: 2,
      author: "יוחנן ד.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
      rating: 4,
      date: "לפני חודש",
      comment: "תמורה מעולה לכסף. חיית המחמד שלי בריאה יותר מאז שעברנו למוצר הזה. ממליץ בחום!",
      petImage: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&h=300&fit=crop",
    },
    {
      id: 3,
      author: "אמילי ר.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
      rating: 5,
      date: "לפני חודש",
      comment: "הרכישה הטובה ביותר שעשיתי עבור חיית המחמד שלי. הרכיבים טבעיים ורמות האנרגיה של הכלב שלי השתפרו.",
      petImage: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=300&h=300&fit=crop",
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
      title: "נוסף לעגלה",
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
      title: isWishlisted ? "הוסר מהמועדפים" : "נוסף למועדפים",
      description: isWishlisted ? `${product.name} הוסר` : `${product.name} נשמר למועדפים`,
    });
  };

  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="min-h-screen pb-32 bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-gray-100 w-10 h-10"
            onClick={() => navigate(-1)}
          >
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </Button>
          <h1 className="text-base font-bold font-jakarta text-gray-900">פרטי מוצר</h1>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full hover:bg-gray-100 w-10 h-10"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast({ title: "הקישור הועתק", description: "קישור למוצר הועתק ללוח" });
              }}
            >
              <Share2 className="w-5 h-5 text-gray-700" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className={`rounded-full hover:bg-gray-100 w-10 h-10 transition-colors ${isWishlisted ? 'text-red-500' : 'text-gray-700'}`}
              onClick={toggleWishlist}
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* Product Images Gallery */}
      <div className="bg-white relative">
        <div className="aspect-square max-w-lg mx-auto relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img
              key={selectedImage}
              src={images[selectedImage]}
              alt={product.name}
              className="w-full h-full object-cover"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            />
          </AnimatePresence>
          
          {/* Discount Badge */}
          {product.discount && (
            <div className="absolute top-4 right-4">
              <Badge className="bg-red-500 text-white font-bold px-3 py-1.5 rounded-full text-sm shadow-lg">
                <Percent className="w-3.5 h-3.5 ml-1" />
                {product.discount}
              </Badge>
            </div>
          )}
          
          {images.length > 1 && (
            <>
              <button
                onClick={nextImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={prevImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            </>
          )}
          
          {/* Image Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
            {selectedImage + 1} / {images.length}
          </div>
        </div>
        
        {/* Image Thumbnails */}
        <div className="flex gap-2 justify-center py-4 px-4">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedImage(idx)}
              className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                selectedImage === idx
                  ? "border-accent ring-2 ring-accent/30 scale-105"
                  : "border-gray-200 opacity-70 hover:opacity-100"
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Product Info */}
      <div className="px-4 py-5 space-y-5 bg-white mt-2 rounded-t-3xl -mt-4 relative z-10">
        {/* Title & Price */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900 font-jakarta leading-tight mb-1">{product.name}</h1>
              <p className="text-sm text-gray-500 font-jakarta">{product.subtitle}</p>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full">
              <Star className="w-4 h-4 fill-warning text-warning" />
              <span className="font-bold text-gray-900 font-jakarta text-sm">{product.rating}</span>
              <span className="text-gray-500 text-xs font-jakarta">({product.reviewCount})</span>
            </div>
          </div>
          
          <div className="flex items-baseline gap-3 mt-4">
            <span className="text-3xl font-bold text-gray-900 font-jakarta">{product.price}</span>
            {product.originalPrice && (
              <span className="text-lg text-gray-400 line-through font-jakarta">{product.originalPrice}</span>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-green-50 px-3 py-1.5 rounded-full">
              <Truck className="w-4 h-4 text-green-600" />
              <span className="font-jakarta text-green-700">משלוח חינם מעל ₪199</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-blue-50 px-3 py-1.5 rounded-full">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="font-jakarta text-blue-700">2-4 ימי עסקים</span>
            </div>
          </div>
        </motion.div>

        <Separator className="bg-gray-100" />

        {/* Variant Selectors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-bold mb-3 block text-gray-900 font-jakarta">בחר טעם</label>
            <div className="flex gap-2 flex-wrap">
              {["עוף ואורז", "בקר וירקות", "סלמון ובטטה"].map((variant) => (
                <button
                  key={variant}
                  onClick={() => setSelectedVariant(variant)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-jakarta transition-all ${
                    selectedVariant === variant
                      ? "bg-accent text-gray-900 font-bold shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {variant}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-bold mb-3 block text-gray-900 font-jakarta">בחר גודל</label>
            <div className="flex gap-2">
              {["1 ק״ג", "2.5 ק״ג", "5 ק״ג", "10 ק״ג"].map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-jakarta transition-all ${
                    selectedSize === size
                      ? "bg-accent text-gray-900 font-bold shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <Separator className="bg-gray-100" />

        {/* Key Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-lg font-bold mb-4 text-gray-900 font-jakarta">למה חיית המחמד שלך תאהב את זה</h3>
          <div className="grid grid-cols-1 gap-3">
            {benefits.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <motion.div 
                  key={idx} 
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.05 }}
                >
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm font-jakarta">{benefit.title}</h4>
                    <p className="text-xs text-gray-500 font-jakarta">{benefit.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <Separator className="bg-gray-100" />

        {/* Product Details Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-lg font-bold mb-3 text-gray-900 font-jakarta">פרטי המוצר</h3>
          <Accordion type="single" collapsible className="w-full space-y-2">
            <AccordionItem value="description" className="border border-gray-100 rounded-xl px-4 bg-white">
              <AccordionTrigger className="font-jakarta text-sm font-bold text-gray-900 hover:no-underline py-4">
                תיאור מלא
              </AccordionTrigger>
              <AccordionContent className="text-sm text-gray-600 font-jakarta leading-relaxed pb-4">
                {product.description}
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="ingredients" className="border border-gray-100 rounded-xl px-4 bg-white">
              <AccordionTrigger className="font-jakarta text-sm font-bold text-gray-900 hover:no-underline py-4">
                רכיבים וערכים תזונתיים
              </AccordionTrigger>
              <AccordionContent className="text-sm text-gray-600 font-jakarta space-y-2 pb-4">
                <p><strong>רכיבים עיקריים:</strong> עוף (30%), אורז (25%), ירקות (15%), ויטמינים ומינרלים חיוניים</p>
                <p><strong>ערך תזונתי:</strong> חלבון 28%, שומן 15%, סיבים 3%, לחות 10%</p>
                <p><strong>ללא:</strong> חומרים משמרים, צבעים או טעמים מלאכותיים</p>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="usage" className="border border-gray-100 rounded-xl px-4 bg-white">
              <AccordionTrigger className="font-jakarta text-sm font-bold text-gray-900 hover:no-underline py-4">
                הוראות שימוש
              </AccordionTrigger>
              <AccordionContent className="text-sm text-gray-600 font-jakarta space-y-2 pb-4">
                <p>האכילו בהתאם למשקל חיית המחמד:</p>
                <ul className="list-disc list-inside space-y-1 mr-2">
                  <li>כלבים קטנים (עד 10 ק״ג): 100-150 גרם ליום</li>
                  <li>כלבים בינוניים (10-25 ק״ג): 150-300 גרם ליום</li>
                  <li>כלבים גדולים (מעל 25 ק״ג): 300-500 גרם ליום</li>
                </ul>
                <p className="mt-2">תמיד ספקו מים טריים. התאימו מנות בהתאם לרמת הפעילות.</p>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="shipping" className="border border-gray-100 rounded-xl px-4 bg-white">
              <AccordionTrigger className="font-jakarta text-sm font-bold text-gray-900 hover:no-underline py-4">
                משלוח והחזרות
              </AccordionTrigger>
              <AccordionContent className="text-sm text-gray-600 font-jakarta space-y-2 pb-4">
                <p><strong>משלוח:</strong> משלוח חינם בהזמנות מעל ₪199. משלוח רגיל 2-4 ימי עסקים.</p>
                <p><strong>החזרות:</strong> אחריות החזר כספי של 30 יום. צרו קשר להחזרות קלות.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>

        <Separator className="bg-gray-100" />

        {/* Reviews Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 font-jakarta">ביקורות לקוחות</h3>
            <Button variant="ghost" className="text-accent hover:text-accent font-jakarta text-sm font-bold">
              הצג הכל
            </Button>
          </div>
          <div className="space-y-3">
            {reviews.map((review, idx) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + idx * 0.1 }}
              >
                <Card className="p-4 bg-gray-50 border-0 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 ring-2 ring-accent/20">
                      <AvatarImage src={review.avatar} />
                      <AvatarFallback className="bg-accent text-gray-900 font-bold">{review.author[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-900 font-jakarta text-sm">{review.author}</span>
                        <span className="text-xs text-gray-400 font-jakarta">{review.date}</span>
                      </div>
                      <div className="flex items-center gap-0.5 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < review.rating
                                ? "fill-warning text-warning"
                                : "fill-gray-200 text-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed font-jakarta">
                        {review.comment}
                      </p>
                      {review.petImage && (
                        <img 
                          src={review.petImage} 
                          alt="Pet" 
                          className="mt-3 w-20 h-20 rounded-xl object-cover"
                        />
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <Separator className="bg-gray-100" />

        {/* Recommended Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-lg font-bold mb-4 text-gray-900 font-jakarta">לקוחות גם קנו</h3>
          <div className="grid grid-cols-2 gap-3">
            {relatedProducts.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + idx * 0.05 }}
              >
                <Card 
                  className="p-3 bg-white border border-gray-100 rounded-xl cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
                  onClick={() => navigate('/product', { state: { product: { ...item, price: item.price } } })}
                >
                  <div className="aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 font-jakarta mb-1 truncate">{item.name}</h4>
                  <p className="text-sm font-bold text-accent font-jakarta">{item.price}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Trust Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-br from-accent/10 to-secondary/10 rounded-2xl p-5"
        >
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-2">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-xs font-bold text-gray-900 font-jakarta">תשלום מאובטח</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-2">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-xs font-bold text-gray-900 font-jakarta">משלוח מהיר</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-2">
                <PackageCheck className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-xs font-bold text-gray-900 font-jakarta">החזרות קלות</p>
            </div>
          </div>
          <p className="text-center text-xs text-gray-500 font-jakarta mt-4">
            אנחנו דואגים לבני המשפחה בעלי הארבע שלכם 🐶🐱
          </p>
        </motion.div>
      </div>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100 p-4 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-lg mx-auto">
          {/* Quantity & Total */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-700 font-jakarta">כמות:</span>
              <div className="flex items-center bg-gray-100 rounded-xl">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-9 w-9 rounded-xl hover:bg-gray-200"
                >
                  <Minus className="w-4 h-4 text-gray-700" />
                </Button>
                <span className="w-10 text-center text-base font-bold text-gray-900 font-jakarta">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-9 w-9 rounded-xl hover:bg-gray-200"
                >
                  <Plus className="w-4 h-4 text-gray-700" />
                </Button>
              </div>
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500 font-jakarta">סה״כ</p>
              <p className="text-xl font-bold text-gray-900 font-jakarta">
                ₪{(parseFloat(product.price.replace('₪', '')) * quantity).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 border-2 border-gray-900 text-gray-900 hover:bg-gray-100 rounded-xl font-bold font-jakarta h-12"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="w-4 h-4 ml-2" />
              הוסף לעגלה
            </Button>
            <Button
              size="lg"
              className="flex-1 bg-accent hover:bg-accent-hover text-gray-900 rounded-xl font-bold font-jakarta shadow-md h-12"
              onClick={handleBuyNow}
            >
              קנה עכשיו
            </Button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProductDetail;
