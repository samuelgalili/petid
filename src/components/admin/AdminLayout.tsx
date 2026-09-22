import { ReactNode, useState, useEffect, useRef } from "react";
import { AdminCommandBar } from "@/components/admin/AdminCommandBar";
import { AdminNotificationsBell } from "./AdminNotificationsBell";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { LucideIcon,
} from "lucide-react";
import { 
  LayoutDashboard, Users, ShoppingCart, Package, Flag, Heart, Store, ShieldAlert, 
  FileText, Settings, Bell, Shield, History, ChevronRight, ChevronDown,
  Menu, LogOut, MapPin, Ticket, Bot, Wallet, ListTodo, Truck, UserPlus,
  CreditCard, Boxes, Receipt, Megaphone, Users2, RotateCcw, BarChart3,
  Plug, HardDrive, Contact, FolderTree, CalendarDays, Headphones,
  Building2, DollarSign, Webhook, PlaySquare, Trophy, Zap, Clock,
  Search, PanelLeftClose, PanelLeft, Home, Upload, Crown, Brain,
  Plus, Eye, PackageSearch, ArrowUpRight, Sparkles, Tv, FileCheck
} from "lucide-react";
import { Database as DatabaseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAwsAdminAuth } from "@/hooks/useAwsAdminAuth";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MipoLogo } from "@/components/MipoLogo";
import { useIsMobile } from "@/hooks/use-mobile";
import { ADMIN_PERMISSIONS, adminHasPermission, type AdminPermission } from "@/lib/adminPermissions";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  icon?: LucideIcon;
  breadcrumbs?: { label: string; href?: string }[];
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: { icon: LucideIcon; label: string; href: string; badge?: number; permission: AdminPermission }[];
}

const navGroups: NavGroup[] = [
  {
    label: "ראשי",
    icon: LayoutDashboard,
    items: [
      { icon: BarChart3, label: "אנליטיקות", href: "/admin/analytics", permission: ADMIN_PERMISSIONS.FULL_ACCESS },
      { icon: Bell, label: "התראות", href: "/admin/notifications", permission: ADMIN_PERMISSIONS.FULL_ACCESS },
      { icon: DollarSign, label: "כלכלת AI", href: "/admin/ai-economics", permission: ADMIN_PERMISSIONS.FULL_ACCESS },
    ]
  },
  {
    label: "חנות ומכירות",
    icon: ShoppingCart,
    items: [
      { icon: Package, label: "מוצרים", href: "/admin/products", permission: ADMIN_PERMISSIONS.PRODUCTS_READ },
      { icon: Store, label: "פרסום לחנות", href: "/admin/publishing", permission: ADMIN_PERMISSIONS.INTAKE_READ },
      { icon: PackageSearch, label: "ייבוא מהיר", href: "/admin/quick-import", permission: ADMIN_PERMISSIONS.PRODUCT_TOOLS_USE },
      { icon: Sparkles, label: "עורך חכם", href: "/admin/smart-editor", permission: ADMIN_PERMISSIONS.PRODUCT_TOOLS_USE },
      { icon: ShoppingCart, label: "הזמנות", href: "/admin/orders", permission: ADMIN_PERMISSIONS.FULL_ACCESS },
      { icon: Users, label: "לקוחות", href: "/admin/customers", permission: ADMIN_PERMISSIONS.FULL_ACCESS },
      { icon: Ticket, label: "קופונים", href: "/admin/coupons", permission: ADMIN_PERMISSIONS.FULL_ACCESS },
    ]
  },
  {
    label: "הגדרות מערכת",
    icon: Settings,
    items: [
      { icon: Settings, label: "הגדרות", href: "/admin/settings", permission: ADMIN_PERMISSIONS.FULL_ACCESS },
      { icon: FolderTree, label: "קטגוריות", href: "/admin/categories", permission: ADMIN_PERMISSIONS.FULL_ACCESS },
      { icon: Plug, label: "חיבורים", href: "/admin/connectors", permission: ADMIN_PERMISSIONS.FULL_ACCESS },
      { icon: History, label: "יומן ביקורת", href: "/admin/audit-log", permission: ADMIN_PERMISSIONS.AUDIT_READ },
    ]
  },
];

/**
 * The sidebar, flattened, for the command bar.
 *
 * Derived from navGroups rather than kept as a second list, so a page added to
 * the sidebar is reachable by ⌘K on the same commit. A hand-maintained copy is
 * a copy that falls behind, and the way you find out is that somebody says
 * "the command bar does not know about the new screen".
 */
export const commandDestinations = navGroups.flatMap((group) =>
  group.items.map((item) => ({
    label: item.label,
    href: item.href,
    permission: item.permission,
    group: group.label,
    icon: item.icon,
  })));

const defaultOpenGroups = navGroups.map((group) => group.label);
const openGroupsStorageKey = "admin_sidebar_open_groups_v3";

/**
 * The bottom bar on a phone.
 *
 * WHY A BAR AND NOT JUST THE DRAWER. Every move on a phone used to cost three
 * taps - open the drawer, find the group, maybe expand it, tap the item - and
 * the four destinations below are where nearly all of the time goes. A bar
 * makes those one tap and leaves the drawer for the other ten screens, which
 * is what the last slot is.
 *
 * Four plus "more" is the ceiling: a fifth destination makes each target
 * narrower than a thumb on a 390px screen, which is how a bar stops helping.
 */
const bottomTabs: { icon: LucideIcon; label: string; href: string; permission: AdminPermission }[] = [
  { icon: ShoppingCart, label: "הזמנות", href: "/admin/orders", permission: ADMIN_PERMISSIONS.FULL_ACCESS },
  { icon: Package, label: "מוצרים", href: "/admin/products", permission: ADMIN_PERMISSIONS.PRODUCTS_READ },
  { icon: Users, label: "לקוחות", href: "/admin/customers", permission: ADMIN_PERMISSIONS.FULL_ACCESS },
];

// Quick actions for the dashboard header
const quickActions = [
  { icon: Plus, label: "מוצר חדש", href: "/admin/products?new=true", color: "bg-primary text-primary-foreground", permission: ADMIN_PERMISSIONS.PRODUCTS_CREATE },
  { icon: Eye, label: "הזמנות", href: "/admin/orders", color: "bg-muted text-foreground", permission: ADMIN_PERMISSIONS.FULL_ACCESS },
  { icon: PackageSearch, label: "ייבוא מהיר", href: "/admin/quick-import", color: "bg-muted text-foreground", permission: ADMIN_PERMISSIONS.PRODUCT_TOOLS_USE },
];

export const AdminLayout = ({ children, title, icon: Icon, breadcrumbs = [] }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout } = useAwsAdminAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem('admin_sidebar_collapsed') === 'true'; } catch { return false; }
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(openGroupsStorageKey);
      return saved ? JSON.parse(saved) : defaultOpenGroups;
    } catch { return defaultOpenGroups; }
  });
  const activeItemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    localStorage.setItem('admin_sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    localStorage.setItem(openGroupsStorageKey, JSON.stringify(openGroups));
  }, [openGroups]);

  useEffect(() => {
    const currentGroup = navGroups.find(group => 
      group.items.some(item => location.pathname === item.href)
    );
    if (currentGroup) {
      setOpenGroups(prev => (
        prev.includes(currentGroup.label) ? prev : [...prev, currentGroup.label]
      ));
    }
  }, [location.pathname]);

  useEffect(() => {
    const timer = setTimeout(() => {
      activeItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await logout();
    navigate("/admin/login");
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
      adminHasPermission(admin, item.permission) &&
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
        {/* The mark, not a Shield glyph, and no wordmark beside it: in-app
            surfaces show the logo alone. "ניהול מערכת" stays because it names
            this surface rather than repeating the brand. */}
        <Link to="/admin/products" className="flex items-center gap-2.5 group">
          <MipoLogo
            variant="mark"
            size="xs"
            showAnimals={false}
            className="shrink-0 group-hover:scale-105 transition-transform"
          />
          {!collapsed && (
            <span className="text-[11px] text-muted-foreground leading-none">ניהול מערכת</span>
          )}
        </Link>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 py-2.5">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <Input
              placeholder="חיפוש מהיר..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 h-10 bg-muted/30 border-border/20 text-sm placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-primary/20 rounded-lg"
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
                    return (
                      <TooltipProvider key={item.href} delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              to={item.href}
                              className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-lg transition-all relative mx-auto",
                                isActive
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                              )}
                            >
                              <ItemIcon className="w-4 h-4" strokeWidth={1.5} />
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
                  "flex flex-row-reverse items-center justify-between w-full px-2 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors",
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

                    return (
                      <Link
                        key={item.href}
                        ref={isActive ? activeItemRef : undefined}
                        to={item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all relative group",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <ItemIcon className={cn(
                          "w-4 h-4 shrink-0",
                          isActive ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground"
                        )} strokeWidth={1.5} />
                        <span className="truncate">{item.label}</span>
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
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {admin?.email?.charAt(0).toUpperCase() || 'מ'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{admin?.display_name || "מנהל מערכת"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{admin?.email}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-start gap-1.5 h-9 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/")}
              >
                <Home className="w-3.5 h-3.5" />
                לאפליקציה
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/20" dir="rtl">
      {/* Mounted once, at the shell, so every admin screen answers the same
          keystroke. It renders nothing until ⌘K. */}
      <AdminCommandBar destinations={commandDestinations} />
      {/* Mobile Header */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/20"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* No hamburger. The drawer moved to the bottom bar's last tab, where a
            thumb already is, and the space it freed went to the title - which
            used to truncate on any screen with a name in it. */}
        <div className="flex items-center justify-between gap-2 px-4 h-14">
          <h1 className="font-semibold text-base flex items-center gap-2 truncate flex-1 min-w-0">
            {Icon && <Icon className="w-[18px] h-[18px] shrink-0 text-primary" strokeWidth={1.75} />}
            <span className="truncate">{title}</span>
          </h1>
          <div className="flex items-center gap-0.5 shrink-0">
            {adminHasPermission(admin, ADMIN_PERMISSIONS.FULL_ACCESS) && <AdminNotificationsBell />}
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="w-10 h-10">
              <Home className="w-[18px] h-[18px]" />
            </Button>
          </div>
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
            className="absolute left-0 top-[72px] -translate-x-1/2 w-6 h-6 rounded-full bg-card border border-border/30 shadow-sm hover:bg-muted transition-all z-10"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <PanelLeft className="w-3 h-3" />
            ) : (
              <PanelLeftClose className="w-3 h-3" />
            )}
          </Button>
        </aside>

        {/* Main */}
        <main className={cn(
          "flex-1 min-h-screen transition-all duration-300 w-full overflow-x-hidden",
          isCollapsed ? "lg:mr-14" : "lg:mr-56",
        )}>
          {/*
           * Spacers, not padding on <main>.
           *
           * The padding used to be an inline style, which no `lg:` class can
           * undo - so a 56px blank strip sat above the DESKTOP header too, and
           * the sticky header stuck to the viewport rather than below it. A
           * spacer that is `lg:hidden` clears the fixed mobile header where it
           * exists and takes up nothing where it does not.
           */}
          <div className="lg:hidden" aria-hidden style={{ height: 'calc(56px + env(safe-area-inset-top, 0px))' }} />
          <div>
            {/* Desktop Header */}
            <header className="hidden lg:flex items-center justify-between px-5 h-14 border-b border-border/20 bg-card/60 backdrop-blur-sm sticky top-0 z-40">
              <div className="flex items-center gap-2 min-w-0">
                {Icon && (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  </div>
                )}
                <div className="min-w-0">
                  {breadcrumbs.length > 0 ? (
                    <nav className="flex items-center gap-1 text-xs">
                      <Link to="/admin/products" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                        ניהול
                      </Link>
                      {breadcrumbs.map((crumb, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <ChevronRight className="w-3 h-3 text-muted-foreground rotate-180 shrink-0" />
                          {crumb.href ? (
                            <Link to={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors truncate">
                              {crumb.label}
                            </Link>
                          ) : (
                            <span className="text-foreground font-medium truncate">{crumb.label}</span>
                          )}
                        </div>
                      ))}
                    </nav>
                  ) : (
                    <h1 className="font-semibold text-base truncate">{title}</h1>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                {quickActions.filter((action) => adminHasPermission(admin, action.permission)).map((action) => (
                  <Button
                    key={action.href + action.label}
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => navigate(action.href)}
                  >
                    <action.icon className="w-3.5 h-3.5" />
                    {action.label}
                  </Button>
                ))}
                <div className="w-px h-5 bg-border/30 mx-1" />
                {adminHasPermission(admin, ADMIN_PERMISSIONS.FULL_ACCESS) && <AdminNotificationsBell />}
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => navigate("/")}>
                  <Home className="w-4 h-4" />
                </Button>
              </div>
            </header>

            <div className="p-4 lg:p-5">
              {children}
              {/* Clears the bottom bar. Without it the bar covers the last row
                  of every table, which on a list of orders is the newest one. */}
              <div
                data-bottom-bar-spacer
                className="lg:hidden"
                aria-hidden
                style={{ height: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Bottom bar - phones only. The drawer lives in its last tab. */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/20"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="ניווט ראשי"
      >
        <div className="flex items-stretch">
          {bottomTabs
            .filter((tab) => adminHasPermission(admin, tab.permission))
            .map((tab) => {
              const isActive = location.pathname === tab.href;
              const TabIcon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  to={tab.href}
                  className={cn(
                    // h-14 and flex-1: a target a thumb hits without aiming.
                    "flex-1 flex flex-col items-center justify-center gap-0.5 h-14 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <TabIcon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                  <span className={cn("text-[11px] leading-none", isActive && "font-semibold")}>
                    {tab.label}
                  </span>
                </Link>
              );
            })}

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex-1 flex flex-col items-center justify-center gap-0.5 h-14 text-muted-foreground transition-colors"
              >
                <Menu className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-[11px] leading-none">עוד</span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-72 border-l border-border/20">
              <SheetTitle className="sr-only">תפריט ניהול</SheetTitle>
              <NavContent />
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
};

export default AdminLayout;
