import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  Minus,
  Plus,
  Package,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/SEO";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { getShopProduct, type MipoProduct } from "@/lib/mipoApi";
import {
  computePetAdjustedScore,
  explainAdjustment,
  safetyLevelFor,
  SAFETY_LABEL_HE,
  type SafetyLevel,
} from "@/lib/petSafetyScore";

const FREE_SHIPPING_THRESHOLD = 199;
const SHIPPING_ESTIMATE_HE = "3-5 ימי עסקים";

const asNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
};

// Enrichment writes these as arrays of strings, but older rows and some
// importers produce objects. Render whatever is actually there rather than
// dropping the section.
const asTextList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();
      if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        const text = record.text ?? record.title ?? record.label ?? record.value;
        return typeof text === "string" ? text.trim() : "";
      }
      return "";
    })
    .filter(Boolean);
};

// product_attributes carries the real variant options (sizes, colors). The shop
// used to show a hardcoded S/M/L/XL that had nothing to do with the product.
const readVariantGroups = (attributes: unknown): Array<{ key: string; label: string; options: string[] }> => {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) return [];
  const labels: Record<string, string> = {
    sizes: "מידה",
    size: "מידה",
    colors: "צבע",
    color: "צבע",
    weights: "משקל",
    variants: "גרסה",
  };
  return Object.entries(attributes as Record<string, unknown>)
    .map(([key, value]) => ({
      key,
      label: labels[key] || key,
      options: Array.isArray(value) ? value.map((v) => String(v)).filter(Boolean) : [],
    }))
    .filter((group) => group.options.length > 0);
};

// Importers store these as English enums; the shop is Hebrew.
const VALUE_LABELS_HE: Record<string, string> = {
  puppy: "גור", kitten: "גור", junior: "צעיר",
  adult: "בוגר", senior: "מבוגר", all: "כל הגילאים",
  small: "קטן", medium: "בינוני", large: "גדול", giant: "ענק",
  controlled: "מבוקרת",
};

const labelValue = (value: string) => VALUE_LABELS_HE[value.trim().toLowerCase()] || value;

// The same column carries two different shapes depending on the importer:
// array values are variant options, scalar values are specification rows
// (protein 32%, ph controlled). Both are real data; render each as what it is.
const readSpecAttributes = (attributes: unknown): Array<{ label: string; value: string }> => {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) return [];
  const labels: Record<string, string> = {
    protein: "חלבון",
    fat: "שומן",
    fiber: "סיבים",
    moisture: "לחות",
    ash: "אפר",
    ph: "רמת חומציות",
    calcium: "סידן",
    phosphorus: "זרחן",
  };
  return Object.entries(attributes as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== undefined && !Array.isArray(value) && typeof value !== "object")
    .map(([key, value]) => ({ label: labels[key] || key, value: labelValue(String(value)) }))
    .filter((row) => row.value !== "");
};

const SPEC_LABELS: Array<{ key: keyof MipoProduct; label: string }> = [
  { key: "brand", label: "מותג" },
  { key: "life_stage", label: "שלב חיים" },
  { key: "dog_size", label: "גודל מומלץ" },
  { key: "weight_unit", label: "משקל" },
  { key: "kcal_per_kg", label: "קלוריות לק״ג" },
  { key: "sku", label: "מק״ט" },
];

const SAFETY_STYLES: Record<SafetyLevel, { wrap: string; text: string; Icon: typeof ShieldCheck }> = {
  safe: { wrap: "bg-emerald-500/10 border-emerald-500/25", text: "text-emerald-600 dark:text-emerald-400", Icon: ShieldCheck },
  caution: { wrap: "bg-amber-500/10 border-amber-500/25", text: "text-amber-600 dark:text-amber-400", Icon: ShieldAlert },
  unsafe: { wrap: "bg-destructive/10 border-destructive/25", text: "text-destructive", Icon: ShieldAlert },
};

const Section = ({ title, icon: Icon, children }: { title: string; icon?: typeof Package; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
      {Icon && <Icon className="h-4 w-4 text-primary" />}
      {title}
    </h2>
    {children}
  </section>
);

const ProductDetailAws = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const { activePet, pets } = usePetPreference();

  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [chosen, setChosen] = useState<Record<string, string>>({});

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["shop-product", id],
    queryFn: () => getShopProduct(id as string),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 2,
    retry: false,
  });

  // Links from the pet screens carry ?petId, so the page scores the product for
  // the pet the person was looking at, not whichever one is active globally.
  const petIdParam = searchParams.get("petId");
  const pet = useMemo(
    () => (petIdParam ? pets.find((candidate) => candidate.id === petIdParam) : null) || activePet || null,
    [petIdParam, pets, activePet],
  );

  const images = useMemo(() => {
    if (!product) return [];
    const all = [...(product.images || []), product.image_url].filter(Boolean) as string[];
    return [...new Set(all)];
  }, [product]);

  useEffect(() => setActiveImage(0), [id]);

  const price = asNumber(product?.sale_price) > 0 ? asNumber(product?.sale_price) : asNumber(product?.price);
  const listPrice = asNumber(product?.sale_price) > 0 ? asNumber(product?.price) : asNumber(product?.original_price);
  const hasDiscount = listPrice > price && price > 0;
  const discountPercent = hasDiscount ? Math.round((1 - price / listPrice) * 100) : 0;

  const safetyScore = useMemo(
    () => computePetAdjustedScore(product?.safety_score, {
      birthDate: pet?.birth_date,
      breed: pet?.breed,
      medicalConditions: pet?.medical_conditions,
    }, product?.category),
    [product?.safety_score, product?.category, pet?.birth_date, pet?.breed, pet?.medical_conditions],
  );
  const safetyLevel = safetyLevelFor(safetyScore);
  const safetyNote = useMemo(
    () => explainAdjustment(product?.safety_score, safetyScore, {
      birthDate: pet?.birth_date,
      breed: pet?.breed,
      medicalConditions: pet?.medical_conditions,
    }, product?.category, pet?.name),
    [product?.safety_score, safetyScore, pet, product?.category],
  );

  const benefits = useMemo(() => asTextList(product?.benefits), [product?.benefits]);
  const feedingGuide = useMemo(() => asTextList(product?.feeding_guide), [product?.feeding_guide]);
  const variantGroups = useMemo(() => readVariantGroups(product?.product_attributes), [product?.product_attributes]);
  const flavors = useMemo(() => (product?.flavors || []).filter(Boolean), [product?.flavors]);

  const specs = useMemo(() => {
    if (!product) return [];
    const named = SPEC_LABELS
      .map(({ key, label }) => ({ label, value: product[key] }))
      .filter((row) => row.value !== null && row.value !== undefined && row.value !== "")
      .map((row) => ({ label: row.label, value: labelValue(String(row.value)) }));
    return [...named, ...readSpecAttributes(product.product_attributes)];
  }, [product]);

  const outOfStock = product?.in_stock === false;

  const handleAddToCart = (thenGoToCart = false) => {
    if (!product) return;
    const variantLabel = [
      ...Object.entries(chosen).map(([, value]) => value),
    ].filter(Boolean).join(" · ");

    addToCart({
      id: product.id,
      name: product.name,
      price,
      image: images[0] || "/placeholder.svg",
      quantity,
      ...(variantLabel ? { variant: variantLabel } : {}),
    });
    toast({ title: "המוצר נוסף לעגלה", description: variantLabel || undefined });
    if (thenGoToCart) navigate("/cart");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4" dir="rtl">
        <div className="mx-auto max-w-5xl space-y-5">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="aspect-square w-full rounded-2xl md:aspect-[4/3]" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6" dir="rtl">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-6 space-y-4">
            <Store className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="text-xl font-bold">המוצר לא נמצא</h1>
            <p className="text-sm text-muted-foreground">ייתכן שהמוצר הוסר או שהקישור אינו תקין.</p>
            <Button onClick={() => navigate("/shop")} className="w-full">חזרה לחנות</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categoryLabel = product.category_name || product.category;

  return (
    <div className="min-h-screen bg-background pb-28" dir="rtl">
      <SEO
        title={`${product.name} | MIPO`}
        description={product.description || `פרטי מוצר: ${product.name}`}
        url={`/product/${product.id}`}
      />

      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/shop")} className="min-h-11 gap-2 px-4">
            <ArrowRight className="h-4 w-4" />
            חזרה
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate("/cart")} aria-label="עגלת קניות" className="h-11 w-11">
            <ShoppingCart className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 p-4 md:grid-cols-[1fr_0.9fr] md:items-start">
        {/* ---------------------------------------------------- gallery */}
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl border bg-card">
            <div className="aspect-square bg-muted md:aspect-[4/3]">
              <OptimizedImage
                src={images[activeImage] || "/placeholder.svg"}
                alt={product.name}
                className="h-full w-full"
                objectFit="contain"
              />
            </div>
            {hasDiscount && (
              <span className="absolute end-3 top-3 rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-destructive-foreground">
                -{discountPercent}%
              </span>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((image, index) => (
                <button
                  key={image}
                  onClick={() => setActiveImage(index)}
                  aria-label={`תמונה ${index + 1}`}
                  aria-current={index === activeImage}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    index === activeImage ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <OptimizedImage src={image} alt="" className="h-full w-full" objectFit="cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------ detail */}
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {categoryLabel && <Badge variant="secondary">{categoryLabel}</Badge>}
              {product.brand && <Badge variant="outline">{product.brand}</Badge>}
              {outOfStock && <Badge variant="destructive">אזל מהמלאי</Badge>}
            </div>
            <h1 className="text-2xl font-bold leading-tight text-foreground">{product.name}</h1>
          </div>

          <Card>
            <CardContent className="space-y-5 p-5">
              <div className="flex flex-wrap items-end gap-3">
                <span className="text-3xl font-bold text-primary">₪{price.toFixed(2)}</span>
                {hasDiscount && (
                  <span className="pb-1 text-sm text-muted-foreground line-through">₪{listPrice.toFixed(2)}</span>
                )}
                {asNumber(product.price_per_weight) > 0 && product.weight_unit && (
                  <span className="pb-1 text-xs text-muted-foreground">
                    ₪{asNumber(product.price_per_weight).toFixed(2)} ל{product.weight_unit}
                  </span>
                )}
              </div>

              {/* Scored for this pet, not for a generic one. */}
              {safetyScore !== null && safetyLevel && (
                <div className={`rounded-xl border p-3 ${SAFETY_STYLES[safetyLevel].wrap}`}>
                  <div className={`flex items-center gap-2 text-sm font-bold ${SAFETY_STYLES[safetyLevel].text}`}>
                    {(() => { const { Icon } = SAFETY_STYLES[safetyLevel]; return <Icon className="h-4 w-4" />; })()}
                    <span>
                      {SAFETY_LABEL_HE[safetyLevel]}
                      {pet?.name ? ` ל${pet.name}` : ""}
                    </span>
                    <span className="ms-auto tabular-nums">{safetyScore.toFixed(1)}/10</span>
                  </div>
                  {safetyNote && <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{safetyNote}</p>}
                </div>
              )}

              {variantGroups.map((group) => (
                <div key={group.key} className="space-y-2">
                  <p className="text-sm font-semibold">{group.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((option) => {
                      const isChosen = chosen[group.key] === option;
                      return (
                        <button
                          key={option}
                          onClick={() => setChosen((state) => ({ ...state, [group.key]: option }))}
                          className={`min-h-11 rounded-xl border px-4 text-sm transition ${
                            isChosen
                              ? "border-primary bg-primary/10 font-semibold text-primary"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          {isChosen && <Check className="me-1 inline h-3.5 w-3.5" />}
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {flavors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">טעם</p>
                  <div className="flex flex-wrap gap-2">
                    {flavors.map((flavor) => {
                      const isChosen = chosen.flavor === flavor;
                      return (
                        <button
                          key={flavor}
                          onClick={() => setChosen((state) => ({ ...state, flavor }))}
                          className={`min-h-11 rounded-xl border px-4 text-sm transition ${
                            isChosen
                              ? "border-primary bg-primary/10 font-semibold text-primary"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          {isChosen && <Check className="me-1 inline h-3.5 w-3.5" />}
                          {flavor}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl border p-2">
                <Button variant="ghost" size="icon" onClick={() => setQuantity((v) => Math.max(1, v - 1))} aria-label="הפחת כמות">
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-12 text-center text-lg font-semibold tabular-nums">{quantity}</span>
                <Button variant="ghost" size="icon" onClick={() => setQuantity((v) => v + 1)} aria-label="הוסף כמות">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button size="lg" onClick={() => handleAddToCart(false)} disabled={outOfStock}>
                  <ShoppingCart className="ml-2 h-5 w-5" />
                  הוסף לעגלה
                </Button>
                <Button size="lg" variant="outline" onClick={() => handleAddToCart(true)} disabled={outOfStock}>
                  לקנייה
                </Button>
              </div>

              {outOfStock && <p className="text-center text-sm text-destructive">המוצר אינו זמין כרגע במלאי.</p>}

              <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  אספקה תוך {SHIPPING_ESTIMATE_HE}.{" "}
                  {price * quantity >= FREE_SHIPPING_THRESHOLD
                    ? "המשלוח חינם בהזמנה הזו."
                    : `משלוח חינם מעל ₪${FREE_SHIPPING_THRESHOLD}.`}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ------------------------------------------- everything we know */}
        <div className="max-w-2xl space-y-6 md:col-span-2">
          {product.description && (
            <Section title="תיאור">
              <p className="text-sm leading-7 text-muted-foreground">{product.description}</p>
            </Section>
          )}

          {benefits.length > 0 && (
            <Section title="למה זה טוב" icon={Check}>
              <ul className="grid gap-2 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {product.ingredients && (
            <Section title="רכיבים" icon={Utensils}>
              <p className="text-sm leading-7 text-muted-foreground">{product.ingredients}</p>
            </Section>
          )}

          {feedingGuide.length > 0 && (
            <Section title="הוראות האכלה" icon={Utensils}>
              <ul className="space-y-1.5">
                {feedingGuide.map((line) => (
                  <li key={line} className="text-sm leading-6 text-muted-foreground">{line}</li>
                ))}
              </ul>
            </Section>
          )}

          {(product.special_diet || []).length > 0 && (
            <Section title="מתאים לתזונה">
              <div className="flex flex-wrap gap-2">
                {(product.special_diet || []).map((diet) => (
                  <Badge key={diet} variant="outline">{diet}</Badge>
                ))}
              </div>
            </Section>
          )}

          {specs.length > 0 && (
            <Section title="מפרט" icon={Package}>
              <dl className="overflow-hidden rounded-xl border">
                {specs.map((row, index) => (
                  <div
                    key={row.label}
                    className={`flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm ${
                      index % 2 === 0 ? "bg-muted/30" : ""
                    }`}
                  >
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="font-medium tabular-nums">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProductDetailAws;
