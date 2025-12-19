import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  History, User, FileText, ShoppingCart, Package, 
  Ticket, Store, Heart, Bell, Settings, Shield, Filter
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, Column, FilterOption } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface AuditLogEntry {
  id: string;
  admin_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  admin?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

const actionLabels: Record<string, string> = {
  "user.blocked": "חסימת משתמש",
  "user.unblocked": "הסרת חסימה",
  "user.role_added": "הוספת תפקיד",
  "user.role_removed": "הסרת תפקיד",
  "user.password_reset": "איפוס סיסמה",
  "post.removed": "הסרת פוסט",
  "post.restored": "שחזור פוסט",
  "post.pinned": "הצמדת פוסט",
  "post.unpinned": "הסרת הצמדה",
  "report.resolved": "סגירת דיווח",
  "report.dismissed": "דחיית דיווח",
  "order.status_changed": "עדכון סטטוס הזמנה",
  "product.created": "יצירת מוצר",
  "product.updated": "עדכון מוצר",
  "product.deleted": "מחיקת מוצר",
  "coupon.created": "יצירת קופון",
  "coupon.updated": "עדכון קופון",
  "coupon.deleted": "מחיקת קופון",
  "business.verified": "אימות עסק",
  "business.unverified": "ביטול אימות עסק",
  "adoption.status_changed": "עדכון סטטוס אימוץ",
  "notification.sent": "שליחת התראה",
  "settings.updated": "עדכון הגדרות",
};

const entityIcons: Record<string, typeof User> = {
  user: User,
  post: FileText,
  story: FileText,
  reel: FileText,
  report: Shield,
  order: ShoppingCart,
  product: Package,
  coupon: Ticket,
  business: Store,
  adoption: Heart,
  notification: Bell,
  settings: Settings,
};

const getActionColor = (action: string): string => {
  if (action.includes("blocked") || action.includes("removed") || action.includes("deleted")) {
    return "bg-destructive/10 text-destructive border-destructive/20";
  }
  if (action.includes("created") || action.includes("verified") || action.includes("restored")) {
    return "bg-green-100 text-green-700 border-green-200";
  }
  return "bg-blue-100 text-blue-700 border-blue-200";
};

const AdminAudit = () => {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log" as any)
        .select(`
          *,
          admin:profiles!admin_audit_log_admin_id_fkey(full_name, avatar_url, email)
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as unknown as AuditLogEntry[];
    },
  });

  const columns: Column<AuditLogEntry>[] = [
    {
      key: "admin",
      header: "מנהל",
      render: (log) => (
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={log.admin?.avatar_url || undefined} />
            <AvatarFallback>{log.admin?.full_name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{log.admin?.full_name || "לא ידוע"}</p>
            <p className="text-xs text-muted-foreground">{log.admin?.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "action",
      header: "פעולה",
      render: (log) => {
        const Icon = entityIcons[log.entity_type] || History;
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <Badge variant="outline" className={`text-xs ${getActionColor(log.action_type)}`}>
                {actionLabels[log.action_type] || log.action_type}
              </Badge>
              {log.entity_id && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  ID: {log.entity_id.slice(0, 8)}...
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "entity_type",
      header: "סוג",
      render: (log) => {
        const labels: Record<string, string> = {
          user: "משתמש",
          post: "פוסט",
          story: "סטורי",
          reel: "ריל",
          report: "דיווח",
          order: "הזמנה",
          product: "מוצר",
          coupon: "קופון",
          business: "עסק",
          adoption: "אימוץ",
          notification: "התראה",
          settings: "הגדרות",
        };
        return (
          <span className="text-sm">{labels[log.entity_type] || log.entity_type}</span>
        );
      },
    },
    {
      key: "created_at",
      header: "תאריך ושעה",
      sortable: true,
      render: (log) => (
        <div className="text-sm">
          <p>{format(new Date(log.created_at), "d בMMM yyyy", { locale: he })}</p>
          <p className="text-muted-foreground">{format(new Date(log.created_at), "HH:mm:ss")}</p>
        </div>
      ),
    },
    {
      key: "details",
      header: "פרטים",
      render: (log) => {
        if (!log.new_values && !log.old_values) return <span className="text-muted-foreground">-</span>;
        
        return (
          <details className="text-xs">
            <summary className="cursor-pointer text-primary hover:underline">
              הצג פרטים
            </summary>
            <div className="mt-2 p-2 bg-muted rounded text-xs font-mono whitespace-pre-wrap max-w-xs overflow-auto">
              {log.new_values && (
                <div>
                  <span className="text-green-600">+</span> {JSON.stringify(log.new_values, null, 2)}
                </div>
              )}
              {log.old_values && (
                <div className="mt-1">
                  <span className="text-red-600">-</span> {JSON.stringify(log.old_values, null, 2)}
                </div>
              )}
            </div>
          </details>
        );
      },
    },
  ];

  const filters: FilterOption[] = [
    {
      key: "entity_type",
      label: "סוג ישות",
      options: [
        { value: "user", label: "משתמש" },
        { value: "post", label: "פוסט" },
        { value: "report", label: "דיווח" },
        { value: "order", label: "הזמנה" },
        { value: "product", label: "מוצר" },
        { value: "coupon", label: "קופון" },
        { value: "business", label: "עסק" },
        { value: "adoption", label: "אימוץ" },
      ],
    },
  ];

  return (
    <AdminLayout title="לוג פעילות" breadcrumbs={[{ label: "לוג פעילות" }]}>
      <DataTable
        data={logs}
        columns={columns}
        loading={isLoading}
        filters={filters}
        searchPlaceholder="חיפוש לפי פעולה או מנהל..."
        searchKey={(item, query) => 
          (actionLabels[item.action_type] || item.action_type).toLowerCase().includes(query.toLowerCase()) ||
          item.admin?.full_name?.toLowerCase().includes(query.toLowerCase()) ||
          item.entity_id?.toLowerCase().includes(query.toLowerCase()) ||
          false
        }
        emptyIcon={<History className="w-12 h-12" />}
        emptyMessage="אין פעילות עדיין"
        pageSize={20}
      />
    </AdminLayout>
  );
};

export default AdminAudit;
