import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "sonner";

const AdminSalesChannels = () => {
  const queryClient = useQueryClient();

  const { data: channels, isLoading } = useQuery({
    queryKey: ['sales-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_channels')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('sales_channels')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-channels'] });
      toast.success('הסטטוס עודכן');
    }
  });

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'website':
        return Globe;
      case 'physical':
        return Store;
      case 'marketplace':
        return ShoppingBag;
      case 'app':
        return Smartphone;
      default:
        return Store;
    }
  };

  const activeChannels = channels?.filter(c => c.is_active).length || 0;

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
                <p className="text-2xl font-bold">{activeChannels}</p>
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
                <p className="text-2xl font-bold">₪0</p>
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
                <p className="text-2xl font-bold">0</p>
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
                <p className="text-2xl font-bold text-green-600">0%</p>
                <p className="text-sm text-muted-foreground">צמיחה חודשית</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : channels?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">אין ערוצי מכירה מוגדרים</p>
              <Button className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                הוסף ערוץ ראשון
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {channels?.map((channel) => {
              const Icon = getChannelIcon(channel.type);
              return (
                <motion.div
                  key={channel.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className={`overflow-hidden ${!channel.is_active && 'opacity-60'}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{channel.name}</CardTitle>
                            <Badge variant={channel.is_active ? 'default' : 'secondary'}>
                              {channel.is_active ? 'פעיל' : 'לא פעיל'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={channel.is_active}
                            onCheckedChange={(checked) => toggleMutation.mutate({ id: channel.id, isActive: checked })}
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
                          <p className="text-2xl font-bold">₪0</p>
                          <p className="text-xs text-muted-foreground">הכנסות</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <p className="text-2xl font-bold">0</p>
                          <p className="text-xs text-muted-foreground">הזמנות</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <p className="text-2xl font-bold">0</p>
                          <p className="text-xs text-muted-foreground">מוצרים</p>
                        </div>
                      </div>
                      
                      {channel.is_active && (
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
                      
                      {!channel.is_active && (
                        <div className="mt-4 pt-4 border-t">
                          <Button 
                            className="w-full gap-2"
                            onClick={() => toggleMutation.mutate({ id: channel.id, isActive: true })}
                          >
                            <Plus className="h-4 w-4" />
                            הפעל ערוץ
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

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
