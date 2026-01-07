import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { 
  LayoutDashboard,
  Users, 
  ShoppingCart, 
  Package, 
  Flag, 
  Heart, 
  Store, 
  FileText, 
  Settings, 
  Bell, 
  Shield, 
  History,
  ChevronRight,
  Menu,
  X,
  LogOut,
  MapPin,
  Ticket,
  Bot,
  Wallet,
  ListTodo,
  Truck,
  UserPlus,
  CreditCard,
  Boxes,
  Receipt,
  Megaphone,
  Users2,
  RotateCcw,
  BarChart3,
  Plug,
  HardDrive,
  Contact,
  FolderTree,
  CalendarDays,
  Headphones,
  Building2,
  DollarSign,
  Webhook,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  icon?: LucideIcon;
  breadcrumbs?: { label: string; href?: string }[];
}

import { Download } from "lucide-react";

import { Heart, PlaySquare, Trophy, Zap, Clock } from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "דשבורד", href: "/admin/dashboard" },
  { icon: BarChart3, label: "אנליטיקות", href: "/admin/analytics" },
  { icon: Wallet, label: "כספים", href: "/admin/financial" },
  { icon: ListTodo, label: "משימות", href: "/admin/tasks" },
  { icon: Zap, label: "אוטומציות", href: "/admin/automations" },
  { icon: Clock, label: "מעקב שעות", href: "/admin/time-tracking" },
  { icon: CalendarDays, label: "יומן", href: "/admin/calendar" },
  { icon: Contact, label: "CRM", href: "/admin/crm" },
  { icon: Trophy, label: "מועדון נאמנות", href: "/admin/loyalty" },
  { icon: Headphones, label: "תמיכה", href: "/admin/helpdesk" },
  { icon: Truck, label: "ספקים", href: "/admin/suppliers" },
  { icon: ShoppingCart, label: "הזמנות רכש", href: "/admin/purchase-orders" },
  { icon: Boxes, label: "מלאי", href: "/admin/inventory" },
  { icon: Receipt, label: "חשבוניות", href: "/admin/invoices" },
  { icon: UserPlus, label: "לידים", href: "/admin/leads" },
  { icon: CreditCard, label: "חובות לקוחות", href: "/admin/debts" },
  { icon: Users, label: "משתמשים", href: "/admin/users" },
  { icon: Heart, label: "מאגר חיות", href: "/admin/pets" },
  { icon: Users2, label: "פילוח לקוחות", href: "/admin/segments" },
  { icon: Users, label: "ניהול צוות", href: "/admin/staff" },
  { icon: Shield, label: "תפקידים והרשאות", href: "/admin/roles" },
  { icon: FileText, label: "תוכן ומודרציה", href: "/admin/content" },
  { icon: PlaySquare, label: "סטוריז", href: "/admin/stories" },
  { icon: FileText, label: "בלוג", href: "/admin/blog" },
  { icon: Flag, label: "דיווחים", href: "/admin/reports" },
  { icon: Heart, label: "אימוץ", href: "/admin/adoption" },
  { icon: Store, label: "עסקים", href: "/admin/business" },
  { icon: Building2, label: "סניפים", href: "/admin/branches" },
  { icon: Store, label: "ערוצי מכירה", href: "/admin/sales-channels" },
  { icon: Package, label: "מוצרים", href: "/admin/products" },
  { icon: FolderTree, label: "קטגוריות", href: "/admin/categories" },
  { icon: DollarSign, label: "תמחור", href: "/admin/pricing" },
  { icon: Ticket, label: "קופונים", href: "/admin/coupons" },
  { icon: ShoppingCart, label: "הזמנות", href: "/admin/orders" },
  { icon: Truck, label: "משלוחים", href: "/admin/shipping" },
  { icon: RotateCcw, label: "החזרות", href: "/admin/returns" },
  { icon: Megaphone, label: "שיווק", href: "/admin/marketing" },
  { icon: MapPin, label: "פארקים", href: "/admin/parks" },
  { icon: Bot, label: "סקראפר מוצרים", href: "/admin/scraper" },
  { icon: Plug, label: "אינטגרציות", href: "/admin/integrations" },
  { icon: Webhook, label: "Webhooks & API", href: "/admin/webhooks" },
  { icon: Bell, label: "כללי התראות", href: "/admin/notification-rules" },
  { icon: Bell, label: "התראות", href: "/admin/notifications" },
  { icon: AlertTriangle, label: "התראות מערכת", href: "/admin/alerts" },
  { icon: History, label: "לוג פעילות", href: "/admin/audit" },
  { icon: HardDrive, label: "גיבוי וייצוא", href: "/admin/backup" },
  { icon: Settings, label: "הגדרות", href: "/admin/settings" },
];

export const AdminLayout = ({ children, title, icon: Icon, breadcrumbs = [] }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingReports, setPendingReports] = useState(0);

  useEffect(() => {
    fetchPendingCounts();
  }, []);

  const fetchPendingCounts = async () => {
    const { count } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    setPendingReports(count || 0);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <Link to="/admin/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">ניהול</span>
        </Link>
      </div>

      {/* Nav Items */}
      <ScrollArea className="flex-1 py-2">
        <nav className="px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            const showBadge = item.href === "/admin/reports" && pendingReports > 0;

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
                {showBadge && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 min-w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center px-1">
                    {pendingReports}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">מנהל מערכת</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          התנתק
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-72">
              <NavContent />
            </SheetContent>
          </Sheet>
          <h1 className="font-bold text-base flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5" />}
            {title}
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 border-l border-border h-screen sticky top-0">
          <NavContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          {/* Desktop Header */}
          <header className="hidden lg:flex items-center justify-between px-6 h-16 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              {breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1 text-sm">
                  <Link to="/admin/dashboard" className="text-muted-foreground hover:text-foreground">
                    ניהול
                  </Link>
                  {breadcrumbs.map((crumb, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <ChevronRight className="w-4 h-4 text-muted-foreground rotate-180" />
                      {crumb.href ? (
                        <Link to={crumb.href} className="text-muted-foreground hover:text-foreground">
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="text-foreground font-medium">{crumb.label}</span>
                      )}
                    </div>
                  ))}
                </nav>
              )}
              {breadcrumbs.length === 0 && (
                <h1 className="font-bold text-lg flex items-center gap-2">
                  {Icon && <Icon className="w-5 h-5" />}
                  {title}
                </h1>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
