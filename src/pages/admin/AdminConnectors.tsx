/**
 * Connectors — where a third party's API key is handed over.
 *
 * The whole screen is built around one sentence from D-4, because it is the
 * sentence that is easiest to break while making the page nicer:
 *
 *   "never a secret, not even masked from the server side. `••••••••` is
 *    rendered from nothing, not from a truncated real value."
 *
 * So the dots below are a literal string. There is no field on MipoConnector
 * that could hold a key, the server has no code path that returns one, and the
 * input is cleared the moment a save succeeds. Once a key is in, this screen
 * can tell you THAT one is stored and whether the provider accepted it — never
 * what it is. Reading a key back out is not a feature that was left out; it is
 * the feature this page refuses.
 *
 * The base URL and the API version are editable, and that is not a power-user
 * flourish. Getting either wrong produces a 401, which an owner reads as "my
 * key is bad" — a support incident rather than a bug. Editable, it is a
 * one-minute fix here instead of a deploy.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, CheckCircle2, Link2, Loader2, Plug, RefreshCw, ShieldCheck, Unplug,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminStyles";
import { createClientId } from "@/lib/randomId";
import {
  disconnectAdminConnector, getAdminConnectors, saveAdminConnector, verifyAdminConnector,
  type MipoConnector,
} from "@/lib/mipoApi";

/** What the owner sees instead of a key. Drawn from a boolean, never from a value. */
const MASK = "••••••••••••";

const PROVIDER_LABELS: Record<string, { name: string; docs: string; blurb: string }> = {
  runway: {
    name: "Runway",
    docs: "https://docs.dev.runwayml.com/",
    blurb: "וידאו והנפשה מתוך תמונה — מה שיניע את הדמות של החיה.",
  },
};

const STATUS: Record<string, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  connected: {
    label: "מחובר",
    className: "text-emerald-600 border-emerald-500/30 bg-emerald-500/10",
    Icon: CheckCircle2,
  },
  error: {
    label: "שגיאה",
    className: "text-destructive border-destructive/30 bg-destructive/10",
    Icon: AlertTriangle,
  },
  unverified: {
    label: "לא נבדק",
    className: "text-mipo-muted border-mipo-line",
    Icon: Plug,
  },
};

const formatDateTime = (value?: string | null) => (
  value
    ? new Date(value).toLocaleString("he-IL", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    })
    : "—"
);

const ConnectorCard = ({
  connector,
  onSaved,
}: {
  connector: MipoConnector;
  onSaved: (connector: MipoConnector) => void;
}) => {
  const { toast } = useToast();
  const meta = PROVIDER_LABELS[connector.provider];

  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(connector.settings?.baseUrl || "");
  const [apiVersion, setApiVersion] = useState(connector.settings?.apiVersion || "");
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // One key per submission, minted when the form changes. A key generated per
  // click is not idempotency: a double-click would store the credential twice.
  const idempotencyKey = useRef(createClientId("connector"));
  const resetKey = useCallback(() => {
    idempotencyKey.current = createClientId("connector");
  }, []);

  useEffect(() => {
    setBaseUrl(connector.settings?.baseUrl || "");
    setApiVersion(connector.settings?.apiVersion || "");
  }, [connector.settings?.baseUrl, connector.settings?.apiVersion]);

  const status = STATUS[connector.status] || STATUS.unverified;

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const saved = await saveAdminConnector(
        {
          provider: connector.provider,
          // OMITTED, not blanked, when no new key was typed: the server keeps
          // what it has, and "" would read as "clear it".
          ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
          settings: { baseUrl: baseUrl.trim(), apiVersion: apiVersion.trim() },
        },
        idempotencyKey.current,
      );
      // Cleared immediately. A key left sitting in a form field is a key in a
      // screenshot, in a session replay, and in the next person's shoulder.
      setApiKey("");
      resetKey();
      onSaved(saved);
      toast({ title: apiKey.trim() ? "המפתח נשמר" : "ההגדרות נשמרו" });
    } catch (error) {
      toast({
        title: "השמירה נכשלה",
        description: error instanceof Error ? error.message : "נסה שוב",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [apiKey, apiVersion, baseUrl, connector.provider, onSaved, resetKey, toast]);

  const verify = useCallback(async () => {
    setVerifying(true);
    try {
      const verified = await verifyAdminConnector(connector.provider);
      onSaved(verified);
      toast({
        title: verified.status === "connected" ? "הספק אישר את המפתח" : "הספק לא אישר",
        description: verified.status === "connected" ? undefined : verified.last_error || undefined,
        variant: verified.status === "connected" ? undefined : "destructive",
      });
    } catch (error) {
      toast({
        title: "הבדיקה נכשלה",
        description: error instanceof Error ? error.message : "נסה שוב",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  }, [connector.provider, onSaved, toast]);

  const disconnect = useCallback(async () => {
    setDisconnecting(true);
    try {
      onSaved(await disconnectAdminConnector(connector.provider, createClientId("disconnect")));
      setConfirmDisconnect(false);
      toast({ title: "החיבור נותק" });
    } catch (error) {
      toast({
        title: "הניתוק נכשל",
        description: error instanceof Error ? error.message : "נסה שוב",
        variant: "destructive",
      });
    } finally {
      setDisconnecting(false);
    }
  }, [connector.provider, onSaved, toast]);

  return (
    <Card className="border-mipo-line">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-mipo-ink">{meta?.name || connector.provider}</h3>
              <Badge variant="outline" className={`gap-1 text-[11px] ${status.className}`}>
                <status.Icon className="h-3 w-3" strokeWidth={2} />
                {status.label}
              </Badge>
            </div>
            {meta?.blurb && <p className="mt-1 text-xs text-mipo-muted">{meta.blurb}</p>}
          </div>
          {meta?.docs && (
            <a
              href={meta.docs}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-1 text-xs text-mipo-muted underline underline-offset-4"
            >
              <Link2 className="h-3.5 w-3.5" />
              תיעוד
            </a>
          )}
        </div>

        {/* The provider's own words, when it refused. This is the single most
            useful thing on the screen and the thing most likely to be
            swallowed into a generic "failed". */}
        {connector.status === "error" && connector.last_error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">
            {connector.last_error}
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor={`${connector.provider}-key`} className="text-xs">מפתח API</Label>
          <Input
            id={`${connector.provider}-key`}
            type="password"
            dir="ltr"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => { setApiKey(event.target.value); resetKey(); }}
            placeholder={connector.stored ? MASK : "הדביקו כאן את המפתח"}
          />
          <p className="text-[11px] leading-5 text-mipo-muted">
            {connector.stored ? (
              <>
                <ShieldCheck className="me-1 inline h-3 w-3" />
                מפתח שמור ומוצפן. אי אפשר לקרוא אותו חזרה — גם לא מכאן, וגם לא מהשרת.
                השאירו ריק כדי לשמור על הקיים.
              </>
            ) : (
              "המפתח נשמר מוצפן ולא מוחזר לשום מסך אחרי השמירה."
            )}
          </p>
        </div>

        {/* Editable, because a wrong value here looks exactly like a bad key.
            The comment in connectors.js records that these two could not be
            checked against Runway's documentation from the build environment. */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${connector.provider}-url`} className="text-xs">כתובת בסיס</Label>
            <Input
              id={`${connector.provider}-url`}
              dir="ltr"
              value={baseUrl}
              onChange={(event) => { setBaseUrl(event.target.value); resetKey(); }}
              placeholder="https://api.dev.runwayml.com/v1"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${connector.provider}-version`} className="text-xs">גרסת API</Label>
            <Input
              id={`${connector.provider}-version`}
              dir="ltr"
              value={apiVersion}
              onChange={(event) => { setApiVersion(event.target.value); resetKey(); }}
              placeholder="2024-11-06"
            />
          </div>
        </div>

        <p className="text-[11px] leading-5 text-mipo-muted">
          נבדק לאחרונה: {formatDateTime(connector.last_verified_at)}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={saving} onClick={save} className="gap-1.5">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            שמירה
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={verifying || !connector.stored}
            onClick={verify}
          >
            {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            בדיקת חיבור
          </Button>
          {connector.stored && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-destructive"
              onClick={() => setConfirmDisconnect(true)}
            >
              <Unplug className="h-3.5 w-3.5" />
              ניתוק
            </Button>
          )}
        </div>

        <ConfirmDialog
          open={confirmDisconnect}
          onOpenChange={setConfirmDisconnect}
          title="לנתק את החיבור?"
          description="המפתח יימחק מהמערכת ולא ניתן לשחזר אותו. ההגדרות והיסטוריית הביקורת יישארו."
          confirmLabel="ניתוק"
          variant="destructive"
          loading={disconnecting}
          onConfirm={disconnect}
        />
      </CardContent>
    </Card>
  );
};

const AdminConnectors = () => {
  const { toast } = useToast();
  const [connectors, setConnectors] = useState<MipoConnector[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnectors = useCallback(async () => {
    setLoading(true);
    try {
      setConnectors(await getAdminConnectors());
    } catch (error) {
      toast({
        title: "טעינת החיבורים נכשלה",
        description: error instanceof Error ? error.message : "נסה לרענן",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchConnectors();
  }, [fetchConnectors]);

  const handleSaved = useCallback((saved: MipoConnector) => {
    setConnectors((current) => {
      const next = current.filter((connector) => connector.provider !== saved.provider);
      return [...next, saved].sort((a, b) => a.provider.localeCompare(b.provider));
    });
  }, []);

  // A provider with no row yet still gets a card. Without this the screen is
  // empty until someone has already connected something, which is the one
  // moment it is most needed.
  const shown = useMemo(() => {
    const byProvider = new Map(connectors.map((connector) => [connector.provider, connector]));
    return Object.keys(PROVIDER_LABELS).map((provider) => byProvider.get(provider) ?? {
      id: `new-${provider}`,
      provider,
      label: null,
      settings: {},
      status: "unverified",
      last_error: null,
      last_verified_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      stored: false,
      known_provider: true,
    } satisfies MipoConnector);
  }, [connectors]);

  return (
    <AdminLayout title="חיבורים" icon={Plug}>
      <div className="space-y-5" dir="rtl">
        <AdminPageHeader
          title="חיבורים"
          description="מפתחות API של ספקים חיצוניים. נשמרים מוצפנים ולא נקראים חזרה."
          icon={Plug}
          onRefresh={fetchConnectors}
          isRefreshing={loading}
        />

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : shown.length === 0 ? (
          <AdminEmptyState icon={Plug} title="אין ספקים מוגדרים" description="עדיין לא הוגדר אף ספק בבילד הזה" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {shown.map((connector) => (
              <ConnectorCard key={connector.provider} connector={connector} onSaved={handleSaved} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminConnectors;
