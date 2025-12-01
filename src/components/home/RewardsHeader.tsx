import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import giftIcon from "@/assets/gift-icon.gif";

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
        {/* Gift Icon - Right Side - Clean & Aesthetic */}
          <button
            onClick={() => navigate('/rewards')}
            className="flex-shrink-0 w-20 h-20 rounded-full bg-surface-elevated flex items-center justify-center shadow-lg border-2 border-border-light hover:scale-105 hover:shadow-xl active:scale-95 transition-all duration-200 ease-out"
            aria-label="עבור למתנות ותגמולים"
          >
          <img src={giftIcon} alt="מתנה" className="w-14 h-14 object-contain drop-shadow-sm" />
        </button>

        {/* Text Column - Left Side */}
        <div className="flex-1 text-right space-y-1 overflow-visible min-w-0">
          {/* Greeting Line - Top - Slightly Larger */}
          <div className="text-[15px] leading-tight font-normal text-[#1A1A1A] mb-1 whitespace-nowrap overflow-visible">
            {greeting},{" "}
            <button
              onClick={onMenuOpen}
              className="hover:opacity-70 transition-opacity font-normal underline decoration-1 underline-offset-2"
            >
              {userName}
            </button>
          </div>
          
          {/* Main Headline - Marketing Message */}
          <h1 className="text-[0.95rem] leading-tight font-black text-[#1A1A1A] mb-1 whitespace-nowrap">
            קונים, צוברים, נהנים — בכל רכישה מחדש!
          </h1>
          
          {/* Small Info Line - 11px */}
          <p className="text-[0.6875rem] leading-tight font-normal text-[#6E6E6E] mb-2">
            צוברים 5% מכל קנייה ב Petid ונהנים
          </p>
        </div>
      </div>

      {/* Link Button - Bottom Left Corner */}
      <div className="mt-3 text-left">
        <button
          onClick={() => navigate('/rewards')}
          className="text-[13px] leading-none font-medium text-[#2271CF] hover:opacity-80 transition-opacity inline-flex items-center gap-1 min-h-[32px]"
        >
          צבירה ומימוש
          <span className="text-sm">‹</span>
        </button>
      </div>
    </motion.div>
  );
};
