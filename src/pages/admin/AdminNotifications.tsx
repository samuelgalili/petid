import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import {
  BarChart3,
  Bell,
  CheckCheck,
  ExternalLink,
  Inbox,
  Package,
  Settings,
  ShoppingCart,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminNotifications, type AdminAlert } from "@/hooks/useAdminNotifications";
import { getAdminNotificationLink } from "@/lib/adminNotificationLinks";
import { cn } from "@/lib/utils";

const categoryLabels: Record<string, string> = {
  analytics: "אנליטיקה",
  coupons: "קופונים",
  coupon: "קופונים",
  import: "ייבוא",
  inventory: "מוצרים",
  orders: "הזמנות",
  product: "מוצרים",
  products: "מוצרים",
  sales: "מכירות",
  scraper: "ייבוא",
  settings: "הגדרות",
};

const categoryIcons: Record<string, LucideIcon> = {
  analytics: BarChart3,
  coupons: Bell,
  coupon: Bell,
  import: Upload,
  inventory: Package,
  orders: ShoppingCart,
  product: Package,
  products: Package,
  sales: ShoppingCart,
  scraper: Upload,
  settings: Settings,
};

const getCategoryLabel = (category: string) => categoryLabels[category] || "מערכת";
const getCategoryIcon = (category: string) => categoryIcons[category] || Bell;

const AdminNotifications = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useAdminNotifications();

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ));
  }, [notifications]);

  const openNotification = (notification: AdminAlert) => {
    markAsRead(notification.id);
    navigate(getAdminNotificationLink(notification.category));
  };

  return (
    <AdminLayout
      title="מרכז התראות"
      icon={Bell}
      breadcrumbs={[{ label: "התראות" }]}
    >
      <div className="space-y-4" dir="rtl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">מרכז התראות</h1>
            <p className="text-sm text-muted-foreground">
              התראות מערכת, הזמנות וכלים שמצריכים תשומת לב מנהלית.
            </p>
          </div>

          <Button
            variant="outline"
            className="gap-2 self-start sm:self-auto"
            disabled={unreadCount === 0}
            onClick={markAllAsRead}
          >
            <CheckCheck className="h-4 w-4" />
            סמן הכל כנקרא
          </Button>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b">
            <CardTitle className="text-base">התראות פעילות</CardTitle>
            <Badge variant={unreadCount > 0 ? "default" : "secondary"}>
              {unreadCount} לא נקראו
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {sortedNotifications.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-4 text-center">
                <div className="rounded-full bg-muted p-4 text-muted-foreground">
                  <Inbox className="h-8 w-8" />
                </div>
                <div>
                  <p className="font-medium text-foreground">אין התראות פעילות</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    כשיהיו פעולות שמצריכות טיפול, הן יופיעו כאן.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y">
                {sortedNotifications.map((notification) => {
                  const Icon = getCategoryIcon(notification.category);

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-3 p-4 text-right transition-colors hover:bg-muted/50",
                        !notification.is_read && "bg-primary/5"
                      )}
                      onClick={() => openNotification(notification)}
                    >
                      <span className="mt-0.5 rounded-lg bg-muted p-2 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{notification.title}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {getCategoryLabel(notification.category)}
                          </Badge>
                        </span>
                        {notification.description && (
                          <span className="mt-1 block text-sm text-muted-foreground">
                            {notification.description}
                          </span>
                        )}
                        <span className="mt-2 block text-xs text-muted-foreground/70">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: he })}
                        </span>
                      </span>
                      <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminNotifications;
