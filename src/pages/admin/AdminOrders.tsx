import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Filter,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface Order {
  id: string;
  order_number: string;
  order_date: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  total: number;
  user_id: string;
  shipping_address: any;
  payment_method: string;
}

const AdminOrders = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [searchQuery, statusFilter, orders]);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("order_date", { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.shipping_address?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    try {
      setUpdatingStatus(true);

      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      // Update local state
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      setSelectedOrder(null);

      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}`,
      });
    } catch (error: any) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
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

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-gray-100"
            onClick={() => navigate("/admin/dashboard")}
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Button>
          <h1 className="text-base font-bold font-jakarta text-gray-900">Manage Orders</h1>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-gray-100"
            onClick={fetchOrders}
          >
            <RefreshCw className="w-5 h-5 text-gray-700" />
          </Button>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search by order number or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 font-jakarta"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="font-jakarta">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7DD3C0]"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Package className="w-16 h-16 text-gray-300 mb-4" />
          <p className="text-gray-600 font-jakarta text-center">
            {searchQuery || statusFilter !== "all"
              ? "No orders match your filters"
              : "No orders yet"}
          </p>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          <p className="text-sm text-gray-600 font-jakarta">
            Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
          </p>

          <AnimatePresence>
            {filteredOrders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900 font-jakarta text-sm mb-1">
                        {order.order_number}
                      </p>
                      <p className="text-xs text-gray-600 font-jakarta">
                        {new Date(order.order_date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-600 font-jakarta mt-1">
                        {order.shipping_address?.fullName}
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

                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-gray-900 font-jakarta">
                      ₪{order.total.toFixed(2)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-jakarta"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(order);
                      }}
                    >
                      Update Status
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Order Details & Status Update Modal */}
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
              className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto"
            >
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 font-jakarta">
                    Update Order Status
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => setSelectedOrder(null)}
                  >
                    <XCircle className="w-5 h-5 text-gray-700" />
                  </Button>
                </div>

                <Card className="p-3 bg-gray-50 border-none">
                  <p className="text-sm font-bold text-gray-900 font-jakarta mb-1">
                    {selectedOrder.order_number}
                  </p>
                  <p className="text-xs text-gray-600 font-jakarta">
                    {selectedOrder.shipping_address?.fullName}
                  </p>
                </Card>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-900 font-jakarta">
                    Select New Status
                  </p>

                  {(["pending", "processing", "shipped", "delivered", "cancelled"] as Order["status"][]).map(
                    (status) => (
                      <Button
                        key={status}
                        variant={selectedOrder.status === status ? "default" : "outline"}
                        className={`w-full justify-start font-jakarta ${
                          selectedOrder.status === status
                            ? "bg-[#7DD3C0] hover:bg-[#6BC4AD] text-gray-900"
                            : ""
                        }`}
                        onClick={() => updateOrderStatus(selectedOrder.id, status)}
                        disabled={updatingStatus}
                      >
                        {getStatusIcon(status)}
                        <span className="ml-2 capitalize">{status}</span>
                        {selectedOrder.status === status && (
                          <CheckCircle className="w-4 h-4 ml-auto" />
                        )}
                      </Button>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminOrders;
