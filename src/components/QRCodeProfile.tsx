import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { QrCode, Download, Share2, Copy, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface QRCodeProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const QRCodeProfile = ({ open, onOpenChange, profile }: QRCodeProfileProps) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const profileUrl = `${window.location.origin}/user/${profile?.id || user?.id}`;

  useEffect(() => {
    if (open && canvasRef.current) {
      generateQRCode();
    }
  }, [open, profile]);

  const generateQRCode = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 200;
    canvas.width = size;
    canvas.height = size;

    // Simple QR-like pattern (for demo - in production use a proper QR library)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Create pattern based on URL hash
    const urlHash = profileUrl.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    ctx.fillStyle = '#000000';
    const moduleSize = 8;
    const modules = Math.floor(size / moduleSize);

    // Corner patterns (required for QR)
    const drawCornerPattern = (x: number, y: number) => {
      ctx.fillRect(x, y, 7 * moduleSize, moduleSize);
      ctx.fillRect(x, y + moduleSize, moduleSize, 5 * moduleSize);
      ctx.fillRect(x + 6 * moduleSize, y + moduleSize, moduleSize, 5 * moduleSize);
      ctx.fillRect(x, y + 6 * moduleSize, 7 * moduleSize, moduleSize);
      ctx.fillRect(x + 2 * moduleSize, y + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize);
    };

    drawCornerPattern(0, 0);
    drawCornerPattern((modules - 7) * moduleSize, 0);
    drawCornerPattern(0, (modules - 7) * moduleSize);

    // Data pattern
    let seed = Math.abs(urlHash);
    for (let i = 8; i < modules - 8; i++) {
      for (let j = 0; j < modules; j++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        if (seed % 3 === 0) {
          ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize);
        }
      }
    }

    // Center logo area (white background)
    const centerSize = 50;
    const centerX = (size - centerSize) / 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(centerX, centerX, centerSize, centerSize);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("הקישור הועתק!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("שגיאה בהעתקה");
    }
  };

  const shareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.full_name || "פרופיל"} - Petish`,
          url: profileUrl
        });
      } catch {
        // User cancelled
      }
    } else {
      copyLink();
    }
  };

  const downloadQR = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'petish-qr-code.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success("ה-QR Code נשמר!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2">
            <QrCode className="w-5 h-5" />
            קוד QR לפרופיל
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Profile Info */}
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback>{profile?.full_name?.[0] || "?"}</AvatarFallback>
            </Avatar>
            <span className="font-semibold">{profile?.full_name || "הפרופיל שלי"}</span>
          </div>

          {/* QR Code */}
          <div className="relative bg-white p-4 rounded-xl shadow-lg">
            <canvas ref={canvasRef} className="rounded-lg" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Avatar className="w-10 h-10 border-2 border-white">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{profile?.full_name?.[0] || "P"}</AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={copyLink}
            >
              {copied ? <Check className="w-4 h-4 ml-2" /> : <Copy className="w-4 h-4 ml-2" />}
              {copied ? "הועתק!" : "העתק קישור"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={shareProfile}
            >
              <Share2 className="w-4 h-4 ml-2" />
              שתף
            </Button>
          </div>

          <Button
            className="w-full rounded-xl"
            onClick={downloadQR}
          >
            <Download className="w-4 h-4 ml-2" />
            הורד QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};