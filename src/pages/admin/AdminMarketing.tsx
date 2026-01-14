import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Trash2,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  recipients: number;
  open_rate?: number | null;
  click_rate?: number | null;
  scheduled_at?: string | null;
  sent_at?: string | null;
  content?: string | null;
  subject?: string | null;
  created_at: string;
}

const AdminMarketing = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("campaigns");
  const [campaignTypeFilter, setCampaignTypeFilter] = useState("all");
  
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    type: "email",
    content: "",
    subject: "",
    audience: "all",
  });

  // Fetch campaigns from database
  const { data: campaigns = [], isLoading, refetch } = useQuery({
    queryKey: ["marketing-campaigns"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("marketing_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return (data || []) as Campaign[];
    },
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (campaign: Partial<Campaign>) => {
      const { data, error } = await (supabase as any)
        .from("marketing_campaigns")
        .insert(campaign)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] });
      toast({ title: "הקמפיין נוצר בהצלחה" });
      setIsDialogOpen(false);
      setNewCampaign({ name: "", type: "email", content: "", subject: "", audience: "all" });
    },
    onError: () => {
      toast({ title: "שגיאה ביצירת הקמפיין", variant: "destructive" });
    },
  });

  // Delete campaign mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("marketing_campaigns")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] });
      toast({ title: "הקמפיין נמחק" });
    },
  });

  // Update campaign status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, sent_at }: { id: string; status: string; sent_at?: string }) => {
      const { error } = await (supabase as any)
        .from("marketing_campaigns")
        .update({ status, sent_at })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] });
      toast({ title: "הסטטוס עודכן" });
    },
  });

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
  const totalRecipients = campaigns.reduce((acc, c) => acc + (c.recipients || 0), 0);
  const avgOpenRate = Math.round(
    campaigns.filter(c => c.open_rate).reduce((acc, c) => acc + (c.open_rate || 0), 0) / 
    (campaigns.filter(c => c.open_rate).length || 1)
  );

  const handleCreateCampaign = (asDraft: boolean) => {
    createCampaignMutation.mutate({
      name: newCampaign.name,
      type: newCampaign.type,
      content: newCampaign.content,
      subject: newCampaign.subject,
      status: asDraft ? "draft" : "sent",
      recipients: newCampaign.audience === "all" ? 1500 : newCampaign.audience === "vip" ? 200 : 500,
      sent_at: asDraft ? null : new Date().toISOString(),
    });
  };

  const handleSendCampaign = (id: string) => {
    updateStatusMutation.mutate({ 
      id, 
      status: "sent", 
      sent_at: new Date().toISOString() 
    });
  };

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
              <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
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
                    <Input 
                      placeholder="מבצע חורף..." 
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>סוג</Label>
                    <Select value={newCampaign.type} onValueChange={(v) => setNewCampaign({ ...newCampaign, type: v })}>
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
                    <Select value={newCampaign.audience} onValueChange={(v) => setNewCampaign({ ...newCampaign, audience: v })}>
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
                  {newCampaign.type === "email" && (
                    <div>
                      <Label>נושא</Label>
                      <Input 
                        placeholder="נושא האימייל..."
                        value={newCampaign.subject}
                        onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                      />
                    </div>
                  )}
                  <div>
                    <Label>תוכן ההודעה</Label>
                    <Textarea 
                      className="min-h-[100px]"
                      placeholder="כתוב את תוכן ההודעה..."
                      value={newCampaign.content}
                      onChange={(e) => setNewCampaign({ ...newCampaign, content: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleCreateCampaign(true)}
                      disabled={!newCampaign.name || createCampaignMutation.isPending}
                    >
                      שמור כטיוטה
                    </Button>
                    <Button 
                      className="flex-1 gap-2"
                      onClick={() => handleCreateCampaign(false)}
                      disabled={!newCampaign.name || createCampaignMutation.isPending}
                    >
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
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  טוען...
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  אין קמפיינים עדיין. צור קמפיין חדש!
                </div>
              ) : (
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
                                {(campaign.recipients || 0).toLocaleString()} נמענים
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {campaign.open_rate !== undefined && campaign.open_rate !== null && (
                            <div className="text-center">
                              <p className="text-lg font-bold text-emerald-600">{campaign.open_rate}%</p>
                              <p className="text-xs text-muted-foreground">פתיחה</p>
                            </div>
                          )}
                          {campaign.click_rate !== undefined && campaign.click_rate !== null && (
                            <div className="text-center">
                              <p className="text-lg font-bold text-primary">{campaign.click_rate}%</p>
                              <p className="text-xs text-muted-foreground">הקלקה</p>
                            </div>
                          )}
                          <div className="flex gap-2">
                            {campaign.status === "draft" && (
                              <Button 
                                size="sm" 
                                className="gap-2"
                                onClick={() => handleSendCampaign(campaign.id)}
                              >
                                <Send className="w-4 h-4" />
                                שלח
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="gap-2">
                              <Eye className="w-4 h-4" />
                              צפה
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-destructive"
                              onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AdminSectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminMarketing;