import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Store, 
  Globe, 
  ShoppingBag, 
  Smartphone,
  Plus,
  Settings,
  TrendingUp,
  Package,
  DollarSign,
  BarChart3
} from "lucide-react";
import { motion } from "framer-motion";

const AdminSalesChannels = () => {
  const [channels, setChannels] = useState([
    {
      id: '1',
      name: 'חנות אונליין',
      type: 'website',
      icon: Globe,
      status: 'active',
      revenue: 45000,
      orders: 156,
      products: 234,
      connected: true
    },
    {
      id: '2',
      name: 'חנות פיזית - תל אביב',
      type: 'physical',
      icon: Store,
      status: 'active',
      revenue: 32000,
      orders: 89,
      products: 180,
      connected: true
    },
    {
      id: '3',
      name: 'אמזון',
      type: 'marketplace',
      icon: ShoppingBag,
      status: 'pending',
      revenue: 0,
      orders: 0,
      products: 0,
      connected: false
    },
    {
      id: '4',
      name: 'אפליקציה',
      type: 'app',
      icon: Smartphone,
      status: 'active',
      revenue: 18000,
      orders: 67,
      products: 234,
      connected: true
    }
  ]);

  const totalRevenue = channels.reduce((sum, c) => sum + c.revenue, 0);
  const totalOrders = channels.reduce((sum, c) => sum + c.orders, 0);

  const toggleChannel = (id: string) => {
    setChannels(channels.map(c => 
      c.id === id ? { ...c, connected: !c.connected } : c
    ));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700">פעיל</Badge>;
      case 'pending':
        return <Badge variant="secondary">ממתין לחיבור</Badge>;
      case 'error':
        return <Badge variant="destructive">שגיאה</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout title="ערוצי מכירה">
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">ערוצי מכירה</h1>
            <p className="text-muted-foreground">נהל את כל ערוצי המכירה שלך במקום אחד</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            הוסף ערוץ
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Store className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{channels.length}</p>
                <p className="text-sm text-muted-foreground">ערוצים פעילים</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">₪{totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">הכנסות החודש</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalOrders}</p>
                <p className="text-sm text-muted-foreground">הזמנות החודש</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">+12%</p>
                <p className="text-sm text-muted-foreground">צמיחה חודשית</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {channels.map((channel) => {
            const Icon = channel.icon;
            return (
              <motion.div
                key={channel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{channel.name}</CardTitle>
                          {getStatusBadge(channel.status)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={channel.connected}
                          onCheckedChange={() => toggleChannel(channel.id)}
                        />
                        <Button variant="ghost" size="icon">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">₪{channel.revenue.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">הכנסות</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{channel.orders}</p>
                        <p className="text-xs text-muted-foreground">הזמנות</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{channel.products}</p>
                        <p className="text-xs text-muted-foreground">מוצרים</p>
                      </div>
                    </div>
                    
                    {channel.connected && (
                      <div className="mt-4 pt-4 border-t flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 gap-2">
                          <BarChart3 className="h-4 w-4" />
                          סטטיסטיקות
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 gap-2">
                          <Package className="h-4 w-4" />
                          סנכרון מוצרים
                        </Button>
                      </div>
                    )}
                    
                    {!channel.connected && (
                      <div className="mt-4 pt-4 border-t">
                        <Button className="w-full gap-2">
                          <Plus className="h-4 w-4" />
                          חבר ערוץ
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Available Integrations */}
        <Card>
          <CardHeader>
            <CardTitle>אינטגרציות זמינות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {['eBay', 'Etsy', 'Shopify', 'WooCommerce', 'Facebook Shop', 'Instagram Shop'].map((platform) => (
                <motion.div
                  key={platform}
                  whileHover={{ scale: 1.05 }}
                  className="p-4 rounded-lg border text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">{platform}</p>
                  <p className="text-xs text-muted-foreground">לחץ לחיבור</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSalesChannels;
