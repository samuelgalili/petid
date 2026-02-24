import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Exchange the auth code/token from the URL
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          setError(sessionError.message);
          setTimeout(() => navigate("/auth"), 3000);
          return;
        }

        if (!session?.user) {
          // Wait for auth state to settle
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            if (newSession?.user) {
              subscription.unsubscribe();
              await syncUserMetadataToProfile(newSession.user);
              await redirectBasedOnProfile(newSession.user.id);
            }
          });
          // Timeout fallback
          setTimeout(() => {
            subscription.unsubscribe();
            navigate("/auth");
          }, 10000);
          return;
        }

        await syncUserMetadataToProfile(session.user);
        await redirectBasedOnProfile(session.user.id);
      } catch (err) {
        setError("שגיאה בתהליך ההתחברות");
        setTimeout(() => navigate("/auth"), 3000);
      }
    };

    const syncUserMetadataToProfile = async (user: any) => {
      try {
        const meta = user.user_metadata || {};
        const fullName = meta.full_name || meta.name || "";
        if (!fullName) return;

        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        const updates: Record<string, string> = {};
        if (firstName) updates.first_name = firstName;
        if (lastName) updates.last_name = lastName;
        if (meta.avatar_url) updates.avatar_url = meta.avatar_url;

        if (Object.keys(updates).length > 0) {
          await supabase
            .from("profiles")
            .update(updates)
            .eq("id", user.id);
        }
      } catch {
        // Non-critical — don't block redirect
      }
    };

    const redirectBasedOnProfile = async (userId: string) => {
      // Check if user has pets (indicates completed profile)
      const { data: pets, error: petsError } = await supabase
        .from("pets")
        .select("id")
        .eq("user_id", userId)
        .eq("archived", false)
        .limit(1);

      if (!petsError && pets && pets.length > 0) {
        // Existing user with pets — go home
        localStorage.setItem("onboardingCompleted", "true");
        navigate("/", { replace: true });
      } else {
        // New user or no pets — go to onboarding to complete profile
        navigate("/onboarding", { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <p className="text-destructive font-medium">{error}</p>
        <p className="text-sm text-muted-foreground">מעביר לדף ההתחברות...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">מאמת את החשבון שלך...</p>
    </div>
  );
};

export default AuthCallback;

