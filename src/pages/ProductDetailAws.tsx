import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Minus, Plus, ShoppingCart, Store, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/SEO";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { getShopProducts } from "@/lib/mipoApi";

const asNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
};

const ProductDetailAws = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);

  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ["shop-products-aws"],
    queryFn: getShopProducts,
    staleTime: 1000 * 60 * 2,
  });

  const product = useMemo(() => products.find((item) => item.id === id) || null, [products, id]);
  const images = product?.images?.length ? product.images : [product?.image_url || "/placeholder.svg"];
  const price = asNumber(product?.sale_price || product?.price);
  const originalPrice = product?.sale_price ? asNumber(product.price) : asNumber(product?.original_price);
  const hasDiscount = originalPrice > price && price > 0;

  const handleAddToCart = () => {
    if (!product) return;
    addToCart({
      id: product.id,
      name: product.name,
      price,
      image: images[0] || "/placeholder.svg",
      quantity,
    });
    toast({ title: "המוצר נוסף לעגלה" });
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
            <Button onClick={() => navigate("/shop")} className="w-full">
              חזרה לחנות
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      <SEO
        title={`${product.name} | MIPO`}
        description={product.description || `פרטי מוצר: ${product.name}`}
        url={`/product/${product.id}`}
      />

      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border/50">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/shop")} className="gap-2">
            <ArrowRight className="h-4 w-4" />
            חזרה
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate("/cart")} aria-label="עגלת קניות">
            <ShoppingCart className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 p-4 md:grid-cols-[1fr_0.9fr] md:items-start">
        <section className="overflow-hidden rounded-2xl border bg-card">
          <div className="aspect-square bg-muted md:aspect-[4/3]">
            <OptimizedImage
              src={images[0] || "/placeholder.svg"}
              alt={product.name}
              className="h-full w-full"
              objectFit="contain"
            />
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {product.category && <Badge variant="secondary">{product.category}</Badge>}
              {product.brand && <Badge variant="outline">{product.brand}</Badge>}
              {product.pet_type && <Badge variant="outline">{product.pet_type}</Badge>}
            </div>
            <h1 className="text-2xl font-bold leading-tight text-foreground">{product.name}</h1>
            {product.description && (
              <p className="text-sm leading-7 text-muted-foreground">{product.description}</p>
            )}
          </div>

          <Card>
            <CardContent className="space-y-5 p-5">
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-primary">₪{price.toFixed(2)}</span>
                {hasDiscount && (
                  <span className="pb-1 text-sm text-muted-foreground line-through">₪{originalPrice.toFixed(2)}</span>
                )}
              </div>

              {product.ingredients && (
                <div className="rounded-xl bg-muted/40 p-3">
                  <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                    <Tag className="h-4 w-4 text-primary" />
                    רכיבים
                  </div>
                  <p className="line-clamp-4 text-xs leading-6 text-muted-foreground">{product.ingredients}</p>
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl border p-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  aria-label="הפחת כמות"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-12 text-center text-lg font-semibold">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity((value) => value + 1)}
                  aria-label="הוסף כמות"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button size="lg" onClick={handleAddToCart} disabled={product.in_stock === false}>
                  <ShoppingCart className="ml-2 h-5 w-5" />
                  הוסף לעגלה
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    handleAddToCart();
                    navigate("/cart");
                  }}
                  disabled={product.in_stock === false}
                >
                  לקנייה
                </Button>
              </div>

              {product.in_stock === false && (
                <p className="text-center text-sm text-destructive">המוצר אינו זמין כרגע במלאי.</p>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default ProductDetailAws;
