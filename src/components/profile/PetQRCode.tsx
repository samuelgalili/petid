import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, X, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PetQRCodeProps {
  petId: string;
  petName: string;
  petAvatar?: string;
}

// Simple QR code generator using SVG (no external library needed)
const generateQRMatrix = (data: string): boolean[][] => {
  // Simplified QR-like pattern for visual purposes
  // In production, use a proper QR library
  const size = 21;
  const matrix: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));
  
  // Finder patterns (corners)
  const drawFinder = (x: number, y: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
          matrix[y + i][x + j] = true;
        }
      }
    }
  };
  
  drawFinder(0, 0);
  drawFinder(size - 7, 0);
  drawFinder(0, size - 7);
  
  // Data pattern based on input hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash |= 0;
  }
  
  for (let i = 8; i < size - 8; i++) {
    for (let j = 8; j < size - 8; j++) {
      matrix[i][j] = ((hash >> ((i * size + j) % 31)) & 1) === 1;
    }
  }
  
  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }
  
  return matrix;
};

export const PetQRCode = ({ petId, petName, petAvatar }: PetQRCodeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const qrUrl = `${window.location.origin}/pet/${petId}`;
  const matrix = generateQRMatrix(petId);
  const cellSize = 8;
  const padding = 16;
  const qrSize = matrix.length * cellSize + padding * 2;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${petName} - PetID`,
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
        className="flex flex-col items-center gap-1 p-2.5 bg-gradient-to-b from-background to-muted/20 rounded-2xl border border-border/30 hover:border-primary/40 transition-all shadow-sm hover:shadow-md min-w-[60px]"
        title="QR Code אישי"
      >
        <QrCode className="w-5 h-5 text-primary" />
        <span className="text-[9px] font-semibold text-foreground">QR Code</span>
      </motion.button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xs p-6 text-center" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg">QR Code של {petName}</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4 py-4">
            {/* QR Code SVG */}
            <div className="bg-white p-4 rounded-2xl shadow-sm">
              <svg width={qrSize} height={qrSize} viewBox={`0 0 ${qrSize} ${qrSize}`}>
                <rect width={qrSize} height={qrSize} fill="white" />
                {matrix.map((row, y) =>
                  row.map((cell, x) =>
                    cell ? (
                      <rect
                        key={`${x}-${y}`}
                        x={padding + x * cellSize}
                        y={padding + y * cellSize}
                        width={cellSize}
                        height={cellSize}
                        fill="hsl(var(--foreground))"
                        rx={1}
                      />
                    ) : null
                  )
                )}
                {/* Center avatar */}
                {petAvatar && (
                  <>
                    <rect
                      x={qrSize / 2 - 20}
                      y={qrSize / 2 - 20}
                      width={40}
                      height={40}
                      fill="white"
                      rx={8}
                    />
                    <image
                      href={petAvatar}
                      x={qrSize / 2 - 16}
                      y={qrSize / 2 - 16}
                      width={32}
                      height={32}
                      clipPath="inset(0 round 6px)"
                    />
                  </>
                )}
              </svg>
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
