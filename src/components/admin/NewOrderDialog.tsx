/**
 * An order taken by an admin, for somebody who is not at a keyboard.
 *
 * The owner asked for three things in one line - open a customer by hand, make
 * them an order, take the money - and described the settlement case himself:
 * the customer paid one of the admins by some route the system never saw, the
 * admin confirms receipt, and the order can go to the warehouse.
 *
 * THE TOTAL SHOWN HERE IS A CLAIM, NOT A DECISION. The server recomputes every
 * line from the catalogue and refuses the order if the two disagree
 * (expected_total). So this arithmetic exists to show the admin what they are
 * about to do, and a bug in it produces a refusal rather than a wrong charge -
 * which is the right way round, and the reason the delivery fee had to be
 * fixed before this screen could exist at all: server and client disagreed by
 * ₪14, and every order this screen sent would have been rejected.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Minus, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { searchCatalog } from "@/lib/catalogSearch";
import {
  createManualOrder, getShopProducts,
  type MipoAdminPaymentMethod, type MipoCustomer, type MipoProduct,
} from "@/lib/mipoApi";
import { createClientId } from "@/lib/randomId";
import { SHIPPING_FEE, shippingFor } from "@/lib/shipping";

const asPrice = (value: number | string | null | undefined) => {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
};

/** What a product costs today, sale price first - the same rule the shop uses. */
const priceOf = (product: MipoProduct) => {
  const sale = asPrice(product.sale_price);
  return sale > 0 ? sale : asPrice(product.price);
};

const PAYMENT_CHOICES: Array<{
  value: MipoAdminPaymentMethod;
  label: string;
  hint: string;
}> = [
  {
    value: "admin-attested",
    label: "שולם בהקפה — אני מאשר שקיבלתי",
    hint: "הלקוח שילם ישירות לאחד מאיתנו. ההזמנה תיפתח כמשולמת ותוכל להמשיך לתווית מחסן.",
  },
  {
    value: "cash-on-delivery",
    label: "תשלום במזומן בעת המסירה",
    hint: "נגבה מהלקוח כשהחבילה מגיעה, בדיוק כמו בהזמנה רגילה.",
  },
  {
    value: "credit-card",
    label: "עדיין לא שולם",
    hint: "ההזמנה נפתחת כלא משולמת. אפשר לסמן שולם בהמשך או לשלוח ללקוח קישור תשלום.",
  },
];

type Line = { product: MipoProduct; quantity: number };

export const NewOrderDialog = ({
  open,
  onOpenChange,
  customer,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: MipoCustomer;
  onCreated: () => void;
}) => {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [payment, setPayment] = useState<MipoAdminPaymentMethod>("admin-attested");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // ONE KEY PER SUBMISSION, minted again when the order changes - the same
  // rule as the new-customer dialog. A key per click is not idempotency: a
  // double-click would place two orders and a warehouse would pick twice.
  const idempotencyKey = useRef(createClientId("order"));
  const resetKey = useCallback(() => { idempotencyKey.current = createClientId("order"); }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setLines([]);
    setPayment("admin-attested");
    setNote("");
    resetKey();
  }, [open, resetKey]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-manual-order-products"],
    queryFn: getShopProducts,
    enabled: open,
    staleTime: 1000 * 60 * 5,
  });

  // The SAME search the shop runs. An admin on the phone types what the
  // customer just said to them, which is the same sentence the customer would
  // have typed - so it should find the same products.
  const matches = useMemo(
    () => (query.trim() ? searchCatalog(products, query).slice(0, 8) : []),
    [products, query],
  );

  const changeLines = useCallback((next: (current: Line[]) => Line[]) => {
    setLines(next);
    resetKey();
  }, [resetKey]);

  const addProduct = useCallback((product: MipoProduct) => {
    changeLines((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) => (
          line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line
        ));
      }
      return [...current, { product, quantity: 1 }];
    });
    setQuery("");
  }, [changeLines]);

  const setQuantity = useCallback((id: string, delta: number) => {
    changeLines((current) => current
      .map((line) => (line.product.id === id ? { ...line, quantity: line.quantity + delta } : line))
      .filter((line) => line.quantity > 0));
  }, [changeLines]);

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + priceOf(line.product) * line.quantity, 0),
    [lines],
  );
  const shipping = shippingFor(subtotal);
  // The ₪5 cash-on-delivery fee, matching what the customer's own checkout adds.
  const codFee = payment === "cash-on-delivery" ? 5 : 0;
  const total = Math.round((subtotal + shipping + codFee) * 100) / 100;

  const attestationMissing = payment === "admin-attested" && !note.trim();
  const canSubmit = lines.length > 0 && !attestationMissing && !saving;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await createManualOrder({
        customer_user_id: customer.user_id,
        items: lines.map((line) => ({
          product_id: line.product.id,
          product_source: line.product.source ?? null,
          quantity: line.quantity,
        })),
        payment_method: payment,
        payment_attestation_note: note.trim() || undefined,
        expected_total: total,
        // Taken from the customer's record rather than retyped. An admin
        // inventing an address on a phone call is how a parcel goes missing.
        shipping_address: {
          fullName: customer.full_name || "",
          email: customer.email || "",
          phone: customer.phone || "",
        },
        special_instructions: "הזמנה שנפתחה ידנית על ידי צוות מיפו",
      }, idempotencyKey.current);

      toast({ title: "ההזמנה נפתחה" });
      onCreated();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "פתיחת ההזמנה נכשלה",
        description: error instanceof Error ? error.message : "נסה שוב",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [canSubmit, customer, lines, note, onCreated, onOpenChange, payment, toast, total]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Height-capped and scrollable, because this dialog grows: search
          results, then a line per product, then three payment options, then a
          note field. On a 390px phone that runs past the bottom of the screen,
          and an admin taking an order on their phone could not reach the
          button - the element was there and simply could not be tapped. */}
      {/* z-[10002] IS NOT DECORATION. On a phone the customer card is itself a
          Sheet, whose overlay is z-[10000] and whose panel is z-[10001], while
          every Dialog in the app sits at z-50. A dialog opened from inside the
          card therefore renders UNDERNEATH the sheet's backdrop: the buttons
          are present, findable and completely untappable. Nothing looks
          broken, which is why it took a mobile test run to see it.

          Raised here rather than in ui/dialog.tsx, which would move every
          dialog in the application. The general mismatch is still there and is
          worth fixing at the source. */}
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto z-[10002]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>הזמנה חדשה</DialogTitle>
          <DialogDescription>
            עבור {customer.full_name || customer.email || "הלקוח"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-order-search">מוצרים</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="manual-order-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={isLoading ? "טוען מוצרים..." : "מה הלקוח ביקש..."}
                className="pr-9"
                disabled={isLoading}
              />
            </div>

            {matches.length > 0 && (
              <ScrollArea className="max-h-44 rounded-md border border-mipo-line">
                <div className="p-1">
                  {matches.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product)}
                      className="flex min-h-11 w-full items-center justify-between gap-2 rounded px-2 text-right text-xs hover:bg-mipo-soft"
                    >
                      <span className="line-clamp-1">{product.name}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">₪{priceOf(product)}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
            {query.trim() && matches.length === 0 && !isLoading && (
              <p className="text-xs text-muted-foreground">לא נמצאו מוצרים</p>
            )}
          </div>

          {lines.length > 0 && (
            <div className="space-y-1.5 rounded-md border border-mipo-line p-2">
              {lines.map((line) => (
                <div key={line.product.id} className="flex items-center gap-2 text-xs">
                  <span className="line-clamp-1 flex-1">{line.product.name}</span>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7"
                      aria-label="פחות" onClick={() => setQuantity(line.product.id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-5 text-center tabular-nums">{line.quantity}</span>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7"
                      aria-label="עוד" onClick={() => setQuantity(line.product.id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="w-14 shrink-0 text-left tabular-nums">
                    ₪{Math.round(priceOf(line.product) * line.quantity * 100) / 100}
                  </span>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7"
                    aria-label="הסר" onClick={() => setQuantity(line.product.id, -line.quantity)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              <div className="space-y-0.5 border-t border-mipo-line pt-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>ביניים</span><span className="tabular-nums">₪{subtotal}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>משלוח</span>
                  <span className="tabular-nums">{shipping === 0 ? "חינם" : `₪${SHIPPING_FEE}`}</span>
                </div>
                {codFee > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>עמלת מזומן</span><span className="tabular-nums">₪{codFee}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-mipo-ink">
                  <span>סה״כ</span><span className="tabular-nums">₪{total}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>תשלום</Label>
            <RadioGroup
              value={payment}
              onValueChange={(value) => { setPayment(value as MipoAdminPaymentMethod); resetKey(); }}
              className="space-y-1.5"
            >
              {PAYMENT_CHOICES.map((choice) => (
                <label
                  key={choice.value}
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-mipo-line p-2"
                >
                  <RadioGroupItem value={choice.value} className="mt-0.5" />
                  <span className="space-y-0.5">
                    <span className="block text-xs font-medium text-mipo-ink">{choice.label}</span>
                    <span className="block text-[11px] leading-4 text-muted-foreground">{choice.hint}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {payment === "admin-attested" && (
            <div className="space-y-1.5">
              <Label htmlFor="manual-order-note">איך הכסף הגיע?</Label>
              <Textarea
                id="manual-order-note"
                value={note}
                onChange={(event) => { setNote(event.target.value); resetKey(); }}
                placeholder="ביט ליוסי / העברה בנקאית / מזומן בחנות"
                rows={2}
              />
              {/* Not a nag. This is the entire evidence that the order was paid:
                  there is no transaction behind it, only whoever is signed in
                  saying so, and that is recorded under their name. */}
              <p className="text-[11px] leading-4 text-muted-foreground">
                חובה. זו הראיה היחידה שההזמנה שולמה — היא תישמר על שמך.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button onClick={submit} disabled={!canSubmit} className="gap-1.5">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            פתיחת הזמנה
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
