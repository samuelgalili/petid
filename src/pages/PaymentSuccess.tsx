import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Package, Truck, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";

interface OrderDetails {
  order_number: string;
  total: number;
  shipping_address: {
    fullName: string;
    email: string;
  };
}

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const orderId = searchParams.get('order_id');
  const paymentId = searchParams.get('payment_id');
  const subscriptionId = searchParams.get('subscription_id');
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(!!orderId);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('order_number, total, shipping_address')
          .eq('id', orderId)
          .single();

        if (!error && data) {
          setOrder(data as OrderDetails);
          
          // Clear cart on successful payment
          clearCart();
          
          // Clear pending order from localStorage
          localStorage.removeItem('pendingOrder');
          
          // Store as last order for order confirmation page
          const pendingOrder = localStorage.getItem('pendingOrder');
          if (pendingOrder) {
            localStorage.setItem('lastOrder', pendingOrder);
          }
        }
      } catch (err) {
        console.error('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, clearCart]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background flex items-center justify-center p-4" dir="rtl">
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
              {order.shipping_address?.email && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">אישור נשלח ל:</span>
                  <span className="font-medium">{order.shipping_address.email}</span>
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
