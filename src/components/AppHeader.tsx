import { ArrowRight, Menu, Home, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { HamburgerMenu } from "@/components/HamburgerMenu";

interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  showMenuButton?: boolean;
  backTo?: "home" | "previous"; // New prop
  extraAction?: {
    icon: LucideIcon;
    onClick: () => void;
  };
}

export const AppHeader = ({
  title,
  showBackButton = false,
  showMenuButton = false,
  backTo = "home", // Default to home
  extraAction,
}: AppHeaderProps) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleBack = () => {
    if (backTo === "previous") {
      // Check if there's history to go back to
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/");
      }
    } else {
      navigate("/");
    }
  };

  return (
    <>
      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <div className="fixed top-0 left-0 right-0 h-11 bg-background border-b border-border px-4 z-40 flex items-center justify-between" dir="rtl">
        {/* Right Side: Back Button or Menu */}
        <div className="flex items-center gap-2 w-10">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="rounded-full h-9 w-9"
              aria-label={backTo === "home" ? "חזור לדף הבית" : "חזור"}
            >
              {backTo === "home" ? (
                <Home className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              ) : (
                <ArrowRight className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              )}
            </Button>
          )}
          
          {showMenuButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(true)}
              className="rounded-full h-9 w-9"
              aria-label="תפריט"
            >
              <Menu className="w-5 h-5 text-foreground" strokeWidth={1.5} />
            </Button>
          )}
        </div>

        {/* Center: Title */}
        <h1 className="text-base font-semibold text-foreground absolute left-1/2 -translate-x-1/2">
          {title}
        </h1>

        {/* Left Side: Extra Action */}
        <div className="flex items-center gap-2 w-10 justify-end">
          {extraAction && (
            <Button
              variant="ghost"
              size="icon"
              onClick={extraAction.onClick}
              className="rounded-full h-9 w-9"
              aria-label="פעולה נוספת"
            >
              <extraAction.icon className="w-5 h-5 text-foreground" strokeWidth={1.5} />
            </Button>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="h-11" />
    </>
  );
};
