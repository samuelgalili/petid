/**
 * AdminCustomers — one row per human.
 *
 * Until now the admin panel could show orders but not the people behind them:
 * a returning customer looked like two unrelated orders, and a guest checkout
 * looked like nothing at all. This reads customer_identities, which folds the
 * auth identity (app_users) and the commerce identity (shop_customers) into a
 * single row, and adds what admins actually ask for — how many orders, how much
 * they spent, how many pets, when they were last seen.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Users, UserCheck, UserPlus, ShoppingBag, DollarSign, PawPrint,
  Mail, Phone, Calendar, ChevronRight, Package, MessageCircle,
  PhoneCall, StickyNote, CalendarClock, Trash2, Loader2, type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
import { formatPetAgeHe } from "@/lib/petAge";
import {
  AdminStatCard, AdminStatsGrid, AdminToolbar,
  AdminEmptyState, AdminPageHeader,
} from "@/components/admin/AdminStyles";
import { cn } from "@/lib/utils";
import { customerGreeting, openWhatsApp, whatsAppLink } from "@/lib/customerContact";
import { createClientId } from "@/lib/randomId";
import {
  createAdminCustomer, createAdminCustomerNote, deleteAdminCustomerNote, getAdminCustomer, getAdminCustomers,
  type MipoCustomer, type MipoCustomerDetail, type MipoCustomerNote, type MipoCustomerNoteKind,
  type MipoNewCustomerResult, type MipoShopCustomerRow,
} from "@/lib/mipoApi";

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "ממתין",
  processing: "בטיפול",
  shipped: "נשלח",
  delivered: "נמסר",
  cancelled: "בוטל",
};

const PET_TYPE_LABELS: Record<string, string> = {
  dog: "כלב",
  cat: "חתול",
  other: "אחר",
};

const NOTE_KINDS: Array<{ value: MipoCustomerNoteKind; label: string; icon: LucideIcon }> = [
  { value: "call", label: "שיחה", icon: PhoneCall },
  { value: "note", label: "הערה", icon: StickyNote },
  { value: "whatsapp", label: "וואטסאפ", icon: MessageCircle },
  { value: "email", label: "מייל", icon: Mail },
  { value: "meeting", label: "פגישה", icon: CalendarClock },
];

const NOTE_KIND_BY_VALUE = new Map(NOTE_KINDS.map((kind) => [kind.value, kind]));

// Keeps the agorot when there are any, so an order total reads ₪144.80 rather
// than a rounded ₪145 that will not match the invoice.
const formatCurrency = (value: number) => `₪${value.toLocaleString("he-IL", {
  minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  maximumFractionDigits: 2,
})}`;

const formatDate = (value?: string | null) => (
  value ? new Date(value).toLocaleDateString("he-IL") : "—"
);

// A call log is useless without the hour: two calls on the same day are a
// different story from one.
const formatDateTime = (value?: string | null) => (
  value
    ? new Date(value).toLocaleString("he-IL", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    })
    : "—"
);

const AdminCustomers = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<MipoCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "account" | "guest">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MipoCustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      setCustomers(await getAdminCustomers({ limit: 500 }));
    } catch (error) {
      toast({
        title: "טעינת הלקוחות נכשלה",
        description: error instanceof Error ? error.message : "נסה לרענן",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetail(null);

    getAdminCustomer(selectedId)
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast({
          title: "טעינת כרטיס הלקוח נכשלה",
          description: error instanceof Error ? error.message : "נסה שוב",
          variant: "destructive",
        });
        setSelectedId(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, toast]);

  // Notes change nothing in the list row, so the panel updates in place rather
  // than refetching the whole card on every entry.
  const handleNoteAdded = useCallback((note: MipoCustomerNote) => {
    setDetail((current) => (current ? { ...current, notes: [note, ...current.notes] } : current));
  }, []);

  const handleNoteDeleted = useCallback((noteId: string) => {
    setDetail((current) => (
      current ? { ...current, notes: current.notes.filter((note) => note.id !== noteId) } : current
    ));
  }, []);

  // Filtering runs on the client so typing stays instant. The server takes the
  // same filters when the list outgrows a single fetch.
  const filtered = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return customers.filter((customer) => {
      if (kindFilter !== "all" && customer.identity_kind !== kindFilter) return false;
      if (!term) return true;
      return [customer.email, customer.full_name, customer.phone]
        .some((field) => field?.toLowerCase().includes(term));
    });
  }, [customers, kindFilter, searchQuery]);

  const stats = useMemo(() => {
    const accounts = customers.filter((customer) => customer.identity_kind === "account").length;
    return {
      total: customers.length,
      accounts,
      guests: customers.length - accounts,
      buyers: customers.filter((customer) => customer.orders_count > 0).length,
      revenue: customers.reduce((sum, customer) => sum + customer.total_spent, 0),
    };
  }, [customers]);

  return (
    <AdminLayout title="לקוחות" icon={Users}>
      <div className="space-y-5" dir="rtl">
        <AdminPageHeader
          title="לקוחות"
          description="כל מי שנרשם או הזמין, שורה אחת לאדם"
          icon={Users}
          onRefresh={fetchCustomers}
          isRefreshing={loading}
          actions={
            <Button size="sm" className="gap-1.5" onClick={() => setNewCustomerOpen(true)}>
              <UserPlus className="w-3.5 h-3.5" />
              לקוח חדש
            </Button>
          }
        />

        <NewCustomerDialog
          open={newCustomerOpen}
          onOpenChange={setNewCustomerOpen}
          onCreated={fetchCustomers}
          // A match is not a dead end: the agent came here to reach a person,
          // so the search is pointed at the row that already exists.
          onFindExisting={(term) => {
            setKindFilter("all");
            setSearchQuery(term);
          }}
        />

        <AdminStatsGrid>
          <AdminStatCard title="סה״כ לקוחות" value={stats.total} icon={Users} color="primary" />
          <AdminStatCard
            title="בעלי חשבון"
            value={stats.accounts}
            subtitle={`${stats.guests} אורחים`}
            icon={UserCheck}
            color="info"
          />
          <AdminStatCard title="ביצעו הזמנה" value={stats.buyers} icon={ShoppingBag} color="warning" />
          <AdminStatCard title="הכנסות ששולמו" value={formatCurrency(stats.revenue)} icon={DollarSign} color="success" />
        </AdminStatsGrid>

        <AdminToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="חיפוש לפי שם, אימייל או טלפון..."
          onRefresh={fetchCustomers}
          isRefreshing={loading}
        >
          <Select value={kindFilter} onValueChange={(value) => setKindFilter(value as typeof kindFilter)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="סוג" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="account">בעלי חשבון</SelectItem>
              <SelectItem value="guest">אורחים</SelectItem>
            </SelectContent>
          </Select>
        </AdminToolbar>

        {/* The list and the card side by side, so a customer can be read and
            written about without losing the row they came from. */}
        <AdminWorkspace
          open={!!selectedId}
          onClose={() => setSelectedId(null)}
          detail={
            <CustomerDetailPanel
              detail={detail}
              loading={detailLoading}
              onNoteAdded={handleNoteAdded}
              onNoteDeleted={handleNoteDeleted}
            />
          }
        >
          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, index) => <Skeleton key={index} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : filtered.length === 0 ? (
            <AdminEmptyState
              icon={Users}
              title="אין לקוחות"
              description={customers.length === 0 ? "עדיין לא נרשם ולא הזמין אף אחד" : "לא נמצאו לקוחות התואמים לחיפוש"}
            />
          ) : (
            <Card className="border-border/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-muted-foreground">
                      <th className="py-3 px-3 text-right font-medium">לקוח</th>
                      <th className="py-3 px-3 text-right font-medium">קשר</th>
                      <th className="py-3 px-3 text-center font-medium">סוג</th>
                      <th className="py-3 px-3 text-center font-medium">חיות</th>
                      <th className="py-3 px-3 text-center font-medium">הזמנות</th>
                      <th className="py-3 px-3 text-left font-medium">שולם</th>
                      <th className="py-3 px-3 text-right font-medium">הזמנה אחרונה</th>
                      <th className="py-3 px-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((customer) => (
                      <tr
                        key={customer.identity_id}
                        // The selected row has to be visible now. Under a
                        // sheet it did not matter - the sheet covered the
                        // list - but beside one, an unmarked list leaves the
                        // two panes with nothing tying them together.
                        aria-selected={selectedId === customer.identity_id}
                        className={cn(
                          "border-b transition-colors cursor-pointer",
                          selectedId === customer.identity_id
                            ? "bg-mipo-soft"
                            : "hover:bg-muted/30",
                        )}
                        onClick={() => setSelectedId(customer.identity_id)}
                      >
                        <td className="py-3 px-3">
                          <p className="font-semibold text-foreground text-xs">
                            {customer.full_name || "ללא שם"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            נרשם {formatDate(customer.created_at)}
                          </p>
                        </td>
                        <td className="py-3 px-3">
                          <p className="text-xs text-foreground">{customer.email || "—"}</p>
                          <p className="text-[10px] text-muted-foreground" dir="ltr">
                            {customer.phone || ""}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              customer.identity_kind === "account"
                                ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
                                : "text-muted-foreground",
                            )}
                          >
                            {customer.identity_kind === "account" ? "חשבון" : "אורח"}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-center text-xs">{customer.pets_count}</td>
                        <td className="py-3 px-3 text-center text-xs">{customer.orders_count}</td>
                        <td className="py-3 px-3 text-left text-xs font-semibold">
                          {formatCurrency(customer.total_spent)}
                        </td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">
                          {formatDate(customer.last_order_at)}
                        </td>
                        <td className="py-3 px-3">
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t bg-muted/20 text-xs text-muted-foreground">
                מציג {filtered.length} מתוך {customers.length} לקוחות
              </div>
            </Card>
          )}
        </AdminWorkspace>
      </div>
    </AdminLayout>
  );
};

/**
 * Opening a customer by hand.
 *
 * Until now a row here could only be born at the checkout, so somebody who
 * rang up about a rabbit and left a mobile number could not be represented at
 * all. The hard part is not the form - it is that a second way to create rows
 * is a second way to create duplicates, and this table already has them.
 *
 * So the dialog has three outcomes rather than one, and the two matches are
 * shown differently because they MEAN different things:
 *
 *   an email match  -> that is the customer. Nothing was created, and the
 *                      agent is pointed at the row that already exists.
 *   a phone match   -> that might be them, or their partner at the same
 *                      number. The candidates are shown and the agent decides.
 */
const NewCustomerDialog = ({
  open,
  onOpenChange,
  onCreated,
  onFindExisting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  onFindExisting: (term: string) => void;
}) => {
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [matched, setMatched] = useState<MipoNewCustomerResult | null>(null);

  // ONE KEY PER SUBMISSION, minted when the form changes.
  //
  // A key generated per click is not idempotency: a double-click or a retry
  // after a timeout whose write landed would open a second customer. A key
  // that never changes is worse - the server answers a reused key carrying a
  // different body with 409, so editing a typo and submitting again would
  // fail. Keeping it alive exactly as long as the form's content does is what
  // makes a retry a retry and an edit a new request.
  const idempotencyKey = useRef(createClientId("customer"));
  const resetKey = useCallback(() => {
    idempotencyKey.current = createClientId("customer");
  }, []);

  useEffect(() => {
    if (!open) return;
    setFullName("");
    setEmail("");
    setPhone("");
    setMatched(null);
    resetKey();
  }, [open, resetKey]);

  const submit = useCallback(async (acceptDuplicatePhone: boolean) => {
    const name = fullName.trim();
    if (!name) return;

    setSaving(true);
    try {
      const result = await createAdminCustomer(
        {
          full_name: name,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          accept_duplicate_phone: acceptDuplicatePhone || undefined,
        },
        idempotencyKey.current,
      );

      if (result.created) {
        toast({
          title: "הלקוח נפתח",
          description: result.account_match
            ? "שים לב: קיים משתמש רשום עם אותו אימייל. הקישור בין השניים לא בוצע אוטומטית."
            : undefined,
        });
        onCreated();
        onOpenChange(false);
        return;
      }

      setMatched(result);
    } catch (error) {
      toast({
        title: "פתיחת הלקוח נכשלה",
        description: error instanceof Error ? error.message : "נסה שוב",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [email, fullName, onCreated, onOpenChange, phone, toast]);

  // A different body needs a different key, or the server refuses the replay.
  const createAnyway = useCallback(() => {
    resetKey();
    setMatched(null);
    void submit(true);
  }, [resetKey, submit]);

  const onFieldChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setMatched(null);
    resetKey();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader className="text-right">
          <DialogTitle>לקוח חדש</DialogTitle>
          <DialogDescription>
            שם, ולפחות אחד מהשניים: אימייל או טלפון. בלעדיהם אי אפשר יהיה לזהות אותו שוב.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-customer-name" className="text-xs">שם מלא</Label>
            <Input
              id="new-customer-name"
              value={fullName}
              onChange={(event) => onFieldChange(setFullName)(event.target.value)}
              placeholder="דנה כהן"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-customer-email" className="text-xs">אימייל</Label>
            <Input
              id="new-customer-email"
              type="email"
              dir="ltr"
              value={email}
              onChange={(event) => onFieldChange(setEmail)(event.target.value)}
              placeholder="dana@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-customer-phone" className="text-xs">טלפון</Label>
            <Input
              id="new-customer-phone"
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(event) => onFieldChange(setPhone)(event.target.value)}
              placeholder="050-123-4567"
            />
          </div>
        </div>

        {matched?.created === false && matched.matched_by === "email" && (
          <div className="rounded-xl border border-mipo-line bg-mipo-soft p-3 space-y-2 text-xs">
            <p className="font-semibold">הלקוח הזה כבר קיים</p>
            <CustomerCandidate customer={matched.customer} />
            <p className="text-muted-foreground">
              לא נפתח לקוח חדש. אימייל הוא זהות — אותה כתובת היא אותו אדם.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                onFindExisting(matched.customer.email || matched.customer.full_name || "");
                onOpenChange(false);
              }}
            >
              הצג אותו ברשימה
            </Button>
          </div>
        )}

        {matched?.created === false && matched.matched_by === "phone" && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-2 text-xs dark:bg-amber-950/30">
            <p className="font-semibold">{matched.message}</p>
            {matched.candidates.map((candidate) => (
              <CustomerCandidate key={candidate.id} customer={candidate} />
            ))}
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onFindExisting(matched.candidates[0]?.phone || "");
                  onOpenChange(false);
                }}
              >
                זה אותו אדם
              </Button>
              <Button size="sm" className="flex-1" disabled={saving} onClick={createAnyway}>
                זה אדם אחר, פתח בכל זאת
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-start">
          <Button disabled={saving || !fullName.trim()} onClick={() => submit(false)}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            פתיחת לקוח
          </Button>
          <Button variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CustomerCandidate = ({ customer }: { customer: MipoShopCustomerRow }) => (
  <div className="rounded-lg border border-mipo-line bg-mipo-surface px-2.5 py-2">
    <p className="font-semibold text-mipo-ink">{customer.full_name || "ללא שם"}</p>
    <p className="text-muted-foreground" dir="ltr">{customer.email || "—"}</p>
    <p className="text-muted-foreground" dir="ltr">{customer.phone || "—"}</p>
    <p className="text-[10px] text-muted-foreground">נפתח {formatDate(customer.created_at)}</p>
  </div>
);

const CustomerDetailPanel = ({
  detail,
  loading,
  onNoteAdded,
  onNoteDeleted,
}: {
  detail: MipoCustomerDetail | null;
  loading: boolean;
  onNoteAdded: (note: MipoCustomerNote) => void;
  onNoteDeleted: (noteId: string) => void;
}) => {
  const { toast } = useToast();
  const [noteKind, setNoteKind] = useState<MipoCustomerNoteKind>("call");
  const [noteBody, setNoteBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MipoCustomerNote | null>(null);
  const [deleting, setDeleting] = useState(false);

  const identityId = detail?.customer.identity_id;

  // A fresh composer for each customer, so a half-typed note never follows the
  // agent onto the next card.
  useEffect(() => {
    setNoteBody("");
    setNoteKind("call");
  }, [identityId]);

  const saveNote = useCallback(async (kind: MipoCustomerNoteKind, body: string) => {
    if (!identityId) return false;
    const text = body.trim();
    if (!text) return false;

    setSaving(true);
    try {
      onNoteAdded(await createAdminCustomerNote(identityId, { kind, body: text }));
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
  }, [identityId, onNoteAdded, toast]);

  // The message leaves from the agent's own WhatsApp, so the log entry is the
  // only trace the system will ever have of it. Write it before opening.
  const handleWhatsApp = useCallback(async () => {
    if (!detail) return;
    const link = whatsAppLink(detail.customer.phone, customerGreeting(detail.customer.full_name));
    if (!link) return;

    await saveNote("whatsapp", "וואטסאפ נפתח מכרטיס הלקוח (תוכן ההודעה לא נשמר)");
    openWhatsApp(link);
  }, [detail, saveNote]);

  const handleSubmitNote = useCallback(async () => {
    if (await saveNote(noteKind, noteBody)) setNoteBody("");
  }, [noteBody, noteKind, saveNote]);

  const confirmDelete = useCallback(async () => {
    if (!identityId || !pendingDelete) return;
    setDeleting(true);
    try {
      await deleteAdminCustomerNote(identityId, pendingDelete.id);
      onNoteDeleted(pendingDelete.id);
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
  }, [identityId, onNoteDeleted, pendingDelete, toast]);

  // Orders and notes share one chronological stream: that is what turns a list
  // of facts about a person into a history of dealing with them.
  const timeline = useMemo(() => {
    if (!detail) return [];
    return [
      ...detail.notes.map((note) => ({ at: note.created_at, note, order: null })),
      ...detail.orders.map((order) => ({
        at: order.order_date || order.created_at || "",
        note: null,
        order,
      })),
    ].sort((first, second) => new Date(second.at).getTime() - new Date(first.at).getTime());
  }, [detail]);

  if (loading || !detail) {
    return (
      <div dir="rtl">
        <div className="p-4 pr-14 border-b border-mipo-line text-right">
          <h2 className="text-base font-semibold text-mipo-ink">כרטיס לקוח</h2>
        </div>
        <div className="p-4 space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  const { customer, pets } = detail;
  const whatsapp = whatsAppLink(customer.phone, customerGreeting(customer.full_name));

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Plain markup, not SheetHeader/SheetTitle. This panel now renders in
          two places - inside the Sheet on a narrow screen, and standalone in
          the workspace column on a wide one - and SheetTitle is a Radix
          Dialog.Title, which THROWS when it is rendered outside a Dialog. The
          side-by-side layout would have crashed the page on first open.

          pr-14 keeps the name clear of the close button, which sits in the
          same corner in both contexts. */}
      <div className="p-4 pr-14 border-b border-mipo-line space-y-1 text-right">
        <h2 className="text-base font-semibold text-mipo-ink">{customer.full_name || "ללא שם"}</h2>
        <p className="text-xs text-muted-foreground">
          {customer.identity_kind === "account" ? "בעל חשבון" : "אורח, הזמין בלי להירשם"}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          <Card className="border-border/40">
            <CardContent className="p-3 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{customer.email || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <span dir="ltr">{customer.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span>נרשם {formatDate(customer.created_at)}</span>
              </div>
              {customer.last_login_at && (
                <div className="flex items-center gap-2">
                  <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>התחבר לאחרונה {formatDate(customer.last_login_at)}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  className="gap-1.5 flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={!whatsapp || saving}
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  וואטסאפ
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 flex-1"
                  disabled={!customer.phone}
                  asChild={Boolean(customer.phone)}
                >
                  {customer.phone
                    ? <a href={`tel:${customer.phone}`}><PhoneCall className="w-3.5 h-3.5" /> חיוג</a>
                    : <span><PhoneCall className="w-3.5 h-3.5" /> חיוג</span>}
                </Button>
              </div>
              {!whatsapp && (
                <p className="text-[10px] text-muted-foreground">
                  אין מספר טלפון תקין ללקוח הזה, אז אי אפשר לשלוח לו וואטסאפ
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Card className="border-border/40">
              <CardContent className="p-3">
                <p className="text-lg font-bold">{customer.orders_count}</p>
                <p className="text-[10px] text-muted-foreground">הזמנות</p>
              </CardContent>
            </Card>
            <Card className="border-border/40">
              <CardContent className="p-3">
                <p className="text-lg font-bold">{formatCurrency(customer.total_spent)}</p>
                <p className="text-[10px] text-muted-foreground">שולם</p>
              </CardContent>
            </Card>
            <Card className="border-border/40">
              <CardContent className="p-3">
                <p className="text-lg font-bold">{customer.pets_count}</p>
                <p className="text-[10px] text-muted-foreground">חיות</p>
              </CardContent>
            </Card>
          </div>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5">
              <PawPrint className="w-3.5 h-3.5" /> חיות מחמד
              {detail.archived_pets_count > 0 && (
                <span className="font-normal text-[10px] text-muted-foreground">
                  · {detail.archived_pets_count} בארכיון
                </span>
              )}
            </h4>
            {pets.length === 0 ? (
              <p className="text-xs text-muted-foreground">אין חיות רשומות</p>
            ) : (
              /* The card is read while someone is on the phone with this
                 customer, so it answers the questions that get asked: which
                 animal, how old, and is there anything wrong with it. The
                 detail already carried all of this and showed three fields of
                 it. Age comes from formatPetAgeHe rather than being recomputed
                 here - it is the one derivation, and a pet was reading as zero
                 years old on its own first birthday before it existed. */
              pets.map((pet) => {
                const age = formatPetAgeHe(pet);
                const conditions = (pet.medical_conditions || []).filter(Boolean);
                return (
                  <div
                    key={pet.id}
                    // An archived animal has died or been rehomed. It stays on
                    // the card - the history is real and the owner may bring
                    // it up - but it is dimmed and labelled, because asking
                    // after a dead pet by name is the worst thing this screen
                    // can cause.
                    className={cn(
                      "flex items-start gap-3 rounded-xl border border-mipo-line px-3 py-2.5",
                      pet.archived && "opacity-60 bg-muted/20",
                    )}
                  >
                    {pet.avatar_url ? (
                      <img
                        src={pet.avatar_url}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full bg-mipo-soft object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-mipo-line">
                        <PawPrint className="h-4 w-4 text-mipo-muted" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-mipo-ink">{pet.name}</span>
                        {pet.archived && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">
                            בארכיון
                          </Badge>
                        )}
                        <span className="text-[11px] text-mipo-muted">
                          {PET_TYPE_LABELS[pet.type] || pet.type}
                          {pet.breed ? ` · ${pet.breed}` : ""}
                        </span>
                      </div>
                      <p className="text-[11px] text-mipo-muted">
                        {/* An unknown age says so. It never shows as zero. */}
                        {age || "גיל לא ידוע"}
                        {pet.gender === "male" ? " · זכר" : pet.gender === "female" ? " · נקבה" : ""}
                        {typeof pet.weight === "number" && pet.weight > 0 ? ` · ${pet.weight} ק״ג` : ""}
                      </p>
                      {conditions.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {conditions.map((condition) => (
                            <span
                              key={condition}
                              className="rounded-full border border-amber-300 px-1.5 py-0.5 text-[10px] text-amber-700"
                            >
                              {condition}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-semibold flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5" /> פעילות
            </h4>

            {/* The header above counts every order this person ever placed;
                the timeline below holds the most recent hundred. Without this
                line an agent searching for an order that is real but not
                loaded concludes it does not exist, and tells the customer so.
                It is placed ABOVE the stream, not at its end, because the
                point is to be read before the searching starts. */}
            {detail.orders_truncated && (
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                מוצגות {detail.orders_shown} ההזמנות האחרונות מתוך {customer.orders_count}.
                הזמנה ישנה יותר לא תופיע כאן גם אם היא קיימת.
              </p>
            )}

            <Card className="border-border/40">
              <CardContent className="p-3 space-y-2">
                <Select value={noteKind} onValueChange={(value) => setNoteKind(value as MipoCustomerNoteKind)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTE_KINDS.map((kind) => (
                      <SelectItem key={kind.value} value={kind.value} className="text-xs">
                        {kind.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  value={noteBody}
                  onChange={(event) => setNoteBody(event.target.value)}
                  placeholder="מה נאמר בשיחה?"
                  rows={3}
                  maxLength={5000}
                  className="text-xs resize-none"
                />
                <Button
                  size="sm"
                  className="w-full gap-1.5"
                  disabled={saving || !noteBody.trim()}
                  onClick={handleSubmitNote}
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  שמירה
                </Button>
              </CardContent>
            </Card>

            {timeline.length === 0 ? (
              <p className="text-xs text-muted-foreground">עוד לא נרשמה פעילות</p>
            ) : (
              timeline.map((entry) => {
                if (entry.note) {
                  const kind = NOTE_KIND_BY_VALUE.get(entry.note.kind);
                  const KindIcon = kind?.icon || StickyNote;
                  return (
                    <div key={entry.note.id} className="border rounded-lg px-3 py-2 space-y-1 group">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                          <KindIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          {kind?.label || entry.note.kind}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">
                            {formatDateTime(entry.note.created_at)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                            onClick={() => setPendingDelete(entry.note)}
                            aria-label="מחיקת רישום"
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs whitespace-pre-wrap">{entry.note.body}</p>
                      {entry.note.author_name && (
                        <p className="text-[10px] text-muted-foreground">{entry.note.author_name}</p>
                      )}
                    </div>
                  );
                }

                const order = entry.order!;
                return (
                  <div key={order.id} className="border rounded-lg px-3 py-2 space-y-1 bg-muted/20">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-muted-foreground" />
                        {order.order_number}
                      </span>
                      <span className="text-xs font-semibold">{formatCurrency(order.total)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{formatDate(order.order_date)}</span>
                      <span>{ORDER_STATUS_LABELS[order.status] || order.status}</span>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </div>
      </ScrollArea>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        title="למחוק את הרישום?"
        description="הרישום יימחק לצמיתות ולא יופיע יותר בכרטיס הלקוח."
        confirmLabel="מחיקה"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default AdminCustomers;
