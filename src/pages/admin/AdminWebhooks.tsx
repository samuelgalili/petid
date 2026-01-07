import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggered?: string;
  successRate: number;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  isActive: boolean;
  lastUsed?: string;
  expiresAt?: string;
}

const AdminWebhooks = () => {
  const [showKey, setShowKey] = useState<string | null>(null);

  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([
    {
      id: '1',
      name: 'הזמנה חדשה',
      url: 'https://api.example.com/webhooks/new-order',
      events: ['order.created'],
      isActive: true,
      lastTriggered: '2024-01-15T10:30:00',
      successRate: 98
    },
    {
      id: '2',
      name: 'עדכון מלאי',
      url: 'https://inventory.example.com/webhook',
      events: ['inventory.updated', 'inventory.low'],
      isActive: true,
      lastTriggered: '2024-01-15T09:15:00',
      successRate: 100
    },
    {
      id: '3',
      name: 'לקוח חדש',
      url: 'https://crm.example.com/new-customer',
      events: ['customer.created'],
      isActive: false,
      successRate: 0
    }
  ]);

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: '1',
      name: 'Production API',
      key: 'pk_live_xxxxxxxxxxxxxxxxxxxxx',
      permissions: ['read', 'write'],
      isActive: true,
      lastUsed: '2024-01-15T10:45:00'
    },
    {
      id: '2',
      name: 'Mobile App',
      key: 'pk_live_yyyyyyyyyyyyyyyyyyyyy',
      permissions: ['read'],
      isActive: true,
      lastUsed: '2024-01-15T08:20:00'
    },
    {
      id: '3',
      name: 'Test Key',
      key: 'pk_test_zzzzzzzzzzzzzzzzzzzzz',
      permissions: ['read', 'write', 'delete'],
      isActive: false,
      expiresAt: '2024-02-01'
    }
  ]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('הועתק ללוח');
  };

  const toggleWebhook = (id: string) => {
    setWebhooks(webhooks.map(w => 
      w.id === id ? { ...w, isActive: !w.isActive } : w
    ));
  };

  const toggleApiKey = (id: string) => {
    setApiKeys(apiKeys.map(k => 
      k.id === id ? { ...k, isActive: !k.isActive } : k
    ));
  };

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
                <p className="text-2xl font-bold">{webhooks.filter(w => w.isActive).length}</p>
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
                <p className="text-2xl font-bold">{apiKeys.filter(k => k.isActive).length}</p>
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
                <p className="text-2xl font-bold">99%</p>
                <p className="text-sm text-muted-foreground">הצלחה ממוצעת</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100">
                <Code className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">1,250</p>
                <p className="text-sm text-muted-foreground">קריאות היום</p>
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
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    הוסף Webhook
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {webhooks.map((webhook) => (
                    <motion.div
                      key={webhook.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-4 rounded-lg border ${!webhook.isActive && 'opacity-60'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Switch 
                            checked={webhook.isActive}
                            onCheckedChange={() => toggleWebhook(webhook.id)}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{webhook.name}</p>
                              {webhook.isActive ? (
                                <Badge className="bg-green-100 text-green-700">פעיל</Badge>
                              ) : (
                                <Badge variant="secondary">לא פעיל</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground font-mono">{webhook.url}</p>
                            <div className="flex gap-1 mt-1">
                              {webhook.events.map(event => (
                                <Badge key={event} variant="outline" className="text-xs">{event}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {webhook.isActive && (
                            <div className="text-left">
                              <div className="flex items-center gap-1">
                                {webhook.successRate >= 95 ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                <span className="font-medium">{webhook.successRate}%</span>
                              </div>
                              <p className="text-xs text-muted-foreground">הצלחה</p>
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
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    צור מפתח חדש
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {apiKeys.map((apiKey) => (
                    <motion.div
                      key={apiKey.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-4 rounded-lg border ${!apiKey.isActive && 'opacity-60'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Switch 
                            checked={apiKey.isActive}
                            onCheckedChange={() => toggleApiKey(apiKey.id)}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{apiKey.name}</p>
                              {apiKey.isActive ? (
                                <Badge className="bg-green-100 text-green-700">פעיל</Badge>
                              ) : (
                                <Badge variant="secondary">לא פעיל</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                                {showKey === apiKey.id 
                                  ? apiKey.key 
                                  : apiKey.key.slice(0, 10) + '••••••••••••••••'}
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
                                onClick={() => copyToClipboard(apiKey.key)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex gap-1 mt-1">
                              {apiKey.permissions.map(perm => (
                                <Badge key={perm} variant="outline" className="text-xs">{perm}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-left text-sm">
                            {apiKey.lastUsed && (
                              <p className="text-muted-foreground">
                                שימוש אחרון: {new Date(apiKey.lastUsed).toLocaleDateString('he-IL')}
                              </p>
                            )}
                            {apiKey.expiresAt && (
                              <p className="text-orange-500">
                                תוקף עד: {new Date(apiKey.expiresAt).toLocaleDateString('he-IL')}
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
