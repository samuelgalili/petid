import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation as useGeoLocation } from "@/hooks/useLocation";
import { useLocation } from "react-router-dom";
import { getCurrentUser, updateMyProfile } from "@/lib/mipoApi";
import {
  PROFILE_PROMPT_DELAY_MS,
  profilePromptAllowed,
  profilePromptPastFirstSession,
  profilePromptSnoozed,
  readOnboardingFlag,
  snoozeProfilePrompt,
} from "@/lib/flowSurfaces";

interface ProfileData {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  city: string | null;
}

const CompleteProfilePrompt = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const geo = useGeoLocation();
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", city: "" });
  const [missingFields, setMissingFields] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !user || dismissed) return;
    // Mark the session even on onboarding, so the same tab's first home
    // landing is still the first session.
    if (!profilePromptPastFirstSession()) return;
    if (!profilePromptAllowed(location.pathname, readOnboardingFlag())) return;
    if (profilePromptSnoozed(user.id)) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        if (!profilePromptAllowed(location.pathname, readOnboardingFlag())) return;

        const data = (await getCurrentUser())?.profile;
        if (cancelled || !data) return;
        if (!profilePromptAllowed(location.pathname, readOnboardingFlag())) return;

        setProfile({
          full_name: data.full_name,
          first_name: data.first_name ?? null,
          last_name: data.last_name ?? null,
          phone: data.phone ?? null,
          city: data.city ?? null,
        });

        const missing: string[] = [];
        if (!data.first_name) missing.push("first_name");
        if (!data.last_name) missing.push("last_name");
        if (!data.city) missing.push("city");

        if (missing.length === 0) return;
        setMissingFields(missing);
        if (data.full_name && (!data.first_name || !data.last_name)) {
          const parts = data.full_name.split(" ");
          setForm(prev => ({
            ...prev,
            first_name: data.first_name || parts[0] || "",
            last_name: data.last_name || parts.slice(1).join(" ") || "",
          }));
        }
        setShow(true);
      })();
    }, PROFILE_PROMPT_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isAuthenticated, user, dismissed, location.pathname]);

  // Auto-detect city via GPS if city is missing
  useEffect(() => {
    if (show && missingFields.includes("city") && !form.city && !geo.hasLocation) {
      geo.requestLocation();
    }
  }, [show, missingFields]);

  useEffect(() => {
    if (geo.city && !form.city) {
      setForm(prev => ({ ...prev, city: geo.city || "" }));
    }
  }, [geo.city]);

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    if (user) snoozeProfilePrompt(user.id);
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    const updates: Partial<ProfileData> & { full_name?: string } = {};
    if (missingFields.includes("first_name") && form.first_name) updates.first_name = form.first_name.trim();
    if (missingFields.includes("last_name") && form.last_name) updates.last_name = form.last_name.trim();
    if (missingFields.includes("city") && form.city) updates.city = form.city.trim();

    // Update full_name if first/last changed
    if (updates.first_name || updates.last_name) {
      const fn = updates.first_name || profile?.first_name || "";
      const ln = updates.last_name || profile?.last_name || "";
      updates.full_name = `${fn} ${ln}`.trim();
    }

    try {
      await updateMyProfile(updates);
      toast({ title: "הפרטים נשמרו", description: "תודה שהשלמתם את הפרופיל" });
      handleDismiss();
    } catch {
      toast({ title: "שגיאה", description: "לא הצלחנו לשמור את הפרטים", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!show || !profilePromptAllowed(location.pathname, readOnboardingFlag())) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        className="fixed bottom-24 left-4 right-4 z-[10020] md:left-auto md:right-6 md:max-w-sm"
        data-testid="complete-profile-prompt"
      >
        <div className="bg-card border border-border rounded-2xl shadow-xl p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-sm">השלמת פרופיל 🐾</h3>
                <p className="text-xs text-muted-foreground">עזרו לנו להכיר אתכם טוב יותר</p>
              </div>
            </div>
            <button type="button" onClick={handleDismiss} aria-label="סגירה" className="text-muted-foreground hover:text-foreground p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {(missingFields.includes("first_name") || missingFields.includes("last_name")) && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">שם פרטי</Label>
                  <Input
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    placeholder="שם פרטי"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">שם משפחה</Label>
                  <Input
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    placeholder="שם משפחה"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            )}

            {missingFields.includes("city") && (
              <div>
                <Label className="text-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  עיר
                  {geo.loading && <Loader2 className="w-3 h-3 animate-spin" />}
                </Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder={geo.loading ? "מזהה מיקום..." : "שם העיר"}
                  className="h-9 text-sm"
                />
                {geo.city && !form.city && (
                  <button
                    className="text-xs text-primary mt-1"
                    onClick={() => setForm({ ...form, city: geo.city || "" })}
                  >
                    להשתמש ב-{geo.city}?
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm" className="flex-1" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "שמירה"}
            </Button>
            <Button type="button" onClick={handleDismiss} size="sm" variant="ghost" className="text-muted-foreground" data-testid="complete-profile-skip">
              אח״כ
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CompleteProfilePrompt;
