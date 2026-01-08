import { motion } from "framer-motion";
import { MapPin, ShoppingBag, Heart, Users, Sparkles, Trees } from "lucide-react";
import { cn } from "@/lib/utils";

export type FeedTab = "foryou" | "following" | "nearby" | "marketplace" | "adopt" | "parks";

interface FeedTabsProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
  isAuthenticated: boolean;
  onAuthRequired: (message: string) => boolean;
}

const tabs: { id: FeedTab; label: string; icon: React.ElementType; requiresAuth?: boolean }[] = [
  { id: "foryou", label: "בשבילך", icon: Sparkles },
  { id: "following", label: "עוקבים", icon: Users, requiresAuth: true },
  { id: "nearby", label: "קרוב אליי", icon: MapPin },
  { id: "marketplace", label: "חנות", icon: ShoppingBag },
  { id: "adopt", label: "אימוץ", icon: Heart },
  { id: "parks", label: "גינות", icon: Trees },
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
    <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-xl border-b border-border/20">
      <div className="max-w-lg mx-auto">
        <div className="flex overflow-x-auto scrollbar-hide px-3 py-2 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <motion.button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={cn(
                  "relative flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap transition-all min-w-fit",
                  isActive 
                    ? "text-primary-foreground shadow-md" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-95"
                )}
                whileHover={{ scale: isActive ? 1 : 1.02 }}
                whileTap={{ scale: 0.95 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-primary to-primary-light rounded-2xl shadow-sm"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className={cn("w-4 h-4", isActive && "drop-shadow-sm")} />
                  <span className={cn(isActive && "font-semibold")}>{tab.label}</span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
