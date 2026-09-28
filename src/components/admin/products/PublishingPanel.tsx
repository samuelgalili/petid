import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, Loader2, PackageCheck, RefreshCw, Send, Store, Trash2, XCircle,
} from "lucide-react";

import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
import { AdminEmptyState, AdminNumberTile } from "@/components/admin/AdminStyles";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAwsAdminAuth } from "@/hooks/useAwsAdminAuth";
import {
  approveIntakeDraft,
  archiveIntakeDraft,
  getPublicationReadiness,
  listIntakeDrafts,
  publishIntakeProduct,
  rejectIntakeDraft,
  submitIntakeDraft,
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
 * ─── IT USED TO SHOW ONLY THE LAST STEP ─────────────────────────────────────
 *
 * This panel loaded `listIntakeDrafts("APPROVED")` and nothing else, so a draft
 * in IMPORTED, DRAFT, IN_REVIEW or REJECTED existed on no screen in the admin
 * at all. The owner's report was exactly that: "ליד המוצר אין שום כפתור
 * לאישור". There was not one, because there was not a row either.
 *
 * The chain is IMPORTED → DRAFT → IN_REVIEW → APPROVED → (variant, priced
 * offer, inventory, approved image) → PUBLISHED → the shop. The whole queue is
 * here now, and each row carries the one action its state allows, on the row
 * rather than behind a selection - the complaint was about a button not being
 * next to the product.
 *
 * ─── A REFUSAL IS SHOWN BEFORE IT HAPPENS, NOT AFTER ────────────────────────
 *
 * The submitter of a draft may not approve it, and a draft with no recorded
 * submitter cannot be approved by anybody. Both are deliberate: a reviewer
 * approving their own submission is a review that did not happen, and the
 * server fails closed rather than assume an unknown submitter was somebody
 * else. So the button is DISABLED with the reason written next to it, instead
 * of being offered and answering 403.
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

/** Where a draft is, in the words the queue uses. */
const STATE_HE: Record<string, string> = {
  IMPORTED: "יובא",
  DRAFT: "טיוטה",
  IN_REVIEW: "בבדיקה",
  APPROVED: "מאושר",
  REJECTED: "נדחה",
  ARCHIVED: "בארכיון",
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

/**
 * The queue's order: what needs a person next, first.
 *
 * By state rather than by time, because the question this screen answers is
 * "what is waiting for me" and that is a property of the step, not of when the
 * row was last touched. Within a step the API's own order stands.
 *
 * Module scope, not the component body: it is a constant, and rebuilding it on
 * every render while the memo below depends only on `drafts` is the shape of
 * thing that later becomes a stale-closure bug.
 */
const QUEUE_ORDER = ["IN_REVIEW", "APPROVED", "DRAFT", "IMPORTED", "REJECTED", "ARCHIVED"];

/**
 * Whether this admin may approve this draft, and if not, why.
 *
 * Mirrors mayApproveDraft on the server deliberately rather than guessing: the
 * server is still the one that decides, and this exists so the screen can say
 * what will happen instead of letting somebody press a button that cannot work.
 */
const approvalBlock = (
  draft: MipoIntakeDraft,
  adminId: string | null,
): { short: string; long: string } | null => {
  if (draft.state !== "IN_REVIEW") {
    return { short: "לא בבדיקה", long: "אפשר לאשר רק טיוטה שנמצאת בבדיקה" };
  }
  if (!draft.submitted_by) {
    return {
      short: "אין שולח רשום",
      long: "לא רשום מי שלח את הטיוטה לבדיקה, ולכן אי אפשר לאשר אותה",
    };
  }
  if (adminId && String(draft.submitted_by) === String(adminId)) {
    return {
      short: "שלחת אותה",
      long: "מי ששלח טיוטה לבדיקה לא יכול לאשר אותה בעצמו",
    };
  }
  return null;
};

export const PublishingPanel = () => {
  const { toast } = useToast();
  const { admin } = useAwsAdminAuth();
  const [drafts, setDrafts] = useState<MipoIntakeDraft[]>([]);
  const [readiness, setReadiness] = useState<Record<string, MipoPublicationReadiness>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<MipoIntakeDraft | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [discarding, setDiscarding] = useState<MipoIntakeDraft | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Every state, not only APPROVED. A queue that shows the last step is a
      // queue in which the earlier steps have no screen.
      const all = await listIntakeDrafts();
      setDrafts(all);

      // Readiness is per product and there is no batch endpoint, so this is n
      // requests. It is bounded by the 200-row limit the list already imposes,
      // and a failure on one row must not blank the others - a product whose
      // readiness cannot be read is shown as unknown, not as ready.
      const withProduct = all.filter((d) => d.approved_catalog_product_id);
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
  const published = reports.filter((report) => report.publication_state === "PUBLISHED").length;
  const awaitingReview = drafts.filter((draft) => draft.state === "IN_REVIEW").length;
  const approved = drafts.filter((draft) => draft.state === "APPROVED").length;

  // One seller failure blocks every product, so it is counted once and said
  // once rather than repeated on every row.
  const sellerBlocked = reports.filter((report) =>
    report.unmet.some((code) => SELLER_REASONS.has(code)));

  /** Every action on this screen fails the same way, so it reports the same way. */
  const run = useCallback(async (
    draft: MipoIntakeDraft,
    action: () => Promise<unknown>,
    done: (result: unknown) => { title: string; description?: string },
  ) => {
    setBusyId(draft.id);
    try {
      const result = await action();
      toast(done(result));
      await load();
      return true;
    } catch (error) {
      // The server decides inside the transaction, so a refusal here is the
      // truth at the moment of acting rather than a stale read.
      toast({
        title: "הפעולה נדחתה",
        description: error instanceof Error ? error.message : "שגיאה",
        variant: "destructive",
      });
      return false;
    } finally {
      setBusyId(null);
    }
  }, [load, toast]);

  const submit = (draft: MipoIntakeDraft) => run(
    draft,
    () => submitIntakeDraft(draft.id),
    () => ({ title: "נשלח לבדיקה", description: draft.name || "הטיוטה" }),
  );

  const approve = (draft: MipoIntakeDraft) => run(
    draft,
    () => approveIntakeDraft(draft.id),
    () => ({
      title: "אושר",
      // Said because approving is not publishing, and the next step is not
      // obvious: approval creates the catalogue product, which then needs a
      // price, מלאי and an approved image before it can reach the shop.
      description: `${draft.name || "המוצר"} — נוצר מוצר בקטלוג. כדי שיגיע לחנות הוא צריך מחיר, מלאי ותמונה מאושרת.`,
    }),
  );

  const confirmDiscard = async () => {
    if (!discarding) return;
    const ok = await run(
      discarding,
      () => archiveIntakeDraft(discarding.id),
      () => ({ title: "נמחק מהתור", description: discarding.name || "הטיוטה" }),
    );
    if (ok) setDiscarding(null);
  };

  const confirmReject = async () => {
    if (!rejecting) return;
    const note = rejectNote.trim();
    if (!note) return;
    const ok = await run(
      rejecting,
      () => rejectIntakeDraft(rejecting.id, note),
      () => ({ title: "נדחה", description: rejecting.name || "הטיוטה" }),
    );
    if (ok) {
      setRejecting(null);
      setRejectNote("");
    }
  };

  const publish = async (draft: MipoIntakeDraft) => {
    const productId = draft.approved_catalog_product_id;
    if (!productId) return;
    await run(
      draft,
      () => publishIntakeProduct(productId),
      (result) => {
        /*
         * "פורסם" ALONE WAS THE PROBLEM, AND IT WOULD STILL BE ONE.
         *
         * Until the publication bridge existed the word was simply false:
         * publishing wrote a state on catalog_products, the shop reads
         * business_products, and nothing joined them. The product was never on
         * the shelf and this toast said it was.
         *
         * It reaches the shop now - but "published" and "on sale" remain two
         * facts. The shop's only visibility switch is in_stock, taken from
         * inventory availability, so a product with nothing in stock lands in
         * the table and stays off the shelf. Calling that "פורסם" would rebuild
         * the same lie one layer further in.
         */
        const shop = (result as { shop?: { in_stock?: boolean } } | null)?.shop;
        return shop?.in_stock
          ? { title: "בחנות", description: draft.name || "המוצר" }
          : {
            title: "פורסם, אבל לא בחנות",
            description: `${draft.name || "המוצר"} — אין מלאי זמין, אז הוא לא יוצג לקונים. עדכון המלאי יציג אותו.`,
          };
      },
    );
  };

  const selected = drafts.find((draft) => draft.id === selectedId) || null;
  const selectedReport = selectedId ? readiness[selectedId] : null;

  const queue = useMemo(
    () => [...drafts].sort((a, b) => QUEUE_ORDER.indexOf(a.state) - QUEUE_ORDER.indexOf(b.state)),
    [drafts],
  );

  return (
    <div className="space-y-5" dir="rtl">
      {/* No page header. It is a section now, and the chip above it and the
          breadcrumb already both say "ממתינים לפרסום" - a third title saying
          it again is the sort of thing that makes a screen feel heavy. */}
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">מה ממתין, ומה עוצר כל אחד</p>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={load}>
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          רענון
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <AdminNumberTile label="ממתינים לבדיקה" value={awaitingReview} sub="דורשים אישור" icon={PackageCheck}
          tone="text-amber-600 bg-amber-500/10" />
        <AdminNumberTile label="מאושרים" value={approved} sub="ממתינים לפרסום" icon={CheckCircle2}
          tone="text-sky-600 bg-sky-500/10" />
        <AdminNumberTile label="פורסמו" value={published} sub="בחנות" icon={Store}
          tone="text-violet-600 bg-violet-500/10" />
        <AdminNumberTile
          label="חסומים ע״י העסק"
          value={sellerBlocked.length}
          sub={sellerBlocked.length > 0 ? "תיקון אחד משחרר את כולם" : "אין חסימות"}
          icon={RefreshCw}
          tone={sellerBlocked.length > 0 ? "text-amber-600 bg-amber-500/10" : "text-muted-foreground bg-muted"}
        />
      </div>

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
              <p className="mt-0.5 text-xs text-mipo-muted">
                {selected.brand || "ללא מותג"} · {STATE_HE[selected.state] || selected.state}
              </p>

              {selected.state === "REJECTED" && selected.review_note && (
                <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/20">
                  {selected.review_note}
                </div>
              )}

              {selected.state === "APPROVED" && (
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
              )}

              {selected.state === "IMPORTED" && (
                /* IMPORTED → DRAFT is a legal transition with no endpoint
                   behind it, so there is nothing this screen can offer. Said
                   plainly rather than shown as a dead button. */
                <p className="mt-4 text-sm text-mipo-muted">
                  רשומה שיובאה. אין עדיין מסך שהופך אותה לטיוטה.
                </p>
              )}

              <div className="mt-4">
                <RowActions
                  draft={selected}
                  adminId={admin?.id ?? null}
                  report={selectedReport}
                  busy={busyId === selected.id}
                  onSubmit={() => submit(selected)}
                  onApprove={() => approve(selected)}
                  onReject={() => { setRejecting(selected); setRejectNote(""); }}
                  onPublish={() => publish(selected)}
                  onDiscard={() => setDiscarding(selected)}
                  full
                />
              </div>
            </div>
          )
        }
      >
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, index) => <Skeleton key={index} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : queue.length === 0 ? (
          <AdminEmptyState
            icon={PackageCheck}
            title="אין מוצרים בתור"
            description="מוצר מגיע לכאן מייבוא או מטיוטה שנפתחה"
          />
        ) : (
          <div className="space-y-2">
            {queue.map((draft) => {
              const report = readiness[draft.id];
              const isOpen = selectedId === draft.id;
              return (
                <div
                  key={draft.id}
                  aria-selected={isOpen}
                  className={cn(
                    // Stacked on a phone. Side by side, the name shares 390px
                    // with a reason chip and two buttons and comes out as
                    // "בול מא…" - the row stops saying which product it is,
                    // which is the one thing it has to say.
                    "flex w-full flex-col gap-2 rounded-xl border px-3 py-2.5 transition-colors sm:flex-row sm:flex-wrap sm:items-center",
                    isOpen ? "border-mipo-line bg-mipo-soft" : "border-mipo-line hover:bg-mipo-soft",
                  )}
                >
                  {/* The row is still a way into the detail pane, but the
                      action no longer lives only there: the report was that
                      there is no button NEXT TO the product. */}
                  <button
                    type="button"
                    onClick={() => setSelectedId(draft.id)}
                    className="min-w-0 flex-1 text-right"
                  >
                    <span className="block truncate text-sm font-medium text-mipo-ink">
                      {draft.name || "ללא שם"}
                    </span>
                    <span className="block truncate text-xs text-mipo-muted">
                      {draft.state === "APPROVED"
                        ? (!report
                          ? "מצב לא ידוע"
                          : report.publication_state === "PUBLISHED"
                            ? "בחנות"
                            : report.ready
                              ? "מוכן לפרסום"
                              : `${report.unmet.length} תנאים חסרים`)
                        : STATE_HE[draft.state] || draft.state}
                    </span>
                  </button>

                  <div className="shrink-0">
                    <RowActions
                      draft={draft}
                      adminId={admin?.id ?? null}
                      report={report}
                      busy={busyId === draft.id}
                      onSubmit={() => submit(draft)}
                      onApprove={() => approve(draft)}
                      onReject={() => { setRejecting(draft); setRejectNote(""); }}
                      onPublish={() => publish(draft)}
                      onDiscard={() => setDiscarding(draft)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminWorkspace>

      <Dialog
        open={Boolean(discarding)}
        onOpenChange={(next) => { if (!next) setDiscarding(null); }}
      >
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>מחיקת טיוטה</DialogTitle>
            <DialogDescription>
              {/* What actually happens, because "נמחק" and "הוסר מכל מסך" are
                  not the same sentence and the difference matters the day
                  somebody asks who removed a product. The row survives for the
                  audit trail; nothing in the admin can bring it back. */}
              {discarding?.name || "הטיוטה"} תוסר מהתור ולא תופיע יותר באף מסך.
              הרישום נשמר לצורכי ביקורת, ואי אפשר להחזיר אותה מהממשק.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={busyId === discarding?.id}
              onClick={confirmDiscard}
            >
              {busyId === discarding?.id && <Loader2 className="h-4 w-4 animate-spin" />}
              מחיקה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(rejecting)}
        onOpenChange={(next) => { if (!next) { setRejecting(null); setRejectNote(""); } }}
      >
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>דחיית טיוטה</DialogTitle>
            <DialogDescription>
              {/* The server requires a reason and refuses without one. It is
                  required here too rather than sent as an empty string, so the
                  refusal is a disabled button and not a round trip. */}
              הסיבה נשמרת על הטיוטה ותוצג למי שיחזור אליה. חובה לכתוב אותה.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectNote}
            onChange={(event) => setRejectNote(event.target.value)}
            rows={3}
            placeholder="מה חסר או שגוי"
            aria-label="סיבת הדחייה"
          />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={!rejectNote.trim() || busyId === rejecting?.id}
              onClick={confirmReject}
            >
              {busyId === rejecting?.id && <Loader2 className="h-4 w-4 animate-spin" />}
              דחייה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/**
 * The one action a row's state allows, plus the reason when there is none.
 *
 * One component for the row and the detail pane so the two cannot offer
 * different actions for the same draft - which is the bug that appears the
 * first time somebody adds a state and updates only one of them.
 */
const RowActions = ({
  draft, adminId, report, busy, onSubmit, onApprove, onReject, onPublish, onDiscard,
  full = false,
}: {
  draft: MipoIntakeDraft;
  adminId: string | null;
  report?: MipoPublicationReadiness | null;
  busy: boolean;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onPublish: () => void;
  onDiscard: () => void;
  /** In the detail pane the buttons fill the width; on a row they do not. */
  full?: boolean;
}) => {
  const spinner = busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null;

  /*
   * DISCARDING, WHERE THE STATE MACHINE ALLOWS IT.
   *
   * IMPORTED, DRAFT and REJECTED only. An IN_REVIEW draft is somebody's open
   * task and an APPROVED one has a catalogue product bound to it by a trigger
   * and an ON DELETE RESTRICT foreign key - the database refuses either way, so
   * offering the button there would be offering a 409.
   */
  const discardable = ["IMPORTED", "DRAFT", "REJECTED"].includes(draft.state);
  const discard = discardable ? (
    <Button
      size="sm" variant="ghost"
      className={cn("gap-1.5 text-destructive hover:text-destructive", full && "w-full")}
      disabled={busy}
      onClick={onDiscard}
    >
      <Trash2 className="h-3.5 w-3.5" />
      מחיקה
    </Button>
  ) : null;

  if (draft.state === "DRAFT") {
    return (
      <div className={cn("flex items-center gap-1.5", full && "w-full flex-col items-stretch")}>
        <Button size="sm" className={cn("gap-1.5", full && "w-full")} disabled={busy} onClick={onSubmit}>
          {spinner ?? <Send className="h-3.5 w-3.5" />}
          שליחה לבדיקה
        </Button>
        {discard}
      </div>
    );
  }

  if (draft.state === "IN_REVIEW") {
    const blocked = approvalBlock(draft, adminId);
    return (
      <div className={cn("flex items-center gap-1.5", full && "w-full flex-col items-stretch")}>
        {/*
          * WRITTEN OUT, NOT ONLY IN A TOOLTIP.
          *
          * The first version put the reason in `title` alone. A title does not
          * exist on a phone - there is no hover - so the one message this
          * screen most needs to deliver was invisible on the device the owner
          * actually reads it on: a greyed button and no explanation, which
          * reads as a broken feature rather than as the rule it is.
          */}
        {blocked && (
          <span
            className="shrink-0 rounded-full border border-mipo-line px-2 py-0.5 text-[11px] text-mipo-muted"
            title={blocked.long}
          >
            {blocked.short}
          </span>
        )}
        <Button
          size="sm"
          className={cn("gap-1.5", full && "w-full")}
          disabled={busy || Boolean(blocked)}
          title={blocked?.long}
          onClick={onApprove}
        >
          {spinner ?? <CheckCircle2 className="h-3.5 w-3.5" />}
          אישור
        </Button>
        <Button
          size="sm" variant="outline"
          className={cn("gap-1.5", full && "w-full")}
          disabled={busy}
          onClick={onReject}
        >
          <XCircle className="h-3.5 w-3.5" />
          דחייה
        </Button>
        {/* The full sentence where there is room for it. */}
        {blocked && full && <p className="text-xs text-mipo-muted">{blocked.long}</p>}
      </div>
    );
  }

  if (draft.state === "APPROVED") {
    if (report?.publication_state === "PUBLISHED") {
      return (
        <span className="shrink-0 rounded-full border border-emerald-300 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
          פורסם
        </span>
      );
    }
    return (
      <Button
        size="sm"
        className={cn("gap-1.5", full && "w-full")}
        disabled={busy || !report?.ready}
        // Not hidden when the gate refuses: a missing button reads as "nothing
        // to do here", and there is something to do - the detail pane lists it.
        title={report?.ready ? undefined : "השער עוד לא מתקיים — ראו את התנאים החסרים"}
        onClick={onPublish}
      >
        {spinner ?? <Store className="h-3.5 w-3.5" />}
        פרסום לחנות
      </Button>
    );
  }

  /*
   * No state chip here. The row already prints the state under the product's
   * name, and a chip repeating it put "יובא" twice on the same line - which is
   * the sort of thing that reads as a badge meaning something extra when it
   * means nothing at all. The chip existed when this branch had no action;
   * discarding is the action now.
   */
  return discard;
};

export default PublishingPanel;
