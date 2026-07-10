import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CreditCard, Hash, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getShopOrder } from "@/lib/mipoApi";
import { getOrderAccessToken } from "@/lib/orderAccess";

const ORDER_STATUS: Record<string, string> = {
  pending: "התקבלה",
  processing: "בטיפול",
  shipped: "נשלחה",
  delivered: "נמסרה",
  cancelled: "בוטלה",
};

const PAYMENT_STATUS: Record<string, string> = {
  pending: "ממתין לאישור",
  paid: "שולם",
  failed: "נכשל",
  awaiting_cod: "לתשלום במסירה",
  refunded: "הוחזר",
  dev_approved: "אושר בסביבת פיתוח",
};

const OrderTrackingPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const accessToken = getOrderAccessToken(orderId);
  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: () => getShopOrder(orderId!, accessToken),
    enabled: !!orderId,
    retry: false,
  });

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background" dir="rtl">
        <div className="max-w-lg mx-auto px-5 py-20 space-y-4" role="status">
          <div className="h-6 w-40 rounded bg-muted animate-pulse" />
          <div className="h-32 rounded-lg bg-muted animate-pulse" />
          <span className="sr-only">טוען הזמנה</span>
        </div>
      </main>
    );
  }

  if (isError || !order) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6" dir="rtl">
        <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-600" />
          <h1 className="text-lg font-bold">לא ניתן להציג את ההזמנה</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            הקישור אינו תקין, פג תוקף או שאינך מורשה לצפות בהזמנה הזו.
          </p>
          <Button className="mt-5 w-full" onClick={() => navigate("/order-history")}>
            להיסטוריית ההזמנות
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-5 h-14 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="חזרה">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="text-[15px] font-semibold">פרטי הזמנה</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-4">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-card border border-border/50 p-5 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
              <Package className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">מספר הזמנה</p>
              <p className="font-bold">{order.order_number}</p>
            </div>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">סטטוס הזמנה</dt>
              <dd className="font-semibold">{ORDER_STATUS[order.status] || order.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">סטטוס תשלום</dt>
              <dd className="font-semibold">{PAYMENT_STATUS[order.payment_status] || order.payment_status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">תאריך הזמנה</dt>
              <dd className="font-semibold">{new Date(order.order_date).toLocaleDateString("he-IL")}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">סכום</dt>
              <dd className="font-semibold">₪{order.total.toFixed(2)}</dd>
            </div>
          </dl>
        </motion.section>

        {order.tracking_number && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg bg-card border border-border/50 p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">מספר מעקב שנמסר להזמנה</h2>
            </div>
            <p className="font-mono text-sm break-all" dir="ltr">{order.tracking_number}</p>
          </motion.section>
        )}

        <Button variant="outline" className="w-full" onClick={() => navigate("/order-history")}>
          <CreditCard className="w-4 h-4 ml-2" />
          להיסטוריית ההזמנות
        </Button>
      </div>
    </main>
  );
};

export default OrderTrackingPage;
