import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Video, ImagePlus, X, Check, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface TaskProofDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    title: string;
    description: string;
    points: number;
  } | null;
  onProofSubmitted: (taskId: string, proofType: 'post' | 'story' | 'reel', mediaUrl: string) => void;
}

export const TaskProofDialog = ({
  open,
  onOpenChange,
  task,
  onProofSubmitted,
}: TaskProofDialogProps) => {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<'post' | 'story' | 'reel' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const proofTypes = [
    { id: 'post' as const, label: 'פוסט', icon: ImagePlus, description: 'העלה תמונה לפיד' },
    { id: 'story' as const, label: 'סטורי', icon: Camera, description: 'שתף לסטורי' },
    { id: 'reel' as const, label: 'ריילס', icon: Video, description: 'צלם סרטון קצר' },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async () => {
    if (!task || !selectedType || !previewUrl) return;

    setIsUploading(true);
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    onProofSubmitted(task.id, selectedType, previewUrl);
    
    toast({
      title: "הוכחה נשלחה! 📸",
      description: `המשימה "${task.title}" הושלמה בהצלחה`,
    });

    // Reset state
    setSelectedType(null);
    setPreviewUrl(null);
    setIsUploading(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedType(null);
    setPreviewUrl(null);
    onOpenChange(false);
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm mx-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-center">
            השלמת משימה: {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task info */}
          <div className="text-center p-3 bg-primary/5 rounded-xl">
            <p className="text-sm text-muted-foreground">{task.description}</p>
            <p className="text-lg font-bold text-primary mt-1">+{task.points} נקודות</p>
          </div>

          {/* Proof type selection */}
          {!selectedType && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground text-center">
                בחר סוג הוכחה להעלאה:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {proofTypes.map((type) => (
                  <motion.button
                    key={type.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedType(type.id);
                      fileInputRef.current?.click();
                    }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <type.icon className="w-6 h-6 text-primary" />
                    <span className="text-sm font-medium">{type.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {selectedType && (
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {!previewUrl ? (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary flex flex-col items-center justify-center gap-3 bg-muted/20"
                  >
                    <Upload className="w-10 h-10 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">לחץ להעלאת קובץ</span>
                  </motion.button>
                ) : (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full aspect-square object-cover rounded-xl"
                    />
                    <button
                      onClick={() => {
                        setPreviewUrl(null);
                        setSelectedType(null);
                      }}
                      className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 px-3 py-1 bg-black/50 rounded-full text-white text-xs flex items-center gap-1">
                      {proofTypes.find(t => t.id === selectedType)?.label}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedType(null);
                      setPreviewUrl(null);
                    }}
                  >
                    ביטול
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleSubmit}
                    disabled={!previewUrl || isUploading}
                  >
                    {isUploading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Upload className="w-4 h-4" />
                      </motion.div>
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {isUploading ? "מעלה..." : "אישור"}
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
