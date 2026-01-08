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
  ChevronDown,
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
  AlertTriangle,
  PlaySquare, 
  Trophy, 
  Zap, 
  Clock,
  Search,
  PanelLeftClose,
  PanelLeft,
  Home,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  icon?: LucideIcon;
  breadcrumbs?: { label: string; href?: string }[];
}

interface NavGroup {
  label: string;
  items: { icon: LucideIcon; label: string; href: string; badge?: number }[];
}

const navGroups: NavGroup[] = [
  {
    label: "ראשי",
    items: [
      { icon: LayoutDashboard, label: "דשבורד", href: "/admin/dashboard" },
      { icon: Zap, label: "Growo", href: "/admin/growo" },
      { icon: BarChart3, label: "אנליטיקות", href: "/admin/analytics" },
      { icon: Wallet, label: "כספים", href: "/admin/financial" },
    ]
  },
  {
    label: "ניהול משימות",
    items: [
      { icon: ListTodo, label: "משימות", href: "/admin/tasks" },
      { icon: Zap, label: "אוטומציות", href: "/admin/automations" },
      { icon: Clock, label: "מעקב שעות", href: "/admin/time-tracking" },
      { icon: CalendarDays, label: "יומן", href: "/admin/calendar" },
    ]
  },
  {
    label: "לקוחות",
    items: [
      { icon: Bot, label: "שירות AI", href: "/admin/ai-service" },
      { icon: Contact, label: "CRM", href: "/admin/crm" },
      { icon: Trophy, label: "מועדון נאמנות", href: "/admin/loyalty" },
      { icon: Headphones, label: "תמיכה", href: "/admin/helpdesk" },
      { icon: UserPlus, label: "לידים", href: "/admin/leads" },
      { icon: CreditCard, label: "חובות לקוחות", href: "/admin/debts" },
      { icon: Users2, label: "פילוח לקוחות", href: "/admin/segments" },
    ]
  },
  {
    label: "מלאי ורכש",
    items: [
      { icon: Truck, label: "ספקים", href: "/admin/suppliers" },
      { icon: ShoppingCart, label: "הזמנות רכש", href: "/admin/purchase-orders" },
      { icon: Boxes, label: "מלאי", href: "/admin/inventory" },
      { icon: Receipt, label: "חשבוניות", href: "/admin/invoices" },
    ]
  },
  {
    label: "משתמשים וצוות",
    items: [
      { icon: Users, label: "משתמשים וצוות", href: "/admin/users" },
      { icon: Shield, label: "תפקידים והרשאות", href: "/admin/roles" },
    ]
  },
  {
    label: "תוכן",
    items: [
      { icon: PlaySquare, label: "סטוריז", href: "/admin/stories" },
      { icon: FileText, label: "בלוג", href: "/admin/blog" },
      { icon: Flag, label: "דיווחים", href: "/admin/reports" },
    ]
  },
  {
    label: "חיות ואימוץ",
    items: [
      { icon: Heart, label: "אימוץ", href: "/admin/adoption" },
      { icon: MapPin, label: "פארקים", href: "/admin/parks" },
    ]
  },
  {
    label: "עסקים",
    items: [
      { icon: Store, label: "עסקים", href: "/admin/business" },
      { icon: Building2, label: "סניפים", href: "/admin/branches" },
    ]
  },
  {
    label: "מוצרים ומכירות",
    items: [
      { icon: Package, label: "מוצרים", href: "/admin/products" },
      { icon: FolderTree, label: "קטגוריות", href: "/admin/categories" },
      { icon: DollarSign, label: "תמחור", href: "/admin/pricing" },
      { icon: Ticket, label: "קופונים", href: "/admin/coupons" },
      { icon: ShoppingCart, label: "הזמנות", href: "/admin/orders" },
      { icon: Truck, label: "משלוחים", href: "/admin/shipping" },
      { icon: RotateCcw, label: "החזרות", href: "/admin/returns" },
      { icon: Megaphone, label: "שיווק", href: "/admin/marketing" },
    ]
  },
  {
    label: "כלים",
    items: [
      { icon: Bot, label: "סקראפר מוצרים", href: "/admin/scraper" },
      { icon: Upload, label: "ייבוא נתונים", href: "/admin/data-import" },
      { icon: Plug, label: "אינטגרציות", href: "/admin/integrations" },
      { icon: Webhook, label: "Webhooks & API", href: "/admin/webhooks" },
    ]
  },
  {
    label: "מערכת",
    items: [
      { icon: Bell, label: "כללי התראות", href: "/admin/notification-rules" },
      { icon: History, label: "לוג פעילות", href: "/admin/audit" },
      { icon: HardDrive, label: "גיבוי וייצוא", href: "/admin/backup" },
      { icon: Settings, label: "הגדרות", href: "/admin/settings" },
    ]
  },
];

export const AdminLayout = ({ children, title, icon: Icon, breadcrumbs = [] }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pendingReports, setPendingReports] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<string[]>(["ראשי"]);

  useEffect(() => {
    fetchPendingCounts();
    // Open the group that contains the current route
    const currentGroup = navGroups.find(group => 
      group.items.some(item => location.pathname === item.href)
    );
    if (currentGroup && !openGroups.includes(currentGroup.label)) {
      setOpenGroups(prev => [...prev, currentGroup.label]);
    }
  }, [location.pathname]);

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

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => 
      prev.includes(label) 
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  const filteredGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.items.length > 0);

  const NavContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex flex-col h-full bg-gradient-to-b from-card to-card/95">
      {/* Logo */}
      <div className={cn(
        "flex items-center border-b border-border/50 h-16 shrink-0 bg-gradient-to-l from-primary/5 to-transparent",
        collapsed ? "justify-center px-2" : "px-4 gap-3"
      )}>
        <Link to="/admin/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <span className="font-bold text-lg bg-gradient-to-l from-primary to-foreground bg-clip-text text-transparent">PetID</span>
              <span className="text-xs text-muted-foreground block -mt-0.5">ניהול מערכת</span>
            </div>
          )}
        </Link>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="p-3 border-b border-border/50">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש מהיר..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 h-9 bg-muted/30 border-border/50 text-sm focus:bg-muted/50 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Nav Items */}
      <ScrollArea className="flex-1 py-3">
        <nav className={cn("space-y-1", collapsed ? "px-2" : "px-3")}>
          {filteredGroups.map((group) => {
            const isGroupOpen = openGroups.includes(group.label);
            
            if (collapsed) {
              // Collapsed mode - show only icons with tooltip
              return (
                <div key={group.label} className="space-y-1 py-1">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.href;
                    const ItemIcon = item.icon;
                    const showBadge = item.href === "/admin/reports" && pendingReports > 0;

                    return (
                      <TooltipProvider key={item.href} delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              to={item.href}
                              className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-xl transition-all relative mx-auto",
                                isActive
                                  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              <ItemIcon className="w-5 h-5" />
                              {showBadge && (
                                <span className="absolute -top-1 -left-1 min-w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center px-1 animate-pulse">
                                  {pendingReports}
                                </span>
                              )}
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="font-medium">
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              );
            }

            return (
              <Collapsible
                key={group.label}
                open={isGroupOpen}
                onOpenChange={() => toggleGroup(group.label)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors rounded-lg hover:bg-muted/50">
                  <span>{group.label}</span>
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    isGroupOpen && "rotate-180"
                  )} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 mt-1">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.href;
                    const ItemIcon = item.icon;
                    const showBadge = item.href === "/admin/reports" && pendingReports > 0;

                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative group",
                          isActive
                            ? "bg-gradient-to-l from-primary/15 to-primary/5 text-primary font-medium border border-primary/20"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <div className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          isActive ? "bg-primary/15" : "bg-transparent group-hover:bg-muted"
                        )}>
                          <ItemIcon className="w-4 h-4 shrink-0" />
                        </div>
                        <span className="truncate">{item.label}</span>
                        {showBadge && (
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 min-w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center px-1 animate-pulse">
                            {pendingReports}
                          </span>
                        )}
                        {isActive && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full" />
                        )}
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Section */}
      <div className={cn(
        "border-t border-border/50 shrink-0 bg-gradient-to-t from-muted/30 to-transparent",
        collapsed ? "p-2" : "p-3"
      )}>
        {collapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 mx-auto rounded-xl"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">התנתק</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3 p-2.5 rounded-xl bg-gradient-to-l from-muted/50 to-muted/30 border border-border/50">
              <Avatar className="w-10 h-10 border-2 border-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm font-bold">
                  {user?.email?.charAt(0).toUpperCase() || 'מ'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">מנהל מערכת</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 justify-start gap-2 h-9 bg-background/50"
                onClick={() => navigate("/")}
              >
                <Home className="w-4 h-4" />
                לאפליקציה
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20" dir="rtl">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-72 border-l border-border/50">
              <NavContent />
            </SheetContent>
          </Sheet>
          <h1 className="font-bold text-base flex items-center gap-2 truncate">
            {Icon && <Icon className="w-5 h-5 shrink-0 text-primary" />}
            <span className="truncate">{title}</span>
          </h1>
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className={cn(
          "hidden lg:flex flex-col fixed top-0 right-0 h-screen border-l border-border/50 bg-card/95 backdrop-blur-md z-50 transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}>
          <NavContent collapsed={isCollapsed} />
          
          {/* Collapse Toggle */}
          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-20 -translate-x-1/2 w-7 h-7 rounded-full bg-card border border-border/50 shadow-lg hover:bg-muted hover:scale-110 transition-all"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <PanelLeft className="w-3.5 h-3.5" />
            ) : (
              <PanelLeftClose className="w-3.5 h-3.5" />
            )}
          </Button>
        </aside>

        {/* Main Content */}
        <main className={cn(
          "flex-1 min-h-screen transition-all duration-300",
          "lg:mr-64",
          isCollapsed && "lg:mr-16",
          "pt-14 lg:pt-0"
        )}>
          {/* Desktop Header */}
          <header className="hidden lg:flex items-center justify-between px-6 h-16 border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-40">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
              )}
              <div>
                {breadcrumbs.length > 0 ? (
                  <nav className="flex items-center gap-1 text-sm">
                    <Link to="/admin/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                      ניהול
                    </Link>
                    {breadcrumbs.map((crumb, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <ChevronRight className="w-4 h-4 text-muted-foreground rotate-180" />
                        {crumb.href ? (
                          <Link to={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors">
                            {crumb.label}
                          </Link>
                        ) : (
                          <span className="text-foreground font-medium">{crumb.label}</span>
                        )}
                      </div>
                    ))}
                  </nav>
                ) : (
                  <h1 className="font-bold text-lg">{title}</h1>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
                <Home className="w-5 h-5" />
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
