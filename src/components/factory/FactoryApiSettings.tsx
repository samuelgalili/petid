import { useState, useEffect } from "react";
import { Key, Globe, Copy, RefreshCw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props { supplierId: string; }

export const FactoryApiSettings = ({ supplierId }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyPrefix, setApiKeyPrefix] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [apiEnabled, setApiEnabled] = useState(false);
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supplierId) { setLoading(false); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("suppliers").select("api_key_prefix, webhook_url, api_enabled, webhook_enabled")
        .eq("id", supplierId).maybeSingle();
      if (data) {
        setApiKeyPrefix(data.api_key_prefix);
        setWebhookUrl(data.webhook_url || "");
        setApiEnabled(data.api_enabled || false);
        setWebhookEnabled(data.webhook_enabled || false);
      }
      setLoading(false);
    })();
  }, [supplierId]);

  const generateApiKey = async () => {
    if (!supplierId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-factory-api-key", {
        body: { supplier_id: supplierId },
      });
      if (error) throw error;
      setApiKey(data.api_key);
      setApiKeyPrefix(data.prefix);
      setApiEnabled(true);
      toast({ title: "API Key Generated", description: "Copy it now — it won't be shown again." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const saveWebhook = async () => {
    if (!supplierId) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("suppliers")
        .update({ webhook_url: webhookUrl || null, webhook_enabled: webhookEnabled })
        .eq("id", supplierId);
      if (error) throw error;
      toast({ title: "Saved", description: "Webhook settings updated." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/factory-api`;

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-muted rounded-xl" /><div className="h-32 bg-muted rounded-xl" /></div>;

  if (!supplierId) {
    return (
      <Card className="border-border">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-muted-foreground">API settings require a supplier profile</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* API Key Section */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-foreground">
            <Key className="w-4 h-4 text-primary" strokeWidth={1.5} /> API Key
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Use this API key to push products and pull orders programmatically.
          </p>

          {apiKey ? (
            <div className="bg-muted/50 rounded-lg p-4 border border-border/50 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" strokeWidth={1.5} />
                <span className="text-xs text-[hsl(var(--success))] font-medium">New key generated — copy it now!</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="bg-background border border-border rounded px-3 py-2 text-xs flex-1 font-mono break-all">{apiKey}</code>
                <Button size="icon" variant="ghost" className="shrink-0" onClick={() => copyToClipboard(apiKey)}>
                  <Copy className="w-4 h-4" strokeWidth={1.5} />
                </Button>
              </div>
              <p className="text-xs text-destructive">⚠️ This key will not be shown again.</p>
            </div>
          ) : apiKeyPrefix ? (
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono text-xs">{apiKeyPrefix}••••••••</Badge>
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
          ) : null}

          <Button onClick={generateApiKey} disabled={generating} variant={apiKeyPrefix ? "outline" : "default"} className="gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" strokeWidth={1.5} />}
            {apiKeyPrefix ? "Regenerate Key" : "Generate API Key"}
          </Button>

          {/* API Endpoints Documentation */}
          <div className="mt-4 space-y-3">
            <h4 className="text-xs font-medium text-foreground">Endpoints</h4>
            <div className="space-y-2">
              {[
                { method: "GET", path: "/products", desc: "List your products" },
                { method: "POST", path: "/products", desc: "Submit a new product" },
                { method: "GET", path: "/orders", desc: "Get your orders" },
                { method: "PATCH", path: "/orders/:id", desc: "Update order status" },
              ].map((ep) => (
                <div key={ep.path + ep.method} className="bg-muted/30 rounded-lg p-3 border border-border/30 flex items-center gap-3">
                  <Badge variant="outline" className={`text-[10px] font-mono shrink-0 ${ep.method === "GET" ? "text-[hsl(var(--success))]" : ep.method === "POST" ? "text-primary" : "text-[hsl(var(--warning))]"}`}>
                    {ep.method}
                  </Badge>
                  <code className="text-xs text-muted-foreground font-mono">{ep.path}</code>
                  <span className="text-xs text-muted-foreground ml-auto">{ep.desc}</span>
                </div>
              ))}
            </div>
            <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
              <p className="text-xs text-muted-foreground mb-1">Base URL:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-foreground break-all">{baseUrl}</code>
                <Button size="icon" variant="ghost" className="shrink-0 h-6 w-6" onClick={() => copyToClipboard(baseUrl)}>
                  <Copy className="w-3 h-3" strokeWidth={1.5} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Header: <code className="text-foreground">X-Api-Key: your_api_key</code></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Section */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-foreground">
            <Globe className="w-4 h-4 text-primary" strokeWidth={1.5} /> Order Webhook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            PetID will send a POST request to this URL whenever a new order is placed for your products.
          </p>

          <div className="flex items-center gap-3">
            <Label className="text-sm text-foreground">Enable Webhook</Label>
            <Switch checked={webhookEnabled} onCheckedChange={setWebhookEnabled} />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Webhook URL</Label>
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-factory.com/api/petid-orders"
              disabled={!webhookEnabled}
            />
          </div>

          <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
            <p className="text-xs text-muted-foreground mb-1">Payload Example:</p>
            <pre className="text-[11px] font-mono text-foreground whitespace-pre-wrap">{`{
  "event": "order.created",
  "order_id": "uuid",
  "order_number": "PID-12345",
  "items": [...],
  "total_amount": 299.99,
  "shipping_address": {...}
}`}</pre>
          </div>

          <Button onClick={saveWebhook} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />}
            Save Webhook Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
