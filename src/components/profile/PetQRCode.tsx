import { useState } from "react";
import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";
import { isUsablePetImageSrc, resolveQrSrc } from "@/lib/petImageSrc";

interface PetQRCodeProps {
  petId: string;
  petName: string;
  petType?: string | null;
  /** Uploaded source only. Never pass avatar_url / Master. */
  petSourceImage?: string | null;
}

const typeIconFor = (petType?: string | null): string => (
  petType === "cat" ? catIcon : dogIcon
);

/**
 * Q4 AC: the QR *surface* is a real QRCodeSVG (`/pet/{id}`), with the uploaded
 * source photo in the center. No decorative matrix. Never Master/avatar_url.
 * Viewing is ungated — no paywall.
 */
export const PetQRCode = ({ petId, petName, petType, petSourceImage }: PetQRCodeProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const qrUrl = `${window.location.origin}/pet/${petId}`;
  const usedSource = isUsablePetImageSrc(petSourceImage);
  const qrCenterSrc = resolveQrSrc(petSourceImage, typeIconFor(petType));

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
        data-testid="pet-qr-open"
      >
        <QrFace
          qrUrl={qrUrl}
          qrCenterSrc={qrCenterSrc}
          usedSource={usedSource}
          petName={petName}
          size={72}
          imageSize={20}
          testId="pet-qr-surface"
        />
        <span className="text-[9px] font-semibold text-foreground">QR Code</span>
      </motion.button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xs p-6 text-center" dir="rtl" data-testid="pet-qr-dialog">
          <DialogHeader>
            <DialogTitle className="text-lg">QR Code של {petName}</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4 py-4">
            <QrFace
              qrUrl={qrUrl}
              qrCenterSrc={qrCenterSrc}
              usedSource={usedSource}
              petName={petName}
              size={200}
              imageSize={48}
              testId="pet-qr-dialog-surface"
            />

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

const QrFace = ({
  qrUrl,
  qrCenterSrc,
  usedSource,
  petName,
  size,
  imageSize,
  testId,
}: {
  qrUrl: string;
  qrCenterSrc: string;
  usedSource: boolean;
  petName: string;
  size: number;
  imageSize: number;
  testId: string;
}) => (
  <div
    className="relative bg-white p-1 rounded-xl shadow-sm"
    data-testid={testId}
    data-qr-value={qrUrl}
    data-qr-center-src={qrCenterSrc}
    data-qr-center-kind={usedSource ? "source" : "type-icon"}
  >
    <QRCodeSVG
      value={qrUrl}
      size={size}
      level="H"
      marginSize={1}
      title={`קוד QR לפרופיל של ${petName}`}
      imageSettings={{
        src: qrCenterSrc,
        height: imageSize,
        width: imageSize,
        excavate: true,
      }}
    />
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <img
        src={qrCenterSrc}
        alt=""
        data-testid={`${testId}-image`}
        className="rounded-md border-2 border-white bg-white object-cover"
        style={{ width: imageSize, height: imageSize }}
      />
    </div>
  </div>
);
