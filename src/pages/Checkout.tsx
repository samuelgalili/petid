import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CreditCard, MapPin, Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";

const shippingSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100, "Full name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  phone: z.string().trim().regex(/^[0-9]{9,15}$/, "Phone number must be 9-15 digits"),
  address: z.string().trim().min(5, "Address must be at least 5 characters").max(200, "Address must be less than 200 characters"),
  city: z.string().trim().min(2, "City must be at least 2 characters").max(50, "City must be less than 50 characters"),
  zipCode: z.string().trim().regex(/^[0-9]{5,7}$/, "Zip code must be 5-7 digits"),
});

const Checkout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, getSubtotal, clearCart } = useCart();
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("credit-card");
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

  const subtotal = getSubtotal();
  const shipping = subtotal >= 199 ? 0 : 25;
  const tax = subtotal * 0.17;
  const total = subtotal + shipping + tax;

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
          title: "Validation Error",
          description: "Please check all fields and try again",
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
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      const orderNumber = `PID-${Date.now()}`;
      const orderTotal = total + (paymentMethod === "cash-on-delivery" ? 5 : 0);

      // Insert order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          status: "pending",
          subtotal: subtotal,
          shipping: shipping,
          tax: tax,
          total: orderTotal,
          payment_method: paymentMethod,
          shipping_address: shippingData,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      const orderItems = items.map((item) => ({
        order_id: orderData.id,
        product_name: item.name,
        product_image: item.image,
        quantity: item.quantity,
        price: item.price,
        variant: item.variant,
        size: item.size,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Store order details for confirmation page
      const orderDetails = {
        orderId: orderNumber,
        items,
        shippingData,
        paymentMethod,
        subtotal,
        shipping,
        tax,
        total: orderTotal,
        orderDate: new Date().toISOString(),
      };

      localStorage.setItem("lastOrder", JSON.stringify(orderDetails));

      // Clear cart
      clearCart();

      setIsProcessing(false);

      // Navigate to confirmation
      navigate("/order-confirmation", { state: { order: orderDetails } });
    } catch (error: any) {
      console.error("Error placing order:", error);
      setIsProcessing(false);
      toast({
        title: "Order Failed",
        description: error.message || "Failed to place order. Please try again.",
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
    <div className="min-h-screen pb-20 bg-white" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-accent shadow-md">
        <div className="flex items-center justify-between px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            <ArrowRight className="w-6 h-6 text-gray-900" />
          </Button>
          <h1 className="text-xl font-bold font-jakarta text-gray-900">תשלום</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Progress Steps */}
      <div className="px-4 py-6 bg-gray-50">
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
                        ? "bg-success text-white"
                        : isActive
                        ? "bg-accent text-gray-900"
                        : "bg-white border-2 border-gray-300 text-gray-400"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-jakarta mt-2 ${
                      isActive ? "font-bold text-gray-900" : "text-gray-600"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 transition-all mx-2 rounded-full ${
                      isCompleted ? "bg-success" : "bg-gray-300"
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
                <MapPin className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-bold text-gray-900 font-jakarta">כתובת למשלוח</h2>
              </div>

              <Card className="p-5 bg-white border-0 rounded-2xl shadow-lg space-y-4 max-w-md mx-auto">
                <div>
                  <Label htmlFor="fullName" className="font-jakarta text-sm font-semibold text-gray-700">
                    שם מלא *
                  </Label>
                  <Input
                    id="fullName"
                    value={shippingData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    className={`mt-1.5 font-jakarta rounded-xl ${errors.fullName ? "border-red-500" : ""}`}
                    placeholder="ישראל ישראלי"
                  />
                  {errors.fullName && (
                    <p className="text-xs text-red-500 mt-1 font-jakarta">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email" className="font-jakarta text-sm font-semibold text-gray-700">
                    אימייל *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={shippingData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`mt-1.5 font-jakarta rounded-xl ${errors.email ? "border-red-500" : ""}`}
                    placeholder="email@example.com"
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500 mt-1 font-jakarta">{errors.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone" className="font-jakarta text-sm font-semibold text-gray-700">
                    מספר טלפון *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={shippingData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className={`mt-1.5 font-jakarta rounded-xl ${errors.phone ? "border-red-500" : ""}`}
                    placeholder="0501234567"
                  />
                  {errors.phone && (
                    <p className="text-xs text-red-500 mt-1 font-jakarta">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="address" className="font-jakarta text-sm font-semibold text-gray-700">
                    כתובת רחוב *
                  </Label>
                  <Input
                    id="address"
                    value={shippingData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    className={`mt-1.5 font-jakarta rounded-xl ${errors.address ? "border-red-500" : ""}`}
                    placeholder="רחוב הרצל 123, דירה 4"
                  />
                  {errors.address && (
                    <p className="text-xs text-red-500 mt-1 font-jakarta">{errors.address}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="city" className="font-jakarta text-sm font-semibold text-gray-700">
                      עיר *
                    </Label>
                    <Input
                      id="city"
                      value={shippingData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      className={`mt-1.5 font-jakarta rounded-xl ${errors.city ? "border-red-500" : ""}`}
                      placeholder="תל אביב"
                    />
                    {errors.city && (
                      <p className="text-xs text-red-500 mt-1 font-jakarta">{errors.city}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="zipCode" className="font-jakarta text-sm font-semibold text-gray-700">
                      מיקוד *
                    </Label>
                    <Input
                      id="zipCode"
                      value={shippingData.zipCode}
                      onChange={(e) => handleInputChange("zipCode", e.target.value)}
                      className={`mt-1.5 font-jakarta rounded-xl ${errors.zipCode ? "border-red-500" : ""}`}
                      placeholder="12345"
                    />
                    {errors.zipCode && (
                      <p className="text-xs text-red-500 mt-1 font-jakarta">{errors.zipCode}</p>
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
                <CreditCard className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-bold text-gray-900 font-jakarta">אמצעי תשלום</h2>
              </div>

              <Card className="p-5 bg-white border-0 rounded-2xl shadow-lg max-w-md mx-auto">
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="space-y-3">
                    <div
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        paymentMethod === "credit-card"
                          ? "border-accent bg-accent/10"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setPaymentMethod("credit-card")}
                    >
                      <RadioGroupItem value="credit-card" id="credit-card" />
                      <Label
                        htmlFor="credit-card"
                        className="flex-1 cursor-pointer font-jakarta font-semibold text-gray-900"
                      >
                        כרטיס אשראי
                      </Label>
                      <div className="flex gap-1">
                        <div className="w-8 h-5 bg-gradient-to-r from-blue-600 to-blue-400 rounded"></div>
                        <div className="w-8 h-5 bg-gradient-to-r from-red-600 to-orange-400 rounded"></div>
                      </div>
                    </div>

                    <div
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        paymentMethod === "paypal"
                          ? "border-accent bg-accent/10"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setPaymentMethod("paypal")}
                    >
                      <RadioGroupItem value="paypal" id="paypal" />
                      <Label
                        htmlFor="paypal"
                        className="flex-1 cursor-pointer font-jakarta font-semibold text-gray-900"
                      >
                        PayPal
                      </Label>
                      <div className="w-16 h-5 bg-gradient-to-r from-blue-500 to-blue-600 rounded flex items-center justify-center text-white text-[10px] font-bold">
                        PayPal
                      </div>
                    </div>

                    <div
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        paymentMethod === "cash-on-delivery"
                          ? "border-accent bg-accent/10"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setPaymentMethod("cash-on-delivery")}
                    >
                      <RadioGroupItem value="cash-on-delivery" id="cash-on-delivery" />
                      <Label
                        htmlFor="cash-on-delivery"
                        className="flex-1 cursor-pointer font-jakarta font-semibold text-gray-900"
                      >
                        מזומן במשלוח
                      </Label>
                      <div className="text-xs text-gray-600 font-jakarta">+₪5 עמלה</div>
                    </div>
                  </div>
                </RadioGroup>
              </Card>

              <Card className="p-3 bg-blue-50 border-0 rounded-xl max-w-md mx-auto">
                <p className="text-xs text-blue-800 font-jakarta">
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
                <Package className="w-5 h-5 text-[#FFC107]" />
                <h2 className="text-lg font-bold text-gray-900 font-jakarta">סיכום הזמנה</h2>
              </div>

              {/* Shipping Info */}
              <Card className="p-5 bg-white border-0 rounded-2xl shadow-lg max-w-md mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900 font-jakarta text-base">
                    כתובת למשלוח
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(1)}
                    className="text-[#FFC107] hover:bg-[#FFC107]/10 font-jakarta text-xs"
                  >
                    ערוך
                  </Button>
                </div>
                <div className="text-sm text-gray-600 font-jakarta space-y-1">
                  <p className="font-semibold text-gray-900">{shippingData.fullName}</p>
                  <p>{shippingData.address}</p>
                  <p>
                    {shippingData.city}, {shippingData.zipCode}
                  </p>
                  <p>{shippingData.phone}</p>
                  <p>{shippingData.email}</p>
                </div>
              </Card>

              {/* Payment Method */}
              <Card className="p-5 bg-white border-0 rounded-2xl shadow-lg max-w-md mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-900 font-jakarta text-base">אמצעי תשלום</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(2)}
                    className="text-[#FFC107] hover:bg-[#FFC107]/10 font-jakarta text-xs"
                  >
                    ערוך
                  </Button>
                </div>
                <p className="text-sm text-gray-600 font-jakarta">
                  {paymentMethod === "credit-card" ? "כרטיס אשראי" : 
                   paymentMethod === "paypal" ? "PayPal" : "מזומן במשלוח"}
                </p>
              </Card>

              {/* Order Items */}
              <Card className="p-5 bg-white border-0 rounded-2xl shadow-lg max-w-md mx-auto">
                <h3 className="font-bold text-gray-900 font-jakarta text-base mb-4">
                  פריטים בהזמנה ({items.length})
                </h3>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 font-jakarta text-sm line-clamp-2">
                          {item.name}
                        </h4>
                        <p className="text-xs text-gray-600 font-jakarta">
                          כמות: {item.quantity}
                          {item.variant && ` • ${item.variant}`}
                          {item.size && ` • ${item.size}`}
                        </p>
                      </div>
                      <div className="text-sm font-bold text-gray-900 font-jakarta">
                        ₪{(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Order Summary */}
              <Card className="p-5 bg-gradient-to-br from-white to-gray-50 border-0 rounded-2xl shadow-xl max-w-md mx-auto space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-jakarta">סכום ביניים</span>
                  <span className="font-semibold text-gray-900 font-jakarta">
                    ₪{subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-jakarta">משלוח</span>
                  <span className="font-semibold text-gray-900 font-jakarta">
                    {shipping === 0 ? (
                      <span className="text-green-600 font-bold">חינם</span>
                    ) : (
                      `₪${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                {paymentMethod === "cash-on-delivery" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-jakarta">עמלת מזומן</span>
                    <span className="font-semibold text-gray-900 font-jakarta">₪5.00</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-jakarta">מע״מ (17%)</span>
                  <span className="font-semibold text-gray-900 font-jakarta">
                    ₪{tax.toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold text-gray-900 font-jakarta">
                    סה״כ לתשלום
                  </span>
                  <span className="text-2xl font-bold text-[#E91E63] font-jakarta">
                    ₪
                    {(
                      total + (paymentMethod === "cash-on-delivery" ? 5 : 0)
                    ).toFixed(2)}
                  </span>
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
              className="flex-1 border-2 border-gray-300 text-gray-900 hover:bg-gray-100 rounded-xl font-bold font-jakarta h-14"
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={isProcessing}
            >
              חזור
            </Button>
          )}
          <Button
            size="lg"
            className={`flex-1 bg-[#FFC107] hover:bg-[#FFB300] text-gray-900 rounded-2xl font-bold font-jakarta shadow-xl h-14 ${currentStep === 1 ? 'w-full' : ''}`}
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
