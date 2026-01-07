import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plug,
  CheckCircle2,
  XCircle,
  Settings,
  ExternalLink,
  RefreshCw,
  MessageCircle,
  Mail,
  Globe,
  Phone
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AdminSectionCard } from "@/components/admin/AdminStyles";
import { cn } from "@/lib/utils";

const integrations = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "חבר את חשבון WhatsApp Business שלך לקבלת הודעות ישירות",
    icon: "📱",
    status: "connected",
    stats: { messages: 1247, responseRate: "98%" },
    color: "bg-emerald-500"
  },
  {
    id: "web",
    name: "Web Chat Widget",
    description: "הוסף צ׳אט לאתר שלך לשיחות בזמן אמת עם לקוחות",
    icon: "💻",
    status: "connected",
    stats: { messages: 892, responseRate: "99%" },
    color: "bg-blue-500"
  },
  {
    id: "facebook",
    name: "Facebook Messenger",
    description: "שלב עם דף הפייסבוק העסקי שלך",
    icon: "📘",
    status: "connected",
    stats: { messages: 456, responseRate: "95%" },
    color: "bg-indigo-500"
  },
  {
    id: "instagram",
    name: "Instagram DM",
    description: "קבל הודעות ישירות מאינסטגרם",
    icon: "📸",
    status: "connected",
    stats: { messages: 252, responseRate: "97%" },
    color: "bg-pink-500"
  },
  {
    id: "email",
    name: "Email Integration",
    description: "חבר את תיבת המייל העסקית שלך",
    icon: "📧",
    status: "disconnected",
    stats: null,
    color: "bg-amber-500"
  },
  {
    id: "sms",
    name: "SMS Gateway",
    description: "שלח ותקבל הודעות SMS",
    icon: "💬",
    status: "disconnected",
    stats: null,
    color: "bg-purple-500"
  },
];

const webhooks = [
  { id: 1, name: "CRM Sync", url: "https://api.mycrm.com/webhook", status: "active", lastTriggered: "לפני 5 דקות" },
  { id: 2, name: "Slack Notifications", url: "https://hooks.slack.com/...", status: "active", lastTriggered: "לפני שעה" },
  { id: 3, name: "Analytics", url: "https://analytics.example.com/...", status: "inactive", lastTriggered: "לפני יומיים" },
];

const AIIntegrations = () => {
  const [connectedIntegrations, setConnectedIntegrations] = useState(
    integrations.filter(i => i.status === "connected").map(i => i.id)
  );

  const toggleIntegration = (id: string) => {
    setConnectedIntegrations(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Channels */}
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {integrations.map((integration, index) => {
          const isConnected = connectedIntegrations.includes(integration.id);
          
          return (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={cn(
                "transition-all hover:shadow-md",
                isConnected && "border-primary/30 bg-primary/5"
              )}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                        isConnected ? integration.color : "bg-muted"
                      )}>
                        {integration.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold">{integration.name}</h3>
                        <Badge 
                          variant={isConnected ? "default" : "secondary"}
                          className={cn(
                            "mt-1",
                            isConnected && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          )}
                        >
                          {isConnected ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 ml-1" />
                              מחובר
                            </>
                          ) : (
                            "לא מחובר"
                          )}
                        </Badge>
                      </div>
                    </div>
                    <Switch
                      checked={isConnected}
                      onCheckedChange={() => toggleIntegration(integration.id)}
                    />
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    {integration.description}
                  </p>

                  {isConnected && integration.stats && (
                    <div className="flex items-center gap-4 text-sm pt-4 border-t">
                      <div>
                        <span className="text-muted-foreground">הודעות: </span>
                        <span className="font-medium">{integration.stats.messages.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">תגובה: </span>
                        <span className="font-medium text-emerald-600">{integration.stats.responseRate}</span>
                      </div>
                    </div>
                  )}

                  {!isConnected && (
                    <Button variant="outline" className="w-full gap-2">
                      <Plug className="w-4 h-4" />
                      התחבר
                    </Button>
                  )}

                  {isConnected && (
                    <Button variant="ghost" className="w-full gap-2" size="sm">
                      <Settings className="w-4 h-4" />
                      הגדרות
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Webhooks */}
      <AdminSectionCard 
        title="Webhooks" 
        icon={Globe}
        actions={
          <Button size="sm" className="gap-2">
            <Plug className="w-4 h-4" />
            הוסף Webhook
          </Button>
        }
      >
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
            >
              <div className={cn(
                "p-2 rounded-lg",
                webhook.status === "active" ? "bg-emerald-500/10" : "bg-muted"
              )}>
                <Globe className={cn(
                  "w-5 h-5",
                  webhook.status === "active" ? "text-emerald-500" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{webhook.name}</p>
                  <Badge variant={webhook.status === "active" ? "default" : "secondary"}>
                    {webhook.status === "active" ? "פעיל" : "כבוי"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{webhook.url}</p>
              </div>
              <div className="text-xs text-muted-foreground text-left shrink-0">
                {webhook.lastTriggered}
              </div>
              <Button variant="ghost" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </AdminSectionCard>

      {/* API Access */}
      <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-primary/10">
              <Plug className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">גישה ל-API</h3>
              <p className="text-sm text-muted-foreground">
                שלב את מערכת ה-AI שלנו עם כל מערכת באמצעות ה-API שלנו
              </p>
            </div>
            <Button className="gap-2">
              <ExternalLink className="w-4 h-4" />
              תיעוד API
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIIntegrations;
