import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, History, Loader2, Tag, TrendingDown, TrendingUp } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  decidePriceProposals,
  getPriceProposals,
  proposePrices,
  type MipoPriceProposal,
} from "@/lib/mipoApi";

// The engine proposes; this screen is the only place a price is actually set.
// So it has to show the arithmetic, not just the answer — a number nobody can
// check is a number nobody should apply.

const WARNING_LABELS: Record<string, string> = {
  NO_COST: "אין עלות",
  NO_MARKET_DATA: "אין נתוני שוק",
  BELOW_MIN_MARGIN: "מתחת למרווח המינימלי",
  ABOVE_MAX_MARGIN: "מעל המרווח המקסימלי",
  LARGE_CHANGE: "שינוי גדול",
};

const shekels = (value: string | number | null) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `₪${number.toLocaleString("he-IL", { maximumFractionDigits: 2 })}`;
};

const ProposalRow = ({
  proposal,
  checked,
  onToggle,
}: {
  proposal: MipoPriceProposal;
  checked: boolean;
  onToggle: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const current = Number(proposal.current_price);
  const proposed = Number(proposal.proposed_price);
  const hasCurrent = Number.isFinite(current) && current > 0;
  const change = hasCurrent ? ((proposed - current) / current) * 100 : null;
  const risky = proposal.warnings.length > 0;

  return (
    <div className="border-b py-3 last:border-0">
      <div className="flex items-start gap-3">
        <Checkbox checked={checked} onCheckedChange={onToggle} className="mt-1" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium">{proposal.product_name}</span>
            {proposal.sku && (
              <span dir="ltr" className="font-mono text-xs text-muted-foreground">{proposal.sku}</span>
            )}
            <Link
              to={`/admin/products/${proposal.product_id}/history`}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              <History className="inline h-3 w-3" /> היסטוריה
            </Link>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              עלות {shekels(proposal.cost)}
            </span>
            <span className="text-muted-foreground">
              {hasCurrent ? shekels(current) : "ללא מחיר"}
            </span>
            <span className="font-semibold">→ {shekels(proposed)}</span>

            {change !== null && (
              <Badge variant={Math.abs(change) >= 25 ? "destructive" : "secondary"} className="gap-1 text-[11px]">
                {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {change >= 0 ? "+" : ""}{change.toFixed(0)}%
              </Badge>
            )}
            {proposal.margin_percent && (
              <span className="text-xs text-muted-foreground">
                מרווח {Number(proposal.margin_percent).toFixed(0)}%
              </span>
            )}
          </div>

          {risky && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {proposal.warnings.map((warning, index) => (
                <Badge key={`${warning.code}-${index}`} variant="destructive" className="text-[11px]">
                  <AlertTriangle className="ml-1 h-3 w-3" />
                  {WARNING_LABELS[warning.code] || warning.code}
                </Badge>
              ))}
            </div>
          )}

          <button
            type="button"
            className="mt-1.5 text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "הסתר את החישוב" : "איך יצא המספר הזה"}
          </button>

          {open && (
            <pre
              dir="ltr"
              className="mt-2 max-h-64 overflow-auto rounded-md bg-muted/50 p-3 text-[11px] leading-relaxed"
            >
              {JSON.stringify({ rule: proposal.rule_name, ...proposal.calculation }, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminPricingProposals = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [onlyClean, setOnlyClean] = useState(false);

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["admin-price-proposals"],
    queryFn: () => getPriceProposals(300),
    refetchInterval: 15000,
  });

  const shown = useMemo(
    () => (onlyClean ? proposals.filter((proposal) => proposal.warnings.length === 0) : proposals),
    [proposals, onlyClean],
  );

  const flagged = proposals.length - proposals.filter((proposal) => proposal.warnings.length === 0).length;

  const decide = useMutation({
    mutationFn: (action: "apply" | "reject") =>
      decidePriceProposals({ proposal_ids: [...selected], action }),
    onSuccess: (result, action) => {
      toast({
        title: action === "apply" ? `${result.applied} מחירים עודכנו` : `${result.rejected} הצעות נדחו`,
      });
      setSelected(new Set());
      void queryClient.invalidateQueries({ queryKey: ["admin-price-proposals"] });
    },
    onError: (error: Error) =>
      toast({ title: "הפעולה נכשלה", description: error.message, variant: "destructive" }),
  });

  const recompute = useMutation({
    mutationFn: () => proposePrices({ limit: 500 }),
    onSuccess: () => toast({ title: "החישוב רץ ברקע", description: "ההצעות יתעדכנו כאן תוך כמה שניות" }),
  });

  const toggle = (id: string) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allShownSelected = shown.length > 0 && shown.every((proposal) => selected.has(proposal.id));

  return (
    <AdminLayout title="הצעות תמחור" icon={Tag}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            המנוע מציע, אתה קובע. אף מחיר לא משתנה בלי אישור כאן.
          </p>
          <Button variant="outline" size="sm" onClick={() => recompute.mutate()} disabled={recompute.isPending}>
            {recompute.isPending ? <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" /> : null}
            חישוב מחדש לכל הקטלוג
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={onlyClean ? "outline" : "default"} onClick={() => setOnlyClean(false)}>
            הכול ({proposals.length})
          </Button>
          <Button size="sm" variant={onlyClean ? "default" : "outline"} onClick={() => setOnlyClean(true)}>
            ללא התראות ({proposals.length - flagged})
          </Button>
          {flagged > 0 && (
            <span className="flex items-center gap-1 self-center text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              {flagged} מסומנות — כדאי לעבור עליהן אחת־אחת
            </span>
          )}
        </div>

        {selected.size > 0 && (
          <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur">
            <span className="text-sm font-medium">{selected.size} נבחרו</span>
            <Button size="sm" onClick={() => decide.mutate("apply")} disabled={decide.isPending}>
              {decide.isPending ? <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" /> : null}
              עדכון המחיר
            </Button>
            <Button size="sm" variant="outline" onClick={() => decide.mutate("reject")} disabled={decide.isPending}>
              דחייה
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              ביטול בחירה
            </Button>
          </div>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">טוען…</p>}

        {!isLoading && shown.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 opacity-40" />
              אין הצעות שממתינות להחלטה.
            </CardContent>
          </Card>
        )}

        {shown.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <div className="mb-2 flex items-center gap-2 border-b pb-2">
                <Checkbox
                  checked={allShownSelected}
                  onCheckedChange={() =>
                    setSelected(allShownSelected ? new Set() : new Set(shown.map((proposal) => proposal.id)))
                  }
                />
                <span className="text-sm text-muted-foreground">בחירת הכול ({shown.length})</span>
              </div>

              {shown.map((proposal) => (
                <ProposalRow
                  key={proposal.id}
                  proposal={proposal}
                  checked={selected.has(proposal.id)}
                  onToggle={() => toggle(proposal.id)}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPricingProposals;
