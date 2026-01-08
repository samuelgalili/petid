import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, MapPin, Eye, Mail, MessageCircle, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const PrivacySettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    location_blur_enabled: true,
    profile_visibility: 'public',
    show_location: false,
    show_email: false,
    allow_messages_from: 'followers',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('location_blur_enabled, profile_visibility, show_location, show_email, allow_messages_from')
        .eq('id', user.id)
        .maybeSingle();
      
      if (data) {
        setSettings({
          location_blur_enabled: data.location_blur_enabled ?? true,
          profile_visibility: data.profile_visibility ?? 'public',
          show_location: data.show_location ?? false,
          show_email: data.show_email ?? false,
          allow_messages_from: data.allow_messages_from ?? 'followers',
        });
      }
      setLoading(false);
    };

    fetchSettings();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update(settings)
      .eq('id', user.id);
    
    setSaving(false);
    
    if (error) {
      toast.error('שגיאה בשמירת ההגדרות');
    } else {
      toast.success('ההגדרות נשמרו בהצלחה');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold">הגדרות פרטיות</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Location Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">מיקום</h3>
                <p className="text-sm text-muted-foreground">שליטה במידע על המיקום שלך</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="blur-location" className="flex-1">
                  <span className="font-medium">טשטוש מיקום אוטומטי</span>
                  <p className="text-xs text-muted-foreground">המיקום יוצג באופן כללי ולא מדויק</p>
                </Label>
                <Switch
                  id="blur-location"
                  checked={settings.location_blur_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, location_blur_enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show-location" className="flex-1">
                  <span className="font-medium">הצג מיקום בפרופיל</span>
                  <p className="text-xs text-muted-foreground">אחרים יוכלו לראות את העיר שלך</p>
                </Label>
                <Switch
                  id="show-location"
                  checked={settings.show_location}
                  onCheckedChange={(checked) => setSettings({ ...settings, show_location: checked })}
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Profile Visibility */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">נראות הפרופיל</h3>
                <p className="text-sm text-muted-foreground">מי יכול לראות את הפרופיל והפוסטים שלך</p>
              </div>
            </div>

            <RadioGroup
              value={settings.profile_visibility}
              onValueChange={(value) => setSettings({ ...settings, profile_visibility: value })}
              className="space-y-3"
            >
              <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="flex-1 cursor-pointer">
                  <span className="font-medium">ציבורי</span>
                  <p className="text-xs text-muted-foreground">כולם יכולים לראות</p>
                </Label>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="followers" id="followers" />
                <Label htmlFor="followers" className="flex-1 cursor-pointer">
                  <span className="font-medium">עוקבים בלבד</span>
                  <p className="text-xs text-muted-foreground">רק אנשים שעוקבים אחריך</p>
                </Label>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="flex-1 cursor-pointer">
                  <span className="font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    פרטי
                  </span>
                  <p className="text-xs text-muted-foreground">רק אתה יכול לראות</p>
                </Label>
              </div>
            </RadioGroup>
          </Card>
        </motion.div>

        {/* Contact Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">יצירת קשר</h3>
                <p className="text-sm text-muted-foreground">מי יכול ליצור איתך קשר</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-email" className="flex-1">
                  <span className="font-medium">הצג אימייל בפרופיל</span>
                  <p className="text-xs text-muted-foreground">אחרים יוכלו לראות את האימייל שלך</p>
                </Label>
                <Switch
                  id="show-email"
                  checked={settings.show_email}
                  onCheckedChange={(checked) => setSettings({ ...settings, show_email: checked })}
                />
              </div>

              <div className="pt-2">
                <Label className="font-medium mb-2 block">מי יכול לשלוח לי הודעות</Label>
                <RadioGroup
                  value={settings.allow_messages_from}
                  onValueChange={(value) => setSettings({ ...settings, allow_messages_from: value })}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="everyone" id="msg-everyone" />
                    <Label htmlFor="msg-everyone" className="cursor-pointer">כולם</Label>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="followers" id="msg-followers" />
                    <Label htmlFor="msg-followers" className="cursor-pointer">עוקבים בלבד</Label>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="nobody" id="msg-nobody" />
                    <Label htmlFor="msg-nobody" className="cursor-pointer">אף אחד</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Save Button */}
        <Button 
          className="w-full" 
          size="lg"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              שומר...
            </>
          ) : (
            'שמור הגדרות'
          )}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default PrivacySettings;
