import { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Bell,
  Shield,
  Clock,
  Users,
  Globe,
  Palette,
  MessageSquare,
  Save,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { AdminSectionCard } from "@/components/admin/AdminStyles";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AISettings = () => {
  const [settings, setSettings] = useState({
    // General
    botName: "PetID Assistant",
    welcomeMessage: "שלום! אני העוזר הווירטואלי של PetID. איך אוכל לעזור לך היום?",
    language: "he",
    
    // Notifications
    notifyOnHandoff: true,
    notifyOnNegativeSentiment: true,
    notifyOnNewLead: true,
    dailySummary: true,
    
    // Working Hours
    enableWorkingHours: true,
    workingHoursStart: "09:00",
    workingHoursEnd: "21:00",
    offHoursMessage: "תודה על פנייתך! אנחנו כרגע לא זמינים. נחזור אליך בהקדם.",
    
    // Security
    requireEmailForLead: true,
    blockSpam: true,
    maxMessagesPerMinute: 10,
    
    // Widget
    widgetPosition: "bottom-right",
    widgetColor: "#6366f1",
    showOnMobile: true,
  });

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="w-4 h-4" />
            כללי
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            התראות
          </TabsTrigger>
          <TabsTrigger value="hours" className="gap-2">
            <Clock className="w-4 h-4" />
            שעות פעילות
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            אבטחה
          </TabsTrigger>
          <TabsTrigger value="widget" className="gap-2">
            <Palette className="w-4 h-4" />
            ווידג׳ט
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <AdminSectionCard title="הגדרות כלליות" icon={Settings}>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>שם הבוט</Label>
                <Input
                  value={settings.botName}
                  onChange={(e) => updateSetting("botName", e.target.value)}
                  placeholder="שם שיופיע ללקוחות"
                />
              </div>

              <div className="space-y-2">
                <Label>הודעת ברוכים הבאים</Label>
                <Textarea
                  value={settings.welcomeMessage}
                  onChange={(e) => updateSetting("welcomeMessage", e.target.value)}
                  placeholder="ההודעה הראשונה שהלקוח יקבל"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>שפה ראשית</Label>
                <Select
                  value={settings.language}
                  onValueChange={(val) => updateSetting("language", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="he">עברית</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AdminSectionCard>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <AdminSectionCard title="הגדרות התראות" icon={Bell}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>התראה על העברה לנציג</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    קבל התראה כששיחה מועברת לטיפול נציג
                  </p>
                </div>
                <Switch
                  checked={settings.notifyOnHandoff}
                  onCheckedChange={(val) => updateSetting("notifyOnHandoff", val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>התראה על סנטימנט שלילי</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    קבל התראה כשמזוהה לקוח מתוסכל
                  </p>
                </div>
                <Switch
                  checked={settings.notifyOnNegativeSentiment}
                  onCheckedChange={(val) => updateSetting("notifyOnNegativeSentiment", val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>התראה על ליד חדש</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    קבל התראה כשנאסף ליד חדש
                  </p>
                </div>
                <Switch
                  checked={settings.notifyOnNewLead}
                  onCheckedChange={(val) => updateSetting("notifyOnNewLead", val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>סיכום יומי</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    קבל סיכום יומי של הפעילות במייל
                  </p>
                </div>
                <Switch
                  checked={settings.dailySummary}
                  onCheckedChange={(val) => updateSetting("dailySummary", val)}
                />
              </div>
            </div>
          </AdminSectionCard>
        </TabsContent>

        {/* Working Hours Tab */}
        <TabsContent value="hours" className="space-y-6">
          <AdminSectionCard title="שעות פעילות" icon={Clock}>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>הפעל מצב שעות פעילות</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    הגדר שעות בהן הבוט פעיל
                  </p>
                </div>
                <Switch
                  checked={settings.enableWorkingHours}
                  onCheckedChange={(val) => updateSetting("enableWorkingHours", val)}
                />
              </div>

              {settings.enableWorkingHours && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>שעת התחלה</Label>
                      <Input
                        type="time"
                        value={settings.workingHoursStart}
                        onChange={(e) => updateSetting("workingHoursStart", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>שעת סיום</Label>
                      <Input
                        type="time"
                        value={settings.workingHoursEnd}
                        onChange={(e) => updateSetting("workingHoursEnd", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>הודעה מחוץ לשעות הפעילות</Label>
                    <Textarea
                      value={settings.offHoursMessage}
                      onChange={(e) => updateSetting("offHoursMessage", e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>
          </AdminSectionCard>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <AdminSectionCard title="הגדרות אבטחה" icon={Shield}>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>דרוש אימייל לאיסוף ליד</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    בקש אימייל לפני שמירת פרטי ליד
                  </p>
                </div>
                <Switch
                  checked={settings.requireEmailForLead}
                  onCheckedChange={(val) => updateSetting("requireEmailForLead", val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>חסימת ספאם</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    זהה וחסום הודעות ספאם אוטומטית
                  </p>
                </div>
                <Switch
                  checked={settings.blockSpam}
                  onCheckedChange={(val) => updateSetting("blockSpam", val)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>מגבלת הודעות לדקה</Label>
                  <span className="text-sm font-medium">{settings.maxMessagesPerMinute}</span>
                </div>
                <Slider
                  value={[settings.maxMessagesPerMinute]}
                  min={1}
                  max={30}
                  step={1}
                  onValueChange={(val) => updateSetting("maxMessagesPerMinute", val[0])}
                />
                <p className="text-xs text-muted-foreground">
                  מגביל כמה הודעות משתמש יכול לשלוח בדקה
                </p>
              </div>
            </div>
          </AdminSectionCard>
        </TabsContent>

        {/* Widget Tab */}
        <TabsContent value="widget" className="space-y-6">
          <AdminSectionCard title="הגדרות ווידג׳ט" icon={Palette}>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>מיקום הווידג׳ט</Label>
                <Select
                  value={settings.widgetPosition}
                  onValueChange={(val) => updateSetting("widgetPosition", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">למטה מימין</SelectItem>
                    <SelectItem value="bottom-left">למטה משמאל</SelectItem>
                    <SelectItem value="top-right">למעלה מימין</SelectItem>
                    <SelectItem value="top-left">למעלה משמאל</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>צבע הווידג׳ט</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={settings.widgetColor}
                    onChange={(e) => updateSetting("widgetColor", e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={settings.widgetColor}
                    onChange={(e) => updateSetting("widgetColor", e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>הצג בנייד</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    הצג את הווידג׳ט במכשירים ניידים
                  </p>
                </div>
                <Switch
                  checked={settings.showOnMobile}
                  onCheckedChange={(val) => updateSetting("showOnMobile", val)}
                />
              </div>
            </div>
          </AdminSectionCard>

          {/* Widget Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">תצוגה מקדימה</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-48 bg-muted/30 rounded-xl overflow-hidden">
                <div 
                  className="absolute bottom-4 left-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-110"
                  style={{ backgroundColor: settings.widgetColor }}
                >
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          איפוס
        </Button>
        <Button className="gap-2">
          <Save className="w-4 h-4" />
          שמור הגדרות
        </Button>
      </div>
    </div>
  );
};

export default AISettings;
