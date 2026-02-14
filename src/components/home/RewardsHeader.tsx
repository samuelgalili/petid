import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import giftIcon from "@/assets/gift-icon.gif";
import { buttonHover, buttonTap, wiggle } from "@/lib/animations";
import { MICROCOPY } from "@/lib/microcopy";
import { getAccessibleButtonProps, TAP_TARGET } from "@/lib/accessibility";

interface RewardsHeaderProps {
  userName: string;
  greeting: string;
  onMenuOpen: () => void;
}

export const RewardsHeader = ({ userName, greeting, onMenuOpen }: RewardsHeaderProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="px-4 py-[18px] mb-3 mx-4 max-w-full overflow-visible"
      dir="rtl"
    >
      {/* Main Content: Icon (Right) + Text Column (Left) */}
      <div className="flex flex-row-reverse items-center gap-[14px]">
        {/* Gift Icon - Right Side - Playful & Accessible */}
        <motion.button
          onClick={() => navigate('/shop')}
          whileHover={{ scale: 1.05, rotate: [0, -2, 2, -2, 0] }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 w-20 h-20 rounded-full bg-surface-elevated flex items-center justify-center shadow-lg border-2 border-border-light transition-shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          style={{ minWidth: TAP_TARGET.comfortable, minHeight: TAP_TARGET.comfortable }}
          {...getAccessibleButtonProps("עבור למתנות ותגמולים")}
        >
          <img src={giftIcon} alt="מתנה" className="w-14 h-14 object-contain drop-shadow-sm" />
        </motion.button>

        {/* Text Column - Left Side */}
        <div className="flex-1 text-right space-y-1 overflow-visible min-w-0">
          {/* Greeting Line - Top - Slightly Larger */}
          <div className="text-[15px] leading-tight font-normal text-foreground mb-1 whitespace-nowrap overflow-visible">
            {greeting},{" "}
            <button
              onClick={onMenuOpen}
              className="hover:opacity-70 transition-opacity font-normal underline decoration-1 underline-offset-2"
              aria-label="פתח תפריט פרופיל"
            >
              {userName}
            </button>
          </div>
          
          {/* Main Headline - Marketing Message */}
          <h1 className="text-[0.95rem] leading-tight font-black text-foreground mb-1 whitespace-nowrap">
            קונים, צוברים, נהנים — בכל רכישה מחדש!
          </h1>
          
          {/* Small Info Line - 11px */}
          <p className="text-[0.6875rem] leading-tight font-normal text-muted-foreground mb-2">
            צוברים 5% מכל קנייה ב Petid ונהנים
          </p>
        </div>
      </div>

      {/* Link Button - Bottom Left Corner - Enhanced Accessibility */}
      <div className="mt-3 text-left">
        <motion.button
          onClick={() => navigate('/shop')}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="text-[13px] leading-none font-medium text-primary hover:opacity-80 transition-opacity inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-2"
          style={{ minHeight: TAP_TARGET.minimum }}
          {...getAccessibleButtonProps("צפה בתגמולים והטבות")}
        >
          צבירה ומימוש
          <span className="text-sm">‹</span>
        </motion.button>
      </div>
    </motion.div>
  );
};
