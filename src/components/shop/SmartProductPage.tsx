/**
 * SmartProductPage — PetID's flagship product detail component.
 * V69: Hero carousel, medical badge, "Why Wendy?" AI card,
 * subscription toggle, expandable specs, sticky footer, full RTL.
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Star,
  Minus,
  Plus,
  ChevronDown,
  Sparkles,
  FlaskConical,
  Utensils,
  Wheat,
  Heart,
  Dog,
  Cat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

/* ─── Types ─── */

interface ProductImage {
  url: string;
  alt?: string;
}

interface NutritionRow {
  label: string;
  value: string;
}

interface FeedingRow {
  weight: string;
  grams: string;
}

interface SmartProductPageProps {
  images: ProductImage[];
  name: string;
  brand?: string;
  price: number;
  salePrice?: number | null;
  description?: string;
  petName: string;
  petBreed?: string;
  petType?: "dog" | "cat";
  whyText?: string;
  ingredients?: string;
  nutritionTable?: NutritionRow[];
  feedingGuide?: FeedingRow[];
  medicalValidation?: boolean;
  healthScoreDelta?: string;
  onAddToCart?: (quantity: number, subscription: boolean) => void;
  onFavorite?: () => void;
  isFavorited?: boolean;
}

/* ─── Sub-components ─── */

const ExpandableSection = ({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/20 last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 px-1 text-right"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pb-4 px-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Main Component ─── */

export const SmartProductPage = ({
  images,
  name,
  brand,
  price,
  salePrice,
  description,
  petName,
  petBreed,
  petType = "dog",
  whyText,
  ingredients,
  nutritionTable,
  feedingGuide,
  medicalValidation = false,
  healthScoreDelta,
  onAddToCart,
  onFavorite,
  isFavorited = false,
}: SmartProductPageProps) => {
  const { direction } = useLanguage();
  const isRtl = direction === "rtl";
  const [currentImage, setCurrentImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isSubscription, setIsSubscription] = useState(false);
  const [favorited, setFavorited] = useState(isFavorited);
  const carouselRef = useRef<HTMLDivElement>(null);

  const displayPrice = salePrice ?? price;
  const subscriptionPrice = Math.round(displayPrice * 0.9 * 100) / 100;
  const finalPrice = isSubscription ? subscriptionPrice : displayPrice;
  const totalPrice = finalPrice * quantity;

  const BreedIcon = petType === "cat" ? Cat : Dog;

  const goToImage = useCallback(
    (dir: 1 | -1) => {
      setCurrentImage((prev) => {
        const next = prev + dir;
        if (next < 0) return images.length - 1;
        if (next >= images.length) return 0;
        return next;
      });
    },
    [images.length]
  );

  const toggleFav = () => {
    setFavorited((v) => !v);
    onFavorite?.();
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24" dir={isRtl ? "rtl" : "ltr"}>
      {/* ═══ 1. Hero Image Carousel ═══ */}
      <div className="relative w-full aspect-square bg-muted overflow-hidden" ref={carouselRef}>
        <AnimatePresence mode="wait">
          <motion.img
            key={currentImage}
            src={images[currentImage]?.url}
            alt={images[currentImage]?.alt || name}
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        </AnimatePresence>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => goToImage(-1)}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/60 backdrop-blur-md flex items-center justify-center shadow-md",
                isRtl ? "right-3" : "left-3"
              )}
            >
              <ChevronRight
                className={cn("w-5 h-5 text-foreground", !isRtl && "rotate-180")}
                strokeWidth={1.5}
              />
            </button>
            <button
              onClick={() => goToImage(1)}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/60 backdrop-blur-md flex items-center justify-center shadow-md",
                isRtl ? "left-3" : "right-3"
              )}
            >
              <ChevronLeft
                className={cn("w-5 h-5 text-foreground", !isRtl && "rotate-180")}
                strokeWidth={1.5}
              />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentImage(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  i === currentImage
                    ? "bg-primary w-5"
                    : "bg-foreground/30"
                )}
              />
            ))}
          </div>
        )}

        {/* Medical Validation Badge */}
        {medicalValidation && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={cn(
              "absolute top-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-xl border border-white/25 shadow-lg",
              isRtl ? "right-4" : "left-4"
            )}
          >
            <ShieldCheck className="w-4 h-4 text-white" strokeWidth={1.5} />
            <span className="text-[11px] font-bold text-white">אומת רפואית</span>
          </motion.div>
        )}

        {/* Favorite button */}
        <button
          onClick={toggleFav}
          className={cn(
            "absolute top-4 w-10 h-10 rounded-full bg-background/60 backdrop-blur-md flex items-center justify-center shadow-md",
            isRtl ? "left-4" : "right-4"
          )}
        >
          <Heart
            className={cn(
              "w-5 h-5 transition-all",
              favorited ? "text-destructive fill-destructive" : "text-foreground"
            )}
            strokeWidth={1.5}
          />
        </button>
      </div>

      {/* ═══ Content ═══ */}
      <div className="flex-1 px-4 pt-5 space-y-5">
        {/* Title + Price */}
        <div>
          {brand && (
            <p className="text-xs font-medium text-muted-foreground mb-1">{brand}</p>
          )}
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-lg font-bold text-foreground leading-snug flex-1">
              {name}
            </h1>
            <div className="flex flex-col items-end flex-shrink-0">
              <span className="text-xl font-black text-foreground">
                ₪{displayPrice.toFixed(0)}
              </span>
              {salePrice && (
                <span className="text-xs text-muted-foreground line-through">
                  ₪{price.toFixed(0)}
                </span>
              )}
            </div>
          </div>

          {/* Rating placeholder */}
          <div className="flex items-center gap-1 mt-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={cn(
                  "w-3.5 h-3.5",
                  s <= 4 ? "text-primary fill-primary" : "text-muted-foreground/30"
                )}
                strokeWidth={1.5}
              />
            ))}
            <span className="text-[11px] text-muted-foreground mr-1">(4.0)</span>
          </div>
        </div>

        {/* ═══ 2. "Why Wendy?" Card ═══ */}
        {whyText && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-2xl border border-primary/20 bg-primary/5"
          >
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <BreedIcon className="w-4 h-4 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-bold text-foreground">
                מדוע זה מתאים ל{petName}?
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {whyText}
            </p>
            {healthScoreDelta && (
              <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-primary/10">
                <Sparkles className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                <span className="text-[11px] font-semibold text-primary">
                  שיפור צפוי בציון הבריאות: {healthScoreDelta}
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ 3. Subscription Toggle ═══ */}
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-muted-foreground px-0.5">אופן רכישה</p>
          <div className="grid grid-cols-2 gap-2">
            {/* One-time */}
            <button
              onClick={() => setIsSubscription(false)}
              className={cn(
                "p-3 rounded-xl border-2 transition-all text-center",
                !isSubscription
                  ? "border-primary bg-primary/5"
                  : "border-border/40 bg-card"
              )}
            >
              <p className="text-xs font-bold text-foreground">רכישה חד פעמית</p>
              <p className="text-sm font-black text-foreground mt-1">₪{displayPrice.toFixed(0)}</p>
            </button>

            {/* Subscription */}
            <button
              onClick={() => setIsSubscription(true)}
              className={cn(
                "p-3 rounded-xl border-2 transition-all text-center relative overflow-hidden",
                isSubscription
                  ? "border-primary bg-primary/5"
                  : "border-border/40 bg-card"
              )}
            >
              {/* Save badge */}
              <div className="absolute top-0 inset-x-0 bg-primary py-0.5">
                <span className="text-[9px] font-bold text-primary-foreground">חסכו 10%</span>
              </div>
              <p className="text-xs font-bold text-foreground mt-3">מנוי חכם</p>
              <p className="text-sm font-black text-foreground mt-1">₪{subscriptionPrice.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">משלוח חודשי</p>
            </button>
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}

        {/* ═══ 4. Technical Specs (Expandable) ═══ */}
        <div className="rounded-2xl border border-border/30 bg-card overflow-hidden">
          {/* Ingredients */}
          {ingredients && (
            <ExpandableSection
              title="רכיבים"
              icon={<FlaskConical className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />}
            >
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {ingredients}
              </p>
            </ExpandableSection>
          )}

          {/* Nutrition Table */}
          {nutritionTable && nutritionTable.length > 0 && (
            <ExpandableSection
              title="טבלת ערכים תזונתיים"
              icon={<Wheat className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />}
            >
              <div className="space-y-1.5">
                {nutritionTable.map((row, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center justify-between py-1.5 px-2 rounded-lg text-xs",
                      i % 2 === 0 ? "bg-muted/30" : ""
                    )}
                  >
                    <span className="text-foreground font-medium">{row.label}</span>
                    <span className="text-muted-foreground font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
            </ExpandableSection>
          )}

          {/* Feeding Guide */}
          {feedingGuide && feedingGuide.length > 0 && (
            <ExpandableSection
              title="מדריך האכלה"
              icon={<Utensils className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-right py-2 px-2 font-semibold text-muted-foreground">משקל</th>
                      <th className="text-right py-2 px-2 font-semibold text-muted-foreground">כמות יומית</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedingGuide.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                        <td className="py-2 px-2 text-foreground font-medium">{row.weight}</td>
                        <td className="py-2 px-2 text-muted-foreground">{row.grams}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ExpandableSection>
          )}
        </div>
      </div>

      {/* ═══ 5. Sticky Footer ═══ */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/30 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          {/* Quantity */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-xl px-1 py-1 flex-shrink-0">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Minus className="w-3.5 h-3.5 text-foreground" strokeWidth={2} />
            </button>
            <span className="w-7 text-center text-sm font-bold text-foreground">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-foreground" strokeWidth={2} />
            </button>
          </div>

          {/* Add to Cart */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onAddToCart?.(quantity, isSubscription)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg"
          >
            <ShoppingCart className="w-4.5 h-4.5" strokeWidth={1.5} />
            <span>הוסף לעגלה</span>
            <span className="opacity-80">·</span>
            <span>₪{totalPrice.toFixed(0)}</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};
