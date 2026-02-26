import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  RotateCcw, Search, Clock, CheckCircle, XCircle,
  Package, DollarSign, AlertTriangle, MessageSquare, Loader2
} from "lucide-react";

const AdminReturns = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ["return-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("return_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("return_requests")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["return-requests"] });
      toast.success("סטטוס עודכן");
    },
  });

  const stats = [
    { title: "ממתינות", value: returns.filter((r: any) => r.status === "pending").length, icon: Clock, gradient: "from-amber-500 to-orange-600" },
    { title: "אושרו", value: returns.filter((r: any) => r.status === "approved").length, icon: CheckCircle, gradient: "from-emerald-500 to-green-600" },
    { title: "זוכו", value: returns.filter((r: any) => r.status === "refunded").length, icon: DollarSign, gradient: "from-violet-500 to-purple-600" },
    { title: "נדחו", value: returns.filter((r: any) => r.status === "rejected").length, icon: XCircle, gradient: "from-red-500 to-rose-600" },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-500/10 text-amber-600", approved: "bg-emerald-500/10 text-emerald-600",
      rejected: "bg-destructive/10 text-destructive", refunded: "bg-violet-500/10 text-violet-600",
    };
    const labels: Record<string, string> = { pending: "ממתין", approved: "אושר", rejected: "נדחה", refunded: "זוכה" };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const filteredReturns = returns.filter((r: any) => {
    const matchesSearch = r.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return (filterStatus === "all" || r.status === filterStatus) && matchesSearch;
  });

  return (
    <AdminLayout title="החזרות וזיכויים" icon={RotateCcw}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={i} className="relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-[0.07]`} />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="חיפוש..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10" />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="pending">ממתינים</SelectItem>
                  <SelectItem value="approved">אושרו</SelectItem>
                  <SelectItem value="rejected">נדחו</SelectItem>
                  <SelectItem value="refunded">זוכו</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              בקשות החזרה ({filteredReturns.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : filteredReturns.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">אין בקשות החזרה</div>
            ) : (
              <div className="divide-y divide-border/30">
                {filteredReturns.map((r: any) => (
                  <div key={r.id} className="p-4 hover:bg-accent/5 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground">{r.product_name}</h3>
                          {getStatusBadge(r.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{r.customer_name} • #{r.order_id}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <p className="text-xs text-amber-600">{r.reason}</p>
                        </div>
                        {r.notes && (
                          <div className="flex items-center gap-2 mt-1">
                            <MessageSquare className="w-3 h-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">{r.notes}</p>
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-primary">₪{Number(r.amount).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("he-IL")}</p>
                      </div>
                      <div className="flex gap-2">
                        {r.status === "pending" && (
                          <>
                            <Button size="sm" onClick={() => updateStatus.mutate({ id: r.id, status: "approved" })}><CheckCircle className="w-4 h-4" /></Button>
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateStatus.mutate({ id: r.id, status: "rejected" })}><XCircle className="w-4 h-4" /></Button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <Button size="sm" onClick={() => updateStatus.mutate({ id: r.id, status: "refunded" })}>
                            <DollarSign className="w-4 h-4 ml-1" />זכה
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

export default AdminReturns;
