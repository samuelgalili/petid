import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Smartphone, Download, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      <AppHeader title="התקנת האפליקציה" showBackButton={true} />
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-3.5rem)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <Card className="p-8 shadow-2xl border-0 bg-card">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl"
            >
              <span className="text-4xl font-bold text-primary-foreground">P</span>
            </motion.div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-center text-foreground mb-3 font-jakarta">
            התקינו את Petid
          </h1>

          <p className="text-center text-muted-foreground mb-8 font-jakarta">
            קבלו גישה מהירה לכל התכונות ועבדו במצב לא מקוון
          </p>

          {/* Features */}
          <div className="space-y-4 mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <span className="text-foreground/80 font-jakarta">גישה מהירה מהמסך הראשי</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-info/20 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-info" />
              </div>
              <span className="text-foreground/80 font-jakarta">עובד כמו אפליקציה רגילה</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Download className="w-5 h-5 text-accent" />
              </div>
              <span className="text-foreground/80 font-jakarta">זמין גם במצב לא מקוון</span>
            </motion.div>
          </div>

          {/* Install Button or Status */}
          {isInstalled ? (
            <div className="space-y-4">
              <div className="bg-success/10 border-2 border-success/30 rounded-2xl p-4 text-center">
                <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-2" />
                <p className="text-success font-bold font-jakarta">
                  האפליקציה מותקנת! 🎉
                </p>
              </div>
              <Button
                onClick={() => navigate("/")}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 rounded-2xl shadow-lg font-jakarta"
              >
                חזרו לדף הבית
              </Button>
            </div>
          ) : deferredPrompt ? (
            <Button
              onClick={handleInstallClick}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 rounded-2xl shadow-lg flex items-center justify-center gap-3 font-jakarta"
            >
              <Download className="w-5 h-5" />
              התקינו עכשיו
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="bg-info/10 border-2 border-info/30 rounded-2xl p-4">
                <p className="text-info text-sm text-center font-jakarta">
                  להתקנה, לחצו על תפריט הדפדפן ובחרו "הוסף למסך הבית"
                </p>
              </div>
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="w-full py-6 rounded-2xl font-jakarta"
              >
                חזרו לדף הבית
              </Button>
            </div>
          )}

          {/* Instructions for iOS */}
          <div className="mt-6 p-4 bg-muted rounded-2xl">
            <p className="text-xs text-muted-foreground text-center font-jakarta">
              <strong>ב-iPhone:</strong> לחצו על כפתור השיתוף{" "}
              <span className="inline-block">📤</span> ובחרו "הוסף למסך הבית"
            </p>
          </div>
        </Card>
      </motion.div>
      </div>
    </div>
  );
};

export default Install;
