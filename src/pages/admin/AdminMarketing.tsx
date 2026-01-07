import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AIContentGenerator from "@/components/admin/AIContentGenerator";
import { 
  Megaphone, 
  Plus, 
  Mail,
  MessageSquare,
  Users,
  Send,
  Clock,
  CheckCircle,
  BarChart3,
  Target,
  Zap,
  Sparkles
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  type: "email" | "sms" | "push";
  status: "draft" | "scheduled" | "sent" | "active";
  recipients: number;
  openRate?: number;
  clickRate?: number;
  scheduledAt?: string;
  sentAt?: string;
}

const mockCampaigns: Campaign[] = [
  { id: "1", name: "מבצע קיץ - 20% הנחה", type: "email", status: "sent", recipients: 1500, openRate: 45, clickRate: 12, sentAt: "2024-01-05" },
  { id: "2", name: "תזכורת עגלה נטושה", type: "sms", status: "active", recipients: 234 },
  { id: "3", name: "השקת מוצר חדש", type: "push", status: "scheduled", recipients: 3200, scheduledAt: "2024-01-10" },
  { id: "4", name: "הטבה ללקוחות VIP", type: "email", status: "draft", recipients: 0 },
];

const AdminMarketing = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("campaigns");
  const [campaignTypeFilter, setCampaignTypeFilter] = useState("all");

  const stats = [
    {
      title: "קמפיינים פעילים",
      value: campaigns.filter(c => c.status === "active" || c.status === "scheduled").length,
      icon: Zap,
      gradient: "from-violet-500 to-purple-600",
    },
    {
      title: "נשלחו החודש",
      value: campaigns.filter(c => c.status === "sent").length,
      icon: Send,
      gradient: "from-emerald-500 to-green-600",
    },
    {
      title: "סה״כ נמענים",
      value: campaigns.reduce((acc, c) => acc + c.recipients, 0).toLocaleString(),
      icon: Users,
      gradient: "from-amber-500 to-orange-600",
    },
    {
      title: "אחוז פתיחה ממוצע",
      value: `${Math.round(campaigns.filter(c => c.openRate).reduce((acc, c) => acc + (c.openRate || 0), 0) / campaigns.filter(c => c.openRate).length || 0)}%`,
      icon: BarChart3,
      gradient: "from-blue-500 to-cyan-600",
    },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email": return <Mail className="w-4 h-4" />;
      case "sms": return <MessageSquare className="w-4 h-4" />;
      case "push": return <Megaphone className="w-4 h-4" />;
      default: return <Send className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-slate-500/20 text-slate-400 border-slate-500/30",
      scheduled: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      sent: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    };
    const labels: Record<string, string> = {
      draft: "טיוטה",
      scheduled: "מתוזמן",
      active: "פעיל",
      sent: "נשלח",
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (campaignTypeFilter === "all") return true;
    return c.type === campaignTypeFilter;
  });

  return (
    <AdminLayout title="שיווק ותוכן" icon={Megaphone}>
      <div className="space-y-6">
        {/* Main Tabs - Campaigns vs AI Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800/50">
            <TabsTrigger value="campaigns" className="gap-2">
              <Target className="w-4 h-4" />
              קמפיינים
            </TabsTrigger>
            <TabsTrigger value="ai-content" className="gap-2">
              <Sparkles className="w-4 h-4" />
              יצירת תוכן AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai-content" className="mt-6">
            <AIContentGenerator />
          </TabsContent>

          <TabsContent value="campaigns" className="mt-6 space-y-6">
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

        {/* Campaign Type Filter & Actions */}
        <Card className="border-0 bg-gradient-to-br from-slate-900 to-slate-800">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <Tabs value={campaignTypeFilter} onValueChange={setCampaignTypeFilter} className="w-full sm:w-auto">
                <TabsList className="bg-slate-800/50">
                  <TabsTrigger value="all">הכל</TabsTrigger>
                  <TabsTrigger value="email">אימייל</TabsTrigger>
                  <TabsTrigger value="sms">SMS</TabsTrigger>
                  <TabsTrigger value="push">Push</TabsTrigger>
                </TabsList>
              </Tabs>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
                    <Plus className="w-4 h-4 ml-2" />
                    קמפיין חדש
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">יצירת קמפיין חדש</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label className="text-slate-300">שם הקמפיין</Label>
                      <Input className="bg-slate-800 border-slate-700 text-white" placeholder="מבצע חורף..." />
                    </div>
                    <div>
                      <Label className="text-slate-300">סוג</Label>
                      <Select>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue placeholder="בחר סוג" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">אימייל</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="push">Push Notification</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">קהל יעד</Label>
                      <Select>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue placeholder="בחר קהל" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">כל הלקוחות</SelectItem>
                          <SelectItem value="vip">לקוחות VIP</SelectItem>
                          <SelectItem value="new">לקוחות חדשים</SelectItem>
                          <SelectItem value="inactive">לקוחות לא פעילים</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">תוכן ההודעה</Label>
                      <Textarea 
                        className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                        placeholder="כתוב את תוכן ההודעה..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 border-slate-700 text-slate-300">
                        שמור כטיוטה
                      </Button>
                      <Button className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600">
                        <Send className="w-4 h-4 ml-2" />
                        שלח עכשיו
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Campaigns List */}
        <Card className="border-0 bg-gradient-to-br from-slate-900 to-slate-800">
          <CardHeader className="border-b border-slate-700/50">
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-400" />
              קמפיינים ({filteredCampaigns.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-700/50">
              {filteredCampaigns.map((campaign) => (
                <div key={campaign.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        {getTypeIcon(campaign.type)}
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{campaign.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(campaign.status)}
                          <span className="text-xs text-slate-400">
                            <Users className="w-3 h-3 inline ml-1" />
                            {campaign.recipients.toLocaleString()} נמענים
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {campaign.openRate && (
                        <div className="text-center">
                          <p className="text-lg font-bold text-emerald-400">{campaign.openRate}%</p>
                          <p className="text-xs text-slate-400">פתיחה</p>
                        </div>
                      )}
                      {campaign.clickRate && (
                        <div className="text-center">
                          <p className="text-lg font-bold text-violet-400">{campaign.clickRate}%</p>
                          <p className="text-xs text-slate-400">הקלקה</p>
                        </div>
                      )}
                      <Button size="sm" variant="outline" className="border-slate-700 text-slate-300">
                        צפה
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminMarketing;