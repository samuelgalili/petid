/**
 * The order queue.
 *
 * ─── WHY IT WAS RESTYLED, AND WHY THAT IS NOT COSMETIC ──────────────────────
 *
 * This screen kept the old styles after the shell around it moved onto the
 * admin tokens, and the result read worse than it had before: `bg-muted/30`
 * headers and `border-border/30` cards inside a surface that no longer matched
 * them, five status colours drawn from Tailwind's raw palette rather than from
 * the four the design system defines, and text at `text-[10px]` in a scale
 * whose smallest step is 11. Two tone systems on one screen is not a matter of
 * taste - it is a screen where colour has stopped meaning anything, because
 * amber-500/10 and --admin-warning-soft are both "sort of a warning".
 *
 * ─── THE PANEL IS GONE, AND THE ROW HAS AN ADDRESS ──────────────────────────
 *
 * The order used to open in a column beside the list. That column has a page of
 * its own now at /admin/orders/:orderId, for the reason the customer panel
 * became a page: an order needs a URL. Four Command Center cards and every
 * order on a customer's card pointed at `/admin/orders?order=<id>`, a parameter
 * this screen never read, so each of them landed here on the unfiltered list.
 * The link is honoured below for anything still holding one, and then replaced.
 *
 * What stays is the queue's own job: filter, select, and move a batch of orders
 * along without opening any of them.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle, CheckCircle, ChevronRight, Clock, Download, Heart, Printer,
  RefreshCw, ShoppingCart, Truck, User, PawPrint, Repeat, X,
} from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminChip, AdminTile } from "@/components/admin/AdminTile";
import { OrderLabelGenerator, type LabelFormat } from "@/components/admin/OrderLabelGenerator";
import { OrderShareMenu } from "@/components/admin/OrderShareMenu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency, formatDate } from "@/lib/adminCustomerLabels";
import {
  ORDER_STATUSES, ORDER_STATUS, ORDER_URGENCY, TONE_CHIP, TONE_DOT,
  detectMedicalUrgency, orderStatusOf, paymentStatusOf, type OrderStatus,
} from "@/lib/adminOrderLabels";
import {
  bulkUpdateAdminOrders, getAdminOrders, updateAdminOrder, type MipoOrder,
} from "@/lib/mipoApi";
import { cn } from "@/lib/utils";

type ShippingAddressFields = { fullName?: string };

/** An order as this screen needs it: the API's row plus the urgency it implies. */
type QueueOrder = MipoOrder & { urgency: string; display_name: string };

const AdminOrders = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  useAdminNotifications();
  /*
   * ONE QUEUE IN THE DOM, NOT TWO.
   *
   * The table and the phone cards were `hidden md:block` and `md:hidden`, which
   * renders BOTH and lets CSS pick. That doubles the node count for a list that
   * can run to five hundred rows, and it makes every order number, customer
   * name and total appear twice to anything reading the document - the first
   * test to look for an order after the change failed on it.
   *
   * 768 is the `md` breakpoint this hook already uses, so the two cannot drift.
   */
  const isPhone = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [labelFormat, setLabelFormat] = useState<LabelFormat>("lite");

  /*
   * THE LINK THAT USED TO GO NOWHERE.
   *
   * `?order=<id>` was built by the Command Center and by the customer card and
   * read by nobody, so those links loaded this list with no order open. The
   * sources now point at /admin/orders/:orderId; this redirect is for anything
   * still holding the old shape - a bookmark, an open tab, a card rendered
   * before a deploy - and it goes to the order rather than filtering the list,
   * because "show me this one order" is what the link always meant.
   */
  useEffect(() => {
    const requested = searchParams.get("order");
    if (requested) {
      navigate(`/admin/orders/${requested}`, { replace: true });
      return;
    }

    let next: URLSearchParams | null = null;
    const requestedStatus = searchParams.get("status");

    if (requestedStatus) {
      if (ORDER_STATUS[requestedStatus as OrderStatus]) {
        setStatusFilter(requestedStatus);
      } else {
        setStatusFilter("all");
        next = new URLSearchParams(searchParams);
        next.delete("status");
      }
    }

    if (searchParams.get("new") === "true") {
      // A manual order is placed from the customer's card, where the admin is
      // already looking at who they are taking it for.
      toast({
        title: "הזמנה ידנית נפתחת מכרטיס הלקוח",
        description: "בחרו את הלקוח ולחצו ״הזמנה חדשה״.",
      });
      next = next || new URLSearchParams(searchParams);
      next.delete("new");
    }

    if (next) setSearchParams(next, { replace: true });
  }, [navigate, searchParams, setSearchParams, toast]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getAdminOrders();
      setOrders((rows || []).map((row) => {
        const items = row.order_items || row.items || [];
        const address = (row.shipping_address || {}) as ShippingAddressFields;
        return {
          ...row,
          order_items: items,
          urgency: row.medical_urgency && row.medical_urgency !== "none"
            ? row.medical_urgency
            : detectMedicalUrgency(items),
          display_name: row.customer_name || address.fullName || "ללא שם",
        };
      }));
    } catch (error) {
      toast({
        title: "טעינת ההזמנות נכשלה",
        description: error instanceof Error ? error.message : "נסה לרענן",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void fetchOrders(); }, [fetchOrders]);

  const changeStatusFilter = useCallback((value: string) => {
    setStatusFilter(value);
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete("status");
    else next.set("status", value);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (typeFilter !== "all" && order.order_type !== typeFilter) return false;
      if (!term) return true;
      return [order.order_number, order.display_name, order.pet_name, order.customer_email]
        .some((field) => field?.toLowerCase().includes(term));
    });
  }, [orders, search, statusFilter, typeFilter]);

  const stats = useMemo(() => ({
    total: orders.length,
    revenue: orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0),
    pending: orders.filter((order) => order.status === "pending").length,
    urgent: orders.filter((order) => order.urgency === "high").length,
    subscriptions: orders.filter((order) => order.order_type === "auto-restock").length,
  }), [orders]);

  const toggle = (id: string) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const toggleAll = () => setSelectedIds((current) => (
    current.size === filtered.length ? new Set() : new Set(filtered.map((order) => order.id))
  ));

  const bulkStatus = async (status: OrderStatus) => {
    if (selectedIds.size === 0) return;
    setUpdating(true);
    try {
      await bulkUpdateAdminOrders([...selectedIds], { status });
      toast({ title: `${selectedIds.size} הזמנות עודכנו ל${ORDER_STATUS[status].label}` });
      setSelectedIds(new Set());
      await fetchOrders();
    } catch (error) {
      toast({
        title: "העדכון נכשל",
        description: error instanceof Error ? error.message : "נסה שוב",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const changeStatus = async (orderId: string, status: OrderStatus) => {
    setUpdating(true);
    try {
      await updateAdminOrder(orderId, { status });
      toast({ title: `הסטטוס עודכן ל${ORDER_STATUS[status].label}` });
      await fetchOrders();
    } catch (error) {
      toast({
        title: "העדכון נכשל",
        description: error instanceof Error ? error.message : "נסה שוב",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  /** The ids the list is showing, in its order, so the order page can step through them. */
  const listParam = filtered.map((order) => order.id).join(",");

  return (
    <AdminLayout
      title="הזמנות"
      description="התור, מהחריגות עד המסירה"
      icon={ShoppingCart}
      // In the shell's header rather than in a second one below it. This screen
      // used to build its own title block, which put a second <h1> reading
      // "הזמנות" directly under the first.
      actions={
        <Button
          variant="outline" size="sm" className="admin-focus gap-1.5"
          onClick={() => void fetchOrders()} disabled={loading}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          רענון
        </Button>
      }
    >
      <div className="space-y-3">
        {/* Every tile is a filter, not a figure to read. A number on an
            operations screen that cannot be opened is a number somebody has to
            go and reproduce by hand. */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <AdminTile
            label="סה״כ הזמנות" value={stats.total}
            // Hebrew counts one differently, and "1 מנויים" is the kind of
            // wrongness that reads as a machine wrote the screen.
            sub={stats.subscriptions === 0 ? "הכל"
              : stats.subscriptions === 1 ? "מנוי אחד"
                : `${stats.subscriptions} מנויים`}
            icon={ShoppingCart} tone={TONE_CHIP.accent}
            onClick={() => { changeStatusFilter("all"); setTypeFilter("all"); }}
          />
          <AdminTile
            label="הכנסות" value={formatCurrency(stats.revenue)}
            // Said plainly, because it is the sum of what is LOADED and not of
            // every order ever placed - and a revenue figure that quietly means
            // something narrower than it says is the one number nobody checks.
            sub="מתוך ההזמנות שנטענו"
            icon={CheckCircle} tone={TONE_CHIP.good}
          />
          <AdminTile
            label="ממתינות" value={stats.pending} sub="דורשות החלטה"
            icon={Clock} tone={TONE_CHIP.warn}
            onClick={() => changeStatusFilter("pending")}
          />
          <AdminTile
            label="דחופות רפואית" value={stats.urgent}
            sub={stats.urgent > 0 ? "מזון רפואי או כרוני" : "אין"}
            icon={Heart} tone={stats.urgent > 0 ? TONE_CHIP.bad : TONE_CHIP.neutral}
          />
        </div>

        <div className="admin-card flex flex-wrap items-center gap-2 p-2.5">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="חיפוש לפי מספר הזמנה, לקוח, חיה או אימייל"
            // The admin's own line and surface, not `border-input bg-background`
            // off the customer app's palette: on a white admin card those are
            // white on white, so the field had no edge and did not read as a
            // field at all.
            className="admin-focus h-9 min-w-[200px] flex-1 border-admin-line bg-admin-sunk text-[13px]"
            aria-label="חיפוש הזמנות"
          />
          <Select value={statusFilter} onValueChange={changeStatusFilter}>
            <SelectTrigger className="admin-focus h-9 w-32 text-[13px]" aria-label="סינון לפי סטטוס">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              {ORDER_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>{ORDER_STATUS[status].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="admin-focus h-9 w-28 text-[13px]" aria-label="סינון לפי סוג">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסוגים</SelectItem>
              <SelectItem value="regular">רגיל</SelectItem>
              <SelectItem value="auto-restock">מנוי</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedIds.size > 0 && (
          <div className="admin-card flex flex-wrap items-center gap-2 border-admin-accent/40 bg-admin-accent-soft p-2.5">
            <span className="text-[13px] font-semibold text-admin-accent">
              {selectedIds.size} נבחרו
            </span>
            <Button
              size="sm" variant="outline" className="admin-focus gap-1.5 text-[12px]"
              disabled={updating} onClick={() => void bulkStatus("shipped")}
            >
              <Truck className="h-3.5 w-3.5" />
              סמן כנשלח
            </Button>
            <Button
              size="sm" variant="outline" className="admin-focus gap-1.5 text-[12px]"
              disabled={updating} onClick={() => void bulkStatus("delivered")}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              סמן כנמסר
            </Button>
            <Button
              size="sm" className="admin-focus gap-1.5 text-[12px]"
              onClick={() => { setLabelFormat("lite"); setShowLabels(true); }}
            >
              <Printer className="h-3.5 w-3.5" />
              הדפס תוויות
            </Button>
            <Button
              size="sm" variant="ghost" className="admin-focus gap-1.5 text-[12px]"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="h-3.5 w-3.5" />
              ביטול
            </Button>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, index) => <Skeleton key={index} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-card p-8 text-center">
            <p className="admin-section">אין הזמנות</p>
            <p className="admin-body pt-1">
              {orders.length === 0 ? "עוד לא התקבלה הזמנה" : "אין הזמנות שתואמות לסינון"}
            </p>
          </div>
        ) : (
          <>
            {/* ── the table, from md up ─────────────────────────────────────
                Below that it is a list of cards. A nine-column table on a
                390px screen is a horizontal scroll in which the status is
                always off-frame, and the status is the column an operator
                reads. */}
            {!isPhone && (
              <div className="admin-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-admin-line bg-admin-sunk">
                      <th className="w-10 px-3 py-2.5">
                        <Checkbox
                          checked={selectedIds.size === filtered.length && filtered.length > 0}
                          onCheckedChange={toggleAll}
                          aria-label="בחירת כל ההזמנות"
                        />
                      </th>
                      {["הזמנה", "לקוח וחיה", "סטטוס", "תשלום", "סה״כ", "שיתוף"].map((heading) => (
                        <th key={heading} className="admin-label px-3 py-2.5 text-right font-semibold">
                          {heading}
                        </th>
                      ))}
                      <th className="w-8 px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((order) => {
                      const status = orderStatusOf(order.status);
                      const payment = paymentStatusOf(order.payment_status);
                      const urgency = ORDER_URGENCY[order.urgency] ?? ORDER_URGENCY.none;
                      const StatusIcon = status.icon;

                      return (
                        <tr
                          key={order.id}
                          className="cursor-pointer border-b border-admin-line transition-colors last:border-0 hover:bg-admin-sunk"
                          onClick={() => navigate(`/admin/orders/${order.id}?list=${listParam}`)}
                        >
                          <td className="px-3 py-2.5" onClick={(event) => event.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(order.id)}
                              onCheckedChange={() => toggle(order.id)}
                              aria-label={`בחירת הזמנה ${order.order_number}`}
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-admin-ink">
                              {/* The dot appears only when the urgency is not
                                  ordinary, so it reads as a flag rather than as
                                  a decoration on every row. */}
                              {order.urgency !== "none" && (
                                <span
                                  className={cn("h-2 w-2 shrink-0 rounded-full", TONE_DOT[urgency.tone])}
                                  title={urgency.label}
                                />
                              )}
                              {order.order_number}
                            </p>
                            <p className="admin-meta">{formatDate(order.order_date)}</p>
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="flex items-center gap-1.5 text-[13px] text-admin-ink">
                              <User className="h-3 w-3 shrink-0 text-admin-ink-subtle" strokeWidth={1.6} />
                              <span className="max-w-[160px] truncate">{order.display_name}</span>
                            </p>
                            {order.pet_name && (
                              <p className="admin-meta flex items-center gap-1.5">
                                <PawPrint className="h-3 w-3 shrink-0" strokeWidth={1.6} />
                                {order.pet_name}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2.5" onClick={(event) => event.stopPropagation()}>
                            <Select
                              value={order.status}
                              onValueChange={(value) => void changeStatus(order.id, value as OrderStatus)}
                              disabled={updating}
                            >
                              <SelectTrigger
                                className={cn(
                                  "admin-focus h-7 w-[118px] gap-1 rounded-full border-0 px-2.5 text-[11px] font-medium",
                                  TONE_CHIP[status.tone],
                                )}
                                aria-label={`שינוי סטטוס הזמנה ${order.order_number}`}
                              >
                                {/* !inline-flex, because SelectTrigger sets
                                    `[&>span]:line-clamp-1` and line-clamp is
                                    `display:-webkit-box` with a vertical box
                                    orient - which stacked the icon ABOVE the
                                    word and made every status pill two lines
                                    tall. */}
                                <span className="!inline-flex items-center gap-1 whitespace-nowrap">
                                  <StatusIcon className="h-3 w-3" />
                                  {status.label}
                                </span>
                              </SelectTrigger>
                              <SelectContent>
                                {ORDER_STATUSES.map((value) => (
                                  <SelectItem key={value} value={value}>{ORDER_STATUS[value].label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2.5">
                            <AdminChip label={payment.label} tone={payment.tone} />
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="admin-figure text-[13px] tabular-nums">
                              {formatCurrency(Number(order.total) || 0)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5" onClick={(event) => event.stopPropagation()}>
                            <OrderShareMenu order={order} />
                          </td>
                          <td className="px-3 py-2.5">
                            {/* Points LEFT: the row leads forward, and forward
                                in Hebrew runs left. */}
                            <ChevronRight className="h-4 w-4 rotate-180 text-admin-ink-subtle" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
                <div className="admin-meta border-t border-admin-line bg-admin-sunk px-3 py-2">
                  מציג {filtered.length} מתוך {orders.length} הזמנות
                </div>
              </div>
            )}

            {/* ── the same queue as cards, on a phone ───────────────────── */}
            {isPhone && (
              <div className="space-y-2">
              {filtered.map((order) => {
                const status = orderStatusOf(order.status);
                const payment = paymentStatusOf(order.payment_status);
                const urgency = ORDER_URGENCY[order.urgency] ?? ORDER_URGENCY.none;

                return (
                  <div key={order.id} className="admin-card p-3">
                    <div className="flex items-start gap-2.5">
                      <span className="pt-0.5" onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(order.id)}
                          onCheckedChange={() => toggle(order.id)}
                          aria-label={`בחירת הזמנה ${order.order_number}`}
                        />
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/orders/${order.id}?list=${listParam}`)}
                        className="admin-focus admin-tap min-w-0 flex-1 rounded-lg text-right"
                      >
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-admin-ink">
                            {order.urgency !== "none" && (
                              <span className={cn("h-2 w-2 shrink-0 rounded-full", TONE_DOT[urgency.tone])} />
                            )}
                            {order.order_number}
                          </span>
                          <span className="admin-figure text-[13px] tabular-nums">
                            {formatCurrency(Number(order.total) || 0)}
                          </span>
                        </span>
                        <span className="admin-meta mt-0.5 block truncate">
                          {order.display_name}
                          {order.pet_name ? ` · ${order.pet_name}` : ""}
                          {` · ${formatDate(order.order_date)}`}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <AdminChip label={payment.label} tone={payment.tone} />
                          {order.order_type === "auto-restock" && (
                            <AdminChip label="מנוי" tone="accent" icon={Repeat} />
                          )}
                        </span>
                      </button>
                    </div>

                    {/*
                      * THE STATUS AND THE SHARE, ON THE CARD.
                      *
                      * Outside the button above, because a <select> and a menu
                      * inside a <button> is invalid markup that browsers
                      * resolve by swallowing the inner control's clicks.
                      *
                      * They are here rather than a tap away on the order's page
                      * because the phone is exactly where an operator moves a
                      * queue along - standing at the bench with a parcel in one
                      * hand. Sending them to the record to change one field
                      * would make the phone the slow way to do the thing the
                      * phone is for.
                      */}
                    <div className="mt-2 flex items-center gap-2 border-t border-admin-line pt-2">
                      <Select
                        value={order.status}
                        onValueChange={(value) => void changeStatus(order.id, value as OrderStatus)}
                        disabled={updating}
                      >
                        <SelectTrigger
                          className={cn(
                            "admin-focus h-8 flex-1 gap-1 rounded-full border-0 px-3 text-[12px] font-medium",
                            TONE_CHIP[status.tone],
                          )}
                          aria-label={`שינוי סטטוס הזמנה ${order.order_number}`}
                        >
                          <span className="!inline-flex items-center gap-1.5 whitespace-nowrap">
                            <status.icon className="h-3.5 w-3.5" />
                            {status.label}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.map((value) => (
                            <SelectItem key={value} value={value}>{ORDER_STATUS[value].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <OrderShareMenu order={order} />
                    </div>
                  </div>
                );
              })}
                <p className="admin-meta px-1 text-center">
                  מציג {filtered.length} מתוך {orders.length} הזמנות
                </p>
              </div>
            )}
          </>
        )}

        {/* Not wired to anything yet, and it says so rather than looking
            available. A courier export that silently does nothing is worse than
            a button that admits it is not built. */}
        {selectedIds.size > 0 && (
          <p className="admin-meta flex items-center gap-1.5 px-1">
            <Download className="h-3 w-3" />
            ייצוא לשליח עדיין לא מחובר. בינתיים ההדפסה היא הדרך להוציא חבילה.
          </p>
        )}

        {stats.urgent > 0 && (
          <p className="admin-meta flex items-start gap-1.5 px-1">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-admin-warning" />
            דחיפות רפואית נקבעת משמות המוצרים, ולכן היא ניחוש: היא תפספס מזון רפואי
            ששמו בעברית ותסמן שמפו בשם ״derma״.
          </p>
        )}
      </div>

      <OrderLabelGenerator
        orders={filtered.filter((order) => selectedIds.has(order.id))}
        open={showLabels}
        onClose={() => setShowLabels(false)}
        initialFormat={labelFormat}
      />
    </AdminLayout>
  );
};

export default AdminOrders;
