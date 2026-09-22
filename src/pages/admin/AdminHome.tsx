/**
 * The screen the admin opens on.
 *
 * There was not one: `/admin` redirected to the product list, so the question
 * somebody opens the admin to ask - what needs me this morning - was answered
 * by visiting four screens and reading four tables.
 *
 * Two parts, in the order the owner asked for them. A strip of four numbers,
 * each one a LINK to the screen it counts rather than a figure to look at, and
 * under it a queue where every row carries the button for the thing it is
 * about. A dashboard that only reports is a dashboard you read and then go
 * somewhere else to act on, which is the same number of screens as before.
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, ChevronLeft, LayoutDashboard, Package,
  RefreshCw, ShoppingCart, Store, UserPlus, Wallet,
} from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminEmptyState, AdminStatCard, AdminStatsGrid } from "@/components/admin/AdminStyles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getAdminHome, type MipoAdminHome, type MipoAdminHomeAction } from "@/lib/mipoApi";
import { cn } from "@/lib/utils";

const shekels = (value: number) => `₪${Math.round(value).toLocaleString("he-IL")}`;

/**
 * Today against yesterday, in words rather than a percentage.
 *
 * A percentage of a small number is a big percentage: ₪40 after a ₪20 day is
 * "+100%", which reads like news and is not. The shekel difference says the
 * same thing without the drama, and a day that started from nothing says so
 * instead of dividing by zero.
 */
const compareToYesterday = (today: number, yesterday: number) => {
  if (yesterday === 0) return today === 0 ? "כמו אתמול" : "אתמול לא היו מכירות";
  const difference = Math.round(today - yesterday);
  if (difference === 0) return "בדיוק כמו אתמול";
  return `${difference > 0 ? "+" : "−"}${shekels(Math.abs(difference))} מאתמול`;
};

/** What each kind of row is, said in the words that describe the action. */
const KIND: Record<MipoAdminHomeAction["kind"], { icon: typeof Package; label: string; tone: string }> = {
  order_waiting: { icon: ShoppingCart, label: "לטפל בהזמנה", tone: "text-amber-600 bg-amber-500/10" },
  product_flagged: { icon: AlertTriangle, label: "לבדוק מוצר", tone: "text-rose-600 bg-rose-500/10" },
  product_unpublished: { icon: Store, label: "לפרסם לחנות", tone: "text-sky-600 bg-sky-500/10" },
};

const ActionRow = ({ action, onGo }: { action: MipoAdminHomeAction; onGo: () => void }) => {
  const kind = KIND[action.kind];
  const Icon = kind.icon;

  return (
    <Card className="border-mipo-line bg-mipo-surface">
      <button
        type="button"
        onClick={onGo}
        className="w-full flex items-center gap-3 p-3 text-right transition-colors hover:bg-mipo-soft rounded-lg"
      >
        <span className={cn("shrink-0 w-9 h-9 rounded-lg flex items-center justify-center", kind.tone)}>
          <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
        </span>

        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium truncate">{action.title}</span>
          <span className="block text-xs text-muted-foreground truncate">{action.subtitle}</span>
        </span>

        {action.amount !== null && (
          <span className="shrink-0 text-sm font-semibold tabular-nums">{shekels(action.amount)}</span>
        )}

        {/* The label is the verb, so the row says what pressing it does rather
            than leaving "›" to be guessed at. */}
        <span className="shrink-0 hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
          {kind.label}
          <ChevronLeft className="w-3.5 h-3.5" />
        </span>
        <ChevronLeft className="shrink-0 sm:hidden w-4 h-4 text-muted-foreground" />
      </button>
    </Card>
  );
};

export const AdminHome = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [home, setHome] = useState<MipoAdminHome | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setHome(await getAdminHome());
    } catch (error) {
      toast({
        title: "לא הצלחנו לטעון את המסך",
        description: error instanceof Error ? error.message : "נסה שוב",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const numbers = home?.numbers;
  const actions = home?.actions ?? [];

  return (
    <AdminLayout title="בית" icon={LayoutDashboard}>
      <div className="space-y-5">
        {loading && !home ? (
          <AdminStatsGrid columns={4}>
            {[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-28 rounded-xl" />)}
          </AdminStatsGrid>
        ) : (
          <AdminStatsGrid columns={4}>
            {/* Every card navigates. A number you cannot press is a number you
                read and then go and find, which is the trip this replaces. */}
            <AdminStatCard
              title="הזמנות ממתינות"
              value={numbers?.pending_orders ?? 0}
              subtitle="מחכות לטיפול"
              icon={ShoppingCart}
              color={numbers?.pending_orders ? "warning" : "primary"}
              onClick={() => navigate("/admin/orders?status=pending")}
            />
            <AdminStatCard
              title="הכנסות היום"
              value={shekels(numbers?.revenue_today ?? 0)}
              subtitle={compareToYesterday(numbers?.revenue_today ?? 0, numbers?.revenue_yesterday ?? 0)}
              icon={Wallet}
              color="success"
              trend={numbers && numbers.revenue_yesterday > 0 ? {
                value: shekels(Math.abs(numbers.revenue_today - numbers.revenue_yesterday)),
                isPositive: numbers.revenue_today >= numbers.revenue_yesterday,
              } : undefined}
              onClick={() => navigate("/admin/analytics")}
            />
            <AdminStatCard
              title="לא פורסמו לחנות"
              value={numbers?.unpublished_products ?? 0}
              subtitle="אושרו ומחכים לפרסום"
              icon={Package}
              color={numbers?.unpublished_products ? "warning" : "primary"}
              onClick={() => navigate("/admin/publishing")}
            />
            <AdminStatCard
              title="לקוחות חדשים"
              value={numbers?.new_customers_this_week ?? 0}
              subtitle="בשבוע האחרון"
              icon={UserPlus}
              color="primary"
              onClick={() => navigate("/admin/customers")}
            />
          </AdminStatsGrid>
        )}

        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">דורש טיפול</h2>
            {actions.length > 0 && (
              <span className="text-xs text-muted-foreground">{actions.length} פריטים</span>
            )}
          </div>

          {loading && !home ? (
            <div className="space-y-2">
              {[0, 1, 2].map((index) => <Skeleton key={index} className="h-[66px] rounded-xl" />)}
            </div>
          ) : actions.length === 0 ? (
            <AdminEmptyState
              icon={LayoutDashboard}
              title="אין מה לעשות כרגע"
              description="אין הזמנות ממתינות, מוצרים מסומנים לבדיקה או מוצרים שמחכים לפרסום."
              action={{ label: "לכל ההזמנות", onClick: () => navigate("/admin/orders") }}
            />
          ) : (
            <div className="space-y-2">
              {actions.map((action) => (
                <ActionRow
                  key={`${action.kind}:${action.id}`}
                  action={action}
                  onGo={() => navigate(action.href)}
                />
              ))}
            </div>
          )}
        </section>

        <div className="flex justify-center pt-1">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => void load()}>
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            רענון
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminHome;
