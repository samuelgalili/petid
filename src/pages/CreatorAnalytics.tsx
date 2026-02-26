import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Eye, MousePointerClick, TrendingUp, Coins,
  FlaskConical, ShieldCheck, Globe, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScienceBadge } from '@/components/ui/ScienceBadge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';

const CreatorAnalytics = () => {
  const navigate = useNavigate();

  // Fetch real analytics from business_analytics
  const { data: analytics = [], isLoading } = useQuery({
    queryKey: ["creator-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_analytics")
        .select("*")
        .order("viewed_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["creator-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_products")
        .select("id, name, review_count, average_rating, safety_score")
        .order("review_count", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  // Aggregate daily views from analytics
  const dailyData = (() => {
    const byDay: Record<string, number> = {};
    analytics.forEach((a: any) => {
      const d = new Date(a.viewed_at).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
      byDay[d] = (byDay[d] || 0) + 1;
    });
    return Object.entries(byDay).slice(-30).map(([date, views]) => ({ date, views }));
  })();

  const topProducts = products.map((p: any) => ({
    name: p.name?.substring(0, 25) || "Unknown",
    sales: p.review_count || 0,
    verified: (p.safety_score || 0) > 70,
  }));

  const totalViews = analytics.length;
  const uniqueViewers = new Set(analytics.map((a: any) => a.viewer_id)).size;

  const metrics = [
    { title: 'Total Reach', value: totalViews.toLocaleString(), icon: Eye, change: '' },
    { title: 'Unique Viewers', value: uniqueViewers.toLocaleString(), icon: MousePointerClick, change: '' },
    { title: 'Products Listed', value: String(products.length), icon: TrendingUp, change: '' },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-5 h-14 max-w-5xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <span className="text-[15px] font-semibold tracking-tight">Creator Analytics</span>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-8 space-y-10">
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              {metrics.map((m, i) => {
                const Icon = m.icon;
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                    <Card className="border border-border/50 bg-card/60 backdrop-blur-sm">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                          </div>
                        </div>
                        <p className="text-2xl font-bold tracking-tight text-foreground">{m.value}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{m.title}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {dailyData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="border border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">צפיות יומיות</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval={4} />
                          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={35} />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                          <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="צפיות" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {topProducts.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card className="border border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">מוצרים מובילים</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topProducts} layout="vertical" margin={{ left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={130} />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                          <Bar dataKey="sales" radius={[0, 6, 6, 0]} name="ביקורות">
                            {topProducts.map((p: any, i: number) => (
                              <Cell key={i} fill={p.verified ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground)/0.25)'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {totalViews === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  אין נתוני אנליטיקה עדיין. הנתונים יתחילו להצטבר כשמשתמשים יצפו בחנות שלך.
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CreatorAnalytics;
