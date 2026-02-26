import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Plug, CreditCard, Mail, Truck, BarChart3, Shield, Settings,
  CheckCircle, AlertTriangle, Loader2
} from "lucide-react";

const categoryIcons: Record<string, any> = {
  payment: CreditCard, shipping: Truck, marketing: Mail, analytics: BarChart3, security: Shield,
};

const AdminIntegrations = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["system-integrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_integrations")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("system_integrations")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-integrations"] });
      toast.success("סטטוס עודכן");
    },
  });

  const categories = [
    { id: "all", label: "הכל", icon: Plug },
    { id: "payment", label: "תשלומים", icon: CreditCard },
    { id: "shipping", label: "משלוחים", icon: Truck },
    { id: "marketing", label: "שיווק", icon: Mail },
    { id: "analytics", label: "אנליטיקה", icon: BarChart3 },
    { id: "security", label: "אבטחה", icon: Shield },
  ];

  const filtered = integrations.filter((i: any) => selectedCategory === "all" || i.category === selectedCategory);
  const connectedCount = integrations.filter((i: any) => i.is_connected).length;
  const activeCount = integrations.filter((i: any) => i.is_active).length;

  const stats = [
    { title: "סה״כ", value: integrations.length, icon: Plug, gradient: "from-violet-500 to-purple-600" },
    { title: "מחוברות", value: connectedCount, icon: CheckCircle, gradient: "from-emerald-500 to-green-600" },
    { title: "פעילות", value: activeCount, icon: Settings, gradient: "from-blue-500 to-cyan-600" },
    { title: "דורשות הגדרה", value: integrations.filter((i: any) => !i.is_connected).length, icon: AlertTriangle, gradient: "from-amber-500 to-orange-600" },
  ];

  return (
    <AdminLayout title="אינטגרציות" icon={Plug}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={i} className="relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-[0.07]`} />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Button key={cat.id} variant={selectedCategory === cat.id ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat.id)}>
                  <cat.icon className="w-4 h-4 ml-2" />{cat.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">אין אינטגרציות. הוסף אינטגרציות דרך מסד הנתונים.</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((integration: any) => (
              <Card key={integration.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{integration.icon}</div>
                      <div>
                        <h3 className="font-bold text-foreground">{integration.name}</h3>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={integration.is_connected ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}>
                        {integration.is_connected ? "מחובר" : "לא מחובר"}
                      </Badge>
                      {integration.is_active && <Badge className="bg-blue-500/10 text-blue-600">פעיל</Badge>}
                    </div>
                    {integration.is_connected && (
                      <Switch checked={integration.is_active} onCheckedChange={(checked) => toggleActive.mutate({ id: integration.id, is_active: checked })} />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminIntegrations;
