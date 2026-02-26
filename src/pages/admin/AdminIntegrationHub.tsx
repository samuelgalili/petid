import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Plug, Shield, MessageCircle, CreditCard, Mail, Globe,
  Plus, Settings2, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

const serviceIcons: Record<string, React.ComponentType<any>> = {
  messaging: MessageCircle,
  payment: CreditCard,
  email: Mail,
  insurance: Shield,
  api: Globe,
};

const AdminIntegrationHub = () => {
  const [addDialog, setAddDialog] = useState(false);
  const [newService, setNewService] = useState({ service_name: "", service_type: "api" });
  const queryClient = useQueryClient();

  const { data: integrations = [] } = useQuery({
    queryKey: ["external-integrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("external_integrations")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const toggleIntegration = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("external_integrations")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-integrations"] });
      toast.success("סטטוס עודכן");
    },
  });

  const addIntegration = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("external_integrations")
        .insert(newService);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-integrations"] });
      toast.success("אינטגרציה נוספה");
      setAddDialog(false);
      setNewService({ service_name: "", service_type: "api" });
    },
  });

  return (
    <AdminLayout title="Integration Hub — ניהול אינטגרציות" icon={Plug}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {integrations.filter((i: any) => i.is_active).length} אינטגרציות פעילות
          </p>
          <Button onClick={() => setAddDialog(true)} className="gap-1.5" size="sm">
            <Plus className="w-4 h-4" /> הוסף אינטגרציה
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((intg: any) => {
            const Icon = serviceIcons[intg.service_type] || Globe;
            return (
              <Card key={intg.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{intg.service_name}</h3>
                      <p className="text-xs text-muted-foreground">{intg.service_type}</p>
                    </div>
                  </div>
                  <Switch
                    checked={intg.is_active}
                    onCheckedChange={(c) => toggleIntegration.mutate({ id: intg.id, is_active: c })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Badge
                    className={cn(
                      "text-[10px]",
                      intg.status === "configured"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-amber-500/10 text-amber-600"
                    )}
                  >
                    {intg.status === "configured" ? "מוגדר" : intg.status}
                  </Badge>
                  {intg.last_sync_at && (
                    <span className="text-[10px] text-muted-foreground">
                      סנכרון: {new Date(intg.last_sync_at).toLocaleDateString("he-IL")}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Add Dialog */}
        <Dialog open={addDialog} onOpenChange={setAddDialog}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>הוספת אינטגרציה חדשה</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="שם השירות (e.g. Insurance Partner)"
                value={newService.service_name}
                onChange={(e) => setNewService({ ...newService, service_name: e.target.value })}
              />
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newService.service_type}
                onChange={(e) => setNewService({ ...newService, service_type: e.target.value })}
              >
                <option value="api">API</option>
                <option value="messaging">Messaging</option>
                <option value="payment">Payment</option>
                <option value="email">Email</option>
                <option value="insurance">Insurance</option>
              </select>
              <Button
                className="w-full gap-1.5"
                onClick={() => addIntegration.mutate()}
                disabled={!newService.service_name || addIntegration.isPending}
              >
                <CheckCircle2 className="w-4 h-4" /> שמור
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminIntegrationHub;
