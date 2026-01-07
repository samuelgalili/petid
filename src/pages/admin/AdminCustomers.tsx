import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Filter,
  Users,
  Mail,
  Phone,
  Package,
  Eye,
  Edit,
  Trash2,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Star,
  MoreVertical,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface Customer {
  user_id: string;
  email: string;
  full_name: string;
  phone?: string;
  order_count: number;
  total_spent: number;
  last_order_date?: string;
  status: "active" | "inactive" | "vip";
  avatar_url?: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  active: { label: "פעיל", color: "text-emerald-100", bgColor: "bg-emerald-500" },
  inactive: { label: "לא פעיל", color: "text-slate-100", bgColor: "bg-slate-600" },
  vip: { label: "VIP", color: "text-amber-100", bgColor: "bg-amber-500" },
};

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
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("user_id, total, shipping_address, created_at");

      if (ordersError) throw ordersError;

      const customerMap = new Map<string, Customer>();

      orders?.forEach((order) => {
        const shippingAddr = order.shipping_address as any;
        const existing = customerMap.get(order.user_id);
        if (existing) {
          existing.order_count += 1;
          existing.total_spent += parseFloat(order.total.toString());
          if (!existing.last_order_date || new Date(order.created_at) > new Date(existing.last_order_date)) {
            existing.last_order_date = order.created_at;
          }
        } else {
          customerMap.set(order.user_id, {
            user_id: order.user_id,
            email: shippingAddr?.email || "N/A",
            full_name: shippingAddr?.fullName || "לקוח ללא שם",
            phone: shippingAddr?.phone,
            order_count: 1,
            total_spent: parseFloat(order.total.toString()),
            last_order_date: order.created_at,
            status: parseFloat(order.total.toString()) > 1000 ? "vip" : "active",
          });
        }
      });

      const customersArray = Array.from(customerMap.values());
      
      // Add mock data if empty
      if (customersArray.length === 0) {
        setCustomers([
          { user_id: "1", full_name: "יצחק נחמד", email: "yitzhak@example.com", phone: "054-1234567", order_count: 12, total_spent: 4580, last_order_date: "2025-01-05", status: "vip" },
          { user_id: "2", full_name: "לאה רובינסון", email: "leah@example.com", phone: "050-9876543", order_count: 5, total_spent: 1250, last_order_date: "2025-01-02", status: "active" },
          { user_id: "3", full_name: "לילך יצחק", email: "lilach@example.com", phone: "052-5555555", order_count: 3, total_spent: 890, last_order_date: "2024-12-28", status: "active" },
          { user_id: "4", full_name: "יצחק דויד", email: "david@example.com", phone: "053-1111111", order_count: 1, total_spent: 150, last_order_date: "2024-11-15", status: "inactive" },
        ]);
      } else {
        setCustomers(customersArray);
      }
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      // Add mock data on error
      setCustomers([
        { user_id: "1", full_name: "יצחק נחמד", email: "yitzhak@example.com", phone: "054-1234567", order_count: 12, total_spent: 4580, last_order_date: "2025-01-05", status: "vip" },
        { user_id: "2", full_name: "לאה רובינסון", email: "leah@example.com", phone: "050-9876543", order_count: 5, total_spent: 1250, last_order_date: "2025-01-02", status: "active" },
        { user_id: "3", full_name: "לילך יצחק", email: "lilach@example.com", phone: "052-5555555", order_count: 3, total_spent: 890, last_order_date: "2024-12-28", status: "active" },
        { user_id: "4", full_name: "יצחק דויד", email: "david@example.com", phone: "053-1111111", order_count: 1, total_spent: 150, last_order_date: "2024-11-15", status: "inactive" },
      ]);
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
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone?.includes(searchQuery)
    );
    setFilteredCustomers(filtered);
  };

  const getCustomersByStatus = (status: string) => customers.filter(c => c.status === status);

  const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);
  const totalOrders = customers.reduce((sum, c) => sum + c.order_count, 0);

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center justify-between px-4 py-4">
          <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700" onClick={() => navigate("/admin/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white">NARTINA</h1>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700" onClick={fetchCustomers} disabled={loading}>
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Actions Bar */}
        <div className="px-4 pb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white gap-2">
              <Plus className="w-4 h-4" />
              לקוח חדש
            </Button>
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-2">
              <Filter className="w-4 h-4" />
              פילטר
            </Button>
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="חיפוש לפי שם, אימייל או טלפון..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pr-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400" 
            />
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-4 py-4 grid grid-cols-4 gap-3">
        <Card className="bg-emerald-500 border-none p-4 flex items-center justify-between">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{customers.length}</p>
            <p className="text-sm text-white/80">סה"כ לקוחות</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </Card>

        <Card className="bg-amber-500 border-none p-4 flex items-center justify-between">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Star className="w-5 h-5 text-white" />
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{getCustomersByStatus("vip").length}</p>
            <p className="text-sm text-white/80">לקוחות VIP</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </Card>

        <Card className="bg-purple-500 border-none p-4 flex items-center justify-between">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{totalOrders}</p>
            <p className="text-sm text-white/80">הזמנות</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </Card>

        <Card className="bg-cyan-500 border-none p-4 flex items-center justify-between">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">₪{totalRevenue.toLocaleString()}</p>
            <p className="text-sm text-white/80">הכנסות</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </Card>
      </div>

      {/* Table */}
      <div className="px-4">
        <div className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700">
          {/* Table Header */}
          <div className="grid grid-cols-[auto_1fr_180px_120px_120px_100px_100px_auto_auto_auto_auto_80px] gap-2 px-4 py-3 bg-slate-800 text-slate-400 text-sm font-medium border-b border-slate-700">
            <div></div>
            <div>שם לקוח</div>
            <div>אימייל</div>
            <div>טלפון</div>
            <div>הזמנות</div>
            <div>סה"כ הוצאות</div>
            <div>סטטוס</div>
            <div>מייל</div>
            <div>הודעה</div>
            <div>צפייה</div>
            <div>עריכה</div>
            <div></div>
          </div>

          {/* Table Body */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Users className="w-16 h-16 mb-4 opacity-50" />
              <p>לא נמצאו לקוחות</p>
            </div>
          ) : (
            filteredCustomers.map((customer, index) => {
              const status = statusConfig[customer.status] || statusConfig.active;
              const isVip = customer.status === "vip";

              return (
                <motion.div
                  key={customer.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="grid grid-cols-[auto_1fr_180px_120px_120px_100px_100px_auto_auto_auto_auto_80px] gap-2 px-4 py-3 items-center border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors relative"
                >
                  {/* Left Color Strip */}
                  <div className={`absolute right-0 top-0 bottom-0 w-1 ${isVip ? 'bg-amber-500' : customer.status === 'active' ? 'bg-emerald-500' : 'bg-slate-500'}`} />

                  {/* Avatar */}
                  <div className="pr-4">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={customer.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-purple-500 text-white">
                        {customer.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Name */}
                  <div className="text-white font-medium">{customer.full_name}</div>

                  {/* Email */}
                  <div className="text-slate-300 text-sm truncate">{customer.email}</div>

                  {/* Phone */}
                  <div className="text-slate-300 text-sm">{customer.phone || "-"}</div>

                  {/* Orders */}
                  <div className="text-white font-medium">{customer.order_count}</div>

                  {/* Total Spent */}
                  <div className="text-emerald-400 font-bold">₪{customer.total_spent.toLocaleString()}</div>

                  {/* Status */}
                  <div>
                    <Badge className={`${status.bgColor} ${status.color} border-none text-xs`}>
                      {isVip && <Star className="w-3 h-3 ml-1" />}
                      {status.label}
                    </Badge>
                  </div>

                  {/* Mail Button */}
                  <div>
                    <Button size="icon" variant="ghost" className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-slate-300">
                      <Mail className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Message Button */}
                  <div>
                    <Button size="icon" variant="ghost" className="w-8 h-8 bg-purple-600 hover:bg-purple-500 text-white">
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* View Button */}
                  <div>
                    <Button size="icon" variant="ghost" className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-slate-300">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Edit Button */}
                  <div>
                    <Button size="icon" variant="ghost" className="w-8 h-8 bg-cyan-600 hover:bg-cyan-500 text-white">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Indicator */}
                  <div className="flex justify-center">
                    <div className={`w-3 h-3 rounded-full ${isVip ? 'bg-amber-500' : customer.status === 'active' ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCustomers;
