import { Home, Calendar, MapPin, Compass } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { icon: Compass, label: "חוויות", path: "/experiences" },
    { icon: MapPin, label: "גינות", path: "/parks" },
    { icon: Calendar, label: "יומן", path: "/tracker" },
    { icon: Home, label: "בית", path: "/home" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/98 backdrop-blur-sm border-t border-border z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 relative group",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-foreground rounded-full" />
              )}
              <Icon className={cn(
                "w-[22px] h-[22px] mb-1 transition-transform",
                isActive ? "" : "group-hover:scale-105"
              )} />
              <span className={cn(
                "text-[11px] font-medium transition-all",
                isActive ? "font-semibold" : ""
              )}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
