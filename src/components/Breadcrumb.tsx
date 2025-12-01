/**
 * Breadcrumb Navigation - Helps users understand their location
 * Based on Nielsen Norman Group breadcrumb patterns
 */

import { ChevronLeft, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface BreadcrumbItem {
  label: string;
  path: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

// Route name mapping for Hebrew labels
const ROUTE_LABELS: Record<string, string> = {
  "": "בית",
  "profile": "פרופיל",
  "settings": "הגדרות",
  "pets": "חיות המחמד שלי",
  "add-pet": "הוספת חיית מחמד",
  "shop": "חנות",
  "cart": "עגלה",
  "checkout": "תשלום",
  "orders": "הזמנות",
  "order-history": "היסטוריית הזמנות",
  "feed": "פעילות חברתית",
  "chat": "צ'אט AI",
  "rewards": "תגמולים",
  "parks": "גינות כלבים",
  "adoption": "אימוץ",
  "insurance": "ביטוח",
  "training": "אימונים",
  "grooming": "טיפוח",
  "notifications": "התראות",
  "documents": "מסמכים",
  "photos": "תמונות",
};

export const Breadcrumb = ({ items, className }: BreadcrumbProps) => {
  const location = useLocation();

  // Auto-generate breadcrumb items from current path if not provided
  const breadcrumbItems: BreadcrumbItem[] = items || (() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    
    return [
      { label: ROUTE_LABELS[""] || "בית", path: "/" },
      ...pathSegments.map((segment, index) => {
        const path = "/" + pathSegments.slice(0, index + 1).join("/");
        const label = ROUTE_LABELS[segment] || segment;
        return { label, path };
      })
    ];
  })();

  // Don't show breadcrumb if only one item (home)
  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <motion.nav
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={cn(
        "flex items-center gap-2 px-4 py-3 bg-background/80 backdrop-blur-sm",
        className
      )}
      role="navigation"
      aria-label="breadcrumb"
    >
      <ol className="flex items-center gap-2 flex-wrap">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const isHome = index === 0;
          
          return (
            <motion.li
              key={item.path}
              variants={staggerItem}
              className="flex items-center gap-2"
            >
              {!isLast ? (
                <>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-1",
                      isHome ? "text-primary" : "text-muted-foreground"
                    )}
                    aria-label={item.label}
                  >
                    {isHome && <Home className="w-4 h-4" />}
                    <span>{item.label}</span>
                  </Link>
                  <ChevronLeft className="w-4 h-4 text-border" aria-hidden="true" />
                </>
              ) : (
                <span 
                  className="text-sm font-semibold text-foreground px-1"
                  aria-current="page"
                >
                  {item.label}
                </span>
              )}
            </motion.li>
          );
        })}
      </ol>
    </motion.nav>
  );
};
