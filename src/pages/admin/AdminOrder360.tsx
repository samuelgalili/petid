/**
 * Order 360.
 *
 * ─── AN ORDER HAD NO ADDRESS ────────────────────────────────────────────────
 *
 * Six links in this codebase pointed at `/admin/orders?order=<id>` — four
 * Command Center cards and every order on a customer's card — and the orders
 * screen never read that parameter. Pressing "הזמנה MP-1024 · התשלום נכשל"
 * loaded the unfiltered order list, so the card named an order and then would
 * not show it to you. Nothing errored; you just started searching again.
 *
 * That is what this page is first: the record those links always meant.
 *
 * ─── WHAT IT ADDS OVER THE PANEL BESIDE THE LIST ────────────────────────────
 *
 * The panel showed the order well enough. Three things it could not do:
 *
 *   - GET TO THE CUSTOMER. It printed a name as text. The next question after
 *     a failed payment is always about the person, and there was no way there.
 *   - SAY WHAT HAPPENED. Every status change has been recorded in the outbox
 *     since migration 0020, with who caused it, and nothing ever read it back.
 *     "Who moved this to shipped, and when" was in the database and on no
 *     screen.
 *   - SAY WHERE IT SITS. First order or eleventh. A refund is a different
 *     decision for each, and the panel showed one order in isolation.
 *
 * ─── THE HISTORY IS THE ONE CLAIM THIS PAGE MUST NOT OVERSTATE ──────────────
 *
 * outbox_events is a delivery queue that happens to be a good history, and it
 * does not go back forever: an order placed before 0020 has no events, and the
 * schema declares an intent to sweep delivered rows. An empty or half stream
 * under a heading like "what happened" reads as "nothing happened", so somebody
 * checking when a refund was approved concludes it never was. The server
 * answers `history_covers_order`, and when it is false the panel says the
 * record starts where it starts.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle, Calendar, CreditCard, ExternalLink, Loader2, MapPin, MessageSquare,
  Package, PawPrint, Printer, Repeat, ShoppingCart, Sparkles, Truck, User,
} from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { OrderLabelGenerator, type LabelFormat } from "@/components/admin/OrderLabelGenerator";
import { OrderShareMenu } from "@/components/admin/OrderShareMenu";
import {
  Entity360Columns, Entity360Header, Entity360Nav, Entity360Panel, Entity360Tabs,
  type Entity360Fact,
} from "@/components/admin/entity360/Entity360";
import { EntityTimeline, relativeHe, type TimelineEntry } from "@/components/admin/entity360/EntityTimeline";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDateTime } from "@/lib/adminCustomerLabels";
import {
  EVENT_ORIGIN_LABELS, ORDER_EVENT_LABELS, ORDER_STATUSES, ORDER_STATUS, ORDER_URGENCY,
  TONE_CHIP, TONE_DOT, detectMedicalUrgency, orderStatusOf, paymentMethodLabel, paymentStatusOf,
  type OrderStatus,
} from "@/lib/adminOrderLabels";
import { getAdminOrder, updateAdminOrder, type MipoOrderDetail, type MipoOrderEvent } from "@/lib/mipoApi";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "סקירה כללית" },
  { key: "items", label: "פריטים" },
  { key: "history", label: "היסטוריה" },
];

/** A shipping address arrives as loose JSON, so every field is read defensively. */
type AddressFields = {
  fullName?: string; address?: string; street?: string; apartment?: string;
  city?: string; zipCode?: string; phone?: string; email?: string; notes?: string;
};

const EVENT_TONE: Record<string, TimelineEntry["tone"]> = {
  "order.created": "neutral",
  "order.paid": "good",
  "order.payment_failed": "bad",
  "order.status_changed": "accent",
  "order.shipped": "accent",
};

/**
 * What an event says it changed, read out of its payload.
 *
 * The payload carries `{ status: { from, to } }` shaped transitions, and the
 * whole reason to show a history rather than a current status is that a
 * transition is the interesting part. An event whose payload does not carry one
 * says nothing rather than something invented.
 */
const transitionOf = (event: MipoOrderEvent): string | null => {
  const parts: string[] = [];
  const payload = event.payload || {};

  /**
   * Each field brings its OWN words, which is why this takes a function rather
   * than one shared lookup: an order's status and its payment status both use
   * the value "pending" and mean different things by it, so a single map would
   * label a payment waiting on the courier with the queue's word for an order
   * nobody has picked up.
   */
  const move = (key: string, label: (value: string | undefined) => string) => {
    const value = payload[key] as { from?: string; to?: string } | undefined;
    if (!value || typeof value !== "object") return;
    if (!value.to || value.from === value.to) return;
    parts.push(`${label(value.from)} → ${label(value.to)}`);
  };

  move("status", (value) => (value ? ORDER_STATUS[value as OrderStatus]?.label || value : "—"));
  move("payment_status", (value) => (value ? paymentStatusOf(value).label : "—"));

  const tracking = payload.tracking_number;
  if (typeof tracking === "string" && tracking) parts.push(`מספר מעקב ${tracking}`);

  return parts.length > 0 ? parts.join(" · ") : null;
};

export const AdminOrder360 = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [detail, setDetail] = useState<MipoOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [updating, setUpdating] = useState(false);
  const [labelFormat, setLabelFormat] = useState<LabelFormat | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      setDetail(await getAdminOrder(orderId));
    } catch (error) {
      toast({
        title: "לא הצלחנו לטעון את ההזמנה",
        description: error instanceof Error ? error.message : "נסה שוב",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [orderId, toast]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setTab("overview"); }, [orderId]);

  const changeStatus = useCallback(async (status: OrderStatus) => {
    if (!orderId) return;
    setUpdating(true);
    try {
      await updateAdminOrder(orderId, { status });
      toast({ title: `הסטטוס עודכן ל${ORDER_STATUS[status].label}` });
      // Reloaded rather than patched in place: the change writes an event, and
      // a history that does not show what you just did is a history nobody
      // trusts the rest of.
      await load();
    } catch (error) {
      toast({
        title: "עדכון הסטטוס נכשל",
        description: error instanceof Error ? error.message : "נסה שוב",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  }, [load, orderId, toast]);

  const order = detail?.order;
  const customer = detail?.customer ?? null;

  /**
   * Where "back" goes, and where "next" comes from — the same contract the
   * customer card uses. The list hands over the ids it was showing in the order
   * it was showing them, so "next" follows the filter the admin was working in
   * rather than some canonical order they never chose.
   */
  const siblings = useMemo(
    () => (searchParams.get("list") || "").split(",").filter(Boolean),
    [searchParams],
  );
  const position = orderId ? siblings.indexOf(orderId) : -1;
  const siblingHref = (id: string) =>
    `/admin/orders/${id}${siblings.length ? `?list=${siblings.join(",")}` : ""}`;

  const timeline = useMemo<TimelineEntry[]>(() => {
    if (!detail) return [];
    return detail.events.map((event) => ({
      id: event.id,
      at: event.at,
      icon: event.type === "order.shipped" ? Truck
        : event.type === "order.payment_failed" ? AlertTriangle
          : event.type === "order.paid" ? CreditCard
            : Package,
      title: ORDER_EVENT_LABELS[event.type] || event.type,
      tone: EVENT_TONE[event.type] ?? "neutral",
      body: [transitionOf(event), EVENT_ORIGIN_LABELS[event.origin] || event.origin]
        .filter(Boolean).join(" · "),
      // Newest first on screen. The server returns it oldest-first, which is
      // the order a history is WRITTEN in; a screen is read from the top and
      // the last thing that happened is what somebody came to find out.
    })).reverse();
  }, [detail]);

  if (loading && !detail) {
    return (
      <AdminLayout title="הזמנה" icon={ShoppingCart} breadcrumbs={[{ label: "הזמנות", href: "/admin/orders" }]}>
        <div className="space-y-3">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="grid gap-3 xl:grid-cols-3">
            {[0, 1, 2].map((index) => <Skeleton key={index} className="h-64 rounded-2xl" />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout title="הזמנה" icon={ShoppingCart} breadcrumbs={[{ label: "הזמנות", href: "/admin/orders" }]}>
        <div className="admin-card max-w-md p-5">
          <h2 className="admin-section">ההזמנה לא נמצאה</h2>
          <p className="admin-body pt-2">ייתכן שהיא נמחקה, או שהקישור שגוי.</p>
          <Button className="admin-focus mt-4" onClick={() => navigate("/admin/orders")}>
            לרשימת ההזמנות
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const items = order.order_items || order.items || [];
  const address = (order.shipping_address || {}) as AddressFields;
  const status = orderStatusOf(order.status);
  const payment = paymentStatusOf(order.payment_status);
  const urgencyKey = order.medical_urgency && order.medical_urgency !== "none"
    ? order.medical_urgency
    : detectMedicalUrgency(items);
  const urgency = ORDER_URGENCY[urgencyKey] ?? ORDER_URGENCY.none;

  const facts: Entity360Fact[] = [
    { icon: Calendar, value: formatDateTime(order.order_date) },
    { icon: User, value: order.customer_name || address.fullName || "ללא שם" },
    // HOW the money arrived, not whether it did. The payment STATUS is the chip
    // below this line; carrying it here as well printed the same two words
    // twice in the same header, with an English enum between them.
    { icon: CreditCard, value: paymentMethodLabel(order.payment_method) },
  ];
  if (order.pet_name) facts.push({ icon: PawPrint, value: order.pet_name });

  const addressLine = [
    address.address || address.street,
    address.apartment ? `דירה ${address.apartment}` : null,
    address.city,
    address.zipCode,
  ].filter(Boolean).join(", ");

  const mapsHref = address.city
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${address.address || address.street || ""}, ${address.city}`,
    )}`
    : null;

  /* ── panels ─────────────────────────────────────────────────────────────── */

  const moneyPanel = (
    <Entity360Panel title="חשבון">
      <dl className="space-y-1.5">
        {[
          ["סכום ביניים", order.subtotal],
          ["משלוח", order.shipping],
          ...(order.cash_on_delivery_fee ? [["עמלת תשלום במסירה", order.cash_on_delivery_fee]] as const : []),
          ...(order.discount_amount ? [["הנחה", -order.discount_amount]] as const : []),
          ...(order.tax ? [["מע״מ", order.tax]] as const : []),
        ].map(([label, value]) => (
          <div key={String(label)} className="flex items-baseline justify-between gap-2">
            <dt className="admin-body text-[13px]">{label}</dt>
            <dd className="admin-body text-[13px] tabular-nums">{formatCurrency(Number(value) || 0)}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-2 border-t border-admin-line pt-2">
          <dt className="admin-section">סה״כ</dt>
          <dd className="admin-figure text-base tabular-nums">{formatCurrency(Number(order.total) || 0)}</dd>
        </div>
      </dl>

      {/* Said out loud, because it is money still in somebody else's hands and
          the courier is the one who has to collect it. */}
      {order.payment_status === "awaiting_cod" && (
        <p className="mt-3 rounded-xl bg-admin-warning-soft px-3 py-2 text-[12px] leading-5 text-admin-warning">
          התשלום נגבה במסירה. {formatCurrency(Number(order.total) || 0)} טרם נגבו.
        </p>
      )}
    </Entity360Panel>
  );

  const addressPanel = (
    <Entity360Panel title="כתובת למשלוח">
      {addressLine ? (
        <div className="space-y-1">
          <p className="admin-body text-[13px]">{addressLine}</p>
          {address.phone && (
            <p className="admin-meta" dir="ltr" style={{ unicodeBidi: "isolate" }}>{address.phone}</p>
          )}
          {mapsHref && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-focus inline-flex items-center gap-1 pt-1 text-[12px] font-medium text-admin-accent hover:underline"
            >
              <MapPin className="h-3 w-3" />
              פתיחה במפות
            </a>
          )}
        </div>
      ) : (
        // An order with no address is not a formatting problem, it is an order
        // nobody can deliver - so it says that rather than showing an empty box.
        <p className="admin-meta py-2">אין כתובת למשלוח בהזמנה הזו</p>
      )}

      {(address.notes || order.special_instructions) && (
        <div className="mt-3 rounded-xl border border-admin-line bg-admin-sunk p-2.5">
          <p className="admin-label flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            הוראות מיוחדות
          </p>
          <p className="admin-body mt-1 text-[13px]">{address.notes || order.special_instructions}</p>
        </div>
      )}
    </Entity360Panel>
  );

  const customerPanel = (
    <Entity360Panel
      title="הלקוח"
      action={customer && (
        <Button
          variant="ghost" size="sm"
          className="admin-focus h-7 gap-1 px-2 text-[12px]"
          onClick={() => navigate(`/admin/customers/${customer.identity_id}`)}
        >
          לכרטיס
          <ExternalLink className="h-3 w-3" />
        </Button>
      )}
    >
      {customer ? (
        <div className="space-y-2">
          <p className="text-[13px] font-semibold text-admin-ink">{customer.full_name || "ללא שם"}</p>
          {customer.email && (
            <p className="admin-meta" dir="ltr" style={{ unicodeBidi: "isolate" }}>{customer.email}</p>
          )}
          {customer.phone && (
            <p className="admin-meta" dir="ltr" style={{ unicodeBidi: "isolate" }}>{customer.phone}</p>
          )}
          <p className="admin-meta pt-1">
            {customer.orders_count === 1
              ? "ההזמנה הראשונה שלו"
              : `${customer.orders_count} הזמנות · ${formatCurrency(customer.total_spent)}`}
          </p>

          {(detail?.sibling_orders.length ?? 0) > 0 && (
            <ul className="space-y-1 border-t border-admin-line pt-2">
              {detail?.sibling_orders.map((sibling) => (
                <li key={sibling.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/orders/${sibling.id}`)}
                    className="admin-focus flex w-full items-baseline justify-between gap-2 rounded-lg px-1.5 py-1 text-right transition-colors hover:bg-admin-sunk"
                  >
                    <span className="truncate text-[12px] text-admin-ink">{sibling.order_number}</span>
                    <span className="admin-meta shrink-0">
                      {orderStatusOf(sibling.status).label} · {formatCurrency(sibling.total)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        /* No identity at all: an order with neither an account nor a guest row
           behind it. It happens to orders imported or repaired by hand, and it
           means there is nobody to ring - which is worth saying rather than
           showing a blank card. */
        <p className="admin-meta py-2">לא מזוהה לקוח להזמנה הזו</p>
      )}
    </Entity360Panel>
  );

  const actionsPanel = (
    <Entity360Panel title="עדכון סטטוס">
      <div className="grid grid-cols-2 gap-2">
        {ORDER_STATUSES.map((key) => {
          const config = ORDER_STATUS[key];
          const Icon = config.icon;
          const current = order.status === key;
          return (
            <Button
              key={key}
              variant={current ? "default" : "outline"}
              size="sm"
              className="admin-focus gap-1.5 text-[12px]"
              disabled={updating || current}
              onClick={() => void changeStatus(key)}
            >
              {updating && !current ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
              {config.label}
            </Button>
          );
        })}
      </div>

      <div className="mt-3 space-y-2 border-t border-admin-line pt-3">
        <p className="admin-label">הדפסת תווית</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline" size="sm" className="admin-focus gap-1.5 text-[12px]"
            onClick={() => setLabelFormat("lite")}
          >
            <Printer className="h-3.5 w-3.5" />
            Lite 10×15
          </Button>
          <Button
            variant="outline" size="sm" className="admin-focus gap-1.5 text-[12px]"
            onClick={() => setLabelFormat("premium")}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Premium A5
          </Button>
        </div>
      </div>
    </Entity360Panel>
  );

  const itemList = (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="admin-meta py-4 text-center">אין פריטים בהזמנה</p>
      ) : items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 rounded-xl border border-admin-line p-2.5">
          <img
            src={item.product_image || "/placeholder.svg"}
            alt=""
            className="h-12 w-12 shrink-0 rounded-lg bg-admin-sunk object-contain p-1"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-admin-ink">{item.product_name}</p>
            <p className="admin-meta">
              {item.quantity} × {formatCurrency(Number(item.price) || 0)}
              {item.size ? ` · ${item.size}` : ""}
              {item.sku ? ` · ${item.sku}` : ""}
            </p>
          </div>
          <span className="admin-figure shrink-0 text-[13px] tabular-nums">
            {formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 0))}
          </span>
        </div>
      ))}
    </div>
  );

  /**
   * Above the stream, not at its end — the same rule the customer card follows.
   * It has to be read before somebody concludes that nothing happened.
   */
  const historyWarning = detail && !detail.history_covers_order ? (
    <p className="rounded-xl bg-admin-warning-soft px-3 py-2 text-[12px] leading-5 text-admin-warning">
      {detail.events.length === 0
        ? "לא נרשמו אירועים להזמנה הזו. אין פירוש שלא קרה בה דבר — הזמנות מלפני שהמערכת התחילה לתעד אירועים לא מתועדות."
        : "התיעוד מתחיל אחרי מועד ההזמנה. אירועים מוקדמים יותר אינם זמינים."}
    </p>
  ) : null;

  const historyPanel = (
    <Entity360Panel title="מה קרה להזמנה">
      {historyWarning}
      <div className={historyWarning ? "pt-2" : undefined}>
        <EntityTimeline entries={timeline} empty="אין אירועים מתועדים" />
      </div>
    </Entity360Panel>
  );

  return (
    <AdminLayout
      // "הזמנה" and not the order number: the number is already in the
      // breadcrumb beneath this and in the record's own heading below, and
      // passing it here made the page open with the same string three times.
      title="הזמנה"
      icon={ShoppingCart}
      breadcrumbs={[{ label: "הזמנות", href: "/admin/orders" }, { label: order.order_number }]}
    >
      <Entity360Nav
        backLabel="חזרה לרשימת ההזמנות"
        onBack={() => navigate("/admin/orders")}
        previousLabel="הזמנה קודמת"
        nextLabel="הזמנה הבאה"
        onPrevious={position > 0 ? () => navigate(siblingHref(siblings[position - 1])) : undefined}
        onNext={position >= 0 && position < siblings.length - 1
          ? () => navigate(siblingHref(siblings[position + 1]))
          : undefined}
      />

      <div className="space-y-3">
        <Entity360Header
          avatar={
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-admin-accent-soft text-admin-accent">
              <Package className="h-7 w-7" strokeWidth={1.5} />
            </span>
          }
          title={order.order_number}
          status={status.label}
          statusTone={status.tone === "accent" ? "neutral" : status.tone}
          facts={facts}
          note={
            order.tracking_number
              ? `מספר מעקב ${order.tracking_number}`
              : order.updated_at ? `עודכן ${relativeHe(order.updated_at)}` : null
          }
          /*
           * NOT the payment status as a third metric. It was one, and the same
           * words then appeared three times in one header - in the fact line,
           * in this tile, and in the chip below - with "תשלום במסירה" wrapping
           * onto two lines and making its tile twice the width of the others.
           *
           * What goes there instead is the one number about this order that is
           * NOT already on the screen: how many orders the person has placed. A
           * first order and an eleventh are different decisions, and that is the
           * context a total cannot give.
           */
          metrics={[
            { label: "סה״כ", value: formatCurrency(Number(order.total) || 0) },
            { label: "פריטים", value: items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) },
            {
              label: "הזמנות הלקוח",
              // An order with no identity behind it has no count to show, and
              // "0" would be a claim - this order alone disproves it.
              value: customer ? customer.orders_count : "—",
              icon: ShoppingCart,
              ...(customer ? { onClick: () => navigate(`/admin/customers/${customer.identity_id}`) } : {}),
            },
          ]}
          actions={
            <>
              <span
                className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium", TONE_CHIP[payment.tone])}
              >
                <CreditCard className="h-3.5 w-3.5" />
                {payment.label}
              </span>

              {/* Urgency is a property of what was bought, and a guess when the
                  order does not carry one. Shown only when it is not "רגיל", so
                  the dot means something the one time it appears. */}
              {urgencyKey !== "none" && (
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium", TONE_CHIP[urgency.tone])}>
                  <span className={cn("h-2 w-2 rounded-full", TONE_DOT[urgency.tone])} aria-hidden />
                  {urgency.label}
                </span>
              )}

              {order.order_type === "auto-restock" && (
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium", TONE_CHIP.accent)}>
                  <Repeat className="h-3.5 w-3.5" />
                  הזמנת מנוי
                </span>
              )}

              <OrderShareMenu order={order} />
            </>
          }
        />

        <Entity360Tabs
          tabs={TABS.map((entry) => ({
            ...entry,
            count: entry.key === "items" ? items.length
              : entry.key === "history" ? detail?.events.length
                : undefined,
          }))}
          active={tab}
          onSelect={setTab}
        />

        {tab === "overview" && (
          /* The basket comes first in the facts column. An order's total above
             an address, with what was actually bought behind a tab, is a record
             that answers "how much" before "what" - and "what" is the question
             somebody opening an order has. The tab keeps a roomier view for a
             long basket. */
          <Entity360Columns
            facts={<><Entity360Panel title="פריטים">{itemList}</Entity360Panel>{moneyPanel}{addressPanel}</>}
            stream={historyPanel}
            actions={<>{actionsPanel}{customerPanel}</>}
          />
        )}

        {tab === "items" && <Entity360Panel title="פריטים">{itemList}</Entity360Panel>}

        {tab === "history" && historyPanel}
      </div>

      <OrderLabelGenerator
        orders={labelFormat ? [order] : []}
        open={Boolean(labelFormat)}
        onClose={() => setLabelFormat(null)}
        initialFormat={labelFormat || "lite"}
      />
    </AdminLayout>
  );
};

export default AdminOrder360;
