/**
 * AdminOrders — V55 Order Management View
 * High-density table with medical urgency, order type, customer+pet,
 * slide-out details panel, inventory warnings, and bulk actions.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Package, Clock, CheckCircle, Truck, XCircle, RefreshCw,
  ShoppingCart, DollarSign, Eye, AlertCircle, Printer,
  MapPin, MessageSquare, ChevronRight, Repeat, Heart,
  CheckSquare, Square, Send, Download, User, PawPrint,
  AlertTriangle, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  AdminStatCard, AdminStatsGrid, AdminToolbar,
  AdminEmptyState, AdminPageHeader,
} from "@/components/admin/AdminStyles";
import { cn } from "@/lib/utils";
import { OrderLabelGenerator } from "@/components/admin/OrderLabelGenerator";

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  price: number;
  size?: string | null;
  variant?: string | null;
  product_id?: string | null;
}

interface Order {
  id: string;
  order_number: string;
  order_date: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  payment_status: string;
  payment_method: string;
  total: number;
  subtotal: number;
  shipping: number;
  tax: number;
  user_id: string;
  shipping_address: any;
  order_type: string;
  pet_name: string | null;
  customer_name: string | null;
  special_instructions: string | null;
  medical_urgency: string | null;
  order_items?: OrderItem[];
}

// Medical urgency keywords
const URGENT_KEYWORDS = ["urinary", "renal", "שתן", "כליות", "kidney"];
const MEDIUM_KEYWORDS = ["gastro", "diabetic", "סוכרת", "עיכול", "derma", "עור"];

function detectMedicalUrgency(items: OrderItem[]): string {
  const allText = items.map(i => i.product_name.toLowerCase()).join(" ");
  if (URGENT_KEYWORDS.some(kw => allText.includes(kw))) return "high";
  if (MEDIUM_KEYWORDS.some(kw => allText.includes(kw))) return "medium";
  return "none";
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "ממתין", icon: Clock, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  processing: { label: "באריזה", icon: RefreshCw, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  shipped: { label: "נשלח", icon: Truck, color: "text-violet-500 bg-violet-500/10 border-violet-500/20" },
  delivered: { label: "נמסר", icon: CheckCircle, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  cancelled: { label: "בוטל", icon: XCircle, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
};

const PAYMENT_CONFIG: Record<string, { label: string; color: string }> = {
  paid: { label: "שולם", color: "text-emerald-600 bg-emerald-500/10" },
  pending: { label: "ממתין", color: "text-amber-600 bg-amber-500/10" },
  failed: { label: "נכשל", color: "text-rose-600 bg-rose-500/10" },
  awaiting_cod: { label: "תשלום במסירה", color: "text-amber-600 bg-amber-500/10" },
  dev_approved: { label: "פיתוח", color: "text-blue-600 bg-blue-500/10" },
  refunded: { label: "הוחזר", color: "text-violet-600 bg-violet-500/10" },
  libra_credit: { label: "קרדיט Libra", color: "text-primary bg-primary/10" },
};

const URGENCY_CONFIG: Record<string, { label: string; dot: string }> = {
  high: { label: "דחוף", dot: "bg-rose-500" },
  medium: { label: "בינוני", dot: "bg-amber-500" },
  none: { label: "רגיל", dot: "bg-emerald-500" },
};

const AdminOrders = () => {
  const { toast } = useToast();
  useAdminNotifications();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [outOfStockItems, setOutOfStockItems] = useState<Set<string>>(new Set());
  const [showLabels, setShowLabels] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("order_date", { ascending: false })
        .limit(200);

      if (error) throw error;

      // Fetch order items for all orders
      const orderIds = (data || []).map(o => o.id);
      let itemsMap: Record<string, OrderItem[]> = {};

      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from("order_items")
          .select("*")
          .in("order_id", orderIds);

        if (items) {
          for (const item of items) {
            if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
            itemsMap[item.order_id].push(item as OrderItem);
          }
        }
      }

      // Check inventory for out-of-stock warnings
      const productIds = Object.values(itemsMap)
        .flat()
        .map(i => i.product_id)
        .filter(Boolean) as string[];

      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from("business_products")
          .select("id, in_stock")
          .in("id", [...new Set(productIds)]);

        if (products) {
          const oos = new Set(products.filter(p => !p.in_stock).map(p => p.id));
          setOutOfStockItems(oos);
        }
      }

      const enrichedOrders: Order[] = (data || []).map(o => {
        const items = itemsMap[o.id] || [];
        const urgency = o.medical_urgency && o.medical_urgency !== "none"
          ? o.medical_urgency
          : detectMedicalUrgency(items);
        return {
          ...o,
          order_items: items,
          medical_urgency: urgency,
          customer_name: o.customer_name || (typeof o.shipping_address === 'object' && o.shipping_address !== null ? (o.shipping_address as any)?.fullName : null) || null,
        } as Order;
      });

      setOrders(enrichedOrders);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast({ title: "שגיאה בטעינת הזמנות", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel("order-mgmt-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    let result = [...orders];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        o.order_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.pet_name?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") result = result.filter(o => o.status === statusFilter);
    if (typeFilter !== "all") result = result.filter(o => o.order_type === typeFilter);
    return result;
  }, [orders, searchQuery, statusFilter, typeFilter]);

  // Stats
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const pendingCount = orders.filter(o => o.status === "pending").length;
  const urgentCount = orders.filter(o => o.medical_urgency === "high").length;
  const autoRestockCount = orders.filter(o => o.order_type === "auto-restock").length;

  // Selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  // Bulk actions
  const bulkUpdateStatus = async (newStatus: Order["status"]) => {
    if (selectedIds.size === 0) return;
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .in("id", [...selectedIds]);
      if (error) throw error;
      toast({ title: `${selectedIds.size} הזמנות עודכנו ל${STATUS_CONFIG[newStatus].label}` });
      setSelectedIds(new Set());
      fetchOrders();
    } catch {
      toast({ title: "שגיאה בעדכון", variant: "destructive" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const updateSingleStatus = async (orderId: string, newStatus: Order["status"]) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);
      if (error) throw error;
      toast({ title: `סטטוס עודכן ל${STATUS_CONFIG[newStatus].label}` });
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
      fetchOrders();
    } catch {
      toast({ title: "שגיאה", variant: "destructive" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Check if order has out-of-stock items
  const orderHasOOS = (order: Order) => {
    return order.order_items?.some(i => i.product_id && outOfStockItems.has(i.product_id));
  };

  return (
    <AdminLayout title="ניהול הזמנות" icon={ShoppingCart}>
      <div className="space-y-5" dir="rtl">
        <AdminPageHeader
          title="ניהול הזמנות"
          description="מעקב, ניהול וטיפול בהזמנות לקוחות"
          icon={ShoppingCart}
          onRefresh={fetchOrders}
          isRefreshing={loading}
        />

        {/* Stats */}
        <AdminStatsGrid>
          <AdminStatCard title="סה״כ הזמנות" value={orders.length} icon={ShoppingCart} color="primary" />
          <AdminStatCard title="הכנסות" value={`₪${totalRevenue.toLocaleString()}`} icon={DollarSign} color="success" />
          <AdminStatCard title="ממתינות" value={pendingCount} icon={Clock} color="warning" />
          <AdminStatCard title="דחופות רפואית" value={urgentCount} icon={Heart} color="danger" />
        </AdminStatsGrid>

        {/* Toolbar */}
        <AdminToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="חיפוש לפי מספר הזמנה, לקוח או חיית מחמד..."
          onRefresh={fetchOrders}
          isRefreshing={loading}
        >
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="סוג" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסוגים</SelectItem>
              <SelectItem value="regular">רגיל</SelectItem>
              <SelectItem value="auto-restock">מנוי</SelectItem>
            </SelectContent>
          </Select>
        </AdminToolbar>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium">{selectedIds.size} נבחרו</span>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => bulkUpdateStatus("shipped")} disabled={updatingStatus}>
                <Truck className="w-3.5 h-3.5" /> סמן כנשלח
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => bulkUpdateStatus("delivered")} disabled={updatingStatus}>
                <CheckCircle className="w-3.5 h-3.5" /> סמן כנמסר
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> ייצוא לשליח
              </Button>
              <Button size="sm" variant="default" className="gap-1.5" onClick={() => setShowLabels(true)}>
                <Printer className="w-3.5 h-3.5" /> הדפס תוויות
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                <X className="w-3.5 h-3.5" /> ביטול
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : filteredOrders.length === 0 ? (
          <AdminEmptyState icon={Package} title="אין הזמנות" description="לא נמצאו הזמנות התואמות לחיפוש" />
        ) : (
          <Card className="border-border/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-muted-foreground">
                    <th className="py-3 px-3 text-right w-10">
                      <Checkbox
                        checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </th>
                    <th className="py-3 px-3 text-right font-medium">הזמנה</th>
                    <th className="py-3 px-3 text-right font-medium">לקוח וחיה</th>
                    <th className="py-3 px-3 text-right font-medium">סוג</th>
                    <th className="py-3 px-3 text-center font-medium">דחיפות</th>
                    <th className="py-3 px-3 text-right font-medium">סטטוס</th>
                    <th className="py-3 px-3 text-right font-medium">תשלום</th>
                    <th className="py-3 px-3 text-left font-medium">סה״כ</th>
                    <th className="py-3 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusCfg.icon;
                    const paymentCfg = PAYMENT_CONFIG[order.payment_status] || PAYMENT_CONFIG.pending;
                    const urgencyCfg = URGENCY_CONFIG[order.medical_urgency || "none"] || URGENCY_CONFIG.none;
                    const hasOOS = orderHasOOS(order);

                    return (
                      <tr
                        key={order.id}
                        className={cn(
                          "border-b hover:bg-muted/30 transition-colors cursor-pointer",
                          selectedIds.has(order.id) && "bg-primary/5",
                          order.medical_urgency === "high" && "bg-rose-500/5",
                          hasOOS && "bg-amber-500/5",
                        )}
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(order.id)}
                            onCheckedChange={() => toggleSelect(order.id)}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-foreground text-xs">{order.order_number}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(order.order_date).toLocaleDateString("he-IL")}
                          </p>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
                            <span className="text-xs font-medium truncate max-w-[120px]">
                              {order.customer_name || "—"}
                            </span>
                          </div>
                          {order.pet_name && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <PawPrint className="w-3 h-3 text-primary flex-shrink-0" strokeWidth={1.5} />
                              <span className="text-[10px] text-primary font-medium">{order.pet_name}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {order.order_type === "auto-restock" ? (
                            <Badge variant="outline" className="text-[10px] gap-0.5 border-primary/30 text-primary">
                              <Repeat className="w-2.5 h-2.5" /> מנוי
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">רגיל</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className={cn("w-2 h-2 rounded-full", urgencyCfg.dot)} />
                            {order.medical_urgency === "high" && (
                              <span className="text-[10px] font-bold text-rose-500">דחוף</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border", statusCfg.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", paymentCfg.color)}>
                            {paymentCfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-left">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-foreground">₪{order.total?.toFixed(0)}</span>
                            {hasOOS && (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" strokeWidth={2} />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t bg-muted/20 text-xs text-muted-foreground">
              מציג {filteredOrders.length} מתוך {orders.length} הזמנות
              {autoRestockCount > 0 && ` • ${autoRestockCount} מנויים פעילים`}
            </div>
          </Card>
        )}

        {/* Order Details Sheet */}
        <Sheet open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <SheetContent side="left" className="w-full sm:w-[420px] p-0">
            {selectedOrder && (
              <OrderDetailPanel
                order={selectedOrder}
                outOfStockItems={outOfStockItems}
                onStatusChange={updateSingleStatus}
                isUpdating={updatingStatus}
                onClose={() => setSelectedOrder(null)}
              />
            )}
          </SheetContent>
        </Sheet>

        {/* Label Generator */}
        <OrderLabelGenerator
          orders={filteredOrders.filter(o => selectedIds.has(o.id))}
          open={showLabels}
          onClose={() => setShowLabels(false)}
        />
      </div>
    </AdminLayout>
  );
};

// =====================================================
// Order Detail Side Panel
// =====================================================

function OrderDetailPanel({
  order, outOfStockItems, onStatusChange, isUpdating, onClose,
}: {
  order: Order;
  outOfStockItems: Set<string>;
  onStatusChange: (id: string, status: Order["status"]) => void;
  isUpdating: boolean;
  onClose: () => void;
}) {
  const urgencyCfg = URGENCY_CONFIG[order.medical_urgency || "none"] || URGENCY_CONFIG.none;
  const addr = order.shipping_address;
  const hasOOS = order.order_items?.some(i => i.product_id && outOfStockItems.has(i.product_id));

  return (
    <ScrollArea className="h-full" dir="rtl">
      <div className="p-5 space-y-5">
        {/* Header */}
        <SheetHeader className="space-y-1 p-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">{order.order_number}</SheetTitle>
            <div className="flex items-center gap-1.5">
              <div className={cn("w-2 h-2 rounded-full", urgencyCfg.dot)} />
              <span className="text-[10px] font-medium text-muted-foreground">{urgencyCfg.label}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(order.order_date).toLocaleDateString("he-IL", {
              year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </SheetHeader>

        {/* Customer & Pet */}
        <Card className="border-border/30">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-sm font-medium">{order.customer_name || addr?.fullName || "—"}</span>
            </div>
            {order.pet_name && (
              <div className="flex items-center gap-2">
                <PawPrint className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <span className="text-sm text-primary font-medium">{order.pet_name}</span>
              </div>
            )}
            {order.order_type === "auto-restock" && (
              <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 text-primary">
                <Repeat className="w-3 h-3" /> הזמנת מנוי אוטומטי
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Out-of-Stock Warning */}
        {hasOOS && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" strokeWidth={2} />
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                הזמנה זו מכילה מוצרים שאזלו מהמלאי!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Items */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">פריטים ({order.order_items?.length || 0})</p>
          <div className="space-y-2">
            {order.order_items?.map(item => {
              const isOOS = item.product_id && outOfStockItems.has(item.product_id);
              return (
                <div key={item.id} className={cn(
                  "flex items-center gap-3 p-2 rounded-lg border border-border/20",
                  isOOS && "border-amber-500/30 bg-amber-500/5"
                )}>
                  <img
                    src={item.product_image || "/placeholder.svg"}
                    alt={item.product_name}
                    className="w-12 h-12 rounded-lg object-cover bg-muted"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.product_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">x{item.quantity}</span>
                      {item.size && <span className="text-[10px] text-muted-foreground">({item.size})</span>}
                      {isOOS && (
                        <Badge variant="destructive" className="text-[8px] px-1 py-0">אזל</Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold">₪{(item.price * item.quantity).toFixed(0)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Price Summary */}
        <div className="space-y-1 text-xs border-t pt-3">
          <div className="flex justify-between"><span className="text-muted-foreground">סכום ביניים</span><span>₪{order.subtotal?.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">משלוח</span><span>₪{order.shipping?.toFixed(2)}</span></div>
          {order.tax > 0 && <div className="flex justify-between"><span className="text-muted-foreground">מע"מ</span><span>₪{order.tax?.toFixed(2)}</span></div>}
          <div className="flex justify-between font-bold text-sm pt-1 border-t">
            <span>סה״כ</span><span>₪{order.total?.toFixed(2)}</span>
          </div>
        </div>

        {/* Shipping Address */}
        {addr && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} /> כתובת למשלוח
            </p>
            <Card className="border-border/30">
              <CardContent className="p-3 text-xs space-y-1">
                <p>{addr.street} {addr.apartment ? `דירה ${addr.apartment}` : ""}</p>
                <p>{addr.city}</p>
                {addr.phone && <p dir="ltr" className="text-muted-foreground">{addr.phone}</p>}
                {addr.city && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${addr.street}, ${addr.city}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary text-[10px] font-medium mt-1 hover:underline"
                  >
                    <MapPin className="w-3 h-3" /> פתח במפות
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Special Instructions */}
        {order.special_instructions && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} /> הוראות מיוחדות
            </p>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3 text-xs">{order.special_instructions}</CardContent>
            </Card>
          </div>
        )}

        {/* Status Change */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">עדכון סטטוס</p>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.entries(STATUS_CONFIG) as [string, typeof STATUS_CONFIG[string]][]).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <Button
                  key={key}
                  variant={order.status === key ? "default" : "outline"}
                  size="sm"
                  className="text-[10px] gap-1 h-8"
                  disabled={isUpdating || order.status === key}
                  onClick={() => onStatusChange(order.id, key as Order["status"])}
                >
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Print Label */}
        <Button variant="outline" className="w-full gap-2 text-xs" onClick={() => window.print()}>
          <Printer className="w-4 h-4" strokeWidth={1.5} />
          הדפס תווית משלוח
        </Button>
      </div>
    </ScrollArea>
  );
}

export default AdminOrders;
