import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, AlertCircle, Sparkles } from "lucide-react";
import type { DailyTargets } from "@/lib/nrcTargets";

interface Baseline {
  avgWaterMl: number | null;
  avgKcal: number | null;
  avgTaskPct: number | null;
  weightTrendKgPerWeek: number | null;
  confidence: number;
  dataDays: number;
  anomalies: Array<{ kind: string; severity: string; detail: string }>;
  computedAt: string | null;
}

/**
 * BaselineStrip — surfaces the "what's normal for your pet" learning layer.
 * Conservative: hides everything until confidence ≥ 0.4 (≈ 6 days of logs).
 * Shows only what we actually know — never invents averages.
 */
export const BaselineStrip = ({
  baseline,
  targets,
}: {
  baseline: Baseline;
  targets?: DailyTargets;
}) => {
  if (baseline.confidence < 0.4) {
    return (
      <div className="rounded-2xl px-3 py-2 bg-muted/30 border border-border/30 text-[11px] text-muted-foreground/80 text-center">
        איסוף נתונים — צריך ~{Math.max(0, 14 - baseline.dataDays)} ימים נוספים כדי לחשב מה הרגיל לחיה שלך
      </div>
    );
  }

  const trend = baseline.weightTrendKgPerWeek;
  const TrendIcon = trend == null ? Minus : Math.abs(trend) < 0.05 ? Minus : trend > 0 ? TrendingUp : TrendingDown;

  const items = [
    baseline.avgWaterMl != null && {
      label: "מים/יום",
      value: `${Math.round(baseline.avgWaterMl)} מ״ל`,
    },
    baseline.avgKcal != null && {
      label: "קק״ל/יום",
      value: `${Math.round(baseline.avgKcal)}`,
    },
    baseline.avgTaskPct != null && {
      label: "שגרה",
      value: `${Math.round(baseline.avgTaskPct)}%`,
    },
    trend != null && {
      label: "משקל/שבוע",
      value: (
        <span className="inline-flex items-center gap-1">
          <TrendIcon className="w-3 h-3" strokeWidth={1.8} />
          {trend === 0 ? "יציב" : `${trend > 0 ? "+" : ""}${trend.toFixed(2)} ק״ג`}
        </span>
      ),
    },
  ].filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl bg-card/40 backdrop-blur-xl border border-border/30 px-3 py-2.5"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          הרגיל שלך · 14 ימים
        </span>
        <span className="text-[9px] text-muted-foreground/60">
          ביטחון {Math.round(baseline.confidence * 100)}%
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        {items.map((it, i) => (
          <div key={i} className="flex-1 min-w-0 text-center">
            <div className="text-[12px] font-bold text-foreground tabular-nums truncate" dir="auto" style={{ unicodeBidi: "plaintext" }}>
              {it.value}
            </div>
            <div className="text-[9px] text-muted-foreground/70 mt-0.5">{it.label}</div>
          </div>
        ))}
      </div>

      {baseline.anomalies.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
          {baseline.anomalies.slice(0, 2).map((a, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 text-[11px]"
              style={{
                color:
                  a.severity === "alert"
                    ? "hsl(var(--destructive))"
                    : "hsl(var(--foreground))",
              }}
            >
              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" strokeWidth={1.8} />
              <span className="leading-snug">{a.detail}</span>
            </div>
          ))}
        </div>
      )}

      {targets && targets.source !== "base" && targets.reason && (
        <div className="mt-2 pt-2 border-t border-border/30 flex items-start gap-1.5 text-[11px] text-foreground/85">
          <Sparkles className="w-3 h-3 mt-0.5 shrink-0" strokeWidth={1.8} />
          <span className="leading-snug">
            {targets.reason}
            {targets.kcal != null && (
              <> · יעד נוכחי <span className="tabular-nums font-semibold">{targets.kcal}</span> קק״ל
                {targets.adjustmentPct !== 0 && (
                  <> ({targets.adjustmentPct > 0 ? "+" : ""}{targets.adjustmentPct}%)</>
                )}
              </>
            )}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default BaselineStrip;