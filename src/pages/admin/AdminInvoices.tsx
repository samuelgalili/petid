import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Receipt, 
  Plus, 
  Search, 
  Download,
  FileText,
  Printer,
  Eye,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

const AdminInvoices = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders-for-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filteredOrders = orders?.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterType === "all") return matchesSearch;
    return matchesSearch && order.status === filterType;
  });

  const stats = [
    {
      title: "סה״כ חשבוניות",
      value: orders?.length || 0,
      icon: FileText,
      gradient: "from-violet-500 to-purple-600",
    },
    {
      title: "סכום כולל",
      value: `₪${(orders?.reduce((acc, o) => acc + (o.total || 0), 0) || 0).toLocaleString()}`,
      icon: Receipt,
      gradient: "from-emerald-500 to-green-600",
    },
    {
      title: "החודש",
      value: orders?.filter(o => {
        const orderDate = new Date(o.created_at);
        const now = new Date();
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      }).length || 0,
      icon: Calendar,
      gradient: "from-amber-500 to-orange-600",
    },
  ];

  const generateInvoice = (order: any) => {
    // Create invoice content
    const invoiceContent = `
      חשבונית מס' ${order.id.slice(0, 8).toUpperCase()}
      תאריך: ${format(new Date(order.created_at), "dd/MM/yyyy")}
      
      לקוח: ${order.customer_name || "לקוח כללי"}
      כתובת: ${order.shipping_address || ""}
      
      סה"כ לתשלום: ₪${order.total?.toLocaleString()}
    `;
    
    // Download as text file (in real app would be PDF)
    const blob = new Blob([invoiceContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${order.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout title="חשבוניות וקבלות" icon={Receipt}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 to-slate-800">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-10`} />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Controls */}
        <Card className="border-0 bg-gradient-to-br from-slate-900 to-slate-800">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="חיפוש לפי מספר הזמנה או שם לקוח..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="completed">הושלמו</SelectItem>
                  <SelectItem value="pending">ממתינים</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Invoices List */}
        <Card className="border-0 bg-gradient-to-br from-slate-900 to-slate-800">
          <CardHeader className="border-b border-slate-700/50">
            <CardTitle className="text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-violet-400" />
              חשבוניות ({filteredOrders?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">טוען...</div>
            ) : filteredOrders?.length === 0 ? (
              <div className="p-8 text-center text-slate-400">אין חשבוניות</div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {filteredOrders?.map((order) => (
                  <div key={order.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white">#{order.order_number || order.id.slice(0, 8).toUpperCase()}</h3>
                          <Badge className={
                            order.status === "delivered" 
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          }>
                            {order.status === "delivered" ? "הושלם" : "ממתין"}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400">{order.order_number || "הזמנה"}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: he })}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-violet-400">₪{order.total?.toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-700 text-slate-300"
                          onClick={() => generateInvoice(order)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-700 text-slate-300"
                          onClick={() => window.print()}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminInvoices;