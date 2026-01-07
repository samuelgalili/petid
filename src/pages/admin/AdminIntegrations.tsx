import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Plug, 
  CreditCard,
  Mail,
  MessageSquare,
  Truck,
  BarChart3,
  Shield,
  Settings,
  ExternalLink,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: "payment" | "shipping" | "marketing" | "analytics" | "security";
  icon: string;
  isConnected: boolean;
  isActive: boolean;
  configRequired: boolean;
}

const mockIntegrations: Integration[] = [
  { id: "1", name: "CardCom", description: "סליקת כרטיסי אשראי", category: "payment", icon: "💳", isConnected: true, isActive: true, configRequired: false },
  { id: "2", name: "PayPal", description: "תשלומים בינלאומיים", category: "payment", icon: "🅿️", isConnected: false, isActive: false, configRequired: true },
  { id: "3", name: "דואר ישראל", description: "משלוחים ומעקב", category: "shipping", icon: "📮", isConnected: true, isActive: true, configRequired: false },
  { id: "4", name: "Box-It", description: "נקודות איסוף", category: "shipping", icon: "📦", isConnected: false, isActive: false, configRequired: true },
  { id: "5", name: "Mailchimp", description: "שיווק באימייל", category: "marketing", icon: "📧", isConnected: true, isActive: false, configRequired: false },
  { id: "6", name: "SMS4Free", description: "שליחת SMS", category: "marketing", icon: "📱", isConnected: true, isActive: true, configRequired: false },
  { id: "7", name: "Google Analytics", description: "מעקב וניתוח", category: "analytics", icon: "📊", isConnected: true, isActive: true, configRequired: false },
  { id: "8", name: "Facebook Pixel", description: "מעקב המרות", category: "analytics", icon: "📈", isConnected: false, isActive: false, configRequired: true },
  { id: "9", name: "reCAPTCHA", description: "הגנה מבוטים", category: "security", icon: "🛡️", isConnected: true, isActive: true, configRequired: false },
  { id: "10", name: "Cloudflare", description: "אבטחה וביצועים", category: "security", icon: "☁️", isConnected: false, isActive: false, configRequired: true },
];

const AdminIntegrations = () => {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [configDialog, setConfigDialog] = useState<Integration | null>(null);

  const categories = [
    { id: "all", label: "הכל", icon: Plug },
    { id: "payment", label: "תשלומים", icon: CreditCard },
    { id: "shipping", label: "משלוחים", icon: Truck },
    { id: "marketing", label: "שיווק", icon: Mail },
    { id: "analytics", label: "אנליטיקה", icon: BarChart3 },
    { id: "security", label: "אבטחה", icon: Shield },
  ];

  const toggleActive = (id: string) => {
    setIntegrations(integrations.map(i => 
      i.id === id ? { ...i, isActive: !i.isActive } : i
    ));
  };

  const connectIntegration = (id: string) => {
    setIntegrations(integrations.map(i => 
      i.id === id ? { ...i, isConnected: true, isActive: true } : i
    ));
    setConfigDialog(null);
  };

  const filteredIntegrations = integrations.filter(i => 
    selectedCategory === "all" || i.category === selectedCategory
  );

  const connectedCount = integrations.filter(i => i.isConnected).length;
  const activeCount = integrations.filter(i => i.isActive).length;

  return (
    <AdminLayout title="אינטגרציות" icon={Plug}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 opacity-10" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 mb-1">סה״כ אינטגרציות</p>
                  <p className="text-2xl font-bold text-white">{integrations.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Plug className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-green-600 opacity-10" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 mb-1">מחוברות</p>
                  <p className="text-2xl font-bold text-white">{connectedCount}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-600 opacity-10" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 mb-1">פעילות</p>
                  <p className="text-2xl font-bold text-white">{activeCount}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-10" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 mb-1">דורשות הגדרה</p>
                  <p className="text-2xl font-bold text-white">{integrations.filter(i => !i.isConnected).length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Filter */}
        <Card className="border-0 bg-gradient-to-br from-slate-900 to-slate-800">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={selectedCategory === cat.id 
                    ? "bg-gradient-to-r from-violet-500 to-purple-600" 
                    : "border-slate-700 text-slate-300"
                  }
                >
                  <cat.icon className="w-4 h-4 ml-2" />
                  {cat.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Integrations Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredIntegrations.map((integration) => (
            <Card key={integration.id} className="border-0 bg-gradient-to-br from-slate-900 to-slate-800">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{integration.icon}</div>
                    <div>
                      <h3 className="font-bold text-white">{integration.name}</h3>
                      <p className="text-sm text-slate-400">{integration.description}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {integration.isConnected ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        מחובר
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                        לא מחובר
                      </Badge>
                    )}
                    {integration.isActive && (
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        פעיל
                      </Badge>
                    )}
                  </div>
                  {integration.isConnected ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={integration.isActive}
                        onCheckedChange={() => toggleActive(integration.id)}
                      />
                      <Button size="icon" variant="ghost" className="text-slate-400">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-gradient-to-r from-violet-500 to-purple-600">
                          חבר
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-slate-900 border-slate-700">
                        <DialogHeader>
                          <DialogTitle className="text-white flex items-center gap-2">
                            <span className="text-2xl">{integration.icon}</span>
                            חיבור {integration.name}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div>
                            <Label className="text-slate-300">API Key</Label>
                            <Input className="bg-slate-800 border-slate-700 text-white" placeholder="הזן API Key..." />
                          </div>
                          <div>
                            <Label className="text-slate-300">Secret Key</Label>
                            <Input type="password" className="bg-slate-800 border-slate-700 text-white" placeholder="הזן Secret Key..." />
                          </div>
                          <Button 
                            className="w-full bg-gradient-to-r from-violet-500 to-purple-600"
                            onClick={() => connectIntegration(integration.id)}
                          >
                            חבר ואמת
                          </Button>
                          <Button variant="link" className="w-full text-slate-400">
                            <ExternalLink className="w-4 h-4 ml-2" />
                            למדריך ההתקנה
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminIntegrations;