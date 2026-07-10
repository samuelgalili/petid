import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle, Package, Truck, ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { getShopOrder, type MipoOrder } from "@/lib/mipoApi";
import { getOrderAccessToken, rememberOrderAccess } from "@/lib/orderAccess";

type ShippingAddress = {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  zipCode?: string;
};

const getShippingAddress = (order: MipoOrder): ShippingAddress => order.shipping_address || {};
const isConfirmedPayment = (status: string) => status === "paid" || (import.meta.env.DEV && status === "dev_approved");

const toConfirmationOrder = (order: MipoOrder) => {
  const shippingAddress = getShippingAddress(order);
  return {
    orderId: order.order_number,
    orderUuid: order.id,
    items: order.items.map((item) => ({
      id: item.product_id || item.id,
      name: item.product_name,
      image: item.product_image,
      price: item.price,
      quantity: item.quantity,
      variant: item.variant,
      size: item.size,
    })),
    shippingData: {
      fullName: shippingAddress.fullName || order.customer_name || "",
      email: shippingAddress.email || order.customer_email || "",
      phone: shippingAddress.phone || order.customer_phone || "",
      address: shippingAddress.address || "",
      city: shippingAddress.city || "",
      zipCode: shippingAddress.zipCode || "",
    },
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    subtotal: order.subtotal,
    shipping: order.shipping,
    tax: order.tax,
    discount: order.discount_amount,
    cashOnDeliveryFee: order.cash_on_delivery_fee,
    total: order.total,
    orderDate: order.order_date,
  };
};

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const orderId = searchParams.get('order_id');
  const [order, setOrder] = useState<MipoOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchOrder = async () => {
      if (!orderId) {
        setError("לא נמצא מזהה הזמנה בקישור התשלום.");
        setLoading(false);
        return;
      }

      try {
        const accessToken = getOrderAccessToken(orderId);
        let data: MipoOrder | null = null;

        for (let attempt = 0; attempt < 5; attempt += 1) {
          data = await getShopOrder(orderId, accessToken);
          if (isConfirmedPayment(data.payment_status)) break;
          if (["failed", "refunded"].includes(data.payment_status)) {
            throw new Error("PAYMENT_FAILED");
          }
          if (attempt < 4) {
            await new Promise((resolve) => window.setTimeout(resolve, 1000));
          }
        }

        if (!data || !isConfirmedPayment(data.payment_status)) {
          throw new Error("PAYMENT_NOT_CONFIRMED");
        }
        if (cancelled) return;

        setOrder(data);
        clearCart();
        rememberOrderAccess(data, accessToken);

        const pendingOrder = sessionStorage.getItem("pendingOrder");
        if (pendingOrder) {
          sessionStorage.setItem("lastOrder", pendingOrder);
        } else {
          sessionStorage.setItem("lastOrder", JSON.stringify(toConfirmationOrder(data)));
        }

        sessionStorage.removeItem("pendingOrder");
        sessionStorage.setItem("mipo_checkout_contact", JSON.stringify(toConfirmationOrder(data).shippingData));
      } catch (err) {
        if (cancelled) return;
        console.error("Error verifying payment:", err);
        setError(
          err instanceof Error && err.message === "PAYMENT_FAILED"
            ? "התשלום לא אושר. אפשר לחזור לעגלה ולנסות שוב."
            : "עדיין לא הצלחנו לאמת את התשלום. לא בוצעו שינויים בעגלה.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchOrder();
    return () => {
      cancelled = true;
    };
  }, [orderId, clearCart]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <div className="text-center space-y-3" role="status">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="font-medium">מאמתים את התשלום...</p>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <AlertTriangle className="h-14 w-14 text-amber-600 mx-auto mb-3" />
            <CardTitle>לא ניתן לאמת את התשלום</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={() => window.location.reload()}>בדיקה מחדש</Button>
            <Button className="w-full" variant="outline" onClick={() => navigate("/cart")}>חזרה לעגלה</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-success/10 to-background flex items-center justify-center p-4" dir="rtl">
      <Card className="max-w-md w-full text-center border-0 shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
              <CheckCircle className="h-20 w-20 text-green-500 relative" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">התשלום בוצע בהצלחה!</CardTitle>
          <CardDescription className="text-base mt-2">
            תודה על הרכישה שלך. ההזמנה התקבלה ותועבר לטיפול.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Details */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">מספר הזמנה:</span>
                <span className="font-bold">{order.order_number}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">סכום ששולם:</span>
                <span className="font-bold text-green-600">₪{order.total.toFixed(2)}</span>
              </div>
              {getShippingAddress(order).email && order.payment_status === "paid" && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">אישור נשלח ל:</span>
                  <span className="font-medium">{getShippingAddress(order).email}</span>
                </div>
              )}
          </div>

          {/* Status Timeline */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>תשלום</span>
            </div>
            <ArrowLeft className="w-4 h-4" />
            <div className="flex items-center gap-1">
              <Package className="w-4 h-4 text-amber-500" />
              <span>אריזה</span>
            </div>
            <ArrowLeft className="w-4 h-4" />
            <div className="flex items-center gap-1">
              <Truck className="w-4 h-4 text-muted-foreground" />
              <span>משלוח</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            {orderId && (
              <Button 
                onClick={() => navigate('/order-history')} 
                className="w-full rounded-xl"
              >
                צפייה בהזמנות שלי
              </Button>
            )}
            <Button 
              variant={orderId ? "outline" : "default"}
              onClick={() => navigate('/')} 
              className="w-full rounded-xl"
            >
              חזרה לדף הבית
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
