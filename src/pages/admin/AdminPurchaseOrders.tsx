import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";

const AdminPurchaseOrders = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    supplier_id: "",
    items: "",
    total_amount: "",
    notes: "",
  });
  const queryClient = useQueryClient();

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("status", "active");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["supplier-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_invoices")
        .select(`
          *,
          suppliers (name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createOrder = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("supplier_invoices").insert({
        supplier_id: newOrder.supplier_id,
        amount: parseFloat(newOrder.total_amount),
        description: newOrder.items,
        notes: newOrder.notes,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] });
      setIsDialogOpen(false);
      setNewOrder({ supplier_id: "", items: "", total_amount: "", notes: "" });
      toast.success("הזמנת רכש נוצרה בהצלחה");
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("supplier_invoices")
        .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] });
      toast.success("הסטטוס עודכן");
    },
  });

  const filteredInvoices = invoices?.filter(inv =>
    inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    {
      title: "הזמנות פתוחות",
      value: invoices?.filter(i => i.status === "pending").length || 0,
      icon: Clock,
      gradient: "from-amber-500 to-orange-600",
    },
    {
      title: "בדרך",
      value: invoices?.filter(i => i.status === "shipped").length || 0,
      icon: Truck,
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      title: "התקבלו",
      value: invoices?.filter(i => i.status === "received").length || 0,
      icon: CheckCircle,
      gradient: "from-emerald-500 to-green-600",
    },
    {
      title: "שולמו",
      value: invoices?.filter(i => i.status === "paid").length || 0,
      icon: FileText,
      gradient: "from-violet-500 to-purple-600",
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      shipped: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      received: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      paid: "bg-violet-500/20 text-violet-400 border-violet-500/30",
      cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    const labels: Record<string, string> = {
      pending: "ממתין",
      shipped: "נשלח",
      received: "התקבל",
      paid: "שולם",
      cancelled: "בוטל",
    };
    return <Badge className={styles[status] || styles.pending}>{labels[status] || status}</Badge>;
  };

  return (
    <AdminLayout title="הזמנות רכש" icon={ShoppingBag}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                  placeholder="חיפוש הזמנה..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
                    <Plus className="w-4 h-4 ml-2" />
                    הזמנה חדשה
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">יצירת הזמנת רכש</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label className="text-slate-300">ספק</Label>
                      <Select value={newOrder.supplier_id} onValueChange={(v) => setNewOrder({...newOrder, supplier_id: v})}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue placeholder="בחר ספק" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers?.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">פריטים</Label>
                      <Textarea
                        value={newOrder.items}
                        onChange={(e) => setNewOrder({...newOrder, items: e.target.value})}
                        placeholder="תיאור הפריטים להזמנה..."
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">סכום כולל (₪)</Label>
                      <Input
                        type="number"
                        value={newOrder.total_amount}
                        onChange={(e) => setNewOrder({...newOrder, total_amount: e.target.value})}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">הערות</Label>
                      <Textarea
                        value={newOrder.notes}
                        onChange={(e) => setNewOrder({...newOrder, notes: e.target.value})}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-violet-500 to-purple-600"
                      onClick={() => createOrder.mutate()}
                      disabled={!newOrder.supplier_id || !newOrder.total_amount}
                    >
                      צור הזמנה
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card className="border-0 bg-gradient-to-br from-slate-900 to-slate-800">
          <CardHeader className="border-b border-slate-700/50">
            <CardTitle className="text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-violet-400" />
              הזמנות רכש ({filteredInvoices?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">טוען...</div>
            ) : filteredInvoices?.length === 0 ? (
              <div className="p-8 text-center text-slate-400">אין הזמנות רכש</div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {filteredInvoices?.map((invoice) => (
                  <div key={invoice.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white">{invoice.suppliers?.name}</h3>
                        <p className="text-sm text-slate-400 truncate">{invoice.notes || invoice.invoice_number}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {format(new Date(invoice.created_at), "dd/MM/yyyy HH:mm", { locale: he })}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-violet-400">₪{invoice.amount?.toLocaleString()}</p>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <div className="flex gap-2">
                        {invoice.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-500/30 text-blue-400"
                            onClick={() => updateStatus.mutate({ id: invoice.id, status: "shipped" })}
                          >
                            <Truck className="w-4 h-4" />
                          </Button>
                        )}
                        {invoice.status === "shipped" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-500/30 text-emerald-400"
                            onClick={() => updateStatus.mutate({ id: invoice.id, status: "received" })}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {invoice.status === "received" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-violet-500/30 text-violet-400"
                            onClick={() => updateStatus.mutate({ id: invoice.id, status: "paid" })}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        )}
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

export default AdminPurchaseOrders;