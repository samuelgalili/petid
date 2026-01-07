import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Truck, 
  Search, 
  Package,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Settings,
  Plus,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface ShippingProvider {
  id: string;
  name: string;
  logo: string;
  isActive: boolean;
  defaultPrice: number;
  estimatedDays: string;
}

const mockProviders: ShippingProvider[] = [
  { id: "1", name: "דואר ישראל", logo: "📮", isActive: true, defaultPrice: 25, estimatedDays: "3-5" },
  { id: "2", name: "שליחים עד הבית", logo: "🚚", isActive: true, defaultPrice: 35, estimatedDays: "1-2" },
  { id: "3", name: "Box-It", logo: "📦", isActive: false, defaultPrice: 20, estimatedDays: "2-4" },
  { id: "4", name: "חברת שליחויות מהירה", logo: "⚡", isActive: true, defaultPrice: 50, estimatedDays: "Same day" },
];

const AdminShipping = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("orders");
  const [providers, setProviders] = useState(mockProviders);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["shipping-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const pendingShipments = orders?.filter(o => o.status === "pending" || o.status === "processing").length || 0;
  const inTransit = orders?.filter(o => o.status === "shipped").length || 0;
  const delivered = orders?.filter(o => o.status === "delivered").length || 0;

  const stats = [
    {
      title: "ממתינים למשלוח",
      value: pendingShipments,
      icon: Clock,
      gradient: "from-amber-500 to-orange-600",
    },
    {
      title: "בדרך",
      value: inTransit,
      icon: Truck,
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      title: "נמסרו",
      value: delivered,
      icon: CheckCircle,
      gradient: "from-emerald-500 to-green-600",
    },
    {
      title: "ספקי משלוחים",
      value: providers.filter(p => p.isActive).length,
      icon: Package,
      gradient: "from-violet-500 to-purple-600",
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700 border-amber-200",
      processing: "bg-blue-100 text-blue-700 border-blue-200",
      shipped: "bg-violet-100 text-violet-700 border-violet-200",
      delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
      completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
    const labels: Record<string, string> = {
      pending: "ממתין",
      processing: "בהכנה",
      shipped: "נשלח",
      delivered: "נמסר",
      completed: "הושלם",
    };
    return <Badge className={styles[status] || styles.pending}>{labels[status] || status}</Badge>;
  };

  const filteredOrders = orders?.filter(order => {
    const address = typeof order.shipping_address === 'string' ? order.shipping_address : '';
    return order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      address.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <AdminLayout title="משלוחים" icon={Truck}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-10`} />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Card>
          <CardContent className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="orders">הזמנות</TabsTrigger>
                <TabsTrigger value="providers">ספקי משלוחים</TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="mt-0">
                <div className="relative mb-4">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="חיפוש לפי מספר הזמנה, שם או כתובת..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </TabsContent>

              <TabsContent value="providers" className="mt-0">
                <div className="grid gap-4 md:grid-cols-2">
                  {providers.map((provider) => (
                    <Card key={provider.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-3xl">{provider.logo}</div>
                            <div>
                              <h3 className="font-medium">{provider.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                ₪{provider.defaultPrice} • {provider.estimatedDays} ימים
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={provider.isActive}
                              onCheckedChange={(checked) => {
                                setProviders(providers.map(p => 
                                  p.id === provider.id ? { ...p, isActive: checked } : p
                                ));
                              }}
                            />
                            <Button size="icon" variant="ghost">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Orders List */}
        {activeTab === "orders" && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                הזמנות ({filteredOrders?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">טוען...</div>
              ) : filteredOrders?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">אין הזמנות</div>
              ) : (
                <div className="divide-y">
                  {filteredOrders?.map((order) => (
                    <div key={order.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">#{order.order_number || order.id.slice(0, 8).toUpperCase()}</h3>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{order.order_number}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground truncate">{typeof order.shipping_address === 'string' ? order.shipping_address : 'לא צוין'}</p>
                        </div>
                      </div>
                        <div className="text-left">
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(order.created_at), "dd/MM/yyyy", { locale: he })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {(order.status === "pending" || order.status === "processing") && (
                            <Button size="sm">
                              <Truck className="w-4 h-4 ml-1" />
                              שלח
                            </Button>
                          )}
                          {order.status === "shipped" && (
                            <Button size="sm" variant="outline">
                              <ExternalLink className="w-4 h-4 ml-1" />
                              מעקב
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminShipping;