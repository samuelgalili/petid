import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Play,
  Sparkles,
  Truck,
  Upload,
} from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  getImportReport,
  getImportRuns,
  getImportTargetFields,
  getProfileMappings,
  getSuppliers,
  runImportMapping,
  suggestProfileMappings,
  updateProfileMappings,
  uploadSupplierFile,
  type MipoFieldMapping,
} from "@/lib/mipoApi";

// The supplier screen is the import profile editor. Splitting them would mean
// two places to look for the answer to one question: how do we read this
// supplier's file.

const STATUS_LABELS: Record<string, string> = {
  uploaded: "הועלה",
  parsing: "בקריאה",
  mapped: "נקרא",
  normalized: "בנרמול",
  review_required: "דורש ביקורת",
  ready: "מוכן",
  completed: "הושלם",
  completed_with_review: "הושלם עם ביקורת",
  failed: "נכשל",
};

const KIND_LABELS: Record<string, string> = {
  domain: "שדה מוצר",
  identifier: "מזהה",
  price: "מחיר",
  attribute: "מאפיין",
  metadata: "מטא־דאטה",
  ignored: "מתעלם",
  unmapped: "לא הוחלט",
};

const statusTone = (status: string) => {
  if (status === "failed") return "destructive" as const;
  if (status === "review_required") return "secondary" as const;
  if (status === "ready" || status === "completed") return "default" as const;
  return "outline" as const;
};

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("לא ניתן לקרוא את הקובץ"));
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
    reader.readAsDataURL(file);
  });

const AdminSupplierImports = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState<Record<string, Partial<MipoFieldMapping>>>({});
  const [uploadProfileId, setUploadProfileId] = useState<string>("");

  const { data: suppliers = [] } = useQuery({
    queryKey: ["admin-suppliers"],
    queryFn: getSuppliers,
  });

  // Every profile across every supplier, since the upload picks a profile and
  // the supplier is only there to say which one.
  const profileOptions = useMemo(
    () => suppliers.flatMap((supplier) =>
      supplier.profiles.map((profile) => ({
        id: profile.id,
        supplierId: supplier.id,
        label: `${supplier.name} · ${profile.name}`,
      })),
    ),
    [suppliers],
  );

  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ["admin-import-runs"],
    queryFn: getImportRuns,
    // A parse finishes on the queue, so the list has to notice on its own.
    refetchInterval: 4000,
  });

  const { data: targetFields = [] } = useQuery({
    queryKey: ["admin-import-target-fields"],
    queryFn: getImportTargetFields,
    staleTime: Infinity,
  });

  const activeImportId = selectedImportId || runs[0]?.id || null;

  const { data: report } = useQuery({
    queryKey: ["admin-import-report", activeImportId],
    queryFn: () => getImportReport(activeImportId as string),
    enabled: Boolean(activeImportId),
    refetchInterval: 4000,
  });

  const profileId = report?.import.profile_id || null;

  const { data: mappings = [], isLoading: mappingsLoading } = useQuery({
    queryKey: ["admin-profile-mappings", profileId],
    queryFn: () => getProfileMappings(profileId as string),
    enabled: Boolean(profileId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-import-runs"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-import-report", activeImportId] });
    void queryClient.invalidateQueries({ queryKey: ["admin-profile-mappings", profileId] });
  };

  const suggestMutation = useMutation({
    mutationFn: () => suggestProfileMappings(profileId as string),
    onSuccess: (result) => {
      toast({ title: `הוצעו ${result.proposed} מיפויים`, description: "בדוק ואשר לפני הרצה" });
      invalidate();
    },
    onError: (error: Error) => toast({ title: "ההצעה נכשלה", description: error.message, variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const updates = Object.entries(draft).map(([id, changes]) => {
        const original = mappings.find((mapping) => mapping.id === id);
        return { id, source_field: original?.source_field || "", ...changes };
      });
      return updateProfileMappings(profileId as string, updates);
    },
    onSuccess: (result) => {
      toast({ title: `נשמרו ${result.updated} שינויים` });
      setDraft({});
      invalidate();
    },
    onError: (error: Error) => toast({ title: "השמירה נכשלה", description: error.message, variant: "destructive" }),
  });

  const mapMutation = useMutation({
    mutationFn: () => runImportMapping(activeImportId as string),
    onSuccess: () => {
      toast({ title: "המיפוי רץ ברקע", description: "התוצאות יתעדכנו כאן" });
      invalidate();
    },
    onError: (error: Error) => toast({ title: "ההרצה נכשלה", description: error.message, variant: "destructive" }),
  });

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const base64 = await readFileAsBase64(file);
      const chosen = profileOptions.find((option) => option.id === uploadProfileId);
      const created = await uploadSupplierFile({
        filename: file.name,
        file_base64: base64,
        // Without a profile there is nothing to map the columns with, so the
        // file would be read and then sit there.
        profile_id: chosen?.id || null,
        supplier_id: chosen?.supplierId || null,
        content_type: file.type || null,
      });
      setSelectedImportId(created.id);
      toast({ title: "הקובץ נקלט", description: "הקריאה רצה ברקע" });
      invalidate();
    } catch (error) {
      toast({ title: "ההעלאה נכשלה", description: (error as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const grouped = useMemo(() => {
    const decided = mappings.filter((mapping) => mapping.target_kind !== "unmapped" && mapping.target_kind !== "ignored");
    const open = mappings.filter((mapping) => mapping.target_kind === "unmapped");
    const ignored = mappings.filter((mapping) => mapping.target_kind === "ignored");
    return { decided, open, ignored };
  }, [mappings]);

  const setField = (id: string, changes: Partial<MipoFieldMapping>) =>
    setDraft((previous) => ({ ...previous, [id]: { ...previous[id], ...changes } }));

  const valueOf = (mapping: MipoFieldMapping, key: keyof MipoFieldMapping) =>
    (draft[mapping.id]?.[key] ?? mapping[key]) as string | null;

  const renderRow = (mapping: MipoFieldMapping) => {
    const target = valueOf(mapping, "target_field") || "";
    const reason = valueOf(mapping, "ignore_reason") || "";
    const isIgnored = (valueOf(mapping, "target_kind") || mapping.target_kind) === "ignored";

    return (
      <div key={mapping.id} className="grid gap-2 border-b border-border/40 py-3 last:border-0 md:grid-cols-[1.4fr_1.2fr_1fr] md:items-center">
        <div className="min-w-0">
          <div className="truncate font-medium" dir="rtl">{mapping.source_field}</div>
          {mapping.notes && <div className="text-xs text-muted-foreground">{mapping.notes}</div>}
        </div>

        <Select
          value={target || "__none__"}
          onValueChange={(value) => {
            if (value === "__none__") {
              setField(mapping.id, { target_field: null, target_kind: "unmapped", ignore_reason: null });
              return;
            }
            if (value === "__ignore__") {
              setField(mapping.id, { target_field: null, target_kind: "ignored" });
              return;
            }
            const spec = targetFields.find((field) => field.field === value);
            setField(mapping.id, {
              target_field: value,
              target_kind: (spec?.kind as MipoFieldMapping["target_kind"]) || "domain",
              value_type: spec?.type || "text",
              ignore_reason: null,
            });
          }}
        >
          <SelectTrigger><SelectValue placeholder="בחר יעד" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— לא הוחלט —</SelectItem>
            <SelectItem value="__ignore__">התעלם מהעמודה</SelectItem>
            {targetFields.map((field) => (
              <SelectItem key={field.field} value={field.field}>
                {field.field} · {KIND_LABELS[field.kind] || field.kind}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* An ignored column has to say why, so a considered decision is
            distinguishable from an oversight. The server refuses one without. */}
        {isIgnored ? (
          <Input
            value={reason}
            placeholder="סיבה להתעלמות (חובה)"
            onChange={(event) => setField(mapping.id, { ignore_reason: event.target.value })}
          />
        ) : (
          <div className="text-xs text-muted-foreground">{mapping.value_type}</div>
        )}
      </div>
    );
  };

  const run = report?.import;
  const unmappedWithData = run?.warnings?.find((warning) => warning.code === "UNMAPPED_COLUMNS_WITH_DATA");

  return (
    <AdminLayout title="ספקים וייבוא" icon={Truck}>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle className="text-base">קליטת קובץ ספק</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={uploadProfileId} onValueChange={setUploadProfileId}>
                <SelectTrigger className="w-64"><SelectValue placeholder="בחר ספק ופרופיל" /></SelectTrigger>
                <SelectContent>
                  {profileOptions.length === 0
                    ? <SelectItem value="__none__" disabled>אין פרופילי ייבוא</SelectItem>
                    : profileOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            <label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading || !uploadProfileId}
              />
              <Button asChild disabled={uploading || !uploadProfileId}>
                <span className={uploadProfileId ? "cursor-pointer" : "cursor-not-allowed opacity-50"}>
                  {uploading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Upload className="ml-2 h-4 w-4" />}
                  העלאת קובץ
                </span>
              </Button>
            </label>
            </div>
          </CardHeader>
          <CardContent>
            {runsLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">טוען ריצות…</div>
            ) : runs.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">עדיין לא נקלט אף קובץ</div>
            ) : (
              <div className="space-y-1">
                {runs.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedImportId(item.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-right transition-colors ${
                      item.id === activeImportId ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm">{item.filename || "ללא שם"}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-muted-foreground">{item.total_rows} שורות</span>
                      <Badge variant={statusTone(item.status)}>{STATUS_LABELS[item.status] || item.status}</Badge>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {run && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "שורות בקובץ", value: run.total_rows },
                { label: "תקינות", value: run.valid_rows },
                { label: "דורשות ביקורת", value: run.pending_review_rows },
                { label: "שגויות", value: run.invalid_rows },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="p-4">
                    <div className="text-2xl font-semibold tabular-nums">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {unmappedWithData && (
              <Card className="border-amber-500/40 bg-amber-500/5">
                <CardContent className="flex gap-3 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm font-medium">
                      {unmappedWithData.columns?.length || 0} עמודות מכילות נתונים ואין לגביהן החלטה
                    </div>
                    <div className="text-xs text-muted-foreground" dir="rtl">
                      {(unmappedWithData.columns || []).join(" · ")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
                <CardTitle className="text-base">
                  מיפוי שדות
                  <span className="mr-2 text-sm font-normal text-muted-foreground">
                    {run.mapped_fields} ממופים · {run.unmapped_fields} פתוחים · {run.ignored_fields} מתעלמים
                  </span>
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!profileId || suggestMutation.isPending}
                    onClick={() => suggestMutation.mutate()}
                  >
                    <Sparkles className="ml-2 h-4 w-4" />
                    הצע מיפוי
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={Object.keys(draft).length === 0 || saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                  >
                    <CheckCircle2 className="ml-2 h-4 w-4" />
                    שמור ({Object.keys(draft).length})
                  </Button>
                  <Button size="sm" disabled={mapMutation.isPending} onClick={() => mapMutation.mutate()}>
                    <Play className="ml-2 h-4 w-4" />
                    הרץ מיפוי
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!profileId ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    לייבוא הזה אין פרופיל ספק, ולכן אין מה למפות
                  </div>
                ) : mappingsLoading ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">טוען מיפויים…</div>
                ) : (
                  <Tabs defaultValue="open">
                    <TabsList>
                      <TabsTrigger value="open">פתוחים ({grouped.open.length})</TabsTrigger>
                      <TabsTrigger value="decided">ממופים ({grouped.decided.length})</TabsTrigger>
                      <TabsTrigger value="ignored">מתעלמים ({grouped.ignored.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="open" className="mt-4">
                      {grouped.open.length === 0
                        ? <div className="py-4 text-center text-sm text-muted-foreground">כל עמודה קיבלה החלטה</div>
                        : grouped.open.map(renderRow)}
                    </TabsContent>
                    <TabsContent value="decided" className="mt-4">{grouped.decided.map(renderRow)}</TabsContent>
                    <TabsContent value="ignored" className="mt-4">{grouped.ignored.map(renderRow)}</TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSupplierImports;
