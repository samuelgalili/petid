import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Coins, Cpu, DollarSign, Gauge, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getEconomicsByFeature,
  getEconomicsByModel,
  getEconomicsByProvider,
  getEconomicsOverview,
  getEconomicsTimeline,
  getEconomicsTopUsers,
} from "@/lib/mipoApi";

const RANGES = [
  { value: "7", label: "7 ימים" },
  { value: "30", label: "30 ימים" },
  { value: "90", label: "90 ימים" },
];

// Provider costs are small per call and only add up in aggregate, so a
// two-decimal currency format would show most rows as 0.00.
const money = (value: number, currency = "USD") => {
  const symbol = currency === "USD" ? "$" : `${currency} `;
  if (value === 0) return `${symbol}0`;
  if (Math.abs(value) < 0.01) return `${symbol}${value.toFixed(5)}`;
  if (Math.abs(value) < 1) return `${symbol}${value.toFixed(4)}`;
  return `${symbol}${value.toFixed(2)}`;
};

const compact = (value: number) => new Intl.NumberFormat("he-IL", { notation: "compact" }).format(value);

const StatCard = ({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  hint?: string;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      </div>
    </CardContent>
  </Card>
);

const BreakdownTable = ({
  rows,
  emptyLabel,
  currency,
}: {
  rows: Array<{ id: string; label: string; provider_cost: number; total_tokens: number; mipo_credits: number; events: number; cost_share_percent: number }>;
  emptyLabel: string;
  currency: string;
}) => {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{row.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {money(row.provider_cost, currency)} · {row.cost_share_percent}%
            </span>
          </div>
          <Progress value={row.cost_share_percent} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            {compact(row.total_tokens)} טוקנים · {compact(row.mipo_credits)} קרדיטים · {row.events} קריאות
          </p>
        </div>
      ))}
    </div>
  );
};

const AdminEconomics = () => {
  const [range, setRange] = useState("30");
  const days = Number(range);

  const overview = useQuery({ queryKey: ["economics", "overview", days], queryFn: () => getEconomicsOverview(days) });
  const features = useQuery({ queryKey: ["economics", "features", days], queryFn: () => getEconomicsByFeature(days) });
  const models = useQuery({ queryKey: ["economics", "models", days], queryFn: () => getEconomicsByModel(days) });
  const providers = useQuery({ queryKey: ["economics", "providers", days], queryFn: () => getEconomicsByProvider(days) });
  const topUsers = useQuery({ queryKey: ["economics", "users", days], queryFn: () => getEconomicsTopUsers(days, 10) });
  const timeline = useQuery({ queryKey: ["economics", "timeline", days], queryFn: () => getEconomicsTimeline(days, "day") });

  const currency = overview.data?.currency || "USD";

  const chartData = useMemo(
    () => (timeline.data || []).map((point) => ({
      day: new Date(point.bucket).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" }),
      cost: point.provider_cost,
      tokens: point.total_tokens,
    })),
    [timeline.data],
  );

  const isLoading = overview.isLoading;
  const error = overview.error as Error | null;

  return (
    <AdminLayout title="כלכלת AI">
      <div className="space-y-6 p-6" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">כלכלת AI</h1>
            <p className="text-muted-foreground">
              צריכה ועלות בפועל, מחושבות מספר החשבונאות — לא הערכה
            </p>
          </div>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-28" />)}
          </div>
        ) : (
          <>
            {/* The three quantities the ledger keeps apart, shown apart. */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={DollarSign}
                label="עלות ספקים בפועל"
                value={money(overview.data!.total_variable_cost, currency)}
                hint={`AI ${money(overview.data!.total_ai_cost, currency)} · חיצוני ${money(overview.data!.total_external_cost, currency)}`}
              />
              <StatCard
                icon={Cpu}
                label="טוקנים טכניים"
                value={compact(overview.data!.total_tokens)}
                hint={`קלט ${compact(overview.data!.total_input_tokens)} · פלט ${compact(overview.data!.total_output_tokens)}`}
              />
              <StatCard
                icon={Coins}
                label="קרדיטים של Mipo"
                value={compact(overview.data!.total_mipo_credits_consumed)}
                hint="מופרד מהטוקנים ומהעלות בכוונה"
              />
              <StatCard
                icon={Users}
                label="משתמשים פעילים ב-AI"
                value={String(overview.data!.active_ai_users)}
                hint={`מתוך ${overview.data!.total_users} · ${money(overview.data!.average_cost_per_active_user, currency)} לפעיל`}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                icon={Gauge}
                label="קריאות שהצליחו"
                value={String(overview.data!.requests_succeeded)}
              />
              <StatCard
                icon={AlertTriangle}
                label="קריאות שנכשלו"
                value={String(overview.data!.requests_failed)}
              />
              <StatCard
                icon={Gauge}
                label="זמן תגובה ממוצע"
                value={`${overview.data!.average_latency_ms} ms`}
              />
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">עלות לאורך זמן</CardTitle></CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">אין עדיין נתונים בטווח הזה</p>
                ) : (
                  <div className="h-64" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => money(value, currency)} />
                        <Area type="monotone" dataKey="cost" strokeWidth={2} fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue="features">
              <TabsList>
                <TabsTrigger value="features">לפי פיצ׳ר</TabsTrigger>
                <TabsTrigger value="models">לפי מודל</TabsTrigger>
                <TabsTrigger value="providers">לפי ספק</TabsTrigger>
                <TabsTrigger value="users">משתמשים יקרים</TabsTrigger>
              </TabsList>

              <TabsContent value="features" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <BreakdownTable
                      rows={features.data || []}
                      currency={currency}
                      emptyLabel="אין עדיין צריכת AI משויכת לפיצ׳ר"
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="models" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <BreakdownTable
                      rows={models.data || []}
                      currency={currency}
                      emptyLabel="אין עדיין צריכה משויכת למודל"
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="providers" className="mt-4">
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    {(providers.data || []).length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">אין ספקים רשומים</p>
                    ) : (
                      (providers.data || []).map((provider) => (
                        <div key={provider.id} className="rounded-lg border p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{provider.label}</span>
                              <Badge variant={provider.is_enabled ? "default" : "secondary"}>
                                {provider.is_enabled ? "פעיל" : "מושבת"}
                              </Badge>
                            </div>
                            <span className="tabular-nums font-medium">{money(provider.provider_cost, currency)}</span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
                            <div><span className="block text-foreground tabular-nums">{provider.requests}</span>קריאות</div>
                            <div>
                              <span className="block text-foreground tabular-nums">
                                {provider.success_rate === null ? "—" : `${provider.success_rate}%`}
                              </span>
                              הצלחה
                            </div>
                            <div><span className="block text-foreground tabular-nums">{provider.fallbacks}</span>מעברי ספק</div>
                            <div><span className="block text-foreground tabular-nums">{provider.avg_latency_ms} ms</span>זמן תגובה</div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="users" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">עשרת המשתמשים היקרים ביותר</CardTitle>
                    {/* Monitoring only. Nothing here triggers an upsell. */}
                    <p className="text-sm text-muted-foreground">מוצג לניטור עלויות בלבד</p>
                  </CardHeader>
                  <CardContent>
                    {(topUsers.data || []).length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">אין עדיין צריכה משויכת למשתמש</p>
                    ) : (
                      <div className="space-y-2">
                        {(topUsers.data || []).map((user, index) => (
                          <div key={user.user_id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="w-5 shrink-0 text-sm text-muted-foreground tabular-nums">{index + 1}</span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{user.full_name || user.email || user.user_id}</p>
                                <p className="text-xs text-muted-foreground">
                                  {compact(user.total_tokens)} טוקנים · {compact(user.mipo_credits)} קרדיטים · {user.events} קריאות
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 tabular-nums text-sm font-medium">
                              {money(user.total_cost, currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminEconomics;
