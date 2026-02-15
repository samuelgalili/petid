/**
 * ClaimsHistory - Shows insurance claim status history within the health tab
 * Displays pending / approved / paid / denied claims with smart recommendations
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Clock, CheckCircle2, Banknote, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ClaimsHistoryProps {
  petId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'בטיפול', color: 'text-amber-600 bg-amber-500/10', icon: Clock },
  approved: { label: 'אושר', color: 'text-blue-600 bg-blue-500/10', icon: CheckCircle2 },
  paid: { label: 'שולם', color: 'text-green-600 bg-green-500/10', icon: Banknote },
  denied: { label: 'נדחה', color: 'text-red-600 bg-red-500/10', icon: AlertCircle },
};

export const ClaimsHistory = ({ petId }: ClaimsHistoryProps) => {
  const [expanded, setExpanded] = useState(false);

  const { data: claims, isLoading } = useQuery({
    queryKey: ['insurance-claims', petId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('insurance_claims')
        .select('*')
        .eq('pet_id', petId)
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!petId,
  });

  if (isLoading || !claims || claims.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4"
    >
      <div className="bg-card rounded-2xl border border-border/30 overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" strokeWidth={1.5} />
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-foreground">תביעות ביטוח</span>
              <span className="text-xs text-muted-foreground mr-2">({claims.length})</span>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-2.5">
                {claims.map((claim: any) => {
                  const cfg = STATUS_CONFIG[claim.status] || STATUS_CONFIG.pending;
                  const StatusIcon = cfg.icon;

                  return (
                    <div key={claim.id} className="p-3 bg-muted/30 rounded-xl border border-border/20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                          {claim.total_amount && (
                            <span className="text-xs font-medium text-foreground">₪{claim.total_amount}</span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(claim.submitted_at).toLocaleDateString("he-IL")}
                        </span>
                      </div>

                      {claim.diagnosis && (
                        <p className="text-xs text-foreground mb-1">{claim.diagnosis}</p>
                      )}

                      {claim.clinic_name && (
                        <p className="text-[10px] text-muted-foreground">{claim.clinic_name}</p>
                      )}

                      {claim.paid_amount && claim.status === 'paid' && (
                        <div className="mt-2 p-2 bg-green-500/5 rounded-lg">
                          <p className="text-[10px] font-medium text-green-700">
                            שולם: ₪{claim.paid_amount}
                          </p>
                        </div>
                      )}

                      {/* Smart recommendation for denied claims under deductible */}
                      {claim.status === 'denied' && (
                        <div className="mt-2 p-2.5 bg-blue-500/5 rounded-lg border border-blue-500/10">
                          <p className="text-[10px] text-blue-700 leading-relaxed">
                            {claim.status_note || 'הפעם זה מתחת להשתתפות העצמית, אבל התיעוד נשמר במערכת למקרה של המשך טיפול.'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
