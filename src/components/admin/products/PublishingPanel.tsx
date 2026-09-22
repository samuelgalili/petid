import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, PackageCheck, RefreshCw, Store } from "lucide-react";

import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
import { AdminEmptyState, AdminPageHeader, AdminStatCard, AdminStatsGrid } from "@/components/admin/AdminStyles";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  getPublicationReadiness,
  listIntakeDrafts,
  publishIntakeProduct,
  type MipoIntakeDraft,
  type MipoPublicationReadiness,
} from "@/lib/mipoApi";
import { cn } from "@/lib/utils";

/**
 * What is waiting to reach the shop, and what is stopping each one.
 *
 * NO LONGER A SCREEN OF ITS OWN. It was /admin/publishing, one of four
 * separate product screens, and a product's life was spread across them: you
 * imported it on one, edited it on another, listed it on a third and published
 * it here. It is a section of the products screen now, reached by the filter
 * that counts it, so "what is not in the shop yet" is asked in the same place
 * as "what is".
 *
 * The intake API has nineteen endpoints and the client called none of them, so
 * every catalogue decision - approving a draft, approving an image, publishing
 * - was made by dispatching a GitHub workflow by hand. That is maintenance
 * wearing a process's clothes: it cannot be delegated, it cannot be audited by
 * the people doing it, and it cannot be done from a phone.
 *
 * The screen answers one question per row: why is this not in the shop? The
 * publication gate evaluates seven conditions and NAMES the ones that fail, so
 * the answer is already computed - it just had nowhere to be shown.
 */

/** The gate's reason codes, in the words an operator would use. */
const REASON_HE: Record<string, string> = {
  seller_not_verified: "העסק לא מאומת",
  seller_status_none: "העסק לא אושר למכירה",
  seller_status_pending: "אישור העסק ממתין",
  seller_status_suspended: "העסק מושהה",
  draft_not_approved: "הטיוטה לא אושרה",
  missing_name: "אין שם מוצר",
  missing_category: "אין קטגוריה",
  no_active_variant: "אין וריאנט פעיל",
  no_priced_offer: "אין הצעה במחיר",
  no_availability: "אין זמינות במלאי",
  no_approved_image: "אין תמונה מאושרת",
};

const reasonLabel = (code: string) => {
  if (code.startsWith("missing_attribute:")) {
    return `חסר מאפיין חובה: ${code.slice("missing_attribute:".length)}`;
  }
  return REASON_HE[code] || code;
};

/**
 * Reasons that are true of the SELLER rather than of the product.
 *
 * They matter separately because one of them blocks every product at once:
 * production measured one business, verified, commercial_status 'none', and so
 * every single approved product failed the gate for a reason that has nothing
 * to do with the product. Counting those rows as "187 problems" would send
 * somebody to fix 187 things instead of one.
 */
const SELLER_REASONS = new Set([
  "seller_not_verified",
  "seller_status_none",
  "seller_status_pending",
  "seller_status_suspended",
]);

export const PublishingPanel = () => {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<MipoIntakeDraft[]>([]);
  const [readiness, setReadiness] = useState<Record<string, MipoPublicationReadiness>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const approved = await listIntakeDrafts("APPROVED");
      setDrafts(approved);

      // Readiness is per product and there is no batch endpoint, so this is n
      // requests. It is bounded by the 200-row limit the list already imposes,
      // and a failure on one row must not blank the others - a product whose
      // readiness cannot be read is shown as unknown, not as ready.
      const withProduct = approved.filter((d) => d.approved_catalog_product_id);
      const reports = await Promise.all(
        withProduct.map(async (draft) => {
          try {
            return [draft.id, await getPublicationReadiness(draft.approved_catalog_product_id!)] as const;
          } catch {
            return [draft.id, null] as const;
          }
        }),
      );
      setReadiness(Object.fromEntries(reports.filter((entry): entry is [string, MipoPublicationReadiness] => entry[1] !== null)));
    } catch (error) {
      toast({
        title: "לא הצלחנו לטעון",
        description: error instanceof Error ? error.message : "שגיאה",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const reports = Object.values(readiness);
  const ready = reports.filter((report) => report.ready).length;
  const published = reports.filter((report) => report.publication_state === "PUBLISHED").length;

  // One seller failure blocks every product, so it is counted once and said
  // once rather than repeated on every row.
  const sellerBlocked = reports.filter((report) =>
    report.unmet.some((code) => SELLER_REASONS.has(code)));

  const publish = async (draft: MipoIntakeDraft) => {
    const productId = draft.approved_catalog_product_id;
    if (!productId) return;
    setPublishing(draft.id);
    try {
      await publishIntakeProduct(productId);
      toast({ title: "פורסם", description: draft.name || "המוצר" });
      await load();
    } catch (error) {
      // The gate refuses inside the transaction that publishes, so a refusal
      // here is the truth at the moment of publishing rather than a stale read.
      toast({
        title: "השער סירב",
        description: error instanceof Error ? error.message : "שגיאה",
        variant: "destructive",
      });
    } finally {
      setPublishing(null);
    }
  };

  const selected = drafts.find((draft) => draft.id === selectedId) || null;
  const selectedReport = selectedId ? readiness[selectedId] : null;

  return (
    <div className="space-y-5" dir="rtl">
      <AdminPageHeader
        title="פרסום לחנות"
        description="מה ממתין, ומה עוצר כל אחד"
        icon={Store}
        onRefresh={load}
        isRefreshing={loading}
      />

      <AdminStatsGrid>
        <AdminStatCard title="מאושרים" value={drafts.length} icon={PackageCheck} color="primary" />
        <AdminStatCard title="מוכנים לפרסום" value={ready} icon={CheckCircle2} color="success" />
        <AdminStatCard title="פורסמו" value={published} icon={Store} color="info" />
        <AdminStatCard
          title="חסומים ע״י העסק"
          value={sellerBlocked.length}
          subtitle={sellerBlocked.length > 0 ? "תיקון אחד משחרר את כולם" : undefined}
          icon={RefreshCw}
          color="warning"
        />
      </AdminStatsGrid>

      {sellerBlocked.length > 0 && (
        /* Said once, at the top. Repeating it on every row would read as many
           problems when it is one. */
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/20">
          <strong className="font-semibold">{sellerBlocked.length} מוצרים חסומים בגלל מצב העסק.</strong>{" "}
          {reasonLabel(sellerBlocked[0].unmet.find((code) => SELLER_REASONS.has(code)) || "")} —
          שינוי אחד של המוכר משחרר את כולם.
        </div>
      )}

      <AdminWorkspace
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        detail={
          selected && (
            <div className="p-4 pr-14" dir="rtl">
              <h2 className="text-base font-semibold text-mipo-ink">{selected.name || "ללא שם"}</h2>
              <p className="mt-0.5 text-xs text-mipo-muted">{selected.brand || "ללא מותג"}</p>

              <div className="mt-4 space-y-2">
                {!selectedReport ? (
                  <p className="text-sm text-mipo-muted">לא הצלחנו לקרוא את מצב המוכנות.</p>
                ) : selectedReport.ready ? (
                  <p className="text-sm text-emerald-700">כל התנאים מתקיימים.</p>
                ) : (
                  selectedReport.unmet.map((code) => (
                    <div key={code} className="rounded-xl border border-mipo-line px-3 py-2 text-sm text-mipo-ink">
                      {reasonLabel(code)}
                    </div>
                  ))
                )}
              </div>

              {selectedReport?.ready && selectedReport.publication_state !== "PUBLISHED" && (
                <Button
                  className="mipo-cta-button mt-4 w-full"
                  disabled={publishing === selected.id}
                  onClick={() => publish(selected)}
                >
                  {publishing === selected.id ? "מפרסם..." : "פרסם לחנות"}
                </Button>
              )}
            </div>
          )
        }
      >
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, index) => <Skeleton key={index} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : drafts.length === 0 ? (
          <AdminEmptyState
            icon={PackageCheck}
            title="אין מוצרים מאושרים"
            description="מוצר מגיע לכאן אחרי שהטיוטה שלו אושרה"
          />
        ) : (
          <div className="space-y-2">
            {drafts.map((draft) => {
              const report = readiness[draft.id];
              const isOpen = selectedId === draft.id;
              return (
                <button
                  key={draft.id}
                  type="button"
                  aria-selected={isOpen}
                  onClick={() => setSelectedId(draft.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-right transition-colors",
                    isOpen ? "border-mipo-line bg-mipo-soft" : "border-mipo-line hover:bg-mipo-soft",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-mipo-ink">
                      {draft.name || "ללא שם"}
                    </span>
                    <span className="block truncate text-xs text-mipo-muted">
                      {!report
                        ? "מצב לא ידוע"
                        : report.publication_state === "PUBLISHED"
                          ? "בחנות"
                          : report.ready
                            ? "מוכן לפרסום"
                            : `${report.unmet.length} תנאים חסרים`}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      report?.publication_state === "PUBLISHED"
                        ? "bg-transparent text-emerald-700 border border-emerald-300"
                        : report?.ready
                          ? "mipo-chip-selected"
                          : "bg-transparent text-amber-700 border border-amber-300",
                    )}
                  >
                    {report?.publication_state === "PUBLISHED" ? "פורסם" : report?.ready ? "מוכן" : "חסום"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
    </AdminWorkspace>
    </div>
  );
};

export default PublishingPanel;
