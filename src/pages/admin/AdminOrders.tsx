import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  RefreshCw,
  ShoppingCart,
  DollarSign,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { 
  AdminStatCard, 
  AdminStatsGrid, 
  AdminToolbar,
  AdminEmptyState,
  AdminStatusBadge,
} from "@/components/admin/AdminStyles";

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
  
  useAdminNotifications();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel("order-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
        title: "שגיאה",
        description: "נכשל בטעינת ההזמנות",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = [...orders];

    if (searchQuery) {
      result = result.filter(
        (order) =>
          order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.shipping_address?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((order) => order.status === statusFilter);
    }

    setFilteredOrders(result);
  }, [orders, searchQuery, statusFilter]);

  const updateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    try {
      setUpdatingStatus(true);
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      setSelectedOrder(null);

      toast({
        title: "עודכן בהצלחה",
        description: `סטטוס ההזמנה שונה ל-${getStatusLabel(newStatus)}`,
      });
    } catch (error: any) {
      console.error("Error updating order status:", error);
      toast({
        title: "שגיאה",
        description: "נכשל בעדכון סטטוס ההזמנה",
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

  const getStatusLabel = (status: Order["status"]) => {
    const labels: Record<string, string> = {
      pending: "ממתין",
      processing: "בטיפול",
      shipped: "נשלח",
      delivered: "נמסר",
      cancelled: "בוטל",
    };
    return labels[status] || status;
  };

  const getStatusType = (status: Order["status"]) => {
    const types: Record<string, "pending" | "processing" | "success" | "danger"> = {
      pending: "pending",
      processing: "processing",
      shipped: "processing",
      delivered: "success",
      cancelled: "danger",
    };
    return types[status] || "pending";
  };

  // Stats calculations
  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total?.toString() || "0"), 0);
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const deliveredOrders = orders.filter(o => o.status === "delivered").length;

  return (
    <AdminLayout title="ניהול הזמנות" icon={ShoppingCart}>
      <div className="space-y-6">
        {/* Stats */}
        <AdminStatsGrid>
          <AdminStatCard
            title="סה״כ הזמנות"
            value={orders.length}
            icon={ShoppingCart}
            color="primary"
          />
          <AdminStatCard
            title="הכנסות"
            value={`₪${totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            color="success"
          />
          <AdminStatCard
            title="ממתינות לטיפול"
            value={pendingOrders}
            icon={Clock}
            color="warning"
          />
          <AdminStatCard
            title="נמסרו"
            value={deliveredOrders}
            icon={CheckCircle}
            color="success"
          />
        </AdminStatsGrid>

        {/* Toolbar */}
        <AdminToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="חיפוש לפי מספר הזמנה או לקוח..."
          onRefresh={fetchOrders}
          isRefreshing={loading}
        >
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="pending">ממתין</SelectItem>
              <SelectItem value="processing">בטיפול</SelectItem>
              <SelectItem value="shipped">נשלח</SelectItem>
              <SelectItem value="delivered">נמסר</SelectItem>
              <SelectItem value="cancelled">בוטל</SelectItem>
            </SelectContent>
          </Select>
        </AdminToolbar>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <AdminEmptyState
            icon={Package}
            title="אין הזמנות"
            description={searchQuery || statusFilter !== "all" 
              ? "לא נמצאו הזמנות התואמות לחיפוש" 
              : "טרם התקבלו הזמנות"
            }
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              מציג {filteredOrders.length} הזמנות
            </p>

            <AnimatePresence>
              {filteredOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card 
                    className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-bold text-foreground">
                            {order.order_number}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.order_date).toLocaleDateString("he-IL")}
                          </p>
                          {order.shipping_address?.fullName && (
                            <p className="text-sm text-muted-foreground">
                              {order.shipping_address.fullName}
                            </p>
                          )}
                        </div>
                        <AdminStatusBadge 
                          status={getStatusType(order.status)} 
                          label={getStatusLabel(order.status)} 
                        />
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <p className="text-lg font-bold">
                          ₪{order.total?.toFixed(2)}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                          פרטים
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Order Details Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader>
              <DialogTitle>עדכון סטטוס הזמנה</DialogTitle>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-4">
                <Card className="bg-muted/50 border-0">
                  <CardContent className="p-4">
                    <p className="font-bold mb-1">{selectedOrder.order_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.shipping_address?.fullName}
                    </p>
                    <p className="text-lg font-bold mt-2">
                      ₪{selectedOrder.total?.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">בחר סטטוס חדש</p>

                  {(["pending", "processing", "shipped", "delivered", "cancelled"] as Order["status"][]).map(
                    (status) => (
                      <Button
                        key={status}
                        variant={selectedOrder.status === status ? "default" : "outline"}
                        className="w-full justify-start gap-2"
                        onClick={() => updateOrderStatus(selectedOrder.id, status)}
                        disabled={updatingStatus}
                      >
                        {getStatusIcon(status)}
                        <span>{getStatusLabel(status)}</span>
                        {selectedOrder.status === status && (
                          <CheckCircle className="w-4 h-4 mr-auto" />
                        )}
                      </Button>
                    )
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
