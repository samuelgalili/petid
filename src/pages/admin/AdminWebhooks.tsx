import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Webhook, 
  Key, 
  Code, 
  Plus,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const AdminWebhooks = () => {
  const [showKey, setShowKey] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: webhooks, isLoading: webhooksLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: apiKeys, isLoading: keysLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const toggleWebhookMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('webhooks')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('הסטטוס עודכן');
    }
  });

  const toggleApiKeyMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('הסטטוס עודכן');
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('הועתק ללוח');
  };

  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [webhookForm, setWebhookForm] = useState({
    name: "",
    url: "",
    events: [] as string[]
  });
  const [apiKeyForm, setApiKeyForm] = useState({
    name: "",
    permissions: [] as string[]
  });

  const availableEvents = [
    { value: "order.created", label: "הזמנה נוצרה" },
    { value: "order.updated", label: "הזמנה עודכנה" },
    { value: "order.completed", label: "הזמנה הושלמה" },
    { value: "customer.created", label: "לקוח נוצר" },
    { value: "product.updated", label: "מוצר עודכן" }
  ];

  const availablePermissions = [
    { value: "read:products", label: "קריאת מוצרים" },
    { value: "write:products", label: "כתיבת מוצרים" },
    { value: "read:orders", label: "קריאת הזמנות" },
    { value: "write:orders", label: "כתיבת הזמנות" },
    { value: "read:customers", label: "קריאת לקוחות" }
  ];

  const createWebhookMutation = useMutation({
    mutationFn: async (data: typeof webhookForm) => {
      const { error } = await supabase
        .from('webhooks')
        .insert({
          name: data.name,
          url: data.url,
          events: data.events,
          is_active: true
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook נוסף בהצלחה');
      setWebhookDialogOpen(false);
      setWebhookForm({ name: "", url: "", events: [] });
    },
    onError: () => {
      toast.error('שגיאה בהוספת Webhook');
    }
  });

  const createApiKeyMutation = useMutation({
    mutationFn: async (data: typeof apiKeyForm) => {
      const keyPrefix = `pk_${Math.random().toString(36).substring(2, 10)}`;
      const keyHash = `hash_${Date.now()}`;
      const { error } = await supabase
        .from('api_keys')
        .insert({
          name: data.name,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          permissions: data.permissions,
          is_active: true
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('מפתח API נוצר בהצלחה');
      setApiKeyDialogOpen(false);
      setApiKeyForm({ name: "", permissions: [] });
    },
    onError: () => {
      toast.error('שגיאה ביצירת מפתח');
    }
  });

  const toggleEventSelection = (event: string) => {
    setWebhookForm(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const togglePermissionSelection = (perm: string) => {
    setApiKeyForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }));
  };

  const activeWebhooks = webhooks?.filter(w => w.is_active).length || 0;
  const activeKeys = apiKeys?.filter(k => k.is_active).length || 0;

  return (
    <AdminLayout title="Webhooks & API">
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Webhooks & API</h1>
            <p className="text-muted-foreground">ניהול אינטגרציות ומפתחות API</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Webhook className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeWebhooks}</p>
                <p className="text-sm text-muted-foreground">Webhooks פעילים</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <Key className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeKeys}</p>
                <p className="text-sm text-muted-foreground">מפתחות פעילים</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {webhooks?.reduce((sum, w) => sum + (w.success_count || 0), 0) || 0}
                </p>
                <p className="text-sm text-muted-foreground">קריאות מוצלחות</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100">
                <Code className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(webhooks?.length || 0) + (apiKeys?.length || 0)}</p>
                <p className="text-sm text-muted-foreground">סה"כ אינטגרציות</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="webhooks">
          <TabsList>
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-2">
              <Key className="h-4 w-4" />
              מפתחות API
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-2">
              <Code className="h-4 w-4" />
              תיעוד
            </TabsTrigger>
          </TabsList>

          <TabsContent value="webhooks" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    הגדרות Webhooks
                  </CardTitle>
                  <Button className="gap-2" onClick={() => setWebhookDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    הוסף Webhook
                  </Button>
                </div>
              </CardHeader>

              <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
                <DialogContent dir="rtl">
                  <DialogHeader>
                    <DialogTitle>הוספת Webhook חדש</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>שם *</Label>
                      <Input
                        value={webhookForm.name}
                        onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                        placeholder="שם ה-Webhook"
                      />
                    </div>
                    <div>
                      <Label>URL *</Label>
                      <Input
                        value={webhookForm.url}
                        onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                        placeholder="https://your-server.com/webhook"
                      />
                    </div>
                    <div>
                      <Label>אירועים</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {availableEvents.map((event) => (
                          <div key={event.value} className="flex items-center gap-2">
                            <Checkbox
                              id={event.value}
                              checked={webhookForm.events.includes(event.value)}
                              onCheckedChange={() => toggleEventSelection(event.value)}
                            />
                            <Label htmlFor={event.value} className="text-sm">{event.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setWebhookDialogOpen(false)}>ביטול</Button>
                      <Button 
                        onClick={() => {
                          if (!webhookForm.name || !webhookForm.url) {
                            toast.error('נא למלא שם ו-URL');
                            return;
                          }
                          createWebhookMutation.mutate(webhookForm);
                        }}
                        disabled={createWebhookMutation.isPending}
                      >
                        {createWebhookMutation.isPending ? "שומר..." : "הוסף"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <CardContent>
                {webhooksLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => (
                      <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : webhooks?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>אין Webhooks מוגדרים</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {webhooks?.map((webhook) => (
                      <motion.div
                        key={webhook.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`p-4 rounded-lg border ${!webhook.is_active && 'opacity-60'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Switch 
                              checked={webhook.is_active}
                              onCheckedChange={(checked) => toggleWebhookMutation.mutate({ id: webhook.id, isActive: checked })}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{webhook.name}</p>
                                {webhook.is_active ? (
                                  <Badge className="bg-green-100 text-green-700">פעיל</Badge>
                                ) : (
                                  <Badge variant="secondary">לא פעיל</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground font-mono">{webhook.url}</p>
                              <div className="flex gap-1 mt-1">
                                {webhook.events?.map((event: string) => (
                                  <Badge key={event} variant="outline" className="text-xs">{event}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {webhook.is_active && (
                              <div className="text-left">
                                <div className="flex items-center gap-1">
                                  {(webhook.success_count || 0) > (webhook.failure_count || 0) ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  )}
                                  <span className="font-medium">{webhook.success_count || 0}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">הצלחות</p>
                              </div>
                            )}
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon">
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    מפתחות API
                  </CardTitle>
                  <Button className="gap-2" onClick={() => setApiKeyDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    צור מפתח חדש
                  </Button>
                </div>
              </CardHeader>

              <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
                <DialogContent dir="rtl">
                  <DialogHeader>
                    <DialogTitle>יצירת מפתח API חדש</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>שם *</Label>
                      <Input
                        value={apiKeyForm.name}
                        onChange={(e) => setApiKeyForm({ ...apiKeyForm, name: e.target.value })}
                        placeholder="שם המפתח"
                      />
                    </div>
                    <div>
                      <Label>הרשאות</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {availablePermissions.map((perm) => (
                          <div key={perm.value} className="flex items-center gap-2">
                            <Checkbox
                              id={perm.value}
                              checked={apiKeyForm.permissions.includes(perm.value)}
                              onCheckedChange={() => togglePermissionSelection(perm.value)}
                            />
                            <Label htmlFor={perm.value} className="text-sm">{perm.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setApiKeyDialogOpen(false)}>ביטול</Button>
                      <Button 
                        onClick={() => {
                          if (!apiKeyForm.name) {
                            toast.error('נא למלא שם');
                            return;
                          }
                          createApiKeyMutation.mutate(apiKeyForm);
                        }}
                        disabled={createApiKeyMutation.isPending}
                      >
                        {createApiKeyMutation.isPending ? "יוצר..." : "צור מפתח"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <CardContent>
                {keysLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => (
                      <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : apiKeys?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>אין מפתחות API</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {apiKeys?.map((apiKey) => (
                      <motion.div
                        key={apiKey.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`p-4 rounded-lg border ${!apiKey.is_active && 'opacity-60'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Switch 
                              checked={apiKey.is_active}
                              onCheckedChange={(checked) => toggleApiKeyMutation.mutate({ id: apiKey.id, isActive: checked })}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{apiKey.name}</p>
                                {apiKey.is_active ? (
                                  <Badge className="bg-green-100 text-green-700">פעיל</Badge>
                                ) : (
                                  <Badge variant="secondary">לא פעיל</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                                  {showKey === apiKey.id 
                                    ? `${apiKey.key_prefix}...` 
                                    : `${apiKey.key_prefix}••••••••••••••••`}
                                </code>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => setShowKey(showKey === apiKey.id ? null : apiKey.id)}
                                >
                                  {showKey === apiKey.id ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => copyToClipboard(apiKey.key_prefix)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex gap-1 mt-1">
                                {apiKey.permissions?.map((perm: string) => (
                                  <Badge key={perm} variant="outline" className="text-xs">{perm}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-left text-sm">
                              {apiKey.last_used_at && (
                                <p className="text-muted-foreground">
                                  שימוש אחרון: {new Date(apiKey.last_used_at).toLocaleDateString('he-IL')}
                                </p>
                              )}
                              {apiKey.expires_at && (
                                <p className="text-orange-500">
                                  תוקף עד: {new Date(apiKey.expires_at).toLocaleDateString('he-IL')}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  תיעוד API
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-muted">
                    <h4 className="font-medium mb-2">Base URL</h4>
                    <code className="text-sm bg-background px-3 py-2 rounded block">
                      https://api.petid.co.il/v1
                    </code>
                  </div>

                  <div>
                    <h4 className="font-medium mb-4">Endpoints זמינים</h4>
                    <div className="space-y-2">
                      {[
                        { method: 'GET', path: '/products', desc: 'קבלת רשימת מוצרים' },
                        { method: 'POST', path: '/orders', desc: 'יצירת הזמנה חדשה' },
                        { method: 'GET', path: '/customers', desc: 'קבלת רשימת לקוחות' },
                        { method: 'PUT', path: '/inventory/:id', desc: 'עדכון מלאי' }
                      ].map((endpoint, index) => (
                        <div key={index} className="flex items-center gap-4 p-3 rounded-lg border">
                          <Badge 
                            className={
                              endpoint.method === 'GET' ? 'bg-green-100 text-green-700' :
                              endpoint.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                              endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }
                          >
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm font-mono">{endpoint.path}</code>
                          <span className="text-sm text-muted-foreground">{endpoint.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    פתח תיעוד מלא
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminWebhooks;
