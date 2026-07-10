/**
 * InsuranceSheet - Pet insurance recommendations by breed and age
 * Shows existing policy if pet has insurance, otherwise shows available packages
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Check, ChevronLeft, Info, FileText, Calendar, Building2, Hash, AlertTriangle } from 'lucide-react';
import { ServiceBottomSheet } from './ServiceBottomSheet';
import { Button } from '@/components/ui/button';
import { DocumentsSection } from './DocumentsSection';
import { format, isPast, isAfter, addMonths } from 'date-fns';
import { he } from 'date-fns/locale';

interface Pet {
  id: string;
  name: string;
  type: 'dog' | 'cat';
  breed?: string;
  age_years?: number;
  age_months?: number;
  has_insurance?: boolean | null;
  insurance_company?: string | null;
  insurance_expiry_date?: string | null;
  insurance_policy_number?: string | null;
}

interface InsuranceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet | null;
}

interface PetInsuranceData {
  has_insurance: boolean | null;
  insurance_company: string | null;
  insurance_expiry_date: string | null;
  insurance_policy_number: string | null;
}

interface InsurancePolicy {
  id: string;
  name: string;
  provider_name: string;
  description: string;
  coverage_details: Array<string | { name?: string; title?: string }>;
  monthly_price: number;
  annual_price: number;
  is_featured: boolean;
  suitable_pet_types: Array<'dog' | 'cat'>;
}

const INSURANCE_POLICIES: InsurancePolicy[] = [
  {
    id: 'health-basic',
    name: 'כיסוי בריאות בסיסי',
    provider_name: 'Mipo Partners',
    description: 'כיסוי לביקורים, בדיקות וטיפולים נפוצים.',
    coverage_details: ['ביקורי וטרינר', 'בדיקות מעבדה', 'החזרים על תרופות', 'מוקד ייעוץ'],
    monthly_price: 69,
    annual_price: 760,
    is_featured: false,
    suitable_pet_types: ['dog', 'cat'],
  },
  {
    id: 'health-plus',
    name: 'כיסוי בריאות מורחב',
    provider_name: 'Mipo Partners',
    description: 'מסלול רחב יותר למקרי חירום, ניתוחים והחזרים גבוהים יותר.',
    coverage_details: ['חירום וניתוחים', 'אבחון מתקדם', 'חיסונים שנתיים', 'החזרים מוגדלים'],
    monthly_price: 119,
    annual_price: 1290,
    is_featured: true,
    suitable_pet_types: ['dog', 'cat'],
  },
];

export const InsuranceSheet = ({ isOpen, onClose, pet }: InsuranceSheetProps) => {
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);
  const [showPackages, setShowPackages] = useState(false);

  const petInsurance: PetInsuranceData | null = pet ? {
    has_insurance: pet.has_insurance ?? false,
    insurance_company: pet.insurance_company || null,
    insurance_expiry_date: pet.insurance_expiry_date || null,
    insurance_policy_number: pet.insurance_policy_number || null,
  } : null;

  const policies = INSURANCE_POLICIES.filter((policy) => !pet?.type || policy.suitable_pet_types.includes(pet.type))
    .sort((a, b) => Number(b.is_featured) - Number(a.is_featured));

  const formatCoverage = (
    coverage: InsurancePolicy['coverage_details'],
  ): Array<string | { name?: string; title?: string }> => Array.isArray(coverage) ? coverage : [];

  const hasActiveInsurance = petInsurance?.has_insurance === true;
  const isExpiringSoon = petInsurance?.insurance_expiry_date
    ? isAfter(new Date(petInsurance.insurance_expiry_date), new Date()) &&
      !isAfter(new Date(petInsurance.insurance_expiry_date), addMonths(new Date(), 2))
    : false;
  const isExpired = petInsurance?.insurance_expiry_date
    ? isPast(new Date(petInsurance.insurance_expiry_date))
    : false;

  const isLoading = false;

  // Decide what to show: existing policy or packages
  const showExistingPolicy = hasActiveInsurance && !showPackages;

  return (
    <ServiceBottomSheet
      isOpen={isOpen}
      onClose={() => { onClose(); setShowPackages(false); }}
      title={`ביטוח ל${pet?.name || 'חיית המחמד'}`}
    >
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-muted/50 rounded-2xl p-4 animate-pulse h-40" />
          ))}
        </div>
      ) : showExistingPolicy ? (
        /* ── Existing Policy View ── */
        <div className="space-y-4">
          {/* Status Banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl p-4 flex gap-3 ${
              isExpired
                ? 'bg-destructive/10'
                : isExpiringSoon
                ? 'bg-[hsla(45,93%,58%,0.1)]'
                : 'bg-[hsla(142,71%,45%,0.08)]'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isExpired
                ? 'bg-destructive/15'
                : isExpiringSoon
                ? 'bg-[hsla(45,93%,58%,0.15)]'
                : 'bg-[hsla(142,71%,45%,0.12)]'
            }`}>
              {isExpired ? (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              ) : (
                <Shield className="w-5 h-5 text-[hsl(142,71%,45%)]" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {isExpired ? 'הביטוח פג תוקף' : isExpiringSoon ? 'הביטוח עומד לפוג' : 'מבוטח ✓'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isExpired
                  ? 'מומלץ לחדש את הביטוח בהקדם'
                  : isExpiringSoon
                  ? 'כדאי לבדוק חידוש בקרוב'
                  : `${pet?.name} מכוסה בביטוח בריאות`}
              </p>
            </div>
          </motion.div>

          {/* Policy Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border bg-card p-5 space-y-4"
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">פוליסת ביטוח</h3>
                <p className="text-xs text-muted-foreground">פרטי הפוליסה הנוכחית</p>
              </div>
            </div>

            <div className="space-y-3">
              {petInsurance?.insurance_company && (
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">חברת ביטוח</p>
                    <p className="text-sm font-medium text-foreground">{petInsurance.insurance_company}</p>
                  </div>
                </div>
              )}

              {petInsurance?.insurance_policy_number && (
                <div className="flex items-center gap-3">
                  <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">מספר פוליסה</p>
                    <p className="text-sm font-medium text-foreground font-mono">{petInsurance.insurance_policy_number}</p>
                  </div>
                </div>
              )}

              {petInsurance?.insurance_expiry_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">תוקף עד</p>
                    <p className={`text-sm font-medium ${isExpired ? 'text-destructive' : isExpiringSoon ? 'text-[hsl(45,93%,58%)]' : 'text-foreground'}`}>
                      {format(new Date(petInsurance.insurance_expiry_date), 'dd MMMM yyyy', { locale: he })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2"
          >
            <Button
              variant="outline"
              className="flex-1 rounded-full text-sm"
              onClick={() => setShowPackages(true)}
            >
              <FileText className="w-4 h-4 ml-1.5" />
              {isExpired || isExpiringSoon ? 'חידוש / שדרוג' : 'צפייה בחבילות'}
            </Button>
          </motion.div>
        </div>
      ) : (
        /* ── Available Packages View ── */
        <div className="space-y-4">
          {/* Back button if coming from existing policy */}
          {hasActiveInsurance && showPackages && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowPackages(false)}
              className="text-sm text-primary font-medium flex items-center gap-1"
            >
              חזרה לפוליסה שלי
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </motion.button>
          )}

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
          {policies?.length ? (
            policies.map((policy, index) => (
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
                  {formatCoverage(policy.coverage_details).slice(0, 4).map((item, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-[hsl(142,71%,45%)]" />
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
                    }}
                  >
                    פרטים נוספים
                    <ChevronLeft className="w-4 h-4 mr-1" />
                  </Button>
                </div>
              </motion.div>
            ))
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
        </div>
      )}
      
      {/* Documents Section */}
      {pet && (
        <DocumentsSection 
          petId={pet.id} 
          category="insurance" 
          title="מסמכי ביטוח ופוליסות"
        />
      )}
    </ServiceBottomSheet>
  );
};
