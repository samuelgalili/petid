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
  createManualOrder, getShopProducts, validateCouponCode,
  type MipoAdminPaymentMethod, type MipoCoupon, type MipoCustomer, type MipoProduct,
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
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<MipoCoupon | null>(null);
  const [couponError, setCouponError] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  /**
   * The final price as the admin typed it, or "" while they have not.
   *
   * Kept as TEXT rather than a number so a half-typed "1" on the way to "150"
   * is not read as a ₪149 discount, and so clearing the box returns the order
   * to the computed price instead of adjusting it to zero.
   */
  const [finalPrice, setFinalPrice] = useState("");
  const [finalPriceReason, setFinalPriceReason] = useState("");

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
    setCouponCode("");
    setCoupon(null);
    setCouponError("");
    setFinalPrice("");
    setFinalPriceReason("");
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
  // The coupon's effect, computed the same way the server computes it so the
  // screen and the books agree before anything is sent.
  const couponDiscount = useMemo(() => {
    if (!coupon || coupon.discount_type === "free_shipping") return 0;
    const value = Number(coupon.discount_value) || 0;
    return coupon.discount_type === "percentage"
      ? Math.min(subtotal, Math.round(((subtotal * value) / 100) * 100) / 100)
      : Math.min(subtotal, value);
  }, [coupon, subtotal]);

  const shipping = coupon?.discount_type === "free_shipping" ? 0 : shippingFor(subtotal);
  // The ₪5 cash-on-delivery fee, matching what the customer's own checkout adds.
  const codFee = payment === "cash-on-delivery" ? 5 : 0;
  const computedTotal = Math.round(
    (Math.max(0, subtotal - couponDiscount) + shipping + codFee) * 100,
  ) / 100;

  /**
   * What the admin typed, and the adjustment it implies.
   *
   * THE FINAL PRICE IS NOT SENT AS THE TOTAL. The server computes the total
   * from the catalogue and the coupon and refuses an order that disagrees, so
   * what travels is the DIFFERENCE - recorded on the order with its reason and
   * the admin's name. An order of ₪200 sold for ₪150 stays visibly that,
   * rather than becoming an order of ₪150.
   */
  const typedPrice = finalPrice.trim() === "" ? null : Number(finalPrice);
  const priceIsValid = typedPrice === null || (Number.isFinite(typedPrice) && typedPrice >= 0);
  const adjustment = typedPrice !== null && priceIsValid
    ? Math.round((typedPrice - computedTotal) * 100) / 100
    : 0;
  const total = adjustment !== 0 ? Math.round((computedTotal + adjustment) * 100) / 100 : computedTotal;

  const attestationMissing = payment === "admin-attested" && !note.trim();
  const adjustmentReasonMissing = adjustment !== 0 && !finalPriceReason.trim();
  const canSubmit = lines.length > 0
    && !attestationMissing
    && !adjustmentReasonMissing
    && priceIsValid
    && !saving;

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
        coupon_code: coupon?.code || undefined,
        // The DIFFERENCE, never the total. See the comment on `adjustment`.
        admin_adjustment: adjustment !== 0 ? adjustment : undefined,
        admin_adjustment_reason: adjustment !== 0 ? finalPriceReason.trim() : undefined,
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
  }, [adjustment, canSubmit, coupon, customer, finalPriceReason, lines, note,
      onCreated, onOpenChange, payment, toast, total]);

  const applyCoupon = useCallback(async () => {
    const code = couponCode.trim();
    if (!code) return;
    setCheckingCoupon(true);
    setCouponError("");
    try {
      // Validated against THIS subtotal, because a coupon can carry a minimum
      // the basket has not reached. Checking it here means the admin finds out
      // while the customer is still on the phone.
      const found = await validateCouponCode(code, subtotal);
      setCoupon(found);
      resetKey();
    } catch (error) {
      setCoupon(null);
      setCouponError(error instanceof Error ? error.message : "הקופון לא תקף");
    } finally {
      setCheckingCoupon(false);
    }
  }, [couponCode, resetKey, subtotal]);

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
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>קופון {coupon?.code}</span>
                    <span className="tabular-nums">−₪{couponDiscount}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>משלוח</span>
                  <span className="tabular-nums">{shipping === 0 ? "חינם" : `₪${SHIPPING_FEE}`}</span>
                </div>
                {codFee > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>עמלת מזומן</span><span className="tabular-nums">₪{codFee}</span>
                  </div>
                )}
                {/* SHOWN SEPARATELY, always. The whole reason the total is not
                    simply overwritten is so this line exists - "₪200 of goods
                    with ₪50 off" and "₪150 of goods" are different facts. */}
                {adjustment !== 0 && (
                  <div className="flex justify-between text-mipo-ink">
                    <span>{adjustment < 0 ? "הנחה ידנית" : "תוספת ידנית"}</span>
                    <span className="tabular-nums">
                      {adjustment < 0 ? "−" : "+"}₪{Math.abs(adjustment)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-mipo-ink">
                  <span>סה״כ</span><span className="tabular-nums">₪{total}</span>
                </div>
              </div>
            </div>
          )}

          {lines.length > 0 && (
            <div className="space-y-3 rounded-md border border-mipo-line p-2">
              <div className="space-y-1.5">
                <Label htmlFor="manual-order-coupon">קופון</Label>
                <div className="flex gap-1.5">
                  <Input
                    id="manual-order-coupon"
                    value={couponCode}
                    onChange={(event) => {
                      setCouponCode(event.target.value);
                      setCoupon(null);
                      setCouponError("");
                      resetKey();
                    }}
                    placeholder="קוד קופון"
                    className="h-9 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0"
                    onClick={applyCoupon}
                    disabled={!couponCode.trim() || checkingCoupon}
                  >
                    {checkingCoupon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "החל"}
                  </Button>
                </div>
                {couponError && <p className="text-[11px] text-destructive">{couponError}</p>}
                {coupon && !couponError && (
                  <p className="text-[11px] text-emerald-600">הקופון {coupon.code} הוחל</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="manual-order-final">מחיר סופי ללקוח</Label>
                <Input
                  id="manual-order-final"
                  inputMode="decimal"
                  value={finalPrice}
                  onChange={(event) => { setFinalPrice(event.target.value); resetKey(); }}
                  placeholder={`₪${computedTotal}`}
                  className="h-9 text-xs"
                />
                {/* The placeholder IS the computed price, so leaving the box
                    empty visibly means "charge what it comes to". */}
                {!priceIsValid && (
                  <p className="text-[11px] text-destructive">מחיר חייב להיות מספר, ולא שלילי</p>
                )}
                {adjustment !== 0 && priceIsValid && (
                  <div className="space-y-1.5">
                    <Label htmlFor="manual-order-reason" className="text-[11px]">
                      למה {adjustment < 0 ? "ההנחה" : "התוספת"}?
                    </Label>
                    <Input
                      id="manual-order-reason"
                      value={finalPriceReason}
                      onChange={(event) => { setFinalPriceReason(event.target.value); resetKey(); }}
                      placeholder="לקוח ותיק / פיצוי על איחור / תיאום טלפוני"
                      className="h-9 text-xs"
                    />
                    <p className="text-[11px] leading-4 text-muted-foreground">
                      חובה. ההפרש נשמר על ההזמנה בנפרד, על שמך — כך שרואים גם את מחיר
                      הקטלוג וגם מה ויתרת עליו.
                    </p>
                  </div>
                )}
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
