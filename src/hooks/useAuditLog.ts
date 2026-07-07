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
  const logAction = async (_entry: AuditLogEntry): Promise<void> => {
    // AWS audit persistence is not implemented yet. Keep callers safe.
  };

  return { logAction };
};

export default useAuditLog;
