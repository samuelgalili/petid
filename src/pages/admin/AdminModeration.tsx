import { useCallback, useEffect, useState } from "react";
import { History, ShieldAlert } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminStyles";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { createClientId } from "@/lib/randomId";
import {
  blockModerationUser,
  dismissModerationReport,
  getModerationQueue,
  hideModerationReport,
  restoreModerationContent,
  unblockModerationUser,
  type MipoAuditEntry,
  type MipoBlockedUser,
  type MipoHiddenContent,
  type MipoModerationReport,
} from "@/lib/mipoApi";
import { cn } from "@/lib/utils";

const PRIMARY = "#6C63FF";

const REASON_LABELS: Record<string, string> = {
  spam: "ספאם או פרסומת",
  harassment: "הטרדה או פגיעה",
  inappropriate: "תוכן לא הולם",
  person: "אדם או ילד בתמונה",
  price: "מחיר",
  image: "תמונה",
  description: "תיאור",
  other: "משהו אחר",
};

const CONTENT_LABELS: Record<string, string> = {
  post: "רגע",
  comment: "תגובה",
  product: "מוצר",
};

const ACTION_LABELS: Record<string, string> = {
  "moderation.hide": "הסתרה",
  "moderation.restore": "החזרה",
  "moderation.dismiss": "דחיית דיווח",
  "moderation.block": "חסימת משתמש",
  "moderation.unblock": "שחרור חסימה",
};

const timestamp = (value: string) =>
  new Date(value).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const canHide = (report: MipoModerationReport) =>
  report.content_type === "post" || report.content_type === "comment";

const AdminModeration = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState<MipoModerationReport[]>([]);
  const [hidden, setHidden] = useState<MipoHiddenContent[]>([]);
  const [blocked, setBlocked] = useState<MipoBlockedUser[]>([]);
  const [entries, setEntries] = useState<MipoAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const queue = await getModerationQueue();
      setReports(queue.reports);
      setHidden(queue.hidden);
      setBlocked(queue.blocked);
      setEntries(queue.entries);
    } catch (error) {
      toast({
        title: "לא הצלחנו לטעון את התור",
        description: error instanceof Error ? error.message : "שגיאה",
        variant: "destructive",
      });
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const run = async (work: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await work();
      setPending(null);
      toast({ title: success });
      await load(true);
    } catch (error) {
      toast({
        title: "הפעולה לא נשמרה",
        description: error instanceof Error ? error.message : "שגיאה",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout title="מודרציה" icon={ShieldAlert}>
      <div className="space-y-8" dir="rtl">
        <AdminPageHeader
          title="מודרציה"
          description="דיווחים פתוחים. דיווח שקשור לקטין מופיע ראשון."
          icon={ShieldAlert}
          onRefresh={() => void load()}
          isRefreshing={loading}
        />

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-mipo-ink">דיווחים פתוחים</h2>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((index) => <Skeleton key={index} className="h-28 w-full rounded-xl" />)}
            </div>
          ) : reports.length === 0 ? (
            <p className="rounded-xl border border-mipo-line px-4 py-6 text-sm text-mipo-muted">אין דיווחים פתוחים.</p>
          ) : (
            <ol className="space-y-3">
              {reports.map((report) => {
                const hideKey = `${report.id}:hide`;
                const blockKey = `${report.id}:block`;
                return (
                  <li
                    key={report.id}
                    data-testid="moderation-report"
                    className="rounded-xl border border-mipo-line bg-mipo-surface p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {report.involves_minor && (
                        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[12px] font-semibold text-white">קטין</span>
                      )}
                      {report.urgent_person && (
                        <span className="rounded-full border border-mipo-line px-2 py-0.5 text-[12px] text-mipo-ink">אדם או ילד</span>
                      )}
                      <span className="text-[13px] text-mipo-muted">
                        {CONTENT_LABELS[report.content_type] || report.content_type}
                        {" · "}
                        {REASON_LABELS[report.reason] || report.reason}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-mipo-ink">
                      {report.excerpt || "אין טקסט להצגה"}
                    </p>
                    {report.description && (
                      <p className="mt-1 text-[13px] leading-5 text-mipo-muted">{report.description}</p>
                    )}
                    <p className="mt-2 text-[12px] text-mipo-muted">
                      {report.author_name || "בלי שם"}
                      {report.author_blocked ? " · המשתמש חסום" : ""}
                      {report.reporter_name ? ` · דיווח מאת ${report.reporter_name}` : ""}
                      {" · "}
                      {timestamp(report.created_at)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {canHide(report) && pending !== hideKey && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setPending(hideKey)}
                          className="min-h-11 rounded-full px-4 text-sm font-semibold text-white disabled:opacity-50"
                          style={{ backgroundColor: PRIMARY }}
                        >
                          הסתרה
                        </button>
                      )}
                      {pending === hideKey && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void run(
                              () => hideModerationReport(report.id, createClientId("moderation-hide")),
                              "התוכן הוסתר",
                            )}
                            className="min-h-11 rounded-full px-4 text-sm font-semibold text-white disabled:opacity-50"
                            style={{ backgroundColor: PRIMARY }}
                          >
                            אישור הסתרה
                          </button>
                          <button type="button" disabled={busy} onClick={() => setPending(null)} className="min-h-11 rounded-full border border-mipo-line px-4 text-sm">
                            ביטול
                          </button>
                        </>
                      )}
                      {pending !== hideKey && pending !== blockKey && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void run(
                            () => dismissModerationReport(report.id, createClientId("moderation-dismiss")),
                            "הדיווח נדחה",
                          )}
                          className="min-h-11 rounded-full border border-mipo-line px-4 text-sm"
                        >
                          דחייה
                        </button>
                      )}
                      {report.author_id && !report.author_blocked && pending !== blockKey && pending !== hideKey && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setPending(blockKey)}
                          className="min-h-11 rounded-full border border-mipo-line px-4 text-sm"
                        >
                          חסימה
                        </button>
                      )}
                      {pending === blockKey && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void run(
                              () => blockModerationUser(report.id, createClientId("moderation-block")),
                              "המשתמש נחסם",
                            )}
                            className="min-h-11 rounded-full px-4 text-sm font-semibold text-white disabled:opacity-50"
                            style={{ backgroundColor: PRIMARY }}
                          >
                            אישור חסימה
                          </button>
                          <button type="button" disabled={busy} onClick={() => setPending(null)} className="min-h-11 rounded-full border border-mipo-line px-4 text-sm">
                            ביטול
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-mipo-ink">תוכן מוסתר</h2>
          {hidden.length === 0 ? (
            <p className="text-sm text-mipo-muted">אין תוכן מוסתר.</p>
          ) : (
            <ul className="space-y-2">
              {hidden.map((item) => (
                <li key={`${item.content_type}:${item.content_id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mipo-line px-4 py-3">
                  <div>
                    <p className="text-sm text-mipo-ink">{item.excerpt || CONTENT_LABELS[item.content_type]}</p>
                    <p className="text-[12px] text-mipo-muted">
                      {CONTENT_LABELS[item.content_type]}
                      {item.author_name ? ` · ${item.author_name}` : ""}
                      {item.author_blocked ? " · המשתמש חסום, והרגע לא יופיע בפיד עד לשחרור" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run(
                      () => restoreModerationContent(
                        { content_type: item.content_type, content_id: item.content_id },
                        createClientId("moderation-restore"),
                      ),
                      "התוכן הוחזר",
                    )}
                    className="min-h-11 rounded-full border border-mipo-line px-4 text-sm"
                  >
                    החזרה
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-mipo-ink">משתמשים חסומים</h2>
          {blocked.length === 0 ? (
            <p className="text-sm text-mipo-muted">אין משתמשים חסומים.</p>
          ) : (
            <ul className="space-y-2">
              {blocked.map((user) => (
                <li key={user.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mipo-line px-4 py-3">
                  <div>
                    <p className="text-sm text-mipo-ink">{user.author_name || "בלי שם"}</p>
                    <p className="text-[12px] text-mipo-muted">
                      {user.blocked_reason || "חסום"}
                      {" · "}
                      {timestamp(user.blocked_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run(
                      () => unblockModerationUser(user.user_id, createClientId("moderation-unblock")),
                      "החסימה שוחררה",
                    )}
                    className="min-h-11 rounded-full border border-mipo-line px-4 text-sm"
                  >
                    שחרור חסימה
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-mipo-ink">
            <History className="h-4 w-4" strokeWidth={1.75} />
            יומן פעולות
          </h2>
          {entries.length === 0 ? (
            <p className="text-sm text-mipo-muted">עדיין אין פעולות.</p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => (
                <li key={entry.id} className={cn("rounded-xl border border-mipo-line px-4 py-3 text-sm")}>
                  <p className="font-medium text-mipo-ink">{ACTION_LABELS[entry.action_type] || entry.action_type}</p>
                  <p className="text-[12px] text-mipo-muted">
                    {entry.actor_email || "מערכת"}
                    {" · "}
                    {timestamp(entry.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminModeration;
