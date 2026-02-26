import { supabase } from "@/integrations/supabase/client";

/**
 * Utility to log agent data access for privacy audit trail.
 * Call this whenever an AI agent accesses personal data.
 */
export const logAgentDataAccess = async (params: {
  agentSlug: string;
  agentName: string;
  actionType?: "read" | "write" | "delete" | "analyze";
  entityType: string;
  entityId?: string;
  userId?: string;
  dataFields?: string[];
  reason?: string;
  route?: string;
}) => {
  try {
    await supabase.from("agent_data_access_log" as any).insert({
      agent_slug: params.agentSlug,
      agent_name: params.agentName,
      action_type: params.actionType || "read",
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      user_id: params.userId || null,
      data_fields: params.dataFields || null,
      reason: params.reason || null,
      route: params.route || window.location.pathname,
    } as any);
  } catch {
    // Silent — don't block on audit logging
  }
};
