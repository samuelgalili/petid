import { cn } from "@/lib/utils";
import { FlaskConical } from "lucide-react";

/**
 * MedicalDisclaimer — Minimalist AI disclaimer footer
 * Used on all Dr. NRC / Danny AI-generated recommendations.
 */
export const MedicalDisclaimer = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "flex items-center gap-1.5 px-3 py-2 mt-3",
      "rounded-xl bg-muted/30 border border-border/20",
      className,
    )}
  >
    <FlaskConical className="w-3 h-3 text-muted-foreground/50 shrink-0" strokeWidth={1.5} />
    <p className="text-[9px] text-muted-foreground/60 leading-relaxed" dir="ltr">
      AI-generated insight based on NRC 2006. Not a substitute for professional veterinary care.
    </p>
  </div>
);
