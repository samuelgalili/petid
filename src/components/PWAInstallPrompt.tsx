import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const STORAGE_KEY = "pwa_install_prompt_dismissed";

export const PWAInstallPrompt = () => {
  const { isInstallable, isInstalled, installPWA } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if already dismissed or installed
    const isDismissed = localStorage.getItem(STORAGE_KEY);
    
    if (!isDismissed && !isInstalled && isInstallable) {
      // Show after a short delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isInstalled, isInstallable]);

  const handleInstall = async () => {
    setIsInstalling(true);
    const success = await installPWA();
    setIsInstalling(false);
    
    if (success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
  };

  // Don't render if not installable or already installed
  if (!isInstallable || isInstalled) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto"
          dir="rtl"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Gradient top bar */}
            <div className="h-1 bg-gradient-to-r from-primary via-accent to-secondary" />
            
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground text-base mb-1">
                    הוסף למסך הבית 📱
                  </h3>
                  <p className="text-sm text-muted-foreground leading-snug">
                    גישה מהירה לכל התכונות, גם במצב לא מקוון
                  </p>
                </div>
                
                {/* Close button */}
                <button
                  onClick={handleDismiss}
                  className="p-1.5 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                >
                  <Download className="w-4 h-4" />
                  {isInstalling ? "מתקין..." : "התקן עכשיו"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDismiss}
                  className="px-4"
                >
                  לא עכשיו
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
