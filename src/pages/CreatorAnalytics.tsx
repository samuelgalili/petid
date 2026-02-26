import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Eye, MousePointerClick, TrendingUp, Coins,
  FlaskConical, ShieldCheck, Globe, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScienceBadge } from '@/components/ui/ScienceBadge';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';

// ─── Mock Data ───
const dailySales = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(Date.now() - (29 - i) * 86400000);
  return {
    date: `${d.getDate()}/${d.getMonth() + 1}`,
    sales: Math.floor(Math.random() * 800 + 200),
    verified: Math.floor(Math.random() * 500 + 150),
  };
});

const topProducts = [
  { name: 'Premium Dog Food NRC', sales: 342, verified: true },
  { name: 'Omega-3 Supplements', sales: 278, verified: true },
  { name: 'Pet Grooming Kit', sales: 215, verified: false },
  { name: 'Joint Health Chews', sales: 189, verified: true },
  { name: 'Dental Care Sticks', sales: 156, verified: false },
  { name: 'Puppy Training Pads', sales: 134, verified: false },
];

const geoData = [
  { country: 'ישראל', flag: '🇮🇱', buyers: 1240, pct: 42 },
  { country: 'ארה"ב', flag: '🇺🇸', buyers: 680, pct: 23 },
  { country: 'בריטניה', flag: '🇬🇧', buyers: 390, pct: 13 },
  { country: 'גרמניה', flag: '🇩🇪', buyers: 280, pct: 9 },
  { country: 'צרפת', flag: '🇫🇷', buyers: 210, pct: 7 },
  { country: 'אחר', flag: '🌍', buyers: 180, pct: 6 },
];

const metrics = [
  { title: 'Total Reach', value: '24.8K', icon: Eye, change: '+12.4%' },
  { title: 'Product Clicks', value: '3,412', icon: MousePointerClick, change: '+8.2%' },
  { title: 'Conversion Rate', value: '4.7%', icon: TrendingUp, change: '+0.6%' },
  { title: 'Est. Commissions', value: '₪2,840', icon: Coins, change: '+18.3%' },
];

const scienceComparison = {
  verified: { convRate: 6.2, avgOrder: 189, returnRate: 2.1, satisfaction: 4.8 },
  generic: { convRate: 3.1, avgOrder: 124, returnRate: 8.4, satisfaction: 3.9 },
};

const CreatorAnalytics = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
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

        {/* ─── Metric Cards ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="border border-border/50 bg-card/60 backdrop-blur-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                      </div>
                      <span className="text-[11px] font-medium text-emerald-600">{m.change}</span>
                    </div>
                    <p className="text-2xl font-bold tracking-tight">{m.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{m.title}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* ─── Charts Row ─── */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Daily Sales Line Chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="border border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">צמיחת מכירות יומית</CardTitle>
                <p className="text-[11px] text-muted-foreground">30 ימים אחרונים</p>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailySales}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        interval={4}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        width={35}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          fontSize: '12px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="sales"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        name="מכירות"
                      />
                      <Line
                        type="monotone"
                        dataKey="verified"
                        stroke="hsl(210 80% 65%)"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                        name="מאומת מדעית"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Products Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">מוצרים מובילים מסין</CardTitle>
                <p className="text-[11px] text-muted-foreground">לפי כמות מכירות</p>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts} layout="vertical" margin={{ left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        width={130}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="sales" radius={[0, 6, 6, 0]} name="מכירות">
                        {topProducts.map((p, i) => (
                          <Cell
                            key={i}
                            fill={p.verified ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground)/0.25)'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Science-Verified
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/25" /> Generic
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ─── Science Edge Comparison ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">The Science Edge</CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    השוואת ביצועים: מוצרים מאומתים מדעית מול גנריים
                  </p>
                </div>
                <ScienceBadge size="sm" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {/* Verified Column */}
                <div className="rounded-[20px] bg-primary/5 border border-primary/10 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    <span className="text-xs font-semibold text-primary">Science-Verified</span>
                  </div>
                  {[
                    { label: 'שיעור המרה', val: `${scienceComparison.verified.convRate}%` },
                    { label: 'הזמנה ממוצעת', val: `₪${scienceComparison.verified.avgOrder}` },
                    { label: 'שיעור החזרות', val: `${scienceComparison.verified.returnRate}%` },
                    { label: 'שביעות רצון', val: `${scienceComparison.verified.satisfaction}/5` },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{r.label}</span>
                      <span className="text-sm font-bold">{r.val}</span>
                    </div>
                  ))}
                </div>

                {/* Generic Column */}
                <div className="rounded-[20px] bg-muted/40 border border-border/50 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-xs font-semibold text-muted-foreground">Generic</span>
                  </div>
                  {[
                    { label: 'שיעור המרה', val: `${scienceComparison.generic.convRate}%` },
                    { label: 'הזמנה ממוצעת', val: `₪${scienceComparison.generic.avgOrder}` },
                    { label: 'שיעור החזרות', val: `${scienceComparison.generic.returnRate}%` },
                    { label: 'שביעות רצון', val: `${scienceComparison.generic.satisfaction}/5` },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{r.label}</span>
                      <span className="text-sm font-bold text-muted-foreground">{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Geographic Insights ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="pb-10"
        >
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <CardTitle className="text-sm font-semibold">תובנות גיאוגרפיות</CardTitle>
              </div>
              <p className="text-[11px] text-muted-foreground">מאיפה הקונים שלך מגיעים</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {geoData.map((g, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center">{g.flag}</span>
                    <span className="text-sm font-medium flex-1">{g.country}</span>
                    <div className="flex-[2] h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary/70"
                        initial={{ width: 0 }}
                        animate={{ width: `${g.pct}%` }}
                        transition={{ delay: 0.7 + i * 0.08, duration: 0.5 }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground w-14 text-left">
                      {g.buyers.toLocaleString()} ({g.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default CreatorAnalytics;
