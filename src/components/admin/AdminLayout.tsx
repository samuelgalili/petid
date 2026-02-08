import { ReactNode, useState, useEffect, useRef, useCallback } from "react";
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
  Upload,
  Crown
} from "lucide-react";
 import { Database as DatabaseIcon } from "lucide-react";
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
      { icon: Crown, label: "AI Control Room", href: "/admin/control-room" },
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
       { icon: DatabaseIcon, label: "Data Hub", href: "/admin/data-hub" },
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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem('admin_sidebar_collapsed') === 'true'; } catch { return false; }
  });
  const [pendingReports, setPendingReports] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('admin_sidebar_open_groups');
      return saved ? JSON.parse(saved) : ["ראשי"];
    } catch { return ["ראשי"]; }
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLAnchorElement>(null);

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('admin_sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Persist open groups
  useEffect(() => {
    localStorage.setItem('admin_sidebar_open_groups', JSON.stringify(openGroups));
  }, [openGroups]);

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

  // Scroll active item into view after render
  useEffect(() => {
    const timer = setTimeout(() => {
      activeItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
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
    <div className="flex flex-col h-full bg-card">
      {/* Logo */}
      <div className={cn(
        "flex items-center border-b border-border/30 h-16 shrink-0",
        collapsed ? "justify-center px-2" : "px-5 gap-3"
      )}>
        <Link to="/admin/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Shield className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <span className="font-bold text-base text-foreground tracking-tight">PetID</span>
              <span className="text-[10px] text-muted-foreground block leading-none">ניהול מערכת</span>
            </div>
          )}
        </Link>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
            <Input
              placeholder="חיפוש..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 h-8 bg-muted/40 border-0 text-xs placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Nav Items */}
      <ScrollArea className="flex-1 py-1">
        <nav className={cn("space-y-0.5", collapsed ? "px-2" : "px-3")}>
          {filteredGroups.map((group) => {
            const isGroupOpen = openGroups.includes(group.label);
            
            if (collapsed) {
              return (
                <div key={group.label} className="space-y-0.5 py-1">
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
                                "flex items-center justify-center w-9 h-9 rounded-lg transition-all relative mx-auto",
                                isActive
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              <ItemIcon className="w-4 h-4" />
                              {showBadge && (
                                <span className="absolute -top-0.5 -left-0.5 min-w-3.5 h-3.5 bg-destructive text-destructive-foreground text-[9px] rounded-full flex items-center justify-center px-0.5">
                                  {pendingReports}
                                </span>
                              )}
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs font-medium">
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
                <CollapsibleTrigger className="flex flex-row-reverse items-center justify-between w-full px-2 py-2 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest hover:text-muted-foreground transition-colors rounded-md">
                  <span>{group.label}</span>
                  <ChevronDown className={cn(
                    "w-3 h-3 transition-transform duration-200",
                    isGroupOpen && "rotate-180"
                  )} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-px mt-0.5 mb-1">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.href;
                    const ItemIcon = item.icon;
                    const showBadge = item.href === "/admin/reports" && pendingReports > 0;

                    return (
                      <Link
                        key={item.href}
                        ref={isActive ? activeItemRef : undefined}
                        to={item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] transition-all relative group",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        )}
                      >
                        <ItemIcon className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"
                        )} />
                        <span className="truncate">{item.label}</span>
                        {showBadge && (
                          <span className="mr-auto min-w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center px-1">
                            {pendingReports}
                          </span>
                        )}
                        {isActive && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-full" />
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
        "border-t border-border/30 shrink-0",
        collapsed ? "p-2" : "p-3"
      )}>
        {collapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 mx-auto rounded-lg"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">התנתק</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <>
            <div className="flex items-center gap-2.5 mb-2.5 p-2 rounded-lg bg-muted/40">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {user?.email?.charAt(0).toUpperCase() || 'מ'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">מנהל מערכת</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-start gap-2 h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/")}
              >
                <Home className="w-3.5 h-3.5" />
                לאפליקציה
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/30">
        <div className="flex items-center justify-between px-4 h-14">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-64 border-l border-border/30">
              <NavContent />
            </SheetContent>
          </Sheet>
          <h1 className="font-bold text-sm flex items-center gap-2 truncate">
            {Icon && <Icon className="w-4 h-4 shrink-0 text-primary" />}
            <span className="truncate">{title}</span>
          </h1>
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
            <Home className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className={cn(
          "hidden lg:flex flex-col fixed top-0 right-0 h-screen border-l border-border/30 bg-card z-50 transition-all duration-300",
          isCollapsed ? "w-14" : "w-60"
        )}>
          <NavContent collapsed={isCollapsed} />
          
          {/* Collapse Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-20 -translate-x-1/2 w-6 h-6 rounded-full bg-card border border-border/30 shadow-sm hover:bg-muted transition-all"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <PanelLeft className="w-3 h-3" />
            ) : (
              <PanelLeftClose className="w-3 h-3" />
            )}
          </Button>
        </aside>

        {/* Main Content */}
        <main className={cn(
          "flex-1 min-h-screen transition-all duration-300",
          "lg:mr-60",
          isCollapsed && "lg:mr-14",
          "pt-14 lg:pt-0"
        )}>
          {/* Desktop Header */}
          <header className="hidden lg:flex items-center justify-between px-6 h-14 border-b border-border/30 bg-card/80 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex items-center gap-2.5">
              {Icon && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
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
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground rotate-180" />
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
                  <h1 className="font-semibold text-base">{title}</h1>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => navigate("/home")}>
                <Home className="w-4 h-4" />
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
