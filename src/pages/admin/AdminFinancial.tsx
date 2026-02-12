import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Building2,
  Truck,
  CreditCard,
  Wallet,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Plus,
  FileText,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface MonthlyBalance {
  month: number;
  year: number;
  total_income: number;
  total_expenses: number;
  merchandise_expenses: number;
  salary_expenses: number;
  fixed_expenses: number;
  variable_expenses: number;
  balance: number;
}

interface SupplierSummary {
  name: string;
  type: string;
  amount: number;
}

const AdminFinancial = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Financial data
  const [monthlyBalance, setMonthlyBalance] = useState<MonthlyBalance | null>(null);
  const [supplierSummary, setSupplierSummary] = useState<SupplierSummary[]>([]);
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  
  // Current date info
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthNames = ['', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);

      // Fetch monthly balance
      const { data: balanceData } = await supabase
        .from("monthly_balance")
        .select("*")
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .single();

      if (balanceData) {
        setMonthlyBalance(balanceData);
      } else {
        // Create empty balance if none exists
        setMonthlyBalance({
          month: currentMonth,
          year: currentYear,
          total_income: 0,
          total_expenses: 0,
          merchandise_expenses: 0,
          salary_expenses: 0,
          fixed_expenses: 0,
          variable_expenses: 0,
          balance: 0,
        });
      }

      // Fetch suppliers
      const { data: suppliers } = await supabase
        .from("suppliers")
        .select("name, supplier_type, monthly_amount")
        .eq("is_active", true);

      if (suppliers && suppliers.length > 0) {
        setSupplierSummary(suppliers.map(s => ({
          name: s.name,
          type: s.supplier_type,
          amount: Number(s.monthly_amount) || 0
        })));
      } else {
        setSupplierSummary([]);
      }

      // Fetch yearly data from monthly_balance table
      const { data: yearlyBalanceData } = await supabase
        .from("monthly_balance")
        .select("*")
        .eq("year", currentYear)
        .order("month", { ascending: true });

      if (yearlyBalanceData && yearlyBalanceData.length > 0) {
        setYearlyData(yearlyBalanceData.map(b => ({
          month: monthNames[b.month],
          income: b.total_income,
          expenses: b.total_expenses,
        })));
      } else {
        setYearlyData([]);
      }

    } catch (error) {
      console.error("Error fetching financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const expenseBreakdown = monthlyBalance ? [
    { 
      name: "קניית סחורה", 
      value: monthlyBalance.merchandise_expenses,
      percentage: Math.round((monthlyBalance.merchandise_expenses / monthlyBalance.total_expenses) * 100),
      icon: ShoppingBag,
      color: "bg-amber-400",
      textColor: "text-amber-600"
    },
    { 
      name: "משכורות", 
      value: monthlyBalance.salary_expenses,
      percentage: Math.round((monthlyBalance.salary_expenses / monthlyBalance.total_expenses) * 100),
      icon: Users,
      color: "bg-red-400",
      textColor: "text-red-600"
    },
    { 
      name: "הוצאות קבועות", 
      value: monthlyBalance.fixed_expenses,
      percentage: Math.round((monthlyBalance.fixed_expenses / monthlyBalance.total_expenses) * 100),
      icon: Building2,
      color: "bg-emerald-400",
      textColor: "text-emerald-600"
    },
    { 
      name: "הוצאות משתנות", 
      value: monthlyBalance.variable_expenses,
      percentage: Math.round((monthlyBalance.variable_expenses / monthlyBalance.total_expenses) * 100),
      icon: Truck,
      color: "bg-blue-400",
      textColor: "text-blue-600"
    },
  ] : [];

  const supplierTypeIcons: Record<string, { icon: any; color: string; label: string }> = {
    merchandise: { icon: ShoppingBag, color: "bg-pink-100 text-pink-600", label: "סחורה" },
    fixed: { icon: Building2, color: "bg-green-100 text-green-600", label: "קבוע" },
    variable: { icon: Truck, color: "bg-blue-100 text-blue-600", label: "משתנה" },
  };

  const CHART_COLORS = ['#FBD66A', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

  const balanceProgress = monthlyBalance 
    ? Math.min(100, Math.round((monthlyBalance.balance / monthlyBalance.total_income) * 100))
    : 0;

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-violet-50 via-background to-orange-50" dir="rtl">
      {/* Header - Nartina Style */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-violet-600 to-violet-700 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-white/20 text-white"
            onClick={() => navigate("/admin/growo")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">דשבורד פיננסי</h1>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-white/20 text-white"
            onClick={fetchFinancialData}
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        </div>
      ) : (
        <div className="px-4 py-6 space-y-6">
          {/* KPI Cards - Nartina Style */}
          <div className="grid grid-cols-2 gap-4">
            {/* Total Income */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-4 bg-gradient-to-br from-green-400 to-emerald-500 text-white border-none shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <Badge className="bg-white/20 text-white border-none">
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    +12%
                  </Badge>
                </div>
                <p className="text-2xl font-bold">₪{monthlyBalance?.total_income.toLocaleString()}</p>
                <p className="text-sm text-white/80">סה"כ הכנסות</p>
              </Card>
            </motion.div>

            {/* Total Expenses */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-4 bg-gradient-to-br from-red-400 to-rose-500 text-white border-none shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <Badge className="bg-white/20 text-white border-none">
                    <ArrowDownRight className="w-3 h-3 mr-1" />
                    -5%
                  </Badge>
                </div>
                <p className="text-2xl font-bold">₪{monthlyBalance?.total_expenses.toLocaleString()}</p>
                <p className="text-sm text-white/80">סה"כ הוצאות</p>
              </Card>
            </motion.div>

            {/* Balance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="col-span-2"
            >
              <Card className="p-5 bg-white border-none shadow-xl rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
                      <Settings className="w-6 h-6 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">מאזן</p>
                      <p className="text-sm text-muted-foreground">חודש {monthNames[currentMonth]}, {currentYear}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/admin/financial/report")}>
                      <BarChart3 className="w-5 h-5 text-muted-foreground" />
                    </Button>
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
                
                <div className="flex items-end justify-between mb-3">
                  <p className="text-4xl font-bold text-violet-600">
                    ₪{monthlyBalance?.balance.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {monthNames[currentMonth]} {new Date().getDate()}, {currentYear}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">התקדמות חודשית</span>
                    <span className="font-bold text-violet-600">{balanceProgress}%</span>
                  </div>
                  <Progress value={balanceProgress} className="h-3 bg-violet-100" />
                </div>

                <Button 
                  className="w-full mt-4 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700"
                  onClick={() => navigate("/admin/financial/report")}
                >
                  <FileText className="w-4 h-4 ml-2" />
                  דו"ח מאזן חודשי
                </Button>
              </Card>
            </motion.div>
          </div>

          {/* Expense Breakdown - Nartina Style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-5 bg-white border-none shadow-lg rounded-2xl">
              <h3 className="text-lg font-bold text-foreground mb-4">פירוט הוצאות</h3>
              <div className="space-y-4">
                {expenseBreakdown.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full bg-opacity-20 flex items-center justify-center ${item.color.replace('bg-', 'bg-opacity-20 bg-')}`}>
                            <Icon className={`w-5 h-5 ${item.textColor}`} />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{item.name}</p>
                            <p className="text-sm text-muted-foreground">₪{item.value.toLocaleString()}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={`${item.textColor} border-current`}>
                          {item.percentage}%
                        </Badge>
                      </div>
                      <Progress 
                        value={item.percentage} 
                        className="h-2" 
                        style={{ 
                          background: 'rgba(0,0,0,0.05)',
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>

          {/* Supplier Report - Nartina Style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-5 bg-white border-none shadow-lg rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">דו"ח ספקים חודשי</h3>
                  <Badge variant="secondary">{monthNames[currentMonth]} {currentYear}</Badge>
                </div>
                <Button variant="ghost" size="sm" className="text-violet-600">
                  צפייה
                </Button>
              </div>

              {/* Month Toggle */}
              <div className="flex gap-2 mb-4">
                <Button variant="default" size="sm" className="flex-1 bg-violet-500 hover:bg-violet-600">
                  חודש נוכחי
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  חודש קודם
                </Button>
              </div>

              {/* Supplier List */}
              <div className="space-y-3">
                {supplierSummary.map((supplier, index) => {
                  const typeInfo = supplierTypeIcons[supplier.type] || supplierTypeIcons.variable;
                  const Icon = typeInfo.icon;
                  return (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${typeInfo.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{supplier.name}</p>
                          <p className="text-xs text-muted-foreground">{typeInfo.label}</p>
                        </div>
                      </div>
                      <p className="font-bold text-foreground">₪{supplier.amount.toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>

              <Button 
                variant="link" 
                className="w-full mt-4 text-violet-600"
                onClick={() => navigate("/admin/suppliers")}
              >
                חשבוניות החודש ←
              </Button>
            </Card>
          </motion.div>

          {/* Yearly Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-5 bg-white border-none shadow-lg rounded-2xl">
              <h3 className="text-lg font-bold text-foreground mb-4">סיכום שנתי</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={yearlyData}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4ECDC4" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#4ECDC4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'white', 
                        border: 'none', 
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }} 
                    />
                    <Area type="monotone" dataKey="income" stroke="#4ECDC4" fillOpacity={1} fill="url(#colorIncome)" name="הכנסות" />
                    <Area type="monotone" dataKey="expenses" stroke="#FF6B6B" fillOpacity={1} fill="url(#colorExpenses)" name="הוצאות" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2 border-violet-200 hover:bg-violet-50"
              onClick={() => navigate("/admin/suppliers")}
            >
              <Building2 className="w-6 h-6 text-violet-600" />
              <span>ניהול ספקים</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2 border-orange-200 hover:bg-orange-50"
              onClick={() => navigate("/admin/debts")}
            >
              <CreditCard className="w-6 h-6 text-orange-600" />
              <span>חובות לקוחות</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFinancial;
