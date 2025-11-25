import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, CreditCard, MapPin, Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
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

    // Simulate order processing
    setTimeout(() => {
      const orderId = `PID-${Date.now()}`;
      
      // Store order details
      const orderDetails = {
        orderId,
        items,
        shippingData,
        paymentMethod,
        subtotal,
        shipping,
        tax,
        total,
        orderDate: new Date().toISOString(),
      };

      localStorage.setItem("lastOrder", JSON.stringify(orderDetails));
      
      // Clear cart
      clearCart();
      
      setIsProcessing(false);
      
      // Navigate to confirmation
      navigate("/order-confirmation", { state: { order: orderDetails } });
    }, 2000);
  };

  const steps = [
    { number: 1, title: "Shipping", icon: Truck },
    { number: 2, title: "Payment", icon: CreditCard },
    { number: 3, title: "Review", icon: Package },
  ];

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-gray-100"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Button>
          <h1 className="text-base font-bold font-jakarta text-gray-900">Checkout</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Progress Steps */}
      <div className="px-4 py-5">
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = currentStep > step.number;
            const isActive = currentStep === step.number;

            return (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? "bg-[#7DD3C0] text-white"
                        : isActive
                        ? "bg-[#FBD66A] text-gray-900"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-jakarta mt-1 ${
                      isActive ? "font-bold text-gray-900" : "text-gray-600"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 transition-all ${
                      isCompleted ? "bg-[#7DD3C0]" : "bg-gray-200"
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
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-[#7DD3C0]" />
                <h2 className="text-lg font-bold text-gray-900 font-jakarta">Shipping Address</h2>
              </div>

              <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4">
                <div>
                  <Label htmlFor="fullName" className="font-jakarta text-sm font-semibold">
                    Full Name *
                  </Label>
                  <Input
                    id="fullName"
                    value={shippingData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    className={`mt-1 font-jakarta ${errors.fullName ? "border-red-500" : ""}`}
                    placeholder="John Doe"
                  />
                  {errors.fullName && (
                    <p className="text-xs text-red-500 mt-1 font-jakarta">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email" className="font-jakarta text-sm font-semibold">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={shippingData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`mt-1 font-jakarta ${errors.email ? "border-red-500" : ""}`}
                    placeholder="john@example.com"
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500 mt-1 font-jakarta">{errors.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone" className="font-jakarta text-sm font-semibold">
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={shippingData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className={`mt-1 font-jakarta ${errors.phone ? "border-red-500" : ""}`}
                    placeholder="0501234567"
                  />
                  {errors.phone && (
                    <p className="text-xs text-red-500 mt-1 font-jakarta">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="address" className="font-jakarta text-sm font-semibold">
                    Street Address *
                  </Label>
                  <Input
                    id="address"
                    value={shippingData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    className={`mt-1 font-jakarta ${errors.address ? "border-red-500" : ""}`}
                    placeholder="123 Main Street, Apt 4B"
                  />
                  {errors.address && (
                    <p className="text-xs text-red-500 mt-1 font-jakarta">{errors.address}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="city" className="font-jakarta text-sm font-semibold">
                      City *
                    </Label>
                    <Input
                      id="city"
                      value={shippingData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      className={`mt-1 font-jakarta ${errors.city ? "border-red-500" : ""}`}
                      placeholder="Tel Aviv"
                    />
                    {errors.city && (
                      <p className="text-xs text-red-500 mt-1 font-jakarta">{errors.city}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="zipCode" className="font-jakarta text-sm font-semibold">
                      Zip Code *
                    </Label>
                    <Input
                      id="zipCode"
                      value={shippingData.zipCode}
                      onChange={(e) => handleInputChange("zipCode", e.target.value)}
                      className={`mt-1 font-jakarta ${errors.zipCode ? "border-red-500" : ""}`}
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
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-[#7DD3C0]" />
                <h2 className="text-lg font-bold text-gray-900 font-jakarta">Payment Method</h2>
              </div>

              <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="space-y-3">
                    <div
                      className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        paymentMethod === "credit-card"
                          ? "border-[#7DD3C0] bg-[#7DD3C0]/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setPaymentMethod("credit-card")}
                    >
                      <RadioGroupItem value="credit-card" id="credit-card" />
                      <Label
                        htmlFor="credit-card"
                        className="flex-1 cursor-pointer font-jakarta font-semibold"
                      >
                        Credit / Debit Card
                      </Label>
                      <div className="flex gap-1">
                        <div className="w-8 h-5 bg-gradient-to-r from-blue-600 to-blue-400 rounded"></div>
                        <div className="w-8 h-5 bg-gradient-to-r from-red-600 to-orange-400 rounded"></div>
                      </div>
                    </div>

                    <div
                      className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        paymentMethod === "paypal"
                          ? "border-[#7DD3C0] bg-[#7DD3C0]/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setPaymentMethod("paypal")}
                    >
                      <RadioGroupItem value="paypal" id="paypal" />
                      <Label
                        htmlFor="paypal"
                        className="flex-1 cursor-pointer font-jakarta font-semibold"
                      >
                        PayPal
                      </Label>
                      <div className="w-16 h-5 bg-gradient-to-r from-blue-500 to-blue-600 rounded flex items-center justify-center text-white text-[10px] font-bold">
                        PayPal
                      </div>
                    </div>

                    <div
                      className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        paymentMethod === "cash-on-delivery"
                          ? "border-[#7DD3C0] bg-[#7DD3C0]/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setPaymentMethod("cash-on-delivery")}
                    >
                      <RadioGroupItem value="cash-on-delivery" id="cash-on-delivery" />
                      <Label
                        htmlFor="cash-on-delivery"
                        className="flex-1 cursor-pointer font-jakarta font-semibold"
                      >
                        Cash on Delivery
                      </Label>
                      <div className="text-xs text-gray-600 font-jakarta">+₪5 fee</div>
                    </div>
                  </div>
                </RadioGroup>
              </Card>

              <Card className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xs text-blue-800 font-jakarta">
                  🔒 Your payment information is secure and encrypted
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
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-[#7DD3C0]" />
                <h2 className="text-lg font-bold text-gray-900 font-jakarta">Review Order</h2>
              </div>

              {/* Shipping Info */}
              <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900 font-jakarta text-sm">
                    Shipping Address
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(1)}
                    className="text-[#7DD3C0] hover:bg-[#7DD3C0]/10 font-jakarta text-xs"
                  >
                    Edit
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
              <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-900 font-jakarta text-sm">Payment Method</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(2)}
                    className="text-[#7DD3C0] hover:bg-[#7DD3C0]/10 font-jakarta text-xs"
                  >
                    Edit
                  </Button>
                </div>
                <p className="text-sm text-gray-600 font-jakarta capitalize">
                  {paymentMethod.replace("-", " ")}
                </p>
              </Card>

              {/* Order Items */}
              <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                <h3 className="font-bold text-gray-900 font-jakarta text-sm mb-3">
                  Order Items ({items.length})
                </h3>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 font-jakarta text-sm truncate">
                          {item.name}
                        </h4>
                        <p className="text-xs text-gray-600 font-jakarta">
                          Qty: {item.quantity}
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
              <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-jakarta">Subtotal</span>
                  <span className="font-semibold text-gray-900 font-jakarta">
                    ₪{subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-jakarta">Shipping</span>
                  <span className="font-semibold text-gray-900 font-jakarta">
                    {shipping === 0 ? (
                      <span className="text-[#7DD3C0]">FREE</span>
                    ) : (
                      `₪${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                {paymentMethod === "cash-on-delivery" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-jakarta">COD Fee</span>
                    <span className="font-semibold text-gray-900 font-jakarta">₪5.00</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-jakarta">Tax (VAT 17%)</span>
                  <span className="font-semibold text-gray-900 font-jakarta">
                    ₪{tax.toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900 font-jakarta">Total</span>
                  <span className="text-xl font-bold text-gray-900 font-jakarta">
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
        <div className="flex gap-3 mt-6">
          {currentStep > 1 && (
            <Button
              variant="outline"
              size="lg"
              className="flex-1 border-2 border-gray-300 text-gray-900 hover:bg-gray-100 rounded-xl font-bold font-jakarta"
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={isProcessing}
            >
              Back
            </Button>
          )}
          <Button
            size="lg"
            className="flex-1 bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900 rounded-xl font-bold font-jakarta shadow-md"
            onClick={currentStep === 3 ? handlePlaceOrder : handleNextStep}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Processing...
              </>
            ) : currentStep === 3 ? (
              `Place Order · ₪${(
                total + (paymentMethod === "cash-on-delivery" ? 5 : 0)
              ).toFixed(2)}`
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
