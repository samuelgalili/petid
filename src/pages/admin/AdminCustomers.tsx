import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Mail, Phone, Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface Customer {
  user_id: string;
  email: string;
  full_name: string;
  order_count: number;
  total_spent: number;
}

const AdminCustomers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, customers]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      // Fetch all orders grouped by user
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("user_id, total, shipping_address");

      if (ordersError) throw ordersError;

      // Group orders by user and calculate stats
      const customerMap = new Map<string, Customer>();

      orders?.forEach((order) => {
        const shippingAddr = order.shipping_address as any;
        const existing = customerMap.get(order.user_id);
        if (existing) {
          existing.order_count += 1;
          existing.total_spent += parseFloat(order.total.toString());
        } else {
          customerMap.set(order.user_id, {
            user_id: order.user_id,
            email: shippingAddr?.email || "N/A",
            full_name: shippingAddr?.fullName || "Unknown Customer",
            order_count: 1,
            total_spent: parseFloat(order.total.toString()),
          });
        }
      });

      const customersArray = Array.from(customerMap.values());
      setCustomers(customersArray);
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      toast({
        title: "שגיאה",
        description: "נכשל בטעינת לקוחות",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    if (!searchQuery) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(
      (customer) =>
        customer.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredCustomers(filtered);
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-secondary"
            onClick={() => navigate("/admin/dashboard")}
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Button>
          <h1 className="text-base font-bold font-jakarta text-foreground">לקוחות</h1>
          <div className="w-10" />
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="חפש לפי שם או אימייל..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 font-jakarta"
            />
          </div>
        </div>
      </header>

      {/* Customers List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Users className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground font-jakarta text-center">
            {searchQuery ? "לא נמצאו לקוחות תואמים" : "אין לקוחות עדיין"}
          </p>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          <p className="text-sm text-muted-foreground font-jakarta">
            סה"כ לקוחות: {filteredCustomers.length}
          </p>

          {filteredCustomers.map((customer, index) => (
            <motion.div
              key={customer.user_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-4 bg-card border border-border rounded-xl shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground font-jakarta text-sm mb-2">
                      {customer.full_name}
                    </h3>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span className="font-jakarta">{customer.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Package className="w-3 h-3" />
                        <span className="font-jakarta">
                          {customer.order_count} הזמנ{customer.order_count !== 1 ? "ות" : "ה"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-jakarta mb-1">סה"כ הוצאות</p>
                    <p className="text-lg font-bold text-foreground font-jakarta">
                      ₪{customer.total_spent.toFixed(2)}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;
