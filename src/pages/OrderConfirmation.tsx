import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2, Package, MapPin, CreditCard, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";

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
    <div className="min-h-screen pb-20 bg-gradient-to-b from-white to-gray-50">
      {/* Success Header */}
      <div className="bg-gradient-to-r from-[#7DD3C0] to-[#B8E3D5] px-4 py-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="flex flex-col items-center"
        >
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            <CheckCircle2 className="w-12 h-12 text-[#7DD3C0]" />
          </div>
          <h1 className="text-2xl font-bold text-white font-jakarta mb-2 text-center">
            Order Confirmed!
          </h1>
          <p className="text-white/90 font-jakarta text-center">
            Thank you for your order
          </p>
        </motion.div>
      </div>

      {/* Order Details */}
      <div className="px-4 py-6 space-y-5">
        {/* Order Number */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm text-center">
            <p className="text-sm text-gray-600 font-jakarta mb-1">Order Number</p>
            <p className="text-xl font-bold text-gray-900 font-jakarta">{order.orderId}</p>
            <p className="text-xs text-gray-500 font-jakarta mt-2">
              {new Date(order.orderDate).toLocaleDateString("en-US", {
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
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-[#B8E3D5]/20 border-none">
            <p className="text-sm text-gray-700 font-jakarta text-center">
              📧 A confirmation email has been sent to{" "}
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
          <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-[#7DD3C0]" />
              <h3 className="font-bold text-gray-900 font-jakarta">Shipping Address</h3>
            </div>
            <div className="text-sm text-gray-600 font-jakarta space-y-1 ml-7">
              <p className="font-semibold text-gray-900">{order.shippingData.fullName}</p>
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
          <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-[#7DD3C0]" />
              <h3 className="font-bold text-gray-900 font-jakarta">Payment Method</h3>
            </div>
            <p className="text-sm text-gray-600 font-jakarta capitalize ml-7">
              {order.paymentMethod.replace("-", " ")}
            </p>
          </Card>
        </motion.div>

        {/* Order Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-[#7DD3C0]" />
              <h3 className="font-bold text-gray-900 font-jakarta">
                Order Items ({order.items.length})
              </h3>
            </div>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex gap-3">
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
        </motion.div>

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm space-y-2">
            <h3 className="font-bold text-gray-900 font-jakarta mb-3">Order Summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-jakarta">Subtotal</span>
              <span className="font-semibold text-gray-900 font-jakarta">
                ₪{order.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-jakarta">Shipping</span>
              <span className="font-semibold text-gray-900 font-jakarta">
                {order.shipping === 0 ? (
                  <span className="text-[#7DD3C0]">FREE</span>
                ) : (
                  `₪${order.shipping.toFixed(2)}`
                )}
              </span>
            </div>
            {order.paymentMethod === "cash-on-delivery" && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-jakarta">COD Fee</span>
                <span className="font-semibold text-gray-900 font-jakarta">₪5.00</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-jakarta">Tax (VAT 17%)</span>
              <span className="font-semibold text-gray-900 font-jakarta">
                ₪{order.tax.toFixed(2)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between pt-2">
              <span className="font-bold text-gray-900 font-jakarta">Total Paid</span>
              <span className="text-xl font-bold text-gray-900 font-jakarta">
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
          <Card className="p-4 bg-gradient-to-r from-[#FBD66A]/20 to-[#F4C542]/20 border-none">
            <p className="text-sm text-gray-700 font-jakarta text-center">
              🚚 Estimated delivery: <span className="font-bold">2-4 business days</span>
            </p>
            <p className="text-xs text-gray-600 font-jakarta text-center mt-1">
              You'll receive tracking information via email
            </p>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <Button
            size="lg"
            className="w-full bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900 rounded-xl font-bold font-jakarta shadow-md"
            onClick={() => navigate("/home")}
          >
            <Home className="w-5 h-5 mr-2" />
            Continue Shopping
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
