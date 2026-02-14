import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { XCircle, RefreshCw, MessageCircle, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const PaymentFailed = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const paymentId = searchParams.get('payment_id');
  const subscriptionId = searchParams.get('subscription_id');
  const chargeId = searchParams.get('charge_id');

  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;

      try {
        const { data } = await supabase
          .from('orders')
          .select('order_number')
          .eq('id', orderId)
          .single();

        if (data) {
          setOrderNumber(data.order_number);
        }
      } catch (err) {
        console.error('Error fetching order:', err);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleRetry = () => {
    if (orderId) {
      // Go back to checkout to retry
      navigate('/cart');
    } else {
      navigate('/pricing');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-destructive/10 to-background flex items-center justify-center p-4" dir="rtl">
      <Card className="max-w-md w-full text-center border-0 shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl" />
              <XCircle className="h-20 w-20 text-red-500 relative" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">התשלום נכשל</CardTitle>
          <CardDescription className="text-base mt-2">
            לצערנו, לא הצלחנו לעבד את התשלום שלך. 
            הפריטים עדיין בעגלה שלך ותוכל לנסות שוב.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Info */}
          {orderNumber && (
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-sm text-muted-foreground">
                מספר הזמנה: <span className="font-bold">{orderNumber}</span>
              </p>
            </div>
          )}

          {/* Common Reasons */}
          <div className="text-right bg-muted rounded-xl p-4 text-sm">
            <p className="font-semibold mb-2 text-foreground">סיבות נפוצות לכישלון:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• כרטיס אשראי לא פעיל או חסום</li>
              <li>• חריגה ממסגרת האשראי</li>
              <li>• פרטי כרטיס שגויים</li>
              <li>• בעיית חיבור אינטרנט</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Button 
              onClick={handleRetry} 
              className="w-full rounded-xl gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              נסה שוב
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/support')} 
              className="w-full rounded-xl gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              פנייה לתמיכה
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')} 
              className="w-full rounded-xl gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              חזרה לדף הבית
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentFailed;
