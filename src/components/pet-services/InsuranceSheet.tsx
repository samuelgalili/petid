/**
 * InsuranceSheet - Pet insurance recommendations by breed and age
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Check, ChevronLeft, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ServiceBottomSheet } from './ServiceBottomSheet';
import { Button } from '@/components/ui/button';

interface Pet {
  id: string;
  name: string;
  type: 'dog' | 'cat';
  breed?: string;
  age_years?: number;
  age_months?: number;
}

interface InsuranceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet | null;
}

export const InsuranceSheet = ({ isOpen, onClose, pet }: InsuranceSheetProps) => {
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);

  const { data: policies, isLoading } = useQuery({
    queryKey: ['insurance-policies', pet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pet_insurance_policies')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false });

      if (error) throw error;

      // Filter by pet type and breed
      return data?.filter(policy => {
        if (pet?.type && policy.suitable_pet_types) {
          if (!policy.suitable_pet_types.includes(pet.type)) return false;
        }
        if (pet?.breed && policy.suitable_breeds?.length) {
          if (!policy.suitable_breeds.includes(pet.breed)) return false;
        }
        return true;
      }) || [];
    },
    enabled: isOpen && !!pet,
  });

  const formatCoverage = (coverage: any) => {
    if (!coverage) return [];
    if (Array.isArray(coverage)) return coverage;
    if (typeof coverage === 'object') return Object.values(coverage);
    return [];
  };

  return (
    <ServiceBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`ביטוח ל${pet?.name || 'חיית המחמד'}`}
    >
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-muted/50 rounded-2xl p-4 animate-pulse h-40" />
          ))}
        </div>
      ) : policies?.length ? (
        <div className="space-y-4">
          {/* Info Banner */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/5 rounded-2xl p-4 flex gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Info className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-foreground font-medium">ביטוח מותאם אישית</p>
              <p className="text-xs text-muted-foreground">
                הביטוחים מותאמים לגזע ולגיל של {pet?.name}
              </p>
            </div>
          </motion.div>

          {/* Policies */}
          {policies.map((policy, index) => (
            <motion.div
              key={policy.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                selectedPolicy === policy.id 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border bg-card'
              }`}
              onClick={() => setSelectedPolicy(policy.id)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{policy.name}</h3>
                    <p className="text-xs text-muted-foreground">{policy.provider_name}</p>
                  </div>
                </div>
                {policy.is_featured && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    מומלץ
                  </span>
                )}
              </div>

              {/* Description */}
              {policy.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {policy.description}
                </p>
              )}

              {/* Coverage */}
              <div className="space-y-1.5 mb-4">
                {formatCoverage(policy.coverage_details).slice(0, 4).map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-foreground">{typeof item === 'string' ? item : item.name || item.title}</span>
                  </div>
                ))}
              </div>

              {/* Price */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div>
                  {policy.monthly_price && (
                    <div className="text-lg font-bold text-foreground">
                      ₪{policy.monthly_price}
                      <span className="text-xs text-muted-foreground font-normal">/חודש</span>
                    </div>
                  )}
                  {policy.annual_price && (
                    <p className="text-xs text-muted-foreground">
                      או ₪{policy.annual_price}/שנה
                    </p>
                  )}
                </div>
                <Button 
                  size="sm" 
                  className="rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Navigate to insurance details/purchase
                  }}
                >
                  פרטים נוספים
                  <ChevronLeft className="w-4 h-4 mr-1" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-center">
            אין כרגע הצעות ביטוח זמינות
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            נעדכן אותך כשיהיו הצעות חדשות
          </p>
        </div>
      )}
    </ServiceBottomSheet>
  );
};
