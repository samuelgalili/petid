import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
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
        {/* Health Icon - Right Side */}
        <motion.button
          onClick={() => navigate('/pet')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 w-20 h-20 rounded-full bg-surface-elevated flex items-center justify-center shadow-lg border-2 border-border-light transition-shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          style={{ minWidth: TAP_TARGET.comfortable, minHeight: TAP_TARGET.comfortable }}
          {...getAccessibleButtonProps("עבור לדשבורד הבריאות")}
        >
          <Heart className="w-10 h-10 text-primary" strokeWidth={1.5} />
        </motion.button>

        {/* Text Column - Left Side */}
        <div className="flex-1 text-right space-y-1 overflow-visible min-w-0">
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
          
          {/* Main Headline - Health Focus */}
          <h1 className="text-[0.95rem] leading-tight font-black text-foreground mb-1 whitespace-nowrap">
            בריאות, תזונה, שקט נפשי — הכל במקום אחד
          </h1>
          
          {/* Small Info Line */}
          <p className="text-[0.6875rem] leading-tight font-normal text-muted-foreground mb-2">
            עדכנו את הפרופיל הרפואי ושמרו על ציון בריאות מיטבי
          </p>
        </div>
      </div>

      {/* Link Button - Bottom Left Corner */}
      <div className="mt-3 text-left">
        <motion.button
          onClick={() => navigate('/pet')}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="text-[13px] leading-none font-medium text-primary hover:opacity-80 transition-opacity inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-2"
          style={{ minHeight: TAP_TARGET.minimum }}
          {...getAccessibleButtonProps("צפה בדשבורד הבריאות")}
        >
          מדדי בריאות
          <span className="text-sm">‹</span>
        </motion.button>
      </div>
    </motion.div>
  );
};
