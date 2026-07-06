import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Package, Truck, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { getShopOrder, type MipoOrder } from "@/lib/mipoApi";

type ShippingAddress = {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  zipCode?: string;
};

const getShippingAddress = (order: MipoOrder): ShippingAddress => order.shipping_address || {};

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
  const paymentId = searchParams.get('payment_id');
  const subscriptionId = searchParams.get('subscription_id');
  
  const [order, setOrder] = useState<MipoOrder | null>(null);
  const [loading, setLoading] = useState(!!orderId);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const data = await getShopOrder(orderId);
        setOrder(data);

        clearCart();

        const pendingOrder = localStorage.getItem("pendingOrder");
        if (pendingOrder) {
          localStorage.setItem("lastOrder", pendingOrder);
        } else {
          localStorage.setItem("lastOrder", JSON.stringify(toConfirmationOrder(data)));
        }

        localStorage.removeItem("pendingOrder");
        localStorage.setItem("mipo_checkout_contact", JSON.stringify(toConfirmationOrder(data).shippingData));

        const existingIds = JSON.parse(localStorage.getItem("mipo_order_ids") || "[]");
        const nextIds = Array.from(new Set([data.id, ...(Array.isArray(existingIds) ? existingIds : [])])).slice(0, 50);
        localStorage.setItem("mipo_order_ids", JSON.stringify(nextIds));
      } catch (err) {
        console.error('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, clearCart]);

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
          <CardTitle className="text-2xl font-bold">התשלום בוצע בהצלחה! 🎉</CardTitle>
          <CardDescription className="text-base mt-2">
            תודה על הרכישה שלך. קבלה תישלח לכתובת הדוא״ל שלך.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Details */}
          {order && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">מספר הזמנה:</span>
                <span className="font-bold">{order.order_number}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">סכום ששולם:</span>
                <span className="font-bold text-green-600">₪{order.total.toFixed(2)}</span>
              </div>
              {getShippingAddress(order).email && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">אישור נשלח ל:</span>
                  <span className="font-medium">{getShippingAddress(order).email}</span>
                </div>
              )}
            </div>
          )}

          {/* Legacy payment/subscription IDs */}
          {paymentId && !orderId && (
            <p className="text-sm text-muted-foreground">
              מספר עסקה: {paymentId}
            </p>
          )}
          {subscriptionId && (
            <p className="text-sm text-muted-foreground">
              מספר מנוי: {subscriptionId}
            </p>
          )}

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
