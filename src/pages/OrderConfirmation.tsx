import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2, Package, MapPin, CreditCard, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/AppHeader";

interface OrderDetails {
  orderId: string;
  items: any[];
  shippingData: any;
  paymentMethod: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  orderDate: string;
}

const OrderConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const order = location.state?.order as OrderDetails;

  useEffect(() => {
    if (!order) {
      // Try to get from localStorage
      const savedOrder = localStorage.getItem("lastOrder");
      if (!savedOrder) {
        navigate("/home");
      }
    }
  }, [order, navigate]);

  if (!order) {
    return null;
  }

  const orderTotal =
    order.total + (order.paymentMethod === "cash-on-delivery" ? 5 : 0);

  return (
    <div className="min-h-screen pb-20 bg-background" dir="rtl">
      <AppHeader title="אישור הזמנה" showBackButton={false} />
      
      {/* Success Header */}
      <div className="bg-gradient-to-br from-accent to-primary px-4 py-10">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="flex flex-col items-center"
        >
          <div className="w-24 h-24 bg-background rounded-full flex items-center justify-center mb-4 shadow-xl">
            <CheckCircle2 className="w-14 h-14 text-success" />
          </div>
          <h1 className="text-3xl font-bold text-accent-foreground font-jakarta mb-2 text-center">
            הזמנה אושרה!
          </h1>
          <p className="text-accent-foreground/80 font-jakarta text-center text-lg">
            תודה על ההזמנה שלך
          </p>
        </motion.div>
      </div>

      {/* Order Details */}
      <div className="px-4 py-6 space-y-5 max-w-md mx-auto">
        {/* Order Number */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-5 bg-card border-0 rounded-2xl shadow-lg text-center">
            <p className="text-sm text-muted-foreground font-jakarta mb-1">מספר הזמנה</p>
            <p className="text-2xl font-bold text-foreground font-jakarta">{order.orderId}</p>
            <p className="text-xs text-muted-foreground font-jakarta mt-2">
              {new Date(order.orderDate).toLocaleDateString("he-IL", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </Card>
        </motion.div>

        {/* Confirmation Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4 bg-success/10 border-0 rounded-2xl">
            <p className="text-sm text-foreground font-jakarta text-center">
              📧 אימייל אישור נשלח ל{" "}
              <span className="font-semibold">{order.shippingData.email}</span>
            </p>
          </Card>
        </motion.div>

        {/* Shipping Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-5 bg-card border-0 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-accent" strokeWidth={1.5} />
              <h3 className="font-bold text-foreground font-jakarta">כתובת למשלוח</h3>
            </div>
            <div className="text-sm text-muted-foreground font-jakarta space-y-1 mr-7">
              <p className="font-semibold text-foreground">{order.shippingData.fullName}</p>
              <p>{order.shippingData.address}</p>
              <p>
                {order.shippingData.city}, {order.shippingData.zipCode}
              </p>
              <p>{order.shippingData.phone}</p>
            </div>
          </Card>
        </motion.div>

        {/* Payment Method */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-5 bg-card border-0 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-accent" strokeWidth={1.5} />
              <h3 className="font-bold text-foreground font-jakarta">אמצעי תשלום</h3>
            </div>
            <p className="text-sm text-muted-foreground font-jakarta mr-7">
              {order.paymentMethod === "credit-card" ? "כרטיס אשראי" : 
               order.paymentMethod === "paypal" ? "PayPal" : "מזומן במשלוח"}
            </p>
          </Card>
        </motion.div>

        {/* Order Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-5 bg-card border-0 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-accent" strokeWidth={1.5} />
              <h3 className="font-bold text-foreground font-jakarta">
                פריטים בהזמנה ({order.items.length})
              </h3>
            </div>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex gap-3">
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
        </motion.div>

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="p-5 bg-gradient-to-br from-card to-muted/30 border-0 rounded-2xl shadow-xl space-y-3">
            <h3 className="font-bold text-foreground font-jakarta text-base mb-3">סיכום הזמנה</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-jakarta">סכום ביניים</span>
              <span className="font-semibold text-foreground font-jakarta">
                ₪{order.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-jakarta">משלוח</span>
              <span className="font-semibold text-foreground font-jakarta">
                {order.shipping === 0 ? (
                  <span className="text-success font-bold">חינם</span>
                ) : (
                  `₪${order.shipping.toFixed(2)}`
                )}
              </span>
            </div>
            {order.paymentMethod === "cash-on-delivery" && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-jakarta">עמלת מזומן</span>
                <span className="font-semibold text-foreground font-jakarta">₪5.00</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-jakarta">מע״מ (17%)</span>
              <span className="font-semibold text-foreground font-jakarta">
                ₪{order.tax.toFixed(2)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between pt-2">
              <span className="text-lg font-bold text-foreground font-jakarta">סה״כ ששולם</span>
              <span className="text-2xl font-bold text-primary font-jakarta">
                ₪{orderTotal.toFixed(2)}
              </span>
            </div>
          </Card>
        </motion.div>

        {/* Delivery Estimate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="p-4 bg-accent/10 border-0 rounded-2xl">
            <p className="text-sm text-foreground font-jakarta text-center">
              🚚 זמן אספקה משוער: <span className="font-bold">2-4 ימי עסקים</span>
            </p>
            <p className="text-xs text-muted-foreground font-jakarta text-center mt-1">
              תקבל מידע על המשלוח במייל
            </p>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <Button
            size="lg"
            className="w-full bg-accent hover:bg-accent-hover text-accent-foreground rounded-2xl font-bold font-jakarta shadow-xl h-14"
            onClick={() => navigate("/home")}
          >
            <Home className="w-5 h-5 ml-2" strokeWidth={1.5} />
            המשך לקניות
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full border-2 border-border text-foreground hover:bg-muted rounded-xl font-bold font-jakarta h-14"
            onClick={() => navigate("/order-history")}
          >
            <Package className="w-5 h-5 ml-2" strokeWidth={1.5} />
            צפה בכל ההזמנות
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;