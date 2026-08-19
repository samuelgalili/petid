import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeftRight, CheckCircle2, History, Loader2 } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { decideChanges, getPendingChanges, type MipoImportChange } from "@/lib/mipoApi";

// A supplier's second delivery is mostly the same file with a few numbers moved.
// The engine already worked out which numbers, so the job here is to make each
// one a glance rather than a comparison: what it was, what it becomes, and how
// much that matters.

const SEVERITY_ORDER = ["critical", "normal", "minor"] as const;

const SEVERITY_LABELS: Record<string, string> = {
  critical: "דורש תשומת לב",
  normal: "רגיל",
  minor: "זניח",
};

const CHANGE_LABELS: Record<string, string> = {
  field_changed: "שדה השתנה",
  product_added: "מוצר חדש",
  product_removed: "מוצר נעלם מהקובץ",
  price_changed: "מחיר השתנה",
};

const FIELD_LABELS: Record<string, string> = {
  selling_price: "מחיר מכירה",
  cost_price: "מחיר עלות",
  name: "שם",
  description: "תיאור",
  barcode: "ברקוד",
  brand: "מותג",
  category: "קטגוריה",
  image_url: "תמונה",
  stock_status: "מלאי",
};

const asNumber = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

/** The values are jsonb, so anything can arrive; nothing may reach JSX raw. */
const showValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return [record.name, record.sku].filter(Boolean).join(" · ") || JSON.stringify(value);
  }
  return String(value);
};

/** The size of a numeric move, when both sides are numbers worth comparing. */
const movePercent = (change: MipoImportChange) => {
  const from = asNumber(change.old_value);
  const to = asNumber(change.new_value);
  if (from === null || to === null || from === 0) return null;
  return ((to - from) / Math.abs(from)) * 100;
};

const ChangeRow = ({
  change,
  checked,
  onToggle,
}: {
  change: MipoImportChange;
  checked: boolean;
  onToggle: () => void;
}) => {
  const move = movePercent(change);
  const rising = move !== null && move > 0;

  // A product that appeared or vanished has no product row to take a name from
  // — the name lives in the change's own value. Without this a new product
  // shows up as an anonymous row.
  const fallbackName = showValue(change.new_value ?? change.old_value);

  return (
    <div className="flex items-start gap-3 border-b py-3 last:border-0">
      <Checkbox checked={checked} onCheckedChange={onToggle} className="mt-1" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{change.product_name || fallbackName}</span>
          {change.product_sku && (
            <span dir="ltr" className="font-mono text-xs text-muted-foreground">{change.product_sku}</span>
          )}
          <Badge variant="outline" className="text-[11px]">
            {CHANGE_LABELS[change.change_type] || change.change_type}
          </Badge>
          {change.product_id && (
            <Link
              to={`/admin/products/${change.product_id}/history`}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              <History className="inline h-3 w-3" /> היסטוריה
            </Link>
          )}
        </div>

        {change.field_name && (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {FIELD_LABELS[change.field_name] || change.field_name}:
            </span>
            <span className="text-muted-foreground line-through">{showValue(change.old_value)}</span>
            <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{showValue(change.new_value)}</span>
            {move !== null && Math.abs(move) >= 1 && (
              <Badge variant={Math.abs(move) >= 25 ? "destructive" : "secondary"} className="text-[11px]">
                {rising ? "+" : ""}{move.toFixed(0)}%
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const AdminChangeApproval = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [severity, setSeverity] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["admin-changes"],
    queryFn: () => getPendingChanges({ limit: 300 }),
    refetchInterval: 15000,
  });

  const changes = useMemo(
    () => (data?.changes || []).filter((change) => !severity || change.severity === severity),
    [data, severity],
  );

  const countsBySeverity = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of data?.summary || []) {
      counts[row.severity] = (counts[row.severity] || 0) + row.count;
    }
    return counts;
  }, [data]);

  const decide = useMutation({
    mutationFn: (action: "approve" | "reject") =>
      decideChanges({ change_ids: [...selected], action }),
    onSuccess: (result, action) => {
      // `decided` and `applied` differ on purpose: a change can be approved
      // without there being a product column to write it to. Saying only one
      // number would make the other look like a bug.
      toast({
        title: action === "approve" ? `${result.decided} אושרו` : `${result.decided} נדחו`,
        description:
          action === "approve" && result.applied !== result.decided
            ? `${result.applied} מהם נכתבו למוצר; השאר נרשמו בלבד`
            : undefined,
      });
      setSelected(new Set());
      void queryClient.invalidateQueries({ queryKey: ["admin-changes"] });
    },
    onError: (error: Error) =>
      toast({ title: "הפעולה נכשלה", description: error.message, variant: "destructive" }),
  });

  const toggle = (id: string) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allShownSelected = changes.length > 0 && changes.every((change) => selected.has(change.id));

  return (
    <AdminLayout title="אישור שינויים" icon={ArrowLeftRight}>
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          מה שהשתנה בין המשלוח הקודם של הספק לנוכחי. שום דבר לא נכתב למוצר עד שמאשרים כאן.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={severity === null ? "default" : "outline"}
            onClick={() => setSeverity(null)}
          >
            הכול ({data?.changes.length || 0})
          </Button>
          {SEVERITY_ORDER.filter((level) => countsBySeverity[level]).map((level) => (
            <Button
              key={level}
              size="sm"
              variant={severity === level ? "default" : "outline"}
              onClick={() => setSeverity(level)}
            >
              {level === "critical" && <AlertTriangle className="ml-1 h-3.5 w-3.5" />}
              {SEVERITY_LABELS[level]} ({countsBySeverity[level]})
            </Button>
          ))}
        </div>

        {selected.size > 0 && (
          <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur">
            <span className="text-sm font-medium">{selected.size} נבחרו</span>
            <Button
              size="sm"
              onClick={() => decide.mutate("approve")}
              disabled={decide.isPending}
            >
              {decide.isPending ? <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" /> : null}
              אישור
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => decide.mutate("reject")}
              disabled={decide.isPending}
            >
              דחייה
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              ביטול בחירה
            </Button>
          </div>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">טוען…</p>}

        {!isLoading && changes.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 opacity-40" />
              אין שינויים שממתינים להחלטה.
            </CardContent>
          </Card>
        )}

        {changes.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <div className="mb-2 flex items-center gap-2 border-b pb-2">
                <Checkbox
                  checked={allShownSelected}
                  onCheckedChange={() =>
                    setSelected(allShownSelected ? new Set() : new Set(changes.map((change) => change.id)))
                  }
                />
                <span className="text-sm text-muted-foreground">בחירת הכול ({changes.length})</span>
              </div>

              {changes.map((change) => (
                <ChangeRow
                  key={change.id}
                  change={change}
                  checked={selected.has(change.id)}
                  onToggle={() => toggle(change.id)}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminChangeApproval;
