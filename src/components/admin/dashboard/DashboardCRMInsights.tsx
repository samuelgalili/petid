/**
 * DashboardCRMInsights — Customer LTV, segmentation, churn prediction, interaction history.
 * Items 6-10 of admin enhancement plan.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Crown,
  AlertCircle,
  Clock,
  Heart,
  ShoppingBag,
  MessageSquare,
  CalendarDays,
  Loader2,
  TrendingDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface CustomerSegment {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
}

interface TopCustomer {
  id: string;
  name: string;
  totalSpent: number;
  orderCount: number;
}

interface ChurnRisk {
  id: string;
  name: string;
  lastOrderDays: number;
}

interface UpcomingReminder {
  id: string;
  title: string;
  due_date: string;
  priority: string;
}

export const DashboardCRMInsights = () => {
  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [churnRisks, setChurnRisks] = useState<ChurnRisk[]>([]);
  const [reminders, setReminders] = useState<UpcomingReminder[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [avgLTV, setAvgLTV] = useState(0);

  useEffect(() => {
    fetchCRMData();
  }, []);

  const fetchCRMData = async () => {
    try {
      setLoading(true);

      const [ordersRes, profilesRes, remindersRes, activitiesRes] = await Promise.all([
        supabase.from("orders").select("user_id, total, order_date, customer_name").order("order_date", { ascending: false }),
        supabase.from("profiles").select("id, full_name, created_at").limit(500),
        supabase.from("customer_reminders").select("id, title, due_date, priority, status").eq("status", "pending").order("due_date", { ascending: true }).limit(5),
        supabase.from("crm_activities").select("id, activity_type, subject, created_at").order("created_at", { ascending: false }).limit(10),
      ]);

      const orders = ordersRes.data || [];
      const profiles = profilesRes.data || [];

      setTotalCustomers(profiles.length);
      setReminders((remindersRes.data || []) as UpcomingReminder[]);

      // Build customer spend map
      const customerMap = new Map<string, { name: string; total: number; count: number; lastOrder: Date }>();
      orders.forEach((o) => {
        const existing = customerMap.get(o.user_id) || {
          name: o.customer_name || "Unknown",
          total: 0,
          count: 0,
          lastOrder: new Date(0),
        };
        existing.total += parseFloat(o.total?.toString() || "0");
        existing.count += 1;
        const orderDate = new Date(o.order_date);
        if (orderDate > existing.lastOrder) existing.lastOrder = orderDate;
        existing.name = o.customer_name || existing.name;
        customerMap.set(o.user_id, existing);
      });

      const customers = Array.from(customerMap.entries());

      // Top 5 by LTV
      const sorted = [...customers].sort((a, b) => b[1].total - a[1].total);
      setTopCustomers(
        sorted.slice(0, 5).map(([id, data]) => ({
          id,
          name: data.name,
          totalSpent: data.total,
          orderCount: data.count,
        }))
      );

      // Average LTV
      const totalLTV = customers.reduce((sum, [, d]) => sum + d.total, 0);
      setAvgLTV(customers.length > 0 ? totalLTV / customers.length : 0);

      // Segmentation
      const now = Date.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const sixtyDays = 60 * 24 * 60 * 60 * 1000;

      const vip = customers.filter(([, d]) => d.total > 500).length;
      const active = customers.filter(([, d]) => now - d.lastOrder.getTime() < thirtyDays).length;
      const atRisk = customers.filter(([, d]) => {
        const daysSince = now - d.lastOrder.getTime();
        return daysSince > thirtyDays && daysSince < sixtyDays;
      }).length;
      const churned = customers.filter(([, d]) => now - d.lastOrder.getTime() > sixtyDays).length;

      setSegments([
        { label: "VIP (₪500+)", count: vip, icon: <Crown className="w-4 h-4" />, color: "text-amber-500" },
        { label: "Active (30d)", count: active, icon: <Heart className="w-4 h-4" />, color: "text-emerald-500" },
        { label: "At Risk (30-60d)", count: atRisk, icon: <AlertCircle className="w-4 h-4" />, color: "text-amber-500" },
        { label: "Churned (60d+)", count: churned, icon: <TrendingDown className="w-4 h-4" />, color: "text-red-500" },
      ]);

      // Churn risks
      const risks = customers
        .filter(([, d]) => {
          const daysSince = (now - d.lastOrder.getTime()) / (24 * 60 * 60 * 1000);
          return daysSince > 45;
        })
        .map(([id, d]) => ({
          id,
          name: d.name,
          lastOrderDays: Math.round((now - d.lastOrder.getTime()) / (24 * 60 * 60 * 1000)),
        }))
        .sort((a, b) => b.lastOrderDays - a.lastOrderDays)
        .slice(0, 5);

      setChurnRisks(risks);
    } catch (err) {
      console.error("CRM insights error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <Users className="w-5 h-5 text-violet-500" />
        CRM & Customer Insights
      </h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-slate-200">
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 text-sky-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-800">{totalCustomers}</p>
            <p className="text-[10px] text-slate-500">Total Customers</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 text-center">
            <ShoppingBag className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-800">₪{avgLTV.toFixed(0)}</p>
            <p className="text-[10px] text-slate-500">Avg LTV</p>
          </CardContent>
        </Card>
      </div>

      {/* Segmentation */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Customer Segments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {segments.map((seg) => (
              <div key={seg.label} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                <span className={seg.color}>{seg.icon}</span>
                <div>
                  <p className="text-lg font-bold text-slate-800">{seg.count}</p>
                  <p className="text-[10px] text-slate-500">{seg.label}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Customers */}
      {topCustomers.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              Top Customers by LTV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topCustomers.map((c, idx) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                    idx === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                  )}>{idx + 1}</span>
                  <span className="text-slate-700 truncate">{c.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-[10px]">{c.orderCount} orders</Badge>
                  <span className="font-semibold text-slate-800 w-16 text-right">₪{c.totalSpent.toFixed(0)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Churn Risk */}
      {churnRisks.length > 0 && (
        <Card className="border-slate-200 border-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Churn Risk ({churnRisks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {churnRisks.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 truncate flex-1">{c.name}</span>
                <Badge className="text-[10px] bg-red-50 text-red-600 border-0">
                  {c.lastOrderDays}d ago
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Reminders */}
      {reminders.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-sky-500" />
              Upcoming Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reminders.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 truncate flex-1">{r.title}</span>
                <span className="text-xs text-slate-400">
                  {new Date(r.due_date).toLocaleDateString("he-IL")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
