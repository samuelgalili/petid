import { Shield, Store, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";

interface RoleBadgeProps {
  role?: AppRole;
  size?: "sm" | "md";
  showForUser?: boolean; // If true, shows badge even for regular users
}

const getRoleConfig = (role: AppRole) => {
  switch (role) {
    case "admin":
      return {
        label: "מנהל",
        icon: Shield,
        className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
        link: "/admin/dashboard",
      };
    case "business":
      return {
        label: "חנות",
        icon: Store,
        className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
        link: "/business-profile",
      };
    case "org":
      return {
        label: "עמותה",
        icon: Heart,
        className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
        link: "/adoption",
      };
    default:
      return null;
  }
};

export const RoleBadge = ({ role, size = "sm", showForUser = false }: RoleBadgeProps) => {
  const { role: userRole, isLoading } = useUserRole();
  const navigate = useNavigate();
  
  const displayRole = role || userRole;
  
  // Don't show badge for regular users unless explicitly requested
  if (!showForUser && displayRole === "user") return null;
  if (isLoading && !role) return null;
  
  const config = getRoleConfig(displayRole);
  if (!config) return null;
  
  const Icon = config.icon;
  const sizeClasses = size === "sm" 
    ? "text-[10px] px-1.5 py-0.5" 
    : "text-xs px-2 py-1";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  const handleClick = () => {
    if (config.link) {
      navigate(config.link);
    }
  };
  
  return (
    <Badge 
      variant="outline" 
      className={`${config.className} ${sizeClasses} font-medium gap-1 cursor-pointer hover:opacity-80 transition-opacity`}
      onClick={handleClick}
    >
      <Icon className={iconSize} />
      {config.label}
    </Badge>
  );
};

export const RoleBadgeStatic = ({ role, size = "sm" }: { role: AppRole; size?: "sm" | "md" }) => {
  const config = getRoleConfig(role);
  if (!config) return null;
  
  const Icon = config.icon;
  const sizeClasses = size === "sm" 
    ? "text-[10px] px-1.5 py-0.5" 
    : "text-xs px-2 py-1";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
  
  return (
    <Badge 
      variant="outline" 
      className={`${config.className} ${sizeClasses} font-medium gap-1`}
    >
      <Icon className={iconSize} />
      {config.label}
    </Badge>
  );
};
