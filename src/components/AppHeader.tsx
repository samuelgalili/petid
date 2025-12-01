import { ArrowRight, Menu, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { HamburgerMenu } from "@/components/HamburgerMenu";

interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  showMenuButton?: boolean;
  extraAction?: {
    icon: LucideIcon;
    onClick: () => void;
  };
}

export const AppHeader = ({
  title,
  showBackButton = false,
  showMenuButton = false,
  extraAction,
}: AppHeaderProps) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <div className="fixed top-0 left-0 right-0 h-16 bg-surface-elevated border-b border-border px-4 z-40 flex items-center justify-between" dir="rtl">
        {/* Right Side: Back Button or Menu */}
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full hover:bg-muted transition-all"
              aria-label="חזור"
            >
              <ArrowRight className="w-6 h-6 text-secondary" strokeWidth={1.5} />
            </Button>
          )}
          
          {showMenuButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(true)}
              className="rounded-full hover:bg-muted transition-all"
              aria-label="תפריט"
            >
              <Menu className="w-6 h-6 text-secondary" strokeWidth={1.5} />
            </Button>
          )}
        </div>

        {/* Center: Title */}
        <h1 className="text-xl font-bold text-secondary font-jakarta">
          {title}
        </h1>

        {/* Left Side: Extra Action */}
        <div className="flex items-center gap-3">
          {extraAction && (
            <Button
              variant="ghost"
              size="icon"
              onClick={extraAction.onClick}
              className="rounded-full hover:bg-muted transition-all"
              aria-label="פעולה נוספת"
            >
              <extraAction.icon className="w-6 h-6 text-secondary" strokeWidth={1.5} />
            </Button>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="h-16" />
    </>
  );
};
