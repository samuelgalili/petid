import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, CreditCard, MapPin, Package, Truck, Smartphone, Wallet, Tag, X, Loader2, Heart, Shield, Bell, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { AppHeader } from "@/components/AppHeader";
import { CHECKOUT, SUCCESS } from "@/lib/brandVoice";
import { differenceInYears } from "date-fns";

const shippingSchema = z.object({
  fullName: z.string().trim().min(2, "שם מלא חייב להכיל לפחות 2 תווים").max(100, "שם מלא חייב להכיל פחות מ-100 תווים"),
  email: z.string().trim().email("כתובת אימייל לא תקינה").max(255, "אימייל חייב להכיל פחות מ-255 תווים"),
  phone: z.string().trim().regex(/^[0-9]{9,15}$/, "מספר טלפון חייב להכיל 9-15 ספרות"),
  address: z.string().trim().min(5, "כתובת חייבת להכיל לפחות 5 תווים").max(200, "כתובת חייבת להכיל פחות מ-200 תווים"),
  city: z.string().trim().min(2, "עיר חייבת להכיל לפחות 2 תווים").max(50, "עיר חייבת להכיל פחות מ-50 תווים"),
  zipCode: z.string().trim().regex(/^[0-9]{5,7}$/, "מיקוד חייב להכיל 5-7 ספרות"),
});

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, getSubtotal, clearCart } = useCart();
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("credit-card");
  const [installments, setInstallments] = useState(1);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [wantRecurringOrder, setWantRecurringOrder] = useState(false);
  const [shippingData, setShippingData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    zipCode: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUnder18, setIsUnder18] = useState<boolean | null>(null);
  const [ageCheckLoading, setAgeCheckLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Load coupon from sessionStorage (applied in Cart)
  useEffect(() => {
    const savedCoupon = sessionStorage.getItem('appliedCoupon');
    if (savedCoupon) {
      try {
        setAppliedCoupon(JSON.parse(savedCoupon));
        sessionStorage.removeItem('appliedCoupon'); // Clear after loading
      } catch (e) {
        console.error('Error loading coupon:', e);
      }
    }
  }, []);

  // Check user age and pre-fill shipping data on component mount
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('birthdate, first_name, last_name, full_name, email, phone, street, house_number, apartment_number, city, postal_code')
          .eq('id', user.id)
          .maybeSingle();

        // Check age
        if (profile?.birthdate) {
          const birthdate = new Date(profile.birthdate);
          const age = differenceInYears(new Date(), birthdate);
          setIsUnder18(age < 18);
        } else {
          setIsUnder18(false);
        }

        // Pre-fill shipping data from profile
        if (profile && !profileLoaded) {
          const fullName = profile.full_name || 
            [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 
            '';
          
          const address = [profile.street, profile.house_number, profile.apartment_number ? `דירה ${profile.apartment_number}` : '']
            .filter(Boolean)
            .join(' ') || '';

          setShippingData(prev => ({
            fullName: prev.fullName || fullName,
            email: prev.email || profile.email || user.email || '',
            phone: prev.phone || profile.phone?.replace(/^0/, '') || '',
            address: prev.address || address,
            city: prev.city || profile.city || '',
            zipCode: prev.zipCode || profile.postal_code || '',
          }));
          setProfileLoaded(true);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        setIsUnder18(false);
      } finally {
        setAgeCheckLoading(false);
      }
    };

    loadUserProfile();
  }, [navigate, profileLoaded]);

  const subtotal = getSubtotal();
  const baseShipping = subtotal >= 199 ? 0 : 25;
  
  // Check if coupon is free shipping type
  const isFreeShippingCoupon = appliedCoupon?.discount_type === 'free_shipping';
  const shipping = isFreeShippingCoupon ? 0 : baseShipping;
  
  // Calculate discount (only for non-free-shipping coupons)
  const discount = appliedCoupon && !isFreeShippingCoupon
    ? appliedCoupon.discount_type === 'percentage'
      ? (subtotal * appliedCoupon.discount_value) / 100
      : appliedCoupon.discount_value
    : 0;
  
  const discountedSubtotal = Math.max(0, subtotal - discount);
  // Price already includes VAT - no need to add tax separately
  const total = discountedSubtotal + shipping;

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setIsValidatingCoupon(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "קופון לא תקין",
          description: "הקופון שהזנת לא קיים או לא פעיל",
          variant: "destructive",
        });
        return;
      }

      if (data.min_order_amount && subtotal < data.min_order_amount) {
        toast({
          title: "מינימום הזמנה",
          description: `הזמנה מינימלית לקופון זה: ₪${data.min_order_amount}`,
          variant: "destructive",
        });
        return;
      }

      if (data.max_uses && data.used_count >= data.max_uses) {
        toast({
          title: "קופון מנוצל",
          description: "הקופון הזה כבר נוצל עד תום",
          variant: "destructive",
        });
        return;
      }

      console.log('Coupon applied:', data);
      console.log('Discount type:', data.discount_type);
      setAppliedCoupon(data);
      toast({
        title: "קופון הופעל!",
        description: data.discount_type === 'free_shipping'
          ? 'משלוח חינם!'
          : data.discount_type === 'percentage' 
            ? `הנחה של ${data.discount_value}%`
            : `הנחה של ₪${data.discount_value}`,
      });
    } catch (error) {
      console.error("Error validating coupon:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לבדוק את הקופון",
        variant: "destructive",
      });
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    toast({
      title: "קופון הוסר",
      duration: 1500,
    });
  };

  if (ageCheckLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (isUnder18) {
    return (
      <div className="min-h-screen pb-20 bg-background" dir="rtl">
        <AppHeader title="תשלום" showBackButton={true} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-3">
            רכישה מותרת מגיל 18 ומעלה
          </h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            על פי תנאי השימוש, רכישות באפליקציה מותרות רק למשתמשים בני 18 ומעלה.
          </p>
          <Button
            onClick={() => navigate("/cart")}
            variant="outline"
            className="rounded-full"
          >
            חזרה לעגלה
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    navigate("/cart");
    return null;
  }

  const validateShipping = () => {
    try {
      shippingSchema.parse(shippingData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            newErrors[issue.path[0] as string] = issue.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setShippingData({ ...shippingData, [field]: value });
    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (validateShipping()) {
        setCurrentStep(2);
      } else {
        toast({
          title: "שגיאת אימות",
          description: "אנא בדוק את כל השדות ונסה שוב",
          variant: "destructive",
        });
      }
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handlePlaceOrder = async () => {
    setIsProcessing(true);

    try {
      const orderTotal = total + (paymentMethod === "cash-on-delivery" ? 5 : 0);

      // GUARDRAIL: Block payment if total is invalid or zero
      if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
        toast({
          title: "שגיאת סכום",
          description: "לא ניתן לבצע תשלום: סכום לתשלום הוא 0. בדוק/י עגלה וקופון.",
          variant: "destructive",
        });
        console.error("BLOCK_PAYMENT_TOTAL_INVALID", { orderTotal, total, subtotal, shipping, discount, items });
        setIsProcessing(false);
        return;
      }

      console.log('Starting payment request with total:', orderTotal);
      const clientRequestId = crypto.randomUUID();
      const clientDebugVersion = 'checkout@2026-02-14-debug-v1';

      // Call the edge function to create payment and order
      // Calculate shipping discount for free shipping coupons
      const shippingDiscount = isFreeShippingCoupon ? baseShipping : 0;
      
      const paymentPayload = {
        items: items.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          variant: item.variant,
          size: item.size,
        })),
        shipping_address: shippingData,
        payment_method: paymentMethod,
        installments: installments,
        subtotal: subtotal,
        shipping: shipping,
        original_shipping: baseShipping,
        shipping_discount: shippingDiscount,
        tax: 0,
        total: orderTotal,
        coupon_id: appliedCoupon?.id,
        discount_amount: discount,
        success_url: `${window.location.origin}/payment-success`,
        cancel_url: `${window.location.origin}/payment-failed`,
        client_request_id: clientRequestId,
      };

      console.log('PAYMENT_PAYLOAD', JSON.stringify(paymentPayload));
      console.log('PAYMENT_TRACE_CLIENT', JSON.stringify({
        client_debug_version: clientDebugVersion,
        client_request_id: clientRequestId,
        expected_auth_param_name: 'UserName',
      }));

      const { data, error } = await supabase.functions.invoke('create-shop-payment', {
        body: paymentPayload
      });

      console.log('Payment response:', JSON.stringify(data), 'Error:', JSON.stringify(error));
      if (data?.debug) {
        console.log('PAYMENT_TRACE_SERVER_DEBUG', JSON.stringify(data.debug));
      }

      if (error) {
        console.error('Edge function error:', error);
        let detailedMessage = error.message || 'שגיאה בתקשורת עם השרת';
        const responseContext = (error as any)?.context;

        if (responseContext instanceof Response) {
          try {
            const errorBody = await responseContext.clone().json();
            const parts = [errorBody?.error, errorBody?.details].filter(Boolean);
            if (parts.length > 0) {
              detailedMessage = parts.join(': ');
            }
            if (errorBody?.debug) {
              console.error('PAYMENT_TRACE_SERVER_DEBUG', errorBody.debug);
            }
            console.error('Edge function error body:', errorBody, 'status:', responseContext.status);
          } catch {
            try {
              const errorText = await responseContext.clone().text();
              if (errorText) {
                detailedMessage = errorText;
              }
              console.error('Edge function error text:', errorText, 'status:', responseContext.status);
            } catch {
              // keep fallback message
            }
          }
        }

        throw new Error(detailedMessage);
      }

      // Check for error in response data
      if (data?.error) {
        console.error('Payment error in response:', data.error);
        throw new Error(data.error);
      }

      if (!data) {
        throw new Error('לא התקבלה תגובה מהשרת');
      }

      // If we got a payment URL (CardCom), redirect to it
      if (data.payment_url) {
        // Store order details for after payment
        const orderDetails = {
          orderId: data.order_number,
          items,
          shippingData,
          paymentMethod,
          subtotal,
          shipping,
          total: orderTotal,
          orderDate: new Date().toISOString(),
        };
        localStorage.setItem("pendingOrder", JSON.stringify(orderDetails));
        
        console.log('Redirecting to CardCom:', data.payment_url);
        // Redirect to CardCom payment page
        window.location.href = data.payment_url;
        return;
      }

      // For cash on delivery or dev mode - direct success
      if (data.success && data.redirect_url) {
        const orderDetails = {
          orderId: data.order_number,
          items,
          shippingData,
          paymentMethod,
          subtotal,
          shipping,
          total: orderTotal,
          orderDate: new Date().toISOString(),
        };
        localStorage.setItem("lastOrder", JSON.stringify(orderDetails));
        clearCart();
        
        if (data.dev_mode) {
          toast({
            title: "מצב פיתוח",
            description: "ההזמנה נשמרה ללא חיוב אמיתי (CardCom לא מוגדר)",
          });
        }
        
        navigate("/order-confirmation", { state: { order: orderDetails } });
        return;
      }

      // If we have success but no payment_url or redirect_url, check for order_id
      if (data.success && data.order_id) {
        const orderDetails = {
          orderId: data.order_number || data.order_id,
          items,
          shippingData,
          paymentMethod,
          subtotal,
          shipping,
          total: orderTotal,
          orderDate: new Date().toISOString(),
        };
        localStorage.setItem("lastOrder", JSON.stringify(orderDetails));
        clearCart();
        navigate("/order-confirmation", { state: { order: orderDetails } });
        return;
      }

      throw new Error("תגובה לא צפויה מהשרת");
    } catch (error: any) {
      console.error("Error placing order:", error);
      setIsProcessing(false);
      
      // More specific error messages
      let errorMessage = "נכשל בביצוע ההזמנה. אנא נסה שוב.";
      if (error.message?.includes('Failed to send')) {
        errorMessage = "שגיאת תקשורת - נסה שוב";
      } else if (error.message?.includes('נדרשת התחברות')) {
        errorMessage = "נא להתחבר מחדש ולנסות שוב";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "ההזמנה נכשלה",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const steps = [
    { number: 1, title: "משלוח", icon: Truck },
    { number: 2, title: "תשלום", icon: CreditCard },
    { number: 3, title: "סיכום", icon: Package },
  ];

  return (
    <div className="min-h-screen pb-20 bg-background" dir="rtl">
      <AppHeader title="תשלום" showBackButton={true} />

      {/* Calm Checkout Header Message */}
      <div className="px-4 pt-4 pb-2 text-center">
        <p className="text-sm text-muted-foreground">
          {CHECKOUT.twoStepsOnly} • {CHECKOUT.transparentPricing}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="px-4 py-4 bg-muted/50">
        <div className="flex items-center justify-between mb-8 max-w-md mx-auto">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = currentStep > step.number;
            const isActive = currentStep === step.number;

            return (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md ${
                      isCompleted
                        ? "bg-success text-success-foreground"
                        : isActive
                        ? "bg-accent text-accent-foreground"
                        : "bg-background border-2 border-border text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-6 h-6" strokeWidth={1.5} />
                    ) : (
                      <StepIcon className="w-5 h-5" strokeWidth={1.5} />
                    )}
                  </div>
                  <span
                    className={`text-xs font-jakarta mt-2 ${
                      isActive ? "font-bold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 transition-all mx-2 rounded-full ${
                      isCompleted ? "bg-accent" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {/* Step 1: Shipping Address */}
          {currentStep === 1 && (
            <motion.div
              key="shipping"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-4 max-w-md mx-auto">
                <MapPin className="w-5 h-5 text-accent" strokeWidth={1.5} />
                <h2 className="text-lg font-bold text-foreground font-jakarta">כתובת למשלוח</h2>
              </div>

              <Card className="p-5 bg-card border-0 rounded-2xl shadow-lg space-y-4 max-w-md mx-auto">
                <div>
                  <Label htmlFor="fullName" className="font-jakarta text-sm font-semibold text-foreground">
                    שם מלא *
                  </Label>
                  <Input
                    id="fullName"
                    value={shippingData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    className={`mt-1.5 font-jakarta rounded-xl ${errors.fullName ? "border-destructive" : ""}`}
                    placeholder="ישראל ישראלי"
                  />
                  {errors.fullName && (
                    <p className="text-xs text-destructive mt-1 font-jakarta">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email" className="font-jakarta text-sm font-semibold text-foreground">
                    אימייל *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={shippingData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`mt-1.5 font-jakarta rounded-xl ${errors.email ? "border-destructive" : ""}`}
                    placeholder="email@example.com"
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive mt-1 font-jakarta">{errors.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone" className="font-jakarta text-sm font-semibold text-foreground">
                    מספר טלפון *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={shippingData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className={`mt-1.5 font-jakarta rounded-xl ${errors.phone ? "border-destructive" : ""}`}
                    placeholder="0501234567"
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive mt-1 font-jakarta">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="address" className="font-jakarta text-sm font-semibold text-foreground">
                    כתובת רחוב *
                  </Label>
                  <Input
                    id="address"
                    value={shippingData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    className={`mt-1.5 font-jakarta rounded-xl ${errors.address ? "border-destructive" : ""}`}
                    placeholder="רחוב הרצל 123, דירה 4"
                  />
                  {errors.address && (
                    <p className="text-xs text-destructive mt-1 font-jakarta">{errors.address}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="city" className="font-jakarta text-sm font-semibold text-foreground">
                      עיר *
                    </Label>
                    <Input
                      id="city"
                      value={shippingData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      className={`mt-1.5 font-jakarta rounded-xl ${errors.city ? "border-destructive" : ""}`}
                      placeholder="תל אביב"
                    />
                    {errors.city && (
                      <p className="text-xs text-destructive mt-1 font-jakarta">{errors.city}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="zipCode" className="font-jakarta text-sm font-semibold text-foreground">
                      מיקוד *
                    </Label>
                    <Input
                      id="zipCode"
                      value={shippingData.zipCode}
                      onChange={(e) => handleInputChange("zipCode", e.target.value)}
                      className={`mt-1.5 font-jakarta rounded-xl ${errors.zipCode ? "border-destructive" : ""}`}
                      placeholder="12345"
                    />
                    {errors.zipCode && (
                      <p className="text-xs text-destructive mt-1 font-jakarta">{errors.zipCode}</p>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Payment Method */}
          {currentStep === 2 && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-4 max-w-md mx-auto">
                <CreditCard className="w-5 h-5 text-accent" strokeWidth={1.5} />
                <h2 className="text-lg font-bold text-foreground font-jakarta">אמצעי תשלום</h2>
              </div>

              <Card className="p-5 bg-card border-0 rounded-2xl shadow-lg max-w-md mx-auto">
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="space-y-3">
                    {/* Credit Card */}
                    <div
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        paymentMethod === "credit-card"
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-border-light"
                      }`}
                      onClick={() => setPaymentMethod("credit-card")}
                    >
                      <RadioGroupItem value="credit-card" id="credit-card" />
                      <Label
                        htmlFor="credit-card"
                        className="flex-1 cursor-pointer font-jakarta font-semibold text-foreground"
                      >
                        כרטיס אשראי
                      </Label>
                      <div className="flex gap-1">
                        <div className="w-8 h-5 bg-gradient-to-r from-blue-600 to-blue-400 rounded"></div>
                        <div className="w-8 h-5 bg-gradient-to-r from-red-600 to-orange-400 rounded"></div>
                      </div>
                    </div>

                    {/* Apple Pay */}
                    <div
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        paymentMethod === "apple-pay"
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-border-light"
                      }`}
                      onClick={() => setPaymentMethod("apple-pay")}
                    >
                      <RadioGroupItem value="apple-pay" id="apple-pay" />
                      <Label
                        htmlFor="apple-pay"
                        className="flex-1 cursor-pointer font-jakarta font-semibold text-foreground"
                      >
                        Apple Pay
                      </Label>
                      <div className="w-12 h-5 bg-black rounded flex items-center justify-center text-white text-[10px] font-bold">
                         Pay
                      </div>
                    </div>

                    {/* Google Pay */}
                    <div
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        paymentMethod === "google-pay"
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-border-light"
                      }`}
                      onClick={() => setPaymentMethod("google-pay")}
                    >
                      <RadioGroupItem value="google-pay" id="google-pay" />
                      <Label
                        htmlFor="google-pay"
                        className="flex-1 cursor-pointer font-jakarta font-semibold text-foreground"
                      >
                        Google Pay
                      </Label>
                      <div className="flex gap-0.5">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                    </div>

                    {/* Bit */}
                    <div
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        paymentMethod === "bit"
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-border-light"
                      }`}
                      onClick={() => setPaymentMethod("bit")}
                    >
                      <RadioGroupItem value="bit" id="bit" />
                      <Label
                        htmlFor="bit"
                        className="flex-1 cursor-pointer font-jakarta font-semibold text-foreground flex items-center gap-2"
                      >
                        <Smartphone className="w-4 h-4" />
                        Bit
                      </Label>
                      <div className="w-10 h-5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded flex items-center justify-center text-white text-[10px] font-bold">
                        BIT
                      </div>
                    </div>

                    {/* PayBox */}
                    <div
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        paymentMethod === "paybox"
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-border-light"
                      }`}
                      onClick={() => setPaymentMethod("paybox")}
                    >
                      <RadioGroupItem value="paybox" id="paybox" />
                      <Label
                        htmlFor="paybox"
                        className="flex-1 cursor-pointer font-jakarta font-semibold text-foreground flex items-center gap-2"
                      >
                        <Wallet className="w-4 h-4" />
                        PayBox
                      </Label>
                      <div className="w-14 h-5 bg-gradient-to-r from-green-500 to-green-600 rounded flex items-center justify-center text-white text-[10px] font-bold">
                        PayBox
                      </div>
                    </div>

                    {/* PayPal */}
                    <div
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        paymentMethod === "paypal"
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-border-light"
                      }`}
                      onClick={() => setPaymentMethod("paypal")}
                    >
                      <RadioGroupItem value="paypal" id="paypal" />
                      <Label
                        htmlFor="paypal"
                        className="flex-1 cursor-pointer font-jakarta font-semibold text-foreground"
                      >
                        PayPal
                      </Label>
                      <div className="w-16 h-5 bg-gradient-to-r from-blue-500 to-blue-600 rounded flex items-center justify-center text-white text-[10px] font-bold">
                        PayPal
                      </div>
                    </div>

                    {/* Cash on Delivery */}
                    <div
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        paymentMethod === "cash-on-delivery"
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-border-light"
                      }`}
                      onClick={() => setPaymentMethod("cash-on-delivery")}
                    >
                      <RadioGroupItem value="cash-on-delivery" id="cash-on-delivery" />
                      <Label
                        htmlFor="cash-on-delivery"
                        className="flex-1 cursor-pointer font-jakarta font-semibold text-foreground"
                      >
                        מזומן במשלוח
                      </Label>
                      <div className="text-xs text-muted-foreground font-jakarta">+₪5 עמלה</div>
                    </div>
                  </div>
                </RadioGroup>
              </Card>

              {/* Installments - only for credit card */}
              {paymentMethod === "credit-card" && (
                <Card className="p-4 bg-card border-0 rounded-2xl shadow-lg max-w-md mx-auto">
                  <Label className="font-jakarta text-sm font-semibold text-foreground mb-3 block">
                    תשלומים
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 3, 6, 12].map((num) => (
                      <button
                        key={num}
                        onClick={() => setInstallments(num)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          installments === num
                            ? "bg-accent text-accent-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {num === 1 ? "תשלום אחד" : `${num} תשלומים`}
                      </button>
                    ))}
                  </div>
                  {installments > 1 && (
                    <p className="text-xs text-muted-foreground mt-2 font-jakarta">
                      ₪{(total / installments).toFixed(2)} × {installments} תשלומים
                    </p>
                  )}
                  <div className="mt-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
                    <p className="text-xs text-muted-foreground font-jakarta text-center">
                      <CreditCard className="w-4 h-4 inline-block ml-1" />
                      פרטי הכרטיס יוזנו בעמוד תשלום מאובטח בשלב הבא
                    </p>
                  </div>
                </Card>
              )}

              {/* Coupon Code */}
              <Card className="p-4 bg-card border-0 rounded-2xl shadow-lg max-w-md mx-auto">
                <Label className="font-jakarta text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  קוד קופון
                </Label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 bg-success/10 rounded-xl border border-success/30">
                    <div>
                      <p className="font-semibold text-success font-jakarta text-sm">{appliedCoupon.code}</p>
                      <p className="text-xs text-muted-foreground font-jakarta">
                        {appliedCoupon.discount_type === 'free_shipping'
                          ? 'משלוח חינם!'
                          : appliedCoupon.discount_type === 'percentage' 
                            ? `${appliedCoupon.discount_value}% הנחה`
                            : `₪${appliedCoupon.discount_value} הנחה`}
                      </p>
                    </div>
                    <button onClick={removeCoupon} className="p-1 hover:bg-destructive/10 rounded-full transition-colors">
                      <X className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="הזן קוד קופון"
                      className="flex-1 font-jakarta rounded-xl"
                    />
                    <Button
                      onClick={validateCoupon}
                      disabled={!couponCode.trim() || isValidatingCoupon}
                      className="bg-accent hover:bg-accent-hover text-accent-foreground rounded-xl font-jakarta"
                    >
                      {isValidatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "הפעל"}
                    </Button>
                  </div>
                )}
              </Card>

              <Card className="p-3 bg-accent/10 border-0 rounded-xl max-w-md mx-auto">
                <p className="text-xs text-accent font-jakarta font-medium text-center">
                  🔒 פרטי התשלום שלך מאובטחים ומוצפנים
                </p>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Order Review */}
          {currentStep === 3 && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-4 max-w-md mx-auto">
                <Package className="w-5 h-5 text-accent" strokeWidth={1.5} />
                <h2 className="text-lg font-bold text-foreground font-jakarta">סיכום הזמנה</h2>
              </div>

              {/* Shipping Info */}
              <Card className="p-5 bg-card border-0 rounded-2xl shadow-lg max-w-md mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-foreground font-jakarta text-base">
                    כתובת למשלוח
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(1)}
                    className="text-accent hover:bg-accent/10 font-jakarta text-xs"
                  >
                    ערוך
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground font-jakarta space-y-1">
                  <p className="font-semibold text-foreground">{shippingData.fullName}</p>
                  <p>{shippingData.address}</p>
                  <p>
                    {shippingData.city}, {shippingData.zipCode}
                  </p>
                  <p>{shippingData.phone}</p>
                  <p>{shippingData.email}</p>
                </div>
              </Card>

              {/* Payment Method */}
              <Card className="p-5 bg-card border-0 rounded-2xl shadow-lg max-w-md mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-foreground font-jakarta text-base">אמצעי תשלום</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(2)}
                    className="text-accent hover:bg-accent/10 font-jakarta text-xs"
                  >
                    ערוך
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground font-jakarta">
                  {paymentMethod === "credit-card" ? `כרטיס אשראי${installments > 1 ? ` (${installments} תשלומים)` : ''}` : 
                   paymentMethod === "apple-pay" ? "Apple Pay" :
                   paymentMethod === "google-pay" ? "Google Pay" :
                   paymentMethod === "bit" ? "Bit" :
                   paymentMethod === "paybox" ? "PayBox" :
                   paymentMethod === "paypal" ? "PayPal" : "מזומן במשלוח"}
                </p>
              </Card>

              {/* Order Items */}
              <Card className="p-5 bg-card border-0 rounded-2xl shadow-lg max-w-md mx-auto">
                <h3 className="font-bold text-foreground font-jakarta text-base mb-4">
                  פריטים בהזמנה ({items.length})
                </h3>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground font-jakarta text-sm line-clamp-2">
                          {item.name}
                        </h4>
                        <p className="text-xs text-muted-foreground font-jakarta">
                          כמות: {item.quantity}
                          {item.variant && ` • ${item.variant}`}
                          {item.size && ` • ${item.size}`}
                        </p>
                      </div>
                      <div className="text-sm font-bold text-foreground font-jakarta">
                        ₪{(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Order Summary */}
              <Card className="p-5 bg-card border-0 rounded-2xl shadow-xl max-w-md mx-auto space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-jakarta">סכום ביניים</span>
                  <span className="font-semibold text-foreground font-jakarta">
                    ₪{subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-jakarta">משלוח</span>
                  <span className="font-semibold text-foreground font-jakarta">
                    {shipping === 0 ? (
                      <span className="text-success font-bold">חינם</span>
                    ) : (
                      `₪${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                {paymentMethod === "cash-on-delivery" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-jakarta">עמלת מזומן</span>
                    <span className="font-semibold text-foreground font-jakarta">₪5.00</span>
                  </div>
                )}
                {appliedCoupon && !isFreeShippingCoupon && discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-success font-jakarta">הנחה ({appliedCoupon.code})</span>
                    <span className="font-semibold text-success font-jakarta">-₪{discount.toFixed(2)}</span>
                  </div>
                )}
                {isFreeShippingCoupon && (
                  <div className="flex justify-between text-sm">
                    <span className="text-success font-jakarta">משלוח חינם ({appliedCoupon?.code})</span>
                    <span className="font-semibold text-success font-jakarta">-₪{baseShipping.toFixed(2)}</span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground font-jakarta">
                  * המחירים כוללים מע״מ
                </div>
                <Separator />
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold text-foreground font-jakarta">
                    סה״כ לתשלום
                  </span>
                  <span className="text-2xl font-bold text-primary font-jakarta">
                    ₪
                    {(
                      total + (paymentMethod === "cash-on-delivery" ? 5 : 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </Card>

              {/* Recurring Order Option - Brand Voice */}
              <Card className="p-4 border-dashed border-primary/30 bg-primary/5 max-w-md mx-auto">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="recurring"
                    checked={wantRecurringOrder}
                    onCheckedChange={(checked) => setWantRecurringOrder(checked as boolean)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="recurring" className="font-medium cursor-pointer">
                      שמרו להזמנה קבועה
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {CHECKOUT.saveForRecurring}
                    </p>
                    
                    {/* Trust indicators */}
                    <div className="flex flex-wrap gap-3 mt-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Bell className="w-3 h-3 text-primary" />
                        <span>{CHECKOUT.reminderBeforeCharge}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Shield className="w-3 h-3 text-primary" />
                        <span>{CHECKOUT.noAutoCharge}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 px-4 max-w-md mx-auto">
          {currentStep > 1 && (
            <Button
              variant="outline"
              size="lg"
              className="flex-1 border-2 border-border text-foreground hover:bg-muted rounded-xl font-bold font-jakarta h-14"
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={isProcessing}
            >
              חזור
            </Button>
          )}
          <Button
            size="lg"
            className={`flex-1 bg-accent hover:bg-accent-hover text-accent-foreground rounded-2xl font-bold font-jakarta shadow-xl h-14 ${currentStep === 1 ? 'w-full' : ''}`}
            onClick={currentStep === 3 ? handlePlaceOrder : handleNextStep}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="animate-spin ml-2">⏳</span>
                מעבד...
              </>
            ) : currentStep === 3 ? (
              `בצע הזמנה · ₪${(
                total + (paymentMethod === "cash-on-delivery" ? 5 : 0)
              ).toFixed(2)}`
            ) : (
              "המשך"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
