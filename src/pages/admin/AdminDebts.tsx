import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  User,
  Phone,
  Mail,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Bell,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CustomerDebt {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  amount: number;
  original_amount: number;
  due_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  pending: { label: "ממתין לתשלום", icon: Clock, color: "text-amber-600", bgColor: "bg-amber-100" },
  partial: { label: "שולם חלקית", icon: DollarSign, color: "text-blue-600", bgColor: "bg-blue-100" },
  paid: { label: "שולם", icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-100" },
  overdue: { label: "באיחור", icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-100" },
};

const AdminDebts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [debts, setDebts] = useState<CustomerDebt[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<CustomerDebt | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // New debt form
  const [newDebt, setNewDebt] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    amount: "",
    due_date: "",
    notes: "",
  });

  useEffect(() => {
    fetchDebts();
  }, []);

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("customer_debts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setDebts(data);
      } else {
        setDebts([]);
      }
    } catch (error) {
      console.error("Error fetching debts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDebts = debts.filter((debt) => {
    const matchesSearch = debt.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (debt.customer_email && debt.customer_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (debt.customer_phone && debt.customer_phone.includes(searchQuery));
    const matchesStatus = filterStatus === "all" || debt.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalDebt = debts.reduce((sum, d) => d.status !== "paid" ? sum + Number(d.amount) : sum, 0);
  const overdueDebt = debts.filter(d => d.status === "overdue").reduce((sum, d) => sum + Number(d.amount), 0);

  const handleCreateDebt = async () => {
    try {
      const amount = parseFloat(newDebt.amount) || 0;
      const { data, error } = await supabase
        .from("customer_debts")
        .insert({
          customer_id: Date.now().toString(),
          customer_name: newDebt.customer_name,
          customer_email: newDebt.customer_email || null,
          customer_phone: newDebt.customer_phone || null,
          amount: amount,
          original_amount: amount,
          due_date: newDebt.due_date || null,
          notes: newDebt.notes || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setDebts([data, ...debts]);
      }

      setIsCreateDialogOpen(false);
      resetForm();

      toast({
        title: "נוצר בהצלחה",
        description: "החוב נוסף למערכת",
      });
    } catch (error) {
      console.error("Error creating debt:", error);
      toast({ title: "שגיאה", description: "לא ניתן ליצור חוב", variant: "destructive" });
    }
  };

  const handleStatusChange = async (debtId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "paid") {
        updates.amount = 0;
      }

      const { error } = await supabase
        .from("customer_debts")
        .update(updates)
        .eq("id", debtId);

      if (error) throw error;

      setDebts(debts.map(debt => 
        debt.id === debtId ? { ...debt, ...updates } : debt
      ));

      toast({
        title: "עודכן בהצלחה",
        description: "סטטוס החוב עודכן",
      });
    } catch (error) {
      console.error("Error updating debt:", error);
      toast({ title: "שגיאה", description: "לא ניתן לעדכן סטטוס", variant: "destructive" });
    }
  };

  const handleSendReminder = (debt: CustomerDebt) => {
    toast({
      title: "תזכורת נשלחה",
      description: `תזכורת תשלום נשלחה ל-${debt.customer_name}`,
    });
  };

  const resetForm = () => {
    setNewDebt({
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      amount: "",
      due_date: "",
      notes: "",
    });
  };

  const getProgressValue = (debt: CustomerDebt) => {
    if (debt.original_amount === 0) return 100;
    return Math.round(((debt.original_amount - debt.amount) / debt.original_amount) * 100);
  };

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-orange-50 via-background to-red-50" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-white/20 text-white"
            onClick={() => navigate("/admin/financial")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">מעקב חובות לקוחות</h1>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-white/20 text-white"
            onClick={fetchDebts}
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className="px-4 py-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-4 bg-white border-none shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">סה"כ חובות</p>
                    <p className="text-2xl font-bold text-orange-600">₪{totalDebt.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-4 bg-white border-none shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">באיחור</p>
                    <p className="text-2xl font-bold text-red-600">₪{overdueDebt.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Overdue Alert */}
          {overdueDebt > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="p-4 bg-red-50 border-red-200">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div className="flex-1">
                    <p className="font-bold text-red-700">יש {debts.filter(d => d.status === "overdue").length} חובות באיחור!</p>
                    <p className="text-sm text-red-600">מומלץ לשלוח תזכורות תשלום</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-red-300 text-red-600 hover:bg-red-100"
                    onClick={() => {
                      debts.filter(d => d.status === "overdue").forEach(handleSendReminder);
                    }}
                  >
                    <Bell className="w-4 h-4 ml-1" />
                    שלח תזכורות
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Search & Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש לקוח..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="pending">ממתין</SelectItem>
                <SelectItem value="partial">חלקי</SelectItem>
                <SelectItem value="overdue">באיחור</SelectItem>
                <SelectItem value="paid">שולם</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                  <Plus className="w-4 h-4 ml-1" />
                  חדש
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md" dir="rtl">
                <DialogHeader>
                  <DialogTitle>חוב חדש</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>שם לקוח *</Label>
                    <Input
                      placeholder="שם מלא"
                      value={newDebt.customer_name}
                      onChange={(e) => setNewDebt({ ...newDebt, customer_name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>טלפון</Label>
                      <Input
                        placeholder="טלפון"
                        value={newDebt.customer_phone}
                        onChange={(e) => setNewDebt({ ...newDebt, customer_phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>אימייל</Label>
                      <Input
                        type="email"
                        placeholder="אימייל"
                        value={newDebt.customer_email}
                        onChange={(e) => setNewDebt({ ...newDebt, customer_email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>סכום החוב *</Label>
                      <Input
                        type="number"
                        placeholder="₪0"
                        value={newDebt.amount}
                        onChange={(e) => setNewDebt({ ...newDebt, amount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>תאריך יעד</Label>
                      <Input
                        type="date"
                        value={newDebt.due_date}
                        onChange={(e) => setNewDebt({ ...newDebt, due_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500"
                    onClick={handleCreateDebt}
                    disabled={!newDebt.customer_name || !newDebt.amount}
                  >
                    הוספת חוב
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Debts List */}
          <div className="space-y-3">
            {filteredDebts.map((debt, index) => {
              const status = statusConfig[debt.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              const progress = getProgressValue(debt);
              const daysUntilDue = getDaysUntilDue(debt.due_date);
              
              return (
                <motion.div
                  key={debt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`p-4 bg-white border-none shadow-sm hover:shadow-md transition-shadow ${
                    debt.status === "overdue" ? "border-r-4 border-r-red-500" : ""
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className={`${status.bgColor} ${status.color}`}>
                            {debt.customer_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-foreground">{debt.customer_name}</h4>
                          {debt.customer_phone && (
                            <p className="text-sm text-muted-foreground">{debt.customer_phone}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-xl font-bold text-foreground">₪{debt.amount.toLocaleString()}</p>
                        <Badge className={`${status.bgColor} ${status.color} border-none text-xs`}>
                          <StatusIcon className="w-3 h-3 ml-1" />
                          {status.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {debt.status !== "pending" && debt.original_amount > 0 && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>שולם: ₪{(debt.original_amount - debt.amount).toLocaleString()}</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}

                    {/* Due Date Warning */}
                    {daysUntilDue !== null && debt.status !== "paid" && (
                      <div className={`text-xs mb-3 ${daysUntilDue < 0 ? "text-red-600" : daysUntilDue <= 3 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {daysUntilDue < 0 
                          ? `באיחור של ${Math.abs(daysUntilDue)} ימים`
                          : daysUntilDue === 0 
                            ? "היום תאריך היעד!"
                            : `${daysUntilDue} ימים עד תאריך היעד`
                        }
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {debt.status !== "paid" && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleSendReminder(debt)}
                          >
                            <Send className="w-4 h-4 ml-1" />
                            תזכורת
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1 bg-green-500 hover:bg-green-600"
                            onClick={() => handleStatusChange(debt.id, "paid")}
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            סמן כשולם
                          </Button>
                        </>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedDebt(debt);
                            setIsViewDialogOpen(true);
                          }}>
                            <Eye className="w-4 h-4 ml-2" />
                            צפייה
                          </DropdownMenuItem>
                          {debt.customer_phone && (
                            <DropdownMenuItem onClick={() => window.location.href = `tel:${debt.customer_phone}`}>
                              <Phone className="w-4 h-4 ml-2" />
                              התקשר
                            </DropdownMenuItem>
                          )}
                          {debt.customer_email && (
                            <DropdownMenuItem onClick={() => window.location.href = `mailto:${debt.customer_email}`}>
                              <Mail className="w-4 h-4 ml-2" />
                              שלח מייל
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {filteredDebts.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">אין חובות פתוחים! 🎉</p>
            </div>
          )}
        </div>
      )}

      {/* Debt View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          {selectedDebt && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedDebt.customer_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">סכום החוב</p>
                  <p className="text-3xl font-bold">₪{selectedDebt.amount.toLocaleString()}</p>
                  {selectedDebt.original_amount !== selectedDebt.amount && (
                    <p className="text-sm text-muted-foreground">
                      מתוך ₪{selectedDebt.original_amount.toLocaleString()}
                    </p>
                  )}
                </div>

                <Badge className={`${statusConfig[selectedDebt.status]?.bgColor} ${statusConfig[selectedDebt.status]?.color} w-full justify-center py-2`}>
                  {statusConfig[selectedDebt.status]?.label}
                </Badge>

                {selectedDebt.due_date && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>תאריך יעד: {new Date(selectedDebt.due_date).toLocaleDateString("he-IL")}</span>
                  </div>
                )}

                {selectedDebt.customer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${selectedDebt.customer_phone}`} className="text-orange-600 hover:underline">
                      {selectedDebt.customer_phone}
                    </a>
                  </div>
                )}

                {selectedDebt.customer_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${selectedDebt.customer_email}`} className="text-orange-600 hover:underline">
                      {selectedDebt.customer_email}
                    </a>
                  </div>
                )}

                {selectedDebt.notes && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">הערות:</p>
                    <p>{selectedDebt.notes}</p>
                  </div>
                )}

                {selectedDebt.status !== "paid" && (
                  <div className="space-y-2">
                    <Label>שנה סטטוס:</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(statusConfig).map(([status, config]) => (
                        <Button
                          key={status}
                          variant={selectedDebt.status === status ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            handleStatusChange(selectedDebt.id, status);
                            if (status === "paid") {
                              setSelectedDebt({ ...selectedDebt, status, amount: 0 });
                            } else {
                              setSelectedDebt({ ...selectedDebt, status });
                            }
                          }}
                          className={selectedDebt.status === status ? config.bgColor + " " + config.color : ""}
                        >
                          {config.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDebts;
