/**
 * SmartSyncReviewModal — Shows "Current Value" vs "Detected Value" for each OCR field
 * with checkboxes for selective update approval.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCircle2, AlertCircle, User, Phone, MapPin,
  Dog, Calendar, Cpu, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [showCareTriggers, setShowCareTriggers] = useState(true);

  // Only show fields where detected differs from current
  const changedFields = useMemo(() =>
    fields.filter(f =>
      f.detectedValue &&
      f.detectedValue !== f.currentValue &&
      f.detectedValue.trim() !== ""
    ), [fields]);

  const allSelected = changedFields.length > 0 && changedFields.every(f => selectedKeys.has(f.key));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(changedFields.map(f => f.key)));
    }
  };

  const toggleField = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleConfirm = () => {
    const selected = changedFields.filter(f => selectedKeys.has(f.key));
    onConfirm(selected);
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
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-md max-h-[85vh] bg-card rounded-t-2xl sm:rounded-2xl border border-border/30 overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">סנכרון חכם</h3>
                <p className="text-[10px] text-muted-foreground">
                  {changedFields.length} שדות שונים זוהו
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted/50">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {changedFields.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">כל הנתונים מעודכנים!</p>
                <p className="text-[10px] text-muted-foreground mt-1">לא זוהו הבדלים בין המסמך לנתונים הקיימים</p>
              </div>
            ) : (
              <>
                {/* Select All */}
                <div
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20 cursor-pointer"
                  onClick={toggleAll}
                >
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  <span className="text-xs font-semibold text-primary">עדכן הכל ({changedFields.length})</span>
                </div>

                {/* Profile fields */}
                {profileFields.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-[11px] font-semibold text-indigo-600">פרטי בעלים</span>
                    </div>
                    {profileFields.map(f => (
                      <FieldRow
                        key={f.key}
                        field={f}
                        selected={selectedKeys.has(f.key)}
                        onToggle={() => toggleField(f.key)}
                      />
                    ))}
                  </div>
                )}

                {/* Pet fields */}
                {petFields.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Dog className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-[11px] font-semibold text-amber-700">פרטי חיית המחמד</span>
                    </div>
                    {petFields.map(f => (
                      <FieldRow
                        key={f.key}
                        field={f}
                        selected={selectedKeys.has(f.key)}
                        onToggle={() => toggleField(f.key)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Care triggers */}
            {hasCareTriggers && (
              <div className="space-y-2">
                <button
                  className="flex items-center gap-1.5 w-full"
                  onClick={() => setShowCareTriggers(!showCareTriggers)}
                >
                  <Calendar className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-[11px] font-semibold text-green-600">תזכורות טיפול אוטומטיות</span>
                  {showCareTriggers ? <ChevronUp className="w-3 h-3 ml-auto text-muted-foreground" /> : <ChevronDown className="w-3 h-3 ml-auto text-muted-foreground" />}
                </button>
                {showCareTriggers && (
                  <div className="p-2.5 rounded-xl bg-green-500/5 border border-green-500/20 space-y-1.5">
                    {vaccinesDetected.map((v, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <AlertCircle className="w-3 h-3 text-green-500 shrink-0" />
                        <span className="text-[10px] text-foreground">💉 {v} — תזכורת שנתית תיווצר</span>
                      </div>
                    ))}
                    {treatmentDatesDetected.map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                        <span className="text-[10px] text-foreground">📅 {t.name} — {t.date}</span>
                      </div>
                    ))}
                    <p className="text-[9px] text-muted-foreground mt-1">
                      * תזכורות יישלחו אוטומטית לפני מועד החיסון/טיפול הבא
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border/20 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 h-10 text-xs" onClick={onClose}>
              ביטול
            </Button>
            <Button
              size="sm"
              className="flex-1 h-10 text-xs"
              onClick={handleConfirm}
              disabled={loading || (changedFields.length > 0 && selectedKeys.size === 0)}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
              )}
              {changedFields.length === 0 ? "שמירה" : `עדכן ${selectedKeys.size} שדות`}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const FieldRow = ({
  field,
  selected,
  onToggle,
}: {
  field: FieldComparison;
  selected: boolean;
  onToggle: () => void;
}) => {
  const Icon = field.icon;
  const isNew = !field.currentValue || field.currentValue.trim() === "";

  return (
    <div
      className={`p-2.5 rounded-xl border cursor-pointer transition-colors ${
        selected
          ? "border-primary/30 bg-primary/5"
          : "border-border/20 bg-muted/30"
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-2">
        <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon className="w-3 h-3 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-[10px] font-medium text-muted-foreground">{field.label}</span>
            {isNew && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">
                חדש
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[8px] text-muted-foreground block mb-0.5">ערך נוכחי</span>
              <span className="text-[10px] text-foreground/60 block truncate">
                {field.currentValue || "—"}
              </span>
            </div>
            <div>
              <span className="text-[8px] text-primary block mb-0.5">ערך שזוהה</span>
              <span className="text-[10px] text-foreground font-medium block truncate">
                {field.detectedValue || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
