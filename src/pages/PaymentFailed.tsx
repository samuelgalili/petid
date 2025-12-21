import { useNavigate, useSearchParams } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PaymentFailed = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('payment_id');
  const subscriptionId = searchParams.get('subscription_id');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl">התשלום נכשל</CardTitle>
          <CardDescription className="text-base mt-2">
            לצערנו, לא הצלחנו לעבד את התשלום שלך. אנא נסה שוב או פנה לתמיכה.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => navigate('/pricing')} className="w-full">
            נסה שוב
          </Button>
          <Button variant="outline" onClick={() => navigate('/')} className="w-full">
            חזרה לדף הבית
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentFailed;
