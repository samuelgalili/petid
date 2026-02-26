/**
 * SmartSyncReviewModal — Premium "Review & Sync" modal for the OCR flow
 * Features: green highlights for new/changed data, smart 3-category grouping,
 * check-all toggle, celebration animation on confirm.
 */

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCircle2, User, Phone, MapPin,
  Dog, Calendar, Cpu, Loader2, Syringe, Stethoscope,
  Sparkles, ShieldCheck, PawPrint, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import confetti from "canvas-confetti";

interface FieldComparison {
  key: string;
  label: string;
  icon: React.ElementType;
  currentValue: string | null;
  detectedValue: string | null;
  table: "profiles" | "pets";
  dbField: string;
}

interface SmartSyncReviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedFields: FieldComparison[]) => void;
  fields: FieldComparison[];
  loading?: boolean;
  vaccinesDetected?: string[];
  treatmentDatesDetected?: { name: string; date: string }[];
}

export type { FieldComparison };

const fireCelebration = () => {
  const defaults = { startVelocity: 20, spread: 360, ticks: 80, zIndex: 9999 };
  const pawColors = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899"];
  confetti({ ...defaults, particleCount: 60, origin: { x: 0.3, y: 0.6 }, colors: pawColors });
  confetti({ ...defaults, particleCount: 60, origin: { x: 0.7, y: 0.6 }, colors: pawColors });
  setTimeout(() => {
    confetti({ ...defaults, particleCount: 40, origin: { x: 0.5, y: 0.4 }, colors: pawColors });
  }, 200);
};

export const SmartSyncReviewModal = ({
  open,
  onClose,
  onConfirm,
  fields,
  loading,
  vaccinesDetected = [],
  treatmentDatesDetected = [],
}: SmartSyncReviewModalProps) => {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [showSuccess, setShowSuccess] = useState(false);

  const changedFields = useMemo(() =>
    fields.filter(f =>
      f.detectedValue &&
      f.detectedValue !== f.currentValue &&
      f.detectedValue.trim() !== ""
    ), [fields]);

  const allSelected = changedFields.length > 0 && changedFields.every(f => selectedKeys.has(f.key));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(changedFields.map(f => f.key)));
    }
  }, [allSelected, changedFields]);

  const toggleField = useCallback((key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleConfirm = () => {
    const selected = changedFields.filter(f => selectedKeys.has(f.key));
    setShowSuccess(true);
    fireCelebration();
    setTimeout(() => {
      onConfirm(selected);
    }, 1800);
  };

  const profileFields = changedFields.filter(f => f.table === "profiles");
  const petFields = changedFields.filter(f => f.table === "pets");
  const hasCareTriggers = vaccinesDetected.length > 0 || treatmentDatesDetected.length > 0;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

        <motion.div
          initial={{ y: "100%", scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: "100%", scale: 0.95 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative w-full max-w-md max-h-[88vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col mb-[calc(env(safe-area-inset-bottom)+80px)] sm:mb-0"
          style={{
            background: "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.3), 0 0 0 1px hsl(var(--border) / 0.15)",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Success overlay */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/95 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                  className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center mb-4"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    <PawPrint className="w-10 h-10 text-green-500" strokeWidth={1.5} />
                  </motion.div>
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-lg font-bold text-foreground"
                >
                  הפרופיל עודכן! 🐾
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-xs text-muted-foreground mt-1"
                >
                  Profile & Care Plan Updated!
                </motion.p>
                {hasCareTriggers && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10"
                  >
                    <Calendar className="w-3 h-3 text-primary" />
                    <span className="text-[10px] text-primary font-medium">
                      {vaccinesDetected.length + treatmentDatesDetected.length} תזכורות טיפול נוצרו
                    </span>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Decorative header gradient */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-green-500/5" />
            <div className="relative p-5 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10"
                  >
                    <Sparkles className="w-5 h-5 text-primary" />
                  </motion.div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">סנכרון חכם</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {changedFields.length > 0
                        ? `${changedFields.length} עדכונים זוהו מהמסמך`
                        : "כל הנתונים מעודכנים"}
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted/60 transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
            {changedFields.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10"
              >
                <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-7 h-7 text-green-500" />
                </div>
                <p className="text-sm font-semibold text-foreground">כל הנתונים מעודכנים!</p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-[250px] mx-auto">
                  לא זוהו הבדלים בין המסמך לנתונים הקיימים במערכת
                </p>
              </motion.div>
            ) : (
              <>
                {/* Select All toggle */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 rounded-2xl bg-primary/5 border border-primary/15"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-primary">סמן הכל</span>
                    <span className="text-[10px] text-primary/60">({changedFields.length} שדות)</span>
                  </div>
                  <Switch checked={allSelected} onCheckedChange={toggleAll} />
                </motion.div>

                {/* Category: User Details */}
                {profileFields.length > 0 && (
                  <CategorySection
                    icon={User}
                    title="פרטי בעלים"
                    subtitle="User Details"
                    color="indigo"
                    fields={profileFields}
                    selectedKeys={selectedKeys}
                    onToggle={toggleField}
                    delay={0.1}
                  />
                )}

                {/* Category: Pet Details */}
                {petFields.length > 0 && (
                  <CategorySection
                    icon={Dog}
                    title="פרטי חיית המחמד"
                    subtitle="Pet Details"
                    color="amber"
                    fields={petFields}
                    selectedKeys={selectedKeys}
                    onToggle={toggleField}
                    delay={0.2}
                  />
                )}

                {/* Category: Medical Events */}
                {hasCareTriggers && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-6 h-6 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <Syringe className="w-3.5 h-3.5 text-green-500" />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-green-700 dark:text-green-400">אירועים רפואיים</span>
                        <span className="text-[9px] text-muted-foreground block">Medical Events</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-green-500/15 bg-green-500/[0.03] overflow-hidden">
                      {vaccinesDetected.map((v, i) => (
                        <div
                          key={`vax-${i}`}
                          className={`flex items-center gap-3 p-3 ${i > 0 ? "border-t border-green-500/10" : ""}`}
                        >
                          <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                            <Syringe className="w-3.5 h-3.5 text-green-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-medium text-foreground block">{v}</span>
                            <span className="text-[9px] text-green-600 dark:text-green-400">תזכורת חידוש שנתית תיווצר אוטומטית</span>
                          </div>
                          <div className="px-2 py-0.5 rounded-full bg-green-500/10">
                            <span className="text-[8px] font-medium text-green-600">אוטומטי</span>
                          </div>
                        </div>
                      ))}
                      {treatmentDatesDetected.map((t, i) => (
                        <div
                          key={`treat-${i}`}
                          className="flex items-center gap-3 p-3 border-t border-green-500/10"
                        >
                          <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-medium text-foreground block">{t.name}</span>
                            <span className="text-[9px] text-muted-foreground">{t.date}</span>
                          </div>
                          <div className="px-2 py-0.5 rounded-full bg-blue-500/10">
                            <span className="text-[8px] font-medium text-blue-600">תזכורת</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-muted-foreground px-1 flex items-center gap-1">
                      <Stethoscope className="w-3 h-3 inline" />
                      תזכורות Push יישלחו אוטומטית לפני מועד הטיפול
                    </p>
                  </motion.div>
                )}
              </>
            )}
          </div>

          {/* Footer CTA */}
          <div className="p-4 border-t border-border/15 bg-card/80 backdrop-blur-sm">
            <div className="flex gap-2.5">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-11 text-xs rounded-xl border-border/30"
                onClick={onClose}
              >
                ביטול
              </Button>
              <Button
                size="sm"
                className="flex-[2] h-11 text-xs rounded-xl bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 text-white shadow-lg shadow-primary/20 gap-1.5"
                onClick={handleConfirm}
                disabled={loading || showSuccess || (changedFields.length > 0 && selectedKeys.size === 0)}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <PawPrint className="w-4 h-4" />
                    <span>עדכון הפרופיל ו-PetID</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ─── Category Section ─── */
const CategorySection = ({
  icon: Icon,
  title,
  subtitle,
  color,
  fields,
  selectedKeys,
  onToggle,
  delay = 0,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color: string;
  fields: FieldComparison[];
  selectedKeys: Set<string>;
  onToggle: (key: string) => void;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="space-y-2"
  >
    <div className="flex items-center gap-2 px-1">
      <div className={`w-6 h-6 rounded-lg bg-${color}-500/10 flex items-center justify-center`}>
        <Icon className={`w-3.5 h-3.5 text-${color}-500`} />
      </div>
      <div>
        <span className={`text-[11px] font-semibold text-${color}-700 dark:text-${color}-400`}>{title}</span>
        <span className="text-[9px] text-muted-foreground block">{subtitle}</span>
      </div>
    </div>

    <div className="rounded-2xl border border-border/15 overflow-hidden bg-card/50">
      {fields.map((f, i) => (
        <ComparisonRow
          key={f.key}
          field={f}
          selected={selectedKeys.has(f.key)}
          onToggle={() => onToggle(f.key)}
          isLast={i === fields.length - 1}
        />
      ))}
    </div>
  </motion.div>
);

/* ─── Comparison Row ─── */
const ComparisonRow = ({
  field,
  selected,
  onToggle,
  isLast,
}: {
  field: FieldComparison;
  selected: boolean;
  onToggle: () => void;
  isLast: boolean;
}) => {
  const Icon = field.icon;
  const isNew = !field.currentValue || field.currentValue.trim() === "";
  const isChanged = !isNew && field.detectedValue !== field.currentValue;

  return (
    <div
      className={`p-3 cursor-pointer transition-all duration-200 ${
        selected ? "bg-primary/[0.04]" : "hover:bg-muted/30"
      } ${!isLast ? "border-b border-border/10" : ""}`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-2.5">
        <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-1" />
        <div className="flex-1 min-w-0">
          {/* Label row */}
          <div className="flex items-center gap-1.5 mb-2">
            <Icon className="w-3 h-3 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-[10px] font-medium text-muted-foreground">{field.label}</span>
            {isNew && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 font-semibold">
                חדש ✨
              </span>
            )}
            {isChanged && !isNew && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-semibold">
                שונה
              </span>
            )}
          </div>

          {/* Values comparison */}
          <div className="grid grid-cols-2 gap-3">
            {/* Current */}
            <div className="rounded-lg bg-muted/40 p-2">
              <span className="text-[8px] text-muted-foreground font-medium block mb-0.5">נוכחי</span>
              <span className="text-[11px] text-foreground/50 block truncate leading-tight">
                {field.currentValue || "—"}
              </span>
            </div>
            {/* Detected — highlighted */}
            <div className={`rounded-lg p-2 ${
              isNew
                ? "bg-green-500/8 ring-1 ring-green-500/20"
                : isChanged
                  ? "bg-green-500/8 ring-1 ring-green-500/20"
                  : "bg-muted/40"
            }`}>
              <span className={`text-[8px] font-medium block mb-0.5 ${
                isNew || isChanged ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
              }`}>
                {isNew ? "זוהה ✨" : "זוהה"}
              </span>
              <span className={`text-[11px] block truncate leading-tight font-medium ${
                isNew || isChanged ? "text-green-700 dark:text-green-300" : "text-foreground"
              }`}>
                {field.detectedValue || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
