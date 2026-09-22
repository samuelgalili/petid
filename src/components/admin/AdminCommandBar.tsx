import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Search, ShoppingCart, User } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAwsAdminAuth } from "@/hooks/useAwsAdminAuth";
import { adminHasPermission, type AdminPermission } from "@/lib/adminPermissions";
import { cn } from "@/lib/utils";

/**
 * ⌘K. One box, and the thing you were going to click is in it.
 *
 * There was an AdminGlobalSearch component in this folder already. It was
 * never rendered by anything, and it imported a hook - useAdminSearch - that
 * does not exist in the repository. So the command bar had to be built rather
 * than adapted, and this file deliberately does not import that one.
 *
 * WHAT IT DOES NOT DO, on purpose: execute natural-language commands. The
 * brief asks for "create a reminder for Israel in 7 days" and for confirmation
 * before sensitive operations. Both halves need something that does not exist
 * yet - the approval queue is Phase 5 - and a command bar that can write
 * before there is anywhere to review what it wrote is the most direct route to
 * an unreviewable action in this entire plan. Search now, execution when there
 * is a place for a human to stand.
 *
 * Destinations are filtered by the signed-in admin's PERMISSIONS, so the bar
 * cannot offer a page the session will be refused at. That is presentation,
 * not authorisation: the server checks again, because there is no RLS here and
 * hiding a link has never stopped anybody typing a URL.
 */

export interface CommandDestination {
  label: string;
  href: string;
  permission: AdminPermission;
  group: string;
  icon: typeof User;
  /**
   * The other name for the same screen.
   *
   * The sidebar labels are English now - "Customers", "Orders" - and the
   * people using this type Hebrew. Matching one list against one name means
   * ⌘K finds nothing for "לקוחות", which is the word on every other surface
   * in the product and the only word some of them will think of.
   */
  aka?: string;
}

/**
 * How anything other than the keyboard opens this.
 *
 * The top bar has a search-shaped button, and what it opens is this. It could
 * synthesise a ⌘K keydown, but a fake keyboard event is a lie that breaks the
 * day somebody changes the shortcut; a named event says what it means.
 */
export const COMMAND_BAR_EVENT = "mipo:admin-command-bar";

export interface AdminCommandBarProps {
  /** Every page the sidebar knows about, flattened. */
  destinations: CommandDestination[];
}

const ENTITY_HINTS = [
  { icon: User, label: "לקוחות", href: "/admin/customers", hint: "חיפוש לקוח" },
  { icon: ShoppingCart, label: "הזמנות", href: "/admin/orders", hint: "חיפוש הזמנה" },
  { icon: Package, label: "מוצרים", href: "/admin/products", hint: "חיפוש מוצר" },
];

/** Matches on the Hebrew label without caring about surrounding whitespace. */
const matches = (haystack: string, needle: string) =>
  haystack.toLowerCase().includes(needle.trim().toLowerCase());

export const AdminCommandBar = ({ destinations }: AdminCommandBarProps) => {
  const navigate = useNavigate();
  const { admin } = useAwsAdminAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // metaKey for macOS, ctrlKey for everything else. Both, because the
      // owner uses both.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    const onAsked = () => setOpen((current) => !current);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(COMMAND_BAR_EVENT, onAsked);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(COMMAND_BAR_EVENT, onAsked);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setCursor(0);
    }
  }, [open]);

  const allowed = useMemo(
    () => destinations.filter((destination) => adminHasPermission(admin, destination.permission)),
    [destinations, admin],
  );

  const results = useMemo(() => {
    const pages = (query
      ? allowed.filter((item) => matches(item.label, query) || matches(item.aka || "", query))
      : allowed
    ).map((item) => ({
      kind: "page" as const,
      key: item.href,
      // The Hebrew name leads in the results, because the results are read in
      // Hebrew; the English one is what it is called in the sidebar.
      label: item.aka || item.label,
      sublabel: item.aka ? `${item.group} · ${item.label}` : item.group,
      icon: item.icon,
      href: item.href,
    }));

    // A typed query is also a search TERM for the list screens, which each
    // have their own filter. Handing the query over beats making this bar a
    // second, worse product search.
    const searches = query.trim()
      ? ENTITY_HINTS.filter((hint) => allowed.some((item) => item.href === hint.href)).map((hint) => ({
        kind: "search" as const,
        key: `search:${hint.href}`,
        label: `${hint.hint}: ${query.trim()}`,
        sublabel: hint.label,
        icon: hint.icon,
        href: `${hint.href}?q=${encodeURIComponent(query.trim())}`,
      }))
      : [];

    return [...pages, ...searches];
  }, [allowed, query]);

  useEffect(() => { setCursor(0); }, [query]);

  const go = useCallback((href: string) => {
    setOpen(false);
    navigate(href);
  }, [navigate]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((current) => Math.min(current + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && results[cursor]) {
      event.preventDefault();
      go(results[cursor].href);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="overflow-hidden rounded-3xl border border-mipo-line bg-mipo-surface p-0 sm:max-w-[560px]"
        dir="rtl"
      >
        <DialogTitle className="sr-only">סרגל פקודות</DialogTitle>
        <DialogDescription className="sr-only">
          חיפוש מסכים ומעבר מהיר. חצים לניווט, Enter לבחירה.
        </DialogDescription>

        <div className="relative border-b border-mipo-line">
          <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mipo-muted" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="לאן?"
            aria-label="חיפוש"
            className="h-14 w-full bg-transparent pr-12 pl-4 text-[15px] text-mipo-ink outline-none placeholder:text-mipo-muted"
          />
        </div>

        <div className="max-h-[360px] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="p-6 text-center text-[13px] text-mipo-muted">אין תוצאות</p>
          ) : (
            results.map((result, index) => {
              const Icon = result.icon;
              const isActive = index === cursor;
              return (
                <button
                  key={result.key}
                  type="button"
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => go(result.href)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-right transition-colors",
                    isActive ? "bg-mipo-soft" : "hover:bg-mipo-soft",
                  )}
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-mipo-line">
                    <Icon className="h-4 w-4 text-mipo-ink" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-mipo-ink">{result.label}</span>
                    <span className="block truncate text-[12px] text-mipo-muted">{result.sublabel}</span>
                  </span>
                  {isActive && <ArrowLeft className="h-4 w-4 flex-shrink-0 text-mipo-muted" strokeWidth={1.75} />}
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-mipo-line px-4 py-2.5 text-[12px] text-mipo-muted">
          <span>↑↓ ניווט · Enter בחירה</span>
          <span>⌘K</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminCommandBar;
