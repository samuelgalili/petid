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
import { 
  RotateCcw, 
  Search, 
  Clock,
  CheckCircle,
  XCircle,
  Package,
  DollarSign,
  AlertTriangle,
  MessageSquare
} from "lucide-react";

interface ReturnRequest {
  id: string;
  orderId: string;
  customerName: string;
  productName: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "refunded";
  amount: number;
  createdAt: string;
  notes?: string;
}

const mockReturns: ReturnRequest[] = [
  { id: "1", orderId: "ORD-001", customerName: "ישראל ישראלי", productName: "מזון לכלבים פרימיום", reason: "מוצר פגום", status: "pending", amount: 120, createdAt: "2024-01-05" },
  { id: "2", orderId: "ORD-002", customerName: "שרה כהן", productName: "צעצוע לחתול", reason: "לא מתאים", status: "approved", amount: 45, createdAt: "2024-01-04" },
  { id: "3", orderId: "ORD-003", customerName: "דוד לוי", productName: "קולר GPS", reason: "בעיה טכנית", status: "refunded", amount: 250, createdAt: "2024-01-03" },
  { id: "4", orderId: "ORD-004", customerName: "רחל מזרחי", productName: "מיטה לכלב", reason: "שינוי דעה", status: "rejected", amount: 180, createdAt: "2024-01-02", notes: "עבר 14 יום" },
];

const AdminReturns = () => {
  const [returns, setReturns] = useState<ReturnRequest[]>(mockReturns);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);

  const stats = [
    {
      title: "בקשות ממתינות",
      value: returns.filter(r => r.status === "pending").length,
      icon: Clock,
      gradient: "from-amber-500 to-orange-600",
    },
    {
      title: "אושרו",
      value: returns.filter(r => r.status === "approved").length,
      icon: CheckCircle,
      gradient: "from-emerald-500 to-green-600",
    },
    {
      title: "זוכו",
      value: returns.filter(r => r.status === "refunded").length,
      icon: DollarSign,
      gradient: "from-violet-500 to-purple-600",
    },
    {
      title: "נדחו",
      value: returns.filter(r => r.status === "rejected").length,
      icon: XCircle,
      gradient: "from-red-500 to-rose-600",
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700 border-amber-200",
      approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
      rejected: "bg-red-100 text-red-700 border-red-200",
      refunded: "bg-violet-100 text-violet-700 border-violet-200",
    };
    const labels: Record<string, string> = {
      pending: "ממתין",
      approved: "אושר",
      rejected: "נדחה",
      refunded: "זוכה",
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const updateStatus = (id: string, status: ReturnRequest["status"]) => {
    setReturns(returns.map(r => r.id === id ? { ...r, status } : r));
    setSelectedReturn(null);
  };

  const filteredReturns = returns.filter(r => {
    const matchesSearch = 
      r.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.productName.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterStatus === "all") return matchesSearch;
    return matchesSearch && r.status === filterStatus;
  });

  return (
    <AdminLayout title="החזרות וזיכויים" icon={RotateCcw}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-10`} />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
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
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש לפי מספר הזמנה, שם לקוח או מוצר..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
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

        {/* Returns List */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              בקשות החזרה ({filteredReturns.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredReturns.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">אין בקשות החזרה</div>
            ) : (
              <div className="divide-y">
                {filteredReturns.map((returnReq) => (
                  <div key={returnReq.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{returnReq.productName}</h3>
                          {getStatusBadge(returnReq.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{returnReq.customerName} • הזמנה #{returnReq.orderId}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <p className="text-xs text-amber-600">{returnReq.reason}</p>
                        </div>
                        {returnReq.notes && (
                          <div className="flex items-center gap-2 mt-1">
                            <MessageSquare className="w-3 h-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">{returnReq.notes}</p>
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-primary">₪{returnReq.amount}</p>
                        <p className="text-xs text-muted-foreground">{returnReq.createdAt}</p>
                      </div>
                      <div className="flex gap-2">
                        {returnReq.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateStatus(returnReq.id, "approved")}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => updateStatus(returnReq.id, "rejected")}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {returnReq.status === "approved" && (
                          <Button
                            size="sm"
                            onClick={() => updateStatus(returnReq.id, "refunded")}
                          >
                            <DollarSign className="w-4 h-4 ml-1" />
                            זכה
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