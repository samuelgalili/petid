import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Bot, 
  MessageCircle, 
  Users, 
  BarChart3, 
  Brain, 
  Plug, 
  Settings, 
  Workflow,
  CheckCircle2,
  Clock,
  TrendingUp,
  Zap,
  Globe,
  ThumbsUp,
  UserPlus,
  ArrowUpRight,
  Activity,
  Sparkles
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStatCard, AdminSectionCard } from "@/components/admin/AdminStyles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// Sub-pages imports
import AIConversations from "@/components/admin/ai-service/AIConversations";
import AIAutomation from "@/components/admin/ai-service/AIAutomation";
import AICustomers from "@/components/admin/ai-service/AICustomers";
import AIAnalytics from "@/components/admin/ai-service/AIAnalytics";
import AITraining from "@/components/admin/ai-service/AITraining";
import AIIntegrations from "@/components/admin/ai-service/AIIntegrations";
import AISettings from "@/components/admin/ai-service/AISettings";
import AIAgentInbox from "@/components/admin/ai-service/AIAgentInbox";

const AdminAIService = () => {
  const [activeTab, setActiveTab] = useState("home");

  // Mock data for demo
  const stats = {
    totalConversations: 2847,
    resolvedByAI: 2156,
    avgResponseTime: "12 שניות",
    satisfaction: 94.5,
    leadsGenerated: 342,
    conversionRate: 18.5,
    activeAgents: 3,
    pendingHandoff: 8
  };

  const recentConversations = [
    { id: 1, customer: "שרה לוי", message: "מתי ההזמנה שלי תגיע?", status: "resolved", time: "לפני 2 דקות", channel: "whatsapp" },
    { id: 2, customer: "דניאל כהן", message: "אני מעוניין במבצע השבועי", status: "active", time: "לפני 5 דקות", channel: "web" },
    { id: 3, customer: "מיכל אברהם", message: "יש בעיה עם המוצר שקיבלתי", status: "handoff", time: "לפני 8 דקות", channel: "facebook" },
    { id: 4, customer: "יוסי רוזנברג", message: "מה שעות הפעילות שלכם?", status: "resolved", time: "לפני 12 דקות", channel: "instagram" },
  ];

  const channelStats = [
    { name: "WhatsApp", count: 1247, percentage: 44, color: "bg-emerald-500" },
    { name: "Web Chat", count: 892, percentage: 31, color: "bg-blue-500" },
    { name: "Facebook", count: 456, percentage: 16, color: "bg-indigo-500" },
    { name: "Instagram", count: 252, percentage: 9, color: "bg-pink-500" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved": return "bg-emerald-500/10 text-emerald-600";
      case "active": return "bg-blue-500/10 text-blue-600";
      case "handoff": return "bg-amber-500/10 text-amber-600";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "whatsapp": return "📱";
      case "web": return "💻";
      case "facebook": return "📘";
      case "instagram": return "📸";
      default: return "💬";
    }
  };

  return (
    <AdminLayout title="שירות לקוחות AI" icon={Bot}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Navigation Tabs */}
        <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-1.5">
          <TabsList className="grid grid-cols-4 lg:grid-cols-9 gap-1 bg-transparent h-auto">
            {[
              { value: "home", label: "סקירה כללית", icon: BarChart3 },
              { value: "conversations", label: "שיחות", icon: MessageCircle },
              { value: "automation", label: "אוטומציה", icon: Workflow },
              { value: "customers", label: "לקוחות", icon: Users },
              { value: "analytics", label: "אנליטיקות", icon: TrendingUp },
              { value: "training", label: "אימון AI", icon: Brain },
              { value: "inbox", label: "תיבת נכנסות", icon: Zap },
              { value: "integrations", label: "אינטגרציות", icon: Plug },
              { value: "settings", label: "הגדרות", icon: Settings },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                  "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/50"
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden lg:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Home / Overview Tab */}
        <TabsContent value="home" className="space-y-6">
          {/* AI Status Banner */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-background">
                    <Activity className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold">AI Agent פעיל</h2>
                    <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                      24/7 זמין
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    מערכת ה-AI מטפלת ב-{stats.resolvedByAI} שיחות אוטומטית • חיסכון משוער: ₪12,450 החודש
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-3">
                <Button variant="outline" className="gap-2">
                  <Settings className="w-4 h-4" />
                  הגדרות
                </Button>
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <Sparkles className="w-4 h-4" />
                  שפר ביצועים
                </Button>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          </motion.div>

          {/* KPI Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminStatCard
              title="סה״כ שיחות"
              value={stats.totalConversations.toLocaleString()}
              icon={MessageCircle}
              color="primary"
              trend={{ value: "12%", isPositive: true }}
              sparkline={[45, 52, 48, 61, 58, 67, 72]}
            />
            <AdminStatCard
              title="נפתרו ע״י AI"
              value={`${((stats.resolvedByAI / stats.totalConversations) * 100).toFixed(0)}%`}
              subtitle={`${stats.resolvedByAI.toLocaleString()} שיחות`}
              icon={CheckCircle2}
              color="success"
              trend={{ value: "8%", isPositive: true }}
            />
            <AdminStatCard
              title="זמן תגובה ממוצע"
              value={stats.avgResponseTime}
              icon={Clock}
              color="info"
              trend={{ value: "23%", isPositive: true }}
            />
            <AdminStatCard
              title="שביעות רצון"
              value={`${stats.satisfaction}%`}
              icon={ThumbsUp}
              color="purple"
              trend={{ value: "3%", isPositive: true }}
            />
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminStatCard
              title="לידים שנוצרו"
              value={stats.leadsGenerated}
              icon={UserPlus}
              color="cyan"
              trend={{ value: "15%", isPositive: true }}
            />
            <AdminStatCard
              title="אחוז המרה"
              value={`${stats.conversionRate}%`}
              icon={TrendingUp}
              color="success"
              trend={{ value: "5%", isPositive: true }}
            />
            <AdminStatCard
              title="נציגים פעילים"
              value={stats.activeAgents}
              icon={Users}
              color="orange"
            />
            <AdminStatCard
              title="ממתין להעברה"
              value={stats.pendingHandoff}
              icon={Zap}
              color="warning"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Conversations */}
            <div className="lg:col-span-2">
              <AdminSectionCard
                title="שיחות אחרונות"
                icon={MessageCircle}
                actions={
                  <Button variant="ghost" size="sm" className="gap-1 text-primary">
                    צפה בהכל
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                }
              >
                <ScrollArea className="h-[320px]">
                  <div className="space-y-3">
                    {recentConversations.map((conv) => (
                      <motion.div
                        key={conv.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {conv.customer.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-sm">{conv.customer}</span>
                            <span className="text-lg">{getChannelIcon(conv.channel)}</span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{conv.message}</p>
                        </div>
                        <div className="text-left shrink-0">
                          <Badge className={cn("mb-1", getStatusColor(conv.status))}>
                            {conv.status === "resolved" ? "נפתר" : conv.status === "active" ? "פעיל" : "העברה"}
                          </Badge>
                          <p className="text-xs text-muted-foreground">{conv.time}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </AdminSectionCard>
            </div>

            {/* Channel Distribution */}
            <AdminSectionCard title="התפלגות ערוצים" icon={Globe}>
              <div className="space-y-4">
                {channelStats.map((channel) => (
                  <div key={channel.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{channel.name}</span>
                      <span className="text-muted-foreground">{channel.count.toLocaleString()} ({channel.percentage}%)</span>
                    </div>
                    <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${channel.percentage}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className={cn("h-full rounded-full", channel.color)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">קיבולת AI</span>
                  <span className="font-medium">76%</span>
                </div>
                <Progress value={76} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  המערכת יכולה לטפל ב-24% נוספים
                </p>
              </div>
            </AdminSectionCard>
          </div>

          {/* Quick Actions */}
          <Card className="border-dashed border-2">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-3 justify-center">
                <Button variant="outline" className="gap-2" onClick={() => setActiveTab("training")}>
                  <Brain className="w-4 h-4" />
                  אמן את ה-AI
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setActiveTab("automation")}>
                  <Workflow className="w-4 h-4" />
                  צור תהליך חדש
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setActiveTab("integrations")}>
                  <Plug className="w-4 h-4" />
                  חבר ערוץ חדש
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setActiveTab("analytics")}>
                  <BarChart3 className="w-4 h-4" />
                  צפה בדוחות
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other Tabs */}
        <TabsContent value="conversations">
          <AIConversations />
        </TabsContent>

        <TabsContent value="automation">
          <AIAutomation />
        </TabsContent>

        <TabsContent value="customers">
          <AICustomers />
        </TabsContent>

        <TabsContent value="analytics">
          <AIAnalytics />
        </TabsContent>

        <TabsContent value="training">
          <AITraining />
        </TabsContent>

        <TabsContent value="inbox">
          <AIAgentInbox />
        </TabsContent>

        <TabsContent value="integrations">
          <AIIntegrations />
        </TabsContent>

        <TabsContent value="settings">
          <AISettings />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminAIService;
