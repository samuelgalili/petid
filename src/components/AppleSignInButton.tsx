import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AppleSignInButtonProps {
  redirectTo?: string;
  className?: string;
}

export const AppleSignInButton = ({ 
  redirectTo = "/", 
  className 
}: AppleSignInButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}${redirectTo}`,
        },
      });

      if (error) {
        toast.error(error.message || "שגיאה בהתחברות עם Apple");
      }
    } catch (error) {
      toast.error("שגיאה בהתחברות עם Apple");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleAppleSignIn}
      disabled={loading}
      className={`w-full h-11 relative font-semibold ${className}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <svg 
            className="w-5 h-5 absolute right-4" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          <span>התחברות עם Apple</span>
        </>
      )}
    </Button>
  );
};
