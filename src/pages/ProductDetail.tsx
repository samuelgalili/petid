import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowRight, Heart, Share2, ShoppingCart, Star, Plus, Minus, 
  ChevronLeft, ChevronRight, Check, Truck, Shield, PackageCheck, 
  Clock, Loader2, Flag, AlertTriangle, Leaf, FlaskConical, Utensils,
  WheatOff, Beef, Sparkles, Dog, Baby, Scale, Droplets, ShieldCheck,
  Calculator
} from "lucide-react";
import { ProductReviews } from "@/components/shop/ProductReviews";
import { PriceAlertButton } from "@/components/shop/PriceAlertButton";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

// ── Helpers ──────────────────────────────────────────────

const formatProductDescription = (text: string) => {
  if (!text) return null;
  const lines = text
    .replace(/\.\s+/g, '.\n')
    .replace(/\s{2,}/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  if (lines.length <= 1 && text.length < 200) return <p>{text.trim()}</p>;
  return lines.map((line, i) => (
    <p key={i} className={line.startsWith('•') || line.startsWith('-') || line.startsWith('*') ? 'pr-2' : ''}>{line}</p>
  ));
};

const getNumericPrice = (price: string | number): number => {
  if (typeof price === 'number') return price;
  return parseFloat(price.replace(/[₪,]/g, '')) || 0;
};

/** Derive quick-feature badges from product data */
const deriveQuickFeatures = (product: any) => {
  const features: { icon: React.ReactNode; label: string }[] = [];
  const text = `${product.name || ''} ${product.description || ''} ${(product.special_diet || []).join(' ')}`.toLowerCase();

  if (text.includes('ללא חיטה') || text.includes('wheat free') || text.includes('grain free') || text.includes('ללא דגנים'))
    features.push({ icon: <WheatOff className="w-4 h-4" />, label: 'ללא חיטה' });
  if (text.includes('חלבון גבוה') || text.includes('high protein') || /חלבון.{0,10}2[5-9]|3[0-9]/.test(text))
    features.push({ icon: <Beef className="w-4 h-4" />, label: 'עשיר בחלבון' });
  if (text.includes('בררנ') || text.includes('picky'))
    features.push({ icon: <Sparkles className="w-4 h-4" />, label: 'לבררנים' });
  if (text.includes('עור') || text.includes('פרווה') || text.includes('skin') || text.includes('coat'))
    features.push({ icon: <Droplets className="w-4 h-4" />, label: 'עור ופרווה' });
  if (text.includes('עיכול') || text.includes('digest'))
    features.push({ icon: <ShieldCheck className="w-4 h-4" />, label: 'תמיכה בעיכול' });
  if (product.life_stage)
    features.push({ icon: product.life_stage.includes('גור') ? <Baby className="w-4 h-4" /> : <Dog className="w-4 h-4" />, label: product.life_stage });
  if (product.dog_size)
    features.push({ icon: <Scale className="w-4 h-4" />, label: product.dog_size });
  
  return features.slice(0, 6);
};

/** Parse feeding guide to find recommended amount for a given weight */
const calcFeeding = (feedingGuide: any[], weightKg: number): string | null => {
  if (!feedingGuide || feedingGuide.length === 0 || !weightKg) return null;
  for (const row of feedingGuide) {
    const rangeStr = row.range || '';
    // Try to extract numbers from range like "1-5 ק"ג" or "עד 5 ק"ג" or "5-10 ק"ג"
    const nums = rangeStr.match(/[\d.]+/g);
    if (!nums) continue;
    const low = parseFloat(nums[0]);
    const high = nums.length > 1 ? parseFloat(nums[1]) : low;
    if (weightKg >= low && weightKg <= high) return row.amount;
    if (nums.length === 1 && weightKg <= high) return row.amount;
  }
  // If weight exceeds all ranges, return last entry
  return feedingGuide[feedingGuide.length - 1]?.amount || null;
};

/** Parse analytical components from ingredients text */
const parseAnalysis = (product: any) => {
  const text = product.ingredients || product.description || '';
  const items: { label: string; value: string }[] = [];
  
  const patterns = [
    { label: 'חלבון גולמי', regex: /חלבון\s*(?:גולמי)?\s*[-–]\s*([\d.]+%)/i },
    { label: 'שומן גולמי', regex: /שומן\s*(?:גולמי)?\s*[-–]\s*([\d.]+%)/i },
    { label: 'אפר גולמי', regex: /אפר\s*(?:גולמי)?\s*[-–]\s*([\d.]+%)/i },
    { label: 'סיבים גולמיים', regex: /סיבים\s*(?:גולמיים)?\s*[-–]\s*([\d.]+%)/i },
    { label: 'סידן', regex: /סידן\s*[-–]\s*([\d.]+%)/i },
    { label: 'זרחן', regex: /זרחן\s*[-–]\s*([\d.]+%)/i },
    { label: 'אומגה 3', regex: /אומגה\s*3\s*[-–]\s*([\d.]+%)/i },
    { label: 'אומגה 6', regex: /אומגה\s*6\s*[-–]\s*([\d.]+%)/i },
  ];

  for (const p of patterns) {
    const match = text.match(p.regex);
    if (match) items.push({ label: p.label, value: match[1] });
  }

  // Also check product_attributes
  if (product.product_attributes && typeof product.product_attributes === 'object') {
    for (const [key, value] of Object.entries(product.product_attributes)) {
      const k = key.toLowerCase();
      if ((k.includes('חלבון') || k.includes('שומן') || k.includes('סיבים') || k.includes('אפר')) && !items.find(i => i.label.includes(key))) {
        items.push({ label: key, value: String(value) });
      }
    }
  }
  return items;
};

/** Extract vitamins from ingredients */
const parseVitamins = (product: any) => {
  const text = product.ingredients || product.description || '';
  const items: { name: string; amount: string }[] = [];
  // Match patterns like "ויטמין A – 15,000 יחב"ל" or "ביוטין – 0.23 מ"ג"
  const regex = /(ויטמין\s*[A-Za-zא-ת₁₂₃₄₅₆₇₈₉₀]+|ניאצין|ביוטין|כולין\s*כלוריד|חומצה\s*פולית|סידן\s*D?\s*פנטותנט)\s*[-–]\s*([\d,.]+\s*(?:יחב"ל|מ"ג|מ״ג|IU))/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    items.push({ name: match[1].trim(), amount: match[2].trim() });
  }
  return items;
};

// ── Component ──────────────────────────────────────────

const ProductDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { addToCart, getTotalItems, cartShake } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("price");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [dogWeight, setDogWeight] = useState<string>("");
  const touchStartX = useRef(0);

  // ── Data Fetching ──
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

  const rawProduct = dbProduct || location.state?.product || null;
  const productFlavors: string[] = rawProduct?.flavors || [];

  useEffect(() => {
    if (productFlavors.length > 0 && !selectedVariant) setSelectedVariant(productFlavors[0]);
  }, [productFlavors, selectedVariant]);

  const product = rawProduct ? {
    ...rawProduct,
    name: rawProduct.name,
    subtitle: rawProduct.description || rawProduct.subtitle || "",
    image: rawProduct.image_url || rawProduct.image,
    price: getNumericPrice(rawProduct.price),
    originalPrice: rawProduct.original_price ? getNumericPrice(rawProduct.original_price) : (rawProduct.originalPrice ? getNumericPrice(rawProduct.originalPrice) : null),
    discount: rawProduct.original_price || rawProduct.originalPrice
      ? `${Math.round((1 - getNumericPrice(rawProduct.price) / getNumericPrice(rawProduct.original_price || rawProduct.originalPrice)) * 100)}% הנחה`
      : null,
    rating: rawProduct.rating || 4.5,
    reviewCount: rawProduct.reviewCount || 0,
    isFlagged: rawProduct.is_flagged || false,
    flaggedReason: rawProduct.flagged_reason,
  } : null;

  const { data: relatedProducts = [] } = useQuery({
    queryKey: ["related-products", id],
    queryFn: async () => {
      const { data: bp } = await supabase
        .from("business_products")
        .select("id, name, price, image_url")
        .neq("id", id || "")
        .limit(4);
      if (bp && bp.length > 0) {
        return bp.map(p => ({ id: p.id, name: p.name, price: typeof p.price === 'string' ? parseFloat(p.price) : p.price, image: p.image_url || "/placeholder.svg" }));
      }
      const { data: sp } = await supabase
        .from("scraped_products")
        .select("id, product_name, final_price, main_image_url")
        .neq("id", id || "")
        .limit(4);
      if (sp && sp.length > 0) {
        return sp.map(p => ({ id: p.id, name: p.product_name, price: p.final_price || 0, image: p.main_image_url || "/placeholder.svg" }));
      }
      return [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const images = rawProduct
    ? ((rawProduct.images && rawProduct.images.length > 0) ? rawProduct.images : (rawProduct.image_url ? [rawProduct.image_url] : (rawProduct.image ? [rawProduct.image] : ["/placeholder.svg"])))
    : ["/placeholder.svg"];

  // ── Derived Data ──
  const quickFeatures = useMemo(() => product ? deriveQuickFeatures(product) : [], [product]);
  const analysisData = useMemo(() => product ? parseAnalysis(product) : [], [product]);
  const vitaminsData = useMemo(() => product ? parseVitamins(product) : [], [product]);
  const feedingResult = useMemo(() => {
    if (!product?.feeding_guide || !dogWeight) return null;
    return calcFeeding(product.feeding_guide, parseFloat(dogWeight));
  }, [product?.feeding_guide, dogWeight]);

  // Price per kg
  const pricePerKg = useMemo(() => {
    if (!product) return null;
    const text = `${product.name || ''} ${product.description || ''}`;
    const weightMatch = text.match(/([\d.]+)\s*(?:ק"ג|קג|kg)/i);
    if (weightMatch) {
      const w = parseFloat(weightMatch[1]);
      if (w > 0) return (product.price / w).toFixed(1);
    }
    return null;
  }, [product]);

  // ── Early Returns ──
  if (!isLoading && !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4" dir="rtl">
        <p className="text-muted-foreground">המוצר לא נמצא</p>
        <Button onClick={() => navigate(-1)}>חזרה</Button>
      </div>
    );
  }

  // ── Handlers ──
  const handleAddToCart = () => {
    addToCart({ id: `${product.name}-${selectedVariant || 'default'}`, name: product.name, price: product.price, image: product.image, quantity, variant: selectedVariant || undefined });
    toast({ title: "נוסף לעגלה 🛒", description: `${product.name} x${quantity} נוסף בהצלחה` });
  };
  const handleBuyNow = () => { handleAddToCart(); navigate("/cart"); };
  const toggleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    toast({ title: isWishlisted ? "הוסר מהמועדפים" : "נוסף למועדפים ❤️", description: isWishlisted ? `${product.name} הוסר` : `${product.name} נשמר למועדפים` });
  };
  const nextImage = () => setSelectedImage(p => (p + 1) % images.length);
  const prevImage = () => setSelectedImage(p => (p - 1 + images.length) % images.length);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? nextImage() : prevImage(); }
  };

  const handleReportIssue = async () => {
    setIsReporting(true);
    try {
      const { error } = await supabase.from('content_reports').insert({
        content_type: 'product', content_id: id || 'unknown', reason: reportReason,
        description: reportDetails || `דיווח על ${reportReason === 'price' ? 'מחיר שגוי' : reportReason === 'image' ? 'תמונה לא מתאימה' : reportReason === 'description' ? 'תיאור שגוי' : 'בעיה אחרת'}`,
        reporter_id: user?.id || '00000000-0000-0000-0000-000000000000',
      });
      if (error) throw error;
      toast({ title: "תודה על הדיווח! 🙏", description: "הדיווח התקבל ויטופל בהקדם" });
      setReportDialogOpen(false); setReportReason("price"); setReportDetails("");
    } catch (error) {
      toast({ title: "שגיאה בשליחת הדיווח", description: "אנא נסה שוב מאוחר יותר", variant: "destructive" });
    } finally { setIsReporting(false); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Check if we have nutrition tab data ──
  const hasIngredients = !!product.ingredients;
  const hasBenefits = product.benefits && Array.isArray(product.benefits) && product.benefits.length > 0;
  const hasFeedingGuide = product.feeding_guide && Array.isArray(product.feeding_guide) && product.feeding_guide.length > 0;
  const hasAnalysis = analysisData.length > 0;
  const hasVitamins = vitaminsData.length > 0;
  const hasNutritionData = hasIngredients || hasAnalysis || hasVitamins;

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

        {/* ── Header ── */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="flex items-center justify-between px-4 py-3">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted w-10 h-10" onClick={() => navigate(-1)}>
              <ArrowRight className="w-5 h-5 text-foreground" />
            </Button>
            <h1 className="text-base font-bold text-foreground">פרטי מוצר</h1>
            <div className="flex items-center gap-1">
              <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 text-muted-foreground hover:text-destructive">
                    <Flag className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md" dir="rtl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-right">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      דיווח על תקלה
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">מצאת משהו שלא נראה נכון? ספר לנו ונטפל בזה</p>
                    <RadioGroup value={reportReason} onValueChange={setReportReason} className="space-y-3">
                      {[
                        { value: "price", label: "מחיר שגוי", desc: "המחיר לא נכון או שהמבצע לא אמיתי" },
                        { value: "image", label: "תמונה לא מתאימה", desc: "התמונה לא מייצגת את המוצר" },
                        { value: "description", label: "תיאור שגוי", desc: "המידע על המוצר לא מדויק" },
                        { value: "other", label: "בעיה אחרת", desc: "משהו אחר שצריך לתקן" },
                      ].map(r => (
                        <div key={r.value} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                          <RadioGroupItem value={r.value} id={r.value} />
                          <Label htmlFor={r.value} className="flex-1 cursor-pointer">
                            <span className="font-medium">{r.label}</span>
                            <p className="text-xs text-muted-foreground">{r.desc}</p>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    <Textarea placeholder="פרטים נוספים (אופציונלי)..." value={reportDetails} onChange={e => setReportDetails(e.target.value)} className="min-h-[80px] resize-none" />
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <DialogClose asChild><Button variant="outline" className="rounded-xl">ביטול</Button></DialogClose>
                    <Button onClick={handleReportIssue} disabled={isReporting} className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2">
                      {isReporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                      שלח דיווח
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="icon" className="rounded-full w-10 h-10" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "הקישור הועתק", description: "קישור למוצר הועתק ללוח" }); }}>
                <Share2 className="w-5 h-5 text-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className={`rounded-full w-10 h-10 transition-all duration-300 ${isWishlisted ? 'text-red-500 scale-110' : 'text-foreground'}`} onClick={toggleWishlist}>
                <Heart className={`w-5 h-5 transition-all duration-300 ${isWishlisted ? 'fill-current' : ''}`} />
              </Button>
              <motion.div animate={cartShake ? { rotate: [0, -10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.5 }}>
                <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 relative overflow-visible" onClick={() => navigate("/cart")}>
                  <ShoppingCart className="w-5 h-5 text-foreground" />
                  <AnimatePresence>
                    {getTotalItems() > 0 && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 bg-primary text-primary-foreground text-[11px] font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-background z-10">
                        {getTotalItems() > 9 ? '9+' : getTotalItems()}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </div>
          </div>
        </header>

        {/* ── Product Image Gallery ── */}
        <div className="relative bg-gradient-to-b from-muted/30 to-background">
          <div className="aspect-square max-w-md mx-auto relative overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <AnimatePresence mode="wait">
              <motion.img key={selectedImage} src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }} />
            </AnimatePresence>
            {product.discount && (
              <motion.div className="absolute top-4 left-4" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                <Badge className="bg-destructive text-destructive-foreground font-bold px-3 py-1.5 rounded-full text-sm shadow-lg">{product.discount}</Badge>
              </motion.div>
            )}
            {images.length > 1 && <>
              <button onClick={nextImage} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 hover:bg-background rounded-full flex items-center justify-center shadow-lg transition-all"><ChevronLeft className="w-5 h-5 text-foreground" /></button>
              <button onClick={prevImage} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 hover:bg-background rounded-full flex items-center justify-center shadow-lg transition-all"><ChevronRight className="w-5 h-5 text-foreground" /></button>
            </>}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 justify-center py-3 px-4">
              {images.map((img, idx) => (
                <motion.button key={idx} onClick={() => setSelectedImage(idx)} whileTap={{ scale: 0.95 }} className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all duration-300 ${selectedImage === idx ? "border-primary ring-2 ring-primary/20" : "border-border/30 opacity-60 hover:opacity-100"}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* ── Product Info Card ── */}
        <motion.div className="mx-4 -mt-2 relative" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="overflow-hidden border-border/50">
            {/* Brand + Title + Price */}
            <div className="p-5">
              {product.brand && (
                <span className="text-xs font-bold text-primary uppercase tracking-wider">{product.brand}</span>
              )}
              <h1 className="text-xl font-bold text-foreground leading-tight mt-1">{product.name}</h1>
              
              {/* Rating + Price Per Kg */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-4 h-4 fill-warning text-warning" />
                  <span className="font-bold text-foreground">{product.rating}</span>
                </div>
                {pricePerKg && (
                  <Badge variant="secondary" className="text-xs font-medium">
                    ₪{pricePerKg} / ק״ג
                  </Badge>
                )}
                {product.life_stage && <Badge variant="outline" className="text-xs">{product.life_stage}</Badge>}
                {product.dog_size && <Badge variant="outline" className="text-xs">{product.dog_size}</Badge>}
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 mt-3">
                <span className="text-3xl font-black text-primary">₪{product.price}</span>
                {product.originalPrice && <span className="text-base text-muted-foreground line-through">₪{product.originalPrice}</span>}
              </div>
            </div>

            {/* ── Quick Features Row ── */}
            {quickFeatures.length > 0 && (
              <div className="px-5 pb-4">
                <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                  {quickFeatures.map((f, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20"
                    >
                      {f.icon}
                      <span>{f.label}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Special Diet Tags */}
            {product.special_diet?.length > 0 && (
              <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                {product.special_diet.map((tag: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-[10px] border-accent/50 text-accent-foreground">{tag}</Badge>
                ))}
              </div>
            )}

            {/* Delivery info */}
            <div className="flex items-center gap-2 px-5 pb-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-full bg-muted text-muted-foreground border border-border/50">
                <Truck className="w-3.5 h-3.5 text-primary" />
                <span>משלוח חינם מעל ₪199</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-full bg-muted text-muted-foreground border border-border/50">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>2-4 ימי עסקים</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Flavor Selector ── */}
        {productFlavors.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <Card className="p-4">
              <label className="text-sm font-bold mb-3 block text-foreground">טעם</label>
              <div className="flex gap-2 flex-wrap">
                {productFlavors.map(v => (
                  <button key={v} onClick={() => setSelectedVariant(v)} className={`px-4 py-2 rounded-xl text-sm transition-all ${selectedVariant === v ? "bg-primary text-primary-foreground font-bold shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {selectedVariant === v && <Check className="w-3.5 h-3.5 inline-block ml-1" />}
                    {v}
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Feeding Calculator ── */}
        {hasFeedingGuide && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-4 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-primary" />
                מחשבון מנת האכלה
              </h3>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">משקל הכלב (ק״ג)</Label>
                  <Input
                    type="number"
                    placeholder="לדוגמה: 5"
                    value={dogWeight}
                    onChange={e => setDogWeight(e.target.value)}
                    className="h-11 text-base"
                    min="0.5"
                    max="100"
                    step="0.5"
                  />
                </div>
                <div className="flex-1">
                  <AnimatePresence mode="wait">
                    {feedingResult ? (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center"
                      >
                        <p className="text-[10px] text-muted-foreground">כמות יומית מומלצת</p>
                        <p className="text-lg font-black text-primary mt-0.5">{feedingResult}</p>
                      </motion.div>
                    ) : (
                      <motion.div key="empty" className="bg-muted/50 rounded-xl p-3 text-center border border-border/30">
                        <p className="text-xs text-muted-foreground">הזן משקל לחישוב</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Nutrition Tabs ── */}
        {hasNutritionData && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="overflow-hidden">
              <div className="p-4 pb-0">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                  <FlaskConical className="w-4 h-4 text-primary" />
                  מידע תזונתי
                </h3>
              </div>
              <Tabs defaultValue={hasAnalysis ? "analysis" : hasIngredients ? "ingredients" : "vitamins"} className="w-full">
                <div className="px-4 overflow-x-auto hide-scrollbar">
                  <TabsList className="bg-muted/50 p-1 rounded-xl w-full justify-start">
                    {hasAnalysis && <TabsTrigger value="analysis" className="text-xs rounded-lg flex-1">ניתוח תזונתי</TabsTrigger>}
                    {hasIngredients && <TabsTrigger value="ingredients" className="text-xs rounded-lg flex-1">רכיבים</TabsTrigger>}
                    {hasVitamins && <TabsTrigger value="vitamins" className="text-xs rounded-lg flex-1">ויטמינים</TabsTrigger>}
                  </TabsList>
                </div>

                {hasAnalysis && (
                  <TabsContent value="analysis" className="px-4 pb-4 mt-0">
                    <div className="rounded-xl overflow-hidden border border-border mt-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/60">
                            <th className="text-right p-3 font-bold text-foreground text-xs">רכיב</th>
                            <th className="text-right p-3 font-bold text-foreground text-xs">ערך</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysisData.map((item, i) => (
                            <tr key={i} className="border-t border-border/50">
                              <td className="p-3 text-muted-foreground text-xs">{item.label}</td>
                              <td className="p-3 text-foreground font-semibold text-xs">{item.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                )}

                {hasIngredients && (
                  <TabsContent value="ingredients" className="px-4 pb-4 mt-0">
                    <div className="mt-3 bg-muted/30 rounded-xl p-4 text-[13px] text-muted-foreground leading-[1.8]">
                      {product.ingredients}
                    </div>
                  </TabsContent>
                )}

                {hasVitamins && (
                  <TabsContent value="vitamins" className="px-4 pb-4 mt-0">
                    <div className="mt-3 space-y-1.5">
                      {vitaminsData.map((v, i) => (
                        <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 text-xs">
                          <span className="text-foreground font-medium">{v.name}</span>
                          <span className="text-muted-foreground">{v.amount}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </Card>
          </motion.div>
        )}

        {/* ── Health Benefits ── */}
        {hasBenefits && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Leaf className="w-4 h-4 text-primary" />
                יתרונות בריאותיים
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {product.benefits.map((b: any, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="bg-gradient-to-l from-primary/5 to-transparent rounded-xl p-3.5 border border-primary/10"
                  >
                    <p className="text-[13px] font-bold text-foreground mb-1">{b.title}</p>
                    <p className="text-[12px] text-muted-foreground leading-[1.7]">{b.description}</p>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Description ── */}
        {(product.subtitle || product.description) && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold mb-3 text-foreground flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-primary" />
                אודות המוצר
              </h3>
              <div className="text-[13px] text-muted-foreground leading-[1.8] space-y-2">
                {formatProductDescription(product.description || product.subtitle)}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Price Alert ── */}
        {id && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <PriceAlertButton productId={id} currentPrice={product.price} productName={product.name} />
          </motion.div>
        )}

        {/* ── Reviews ── */}
        {id && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <ProductReviews productId={id} />
          </motion.div>
        )}

        {/* ── Related Products ── */}
        {relatedProducts.length > 0 && (
          <motion.div className="mt-4 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <h3 className="text-base font-bold mb-3 text-foreground mx-4">לקוחות גם קנו</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 px-4 hide-scrollbar">
              {relatedProducts.map((item, idx) => (
                <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + idx * 0.05 }} whileTap={{ scale: 0.98 }} className="flex-shrink-0 w-36 cursor-pointer" onClick={() => navigate(`/product/${item.id}`)}>
                  <Card className="overflow-hidden h-full">
                    <div className="aspect-square bg-muted overflow-hidden">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div className="p-2.5">
                      <h4 className="font-bold text-xs text-foreground mb-1 truncate">{item.name}</h4>
                      <p className="text-sm font-black text-primary">₪{item.price}</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Trust Section ── */}
        <motion.div className="mx-4 mb-14" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
          <Card className="p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { icon: <Shield className="w-5 h-5 text-primary" />, label: "תשלום מאובטח" },
                { icon: <Truck className="w-5 h-5 text-primary" />, label: "משלוח מהיר" },
                { icon: <PackageCheck className="w-5 h-5 text-primary" />, label: "החזרות קלות" },
              ].map((t, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">{t.icon}</div>
                  <p className="text-xs font-bold text-foreground">{t.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* ── Sticky Bottom CTA ── */}
        <motion.div 
          className="fixed left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border/50 p-4 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]" 
          style={{ bottom: '70px' }}
          initial={{ y: 100 }} animate={{ y: 0 }} transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="absolute -bottom-20 left-0 right-0 h-20 bg-background" />
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-foreground">כמות:</span>
                <div className="flex items-center rounded-xl border-2 border-primary/30 bg-background">
                  <Button variant="ghost" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-9 w-9 rounded-xl hover:bg-muted"><Minus className="w-4 h-4" /></Button>
                  <motion.span key={quantity} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="w-10 text-center text-base font-bold text-foreground">{quantity}</motion.span>
                  <Button variant="ghost" size="icon" onClick={() => setQuantity(quantity + 1)} className="h-9 w-9 rounded-xl hover:bg-muted"><Plus className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">סה״כ</p>
                <motion.p key={quantity} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="text-xl font-black text-primary">₪{(product.price * quantity).toFixed(2)}</motion.p>
              </div>
            </div>

            {product.isFlagged && (
              <div className="flex items-center gap-2 p-3 mb-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
                <Flag className="w-4 h-4 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">מוצר זה נמצא בבדיקה</p>
                  <p className="text-xs">לא ניתן לרכוש עד לסיום הטיפול</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="flex-1 rounded-xl font-bold h-12 border-2 border-primary/30" onClick={handleAddToCart} disabled={product.isFlagged}>
                {product.isFlagged ? <><Flag className="w-4 h-4 ml-2" />מוצר בבדיקה</> : <><ShoppingCart className="w-4 h-4 ml-2" />הוסף לעגלה</>}
              </Button>
              <Button size="lg" className="flex-1 rounded-xl font-bold h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg" onClick={handleBuyNow} disabled={product.isFlagged}>
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
