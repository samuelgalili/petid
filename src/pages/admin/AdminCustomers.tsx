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
import { useNavigate } from "react-router-dom";
import {
  Users, UserCheck, UserPlus, ShoppingBag, DollarSign,
  Mail, ChevronRight, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  AdminStatCard, AdminStatsGrid, AdminToolbar,
  AdminEmptyState, AdminPageHeader,
} from "@/components/admin/AdminStyles";
import { cn } from "@/lib/utils";
import { createClientId } from "@/lib/randomId";
import {
  createAdminCustomer, getAdminCustomers,
  type MipoCustomer, type MipoNewCustomerResult, type MipoShopCustomerRow,
} from "@/lib/mipoApi";

/**
 * The words and formats moved to src/lib/adminCustomerLabels.ts when the
 * customer card became a page of its own. Two screens reading the same records
 * must not disagree about what "נמסר" means.
 */
import { formatCurrency, formatDate } from "@/lib/adminCustomerLabels";

const AdminCustomers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<MipoCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "account" | "guest">("all");
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

        {/* A row opens the customer's own page now.
            The side-by-side panel this replaces had one virtue - you never
            lost the row you came from - and one problem a wider column could
            not fix: everything about a customer does not fit in a third of a
            screen, so it became one long scroll with the pets below the phone
            number and the history below those. The page answers the same need
            the way the design asked for: "לקוח קודם" and "לקוח הבא" move
            between records without a trip back here. */}
        <div>
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
                        className="border-b cursor-pointer transition-colors hover:bg-muted/30"
                        // The ids the list is CURRENTLY showing, in the order
                        // it is showing them, so "next customer" on the card
                        // follows the filter and sort the agent is working in
                        // rather than some canonical order they never chose.
                        onClick={() => navigate(
                          `/admin/customers/${customer.identity_id}`
                          + `?list=${filtered.map((row) => row.identity_id).join(",")}`,
                        )}
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
        </div>
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

export default AdminCustomers;
