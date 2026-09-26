/**
 * Customer 360.
 *
 * ─── A PAGE, NOT A PANEL ────────────────────────────────────────────────────
 *
 * This used to be a column beside the list. That column had one virtue worth
 * keeping - you could read a customer without losing the row you came from -
 * and one problem that could not be fixed by making it wider: everything a
 * person needs about a customer does not fit in a third of a screen, so it
 * became one long scroll in which the pets were below the contact details and
 * the history was below those.
 *
 * The page answers the same need differently, and the way the design asked
 * for: "לקוח קודם" and "לקוח הבא" move between records without a trip back to
 * the list. The list stays a list.
 *
 * ─── WHAT IT ANSWERS, IN ORDER ──────────────────────────────────────────────
 *
 * Who is this, what are they worth, what has happened, what can I do. The
 * header holds the first two above the fold; the tabs hold the third; the
 * right-hand column holds the fourth on every tab, because the reason somebody
 * opens a customer mid-call is usually to do one of those four things and not
 * to read.
 *
 * ─── THE THINGS THIS SCREEN MUST NOT GET WRONG ──────────────────────────────
 *
 * It is read while the customer is on the phone, and two of its claims can
 * cause real harm:
 *
 *   - The order history loads the most recent hundred while the header counts
 *     ALL of them. An agent who searches for an order that is real but not
 *     loaded tells a customer it does not exist. The screen says so, above
 *     the stream, before the searching starts.
 *   - An archived pet has died or been rehomed. It stays - the history is
 *     real, and the owner may raise it - but it is dimmed and labelled,
 *     because asking after a dead animal by name is the worst thing this
 *     screen can cause.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Calendar, Loader2, Mail, MessageCircle, Package, PawPrint, Pencil, Phone,
  PhoneCall, ShoppingBag, StickyNote, Trash2, UserCheck, Users,
} from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EditCustomerDialog } from "@/components/admin/EditCustomerDialog";
import { NewOrderDialog } from "@/components/admin/NewOrderDialog";
import { ShippingLabel, type LabelAddress, type LabelLine } from "@/components/admin/ShippingLabel";
import {
  Entity360Columns, Entity360Header, Entity360Nav, Entity360Panel, Entity360Tabs,
  type Entity360Fact,
} from "@/components/admin/entity360/Entity360";
import { EntityTimeline, relativeHe, type TimelineEntry } from "@/components/admin/entity360/EntityTimeline";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { customerGreeting, openWhatsApp, whatsAppLink } from "@/lib/customerContact";
import { formatPetAgeHe } from "@/lib/petAge";
import {
  NOTE_KINDS, NOTE_KIND_BY_VALUE, ORDER_STATUS_LABELS, PET_TYPE_LABELS,
  formatCurrency, formatDate,
} from "@/lib/adminCustomerLabels";
import {
  createAdminCustomerNote, deleteAdminCustomerNote, getAdminCustomer,
  type MipoCustomerDetail, type MipoCustomerNote, type MipoCustomerNoteKind, type MipoOrder,
} from "@/lib/mipoApi";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "סקירה כללית" },
  { key: "orders", label: "הזמנות" },
  { key: "pets", label: "חיות מחמד" },
  { key: "notes", label: "רישומים" },
];

const ORDER_TONE: Record<string, TimelineEntry["tone"]> = {
  pending: "warn",
  processing: "accent",
  shipped: "accent",
  delivered: "good",
  cancelled: "bad",
};

export const AdminCustomer360 = () => {
  const { identityId } = useParams<{ identityId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [detail, setDetail] = useState<MipoCustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  const [noteKind, setNoteKind] = useState<MipoCustomerNoteKind>("call");
  const [noteBody, setNoteBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MipoCustomerNote | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  /**
   * The label for the order just placed.
   *
   * Held here rather than inside the order dialog, because the dialog closes
   * on success and a label that disappears with the form it came from is a
   * label nobody prints.
   */
  const [placedLabel, setPlacedLabel] = useState<
    { order: MipoOrder; address: LabelAddress; lines: LabelLine[]; amountDue: number } | null
  >(null);

  const load = useCallback(async () => {
    if (!identityId) return;
    setLoading(true);
    try {
      setDetail(await getAdminCustomer(identityId));
    } catch (error) {
      toast({
        title: "לא הצלחנו לטעון את הלקוח",
        description: error instanceof Error ? error.message : "נסה שוב",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [identityId, toast]);

  useEffect(() => { void load(); }, [load]);

  // A fresh composer for each customer, so a half-typed note never follows the
  // agent onto the next card.
  useEffect(() => {
    setNoteBody("");
    setNoteKind("call");
    setTab("overview");
  }, [identityId]);

  const saveNote = useCallback(async (kind: MipoCustomerNoteKind, body: string) => {
    if (!identityId) return false;
    const text = body.trim();
    if (!text) return false;

    setSaving(true);
    try {
      const note = await createAdminCustomerNote(identityId, { kind, body: text });
      setDetail((current) => (current ? { ...current, notes: [note, ...current.notes] } : current));
      return true;
    } catch (error) {
      toast({
        title: "שמירת הרישום נכשלה",
        description: error instanceof Error ? error.message : "נסה שוב",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [identityId, toast]);

  /**
   * The message leaves from the agent's own WhatsApp, so the log entry is the
   * only trace the system will ever have of it. Written before opening.
   */
  const handleWhatsApp = useCallback(async () => {
    if (!detail) return;
    const link = whatsAppLink(detail.customer.phone, customerGreeting(detail.customer.full_name));
    if (!link) return;

    await saveNote("whatsapp", "וואטסאפ נפתח מכרטיס הלקוח (תוכן ההודעה לא נשמר)");
    openWhatsApp(link);
  }, [detail, saveNote]);

  const confirmDelete = useCallback(async () => {
    if (!identityId || !pendingDelete) return;
    setDeleting(true);
    try {
      await deleteAdminCustomerNote(identityId, pendingDelete.id);
      setDetail((current) => (current
        ? { ...current, notes: current.notes.filter((note) => note.id !== pendingDelete.id) }
        : current));
      setPendingDelete(null);
    } catch (error) {
      toast({
        title: "מחיקת הרישום נכשלה",
        description: error instanceof Error ? error.message : "נסה שוב",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }, [identityId, pendingDelete, toast]);

  /**
   * Orders and notes, interleaved.
   *
   * That interleaving is the point: three lists each answer "what happened"
   * partially and leave the merging to somebody who is mid-conversation.
   */
  const timeline = useMemo<TimelineEntry[]>(() => {
    if (!detail) return [];

    const orders: TimelineEntry[] = detail.orders.map((order) => ({
      id: `order:${order.id}`,
      at: order.order_date || order.created_at || null,
      icon: Package,
      title: `הזמנה ${order.order_number}`,
      tone: ORDER_TONE[order.status] ?? "neutral",
      body: `${formatCurrency(Number(order.total) || 0)} · ${ORDER_STATUS_LABELS[order.status] || order.status}`,
      onOpen: () => navigate(`/admin/orders?order=${order.id}`),
    }));

    const notes: TimelineEntry[] = detail.notes.map((note) => {
      const kind = NOTE_KIND_BY_VALUE.get(note.kind);
      return {
        id: `note:${note.id}`,
        at: note.created_at,
        icon: kind?.icon ?? StickyNote,
        title: kind?.label ?? "רישום",
        body: note.body,
        tone: "neutral" as const,
        onRemove: () => setPendingDelete(note),
      };
    });

    return [...orders, ...notes]
      .sort((first, second) => new Date(second.at || 0).getTime() - new Date(first.at || 0).getTime());
  }, [detail, navigate]);

  const customer = detail?.customer;
  const pets = detail?.pets ?? [];
  const whatsapp = customer ? whatsAppLink(customer.phone, customerGreeting(customer.full_name)) : null;

  /**
   * Where "back" goes, and where "next" comes from.
   *
   * The list hands over the ids it was showing, in the order it was showing
   * them, so prev/next follow the SORT AND FILTER the agent was working in
   * rather than some canonical order they never chose. Without it, "next
   * customer" on a screen filtered to unpaid orders would jump to somebody
   * unrelated.
   */
  const siblings = useMemo(
    () => (searchParams.get("list") || "").split(",").filter(Boolean),
    [searchParams],
  );
  const position = identityId ? siblings.indexOf(identityId) : -1;
  const siblingHref = (id: string) =>
    `/admin/customers/${id}${siblings.length ? `?list=${siblings.join(",")}` : ""}`;

  if (loading && !detail) {
    return (
      <AdminLayout title="כרטיס לקוח" icon={Users} breadcrumbs={[{ label: "לקוחות", href: "/admin/customers" }]}>
        <div className="space-y-3">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="grid gap-3 xl:grid-cols-3">
            {[0, 1, 2].map((index) => <Skeleton key={index} className="h-64 rounded-2xl" />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!customer) {
    return (
      <AdminLayout title="כרטיס לקוח" icon={Users} breadcrumbs={[{ label: "לקוחות", href: "/admin/customers" }]}>
        <div className="admin-card max-w-md p-5">
          <h2 className="admin-section">הלקוח לא נמצא</h2>
          <p className="admin-body pt-2">ייתכן שהוא נמחק, או שהקישור שגוי.</p>
          <Button className="admin-focus mt-4" onClick={() => navigate("/admin/customers")}>
            לרשימת הלקוחות
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const facts: Entity360Fact[] = [
    { icon: Mail, value: customer.email || "אין אימייל", ltr: Boolean(customer.email) },
    { icon: Phone, value: customer.phone || "אין טלפון", ltr: Boolean(customer.phone) },
    { icon: Calendar, value: `לקוח מאז ${formatDate(customer.created_at)}` },
  ];

  const quickActions = (
    <Entity360Panel title="פעולות מהירות">
      <div className="grid grid-cols-2 gap-2">
        <Button className="admin-focus col-span-2 gap-1.5" onClick={() => setNewOrderOpen(true)}>
          <ShoppingBag className="h-4 w-4" />
          הזמנה חדשה
        </Button>
        <Button
          className="admin-focus gap-1.5 bg-admin-success text-white hover:bg-admin-success/90"
          disabled={!whatsapp || saving}
          onClick={handleWhatsApp}
        >
          <MessageCircle className="h-4 w-4" />
          וואטסאפ
        </Button>
        <Button
          variant="outline" className="admin-focus gap-1.5"
          disabled={!customer.phone} asChild={Boolean(customer.phone)}
        >
          {customer.phone
            ? <a href={`tel:${customer.phone}`}><PhoneCall className="h-4 w-4" /> חיוג</a>
            : <span><PhoneCall className="h-4 w-4" /> חיוג</span>}
        </Button>
      </div>
      {!whatsapp && (
        <p className="admin-meta pt-2">אין מספר טלפון תקין, אז אי אפשר לשלוח וואטסאפ</p>
      )}
    </Entity360Panel>
  );

  const noteComposer = (
    <Entity360Panel title="רישום חדש">
      <div className="space-y-2">
        <Select value={noteKind} onValueChange={(value) => setNoteKind(value as MipoCustomerNoteKind)}>
          <SelectTrigger className="admin-focus h-9 text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTE_KINDS.map((kind) => (
              <SelectItem key={kind.value} value={kind.value} className="text-[13px]">
                {kind.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          value={noteBody}
          onChange={(event) => setNoteBody(event.target.value)}
          placeholder="מה נאמר, ומה סוכם"
          rows={3}
          className="admin-focus text-[13px]"
          aria-label="תוכן הרישום"
        />
        <Button
          size="sm"
          className="admin-focus w-full gap-1.5"
          disabled={!noteBody.trim() || saving}
          onClick={async () => { if (await saveNote(noteKind, noteBody)) setNoteBody(""); }}
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          שמירה
        </Button>
      </div>
    </Entity360Panel>
  );

  const petList = (
    <div className="space-y-2">
      {pets.length === 0 ? (
        <p className="admin-meta py-4 text-center">אין חיות רשומות</p>
      ) : pets.map((pet) => {
        const age = formatPetAgeHe(pet);
        const conditions = (pet.medical_conditions || []).filter(Boolean);
        return (
          <div
            key={pet.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border border-admin-line p-2.5",
              // An archived animal has died or been rehomed. It stays, because
              // the history is real - dimmed and labelled, because asking
              // after a dead pet by name is the worst thing this can cause.
              pet.archived && "bg-admin-sunk opacity-60",
            )}
          >
            {pet.avatar_url ? (
              <img src={pet.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full bg-admin-sunk object-cover" />
            ) : (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-admin-line">
                <PawPrint className="h-4 w-4 text-admin-ink-subtle" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[13px] font-semibold text-admin-ink">{pet.name}</span>
                {pet.archived && (
                  <span className="admin-meta rounded border border-admin-line px-1">בארכיון</span>
                )}
                <span className="admin-meta">
                  {PET_TYPE_LABELS[pet.type] || pet.type}{pet.breed ? ` · ${pet.breed}` : ""}
                </span>
              </div>
              <p className="admin-meta">
                {/* An unknown age says so. It never shows as zero. */}
                {age || "גיל לא ידוע"}
                {pet.gender === "male" ? " · זכר" : pet.gender === "female" ? " · נקבה" : ""}
                {typeof pet.weight === "number" && pet.weight > 0 ? ` · ${pet.weight} ק״ג` : ""}
              </p>
              {conditions.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1.5">
                  {conditions.map((condition) => (
                    <span
                      key={condition}
                      className="rounded-full bg-admin-warning-soft px-1.5 py-0.5 text-[10px] text-admin-warning"
                    >
                      {condition}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {/* Said separately from the list, because the count above the card is
          of LIVE animals and this list holds both. Asking after a dead pet by
          name is the worst thing this screen can cause, so the number that
          explains the dimmed rows is stated rather than inferred. */}
      {(detail?.archived_pets_count ?? 0) > 0 && (
        <p className="admin-meta pt-1">
          {detail?.archived_pets_count === 1
            ? "חיה אחת בארכיון"
            : `${detail?.archived_pets_count} חיות בארכיון`}
        </p>
      )}
    </div>
  );

  /**
   * Said ABOVE the stream, not at its end.
   *
   * The point is to be read before the searching starts, by somebody with a
   * customer on the line asking about an order from last year.
   */
  const truncationWarning = detail?.orders_truncated ? (
    <p className="rounded-xl bg-admin-warning-soft px-3 py-2 text-[12px] leading-5 text-admin-warning">
      מוצגות {detail.orders_shown} ההזמנות האחרונות מתוך {customer.orders_count}.
      הזמנה ישנה יותר לא תופיע כאן גם אם היא קיימת.
    </p>
  ) : null;

  return (
    <AdminLayout
      title={customer.full_name || "ללא שם"}
      icon={Users}
      breadcrumbs={[{ label: "לקוחות", href: "/admin/customers" }, { label: customer.full_name || "ללא שם" }]}
    >
      <Entity360Nav
        backLabel="חזרה לרשימת הלקוחות"
        onBack={() => navigate("/admin/customers")}
        previousLabel="לקוח קודם"
        nextLabel="לקוח הבא"
        onPrevious={position > 0 ? () => navigate(siblingHref(siblings[position - 1])) : undefined}
        onNext={position >= 0 && position < siblings.length - 1
          ? () => navigate(siblingHref(siblings[position + 1]))
          : undefined}
      />

      <div className="space-y-3">
        <Entity360Header
          avatar={
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-admin-accent-soft text-xl font-bold text-admin-accent">
              {(customer.full_name || customer.email || "?").charAt(0).toUpperCase()}
            </span>
          }
          title={customer.full_name || "ללא שם"}
          status={customer.identity_kind === "account" ? "בעל חשבון" : "אורח"}
          statusTone={customer.identity_kind === "account" ? "good" : "neutral"}
          facts={facts}
          note={customer.last_login_at ? `התחבר לאחרונה ${relativeHe(customer.last_login_at)}` : null}
          metrics={[
            { label: "הזמנות", value: customer.orders_count, icon: ShoppingBag },
            { label: "סה״כ רכישות", value: formatCurrency(customer.total_spent), icon: UserCheck },
            { label: "חיות מחמד", value: customer.pets_count, icon: PawPrint },
          ]}
          actions={
            <Button variant="outline" size="sm" className="admin-focus gap-1.5" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" />
              עריכת פרטים
            </Button>
          }
        />

        <Entity360Tabs
          tabs={TABS.map((entry) => ({
            ...entry,
            count: entry.key === "orders" ? detail?.orders.length
              : entry.key === "pets" ? pets.length
                : entry.key === "notes" ? detail?.notes.length
                  : undefined,
          }))}
          active={tab}
          onSelect={setTab}
        />

        {tab === "overview" && (
          <Entity360Columns
            facts={
              <>
                <Entity360Panel title="חיות מחמד">{petList}</Entity360Panel>
              </>
            }
            stream={
              <Entity360Panel title="פעילות אחרונה">
                {truncationWarning}
                <div className={truncationWarning ? "pt-2" : undefined}>
                  <EntityTimeline entries={timeline.slice(0, 12)} empty="עוד לא קרה כלום" />
                </div>
              </Entity360Panel>
            }
            actions={
              <>
                {quickActions}
                {noteComposer}
              </>
            }
          />
        )}

        {tab === "orders" && (
          <Entity360Panel title="הזמנות">
            {truncationWarning}
            <div className={truncationWarning ? "pt-2" : undefined}>
              <EntityTimeline
                entries={timeline.filter((entry) => entry.id.startsWith("order:"))}
                empty="הלקוח עוד לא הזמין"
              />
            </div>
          </Entity360Panel>
        )}

        {tab === "pets" && <Entity360Panel title="חיות מחמד">{petList}</Entity360Panel>}

        {tab === "notes" && (
          <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Entity360Panel title="רישומים">
              <EntityTimeline
                entries={timeline.filter((entry) => entry.id.startsWith("note:"))}
                empty="עוד לא נרשם כלום"
              />
            </Entity360Panel>
            {noteComposer}
          </div>
        )}
      </div>

      <EditCustomerDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
        onSaved={() => void load()}
      />

      <NewOrderDialog
        open={newOrderOpen}
        onOpenChange={setNewOrderOpen}
        customer={customer}
        orders={detail?.orders ?? []}
        // Reloaded, so the new order shows in the history beneath it - an
        // order that does not appear is an order the admin places twice.
        onCreated={() => void load()}
        onPlaced={(order, address, lines) => setPlacedLabel({
          order,
          address,
          lines: lines.map((line) => ({ name: line.product.name, quantity: line.quantity })),
          // What the courier still has to collect. An order paid by any other
          // route is nothing to collect at the door, and saying otherwise
          // costs a customer being asked twice.
          amountDue: order.payment_status === "awaiting_cod" ? Number(order.total) || 0 : 0,
        })}
      />

      {placedLabel && (
        <ShippingLabel
          open
          onOpenChange={(next) => { if (!next) setPlacedLabel(null); }}
          order={placedLabel.order}
          address={placedLabel.address}
          lines={placedLabel.lines}
          amountDue={placedLabel.amountDue}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(next) => { if (!next) setPendingDelete(null); }}
        title="מחיקת רישום"
        description="הרישום יימחק לצמיתות. אי אפשר לבטל."
        confirmLabel="מחיקה"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
        icon={<Trash2 className="h-5 w-5 text-admin-danger" />}
      />
    </AdminLayout>
  );
};

export default AdminCustomer360;
