/**
 * SarahDataGapAlert — Proactive "Data Gap" bubble from Sarah (Support Bot).
 * Shows a minimal toast-like card when critical pet fields are missing,
 * with a one-field smart form and a reward "Science Update" card.
 */
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, CheckCircle2, HeartPulse } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDataGapAlert, type DataGap } from "@/hooks/useDataGapAlert";
import { supabase } from "@/integrations/supabase/client";

/* ── Science reward snippets ── */
function getScienceReward(field: string, value: string, petName: string): string {
  if (field === "weight") {
    const w = parseFloat(value);
    if (!isNaN(w)) {
      const kcal = Math.round(70 * Math.pow(w, 0.75));
      return `Based on ${petName}'s ${w}kg weight, the recommended daily intake is ~${kcal} kcal.`;
    }
  }
  if (field === "birth_date") {
    const weeks = Math.floor((Date.now() - new Date(value).getTime()) / (7 * 24 * 60 * 60 * 1000));
    const years = (weeks / 52).toFixed(1);
    return `${petName} is approximately ${years} years old (${weeks} weeks). Age-specific health insights are now active.`;
  }
  if (field === "breed") {
    return `Breed set to ${value}. Breed-specific nutrition, exercise, and health risk data is now available for ${petName}.`;
  }
  return `Profile updated. ${petName}'s personalized recommendations have been refreshed.`;
}

/* ── Main component ── */
const SarahDataGapAlert: React.FC = () => {
  const { pet, loading, firstGap, totalGaps } = useDataGapAlert();
  const [dismissed, setDismissed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [reward, setReward] = useState<string | null>(null);
  const [currentGap, setCurrentGap] = useState<DataGap | null>(null);

  // Reset when active pet changes
  useEffect(() => {
    setDismissed(false);
    setShowForm(false);
    setReward(null);
    setInputValue("");
  }, [pet?.id]);

  // Track which gap we're working with
  useEffect(() => {
    if (firstGap && !currentGap) setCurrentGap(firstGap);
  }, [firstGap, currentGap]);

  const handleSubmit = useCallback(async () => {
    if (!pet?.id || !currentGap || !inputValue.trim()) return;
    setSaving(true);
    try {
      let dbValue: any = inputValue.trim();
      if (currentGap.inputType === "number") dbValue = parseFloat(dbValue);

      const { error } = await supabase
        .from("pets")
        .update({ [currentGap.dbColumn]: dbValue })
        .eq("id", pet.id);

      if (!error) {
        const rewardText = getScienceReward(currentGap.field, inputValue.trim(), pet.name);
        setReward(rewardText);
        setShowForm(false);
      }
    } finally {
      setSaving(false);
    }
  }, [pet, currentGap, inputValue]);

  const handleDismissReward = () => {
    setReward(null);
    setCurrentGap(null);
    setDismissed(true);
  };

  // Don't show if loading, no pet, no gaps, or dismissed
  if (loading || !pet || !firstGap || dismissed) return null;

  return (
    <AnimatePresence>
      {/* ── Reward Card ── */}
      {reward && (
        <motion.div
          key="reward"
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm"
        >
          <div className="rounded-[20px] bg-card border border-border shadow-elevated p-6 h-auto" dir="rtl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-accent flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-xs font-semibold text-muted-foreground mb-1" dir="ltr" style={{ textAlign: 'right' }}>Science Update</p>
                <p className="text-sm text-foreground leading-relaxed" style={{ wordBreak: 'break-word', unicodeBidi: 'plaintext' }} dir="auto">{reward}</p>
              </div>
              <button onClick={handleDismissReward} className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Smart Form ── */}
      {showForm && currentGap && !reward && (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm"
        >
          <div className="rounded-[20px] bg-card border border-border shadow-elevated p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <HeartPulse className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {currentGap.labelHe} של {pet.name}
                </span>
              </div>
              <button onClick={() => { setShowForm(false); setDismissed(true); }} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  type={currentGap.inputType === "boolean" ? "text" : currentGap.inputType}
                  placeholder={currentGap.placeholder}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="rounded-xl pr-10"
                  autoFocus
                />
                {currentGap.unit && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {currentGap.unit}
                  </span>
                )}
              </div>
              <Button
                onClick={handleSubmit}
                disabled={saving || !inputValue.trim()}
                className="rounded-xl px-5"
                size="default"
              >
                {saving ? "..." : "שמור"}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Proactive Toast Bubble ── */}
      {!showForm && !reward && (
        <motion.div
          key="bubble"
          initial={{ opacity: 0, y: 60, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", damping: 22, stiffness: 280, delay: 1.5 }}
          className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm"
        >
          <div className="rounded-[20px] bg-card border border-border shadow-elevated p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary mb-0.5">שרה מ-PetID</p>
                <p className="text-sm text-foreground leading-relaxed">
                  היי! חסר לי ה{firstGap.labelHe} של {pet.name} כדי לתת המלצות מדויקות 🐾
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => { setCurrentGap(firstGap); setShowForm(true); }}
                    className="rounded-xl text-xs px-4 h-8"
                  >
                    השלם עכשיו
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDismissed(true)}
                    className="rounded-xl text-xs px-3 h-8 text-muted-foreground"
                  >
                    לא עכשיו
                  </Button>
                </div>
              </div>
              <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground transition-colors mt-0.5">
                <X className="w-4 h-4" />
              </button>
            </div>
            {totalGaps > 1 && (
              <p className="text-[11px] text-muted-foreground mt-2 text-center">
                {totalGaps} פרטים חסרים בפרופיל
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SarahDataGapAlert;
