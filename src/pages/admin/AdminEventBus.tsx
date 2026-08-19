import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, Plug, RotateCcw, Send, Trash2 } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  createEventSubscription,
  deleteEventSubscription,
  dispatchPendingEvents,
  getEventBusStatus,
  replayEventDeliveries,
  testEventSubscription,
  updateEventSubscription,
  type MipoEventSubscription,
} from "@/lib/mipoApi";

// Every meaningful thing that happens in MIPO is already an event. This screen
// is where someone decides which of them n8n gets to see.
//
// The design assumption is that whoever uses it is holding an n8n webhook URL
// they just copied. So: paste, pick event types, test, done. Everything else on
// the screen is there to answer "is it still working".

const relativeTime = (value: string | null) => {
  if (!value) return "—";
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "עכשיו";
  if (minutes < 60) return `לפני ${minutes} דק׳`;
  if (minutes < 1440) return `לפני ${Math.round(minutes / 60)} ש׳`;
  return `לפני ${Math.round(minutes / 1440)} ימים`;
};

const SubscriptionCard = ({
  subscription,
  eventTypes,
  onChanged,
}: {
  subscription: MipoEventSubscription;
  eventTypes: string[];
  onChanged: () => void;
}) => {
  const { toast } = useToast();
  const [patterns, setPatterns] = useState(subscription.event_types.join(", "));
  const [secret, setSecret] = useState("");

  const save = useMutation({
    mutationFn: () =>
      updateEventSubscription(subscription.id, {
        event_types: patterns.split(",").map((value) => value.trim()).filter(Boolean),
        // An empty box means "leave the secret alone", never "clear it".
        ...(secret ? { secret } : {}),
      }),
    onSuccess: () => {
      setSecret("");
      toast({ title: "נשמר" });
      onChanged();
    },
    onError: (error: Error) => toast({ title: "השמירה נכשלה", description: error.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: (isActive: boolean) => updateEventSubscription(subscription.id, { is_active: isActive }),
    onSuccess: onChanged,
  });

  const test = useMutation({
    mutationFn: () => testEventSubscription(subscription.id),
    onSuccess: (result) =>
      toast(
        result.ok
          ? { title: "החיבור עובד", description: `הצד השני החזיר ${result.responseStatus}` }
          : { title: "החיבור נכשל", description: result.error, variant: "destructive" },
      ),
    onError: (error: Error) => toast({ title: "הבדיקה נכשלה", description: error.message, variant: "destructive" }),
  });

  const replay = useMutation({
    mutationFn: () => replayEventDeliveries({ subscription_id: subscription.id }),
    onSuccess: (result) => {
      toast({ title: `${result.replayed} אירועים הוחזרו לתור` });
      onChanged();
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteEventSubscription(subscription.id),
    onSuccess: () => {
      toast({ title: "היעד נמחק" });
      onChanged();
    },
  });

  const dead = Number(subscription.dead);
  const failing = Boolean(
    subscription.last_failure_at
      && (!subscription.last_success_at || subscription.last_failure_at > subscription.last_success_at),
  );

  return (
    <Card className={failing ? "border-destructive/50" : undefined}>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold">{subscription.name}</h3>
              {subscription.has_secret ? (
                <Badge variant="outline">חתום</Badge>
              ) : (
                <Badge variant="destructive">ללא חתימה</Badge>
              )}
            </div>
            <p dir="ltr" className="mt-1 truncate text-xs text-muted-foreground">{subscription.target_url}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{subscription.is_active ? "פעיל" : "מושהה"}</span>
            <Switch
              checked={subscription.is_active}
              onCheckedChange={(checked) => toggleActive.mutate(checked)}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-md bg-muted/50 p-2">
            <div className="font-semibold">{subscription.delivered}</div>
            <div className="text-xs text-muted-foreground">נשלחו</div>
          </div>
          <div className="rounded-md bg-muted/50 p-2">
            <div className="font-semibold">{subscription.pending}</div>
            <div className="text-xs text-muted-foreground">בתור</div>
          </div>
          <div className={`rounded-md p-2 ${dead > 0 ? "bg-destructive/10" : "bg-muted/50"}`}>
            <div className="font-semibold">{dead}</div>
            <div className="text-xs text-muted-foreground">נכשלו סופית</div>
          </div>
        </div>

        {subscription.last_error && (
          <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="break-all">{subscription.last_error}</span>
          </p>
        )}

        <div className="space-y-2">
          <Label className="text-xs">אירועים (מופרדים בפסיק, אפשר <code>order.*</code>)</Label>
          <Input dir="ltr" value={patterns} onChange={(event) => setPatterns(event.target.value)} />
          {eventTypes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {eventTypes.slice(0, 12).map((type) => (
                <button
                  key={type}
                  type="button"
                  dir="ltr"
                  className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
                  onClick={() =>
                    setPatterns((current) =>
                      current.split(",").map((value) => value.trim()).includes(type)
                        ? current
                        : [current, type].filter(Boolean).join(", "),
                    )
                  }
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs">
            סוד לחתימה — השאר ריק כדי לא לשנות
          </Label>
          <Input
            dir="ltr"
            type="password"
            autoComplete="new-password"
            placeholder={subscription.has_secret ? "••••••••" : "מומלץ להגדיר"}
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" /> : null}
            שמירה
          </Button>
          <Button size="sm" variant="outline" onClick={() => test.mutate()} disabled={test.isPending}>
            <Send className="ml-1 h-3.5 w-3.5" />
            בדיקת חיבור
          </Button>
          {dead > 0 && (
            <Button size="sm" variant="outline" onClick={() => replay.mutate()} disabled={replay.isPending}>
              <RotateCcw className="ml-1 h-3.5 w-3.5" />
              שליחה חוזרת ({dead})
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>

          <span className="ms-auto text-xs text-muted-foreground">
            הצלחה אחרונה: {relativeTime(subscription.last_success_at)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

const AdminEventBus = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [patterns, setPatterns] = useState("order.*");
  const [secret, setSecret] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-event-bus"],
    queryFn: getEventBusStatus,
    refetchInterval: 10000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-event-bus"] });

  const create = useMutation({
    mutationFn: () =>
      createEventSubscription({
        name,
        target_url: targetUrl,
        event_types: patterns.split(",").map((value) => value.trim()).filter(Boolean),
        secret: secret || undefined,
      }),
    onSuccess: () => {
      setName("");
      setTargetUrl("");
      setSecret("");
      toast({ title: "היעד נוסף" });
      void refresh();
    },
    onError: (error: Error) => toast({ title: "ההוספה נכשלה", description: error.message, variant: "destructive" }),
  });

  // Only reaches events that have not been fanned out yet, so pressing it
  // repeatedly is harmless.
  const dispatchNow = useMutation({
    mutationFn: dispatchPendingEvents,
    onSuccess: (result) => {
      toast({ title: `${result.dispatched} אירועים חולקו`, description: `${result.deliveries} משלוחים נוצרו` });
      void refresh();
    },
  });

  const eventTypes = (data?.event_types || []).map((row) => row.event_type);
  const backlog = data?.backlog;

  return (
    <AdminLayout title="חיבור n8n" icon={Plug}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            כל אירוע במערכת נשלח כ־POST חתום לכתובת שתגדיר כאן, עם ניסיונות חוזרים עד שהצד השני עונה.
          </p>
          <Button variant="outline" size="sm" onClick={() => dispatchNow.mutate()} disabled={dispatchNow.isPending}>
            חלוקה מיידית
          </Button>
        </div>

        {backlog && (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{backlog.awaiting_dispatch}</div>
                <div className="text-xs text-muted-foreground">ממתינים לחלוקה</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{backlog.awaiting_delivery}</div>
                <div className="text-xs text-muted-foreground">ממתינים לשליחה</div>
              </CardContent>
            </Card>
            <Card className={Number(backlog.dead) > 0 ? "border-destructive/50" : undefined}>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{backlog.dead}</div>
                <div className="text-xs text-muted-foreground">נכשלו סופית</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="font-semibold">הוספת יעד</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">שם</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="למשל: התראות הזמנה" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">כתובת ה־Webhook מ־n8n</Label>
                <Input
                  dir="ltr"
                  value={targetUrl}
                  onChange={(event) => setTargetUrl(event.target.value)}
                  placeholder="https://…/webhook/mipo"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">אירועים</Label>
                <Input dir="ltr" value={patterns} onChange={(event) => setPatterns(event.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">סוד לחתימה</Label>
                <Input
                  dir="ltr"
                  type="password"
                  autoComplete="new-password"
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                  placeholder="מומלץ — n8n יוכל לוודא שההודעה מאיתנו"
                />
              </div>
            </div>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !name || !targetUrl}>
              {create.isPending ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : null}
              הוספה
            </Button>
          </CardContent>
        </Card>

        {isLoading && <p className="text-sm text-muted-foreground">טוען…</p>}

        {!isLoading && (data?.subscriptions.length || 0) === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 opacity-40" />
              אין עדיין יעדים. אירועים נצברים ומחכים — ברגע שתוסיף יעד, החדשים יתחילו לזרום אליו.
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {(data?.subscriptions || []).map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              eventTypes={eventTypes}
              onChanged={refresh}
            />
          ))}
        </div>

        {(data?.recent_failures.length || 0) > 0 && (
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-3 font-semibold">כשלונות אחרונים</h2>
              <div className="space-y-2 text-sm">
                {data?.recent_failures.map((failure) => (
                  <div key={failure.id} className="flex flex-wrap items-center gap-2 border-b pb-2 last:border-0">
                    <Badge variant={failure.status === "dead" ? "destructive" : "outline"}>
                      {failure.status === "dead" ? "נכשל סופית" : `ניסיון ${failure.attempts}`}
                    </Badge>
                    <span dir="ltr" className="font-mono text-xs">{failure.event_type}</span>
                    <span className="text-xs text-muted-foreground">→ {failure.subscription_name}</span>
                    <span className="ms-auto truncate text-xs text-muted-foreground" title={failure.last_error || ""}>
                      {failure.last_error}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminEventBus;
