import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Clock, CheckCircle, Truck, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { AppHeader } from "@/components/AppHeader";

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  price: number;
  variant?: string;
  size?: string;
}

interface Order {
  id: string;
  order_number: string;
  order_date: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  payment_method: string;
  shipping_address: any;
  items: OrderItem[];
}

const OrderHistory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("order_date", { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch order items for all orders
      const orderIds = ordersData?.map((order) => order.id) || [];
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);

      if (itemsError) throw itemsError;

      // Combine orders with their items
      const ordersWithItems = ordersData?.map((order) => ({
        ...order,
        items: itemsData?.filter((item) => item.order_id === order.id) || [],
      })) || [];

      setOrders(ordersWithItems);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: "Failed to load order history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "processing":
        return <RefreshCw className="w-4 h-4" />;
      case "shipped":
        return <Truck className="w-4 h-4" />;
      case "delivered":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "processing":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "shipped":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
    }
  };

  const handleReorder = (order: Order) => {
    let itemsAdded = 0;

    order.items.forEach((item) => {
      addToCart({
        id: `${item.product_name}-${Date.now()}-${Math.random()}`,
        name: item.product_name,
        price: item.price,
        image: item.product_image,
        quantity: item.quantity,
        variant: item.variant,
        size: item.size,
      });
      itemsAdded++;
    });

    toast({
      title: "Items added to cart",
      description: `${itemsAdded} items from order ${order.order_number} added to your cart`,
    });

    navigate("/cart");
  };

  return (
    <div className="min-h-screen bg-white pb-20" dir="rtl">
      <AppHeader title="היסטוריית הזמנות" showBackButton={true} />

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7DD3C0]"></div>
          <p className="text-sm text-gray-600 font-jakarta mt-4">Loading your orders...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && orders.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center px-4 py-20"
        >
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Package className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 font-jakarta mb-2">No orders yet</h2>
          <p className="text-sm text-gray-600 font-jakarta mb-6 text-center">
            Start shopping to see your order history
          </p>
          <Button
            size="lg"
            className="bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900 rounded-xl font-bold font-jakarta"
            onClick={() => navigate("/home")}
          >
            Start Shopping
          </Button>
        </motion.div>
      )}

      {/* Orders List */}
      {!loading && orders.length > 0 && (
        <div className="px-4 py-5 space-y-4">
          <AnimatePresence>
            {orders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-gray-600" />
                        <span className="font-bold text-gray-900 font-jakarta text-sm">
                          {order.order_number}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 font-jakarta">
                        {new Date(order.order_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <Badge
                      className={`${getStatusColor(
                        order.status
                      )} border font-jakarta text-xs capitalize flex items-center gap-1`}
                    >
                      {getStatusIcon(order.status)}
                      {order.status}
                    </Badge>
                  </div>

                  <Separator className="my-3" />

                  {/* Order Items Preview */}
                  <div className="space-y-2 mb-3">
                    {order.items.slice(0, 2).map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <img
                            src={item.product_image}
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 font-jakarta text-sm truncate">
                            {item.product_name}
                          </p>
                          <p className="text-xs text-gray-600 font-jakarta">
                            Qty: {item.quantity}
                            {item.variant && ` • ${item.variant}`}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-gray-900 font-jakarta">
                          ₪{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <p className="text-xs text-gray-600 font-jakarta">
                        +{order.items.length - 2} more items
                      </p>
                    )}
                  </div>

                  <Separator className="my-3" />

                  {/* Order Total & Actions */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 font-jakarta">Total</p>
                      <p className="text-lg font-bold text-gray-900 font-jakarta">
                        ₪{order.total.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-2 border-gray-300 text-gray-900 hover:bg-gray-100 rounded-lg font-jakarta text-xs"
                        onClick={() => setSelectedOrder(order)}
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900 rounded-lg font-jakarta text-xs"
                        onClick={() => handleReorder(order)}
                      >
                        Reorder
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setSelectedOrder(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 font-jakarta">Order Details</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => setSelectedOrder(null)}
                  >
                    <XCircle className="w-5 h-5 text-gray-700" />
                  </Button>
                </div>

                {/* Order Info */}
                <Card className="p-4 bg-gray-50 border-none">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-jakarta">Order Number</span>
                      <span className="font-semibold text-gray-900 font-jakarta">
                        {selectedOrder.order_number}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-jakarta">Order Date</span>
                      <span className="font-semibold text-gray-900 font-jakarta">
                        {new Date(selectedOrder.order_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-jakarta">Status</span>
                      <Badge
                        className={`${getStatusColor(
                          selectedOrder.status
                        )} border font-jakarta text-xs capitalize`}
                      >
                        {selectedOrder.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-jakarta">Payment Method</span>
                      <span className="font-semibold text-gray-900 font-jakarta capitalize">
                        {selectedOrder.payment_method.replace("-", " ")}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Shipping Address */}
                <div>
                  <h3 className="font-bold text-gray-900 font-jakarta text-sm mb-2">
                    Shipping Address
                  </h3>
                  <Card className="p-3 bg-white border border-gray-200">
                    <div className="text-sm text-gray-600 font-jakarta space-y-1">
                      <p className="font-semibold text-gray-900">
                        {selectedOrder.shipping_address.fullName}
                      </p>
                      <p>{selectedOrder.shipping_address.address}</p>
                      <p>
                        {selectedOrder.shipping_address.city},{" "}
                        {selectedOrder.shipping_address.zipCode}
                      </p>
                      <p>{selectedOrder.shipping_address.phone}</p>
                    </div>
                  </Card>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="font-bold text-gray-900 font-jakarta text-sm mb-2">
                    Items ({selectedOrder.items.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item) => (
                      <Card key={item.id} className="p-3 bg-white border border-gray-200">
                        <div className="flex gap-3">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <img
                              src={item.product_image}
                              alt={item.product_name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 font-jakarta text-sm">
                              {item.product_name}
                            </h4>
                            <p className="text-xs text-gray-600 font-jakarta">
                              Qty: {item.quantity}
                              {item.variant && ` • ${item.variant}`}
                              {item.size && ` • ${item.size}`}
                            </p>
                            <p className="text-sm font-bold text-gray-900 font-jakarta mt-1">
                              ₪{(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <Card className="p-4 bg-white border border-gray-200">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-jakarta">Subtotal</span>
                      <span className="font-semibold text-gray-900 font-jakarta">
                        ₪{selectedOrder.subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-jakarta">Shipping</span>
                      <span className="font-semibold text-gray-900 font-jakarta">
                        {selectedOrder.shipping === 0 ? (
                          <span className="text-[#7DD3C0]">FREE</span>
                        ) : (
                          `₪${selectedOrder.shipping.toFixed(2)}`
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-jakarta">Tax</span>
                      <span className="font-semibold text-gray-900 font-jakarta">
                        ₪{selectedOrder.tax.toFixed(2)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between pt-2">
                      <span className="font-bold text-gray-900 font-jakarta">Total</span>
                      <span className="text-xl font-bold text-gray-900 font-jakarta">
                        ₪{selectedOrder.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Actions */}
                <Button
                  size="lg"
                  className="w-full bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900 rounded-xl font-bold font-jakarta"
                  onClick={() => {
                    handleReorder(selectedOrder);
                    setSelectedOrder(null);
                  }}
                >
                  Reorder Items
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default OrderHistory;
