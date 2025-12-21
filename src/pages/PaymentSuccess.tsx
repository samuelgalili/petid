import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('payment_id');
  const subscriptionId = searchParams.get('subscription_id');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">התשלום בוצע בהצלחה!</CardTitle>
          <CardDescription className="text-base mt-2">
            תודה על הרכישה שלך. קבלה תישלח לכתובת הדוא״ל שלך.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentId && (
            <p className="text-sm text-muted-foreground">
              מספר עסקה: {paymentId}
            </p>
          )}
          {subscriptionId && (
            <p className="text-sm text-muted-foreground">
              מספר מנוי: {subscriptionId}
            </p>
          )}
          <Button onClick={() => navigate('/')} className="w-full">
            חזרה לדף הבית
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
