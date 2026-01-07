import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Users,
  MessageCircle,
  Clock,
  ThumbsUp,
  Bot,
  UserCircle,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminStatCard, AdminSectionCard } from "@/components/admin/AdminStyles";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";

const conversationData = [
  { day: "ראשון", total: 120, ai: 95, human: 25 },
  { day: "שני", total: 145, ai: 118, human: 27 },
  { day: "שלישי", total: 132, ai: 105, human: 27 },
  { day: "רביעי", total: 158, ai: 130, human: 28 },
  { day: "חמישי", total: 167, ai: 142, human: 25 },
  { day: "שישי", total: 89, ai: 72, human: 17 },
  { day: "שבת", total: 45, ai: 38, human: 7 },
];

const responseTimeData = [
  { hour: "06:00", time: 8 },
  { hour: "08:00", time: 12 },
  { hour: "10:00", time: 15 },
  { hour: "12:00", time: 18 },
  { hour: "14:00", time: 14 },
  { hour: "16:00", time: 16 },
  { hour: "18:00", time: 20 },
  { hour: "20:00", time: 10 },
  { hour: "22:00", time: 6 },
];

const channelDistribution = [
  { name: "WhatsApp", value: 44, color: "#22c55e" },
  { name: "Web Chat", value: 31, color: "#3b82f6" },
  { name: "Facebook", value: 16, color: "#6366f1" },
  { name: "Instagram", value: 9, color: "#ec4899" },
];

const satisfactionData = [
  { rating: "5 ⭐", count: 456, percentage: 45 },
  { rating: "4 ⭐", count: 312, percentage: 31 },
  { rating: "3 ⭐", count: 156, percentage: 15 },
  { rating: "2 ⭐", count: 58, percentage: 6 },
  { rating: "1 ⭐", count: 28, percentage: 3 },
];

const AIAnalytics = () => {
  const [period, setPeriod] = useState("week");

  const chartConfig = {
    total: { label: "סה״כ", color: "hsl(var(--primary))" },
    ai: { label: "AI", color: "#22c55e" },
    human: { label: "נציג", color: "#3b82f6" },
    time: { label: "שניות", color: "hsl(var(--primary))" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">אנליטיקות שירות לקוחות</h2>
          <p className="text-muted-foreground text-sm">ניתוח ביצועי מערכת ה-AI ושביעות רצון לקוחות</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">היום</SelectItem>
              <SelectItem value="week">שבוע אחרון</SelectItem>
              <SelectItem value="month">חודש אחרון</SelectItem>
              <SelectItem value="year">שנה אחרונה</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            ייצוא דוח
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          title="סה״כ שיחות"
          value="2,847"
          icon={MessageCircle}
          color="primary"
          trend={{ value: "12%", isPositive: true }}
        />
        <AdminStatCard
          title="פתרון ע״י AI"
          value="76%"
          subtitle="2,163 שיחות"
          icon={Bot}
          color="success"
          trend={{ value: "8%", isPositive: true }}
        />
        <AdminStatCard
          title="זמן תגובה ממוצע"
          value="12 שניות"
          icon={Clock}
          color="info"
          trend={{ value: "23%", isPositive: true }}
        />
        <AdminStatCard
          title="שביעות רצון"
          value="4.2 / 5"
          icon={ThumbsUp}
          color="purple"
          trend={{ value: "3%", isPositive: true }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Conversations Chart */}
        <AdminSectionCard title="שיחות לפי יום" icon={BarChart3}>
          <div className="h-[280px]">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <AreaChart data={conversationData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="ai"
                  stackId="1"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.6}
                  name="AI"
                />
                <Area
                  type="monotone"
                  dataKey="human"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                  name="נציג"
                />
              </AreaChart>
            </ChartContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>AI</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>נציג</span>
            </div>
          </div>
        </AdminSectionCard>

        {/* Response Time Chart */}
        <AdminSectionCard title="זמן תגובה לפי שעה" icon={Clock}>
          <div className="h-[280px]">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hour" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="time"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  name="שניות"
                />
              </BarChart>
            </ChartContainer>
          </div>
        </AdminSectionCard>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Channel Distribution */}
        <AdminSectionCard title="התפלגות ערוצים" icon={MessageCircle}>
          <div className="h-[200px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {channelDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {channelDistribution.map((channel) => (
              <div key={channel.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: channel.color }}
                  />
                  <span>{channel.name}</span>
                </div>
                <span className="text-muted-foreground">{channel.value}%</span>
              </div>
            ))}
          </div>
        </AdminSectionCard>

        {/* Satisfaction Distribution */}
        <AdminSectionCard title="התפלגות שביעות רצון" icon={ThumbsUp}>
          <div className="space-y-3">
            {satisfactionData.map((item) => (
              <div key={item.rating} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.rating}</span>
                  <span className="text-muted-foreground">{item.count} ({item.percentage}%)</span>
                </div>
                <Progress value={item.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </AdminSectionCard>

        {/* AI vs Human Stats */}
        <AdminSectionCard title="AI לעומת נציג" icon={Bot}>
          <div className="space-y-6">
            <div className="text-center p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Bot className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-emerald-600">76%</p>
              <p className="text-sm text-muted-foreground">נפתרו ע״י AI</p>
              <div className="flex items-center justify-center gap-1 mt-2 text-emerald-600 text-xs">
                <ArrowUpRight className="w-3 h-3" />
                <span>8% מהחודש הקודם</span>
              </div>
            </div>
            
            <div className="text-center p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <UserCircle className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-blue-600">24%</p>
              <p className="text-sm text-muted-foreground">הועברו לנציג</p>
              <div className="flex items-center justify-center gap-1 mt-2 text-blue-600 text-xs">
                <ArrowDownRight className="w-3 h-3" />
                <span>8% מהחודש הקודם</span>
              </div>
            </div>
          </div>
        </AdminSectionCard>
      </div>
    </div>
  );
};

export default AIAnalytics;
