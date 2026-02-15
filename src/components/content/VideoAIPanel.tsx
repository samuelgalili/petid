/**
 * VideoAIPanel — AI auto-tagging, safety filter, and reward visualization
 * for video posts in the Content Creator flow.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  ShoppingBag,
  BadgeCheck,
  Heart,
  X,
  ScanSearch,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DetectedProduct {
  id: string;
  name: string;
  price: string;
  verified_purchase?: boolean;
}

interface SafetyIssue {
  type: string;
  description: string;
  severity: "high" | "medium";
}

interface AnalysisResult {
  products: DetectedProduct[];
  breed_detected: string | null;
  safety_issues: SafetyIssue[];
  is_dangerous: boolean;
  danger_message?: string;
  description?: string;
  suggested_caption?: string;
  health_score_current?: number | null;
  health_score_improvement?: string;
  health_score_tip?: string;
}

interface VideoAIPanelProps {
  videoElement: HTMLVideoElement | null;
  petName: string | null;
  petBreed: string | null;
  userId: string | null;
  onProductsTagged: (products: DetectedProduct[]) => void;
  onSafetyBlock: (message: string) => void;
  onCaptionGenerated?: (caption: string) => void;
}

export const VideoAIPanel = ({
  videoElement,
  petName,
  petBreed,
  userId,
  onProductsTagged,
  onSafetyBlock,
  onCaptionGenerated,
}: VideoAIPanelProps) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [taggedProducts, setTaggedProducts] = useState<Set<string>>(new Set());

  const captureFrame = (): string | null => {
    if (!videoElement) return null;
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7).split(",")[1]; // base64 without prefix
  };

  const handleScan = async () => {
    if (!videoElement) {
      toast.error("אין סרטון לסריקה");
      return;
    }

    setScanning(true);
    setResult(null);

    try {
      // Pause at current frame for analysis
      videoElement.pause();
      const frame = captureFrame();
      if (!frame) throw new Error("Failed to capture frame");

      const { data, error } = await supabase.functions.invoke("video-analyze", {
        body: {
          frame_base64: frame,
          pet_name: petName,
          pet_breed: petBreed,
          user_id: userId,
        },
      });

      if (error) throw error;

      setResult(data);

      // Safety check
      if (data.is_dangerous) {
        onSafetyBlock(
          data.danger_message || "זוהה תוכן מסוכן בסרטון. לא ניתן לפרסם."
        );
        return;
      }

      // Pass suggested caption up
      if (data.suggested_caption && onCaptionGenerated) {
        onCaptionGenerated(data.suggested_caption);
      }

      if (data.products?.length > 0) {
        toast.success(`זוהו ${data.products.length} מוצרים בסרטון!`);
      } else {
        toast("לא זוהו מוצרים ספציפיים בפריים הנוכחי", {
          icon: <ScanSearch className="w-4 h-4 text-muted-foreground" />,
        });
      }
    } catch (err: any) {
      console.error("Scan error:", err);
      toast.error("שגיאה בסריקת הסרטון");
    } finally {
      setScanning(false);
    }
  };

  const toggleTag = (product: DetectedProduct) => {
    const next = new Set(taggedProducts);
    if (next.has(product.id)) {
      next.delete(product.id);
    } else {
      next.add(product.id);
    }
    setTaggedProducts(next);
    onProductsTagged(
      (result?.products || []).filter((p) => next.has(p.id))
    );
  };

  return (
    <div className="space-y-3">
      {/* Scan button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleScan}
        disabled={scanning || !videoElement}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
          scanning
            ? "bg-primary/10 text-primary"
            : "bg-gradient-to-l from-primary/20 to-primary/5 text-primary border border-primary/20 hover:from-primary/30 hover:to-primary/10"
        )}
      >
        {scanning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            סורק מוצרים בסרטון...
          </>
        ) : (
          <>
            <ScanSearch className="w-4 h-4" strokeWidth={1.5} />
            סרוק מוצרים בסרטון
          </>
        )}
      </motion.button>

      {/* Results */}
      <AnimatePresence>
        {result && !result.is_dangerous && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-3"
          >
            {/* Detected products */}
            {result.products.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground px-1">
                  מוצרים שזוהו:
                </p>
                {result.products.map((product) => (
                  <motion.button
                    key={product.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => toggleTag(product)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-right",
                      taggedProducts.has(product.id)
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/40 bg-card hover:border-primary/20"
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {product.name}
                        </p>
                        {product.verified_purchase && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            <BadgeCheck className="w-3 h-3" />
                            קנייה מאומתת
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">₪{product.price}</p>
                    </div>

                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                        taggedProducts.has(product.id)
                          ? "border-primary bg-primary"
                          : "border-border"
                      )}
                    >
                      {taggedProducts.has(product.id) && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
                      )}
                    </div>
                  </motion.button>
                ))}

                {/* Suggestion prompt */}
                {petName && result.products.length > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-xs text-primary/80 text-center py-1"
                  >
                    נראה ש{petName} נהנה מהמוצרים האלה. תרצה לתייג אותם? 🐾
                  </motion.p>
                )}
              </div>
            )}

            {/* Breed detection */}
            {result.breed_detected && !petBreed && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/10 border border-accent/20">
                <Sparkles className="w-4 h-4 text-accent-foreground" />
                <span className="text-xs font-medium text-accent-foreground">
                  זיהוי גזע: {result.breed_detected}
                </span>
              </div>
            )}

            {/* Social Proof Caption */}
            {result.suggested_caption && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-3 rounded-xl bg-secondary/50 border border-border/30"
              >
                <p className="text-[10px] font-semibold text-muted-foreground mb-1">כיתוב מוצע:</p>
                <p className="text-xs text-foreground leading-relaxed">{result.suggested_caption}</p>
              </motion.div>
            )}

            {/* Health Score Context */}
            {result.health_score_current != null && result.health_score_improvement && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/10"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-black text-primary">{result.health_score_current}%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">
                    ציון הבריאות שלך: {result.health_score_current}% · שיפור אפשרי: {result.health_score_improvement}
                  </p>
                  {result.health_score_tip && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {result.health_score_tip}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Safety warning (inline, before full block) */}
        {result?.safety_issues && result.safety_issues.length > 0 && !result.is_dangerous && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20"
          >
    <ShieldAlert className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-xs text-destructive">
              <p className="font-semibold mb-0.5">שים לב:</p>
              {result.safety_issues.map((issue, i) => (
                <p key={i}>• {issue.description}</p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Reward Visualization (non-gamified) ─── */
export const RewardVisualization = ({
  petBreed,
  taggedProductsCount,
}: {
  petBreed: string | null;
  taggedProductsCount: number;
}) => {
  if (taggedProductsCount === 0) return null;

  const breedLabel = petBreed || "חיית המחמד שלך";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/10"
    >
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Heart className="w-4 h-4 text-primary" strokeWidth={1.5} />
      </div>
      <p className="text-xs text-foreground leading-relaxed">
        שיתוף הסרטון יעזור לבעלי{" "}
        <span className="font-bold text-primary">{breedLabel}</span>{" "}
        אחרים לשפר את מדד הבריאות של הכלב שלהם ב-5% 💪
      </p>
    </motion.div>
  );
};

/* ─── Safety Block Overlay ─── */
export const SafetyBlockOverlay = ({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="absolute inset-0 z-50 bg-destructive/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 rounded-3xl"
  >
    <ShieldAlert className="w-12 h-12 text-destructive-foreground mb-4" />
    <h3 className="text-lg font-black text-destructive-foreground text-center mb-2">
      ⚠️ אזהרה רפואית
    </h3>
    <p className="text-sm text-destructive-foreground/90 text-center mb-6 max-w-xs leading-relaxed">
      {message}
    </p>
    <p className="text-xs text-destructive-foreground/70 text-center mb-4">
      לא ניתן לפרסם סרטון זה. נא להסיר את הגורם המסוכן ולצלם מחדש.
    </p>
    <button
      onClick={onDismiss}
      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-destructive-foreground text-destructive font-bold text-sm"
    >
      <X className="w-4 h-4" />
      הבנתי, אסיר את הסרטון
    </button>
  </motion.div>
);
