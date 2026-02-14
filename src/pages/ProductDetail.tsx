import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Heart, Share2, ShoppingCart, Star, Plus, Minus, ChevronLeft, ChevronRight, Check, Truck, Shield, PackageCheck, Sparkles, Award, Clock, Leaf, Zap, Loader2, Bell, Flag, AlertTriangle } from "lucide-react";
import { ProductReviews } from "@/components/shop/ProductReviews";
import { PriceAlertButton } from "@/components/shop/PriceAlertButton";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";

const ProductDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    toast
  } = useToast();
  const {
    addToCart,
    getTotalItems,
    cartShake
  } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [showReviews, setShowReviews] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("price");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const touchStartX = useRef(0);

  // Fetch product from database if ID is provided
  const { data: dbProduct, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("business_products")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Get product from location state or database
  const rawProduct = dbProduct || location.state?.product || {
    name: "מזון פרימיום לכלבים",
    subtitle: "בריאות טובה יותר. טעם מעולה. חיות מחמד מאושרות.",
    price: 207.84,
    originalPrice: 259.80,
    discount: "20% הנחה",
    image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&h=600&fit=crop",
    color: "bg-[#B8E3D5]",
    category: "מזון",
    description: "מזון פרימיום איכותי לכלבים עשוי ממרכיבים טבעיים. מתאים לכל הגזעים ושלבי החיים. מכיל ויטמינים, מינרלים וחלבונים חיוניים לבריאות מיטבית.",
    rating: 4.8,
    reviewCount: 234
  };

  // Get flavors from database product
  const productFlavors: string[] = dbProduct?.flavors || rawProduct.flavors || [];

  // Set initial variant when product loads
  useEffect(() => {
    if (productFlavors.length > 0 && !selectedVariant) {
      setSelectedVariant(productFlavors[0]);
    }
  }, [productFlavors, selectedVariant]);

  // Normalize price to number
  const getNumericPrice = (price: string | number): number => {
    if (typeof price === 'number') return price;
    return parseFloat(price.replace(/[₪,]/g, '')) || 0;
  };

  // Normalize product data
  const product = {
    ...rawProduct,
    name: rawProduct.name,
    subtitle: rawProduct.description || rawProduct.subtitle || "",
    image: rawProduct.image_url || rawProduct.image,
    price: getNumericPrice(rawProduct.price),
    originalPrice: rawProduct.original_price ? getNumericPrice(rawProduct.original_price) : (rawProduct.originalPrice ? getNumericPrice(rawProduct.originalPrice) : null),
    discount: rawProduct.original_price || rawProduct.originalPrice ? 
      `${Math.round((1 - getNumericPrice(rawProduct.price) / getNumericPrice(rawProduct.original_price || rawProduct.originalPrice)) * 100)}% הנחה` : null,
    rating: rawProduct.rating || 4.5,
    reviewCount: rawProduct.reviewCount || 0,
    isFlagged: rawProduct.is_flagged || false,
    flaggedReason: rawProduct.flagged_reason,
  };
  const benefits = [{
    icon: Leaf,
    title: "100% טבעי",
    description: "ללא חומרים משמרים מלאכותיים",
    color: "bg-green-100 text-green-600"
  }, {
    icon: Sparkles,
    title: "מתאים לחיות רגישות",
    description: "עדין לקיבה, קל לעיכול",
    color: "bg-purple-100 text-purple-600"
  }, {
    icon: Award,
    title: "איכות פרימיום",
    description: "מחיר הוגן, רכיבים יוצאי דופן",
    color: "bg-amber-100 text-amber-600"
  }, {
    icon: Zap,
    title: "משפר אנרגיה",
    description: "חיונות ושמחה בכל ביס",
    color: "bg-blue-100 text-blue-600"
  }];
  // Fetch related products from database
  const { data: relatedProducts = [] } = useQuery({
    queryKey: ["related-products", id],
    queryFn: async () => {
      // First try business_products
      const { data: businessProducts } = await supabase
        .from("business_products")
        .select("id, name, price, image_url")
        .neq("id", id || "")
        .limit(4);
      
      if (businessProducts && businessProducts.length > 0) {
        return businessProducts.map(p => ({
          id: p.id,
          name: p.name,
          price: typeof p.price === 'string' ? parseFloat(p.price) : p.price,
          image: p.image_url || "/placeholder.svg"
        }));
      }
      
      // Fallback to scraped_products
      const { data: scrapedProducts } = await supabase
        .from("scraped_products")
        .select("id, product_name, final_price, main_image_url")
        .neq("id", id || "")
        .limit(4);
      
      if (scrapedProducts && scrapedProducts.length > 0) {
        return scrapedProducts.map(p => ({
          id: p.id,
          name: p.product_name,
          price: p.final_price || 0,
          image: p.main_image_url || "/placeholder.svg"
        }));
      }
      
      return [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  const images = (rawProduct.images && rawProduct.images.length > 0) ? rawProduct.images : 
    (rawProduct.image_url ? [rawProduct.image_url] : 
    (rawProduct.image ? [rawProduct.image] : 
    ["https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&h=600&fit=crop"]));
  const reviews = [{
    id: 1,
    author: "שרה מ.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    rating: 5,
    date: "לפני שבועיים",
    comment: "מוצר מדהים! הכלב שלי פשוט מת על זה. האיכות יוצאת דופן ושמתי לב לשיפור משמעותי בפרווה שלו.",
    petImage: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=300&h=300&fit=crop",
    helpful: 24
  }, {
    id: 2,
    author: "יוחנן ד.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
    rating: 4,
    date: "לפני חודש",
    comment: "תמורה מעולה לכסף. חיית המחמד שלי בריאה יותר מאז שעברנו למוצר הזה. ממליץ בחום!",
    petImage: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&h=300&fit=crop",
    helpful: 18
  }];
  const handleAddToCart = () => {
    addToCart({
      id: `${product.name}-${selectedVariant || 'default'}`,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: quantity,
      variant: selectedVariant || undefined,
    });
    toast({
      title: "נוסף לעגלה 🛒",
      description: `${product.name} x${quantity} נוסף בהצלחה`
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
      description: isWishlisted ? `${product.name} הוסר` : `${product.name} נשמר למועדפים`
    });
  };
  const nextImage = () => {
    setSelectedImage(prev => (prev + 1) % images.length);
  };
  const prevImage = () => {
    setSelectedImage(prev => (prev - 1 + images.length) % images.length);
  };
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextImage();else prevImage();
    }
  };

  const handleReportIssue = async () => {
    setIsReporting(true);
    try {
      // Insert report into database
      const { error } = await supabase
        .from('content_reports')
        .insert({
          content_type: 'product',
          content_id: id || 'unknown',
          reason: reportReason,
          description: reportDetails || `דיווח על ${reportReason === 'price' ? 'מחיר שגוי' : reportReason === 'image' ? 'תמונה לא מתאימה' : reportReason === 'description' ? 'תיאור שגוי' : 'בעיה אחרת'}`,
          reporter_id: user?.id || '00000000-0000-0000-0000-000000000000',
        });

      if (error) throw error;

      toast({
        title: "תודה על הדיווח! 🙏",
        description: "הדיווח התקבל ויטופל בהקדם",
      });
      setReportDialogOpen(false);
      setReportReason("price");
      setReportDetails("");
    } catch (error) {
      console.error("Error reporting issue:", error);
      toast({
        title: "שגיאה בשליחת הדיווח",
        description: "אנא נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    } finally {
      setIsReporting(false);
    }
  };

  // Show loading state - must be after all hooks
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden" dir="rtl">
      <SEO 
        title={product.name}
        description={product.description || `${product.name} - מחיר: ₪${product.price}`}
        image={product.image}
        url={`/product/${id}`}
        type="product"
        price={product.price}
        availability="in_stock"
      />
      <div className="h-full overflow-y-auto pb-[180px]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50 overflow-visible">
        <div className="flex items-center justify-between px-4 py-3 overflow-visible">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted w-10 h-10" onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5 text-foreground" />
          </Button>
          <h1 className="text-base font-bold font-jakarta text-foreground">פרטי מוצר</h1>
          <div className="flex items-center gap-1 overflow-visible">
            {/* Report Issue Button */}
            <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-orange-50 w-10 h-10 text-muted-foreground hover:text-orange-500">
                  <Flag className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-right">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    דיווח על תקלה
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    מצאת משהו שלא נראה נכון? ספר לנו ונטפל בזה
                  </p>
                  
                  <RadioGroup value={reportReason} onValueChange={setReportReason} className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="price" id="price" />
                      <Label htmlFor="price" className="flex-1 cursor-pointer">
                        <span className="font-medium">מחיר שגוי</span>
                        <p className="text-xs text-muted-foreground">המחיר לא נכון או שהמבצע לא אמיתי</p>
                      </Label>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="image" id="image" />
                      <Label htmlFor="image" className="flex-1 cursor-pointer">
                        <span className="font-medium">תמונה לא מתאימה</span>
                        <p className="text-xs text-muted-foreground">התמונה לא מייצגת את המוצר</p>
                      </Label>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="description" id="description" />
                      <Label htmlFor="description" className="flex-1 cursor-pointer">
                        <span className="font-medium">תיאור שגוי</span>
                        <p className="text-xs text-muted-foreground">המידע על המוצר לא מדויק</p>
                      </Label>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="other" id="other" />
                      <Label htmlFor="other" className="flex-1 cursor-pointer">
                        <span className="font-medium">בעיה אחרת</span>
                        <p className="text-xs text-muted-foreground">משהו אחר שצריך לתקן</p>
                      </Label>
                    </div>
                  </RadioGroup>
                  
                  <Textarea
                    placeholder="פרטים נוספים (אופציונלי)..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <DialogClose asChild>
                    <Button variant="outline" className="rounded-xl">
                      ביטול
                    </Button>
                  </DialogClose>
                  <Button 
                    onClick={handleReportIssue}
                    disabled={isReporting}
                    className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white gap-2"
                  >
                    {isReporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Flag className="w-4 h-4" />
                    )}
                    שלח דיווח
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted w-10 h-10" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast({
              title: "הקישור הועתק",
              description: "קישור למוצר הועתק ללוח"
            });
          }}>
              <Share2 className="w-5 h-5 text-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className={`rounded-full hover:bg-muted w-10 h-10 transition-all duration-300 ${isWishlisted ? 'text-red-500 scale-110' : 'text-foreground'}`} onClick={toggleWishlist}>
              <Heart className={`w-5 h-5 transition-all duration-300 ${isWishlisted ? 'fill-current animate-pulse' : ''}`} />
            </Button>
            {/* Cart Icon with badge */}
            <motion.div
              animate={cartShake ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.5 }}
            >
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full hover:bg-muted w-10 h-10 relative overflow-visible" 
                onClick={() => navigate("/cart")}
              >
                <ShoppingCart className="w-5 h-5 text-foreground" />
                <AnimatePresence>
                  {getTotalItems() > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 bg-primary text-primary-foreground text-[11px] font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-background z-10"
                    >
                      {getTotalItems() > 9 ? '9+' : getTotalItems()}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Product Images Gallery */}
      <div className="relative bg-gradient-to-b from-muted/50 to-background">
        <div className="aspect-square max-w-md mx-auto relative overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <AnimatePresence mode="wait">
            <motion.img key={selectedImage} src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover" initial={{
            opacity: 0,
            scale: 1.05
          }} animate={{
            opacity: 1,
            scale: 1
          }} exit={{
            opacity: 0,
            scale: 0.95
          }} transition={{
            duration: 0.25
          }} />
          </AnimatePresence>
          
          {/* Discount Badge */}
          {product.discount && <motion.div className="absolute top-4 left-4" initial={{
          scale: 0,
          rotate: -20
        }} animate={{
          scale: 1,
          rotate: 0
        }} transition={{
          type: "spring",
          stiffness: 400,
          damping: 15
        }}>
              <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white font-bold px-3 py-1.5 rounded-full text-sm shadow-lg shadow-red-500/30">
                
                {product.discount}
              </Badge>
            </motion.div>}
          
          {images.length > 1 && <>
              <button onClick={nextImage} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95">
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <button onClick={prevImage} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95">
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            </>}
        </div>
        
        {/* Image Indicators */}
        <div className="flex gap-2 justify-center py-4">
          {images.map((_, idx) => <button key={idx} onClick={() => setSelectedImage(idx)} className={`transition-all duration-300 ${selectedImage === idx ? "w-8 h-2 bg-primary rounded-full" : "w-2 h-2 bg-muted-foreground/30 rounded-full hover:bg-muted-foreground/50"}`} />)}
        </div>
        
        {/* Image Thumbnails */}
        <div className="flex gap-2 justify-center pb-4 px-4">
          {images.map((img, idx) => <motion.button key={idx} onClick={() => setSelectedImage(idx)} whileHover={{
          scale: 1.05
        }} whileTap={{
          scale: 0.95
        }} className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-300 ${selectedImage === idx ? "border-primary ring-4 ring-primary/20 shadow-lg" : "border-border/50 opacity-60 hover:opacity-100"}`}>
              <img src={img} alt="" className="w-full h-full object-cover" />
            </motion.button>)}
        </div>
      </div>

      {/* Product Info Card */}
      <motion.div className="mx-4 -mt-2 relative p-[2px] rounded-3xl overflow-hidden" style={{
      background: 'linear-gradient(135deg, #1E5799, #7DB9E8, #4ECDC4)'
    }} initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: 0.1
    }}>
        <div className="bg-card rounded-3xl overflow-hidden">
          {/* Title & Price Section */}
          <div className="p-5 border-b border-border">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <h1 className="text-xl font-bold text-foreground font-jakarta leading-tight">{product.name}</h1>
                <p className="text-sm text-muted-foreground font-jakarta mt-1">{product.subtitle}</p>
              </div>
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full" style={{
              background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #4ECDC4, #7DB9E8) border-box',
              border: '1.5px solid transparent'
            }}>
                <Star className="w-4 h-4 fill-[#4ECDC4] text-[#4ECDC4]" />
                <span className="font-bold text-foreground font-jakarta text-sm">{product.rating}</span>
              </div>
            </div>
            
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black bg-clip-text text-transparent font-jakarta" style={{
              backgroundImage: 'linear-gradient(135deg, #1E5799, #4ECDC4)'
            }}>
                ₪{product.price}
              </span>
              {product.originalPrice && <span className="text-base text-muted-foreground line-through font-jakarta">₪{product.originalPrice}</span>}
            </div>
            
            {/* Delivery Info Pills */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-full font-medium text-foreground" style={{
              background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #4ECDC4, #7DB9E8) border-box',
              border: '1px solid transparent'
            }}>
                <Truck className="w-3.5 h-3.5 text-[#4ECDC4]" />
                <span className="font-jakarta">משלוח חינם מעל ₪199</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-full font-medium text-foreground" style={{
              background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #1E5799, #7DB9E8) border-box',
              border: '1px solid transparent'
            }}>
                <Clock className="w-3.5 h-3.5 text-[#1E5799]" />
                <span className="font-jakarta">2-4 ימי עסקים</span>
              </div>
            </div>
          </div>

          {/* Variant Selectors - Only show if there are flavors */}
          {productFlavors.length > 0 && (
            <div className="p-5 border-b border-border space-y-5">
              <div>
                <label className="text-sm font-bold mb-3 block text-foreground font-jakarta">טעם</label>
                <div className="flex gap-2 flex-wrap">
                  {productFlavors.map(variant => (
                    <motion.button 
                      key={variant} 
                      onClick={() => setSelectedVariant(variant)} 
                      whileHover={{ scale: 1.02 }} 
                      whileTap={{ scale: 0.98 }} 
                      className={`px-4 py-2.5 rounded-xl text-sm font-jakarta transition-all duration-200 ${selectedVariant === variant ? "text-foreground font-bold" : "bg-muted text-muted-foreground hover:bg-muted/80"}`} 
                      style={selectedVariant === variant ? {
                        background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #1E5799, #7DB9E8, #4ECDC4) border-box',
                        border: '2px solid transparent'
                      } : {}}
                    >
                      {selectedVariant === variant && <Check className="w-3.5 h-3.5 inline-block ml-1 text-[#4ECDC4]" />}
                      {variant}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Key Benefits */}
          <div className="p-5 border-b border-border">
            <h3 className="text-base font-bold mb-4 text-foreground font-jakarta">למה חיית המחמד שלך תאהב את זה</h3>
            <div className="grid grid-cols-2 gap-3">
              {benefits.map((benefit, idx) => {
                const Icon = benefit.icon;
                return (
                  <motion.div 
                    key={idx} 
                    className="flex items-center gap-3 p-3 rounded-xl" 
                    style={{
                      background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #1E5799, #7DB9E8, #4ECDC4) border-box',
                      border: '1.5px solid transparent'
                    }} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.2 + idx * 0.05 }}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{
                      background: 'linear-gradient(135deg, #1E5799, #4ECDC4)'
                    }}>
                      <Icon className="w-4 h-4 text-white" />
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
              <AccordionItem value="description" className="border-0 bg-muted rounded-xl px-4">
                <AccordionTrigger className="font-jakarta text-sm font-bold text-foreground hover:no-underline py-4">
                  תיאור מלא
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground font-jakarta leading-relaxed pb-4">
                  {product.description}
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="ingredients" className="border-0 bg-secondary rounded-xl px-4">
                <AccordionTrigger className="font-jakarta text-sm font-bold text-foreground hover:no-underline py-4">
                  רכיבים וערכים תזונתיים
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground font-jakarta space-y-2 pb-4">
                  <p><strong className="text-foreground">רכיבים עיקריים:</strong> עוף (30%), אורז (25%), ירקות (15%), ויטמינים ומינרלים חיוניים</p>
                  <p><strong className="text-foreground">ערך תזונתי:</strong> חלבון 28%, שומן 15%, סיבים 3%, לחות 10%</p>
                  <p><strong className="text-foreground">ללא:</strong> חומרים משמרים, צבעים או טעמים מלאכותיים</p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="usage" className="border-0 bg-secondary rounded-xl px-4">
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
              
              <AccordionItem value="shipping" className="border-0 bg-secondary rounded-xl px-4">
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
        </div>
      </motion.div>

      {/* Price Alert Button */}
      {id && (
        <motion.div className="mx-4 mt-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <PriceAlertButton 
            productId={id} 
            currentPrice={product.price} 
            productName={product.name}
          />
        </motion.div>
      )}

      {/* Reviews Section - Using ProductReviews Component */}
      {id && (
        <motion.div className="mx-4 mt-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <ProductReviews productId={id} />
        </motion.div>
      )}

      {/* Recommended Products - Horizontal Carousel */}
      <motion.div className="mt-4 mb-6" initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: 0.5
    }}>
        <h3 className="text-base font-bold mb-4 text-foreground font-jakarta mx-4">לקוחות גם קנו</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 px-4 hide-scrollbar">
          {relatedProducts.map((item, idx) => <motion.div key={item.id} initial={{
          opacity: 0,
          scale: 0.95
        }} animate={{
          opacity: 1,
          scale: 1
        }} transition={{
          delay: 0.5 + idx * 0.05
        }} whileHover={{
          scale: 1.02
        }} whileTap={{
          scale: 0.98
        }} className="relative p-[1.5px] rounded-2xl cursor-pointer group flex-shrink-0 w-36" style={{
          background: 'linear-gradient(135deg, #1E5799, #7DB9E8, #4ECDC4)'
        }} onClick={() => navigate(`/product/${item.id}`)}>
              <div className="bg-card rounded-2xl overflow-hidden h-full transition-all group-hover:shadow-lg">
                <div className="aspect-square bg-gradient-to-br from-muted to-card overflow-hidden">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-2.5 bg-card">
                  <h4 className="font-bold text-xs text-foreground font-jakarta mb-1 truncate">{item.name}</h4>
                  <p className="text-sm font-black bg-clip-text text-transparent font-jakarta" style={{
                backgroundImage: 'linear-gradient(135deg, #1E5799, #4ECDC4)'
              }}>
                    ₪{item.price}
                  </p>
                </div>
              </div>
            </motion.div>)}
        </div>
      </motion.div>

      {/* Trust Section */}
      <motion.div className="mx-4 mb-14 relative p-[2px] rounded-2xl overflow-hidden" style={{
      background: 'linear-gradient(135deg, #1E5799, #7DB9E8, #4ECDC4)'
    }} initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: 0.6
    }}>
        <div className="bg-card rounded-2xl p-5">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-card shadow-md flex items-center justify-center mb-2" style={{
              boxShadow: '0 0 0 2px #4ECDC4'
            }}>
                <Shield className="w-5 h-5 text-[#4ECDC4]" />
              </div>
              <p className="text-xs font-bold text-foreground font-jakarta">תשלום מאובטח</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-card shadow-md flex items-center justify-center mb-2" style={{
              boxShadow: '0 0 0 2px #7DB9E8'
            }}>
                <Truck className="w-5 h-5 text-[#7DB9E8]" />
              </div>
              <p className="text-xs font-bold text-foreground font-jakarta">משלוח מהיר</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-card shadow-md flex items-center justify-center mb-2" style={{
              boxShadow: '0 0 0 2px #1E5799'
            }}>
                <PackageCheck className="w-5 h-5 text-[#1E5799]" />
              </div>
              <p className="text-xs font-bold text-foreground font-jakarta">החזרות קלות</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Sticky Bottom CTA - positioned above BottomNav */}
      <motion.div 
        className="fixed left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border/50 p-4 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]" 
        style={{ bottom: '70px' }}
        initial={{ y: 100 }} 
        animate={{ y: 0 }} 
        transition={{
          delay: 0.3,
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
      >
        {/* Background extension to fill gap */}
        <div className="absolute -bottom-20 left-0 right-0 h-20 bg-background" />
        <div className="max-w-lg mx-auto">
          {/* Quantity & Total */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-foreground font-jakarta">כמות:</span>
              <div className="flex items-center rounded-xl" style={{
              background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #1E5799, #7DB9E8, #4ECDC4) border-box',
              border: '2px solid transparent'
            }}>
                <Button variant="ghost" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-9 w-9 rounded-xl hover:bg-muted">
                  <Minus className="w-4 h-4 text-foreground" />
                </Button>
                <motion.span key={quantity} initial={{
                scale: 1.2
              }} animate={{
                scale: 1
              }} className="w-10 text-center text-base font-bold text-foreground font-jakarta">
                  {quantity}
                </motion.span>
                <Button variant="ghost" size="icon" onClick={() => setQuantity(quantity + 1)} className="h-9 w-9 rounded-xl hover:bg-muted">
                  <Plus className="w-4 h-4 text-foreground" />
                </Button>
              </div>
            </div>
            <div className="text-left">
              <p className="text-xs text-muted-foreground font-jakarta">סה״כ</p>
              <motion.p key={quantity} initial={{
              scale: 1.1
            }} animate={{
              scale: 1
            }} className="text-xl font-black bg-clip-text text-transparent font-jakarta" style={{
              backgroundImage: 'linear-gradient(135deg, #1E5799, #4ECDC4)'
            }}>
                ₪{(product.price * quantity).toFixed(2)}
              </motion.p>
            </div>
          </div>

          {/* Flagged product warning */}
          {product.isFlagged && (
            <div className="flex items-center gap-2 p-3 mb-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
              <Flag className="w-4 h-4 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">מוצר זה נמצא בבדיקה</p>
                <p className="text-xs text-red-600">לא ניתן לרכוש עד לסיום הטיפול</p>
              </div>
            </div>
          )}

            <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="lg" 
              className="flex-1 rounded-xl font-bold font-jakarta h-12 text-foreground" 
              style={{
                background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #1E5799, #7DB9E8, #4ECDC4) border-box',
                border: '2px solid transparent'
              }} 
              onClick={handleAddToCart}
              disabled={product.isFlagged}
            >
              {product.isFlagged ? (
                <>
                  <Flag className="w-4 h-4 ml-2" />
                  מוצר בבדיקה
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 ml-2" />
                  הוסף לעגלה
                </>
              )}
            </Button>
            <Button 
              size="lg" 
              className="flex-1 text-white rounded-xl font-bold font-jakarta shadow-lg h-12" 
              style={{
                background: product.isFlagged ? '#ccc' : 'linear-gradient(135deg, #1E5799, #4ECDC4)'
              }} 
              onClick={handleBuyNow}
              disabled={product.isFlagged}
            >
              {product.isFlagged ? 'לא זמין' : 'קנה עכשיו'}
            </Button>
          </div>
        </div>
      </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProductDetail;
