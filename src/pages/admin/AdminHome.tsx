/**
 * The Command Center.
 *
 * ─── A SENTENCE, NOT A DASHBOARD ────────────────────────────────────────────
 *
 * Something went wrong → somebody has to decide → somebody is doing it → it is
 * done. The value of the four columns is not that they group things; it is
 * that a thing MOVES between them, so "what is stuck" becomes a place you look
 * rather than a query you run.
 *
 * What was here before was a flat queue - waiting orders, flagged products and
 * unpublished products in one pile. It answered "what needs me" and not "where
 * is it stuck", which is the question somebody opening this at 8am is actually
 * asking.
 *
 * ─── THE NUMBERS ARE NOT THE SCREEN ─────────────────────────────────────────
 *
 * Four of them, chosen by the owner, in a strip at the top that takes about
 * seventy pixels. The brief is explicit that twenty KPI widgets is a screen
 * nobody reads, and it is right: the work is below the numbers, so the numbers
 * get the room they need and not a pixel more. Each one is a link, because a
 * number you cannot press is a number you read and then go and find.
 *
 * ─── AND EVERY COLUMN SAYS HOW MANY THERE REALLY ARE ────────────────────────
 *
 * Six rows shown, the true total in the header. A morning with forty
 * exceptions has to say forty; a column that shows six and says six is a board
 * that gets quieter the worse things get.
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, CheckCircle2, ChevronLeft, Clock, LayoutDashboard, Package,
  RefreshCw, ShoppingCart, Stamp, UserPlus, Wallet,
} from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  getAdminHome,
  type MipoAdminHome, type MipoBoardColumn, type MipoBoardItem,
  type MipoBoardKey, type MipoHealthCheck,
} from "@/lib/mipoApi";
import { cn } from "@/lib/utils";

const shekels = (value: number) => `₪${Math.round(value).toLocaleString("he-IL")}`;

/**
 * Today against yesterday, in shekels rather than a percentage.
 *
 * A percentage of a small number is a big percentage: ₪40 after a ₪20 day is
 * "+100%", which reads like news and is not. The difference says the same
 * thing without the drama, and a day that started from nothing says so instead
 * of dividing by zero.
 */
const againstYesterday = (today: number, yesterday: number) => {
  if (yesterday === 0) return today === 0 ? "כמו אתמול" : "אתמול לא היו מכירות";
  const difference = Math.round(today - yesterday);
  if (difference === 0) return "בדיוק כמו אתמול";
  return `${difference > 0 ? "+" : "−"}${shekels(Math.abs(difference))} מאתמול`;
};

/** "לפני 4 שעות", and "עכשיו" rather than "לפני 0 דקות". */
const ago = (iso: string | null) => {
  if (!iso) return "";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "עכשיו";
  if (minutes < 60) return `לפני ${minutes} דק׳`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `לפני ${hours} שע׳`;
  return `לפני ${Math.round(hours / 24)} ימים`;
};

const COLUMNS: {
  key: MipoBoardKey; title: string; hint: string;
  icon: typeof Package; tone: string; bar: string;
}[] = [
  {
    key: "exception", title: "חריגות", hint: "דורש בדיקה מיידית",
    icon: AlertTriangle, tone: "text-admin-danger bg-admin-danger-soft", bar: "bg-admin-danger",
  },
  {
    key: "approval", title: "לאישור", hint: "ממתין להחלטה שלך",
    icon: Stamp, tone: "text-admin-warning bg-admin-warning-soft", bar: "bg-admin-warning",
  },
  {
    key: "in_progress", title: "בתהליך", hint: "בטיפול כרגע",
    icon: Clock, tone: "text-admin-info bg-admin-info-soft", bar: "bg-admin-info",
  },
  {
    key: "completed", title: "הושלם", hint: "השבוע האחרון",
    icon: CheckCircle2, tone: "text-admin-success bg-admin-success-soft", bar: "bg-admin-success",
  },
];

const HEALTH_TONE: Record<MipoHealthCheck["state"], string> = {
  ok: "bg-admin-success",
  degraded: "bg-admin-warning",
  down: "bg-admin-danger",
  unknown: "bg-admin-ink-subtle",
};

const HEALTH_WORD: Record<MipoHealthCheck["state"], string> = {
  ok: "תקין",
  degraded: "מדשדש",
  down: "לא עובד",
  // Not "תקין". A check with nothing to measure has not passed; it has not
  // run, and saying otherwise is the one lie an operations screen must not
  // tell.
  unknown: "אין נתונים",
};

const NumberTile = ({ label, value, sub, icon: Icon, tone, onClick }: {
  label: string; value: string | number; sub: string;
  icon: typeof Package; tone: string; onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="admin-card admin-card-hover admin-focus flex items-center gap-2.5 p-3 text-right"
  >
    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tone)}>
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
    </span>
    <span className="min-w-0 flex-1">
      <span className="admin-label block truncate">{label}</span>
      <span className="admin-figure block truncate">{value}</span>
      <span className="admin-meta block truncate">{sub}</span>
    </span>
  </button>
);

const BoardCard = ({ item, onGo }: { item: MipoBoardItem; onGo: () => void }) => (
  <button
    type="button"
    onClick={onGo}
    className="admin-focus w-full rounded-xl border border-admin-line bg-admin-surface p-2.5 text-right transition-colors hover:bg-admin-sunk"
  >
    <span className="flex items-start gap-2">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-admin-ink">{item.title}</span>
        <span className="admin-meta block truncate">{item.subtitle}</span>
        {item.detail && <span className="admin-meta block truncate">{item.detail}</span>}
      </span>
      {item.amount !== null && (
        <span className="admin-meta shrink-0 font-semibold tabular-nums text-admin-ink">
          {shekels(item.amount)}
        </span>
      )}
    </span>
    {item.at && <span className="admin-meta block pt-1">{ago(item.at)}</span>}
  </button>
);

const BoardColumn = ({ column, data, onGo }: {
  column: typeof COLUMNS[number];
  data: MipoBoardColumn | undefined;
  onGo: (href: string) => void;
}) => {
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const Icon = column.icon;

  return (
    // aria-label, or this is a <section> with no accessible name - which
    // carries no landmark role at all, so a screen reader announces four
    // undifferentiated groups and a test cannot address one of them.
    <section className="admin-well flex min-w-0 flex-col gap-2 p-2.5" aria-label={column.title}>
      <header className="flex items-center gap-2">
        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", column.tone)}>
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-admin-ink">{column.title}</span>
          <span className="admin-meta block truncate">{column.hint}</span>
        </span>
        {/* The TRUE total, not the number of cards below it. */}
        <span className="admin-meta shrink-0 rounded-full bg-admin-surface px-2 py-0.5 font-semibold tabular-nums text-admin-ink">
          {total}
        </span>
      </header>

      <div className={cn("h-0.5 rounded-full", total > 0 ? column.bar : "bg-admin-line")} />

      {items.length === 0 ? (
        <p className="admin-meta px-1 py-3 text-center">אין כלום כאן</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((item) => (
            <BoardCard key={`${item.kind}:${item.id}`} item={item} onGo={() => onGo(item.href)} />
          ))}
        </div>
      )}

      {total > items.length && (
        <p className="admin-meta px-1 text-center">
          ועוד {total - items.length}
        </p>
      )}
    </section>
  );
};

/** The audit log's action codes, in the words somebody would use. */
const ACTION_HE: Record<string, string> = {
  "customer.created": "לקוח נוצר",
  "customer.updated": "פרטי לקוח עודכנו",
  "order.created": "הזמנה נוצרה",
  "order.updated": "הזמנה עודכנה",
  "product.created": "מוצר נוסף",
  "product.updated": "מוצר עודכן",
  "product.deleted": "מוצר נמחק",
  "connector.key_stored": "מפתח חיבור נשמר",
  "connector.settings_updated": "הגדרות חיבור עודכנו",
  "connector.disconnected": "חיבור נותק",
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
  const firstLoad = loading && !home;

  return (
    <AdminLayout title="מרכז הבקרה" icon={LayoutDashboard}>
      <div className="space-y-4">
        {/* ── the numbers ──────────────────────────────────────────────── */}
        {firstLoad ? (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-[76px] rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <NumberTile
              label="הזמנות ממתינות" value={numbers?.pending_orders ?? 0} sub="מחכות לטיפול"
              icon={ShoppingCart}
              tone={numbers?.pending_orders
                ? "bg-admin-warning-soft text-admin-warning"
                : "bg-admin-sunk text-admin-ink-subtle"}
              onClick={() => navigate("/admin/orders?status=pending")}
            />
            <NumberTile
              label="הכנסות היום" value={shekels(numbers?.revenue_today ?? 0)}
              sub={againstYesterday(numbers?.revenue_today ?? 0, numbers?.revenue_yesterday ?? 0)}
              icon={Wallet} tone="bg-admin-success-soft text-admin-success"
              onClick={() => navigate("/admin/analytics")}
            />
            <NumberTile
              label="לא פורסמו לחנות" value={numbers?.unpublished_products ?? 0} sub="אושרו וממתינים"
              icon={Package}
              tone={numbers?.unpublished_products
                ? "bg-admin-info-soft text-admin-info"
                : "bg-admin-sunk text-admin-ink-subtle"}
              onClick={() => navigate("/admin/products?section=publishing")}
            />
            <NumberTile
              label="לקוחות חדשים" value={numbers?.new_customers_this_week ?? 0} sub="בשבוע האחרון"
              icon={UserPlus} tone="bg-admin-accent-soft text-admin-accent"
              onClick={() => navigate("/admin/customers")}
            />
          </div>
        )}

        {/* ── the board ────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-baseline justify-between gap-2 pb-2">
            <h2 className="admin-section">דברים שדורשים טיפול</h2>
            <Button
              variant="ghost" size="sm"
              className="admin-focus gap-1.5 text-admin-ink-subtle"
              onClick={() => void load()}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              רענון
            </Button>
          </div>

          {firstLoad ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-64 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {COLUMNS.map((column) => (
                <BoardColumn
                  key={column.key}
                  column={column}
                  data={home?.board?.[column.key]}
                  onGo={(href) => navigate(href)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── what happened, and whether the platform is up ────────────── */}
        <div className="grid gap-3 lg:grid-cols-2">
          <section className="admin-card p-4">
            <h2 className="admin-section pb-2">פעילות אחרונה</h2>
            {firstLoad ? (
              <div className="space-y-2">
                {[0, 1, 2].map((index) => <Skeleton key={index} className="h-9 rounded-lg" />)}
              </div>
            ) : (home?.activity ?? []).length === 0 ? (
              <p className="admin-meta py-4 text-center">עוד לא נרשמה פעילות</p>
            ) : (
              <ul className="divide-y divide-admin-line">
                {(home?.activity ?? []).map((entry) => (
                  <li key={entry.id} className="flex items-center gap-2 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-admin-ink">
                        {ACTION_HE[entry.action] || entry.action}
                      </span>
                      <span className="admin-meta block truncate">{entry.actor}</span>
                    </span>
                    <span className="admin-meta shrink-0">{ago(entry.at)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Button
              variant="ghost" size="sm"
              className="admin-focus mt-1 gap-1 text-admin-ink-subtle"
              onClick={() => navigate("/admin/audit-log")}
            >
              ליומן המלא
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          </section>

          <section className="admin-card p-4">
            <h2 className="admin-section pb-2">מצב המערכת</h2>
            {firstLoad ? (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-9 rounded-lg" />)}
              </div>
            ) : (home?.health ?? []).length === 0 ? (
              // A screen that renders nothing here is indistinguishable from
              // one that failed to load. Say which it is.
              <p className="admin-meta py-4 text-center">אין בדיקות מוגדרות</p>
            ) : (
              <ul className="divide-y divide-admin-line">
                {(home?.health ?? []).map((check) => (
                  <li key={check.key} className="flex items-center gap-2.5 py-2">
                    <span
                      className={cn("h-2 w-2 shrink-0 rounded-full", HEALTH_TONE[check.state])}
                      aria-hidden
                    />
                    <span className="flex-1 truncate text-[13px] text-admin-ink">{check.label}</span>
                    <span className="admin-meta shrink-0">{check.detail}</span>
                    <span className="admin-meta w-16 shrink-0 text-left">{HEALTH_WORD[check.state]}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminHome;
