import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, PawPrint, Search, ShoppingBag, Users } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCustomerCard, getCustomers } from "@/lib/mipoApi";

// None of this data is new. shop_customers was written on every order and never
// read once, the event stream has been collecting behaviour since it was added,
// and pets sat in their own table. What was missing was one id tying a person's
// browsing, orders and account together, and a place to look at the result.

const money = (value: string | number) => `₪${Number(value || 0).toLocaleString("he-IL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const day = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("he-IL") : "—";

const BEHAVIOUR_LABELS: Record<string, string> = {
  "product.viewed": "צפיות במוצר",
  "search.performed": "חיפושים",
  "search.no_results": "חיפושים ללא תוצאה",
  "cart.item_added": "הוספות לעגלה",
  "cart.item_removed": "הסרות מהעגלה",
  "checkout.started": "התחלות קופה",
  "order.placed": "הזמנות",
  "customer.registered": "הרשמה",
  "customer.signed_in": "התחברויות",
};

const AdminCustomers = () => {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customers", search],
    queryFn: () => getCustomers({ search: search.trim() || undefined }),
  });

  const { data: card } = useQuery({
    queryKey: ["admin-customer", selectedId],
    queryFn: () => getCustomerCard(selectedId as string),
    enabled: Boolean(selectedId),
  });

  const customers = data?.customers || [];
  const totals = data?.totals;

  return (
    <AdminLayout title="לקוחות" icon={Users}>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "לקוחות", value: totals?.customers ?? 0 },
            { label: "עם חשבון", value: totals?.with_account ?? 0 },
            { label: "ביצעו הזמנה", value: totals?.buyers ?? 0 },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="text-2xl font-semibold tabular-nums">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <Card>
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="חיפוש לפי שם, אימייל או טלפון"
                  className="pr-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-2">
              {isLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">טוען…</div>
              ) : customers.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">לא נמצאו לקוחות</div>
              ) : (
                customers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => setSelectedId(customer.id)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-right transition-colors ${
                      customer.id === selectedId ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {customer.full_name || customer.email}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{customer.email}</div>
                    </div>
                    {/* A guest who never registered is still a customer, and
                        saying so is more useful than leaving it blank. */}
                    <Badge variant={customer.has_account ? "default" : "outline"} className="shrink-0 text-[10px]">
                      {customer.has_account ? "רשום" : "אורח"}
                    </Badge>
                    <div className="shrink-0 text-left text-xs tabular-nums">
                      <div>{customer.order_count} הזמנות</div>
                      <div className="text-muted-foreground">{money(customer.total_spent)}</div>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {card ? (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {card.customer.full_name || card.customer.email}
                  </CardTitle>
                  <div className="text-xs text-muted-foreground">
                    {[card.customer.email, card.customer.phone, card.customer.city].filter(Boolean).join(" · ")}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "הזמנות", value: card.stats.order_count },
                      { label: "סה״כ", value: money(card.stats.total_spent) },
                      { label: "ממוצע", value: money(card.stats.average_order) },
                      { label: "לקוח מאז", value: day(card.customer.created_at) },
                    ].map((stat) => (
                      <div key={stat.label}>
                        <div className="text-sm font-semibold tabular-nums">{stat.value}</div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {card.pets.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <PawPrint className="h-4 w-4" /> חיות מחמד
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {card.pets.map((pet) => (
                      <div key={pet.id} className="text-sm">
                        {pet.name}
                        <span className="text-muted-foreground">
                          {" · "}{[pet.type, pet.breed].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <ShoppingBag className="h-4 w-4" /> הזמנות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {card.orders.length === 0 ? (
                    <div className="py-3 text-sm text-muted-foreground">עדיין לא הזמין</div>
                  ) : (
                    card.orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between border-b border-border/40 py-2 text-sm last:border-0"
                      >
                        <span className="font-mono text-xs">{order.order_number}</span>
                        <span className="text-muted-foreground">{day(order.order_date)}</span>
                        <span className="tabular-nums">{money(order.total)}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* The part that did not exist before: what they looked at and did
                  not buy. It is the difference between a customer and an invoice. */}
              {card.viewed_products.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Eye className="h-4 w-4" /> מוצרים שצפה בהם
                      {card.stats.viewed_not_purchased > 0 && (
                        <span className="text-xs font-normal text-muted-foreground">
                          · {card.stats.viewed_not_purchased} ללא רכישה
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {card.viewed_products.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between border-b border-border/40 py-2 text-sm last:border-0"
                      >
                        <span className="min-w-0 flex-1 truncate">{product.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{product.views} צפיות</span>
                        <Badge variant={product.purchased ? "default" : "outline"} className="shrink-0 text-[10px]">
                          {product.purchased ? "רכש" : "לא רכש"}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {card.behaviour.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">פעילות</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {card.behaviour.map((item) => (
                        <div key={item.event_type} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {BEHAVIOUR_LABELS[item.event_type] || item.event_type}
                          </span>
                          <span className="tabular-nums">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="flex h-full min-h-[240px] items-center justify-center p-8 text-center text-sm text-muted-foreground">
                בחר לקוח כדי לראות את הכרטיס שלו
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCustomers;
