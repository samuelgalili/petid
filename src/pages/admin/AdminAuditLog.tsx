import { useCallback, useEffect, useState } from "react";
import { Bot, Cpu, History, User, Workflow } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminStyles";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { listAuditLog, type MipoAuditActorType, type MipoAuditEntry } from "@/lib/mipoApi";
import { cn } from "@/lib/utils";

/**
 * Who did what, and which kind of "who".
 *
 * admin_audit_log has existed all along with 19 write sites and no screen. The
 * only way to read it was a psql session, which means in practice it was
 * written and never read - and a log nobody reads is a log nobody would notice
 * had stopped being written.
 *
 * The actor filter is the point of this screen rather than a convenience. Once
 * Phase 6's reactions and Phase 9's agents write here, "show me what a PERSON
 * did today" and "show me what the system did today" become different
 * questions, and the answer to the first is the one that matters in an
 * incident.
 *
 * Every filter is applied in SQL. Filtering a fetched page in the browser is
 * filtering the most recent 50 rows, which returns an empty state that looks
 * exactly like "nothing happened".
 */

const ACTORS: Array<{ value: MipoAuditActorType; label: string; icon: typeof User }> = [
  { value: "admin", label: "אדם", icon: User },
  { value: "system", label: "מערכת", icon: Cpu },
  { value: "workflow", label: "תהליך", icon: Workflow },
  { value: "ai_agent", label: "סוכן AI", icon: Bot },
];

const ACTOR_BY_VALUE = new Map(ACTORS.map((actor) => [actor.value, actor]));

const timestamp = (value: string) =>
  new Date(value).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const AdminAuditLog = () => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<MipoAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorType, setActorType] = useState<MipoAuditActorType | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await listAuditLog({ actorType, limit: 100 }));
    } catch (error) {
      toast({
        title: "לא הצלחנו לטעון את היומן",
        description: error instanceof Error ? error.message : "שגיאה",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [actorType, toast]);

  useEffect(() => { void load(); }, [load]);

  const selected = entries.find((entry) => entry.id === selectedId) || null;

  return (
    <AdminLayout title="יומן ביקורת" icon={History}>
      <div className="space-y-5" dir="rtl">
        <AdminPageHeader
          title="יומן ביקורת"
          description="מי עשה מה, ואיזה סוג של מי"
          icon={History}
          onRefresh={load}
          isRefreshing={loading}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActorType(null)}
            className={cn(
              "min-h-11 rounded-full border px-4 text-[13px] font-medium transition-colors",
              actorType === null
                ? "mipo-chip-selected"
                : "border-mipo-line bg-mipo-surface text-mipo-ink hover:bg-mipo-soft",
            )}
          >
            הכל
          </button>
          {ACTORS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setActorType(value)}
              className={cn(
                "flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[13px] font-medium transition-colors",
                actorType === value
                  ? "mipo-chip-selected"
                  : "border-mipo-line bg-mipo-surface text-mipo-ink hover:bg-mipo-soft",
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>

        <AdminWorkspace
          open={Boolean(selected)}
          onClose={() => setSelectedId(null)}
          detail={
            selected && (
              <div className="p-4 pr-14" dir="rtl">
                <h2 className="text-base font-semibold text-mipo-ink">{selected.action_type}</h2>
                <p className="mt-0.5 text-[13px] text-mipo-muted">
                  {selected.entity_type}
                  {selected.entity_id ? ` · ${selected.entity_id}` : ""}
                </p>

                <dl className="mt-4 space-y-2 text-[13px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-mipo-muted">מבצע</dt>
                    <dd className="text-mipo-ink">
                      {ACTOR_BY_VALUE.get(selected.actor_type)?.label || selected.actor_type}
                      {selected.actor_email ? ` · ${selected.actor_email}` : ""}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-mipo-muted">מתי</dt>
                    <dd className="tabular-nums text-mipo-ink">{timestamp(selected.created_at)}</dd>
                  </div>
                </dl>

                {/* Before and after, shown as they were recorded. Rendering them
                    into prose would mean interpreting them, and an audit entry
                    that has been interpreted is not evidence any more. */}
                {["old_values", "new_values", "metadata"].map((key) => {
                  const value = selected[key as keyof MipoAuditEntry];
                  if (!value) return null;
                  return (
                    <div key={key} className="mt-4">
                      <h3 className="text-[12px] font-semibold text-mipo-muted">{key}</h3>
                      <pre className="mt-1 overflow-x-auto rounded-xl border border-mipo-line p-3 text-[12px] text-mipo-ink" dir="ltr">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    </div>
                  );
                })}
              </div>
            )
          }
        >
          {loading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, index) => <Skeleton key={index} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : entries.length === 0 ? (
            <AdminEmptyState
              icon={History}
              title="אין רשומות"
              description={actorType ? "אין פעולות מהסוג הזה בטווח שנטען" : "היומן ריק"}
            />
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => {
                const actor = ACTOR_BY_VALUE.get(entry.actor_type);
                const ActorIcon = actor?.icon || User;
                const isOpen = selectedId === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    aria-selected={isOpen}
                    onClick={() => setSelectedId(entry.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-right transition-colors",
                      isOpen ? "border-mipo-line bg-mipo-soft" : "border-mipo-line hover:bg-mipo-soft",
                    )}
                  >
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-mipo-line">
                      <ActorIcon className="h-4 w-4 text-mipo-ink" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-mipo-ink">
                        {entry.action_type}
                      </span>
                      <span className="block truncate text-[12px] text-mipo-muted">
                        {entry.actor_email || actor?.label || entry.actor_type} · {entry.entity_type}
                      </span>
                    </span>
                    <span className="flex-shrink-0 text-[12px] tabular-nums text-mipo-muted">
                      {timestamp(entry.created_at)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </AdminWorkspace>
      </div>
    </AdminLayout>
  );
};

export default AdminAuditLog;
