import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AIContentGenerator } from "@/components/admin/AIContentGenerator";
import { 
  AdminStatCard, 
  AdminStatsGrid, 
  AdminToolbar,
  AdminStatusBadge,
  AdminSectionCard,
} from "@/components/admin/AdminStyles";
import { 
  Megaphone, 
  Plus, 
  Mail,
  MessageSquare,
  Users,
  Send,
  Clock,
  BarChart3,
  Target,
  Zap,
  Sparkles,
  Eye,
} from "lucide-react";
import { motion } from "framer-motion";

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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email": return <Mail className="w-4 h-4" />;
      case "sms": return <MessageSquare className="w-4 h-4" />;
      case "push": return <Megaphone className="w-4 h-4" />;
      default: return <Send className="w-4 h-4" />;
    }
  };

  const getStatusType = (status: string): "draft" | "scheduled" | "active" | "success" => {
    const map: Record<string, "draft" | "scheduled" | "active" | "success"> = {
      draft: "draft",
      scheduled: "scheduled",
      active: "active",
      sent: "success",
    };
    return map[status] || "draft";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: "טיוטה",
      scheduled: "מתוזמן",
      active: "פעיל",
      sent: "נשלח",
    };
    return labels[status] || status;
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (campaignTypeFilter === "all") return true;
    return c.type === campaignTypeFilter;
  });

  const activeCampaigns = campaigns.filter(c => c.status === "active" || c.status === "scheduled").length;
  const sentCampaigns = campaigns.filter(c => c.status === "sent").length;
  const totalRecipients = campaigns.reduce((acc, c) => acc + c.recipients, 0);
  const avgOpenRate = Math.round(
    campaigns.filter(c => c.openRate).reduce((acc, c) => acc + (c.openRate || 0), 0) / 
    (campaigns.filter(c => c.openRate).length || 1)
  );

  return (
    <AdminLayout title="שיווק ותוכן" icon={Megaphone}>
      <div className="space-y-6">
        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
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
            <AdminStatsGrid>
              <AdminStatCard
                title="קמפיינים פעילים"
                value={activeCampaigns}
                icon={Zap}
                color="purple"
              />
              <AdminStatCard
                title="נשלחו החודש"
                value={sentCampaigns}
                icon={Send}
                color="success"
              />
              <AdminStatCard
                title="סה״כ נמענים"
                value={totalRecipients.toLocaleString()}
                icon={Users}
                color="orange"
              />
              <AdminStatCard
                title="אחוז פתיחה ממוצע"
                value={`${avgOpenRate}%`}
                icon={BarChart3}
                color="info"
              />
            </AdminStatsGrid>

            {/* Toolbar */}
            <AdminToolbar
              onAdd={() => setIsDialogOpen(true)}
              addLabel="קמפיין חדש"
            >
              <Tabs value={campaignTypeFilter} onValueChange={setCampaignTypeFilter}>
                <TabsList>
                  <TabsTrigger value="all">הכל</TabsTrigger>
                  <TabsTrigger value="email">אימייל</TabsTrigger>
                  <TabsTrigger value="sms">SMS</TabsTrigger>
                  <TabsTrigger value="push">Push</TabsTrigger>
                </TabsList>
              </Tabs>
            </AdminToolbar>

            {/* New Campaign Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent dir="rtl">
                <DialogHeader>
                  <DialogTitle>יצירת קמפיין חדש</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>שם הקמפיין</Label>
                    <Input placeholder="מבצע חורף..." />
                  </div>
                  <div>
                    <Label>סוג</Label>
                    <Select>
                      <SelectTrigger>
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
                    <Label>קהל יעד</Label>
                    <Select>
                      <SelectTrigger>
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
                    <Label>תוכן ההודעה</Label>
                    <Textarea 
                      className="min-h-[100px]"
                      placeholder="כתוב את תוכן ההודעה..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      שמור כטיוטה
                    </Button>
                    <Button className="flex-1 gap-2">
                      <Send className="w-4 h-4" />
                      שלח עכשיו
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Campaigns List */}
            <AdminSectionCard
              title={`קמפיינים (${filteredCampaigns.length})`}
              icon={Target}
            >
              <div className="divide-y">
                {filteredCampaigns.map((campaign, index) => (
                  <motion.div 
                    key={campaign.id} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          {getTypeIcon(campaign.type)}
                        </div>
                        <div>
                          <h3 className="font-medium">{campaign.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <AdminStatusBadge 
                              status={getStatusType(campaign.status)} 
                              label={getStatusLabel(campaign.status)} 
                            />
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {campaign.recipients.toLocaleString()} נמענים
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {campaign.openRate !== undefined && (
                          <div className="text-center">
                            <p className="text-lg font-bold text-emerald-600">{campaign.openRate}%</p>
                            <p className="text-xs text-muted-foreground">פתיחה</p>
                          </div>
                        )}
                        {campaign.clickRate !== undefined && (
                          <div className="text-center">
                            <p className="text-lg font-bold text-primary">{campaign.clickRate}%</p>
                            <p className="text-xs text-muted-foreground">הקלקה</p>
                          </div>
                        )}
                        <Button size="sm" variant="outline" className="gap-2">
                          <Eye className="w-4 h-4" />
                          צפה
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AdminSectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminMarketing;
