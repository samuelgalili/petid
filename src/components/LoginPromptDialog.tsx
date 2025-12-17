import { useNavigate } from "react-router-dom";
import { useGuest } from "@/contexts/GuestContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus } from "lucide-react";
import { motion } from "framer-motion";

export const LoginPromptDialog = () => {
  const navigate = useNavigate();
  const { showLoginPrompt, loginPromptMessage, closeLoginPrompt, setGuestMode } = useGuest();

  const handleLogin = () => {
    setGuestMode(false);
    closeLoginPrompt();
    navigate("/auth");
  };

  const handleSignup = () => {
    setGuestMode(false);
    closeLoginPrompt();
    navigate("/signup");
  };

  return (
    <Dialog open={showLoginPrompt} onOpenChange={closeLoginPrompt}>
      <DialogContent className="sm:max-w-[340px] rounded-2xl border-0 bg-card p-0 overflow-hidden">
        {/* Instagram-style gradient header */}
        <div className="h-2 bg-gradient-instagram" />
        
        <div className="p-6 text-center">
          <DialogHeader className="space-y-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mx-auto w-16 h-16 rounded-full bg-gradient-instagram flex items-center justify-center"
            >
              <LogIn className="w-8 h-8 text-white" />
            </motion.div>
            
            <DialogTitle className="text-xl font-bold text-foreground">
              הצטרף לקהילה
            </DialogTitle>
            
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              {loginPromptMessage}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-3">
            <Button
              onClick={handleLogin}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary-dark text-primary-foreground font-semibold"
            >
              <LogIn className="w-5 h-5 ml-2" />
              התחברות
            </Button>
            
            <Button
              onClick={handleSignup}
              variant="outline"
              className="w-full h-12 rounded-xl border-border hover:bg-muted/50 font-semibold"
            >
              <UserPlus className="w-5 h-5 ml-2" />
              הרשמה
            </Button>
          </div>

          <button
            onClick={closeLoginPrompt}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            המשך לגלוש
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
