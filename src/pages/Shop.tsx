import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingBag, Plus, Minus, Heart, X, Search, Truck, Shield, Star, ChevronLeft, ChevronRight, Info, Loader2, Flag, PawPrint, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useFlyingCart } from "@/components/FlyingCartAnimation";
import { useToast } from "@/hooks/use-toast";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { SkeletonProductGrid } from "@/components/ui/enhanced-skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { MipoLogo } from "@/components/MipoLogo";

import { SubscribeAndSave } from "@/components/shop/SubscribeAndSave";
import { checkProductSafety, SafetyBadge } from "@/components/shop/ShopSafetyFilter";
import { useActivePet } from "@/hooks/useActivePet";
import { SlideToConfirm } from "@/components/shop/SlideToConfirm";
import { ProductInfoDrawer } from "@/components/shop/ProductInfoDrawer";
import { useCarePlan } from "@/hooks/useCarePlan";
import { createContentReport, getShopProducts } from "@/lib/mipoApi";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";
import { searchCatalogDetailed } from "@/lib/catalogSearch";

const asPrice = (value: number | string | null | undefined) => {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
};

const readStoredStrings = (key: string): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
};

// Used only when the categories endpoint is unavailable (an older API, or a
// network error). The live bar comes from the database - see categoryTabs.
/**
 * The three things offered at rest.
 *
 * They are questions rather than categories, and that is the point of the
 * screen: "צעצוע לתוכי" is a request a person makes; "צעצועים" is a shelf
 * they have to browse. Taken from the Main artboard verbatim.
 */
const RESTING_PROMPTS = ["הכלב שלי משיר הרבה", "אוכל יבש לגור", "צעצוע לתוכי"];

/** How many results one answer shows before it stops being an answer. */
const RESULT_LIMIT = 12;

/**
 * A query reads as a QUESTION rather than a lookup when it runs past three
 * words or ends in a question mark. That is the only moment the assistant is
 * offered - offering it on every keystroke makes it wallpaper.
 */
const readsAsQuestion = (query: string) => {
  const trimmed = query.trim();
  if (!trimmed) return false;
  return trimmed.split(/\s+/).filter(Boolean).length > 3 || trimmed.endsWith("?");
};

type ShopCardProduct = {
  id: string;
  name: string;
  description?: string | null;
  image: string;
  price: number;
  originalPrice?: number | null;
  isFlagged?: boolean | null;
};

// One card, used by both the category rows and the expanded grid. Defined out
// here rather than inside Shop so it is not a new component type on every
// render, which would remount every image in the shop.
const ShopProductCard = ({
  product,
  activePet,
  isFavorite,
  onToggleFavorite,
}: {
  product: ShopCardProduct;
  activePet: Parameters<typeof checkProductSafety>[1];
  isFavorite: boolean;
  onToggleFavorite: (productId: string, event: React.MouseEvent) => void;
}) => {
  const safety = checkProductSafety(`${product.name} ${product.description}`, activePet);

  return (
    /* 8px radius and a shadow UNDER a border: the card was from a different
       system than everything around it - MIPO's cards are 1.5rem, and the
       house rule is a thin line OR a shadow, never both. */
    <div className="group relative overflow-hidden rounded-3xl border border-mipo-line bg-mipo-surface transition-colors hover:bg-mipo-soft">
      {/* NOTHING IS PAINTED ON THE PRODUCT PHOTO BUT THE SAFETY MARK.
          The design canvas states the system in one line - "צבע מופיע בשני
          מקומות בלבד: טבעת סביב החיה, ונקודת סטטוס" - and this photo carried
          two more: a solid red discount pill and a filled white circle holding
          the favourite. Both are blocks, and a saturated fill with white text
          on it is the exact treatment the canvas rejects by name.

          Safety stays, because safety IS the second place: status, as
          information. */}
      <div className="relative aspect-square bg-mipo-soft">
        {safety.level !== "safe" && (
          <SafetyBadge level={safety.level} reason={safety.reason} compact />
        )}
        <OptimizedImage
          src={product.image}
          alt={product.name}
          className={`w-full h-full ${product.isFlagged ? "opacity-50" : ""} ${
            safety.level === "unsafe" ? "opacity-40 grayscale" : ""
          }`}
          objectFit="cover"
          sizes="(max-width: 639px) 128px, 160px"
        />
      </div>

      {/* The price is the number the decision is made on, so it is the
          largest thing here and it is ink - a coloured price competes with the
          name instead of outranking it. Two lines for the name, because one
          line truncated every product to an unrecognisable stub.

          The favourite sits here rather than over the photo, as a hairline
          circle at the same 44px as ShopRailCard's add button - which is what
          finally makes the two cards on this page one card. The discount
          percentage went with the red pill: the struck original beside the
          price already says it, and saying it twice is what put a third
          colour on a page that allows two. */}
      <div className="space-y-1 p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] leading-5 text-mipo-ink">
          {product.name}
        </h3>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-[17px] font-bold tabular-nums text-mipo-ink">₪{product.price}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs tabular-nums text-mipo-muted line-through">
                ₪{product.originalPrice}
              </span>
            )}
          </div>
          <button
            onClick={(event) => onToggleFavorite(product.id, event)}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-mipo-line transition-colors hover:bg-mipo-soft"
            aria-label={isFavorite ? "הסר ממועדפים" : "הוסף למועדפים"}
          >
            {/* Filled in ink when it is on. A red heart is a third meaning for
                colour on a page that has room for two. */}
            <Heart
              className={`w-4 h-4 ${isFavorite ? "fill-mipo-ink text-mipo-ink" : "text-mipo-muted"}`}
              strokeWidth={1.75}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

const Shop = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, getTotalItems, cartShake } = useCart();
  const { triggerFly, setCartIconPosition } = useFlyingCart();
  const { pet: activePet } = useActivePet();
  const { toast } = useToast();
  const { addToCarePlan } = useCarePlan(activePet?.id);
  const cartIconRef = useRef<HTMLButtonElement>(null);
  const productImageRef = useRef<HTMLDivElement>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [infoDrawerProduct, setInfoDrawerProduct] = useState<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [favorites, setFavorites] = useState<string[]>(() => readStoredStrings("mipo-favorites"));

  // Report dialog state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("price");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  const handleReportIssue = async () => {
    if (!selectedProduct) return;
    setIsReporting(true);
    try {
      await createContentReport({
        content_type: 'product',
        content_id: selectedProduct.id || 'unknown',
        reason: reportReason,
        description: reportDetails || `דיווח על ${reportReason === 'price' ? 'מחיר שגוי' : reportReason === 'image' ? 'תמונה לא מתאימה' : reportReason === 'description' ? 'תיאור שגוי' : 'בעיה אחרת'}`,
        reporter_id: user?.id || null,
      });

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
        description: "נסו שוב מאוחר יותר",
        variant: "destructive",
      });
    } finally {
      setIsReporting(false);
    }
  };

  const toggleFavorite = useCallback((productId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites(prev => {
      const newFavorites = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      localStorage.setItem("mipo-favorites", JSON.stringify(newFavorites));
      return newFavorites;
    });
    
    const isFavorite = favorites.includes(productId);
    toast({
      title: isFavorite ? "הוסר משמורים" : "נשמר",
      duration: 1500,
    });
  }, [favorites, toast]);

  // The product sheet's image carousel. It survived the rebuild because the
  // sheet did: only the browse-and-filter screen ABOVE it was replaced.
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;
    setCurrentImageIndex(carouselApi.selectedScrollSnap());
    carouselApi.on("select", () => {
      setCurrentImageIndex(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  // Fetch products from the AWS API backed by RDS.
  const { data: dbProducts = [], isLoading: isLoadingProducts, isFetching, isError: isProductsError } = useQuery({
    queryKey: ["shop-products-aws"],
    queryFn: async () => {
      const products = await getShopProducts();
      return products.filter((product) => product.in_stock !== false);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  });


  // Transform database products to the format expected by the UI
  const products = useMemo(() => {
    console.log("Transforming products, dbProducts count:", dbProducts.length);
    return dbProducts.map((p) => {
      const regularPrice = asPrice(p.price);
      const salePrice = asPrice(p.sale_price);
      const listedOriginalPrice = asPrice(p.original_price);
      const price = salePrice > 0 ? salePrice : regularPrice;
      const originalPrice = salePrice > 0 && regularPrice > salePrice
        ? regularPrice
        : listedOriginalPrice > price
          ? listedOriginalPrice
          : null;

      return {
        id: p.id,
        name: p.name,
        description: p.description || "",
        price,
        originalPrice,
        images: p.images?.length ? p.images : [p.image_url],
        image: p.image_url || "/placeholder.svg",
        inStock: p.in_stock ?? true,
        freeShipping: price >= FREE_SHIPPING_THRESHOLD,
        category: p.category_name || p.category,
        categoryId: p.category_id ?? null,
        petType: p.pet_type,
        // ─── carried for the search, not for the card ────────────────────────
        //
        // None of these six are rendered anywhere. They are here because the
        // search runs on THIS object rather than on the API's row, so a field
        // the transform drops is a field no shopper can find a product by.
        // lifeStage was missing exactly that way - a query saying "גור" matched
        // nothing - which is why a test now derives the searchable field list
        // from this block instead of trusting it to be complete.
        //
        // The three tag arrays keep the API's own spelling because nothing here
        // transforms them. Renaming a pass-through only creates a second name
        // for one thing, and a second name is what cost lifeStage.
        lifeStage: p.life_stage,
        dogSize: p.dog_size,
        benefits: p.benefits,
        special_diet: p.special_diet,
        medical_tags: p.medical_tags,
        breed_tags: p.breed_tags,
        isFlagged: p.is_flagged || false,
        flaggedReason: p.flagged_reason,
        flavors: p.flavors || [],
        safetyScore: p.safety_score ?? null,
        brand: p.brand || null,
        ingredients: p.ingredients || null,
        weightUnit: p.weight_unit || null,
      };
    });
  }, [dbProducts]);

  // Search suggestions based on query

  /**
   * The results, and nothing else decides them.
   *
   * This used to fold in a category filter, a deals toggle, a saved-items tab
   * and three sort orders, because the screen above it had a control for each.
   * None of those controls exist now: the shop asks one question and the
   * catalogue answers it, so the only thing between the query and the cards is
   * the query.
   *
   * THE MATCHING LIVES IN catalogSearch.ts, with the owner's own failing
   * queries as its tests. Two rounds of them: the ones he found in his first
   * minute ("מזון יבש לכלב" -> nothing), and the ones measuring the fix found
   * afterwards - all three of the chips below returned nothing at all.
   *
   * The DETAILED form is used rather than the plain one because the answer is
   * not only a list. A query can be answered by giving up a word the shop has
   * no product for, and when that happens the screen has to say so. A search
   * that quietly ignores a word somebody typed is telling them it was
   * understood.
   */
  const search = useMemo(
    () => searchCatalogDetailed(products, searchQuery),
    [products, searchQuery],
  );
  const filteredAndSortedProducts = search.results;

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    searchInputRef.current?.blur();
  }, []);

  const handleProductClick = useCallback((product: any) => {
    setSelectedProduct(product);
    setQuantity(1);
    setSelectedSize(null);
    setCurrentImageIndex(0);
    carouselApi?.scrollTo(0);
  }, [carouselApi]);

  const handleAddToCart = useCallback(() => {
    if (!selectedProduct) return;

    // Trigger flying animation
    if (productImageRef.current) {
      const rect = productImageRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      triggerFly(selectedProduct.image, centerX, centerY);
    }

    addToCart({
      productId: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedProduct.price,
      image: selectedProduct.image,
      quantity: quantity,
      variant: selectedSize || undefined,
    });

    toast({
      title: "נוסף לעגלה",
      description: `${selectedProduct.name}`,
      duration: 1500,
    });

    setSelectedProduct(null);
    setQuantity(1);
    setSelectedSize(null);
  }, [selectedProduct, quantity, addToCart, toast, selectedSize, triggerFly]);

  const increaseQuantity = useCallback(() => setQuantity(prev => prev + 1), []);
  const decreaseQuantity = useCallback(() => setQuantity(prev => Math.max(1, prev - 1)), []);

  // ─── what the one field is doing right now ─────────────────────────────────
  //
  // resting and hasQuery are the same fact stated twice on purpose: the pet
  // and the prompts appear while resting, the results appear once there is a
  // query, and reading both off one value is what keeps them from ever being
  // on screen together.
  const hasQuery = searchQuery.trim().length > 0;
  const resting = !hasQuery;
  const isQuestion = readsAsQuestion(searchQuery);

  const searchPlaceholder = activePet?.name
    ? `מה המשאלה היום של ${activePet.name}...`
    : "מה מחפשים היום...";

  /**
   * The line above the results, and what it owes the person who typed.
   *
   * "12 מוצרים" is true and useless when the answer is to a NARROWER question
   * than the one asked. If somebody types "צעצוע לתוכי" and this shop has no
   * parrot anything, showing toys under a plain count tells them the parrot
   * was understood. Naming the word that went unused is the difference between
   * a search that answered and a search that changed the subject.
   */
  const resultLine = (() => {
    // A negation that could not be honoured is its own message, and it comes
    // first. "אין לנו מזון ללא דגנים" is a different fact from "we found
    // nothing", and the shopper it matters to is the one whose animal is
    // allergic to the thing they just typed.
    if (search.unmet.length > 0) {
      return `אין לנו מוצר ללא ${search.unmet.join(" ")} — אפשר לשאול אחרת`;
    }

    if (filteredAndSortedProducts.length === 0) {
      return search.dropped.length > 0
        ? `אין לנו ${search.dropped.join(" ")} — אפשר לנסות אחרת`
        : "אין התאמה — אפשר לשאול אחרת";
    }

    const count = `${Math.min(filteredAndSortedProducts.length, RESULT_LIMIT)} מוצרים`;
    if (search.dropped.length > 0) return `${count} — בלי ${search.dropped.join(" ")}, שאין לנו`;
    if (search.corrected.length > 0) return `${count} — חיפשנו גם איות קרוב`;
    return count;
  })();

  return (
    <div className="mipo-shell min-h-screen bg-white pb-[calc(80px+env(safe-area-inset-bottom))]" dir="rtl">
      <SEO 
        title="חנות"
        description="מוצרים איכותיים לחיות מחמד במחירים משתלמים - מזון, צעצועים, ציוד ועוד"
        url="/shop"
      />
      <div>
      {/* App chrome, not the canvas's screen.
          The Main artboard is a 390x844 content frame with no header and no
          bottom nav; the real app has both. Dropping the cart would be a
          regression rather than a design, so the chrome stays and it stays
          minimal. */}
      <motion.div
        className="sticky top-0 z-sticky border-b border-mipo-line bg-mipo-surface/90 backdrop-blur-xl"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/feed")}
              className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-mipo-soft"
              aria-label="חזרה לפיד"
            >
              <ChevronRight className="h-5 w-5 text-mipo-ink" strokeWidth={1.6} />
            </motion.button>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-mipo-ink">חנות</h1>
              <MipoLogo variant="mark" size="xs" showAnimals={false} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/chat")}
              className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-mipo-soft"
              aria-label="MIPO AI"
            >
              <Sparkles className="h-5 w-5 text-mipo-ink" strokeWidth={1.5} />
            </motion.button>
            <motion.button
              ref={cartIconRef}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/cart")}
              className={`relative flex h-11 w-11 items-center justify-center rounded-full border border-mipo-line transition-colors hover:bg-mipo-soft ${cartShake ? "animate-[wiggle_0.3s_ease-in-out]" : ""}`}
              aria-label="עגלת קניות"
              onAnimationComplete={() => {
                if (cartIconRef.current) {
                  const rect = cartIconRef.current.getBoundingClientRect();
                  setCartIconPosition(rect.left + rect.width / 2, rect.top + rect.height / 2);
                }
              }}
            >
              <ShoppingBag className="h-5 w-5 text-mipo-ink" strokeWidth={1.5} />
              <AnimatePresence>
                {getTotalItems() > 0 && (
                  <motion.span
                    className="mipo-chip-selected absolute -top-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    {getTotalItems()}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* THE SHOP IS ONE QUESTION.
          =====================================================================
          What stood here was a browse-and-filter catalogue: two tabs, a
          category bar, a cross-pet medical banner, two algorithmic rails and
          then rows of products. The owner said three times that the shop was
          not what had been designed, and he was right in a way that restyling
          a card could never reach - the design is a DIFFERENT SCREEN.

          The Main artboard is a single live search field with the pet above
          it. At rest there are no products at all: a line, three things you
          might ask, and nothing else. Results arrive as the characters land -
          no submit, no spinner between the query and the first card.

          The three blocks that went are the three that decided FOR the
          shopper - what is recommended, what is medically relevant, what
          another pet in the house needs. NeedSearch says what replaces them,
          and says it as a limit rather than as a feature: "לא ממציא מוצר,
          מחיר או המלצה רפואית. המודל מציע מילות חיפוש, הקטלוג עונה, וכל שדה
          שמוצג מועתק מהשורה שחזרה." The intelligence did not go; it moved
          from guessing to being asked.

          One element, two positions - not two designs. The field is centred
          while the screen is resting and pinned to the top once there is a
          query, and it is the same element either way. */}
      <div className="mx-auto flex min-h-[calc(100dvh-13rem)] max-w-2xl flex-col px-5 pb-8">
        {resting && <div className="flex-grow" />}

        {/* The pet, and the only aurora on the screen. The rules page is
            explicit that the glow belongs to the animal being asked about and
            not to the control doing the asking - "ברגע שהזוהר מופיע במקום
            שני, הוא מפסיק לומר ״זו החיה שלך״." mipo-avatar-glow and
            mipo-gradient-ring are the same pair every other pet avatar in the
            app uses, so this is the app's aurora rather than a second one
            drawn here. */}
        {resting && (
          <div className="flex shrink-0 flex-col items-center gap-3 pb-7">
            <div className="mipo-avatar-glow h-24 w-24">
              <div className="mipo-gradient-ring h-24 w-24">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-mipo-soft">
                  {activePet?.avatar_url ? (
                    <OptimizedImage
                      src={activePet.avatar_url}
                      alt=""
                      className="h-full w-full"
                      objectFit="cover"
                    />
                  ) : (
                    <PawPrint className="h-10 w-10 text-mipo-muted" strokeWidth={1.3} />
                  )}
                </div>
              </div>
            </div>
            {activePet?.name && (
              <span className="text-[15px] font-semibold text-mipo-ink">{activePet.name}</span>
            )}
          </div>
        )}

        <div className="relative shrink-0">
          <div className="flex h-14 items-center gap-2.5 rounded-full border border-mipo-line bg-mipo-surface px-[18px] transition-colors focus-within:border-mipo-ink">
            <Search className="h-5 w-5 shrink-0 text-mipo-muted" strokeWidth={1.6} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder={searchPlaceholder}
              dir="rtl"
              className="min-w-0 flex-1 border-none bg-transparent text-base font-medium text-mipo-ink outline-none placeholder:font-normal placeholder:text-mipo-muted"
              aria-label="חיפוש בחנות"
            />
            {hasQuery && (
              <button
                onClick={clearSearch}
                aria-label="נקה"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-mipo-muted transition-colors hover:bg-mipo-soft"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-grow pt-4">
          {!hasQuery ? (
            /* At rest the screen offers three things you might ask, and shows
               no products. A shelf of products here is what turns the question
               back into a catalogue. */
            <div className="space-y-2.5">
              <p className="text-[13px] font-medium text-mipo-muted">אפשר לשאול כל דבר</p>
              <div className="flex flex-wrap gap-2">
                {RESTING_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setSearchQuery(prompt)}
                    className="min-h-11 rounded-full bg-mipo-soft px-4 text-[13px] text-mipo-muted transition-colors hover:bg-mipo-soft-deep"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : isLoadingProducts ? (
            <SkeletonProductGrid />
          ) : isProductsError ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-mipo-ink">משהו השתבש</p>
              <p className="mt-1 text-xs text-mipo-muted">לא הצלחנו לטעון את המוצרים. נסו שוב מאוחר יותר.</p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-[13px] font-medium text-mipo-muted">{resultLine}</p>

              {filteredAndSortedProducts.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {filteredAndSortedProducts.slice(0, RESULT_LIMIT).map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleProductClick(product)}
                      className="text-right"
                    >
                      <ShopProductCard
                        product={product}
                        activePet={activePet}
                        isFavorite={favorites.includes(product.id)}
                        onToggleFavorite={toggleFavorite}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* A query with more than three words, or one ending in a
                  question mark, reads as a question rather than a lookup -
                  which is when the assistant is offered, and never by
                  default. */}
              {isQuestion && (
                <button
                  type="button"
                  onClick={() => navigate("/chat")}
                  className="mt-3.5 flex min-h-11 w-full items-center gap-2.5 rounded-3xl bg-mipo-soft px-4 py-3 text-right transition-colors hover:bg-mipo-soft-deep"
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-mipo-violet" strokeWidth={1.7} />
                  <span className="flex-1 text-[13px] font-medium text-mipo-ink">
                    להמשיך עם מיפו על זה
                  </span>
                  <ChevronLeft className="h-4 w-4 shrink-0 text-mipo-muted" strokeWidth={2} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Product Details Sheet - Instagram style */}
      <Sheet open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <SheetContent 
          side="bottom" 
          className="rounded-t-[28px] bg-background p-0 border-0 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] !pb-0"
          aria-describedby="product-details-description"
        >
          {/* Background extension to cover gap above BottomNav */}
          <div className="absolute -bottom-20 left-0 right-0 h-20 bg-background" />
          <SheetTitle className="sr-only">פרטי מוצר</SheetTitle>
          <SheetDescription id="product-details-description" className="sr-only">צפה בפרטי המוצר והוסף לעגלה</SheetDescription>
          {selectedProduct && (
            <motion.div 
              className="flex flex-col h-full" 
              dir="rtl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 rounded-full bg-foreground/10" />
              </div>
              
              {/* Main Content - Card Style */}
              <div className="flex gap-4 px-5 py-3">
                {/* Product Image - Elevated */}
                <motion.div 
                  ref={productImageRef}
                  className="relative w-[100px] h-[100px] flex-shrink-0 rounded-2xl overflow-hidden bg-card shadow-lg"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  <OptimizedImage
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-full h-full"
                    objectFit="cover"
                  />
                  {/* The sale badge is gone from here too. This drawer is the
                      shop's FOURTH card surface and it carried the same red
                      pill as the grid - which is the whole lesson of this
                      screen: the redesign keeps reaching one copy. The struck
                      original sits beside the price below. */}
                </motion.div>

                {/* Product Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <h2 className="text-base font-bold text-foreground leading-snug line-clamp-2 mb-1">
                      {selectedProduct.name}
                    </h2>
                    {/* Rating */}
                    {selectedProduct.rating && (
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < Math.floor(selectedProduct.rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">({selectedProduct.reviews || 0})</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Price */}
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-foreground">₪{selectedProduct.price}</span>
                    {selectedProduct.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through">₪{selectedProduct.originalPrice}</span>
                    )}
                  </div>
                  
                </div>

                {/* Quick Actions */}
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    onClick={() => toggleFavorite(selectedProduct.id)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-mipo-line transition-colors hover:bg-mipo-soft"
                    aria-label={favorites.includes(selectedProduct.id) ? "הסר ממועדפים" : "הוסף למועדפים"}
                  >
                    {/* Same hairline circle and same ink fill as the grid
                        card's favourite. It was a red tint with a shadow on a
                        40px target - a block, a shadow, and a third colour,
                        under the 44px floor. */}
                    <Heart
                      className={`w-5 h-5 transition-all ${favorites.includes(selectedProduct.id) ? "fill-mipo-ink text-mipo-ink" : "text-mipo-muted"}`}
                      strokeWidth={1.75}
                    />
                  </button>
                  <button
                    onClick={() => {
                      setInfoDrawerProduct(selectedProduct);
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-mipo-line transition-colors hover:bg-mipo-soft"
                  >
                    <Info className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Variants - Pills style */}
              {selectedProduct.flavors && selectedProduct.flavors.length > 0 && (
                <div className="px-5 pb-3">
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                    {selectedProduct.flavors.map((flavor: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedSize(flavor)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                          selectedSize === flavor
                            ? "mipo-chip-selected border border-transparent"
                            : "border border-mipo-line bg-mipo-surface text-mipo-ink hover:bg-mipo-soft"
                        }`}
                      >
                        {flavor}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Safety Warning */}
              {(() => {
                const safety = checkProductSafety(`${selectedProduct.name} ${selectedProduct.description}`, activePet);
                return safety.level !== "safe" && (
                  <div className="px-5 pb-2">
                    <SafetyBadge level={safety.level} reason={safety.reason} petName={activePet?.name} />
                  </div>
                );
              })()}

              {/* Subscribe & Save */}
              <div className="px-5">
                <SubscribeAndSave
                  productName={selectedProduct.name}
                  productPrice={selectedProduct.price}
                  productWeight={null}
                  onSubscribe={(days) => toast({ title: `מנוי נוצר! 📦`, description: `נשלח כל ${days} ימים`, duration: 2000 })}
                />
              </div>

              {/* Action Bar - Slide to Confirm */}
              <div className="px-5 pt-4 pb-24 bg-background border-t border-border/20 mt-auto">
                {selectedProduct.isFlagged ? (
                  <div className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-destructive/5 text-destructive border border-destructive/10">
                    <Flag className="w-4 h-4" />
                    <span className="text-sm font-medium">מוצר בבדיקה</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-muted/80 rounded-2xl p-1">
                      <button onClick={decreaseQuantity} className="w-11 h-11 rounded-xl bg-card shadow-sm flex items-center justify-center active:scale-95 transition-transform">
                        <Minus className="w-5 h-5 text-foreground" />
                      </button>
                      <span className="text-lg font-bold w-10 text-center">{quantity}</span>
                      <button onClick={increaseQuantity} className="w-11 h-11 rounded-xl bg-card shadow-sm flex items-center justify-center active:scale-95 transition-transform">
                        <Plus className="w-5 h-5 text-foreground" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <SlideToConfirm onConfirm={handleAddToCart} label="החלק לרכישה" confirmLabel="נוסף לסל!" price={`₪${selectedProduct.price * quantity}`} disabled={!selectedProduct.inStock} />
                    </div>
                  </div>
                )}

                {/* The sheet is a quick look. Everything the product actually
                    carries - ingredients, feeding guide, variants, spec - lives
                    on its own page, which is also what a shared link opens. */}
                <button
                  onClick={() => navigate(`/product/${selectedProduct.id}${activePet?.id ? `?petId=${activePet.id}` : ""}`)}
                  className="mt-3 min-h-11 w-full rounded-2xl border border-border/60 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
                >
                  לדף המוצר המלא
                </button>
              </div>
            </motion.div>
          )}
        </SheetContent>
      </Sheet>

      {/* Product Info Drawer */}
      <AnimatePresence>
        {infoDrawerProduct && (
          <ProductInfoDrawer product={infoDrawerProduct} petName={activePet?.name} onClose={() => setInfoDrawerProduct(null)} onAddToCart={() => { handleAddToCart(); setInfoDrawerProduct(null); }} onAddToCarePlan={() => { if (infoDrawerProduct) addToCarePlan({ id: infoDrawerProduct.id, name: infoDrawerProduct.name, image: infoDrawerProduct.image, price: infoDrawerProduct.price, safetyScore: infoDrawerProduct.safetyScore, category: infoDrawerProduct.category }); }} />
        )}
      </AnimatePresence>
      </div>

    </div>
  );
};

export default Shop;
