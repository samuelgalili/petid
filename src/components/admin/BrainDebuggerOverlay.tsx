/**
 * BrainDebuggerOverlay — Admin-only floating overlay.
 * Shows the exact JSON context being fed to AI agents during a conversation.
 * Toggle with Ctrl+Shift+B or the 🧠 button (admin-only).
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, X, Copy, Check, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useCentralBrain, type DiscrepancyAlert } from "@/contexts/CentralBrainContext";
import { useAdmin } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";

export const BrainDebuggerOverlay = () => {
  const { isAdmin } = useAdmin();
  const { brainSnapshot, discrepancies, resolveDiscrepancy } = useCentralBrain();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["petProfile"]));

  // Keyboard shortcut: Ctrl+Shift+B
  useEffect(() => {
    if (!isAdmin) return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "B") {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isAdmin]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const copyToClipboard = useCallback(async () => {
    await navigator.clipboard.writeText(JSON.stringify(brainSnapshot, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [brainSnapshot]);

  if (!isAdmin) return null;

  const sections = [
    { key: "petProfile", label: "Pet Profile", data: brainSnapshot.petProfile, count: brainSnapshot.petProfile ? Object.keys(brainSnapshot.petProfile).length : 0 },
    { key: "nrc", label: "NRC Calculation", data: brainSnapshot.nrc, count: brainSnapshot.nrc ? 1 : 0 },
    { key: "ocrRecords", label: "OCR Records", data: brainSnapshot.ocrRecords, count: brainSnapshot.ocrRecords.length },
    { key: "vetVisits", label: "Vet Visits", data: brainSnapshot.vetVisits, count: brainSnapshot.vetVisits.length },
    { key: "documents", label: "Documents Vault", data: brainSnapshot.documents, count: brainSnapshot.documents.length },
    { key: "resolvedFields", label: "Resolved Overrides", data: brainSnapshot.resolvedFields, count: Object.keys(brainSnapshot.resolvedFields).length },
  ];

  return (
    <>
      {/* Brain debugger triggered via Ctrl+Shift+B only — no standalone floating button */}

      {/* Overlay Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-[9999] w-[420px] max-w-[90vw] bg-slate-900 text-slate-100 shadow-2xl border-r border-slate-700 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-violet-400" />
                <span className="font-bold text-sm">Central Brain Debugger</span>
                <Badge variant="outline" className="text-[10px] border-violet-500 text-violet-300">
                  {brainSnapshot.dataSourceCount} sources
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-white" onClick={copyToClipboard}>
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-white" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Meta */}
            <div className="px-4 py-2 bg-slate-800/50 text-xs text-slate-400 border-b border-slate-700 flex items-center justify-between">
              <span>PetID: {brainSnapshot.petId?.slice(0, 8) || "none"}...</span>
              <span>{new Date(brainSnapshot.timestamp).toLocaleTimeString("he-IL")}</span>
            </div>

            {/* Discrepancy Alerts */}
            {discrepancies.length > 0 && (
              <div className="px-4 py-3 bg-amber-900/30 border-b border-amber-700/50">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  {discrepancies.length} Discrepanc{discrepancies.length > 1 ? "ies" : "y"} Detected
                </div>
                {discrepancies.map((d, i) => (
                  <DiscrepancyCard key={i} alert={d} onResolve={resolveDiscrepancy} />
                ))}
              </div>
            )}

            {/* Data Sections */}
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {sections.map(({ key, label, data, count }) => (
                  <div key={key} className="bg-slate-800/60 rounded-lg border border-slate-700/50 overflow-hidden">
                    <button
                      onClick={() => toggleSection(key)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700/50 transition-colors"
                    >
                      <span>{label}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] bg-slate-700 text-slate-300">{count}</Badge>
                        {expandedSections.has(key) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </div>
                    </button>
                    {expandedSections.has(key) && data && (
                      <pre className="px-3 pb-3 text-[11px] text-green-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {JSON.stringify(data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ============= Discrepancy Card =============
function DiscrepancyCard({ alert, onResolve }: { alert: DiscrepancyAlert; onResolve: (field: string, value: string) => void }) {
  return (
    <div className="bg-slate-800/80 rounded-lg p-2 mb-1 text-xs">
      <div className="text-amber-200 font-semibold mb-1">{alert.field}</div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-slate-400">Profile:</span>
        <button onClick={() => onResolve(alert.field, alert.profileValue || "")} className="text-blue-300 hover:text-blue-200 underline cursor-pointer">
          {alert.profileValue || "—"}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-400">Document:</span>
        <button onClick={() => onResolve(alert.field, alert.documentValue || "")} className="text-orange-300 hover:text-orange-200 underline cursor-pointer">
          {alert.documentValue || "—"}
        </button>
      </div>
      <p className="text-slate-500 mt-1 text-[10px]">Click the value you trust to resolve</p>
    </div>
  );
}
