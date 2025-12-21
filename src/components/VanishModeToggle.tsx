import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Ghost, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface VanishModeToggleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vanishMode: boolean;
  onToggle: (enabled: boolean) => void;
}

export const VanishModeToggle = ({ 
  open, 
  onOpenChange, 
  vanishMode, 
  onToggle 
}: VanishModeToggleProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    setTimeout(() => {
      onToggle(!vanishMode);
      setIsAnimating(false);
      onOpenChange(false);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-center">
            <Ghost className="w-5 h-5" />
            מצב נעלם
          </DialogTitle>
          <DialogDescription className="text-center">
            הודעות נעלמות אחרי שנקראו
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Animation */}
          <motion.div 
            className="flex justify-center mb-6"
            animate={isAnimating ? { scale: [1, 1.2, 0], opacity: [1, 1, 0] } : {}}
            transition={{ duration: 0.5 }}
          >
            <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
              vanishMode 
                ? "bg-gradient-to-br from-purple-500 to-pink-500" 
                : "bg-muted"
            }`}>
              {vanishMode ? (
                <Ghost className="w-12 h-12 text-white" />
              ) : (
                <Eye className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
          </motion.div>

          {/* Status */}
          <div className="text-center mb-6">
            <p className="font-semibold text-lg">
              {vanishMode ? "מצב נעלם פעיל" : "מצב נעלם כבוי"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {vanishMode 
                ? "הודעות נמחקות אחרי שנקראו" 
                : "הודעות נשמרות כרגיל"
              }
            </p>
          </div>

          {/* Warning */}
          {!vanishMode && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-6">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  שים לב: הודעות במצב נעלם לא ניתנות לשחזור לאחר שנקראו
                </p>
              </div>
            </div>
          )}

          {/* Toggle Button */}
          <Button
            className={`w-full rounded-xl h-12 ${
              vanishMode 
                ? "bg-muted hover:bg-muted/80 text-foreground" 
                : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            }`}
            onClick={handleToggle}
          >
            {vanishMode ? (
              <>
                <EyeOff className="w-5 h-5 ml-2" />
                כבה מצב נעלם
              </>
            ) : (
              <>
                <Ghost className="w-5 h-5 ml-2" />
                הפעל מצב נעלם
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};