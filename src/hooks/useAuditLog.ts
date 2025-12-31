import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AuditAction = 
  | "user.blocked"
  | "user.unblocked"
  | "user.deleted"
  | "user.role_added"
  | "user.role_removed"
  | "user.password_reset"
  | "post.removed"
  | "post.restored"
  | "post.pinned"
  | "post.unpinned"
  | "report.resolved"
  | "report.dismissed"
  | "order.status_changed"
  | "product.created"
  | "product.updated"
  | "product.deleted"
  | "coupon.created"
  | "coupon.updated"
  | "coupon.deleted"
  | "business.verified"
  | "business.unverified"
  | "adoption.status_changed"
  | "notification.sent"
  | "settings.updated";

export type EntityType = 
  | "user"
  | "post"
  | "story"
  | "reel"
  | "report"
  | "order"
  | "product"
  | "coupon"
  | "business"
  | "adoption"
  | "notification"
  | "settings";

interface AuditLogEntry {
  action_type: AuditAction;
  entity_type: EntityType;
  entity_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export const useAuditLog = () => {
  const { user } = useAuth();

  const logAction = async (entry: AuditLogEntry): Promise<void> => {
    if (!user) return;

    try {
      const { error } = await supabase.from("admin_audit_log" as any).insert({
        admin_id: user.id,
        action_type: entry.action_type,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        old_values: entry.old_values,
        new_values: entry.new_values,
        metadata: entry.metadata,
        ip_address: null,
        user_agent: navigator.userAgent,
      } as any);

      if (error) {
        console.error("Failed to log audit action:", error);
      }
    } catch (err) {
      console.error("Audit log error:", err);
    }
  };

  return { logAction };
};

export default useAuditLog;
