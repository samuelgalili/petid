import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import splashPaw from "@/assets/splash-paw.png";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("מאמת את החשבון שלך...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          setError(sessionError.message);
          setTimeout(() => navigate("/auth"), 3000);
          return;
        }

        if (!session?.user) {
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            if (newSession?.user) {
              subscription.unsubscribe();
              setStatusText("מסנכרן פרטים...");
              await syncUserMetadataToProfile(newSession.user);
              setStatusText("כמעט שם...");
              await redirectBasedOnProfile(newSession.user.id);
            }
          });
          setTimeout(() => {
            subscription.unsubscribe();
            navigate("/auth");
          }, 10000);
          return;
        }

        setStatusText("מסנכרן פרטים...");
        await syncUserMetadataToProfile(session.user);
        setStatusText("כמעט שם...");
        await redirectBasedOnProfile(session.user.id);
      } catch {
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
          await supabase.from("profiles").update(updates).eq("id", user.id);
        }
      } catch {
        // Non-critical
      }
    };

    const redirectBasedOnProfile = async (userId: string) => {
      const { data: pets, error: petsError } = await supabase
        .from("pets")
        .select("id")
        .eq("user_id", userId)
        .eq("archived", false)
        .limit(1);

      if (!petsError && pets && pets.length > 0) {
        localStorage.setItem("onboardingCompleted", "true");
        navigate("/", { replace: true });
      } else {
        navigate("/onboarding", { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mb-2"
        >
          <span className="text-3xl">😿</span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-destructive font-medium text-center"
        >
          {error}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted-foreground"
        >
          מעביר לדף ההתחברות...
        </motion.p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background relative overflow-hidden">
      {/* Subtle background glow */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 40%, hsl(var(--primary) / 0.06) 0%, transparent 60%)',
        }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Paw icon with glow */}
        <div className="relative mb-6">
          <motion.div
            className="absolute inset-0 blur-2xl rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
              transform: 'scale(2)',
            }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.img
            src={splashPaw}
            alt="Petid"
            className="w-24 h-24 object-contain relative z-10"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Spinner */}
        <motion.div
          className="w-8 h-8 rounded-full border-3 border-primary/20"
          style={{ borderTopColor: 'hsl(var(--primary))' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />

        {/* Status text */}
        <motion.p
          key={statusText}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-5 text-sm text-muted-foreground font-medium"
        >
          {statusText}
        </motion.p>
      </motion.div>
    </div>
  );
};

export default AuthCallback;
