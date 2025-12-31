import { motion } from "framer-motion";
import { MapPin, ShoppingBag, Heart, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type FeedTab = "foryou" | "following" | "nearby" | "marketplace" | "adopt";

interface FeedTabsProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
  isAuthenticated: boolean;
  onAuthRequired: (message: string) => boolean;
}

const tabs: { id: FeedTab; label: string; labelHe: string; icon: React.ElementType; requiresAuth?: boolean }[] = [
  { id: "foryou", label: "For You", labelHe: "בשבילך", icon: Sparkles },
  { id: "following", label: "Following", labelHe: "עוקבים", icon: Users, requiresAuth: true },
  { id: "nearby", label: "Nearby", labelHe: "קרוב אליי", icon: MapPin },
  { id: "marketplace", label: "Shop", labelHe: "חנות", icon: ShoppingBag },
  { id: "adopt", label: "Adopt", labelHe: "אימוץ", icon: Heart },
];

export const FeedTabs = ({ activeTab, onTabChange, isAuthenticated, onAuthRequired }: FeedTabsProps) => {
  const handleTabClick = (tab: typeof tabs[0]) => {
    if (tab.requiresAuth && !isAuthenticated) {
      onAuthRequired("כדי לצפות בתוכן של העוקבים שלך, יש להתחבר");
      return;
    }
    onTabChange(tab.id);
  };

  return (
    <div className="sticky top-14 z-40 bg-card/95 backdrop-blur-md border-b border-border/30">
      <div className="max-w-lg mx-auto">
        <div className="flex overflow-x-auto scrollbar-hide px-2 py-1.5 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <motion.button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors min-w-fit",
                  isActive 
                    ? "text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                whileTap={{ scale: 0.95 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="w-4 h-4" />
                  <span>{tab.labelHe}</span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
