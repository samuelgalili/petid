import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Loader2, XCircle } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  applyReviewDecision,
  getReviewProducts,
  getReviewSummary,
  type MipoReviewProduct,
} from "@/lib/mipoApi";

// A first delivery puts hundreds of products in review. As one list that is a
// day of scrolling; grouped by why each one is here it is a handful of
// decisions. The grouping is the screen.

const AdminReviewCenter = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: summary } = useQuery({
    queryKey: ["admin-review-summary"],
    queryFn: getReviewSummary,
    refetchInterval: 8000,
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-review-products", reason],
    queryFn: () => getReviewProducts({ reason }),
  });

  // One vocabulary. The reasons come from the engine, so a badge and the filter
  // above it cannot end up calling the same thing two different names.
  const reasonLabels = useMemo(
    () => Object.fromEntries((summary?.reasons || []).map((item) => [item.code, item.label])),
    [summary],
  );

  const decide = useMutation({
    mutationFn: (action: "publish" | "reject") =>
      applyReviewDecision({ product_ids: [...selected], action }),
    onSuccess: (result, action) => {
      // Refusals are named rather than silently dropped: a bulk action that
      // covered less than asked has to say so, or the queue looks broken.
      if (result.refused.length > 0) {
        toast({
          title: `${result.updated} ${action === "publish" ? "פורסמו" : "נדחו"}, ${result.refused.length} סורבו`,
          description: `ללא מחיר: ${result.refused.map((item) => item.sku || item.name).slice(0, 4).join(", ")}`,
          variant: "destructive",
        });
      } else {
        toast({ title: `${result.updated} ${action === "publish" ? "פורסמו" : "נדחו"}` });
      }
      setSelected(new Set());
      void queryClient.invalidateQueries({ queryKey: ["admin-review-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-review-products", reason] });
    },
    onError: (error: Error) =>
      toast({ title: "הפעולה נכשלה", description: error.message, variant: "destructive" }),
  });

  const toggle = (id: string) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = products.length > 0 && products.every((product) => selected.has(product.id));

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(products.map((product) => product.id)));

  // Selecting a hundred products and being told afterwards that sixty had no
  // price is worse than knowing before pressing the button.
  const blockedInSelection = useMemo(
    () => products.filter((product) => selected.has(product.id) && !(product.price > 0)).length,
    [products, selected],
  );

  const renderProduct = (product: MipoReviewProduct) => (
    <label
      key={product.id}
      className="flex cursor-pointer items-center gap-3 border-b border-border/40 px-1 py-2.5 last:border-0 hover:bg-muted/40"
    >
      <Checkbox checked={selected.has(product.id)} onCheckedChange={() => toggle(product.id)} />
      <img
        src={product.image_url?.startsWith("http") ? product.image_url : "/placeholder.svg"}
        alt=""
        className="h-10 w-10 shrink-0 rounded object-cover"
        onError={(event) => { (event.target as HTMLImageElement).src = "/placeholder.svg"; }}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{product.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {[product.sku, product.brand_name, product.animal_name, product.supplier_name]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      <div className="shrink-0 text-left">
        <div className={`text-sm tabular-nums ${product.price > 0 ? "" : "text-destructive"}`}>
          {product.price > 0 ? `₪${product.price}` : "אין מחיר"}
        </div>
        {product.cost_price ? (
          <div className="text-xs text-muted-foreground tabular-nums">עלות ₪{product.cost_price}</div>
        ) : null}
      </div>
      <div className="hidden shrink-0 gap-1 lg:flex">
        {product.reasons.slice(0, 2).map((code) => (
          <Badge key={code} variant="outline" className="text-[10px]">
            {reasonLabels[code] || code}
          </Badge>
        ))}
      </div>
    </label>
  );

  return (
    <AdminLayout title="מרכז ביקורת" icon={ClipboardCheck}>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-semibold tabular-nums">{summary?.pending ?? 0}</div>
              <div className="text-xs text-muted-foreground">ממתינים לביקורת</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-semibold tabular-nums text-emerald-600">
                {summary?.publishable ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">מוכנים לפרסום (יש להם מחיר)</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={reason === null ? "default" : "outline"}
            size="sm"
            onClick={() => { setReason(null); setSelected(new Set()); }}
          >
            הכול ({summary?.pending ?? 0})
          </Button>
          {(summary?.reasons || []).map((item) => (
            <Button
              key={item.code}
              variant={reason === item.code ? "default" : "outline"}
              size="sm"
              onClick={() => { setReason(item.code); setSelected(new Set()); }}
            >
              {item.blocks_publish && <AlertTriangle className="ml-1.5 h-3.5 w-3.5" />}
              {item.label} ({item.product_count})
            </Button>
          ))}
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                בחר הכול ({products.length})
              </label>

              <div className="flex flex-wrap items-center gap-2">
                {blockedInSelection > 0 && (
                  <span className="text-xs text-destructive">
                    {blockedInSelection} מהנבחרים ללא מחיר ולא יפורסמו
                  </span>
                )}
                <Button
                  size="sm"
                  disabled={selected.size === 0 || decide.isPending}
                  onClick={() => decide.mutate("publish")}
                >
                  {decide.isPending
                    ? <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    : <CheckCircle2 className="ml-2 h-4 w-4" />}
                  פרסם ({selected.size})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selected.size === 0 || decide.isPending}
                  onClick={() => decide.mutate("reject")}
                >
                  <XCircle className="ml-2 h-4 w-4" />
                  דחה
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">טוען…</div>
            ) : products.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                אין מוצרים ממתינים בקבוצה הזאת
              </div>
            ) : (
              products.map(renderProduct)
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminReviewCenter;
