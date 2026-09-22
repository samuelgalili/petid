/**
 * The admin shell.
 *
 * ─── TWO LEVELS OF NAVIGATION, WHICH THE OWNER CHOSE ────────────────────────
 *
 * The top bar switches DOMAIN - Command Center, CRM, Commerce, Finance,
 * Procurement, Operations, People, Platform - and the sidebar shows that
 * domain's screens. One flat list of twenty-four items would be a wall; one
 * level of eight would hide everything behind a second click. This is the
 * shape of the design that was handed over, and of Stripe's.
 *
 * ─── THE CHROME IS ENGLISH AND SITS ON THE LEFT ─────────────────────────────
 *
 * Also the owner's decision, from the design. The page stays dir="rtl" - the
 * content is Hebrew and must read right to left - while the sidebar and the
 * top bar are dir="ltr" and physically on the left. That is a deliberate
 * inversion of the usual RTL rule, and it is why every offset here is written
 * PHYSICALLY (left-0, ml-*) rather than logically (start-0, ms-*): a logical
 * property flips with direction, and under dir="rtl" it would put the sidebar
 * back on the right, which is precisely what was not asked for.
 *
 * Everything a person reads as content - page title, breadcrumb, the mobile
 * drawer, ⌘K results - uses the Hebrew name. Only the desktop chrome is
 * English.
 *
 * ─── AND IT STILL WORKS ON A PHONE ──────────────────────────────────────────
 *
 * The brief says desktop-first and not to turn the admin into a mobile app.
 * The owner says he uses both, and takes orders on a phone in front of a
 * customer. Those are not in conflict: the desktop gets two levels of
 * navigation, and the phone gets a bottom bar of the four screens that are
 * the day, with everything else behind its last tab. Neither is a shrunken
 * version of the other.
 */

import { type ReactNode, useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  ChevronLeft, Home, LogOut, type LucideIcon, Menu, PanelLeft, PanelLeftClose,
  Search,
} from "lucide-react";

import { AdminCommandBar, COMMAND_BAR_EVENT } from "@/components/admin/AdminCommandBar";
import { AdminNotificationsBell } from "./AdminNotificationsBell";
import {
  ADMIN_DOMAINS, commandDestinations, domainForPath, screenForPath,
  type AdminDomain,
} from "./adminNavigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MipoLogo } from "@/components/MipoLogo";
import { cn } from "@/lib/utils";
import { useAwsAdminAuth } from "@/hooks/useAwsAdminAuth";
import { ADMIN_PERMISSIONS, adminHasPermission } from "@/lib/adminPermissions";

export { commandDestinations };

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  icon?: LucideIcon;
  breadcrumbs?: { label: string; href?: string }[];
}

/**
 * The four screens that are the working day, for the bottom bar on a phone.
 *
 * Four plus "more" is the ceiling: a fifth target is narrower than a thumb at
 * 390px, which is the width at which a bar stops helping.
 */
const PHONE_TABS = ["/admin", "/admin/orders", "/admin/customers", "/admin/products"];

const collapsedKey = "admin_sidebar_collapsed";

export const AdminLayout = ({ children, title, icon: Icon, breadcrumbs = [] }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout } = useAwsAdminAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(collapsedKey) === "true"; } catch { return false; }
  });
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    try { localStorage.setItem(collapsedKey, String(collapsed)); } catch { /* private mode */ }
  }, [collapsed]);

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  const allowed = (domain: AdminDomain) =>
    domain.screens.filter((screen) => adminHasPermission(admin, screen.permission));

  // A domain with nothing in it for this admin is not shown at all. Hiding a
  // link is not authorisation - the routes check again - but offering a person
  // a domain whose every screen then bounces them is just a worse screen.
  const domains = ADMIN_DOMAINS.filter((domain) => allowed(domain).length > 0);
  const currentDomain = domainForPath(location.pathname);
  const currentScreen = screenForPath(location.pathname);
  const screens = allowed(currentDomain);

  const phoneTabs = PHONE_TABS
    .map((href) => ADMIN_DOMAINS.flatMap((d) => d.screens).find((s) => s.href === href))
    .filter((screen): screen is NonNullable<typeof screen> =>
      Boolean(screen) && adminHasPermission(admin, screen!.permission));

  const signOut = async () => {
    await logout();
    navigate("/admin/login");
  };

  /** The sidebar's contents, shared by the fixed rail and the phone drawer. */
  const ScreenList = ({ compact = false }: { compact?: boolean }) => (
    // The label is on the <nav>, not on the <aside> around it: an aside is
    // role="complementary" and carries no accessible name for a navigation
    // landmark, so a screen reader announced "complementary" and nothing else.
    <nav className="space-y-0.5 px-2 py-2" dir="ltr" aria-label={currentDomain.label}>
      {screens.map((screen) => {
        const active = currentScreen?.href === screen.href;
        const ScreenIcon = screen.icon;

        const item = (
          <Link
            key={screen.href}
            to={screen.href}
            ref={active ? activeRef : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "admin-focus admin-tap flex items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
              compact ? "justify-center px-0" : "",
              active
                ? "bg-admin-accent-soft font-semibold text-admin-accent"
                : "text-admin-ink-muted hover:bg-admin-sunk hover:text-admin-ink",
            )}
          >
            <ScreenIcon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2 : 1.6} />
            {!compact && <span className="truncate">{screen.label}</span>}
            {/* A screen with no table behind it says so here, rather than
                looking identical until you press it. */}
            {!compact && screen.status === "planned" && (
              <span className="admin-meta mr-auto shrink-0 rounded border border-admin-line px-1 py-px">
                soon
              </span>
            )}
          </Link>
        );

        if (!compact) return item;
        return (
          <TooltipProvider key={screen.href} delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>{item}</TooltipTrigger>
              <TooltipContent side="right" className="text-xs">{screen.label}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-admin-canvas text-admin-ink" dir="rtl">
      <AdminCommandBar destinations={commandDestinations} />

      {/* ── top bar ──────────────────────────────────────────────────────── */}
      <header
        className="fixed inset-x-0 top-0 z-40 border-b border-admin-line bg-admin-surface/95 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        dir="ltr"
      >
        {/* flex-nowrap and a shrink-0 on both ends. The first version let the
            domain row have flex-1 and the user block have ml-auto, and at
            1280px they laid on top of each other: "Platform" printed through
            the owner's own name. */}
        <div className="flex h-14 flex-nowrap items-center gap-2 px-3 lg:gap-3 lg:px-4">
          <Link to="/admin" className="admin-focus flex shrink-0 items-center gap-2 rounded-lg">
            <MipoLogo variant="mark" size="xs" showAnimals={false} className="shrink-0" />
            <span className="hidden text-sm font-semibold sm:block">Mipo Admin</span>
          </Link>

          {/* The search is a BUTTON, not an input: the thing it opens is ⌘K,
              and two search fields on one screen is two places to type. */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(COMMAND_BAR_EVENT))}
            className="admin-focus hidden h-9 w-56 shrink-0 items-center gap-2 rounded-xl border border-admin-line bg-admin-sunk px-3 text-admin-ink-subtle transition-colors hover:border-admin-line-strong lg:flex"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate text-sm">חיפוש בכל המערכת…</span>
            <kbd className="admin-meta mr-auto shrink-0 rounded border border-admin-line bg-admin-surface px-1.5 py-0.5">
              ⌘K
            </kbd>
          </button>

          {/* Domains. The one level of navigation that is always visible. */}
          {/* Scrolls rather than wraps or overlaps. Eight domains, a search
              box and a user block do not fit on a 1280px laptop, and of the
              three ways to lose that fight - wrap, overlap, scroll - only one
              leaves every domain reachable. */}
          <nav
            className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto xl:flex [&::-webkit-scrollbar]:h-0"
            aria-label="Domains"
          >
            {domains.map((domain) => {
              const active = domain.key === currentDomain.key;
              const first = allowed(domain)[0];
              const DomainIcon = domain.icon;
              return (
                <Link
                  key={domain.key}
                  to={first.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "admin-focus flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
                    active
                      ? "bg-admin-accent-soft font-semibold text-admin-accent"
                      : "text-admin-ink-muted hover:bg-admin-sunk hover:text-admin-ink",
                  )}
                >
                  {/* The icon costs about 22px per domain and eight of them
                      is the difference between every domain being visible at
                      1280 and the last two scrolling out of sight with no
                      affordance saying they are there. It comes back at 2xl,
                      where the room exists. */}
                  <DomainIcon className="hidden h-4 w-4 shrink-0 2xl:block" strokeWidth={active ? 2 : 1.6} />
                  {domain.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            {adminHasPermission(admin, ADMIN_PERMISSIONS.FULL_ACCESS) && <AdminNotificationsBell />}
            <Button variant="ghost" size="icon" className="admin-focus h-9 w-9" onClick={() => navigate("/")}>
              <Home className="h-[18px] w-[18px]" />
              <span className="sr-only">לאפליקציה</span>
            </Button>

            <div className="hidden items-center gap-2 pl-1 sm:flex" dir="rtl">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-admin-accent-soft text-xs font-bold text-admin-accent">
                  {admin?.email?.charAt(0).toUpperCase() || "מ"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 leading-tight md:block">
                <p className="truncate text-[13px] font-medium">{admin?.display_name || "מנהל מערכת"}</p>
                <p className="admin-meta truncate">{admin?.email}</p>
              </div>
              <Button
                variant="ghost" size="icon"
                className="admin-focus h-8 w-8 text-admin-ink-subtle hover:text-admin-danger"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">התנתקות</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Below xl there is no room for the domain row in the bar, so it
            becomes its own scrolling strip rather than disappearing. */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-admin-line px-3 py-1.5 xl:hidden" dir="ltr">
          {domains.map((domain) => {
            const active = domain.key === currentDomain.key;
            return (
              <Link
                key={domain.key}
                to={allowed(domain)[0].href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "admin-focus shrink-0 rounded-lg px-2.5 py-1 text-[13px] transition-colors",
                  active
                    ? "bg-admin-accent-soft font-semibold text-admin-accent"
                    : "text-admin-ink-muted hover:bg-admin-sunk",
                )}
              >
                {domain.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* ── sidebar, physically left ─────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-0 z-30 hidden flex-col border-r border-admin-line bg-admin-surface pt-[calc(56px+env(safe-area-inset-top,0px))] transition-[width] duration-200 lg:flex",
          collapsed ? "w-14" : "w-56",
        )}
        dir="ltr"
      >
        {!collapsed && (
          <p className="admin-label px-4 pb-1 pt-3 uppercase tracking-wider">{currentDomain.label}</p>
        )}
        <ScrollArea className="flex-1">
          <ScreenList compact={collapsed} />
        </ScrollArea>

        <div className="border-t border-admin-line p-2">
          <Button
            variant="ghost" size="sm"
            className="admin-focus w-full justify-start gap-2 text-admin-ink-subtle"
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed && <span className="text-xs">Collapse</span>}
          </Button>
        </div>
      </aside>

      {/* ── the page ─────────────────────────────────────────────────────── */}
      <main
        className={cn("min-h-screen transition-[margin] duration-200", collapsed ? "lg:ml-14" : "lg:ml-56")}
      >
        {/* Spacers rather than padding on <main>: an inline padding is one no
            `lg:` class can undo, which once left a 56px blank strip above the
            desktop header. Two rows of chrome below xl, one above it. */}
        <div
          className="xl:hidden"
          aria-hidden
          style={{ height: "calc(56px + 37px + env(safe-area-inset-top, 0px))" }}
        />
        <div
          className="hidden xl:block"
          aria-hidden
          style={{ height: "calc(56px + env(safe-area-inset-top, 0px))" }}
        />

        <div className="px-4 py-4 lg:px-6 lg:py-5">
          <header className="mb-4 flex min-w-0 items-center gap-2">
            {Icon && (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-admin-accent-soft text-admin-accent">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
            )}
            <div className="min-w-0">
              <h1 className="admin-title truncate">{title}</h1>
              {breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1 pt-0.5" aria-label="נתיב">
                  <Link to="/admin" className="admin-meta admin-focus rounded hover:text-admin-ink">ניהול</Link>
                  {breadcrumbs.map((crumb, index) => (
                    <span key={index} className="flex min-w-0 items-center gap-1">
                      <ChevronLeft className="h-3 w-3 shrink-0 text-admin-ink-subtle" />
                      {crumb.href
                        ? <Link to={crumb.href} className="admin-meta admin-focus truncate rounded hover:text-admin-ink">{crumb.label}</Link>
                        : <span className="admin-meta truncate text-admin-ink">{crumb.label}</span>}
                    </span>
                  ))}
                </nav>
              )}
            </div>
          </header>

          {children}

          {/* Clears the phone bar. Without it the bar covers the last row of
              every table, which on a list of orders is the newest one. */}
          <div
            data-bottom-bar-spacer
            className="lg:hidden"
            aria-hidden
            style={{ height: "calc(64px + env(safe-area-inset-bottom, 0px))" }}
          />
        </div>
      </main>

      {/* ── the phone's bar ──────────────────────────────────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-admin-line bg-admin-surface/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="ניווט ראשי"
      >
        <div className="flex items-stretch">
          {phoneTabs.map((screen) => {
            const active = location.pathname === screen.href;
            const TabIcon = screen.icon;
            return (
              <Link
                key={screen.href}
                to={screen.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "admin-focus flex h-14 flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
                  active ? "text-admin-accent" : "text-admin-ink-muted",
                )}
              >
                <TabIcon className="h-5 w-5" strokeWidth={active ? 2 : 1.6} />
                {/* The Hebrew name, because this is content a person reads
                    rather than chrome they navigate by. */}
                <span className={cn("text-[11px] leading-none", active && "font-semibold")}>
                  {screen.hebrew}
                </span>
              </Link>
            );
          })}

          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="admin-focus flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-admin-ink-muted"
              >
                <Menu className="h-5 w-5" strokeWidth={1.6} />
                <span className="text-[11px] leading-none">עוד</span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 border-l border-admin-line bg-admin-surface p-0">
              <SheetTitle className="sr-only">תפריט ניהול</SheetTitle>
              <ScrollArea className="h-full">
                <div className="space-y-4 p-4 pt-8">
                  {domains.map((domain) => (
                    <div key={domain.key}>
                      {/* Hebrew in the drawer. The desktop chrome is English
                          by choice; a list you read on a phone is not chrome. */}
                      <p className="admin-label pb-1 pr-1">{domain.hebrew}</p>
                      <div className="space-y-0.5">
                        {allowed(domain).map((screen) => {
                          const active = location.pathname === screen.href;
                          const ScreenIcon = screen.icon;
                          return (
                            <Link
                              key={screen.href}
                              to={screen.href}
                              className={cn(
                                "admin-focus admin-tap flex items-center gap-2.5 rounded-lg px-2.5 text-sm",
                                active
                                  ? "bg-admin-accent-soft font-semibold text-admin-accent"
                                  : "text-admin-ink hover:bg-admin-sunk",
                              )}
                            >
                              <ScreenIcon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.6} />
                              <span className="truncate">{screen.hebrew}</span>
                              {screen.status === "planned" && (
                                <span className="admin-meta mr-auto shrink-0 rounded border border-admin-line px-1 py-px">
                                  בקרוב
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <div className="border-t border-admin-line pt-3">
                    <Button
                      variant="ghost"
                      className="admin-focus w-full justify-start gap-2 text-admin-ink-muted"
                      onClick={signOut}
                    >
                      <LogOut className="h-4 w-4" />
                      התנתקות
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
};

export default AdminLayout;
