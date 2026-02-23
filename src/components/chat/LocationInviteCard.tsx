import { MapPin, Navigation } from "lucide-react";
import { motion } from "framer-motion";

interface LocationInviteCardProps {
  parkName?: string;
  address?: string;
  onAccept?: () => void;
  isSender?: boolean;
}

export const LocationInviteCard = ({
  parkName = "גן הכלבים הקרוב",
  address = "בקרבת מקומך",
  onAccept,
  isSender = false,
}: LocationInviteCardProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className={`max-w-[80%] rounded-2xl overflow-hidden border border-border/40 shadow-sm ${
      isSender ? "mr-0 ml-auto" : "ml-0 mr-auto"
    }`}
  >
    {/* Mini map placeholder */}
    <div className="h-28 bg-gradient-to-br from-green-500/20 to-emerald-500/10 relative flex items-center justify-center">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_60%_40%,_hsl(var(--primary))_0%,_transparent_60%)]" />
      <MapPin className="h-10 w-10 text-primary" strokeWidth={1.5} />
      <div className="absolute bottom-2 right-2 px-2 py-1 bg-background/80 backdrop-blur-sm rounded-full text-[10px] text-muted-foreground flex items-center gap-1">
        <Navigation className="h-3 w-3" />
        250 מ'
      </div>
    </div>
    
    <div className="p-3 bg-card/80 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🐕</span>
        <h4 className="text-sm font-semibold text-foreground">הזמנה לטיול!</h4>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{parkName} · {address}</p>
      {!isSender && (
        <button
          onClick={onAccept}
          className="w-full py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium active:scale-95 transition-transform"
        >
          בוא/י נטייל! 🐾
        </button>
      )}
    </div>
  </motion.div>
);
