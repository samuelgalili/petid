import { useState } from "react";
import { motion } from "framer-motion";
import { QrCode, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";

interface PetQRCodeProps {
  petId: string;
  petName: string;
  petAvatar?: string;
}

export const PetQRCode = ({ petId, petName, petAvatar }: PetQRCodeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const qrUrl = `${window.location.origin}/pet/${petId}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${petName} - MIPO`,
          text: `צפה בפרופיל של ${petName}`,
          url: qrUrl,
        });
      } catch {}
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="flex flex-col items-center justify-center gap-1 p-3 bg-gradient-to-b from-background to-muted/20 rounded-2xl border border-border/30 hover:border-primary/40 transition-all shadow-sm hover:shadow-md w-full h-full"
        title="QR Code אישי"
      >
        <QrCode className="w-8 h-8 text-primary" />
        <span className="text-[9px] font-semibold text-foreground">QR Code</span>
      </motion.button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xs p-6 text-center" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg">QR Code של {petName}</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative bg-white p-4 rounded-2xl shadow-sm">
              <QRCodeSVG
                value={qrUrl}
                size={200}
                level="H"
                marginSize={2}
                title={`קוד QR לפרופיל של ${petName}`}
              />
              {petAvatar && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <img
                    src={petAvatar}
                    alt=""
                    className="h-8 w-8 rounded-md border-2 border-white bg-white object-cover"
                  />
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              סרוק את הקוד לצפייה בפרופיל של {petName}
            </p>

            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              שתף קישור
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
