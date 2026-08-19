import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  History,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  approveProductContent,
  generateProductContent,
  getProductContent,
  getProductVersions,
  rollbackProduct,
  type MipoProductContentVersion,
  type MipoProductVersion,
} from "@/lib/mipoApi";

// Two histories of the same product, side by side: what the record said, and
// what the shop copy said. They version separately because they change for
// different reasons — a supplier moves a price, a person rewrites a paragraph —
// and restoring one must never quietly restore the other.

const FIELD_LABELS: Record<string, string> = {
  price: "מחיר",
  cost_price: "עלות",
  name: "שם",
  description: "תיאור",
  status: "סטטוס",
  image_url: "תמונה",
  stock_status: "מלאי",
  brand_id: "מותג",
  category_id: "קטגוריה",
};

const SOURCE_LABELS: Record<string, string> = {
  admin: "עריכה ידנית",
  import: "ייבוא מספק",
  system: "מערכת",
  rollback: "שחזור",
};

const when = (value: string) =>
  new Date(value).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });

const VersionCard = ({
  version,
  isLatest,
  onRollback,
  rollingBack,
}: {
  version: MipoProductVersion;
  isLatest: boolean;
  onRollback: () => void;
  rollingBack: boolean;
}) => (
  <Card className={isLatest ? "border-primary/40" : undefined}>
    <CardContent className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={isLatest ? "default" : "outline"}>גרסה {version.version}</Badge>
          {isLatest && <span className="text-xs text-muted-foreground">נוכחית</span>}
          {version.source && (
            <Badge variant="secondary" className="text-[11px]">
              {SOURCE_LABELS[version.source] || version.source}
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{when(version.created_at)}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium">{version.summary.name}</span>
        {version.summary.price && (
          <span className="text-muted-foreground">
            ₪{Number(version.summary.price).toLocaleString("he-IL")}
          </span>
        )}
        {version.summary.status && (
          <Badge variant="outline" className="text-[11px]">{version.summary.status}</Badge>
        )}
      </div>

      {version.changed_fields && version.changed_fields.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {version.changed_fields.map((field) => (
            <Badge key={field} variant="secondary" className="text-[11px]">
              {FIELD_LABELS[field] || field}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {version.reason && <span>{version.reason}</span>}
        {version.actor_email && <span dir="ltr">· {version.actor_email}</span>}
      </div>

      {!isLatest && (
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={onRollback}
          disabled={rollingBack}
        >
          {rollingBack ? (
            <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="ml-1 h-3.5 w-3.5" />
          )}
          שחזור לגרסה הזו
        </Button>
      )}
    </CardContent>
  </Card>
);

const ContentCard = ({
  content,
  onApprove,
  approving,
}: {
  content: MipoProductContentVersion;
  onApprove: () => void;
  approving: boolean;
}) => {
  const issues = Array.isArray(content.quality_checks?.issues) ? content.quality_checks.issues : [];
  const failed = issues.length > 0;

  return (
    <Card className={content.is_current ? "border-primary/40" : failed ? "border-destructive/50" : undefined}>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={content.is_current ? "default" : "outline"}>גרסה {content.version}</Badge>
            {content.is_current && <span className="text-xs text-muted-foreground">מוצגת בחנות</span>}
            <Badge variant="secondary" className="text-[11px]">{content.status}</Badge>
            {content.model && (
              <span dir="ltr" className="text-[11px] text-muted-foreground">{content.model}</span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{when(content.created_at)}</span>
        </div>

        {/* The fabrication check is the reason this screen exists. A version that
            failed it is shown with what it invented, never quietly hidden. */}
        {failed && (
          <div className="space-y-1 rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              הטקסט חורג מהעובדות שידועות על המוצר
            </div>
            <ul className="list-inside list-disc space-y-0.5">
              {issues.map((issue, index) => (
                <li key={index}>{String(issue)}</li>
              ))}
            </ul>
          </div>
        )}

        {content.title && <h3 className="font-semibold">{content.title}</h3>}
        {content.short_description && <p className="text-sm">{content.short_description}</p>}
        {content.long_description && (
          <p className="whitespace-pre-line text-sm text-muted-foreground">{content.long_description}</p>
        )}

        {content.key_benefits && content.key_benefits.length > 0 && (
          <ul className="list-inside list-disc space-y-0.5 text-sm">
            {content.key_benefits.map((benefit, index) => (
              <li key={index}>{benefit}</li>
            ))}
          </ul>
        )}

        {(content.seo_title || content.meta_description || content.slug) && (
          <div className="space-y-1 rounded-md bg-muted/50 p-2.5 text-xs">
            <div className="font-medium text-muted-foreground">SEO</div>
            {content.seo_title && <div>{content.seo_title}</div>}
            {content.meta_description && (
              <div className="text-muted-foreground">{content.meta_description}</div>
            )}
            {content.slug && <div dir="ltr" className="font-mono text-[11px]">/{content.slug}</div>}
          </div>
        )}

        {!content.is_current && (
          <Button size="sm" onClick={onApprove} disabled={approving}>
            {approving ? (
              <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="ml-1 h-3.5 w-3.5" />
            )}
            אישור ופרסום הגרסה הזו
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

const AdminProductHistory = () => {
  const { productId = "" } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busyVersion, setBusyVersion] = useState<number | null>(null);

  const { data: versions = [], isLoading: loadingVersions } = useQuery({
    queryKey: ["admin-product-versions", productId],
    queryFn: () => getProductVersions(productId),
    enabled: Boolean(productId),
  });

  const { data: content = [], isLoading: loadingContent } = useQuery({
    queryKey: ["admin-product-content", productId],
    queryFn: () => getProductContent(productId),
    enabled: Boolean(productId),
  });

  const restore = useMutation({
    mutationFn: (version: number) => rollbackProduct({ productId, version, reason: "שחזור מהאדמין" }),
    onSuccess: (result) => {
      // A rollback is a new version rather than an erased one, so the record of
      // what happened survives the undo. Saying so avoids the impression that
      // history was rewritten.
      toast({
        title: `שוחזר מגרסה ${result.restored_from}`,
        description: `נוצרה גרסה ${result.new_version} — ההיסטוריה נשמרת`,
      });
      void queryClient.invalidateQueries({ queryKey: ["admin-product-versions", productId] });
    },
    onError: (error: Error) =>
      toast({ title: "השחזור נכשל", description: error.message, variant: "destructive" }),
    onSettled: () => setBusyVersion(null),
  });

  const approve = useMutation({
    mutationFn: (version: number) => approveProductContent(productId, version),
    onSuccess: () => {
      toast({ title: "התוכן פורסם" });
      void queryClient.invalidateQueries({ queryKey: ["admin-product-content", productId] });
    },
    onError: (error: Error) =>
      toast({ title: "האישור נכשל", description: error.message, variant: "destructive" }),
    onSettled: () => setBusyVersion(null),
  });

  const write = useMutation({
    mutationFn: () => generateProductContent(productId, "נכתב מהאדמין"),
    onSuccess: () => {
      toast({ title: "נוצרה גרסת תוכן חדשה", description: "היא לא מוצגת בחנות עד שתאשר אותה" });
      void queryClient.invalidateQueries({ queryKey: ["admin-product-content", productId] });
    },
    onError: (error: Error) =>
      toast({ title: "הכתיבה נכשלה", description: error.message, variant: "destructive" }),
  });

  const latestVersion = versions[0]?.version;
  const productName = versions[0]?.summary.name || content[0]?.title || "מוצר";

  return (
    <AdminLayout title="היסטוריית מוצר" icon={History}>
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold">{productName}</h2>
          <p dir="ltr" className="font-mono text-xs text-muted-foreground">{productId}</p>
        </div>

        <Tabs defaultValue="versions">
          <TabsList>
            <TabsTrigger value="versions" className="gap-1.5">
              <History className="h-3.5 w-3.5" />
              גרסאות מוצר ({versions.length})
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              תוכן ({content.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="versions" className="mt-4 space-y-3">
            {loadingVersions && <p className="text-sm text-muted-foreground">טוען…</p>}
            {!loadingVersions && versions.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  אין עדיין גרסאות למוצר הזה.
                </CardContent>
              </Card>
            )}
            {versions.map((version) => (
              <VersionCard
                key={version.version}
                version={version}
                isLatest={version.version === latestVersion}
                rollingBack={restore.isPending && busyVersion === version.version}
                onRollback={() => {
                  setBusyVersion(version.version);
                  restore.mutate(version.version);
                }}
              />
            ))}
          </TabsContent>

          <TabsContent value="content" className="mt-4 space-y-3">
            <Button size="sm" onClick={() => write.mutate()} disabled={write.isPending}>
              {write.isPending ? (
                <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="ml-1 h-3.5 w-3.5" />
              )}
              כתיבת גרסה חדשה
            </Button>

            {loadingContent && <p className="text-sm text-muted-foreground">טוען…</p>}
            {!loadingContent && content.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  אין עדיין תוכן שנכתב למוצר הזה.
                </CardContent>
              </Card>
            )}
            {content.map((version) => (
              <ContentCard
                key={version.version}
                content={version}
                approving={approve.isPending && busyVersion === version.version}
                onApprove={() => {
                  setBusyVersion(version.version);
                  approve.mutate(version.version);
                }}
              />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminProductHistory;
