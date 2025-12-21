import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { BellOff, Clock, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface QuietModeSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuietModeSettings = ({ open, onOpenChange }: QuietModeSettingsProps) => {
  const { user } = useAuth();
  const [quietModeEnabled, setQuietModeEnabled] = useState(false);
  const [quietModeHours, setQuietModeHours] = useState<number>(8);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      checkQuietMode();
    }
  }, [open, user]);

  const checkQuietMode = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('quiet_mode_until')
        .eq('id', user.id)
        .single();

      if (data?.quiet_mode_until) {
        const until = new Date(data.quiet_mode_until);
        if (until > new Date()) {
          setQuietModeEnabled(true);
        }
      }
    } catch (error) {
      console.error("Error checking quiet mode:", error);
    }
  };

  const toggleQuietMode = async (enabled: boolean) => {
    if (!user) return;
    setLoading(true);

    try {
      const quietModeUntil = enabled 
        ? new Date(Date.now() + quietModeHours * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from('profiles')
        .update({ quiet_mode_until: quietModeUntil })
        .eq('id', user.id);

      if (error) throw error;

      setQuietModeEnabled(enabled);
      toast.success(enabled 
        ? `מצב שקט הופעל ל-${quietModeHours} שעות` 
        : "מצב שקט כובה"
      );
    } catch (error) {
      console.error("Error toggling quiet mode:", error);
      toast.error("שגיאה בעדכון");
    } finally {
      setLoading(false);
    }
  };

  const hourOptions = [1, 2, 4, 8, 12, 24];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5" />
            מצב שקט
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Main Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <BellOff className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">מצב שקט</p>
                <p className="text-xs text-muted-foreground">השתקת כל ההתראות</p>
              </div>
            </div>
            <Switch
              checked={quietModeEnabled}
              onCheckedChange={toggleQuietMode}
              disabled={loading}
            />
          </div>

          {/* Duration Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>משך הזמן</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {hourOptions.map((hours) => (
                <Button
                  key={hours}
                  variant={quietModeHours === hours ? "default" : "outline"}
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setQuietModeHours(hours)}
                >
                  {hours} {hours === 1 ? "שעה" : "שעות"}
                </Button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium">בזמן מצב שקט:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• לא יוצגו התראות Push</li>
              <li>• לא ישמעו צלילים</li>
              <li>• העוקבים שלך יראו שאתה במצב שקט</li>
              <li>• הודעות עדיין יישמרו לצפייה מאוחר יותר</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};