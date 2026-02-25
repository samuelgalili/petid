import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Upload, TrendingUp, DollarSign, Package, Eye, Play,
  BarChart3, Wallet, ArrowUpRight, Plus, Video
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CreatorStudioProps {
  businessId: string;
}

export const CreatorStudio = ({ businessId }: CreatorStudioProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch video posts
  const { data: videos = [] } = useQuery({
    queryKey: ['creator-videos', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_posts')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch orders for this business
  const { data: orders = [] } = useQuery({
    queryKey: ['creator-orders', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders' as any)
        .select('*')
        .eq('seller_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const totalRevenue = orders.reduce((sum: number, o: any) => sum + (Number(o.total_price) || 0), 0);
  const totalCommission = orders.reduce((sum: number, o: any) => sum + (Number(o.commission_amount) || 0), 0);
  const totalViews = videos.reduce((sum: number, v: any) => sum + (v.view_count || 0), 0);

  return (
    <div className="space-y-4 p-4" dir="rtl">
      {/* Studio Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Creator Studio</h2>
          <p className="text-xs text-muted-foreground">ניהול תוכן, מכירות ועמלות</p>
        </div>
        <Button size="sm" className="gap-1.5 rounded-xl">
          <Upload className="w-4 h-4" />
          העלה וידאו
        </Button>
      </div>

      {/* Wallet Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold">הארנק שלי</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-2xl font-bold">₪{totalRevenue.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">סה״כ מכירות</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">₪{totalCommission.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">עמלות שנצברו</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{orders.length}</p>
            <p className="text-[10px] text-muted-foreground">הזמנות</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3 h-9">
          <TabsTrigger value="overview" className="text-xs gap-1">
            <BarChart3 className="w-3.5 h-3.5" />
            סקירה
          </TabsTrigger>
          <TabsTrigger value="videos" className="text-xs gap-1">
            <Video className="w-3.5 h-3.5" />
            סרטונים
          </TabsTrigger>
          <TabsTrigger value="orders" className="text-xs gap-1">
            <Package className="w-3.5 h-3.5" />
            הזמנות
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Eye className="w-4 h-4" />}
              label="צפיות כוללות"
              value={totalViews.toLocaleString()}
              trend="+12%"
            />
            <StatCard
              icon={<Play className="w-4 h-4" />}
              label="סרטונים פעילים"
              value={videos.length.toString()}
            />
            <StatCard
              icon={<DollarSign className="w-4 h-4" />}
              label="ממוצע להזמנה"
              value={orders.length > 0 ? `₪${(totalRevenue / orders.length).toFixed(0)}` : '₪0'}
            />
            <StatCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="שיעור המרה"
              value={totalViews > 0 ? `${((orders.length / totalViews) * 100).toFixed(1)}%` : '0%'}
            />
          </div>

          {/* Quick Tips */}
          <Card className="border-dashed">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">
                💡 העלה סרטון חדש וקשר אותו למוצרים מהקטלוג כדי להתחיל למכור דרך ה-Shop Feed.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos" className="space-y-3 mt-3">
          {videos.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <Video className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">אין סרטונים עדיין</h3>
              <p className="text-sm text-muted-foreground mb-4">העלה סרטון ראשון כדי להתחיל למכור</p>
              <Button size="sm" className="gap-1.5 rounded-xl">
                <Plus className="w-4 h-4" />
                העלה סרטון
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {videos.map((video: any) => (
                <div key={video.id} className="aspect-[9/16] rounded-lg bg-muted relative overflow-hidden group cursor-pointer">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <div className="flex items-center gap-1 text-white text-[10px]">
                      <Eye className="w-3 h-3" />
                      {(video.view_count || 0).toLocaleString()}
                    </div>
                  </div>
                  {(video.product_ids?.length || 0) > 0 && (
                    <Badge className="absolute top-1 right-1 text-[8px] px-1 py-0 bg-primary/90">
                      {video.product_ids.length} מוצרים
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-2 mt-3">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">אין הזמנות עדיין</h3>
              <p className="text-sm text-muted-foreground">הזמנות יופיעו כאן כשלקוחות ירכשו דרך הסרטונים שלך</p>
            </div>
          ) : (
            orders.map((order: any) => (
              <Card key={order.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{order.customer_name || 'לקוח'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold">₪{Number(order.total_price).toFixed(0)}</p>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        order.shipping_status === 'delivered' ? 'bg-green-100 text-green-700' :
                        order.shipping_status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {order.shipping_status === 'delivered' ? 'נמסר' :
                       order.shipping_status === 'shipped' ? 'נשלח' : 'בעיבוד'}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* Stat Card */
const StatCard = ({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string; trend?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-xl border bg-card p-3"
  >
    <div className="flex items-center gap-1.5 mb-1.5 text-muted-foreground">
      {icon}
      <span className="text-[10px]">{label}</span>
    </div>
    <div className="flex items-end gap-1.5">
      <span className="text-xl font-bold">{value}</span>
      {trend && (
        <span className="text-[10px] text-primary flex items-center gap-0.5 mb-0.5">
          <ArrowUpRight className="w-3 h-3" />
          {trend}
        </span>
      )}
    </div>
  </motion.div>
);
