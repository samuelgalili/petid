import { ReactNode, useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { 
  LayoutDashboard, Users, ShoppingCart, Package, Flag, Heart, Store, 
  FileText, Settings, Bell, Shield, History, ChevronRight, ChevronDown,
  Menu, LogOut, MapPin, Ticket, Bot, Wallet, ListTodo, Truck, UserPlus,
  CreditCard, Boxes, Receipt, Megaphone, Users2, RotateCcw, BarChart3,
  Plug, HardDrive, Contact, FolderTree, CalendarDays, Headphones,
  Building2, DollarSign, Webhook, PlaySquare, Trophy, Zap, Clock,
  Search, PanelLeftClose, PanelLeft, Home, Upload, Crown, Brain,
  Plus, Eye, PackageSearch, ArrowUpRight
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
  icon: LucideIcon;
  items: { icon: LucideIcon; label: string; href: string; badge?: number }[];
}

const navGroups: NavGroup[] = [
  {
    label: "ראשי",
    icon: LayoutDashboard,
    items: [
      { icon: Brain, label: "דשבורד", href: "/admin/growo" },
      { icon: BarChart3, label: "אנליטיקות", href: "/admin/analytics" },
      { icon: Wallet, label: "כספים", href: "/admin/financial" },
      { icon: ListTodo, label: "משימות", href: "/admin/tasks" },
      { icon: CalendarDays, label: "יומן", href: "/admin/calendar" },
      { icon: Crown, label: "AI Control Room", href: "/admin/control-room" },
    ]
  },
  {
    label: "חנות ומכירות",
    icon: ShoppingCart,
    items: [
      { icon: Package, label: "מוצרים", href: "/admin/products" },
      { icon: FolderTree, label: "קטגוריות", href: "/admin/categories" },
      { icon: DollarSign, label: "תמחור", href: "/admin/pricing" },
      { icon: Ticket, label: "קופונים", href: "/admin/coupons" },
      { icon: ShoppingCart, label: "הזמנות", href: "/admin/orders" },
      { icon: Truck, label: "משלוחים", href: "/admin/shipping" },
      { icon: RotateCcw, label: "החזרות", href: "/admin/returns" },
      { icon: Boxes, label: "מלאי", href: "/admin/inventory" },
      { icon: Truck, label: "ספקים", href: "/admin/suppliers" },
      { icon: ShoppingCart, label: "הזמנות רכש", href: "/admin/purchase-orders" },
      { icon: Receipt, label: "חשבוניות", href: "/admin/invoices" },
      { icon: Megaphone, label: "שיווק", href: "/admin/marketing" },
    ]
  },
  {
    label: "לקוחות וקהילה",
    icon: Users,
    items: [
      { icon: Contact, label: "CRM", href: "/admin/crm" },
      { icon: UserPlus, label: "לידים", href: "/admin/leads" },
      { icon: Users2, label: "פילוח", href: "/admin/segments" },
      
      { icon: CreditCard, label: "חובות", href: "/admin/debts" },
      { icon: Headphones, label: "תמיכה", href: "/admin/helpdesk" },
      { icon: Bot, label: "שירות AI", href: "/admin/ai-service" },
      { icon: Heart, label: "אימוץ", href: "/admin/adoption" },
      { icon: MapPin, label: "פארקים", href: "/admin/parks" },
      { icon: Store, label: "עסקים", href: "/admin/business" },
      { icon: Building2, label: "סניפים", href: "/admin/branches" },
    ]
  },
  {
    label: "תוכן ונתונים",
    icon: FileText,
    items: [
      { icon: DatabaseIcon, label: "Data Hub", href: "/admin/data-hub" },
      { icon: PlaySquare, label: "סטוריז", href: "/admin/stories" },
      { icon: FileText, label: "בלוג", href: "/admin/blog" },
      { icon: Flag, label: "דיווחים", href: "/admin/reports" },
      { icon: Bot, label: "סקראפר", href: "/admin/scraper" },
      { icon: Upload, label: "ייבוא נתונים", href: "/admin/data-import" },
    ]
  },
  {
    label: "הגדרות מערכת",
    icon: Settings,
    items: [
      { icon: Users, label: "משתמשים וצוות", href: "/admin/users" },
      { icon: Shield, label: "תפקידים", href: "/admin/roles" },
      { icon: Zap, label: "אוטומציות", href: "/admin/automations" },
      { icon: Clock, label: "מעקב שעות", href: "/admin/time-tracking" },
      { icon: Bell, label: "התראות", href: "/admin/notification-rules" },
      { icon: Plug, label: "אינטגרציות", href: "/admin/integrations" },
      { icon: Webhook, label: "Webhooks", href: "/admin/webhooks" },
      { icon: History, label: "לוג פעילות", href: "/admin/audit" },
      { icon: HardDrive, label: "גיבוי", href: "/admin/backup" },
      { icon: Settings, label: "הגדרות", href: "/admin/settings" },
    ]
  },
];

// Quick actions for the dashboard header
const quickActions = [
  { icon: Plus, label: "מוצר חדש", href: "/admin/quick-import", color: "bg-primary text-primary-foreground" },
  { icon: Eye, label: "הזמנות", href: "/admin/orders", color: "bg-muted text-foreground" },
  { icon: PackageSearch, label: "ייבוא מהיר", href: "/admin/quick-import", color: "bg-muted text-foreground" },
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
      const saved = localStorage.getItem('admin_sidebar_open_groups_v2');
      return saved ? JSON.parse(saved) : ["ראשי"];
    } catch { return ["ראשי"]; }
  });
  const activeItemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    localStorage.setItem('admin_sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    localStorage.setItem('admin_sidebar_open_groups_v2', JSON.stringify(openGroups));
  }, [openGroups]);

  useEffect(() => {
    fetchPendingCounts();
    const currentGroup = navGroups.find(group => 
      group.items.some(item => location.pathname === item.href)
    );
    if (currentGroup && !openGroups.includes(currentGroup.label)) {
      setOpenGroups(prev => [...prev, currentGroup.label]);
    }
  }, [location.pathname]);

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
        "flex items-center border-b border-border/20 h-14 shrink-0",
        collapsed ? "justify-center px-2" : "px-4 gap-3"
      )}>
        <Link to="/admin/growo" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <span className="font-bold text-sm text-foreground">PetID</span>
              <span className="text-[9px] text-muted-foreground block leading-none mt-0.5">ניהול מערכת</span>
            </div>
          )}
        </Link>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 py-2.5">
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <Input
              placeholder="חיפוש מהיר..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-8 h-8 bg-muted/30 border-border/20 text-xs placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-primary/20 rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Nav */}
      <ScrollArea className="flex-1 py-1">
        <nav className={cn("space-y-1", collapsed ? "px-1.5" : "px-2")}>
          {filteredGroups.map((group) => {
            const isGroupOpen = openGroups.includes(group.label);
            const GroupIcon = group.icon;
            const hasActiveItem = group.items.some(item => location.pathname === item.href);
            
            if (collapsed) {
              return (
                <div key={group.label} className="space-y-0.5 py-1 border-b border-border/10 last:border-0">
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
                                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                              )}
                            >
                              <ItemIcon className="w-4 h-4" strokeWidth={1.5} />
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
                <CollapsibleTrigger className={cn(
                  "flex flex-row-reverse items-center justify-between w-full px-2 py-2 text-[11px] font-semibold uppercase tracking-wider rounded-md transition-colors",
                  hasActiveItem 
                    ? "text-primary" 
                    : "text-muted-foreground/60 hover:text-muted-foreground"
                )}>
                  <div className="flex items-center gap-1.5">
                    <GroupIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>{group.label}</span>
                  </div>
                  <ChevronDown className={cn(
                    "w-3 h-3 transition-transform duration-200",
                    isGroupOpen && "rotate-180"
                  )} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-px mt-0.5 mb-2">
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
                          "flex items-center gap-2 px-2.5 py-[6px] rounded-lg text-[12.5px] transition-all relative group",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <ItemIcon className={cn(
                          "w-3.5 h-3.5 shrink-0",
                          isActive ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground"
                        )} strokeWidth={1.5} />
                        <span className="truncate">{item.label}</span>
                        {showBadge && (
                          <span className="mr-auto min-w-4 h-4 bg-destructive text-destructive-foreground text-[9px] rounded-full flex items-center justify-center px-1">
                            {pendingReports}
                          </span>
                        )}
                        {isActive && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[2.5px] h-4 bg-primary rounded-full" />
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

      {/* User */}
      <div className={cn(
        "border-t border-border/20 shrink-0",
        collapsed ? "p-1.5" : "p-2.5"
      )}>
        {collapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-9 h-9 mx-auto rounded-lg" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">התנתק</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                  {user?.email?.charAt(0).toUpperCase() || 'מ'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate text-foreground">מנהל מערכת</p>
                <p className="text-[9px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-start gap-1.5 h-7 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/")}
              >
                <Home className="w-3 h-3" />
                לאפליקציה
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/20" dir="rtl">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/20">
        <div className="flex items-center justify-between px-4 h-13">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 w-8 h-8">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-60 border-l border-border/20">
              <NavContent />
            </SheetContent>
          </Sheet>
          <h1 className="font-semibold text-sm flex items-center gap-1.5 truncate">
            {Icon && <Icon className="w-4 h-4 shrink-0 text-primary" strokeWidth={1.5} />}
            <span className="truncate">{title}</span>
          </h1>
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0 w-8 h-8">
            <Home className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className={cn(
          "hidden lg:flex flex-col fixed top-0 right-0 h-screen border-l border-border/20 bg-card z-50 transition-all duration-300 shadow-sm",
          isCollapsed ? "w-14" : "w-56"
        )}>
          <NavContent collapsed={isCollapsed} />
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-18 -translate-x-1/2 w-5 h-5 rounded-full bg-card border border-border/20 shadow-sm hover:bg-muted transition-all"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <PanelLeft className="w-2.5 h-2.5" />
            ) : (
              <PanelLeftClose className="w-2.5 h-2.5" />
            )}
          </Button>
        </aside>

        {/* Main */}
        <main className={cn(
          "flex-1 min-h-screen transition-all duration-300",
          "lg:mr-56",
          isCollapsed && "lg:mr-14",
          "pt-13 lg:pt-0"
        )}>
          {/* Desktop Header */}
          <header className="hidden lg:flex items-center justify-between px-5 h-12 border-b border-border/20 bg-card/60 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex items-center gap-2">
              {Icon && (
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                </div>
              )}
              <div>
                {breadcrumbs.length > 0 ? (
                  <nav className="flex items-center gap-1 text-xs">
                    <Link to="/admin/growo" className="text-muted-foreground hover:text-foreground transition-colors">
                      ניהול
                    </Link>
                    {breadcrumbs.map((crumb, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <ChevronRight className="w-3 h-3 text-muted-foreground rotate-180" />
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
                  <h1 className="font-semibold text-sm">{title}</h1>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Quick Actions */}
              {quickActions.map((action) => (
                <Button
                  key={action.href + action.label}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => navigate(action.href)}
                >
                  <action.icon className="w-3 h-3" />
                  {action.label}
                </Button>
              ))}
              <div className="w-px h-5 bg-border/30 mx-1" />
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => navigate("/")}>
                <Home className="w-3.5 h-3.5" />
              </Button>
            </div>
          </header>

          <div className="p-4 lg:p-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
