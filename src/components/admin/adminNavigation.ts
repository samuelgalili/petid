/**
 * What the admin contains, as data.
 *
 * ─── WHY THIS IS ITS OWN FILE ───────────────────────────────────────────────
 *
 * Seven surfaces need to know the same thing: the top bar, the sidebar, the
 * mobile drawer, the bottom bar, ⌘K, the breadcrumb, and the tests that check
 * every destination leads somewhere. When that knowledge lived inside
 * AdminLayout, adding a screen meant remembering six other places, and the way
 * you found out you had forgotten one was somebody saying "⌘K doesn't know
 * about the new screen".
 *
 * ─── TWO NAMES PER SCREEN, ON PURPOSE ───────────────────────────────────────
 *
 * `label` is English and `hebrew` is Hebrew, and both are real. The owner
 * chose English navigation from the design: domain names are shorter, they do
 * not shift width when translated, and they read as chrome rather than as
 * content - which is what navigation should be next to a Hebrew page.
 *
 * But the people using this think in Hebrew. So the page title, the
 * breadcrumb, the mobile drawer and ⌘K all use `hebrew`; only the desktop
 * chrome uses `label`. Somebody who types "לקוחות" into ⌘K finds Customers.
 *
 * ─── `planned` IS NOT A PLACEHOLDER ─────────────────────────────────────────
 *
 * Thirteen of these screens have NO TABLE BEHIND THEM. Not an empty table - no
 * table: procurement, HR, tasks, approvals, documents, returns, expenses. The
 * owner asked for them in the sidebar anyway, so the honest thing is to say
 * what each one will be and what is missing, rather than a blank "coming soon"
 * or - far worse, and explicitly forbidden by the brief - a handsome screen
 * over invented data.
 */

import {
  Activity, AlertTriangle, BadgeCheck, BarChart3, Bell, Boxes, Building2,
  CircleDollarSign, ClipboardList, Contact, DollarSign, FileText, FolderTree,
  History, LayoutDashboard, type LucideIcon, Package, Plug, Receipt,
  RotateCcw, Settings, ShoppingCart, Sparkles, Ticket, Truck, UserCog, Users,
  Workflow,
} from "lucide-react";

import { ADMIN_PERMISSIONS, type AdminPermission } from "@/lib/adminPermissions";

export interface AdminScreen {
  /** The sidebar's word. English, because the chrome is English. */
  label: string;
  /** The same screen, in the language it is talked about in. */
  hebrew: string;
  href: string;
  icon: LucideIcon;
  permission: AdminPermission;
  /**
   * `ready` means real data behind it. `planned` means there is no table yet,
   * and the screen says so rather than pretending.
   */
  status: "ready" | "planned";
  /** For a planned screen: what it will do, and what has to exist first. */
  plan?: { does: string; needs: string[] };
}

export interface AdminDomain {
  key: string;
  label: string;
  hebrew: string;
  icon: LucideIcon;
  screens: AdminScreen[];
}

const FULL = ADMIN_PERMISSIONS.FULL_ACCESS;

export const ADMIN_DOMAINS: AdminDomain[] = [
  {
    key: "command",
    label: "Command Center",
    hebrew: "מרכז הבקרה",
    icon: LayoutDashboard,
    screens: [
      {
        label: "Command Center", hebrew: "מרכז הבקרה", href: "/admin",
        icon: LayoutDashboard, permission: FULL, status: "ready",
      },
    ],
  },
  {
    key: "crm",
    label: "CRM",
    hebrew: "לקוחות",
    icon: Contact,
    screens: [
      {
        label: "Customers", hebrew: "לקוחות", href: "/admin/customers",
        icon: Users, permission: FULL, status: "ready",
      },
      {
        label: "Leads", hebrew: "לידים", href: "/admin/leads",
        icon: BadgeCheck, permission: FULL, status: "planned",
        plan: {
          does: "מי פנה ועוד לא קנה, מאיפה הגיע, ומה השלב שלו.",
          needs: ["טבלת leads", "מקור הגעה (UTM / הפניה)", "שלבי משפך והמרה ללקוח"],
        },
      },
      {
        label: "Communication", hebrew: "תקשורת", href: "/admin/communication",
        icon: Activity, permission: FULL, status: "planned",
        plan: {
          does: "כל הודעה שיצאה ללקוח ונכנסה ממנו, במקום אחד.",
          needs: ["טבלת messages/conversations", "חיבור לערוץ (מייל / וואטסאפ)", "קישור לישות הלקוח"],
        },
      },
    ],
  },
  {
    key: "commerce",
    label: "Commerce",
    hebrew: "מסחר",
    icon: ShoppingCart,
    screens: [
      {
        label: "Orders", hebrew: "הזמנות", href: "/admin/orders",
        icon: ShoppingCart, permission: FULL, status: "ready",
      },
      {
        label: "Products", hebrew: "מוצרים", href: "/admin/products",
        icon: Package, permission: ADMIN_PERMISSIONS.PRODUCTS_READ, status: "ready",
      },
      {
        label: "Categories", hebrew: "קטגוריות", href: "/admin/categories",
        icon: FolderTree, permission: FULL, status: "ready",
      },
      {
        label: "Coupons", hebrew: "קופונים", href: "/admin/coupons",
        icon: Ticket, permission: FULL, status: "ready",
      },
      {
        label: "Inventory", hebrew: "מלאי", href: "/admin/inventory",
        icon: Boxes, permission: FULL, status: "planned",
        plan: {
          does: "כמה יש מכל מוצר, איפה, ומה עומד להיגמר.",
          needs: [
            "יש טבלת inventory עם quantity ו-low_stock_threshold",
            "חסר: מחסנים ומיקומים (היום מחסן אחד מרומז)",
            "חסר: תנועות מלאי — למה המספר השתנה",
          ],
        },
      },
      {
        label: "Returns", hebrew: "החזרות", href: "/admin/returns",
        icon: RotateCcw, permission: FULL, status: "planned",
        plan: {
          does: "בקשת החזרה, מה חזר, ומה הוחזר ללקוח.",
          needs: ["טבלת returns", "זיכוי — היום refund לא קיים בסכמה בכלל", "חלון ההחזרה בימים, שטרם נקבע"],
        },
      },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    hebrew: "כספים",
    icon: CircleDollarSign,
    screens: [
      {
        label: "Transactions", hebrew: "תנועות", href: "/admin/transactions",
        icon: Receipt, permission: FULL, status: "planned",
        plan: {
          does: "כל חיוב, זיכוי ועמלה — מה נגבה בפועל מול מה שההזמנה אמרה.",
          needs: [
            "יש cardcom_events — אירועי תשלום גולמיים",
            "חסר: טבלת transactions שמנרמלת אותם",
            "חסר: עמלות סליקה",
          ],
        },
      },
      {
        label: "Documents", hebrew: "מסמכים", href: "/admin/documents",
        icon: FileText, permission: FULL, status: "planned",
        plan: {
          does: "חשבוניות, קבלות וזיכויים כישויות — לא כקבצי PDF.",
          needs: ["טבלת documents", "מספור וסוג מסמך", "קישור להזמנה, ללקוח ולאסמכתת CardCom"],
        },
      },
      {
        label: "Expenses", hebrew: "הוצאות", href: "/admin/expenses",
        icon: DollarSign, permission: FULL, status: "planned",
        plan: {
          does: "מה יוצא מהעסק, לפי קטגוריה וספק.",
          needs: ["טבלת expenses", "ספקים — לא קיימים בסכמה", "קטגוריות הוצאה"],
        },
      },
    ],
  },
  {
    key: "procurement",
    label: "Procurement",
    hebrew: "רכש",
    icon: Truck,
    screens: [
      {
        label: "Suppliers", hebrew: "ספקים", href: "/admin/suppliers",
        icon: Building2, permission: FULL, status: "planned",
        plan: {
          does: "מי מספק מה, באיזה מחיר, ומה מצב ההתחשבנות.",
          needs: ["טבלת suppliers", "קישור ספק↔מוצר (היום supplier_id הוא שדה חופשי)", "תנאי תשלום"],
        },
      },
      {
        label: "Purchase Orders", hebrew: "הזמנות רכש", href: "/admin/purchase-orders",
        icon: ClipboardList, permission: FULL, status: "planned",
        plan: {
          does: "מה הוזמן מהספק, מה הגיע, ומה חויב — ושלושתם מול אותו מספר.",
          needs: ["purchase_orders", "goods_receipts", "supplier_invoices", "התאמה משולשת בין השלושה"],
        },
      },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    hebrew: "תפעול",
    icon: Workflow,
    screens: [
      {
        label: "Tasks", hebrew: "משימות", href: "/admin/tasks",
        icon: ClipboardList, permission: FULL, status: "planned",
        plan: {
          does: "מה צריך להיעשות, על ידי מי, עד מתי.",
          needs: ["טבלת tasks", "שיוך לאדמין ולישות", "תאריך יעד וסטטוס"],
        },
      },
      {
        label: "Approvals", hebrew: "אישורים", href: "/admin/approvals",
        icon: AlertTriangle, permission: FULL, status: "planned",
        plan: {
          does: "כל מה שמחכה להחלטה של אדם — זיכוי, חשבונית ספק, פעולה רגישה.",
          needs: ["טבלת approvals", "הגדרה מה דורש אישור", "מי מוסמך לאשר מה"],
        },
      },
      {
        label: "Workflows", hebrew: "תהליכים", href: "/admin/workflows",
        icon: Workflow, permission: FULL, status: "planned",
        plan: {
          does: "מה קורה אוטומטית אחרי אירוע — ומה נכשל.",
          needs: ["יש outbox_events", "חסר: הגדרת תהליך", "חסר: היסטוריית ריצה"],
        },
      },
    ],
  },
  {
    key: "people",
    label: "People",
    hebrew: "עובדים",
    icon: UserCog,
    screens: [
      {
        label: "Employees", hebrew: "עובדים", href: "/admin/employees",
        icon: UserCog, permission: FULL, status: "planned",
        plan: {
          does: "עובדי מיפו — תפקיד, העסקה, יעדים, עמלות.",
          needs: ["טבלת employees", "נוכחות וחופשות", "עמלות"],
        },
      },
    ],
  },
  {
    key: "platform",
    label: "Platform",
    hebrew: "מערכת",
    icon: Settings,
    screens: [
      {
        label: "Analytics", hebrew: "אנליטיקות", href: "/admin/analytics",
        icon: BarChart3, permission: FULL, status: "ready",
      },
      {
        label: "AI Usage", hebrew: "כלכלת AI", href: "/admin/ai-economics",
        icon: Sparkles, permission: FULL, status: "ready",
      },
      {
        label: "Connectors", hebrew: "חיבורים", href: "/admin/connectors",
        icon: Plug, permission: FULL, status: "ready",
      },
      {
        label: "Notifications", hebrew: "התראות", href: "/admin/notifications",
        icon: Bell, permission: FULL, status: "ready",
      },
      {
        label: "Audit Log", hebrew: "יומן ביקורת", href: "/admin/audit-log",
        icon: History, permission: ADMIN_PERMISSIONS.AUDIT_READ, status: "ready",
      },
      {
        label: "Settings", hebrew: "הגדרות", href: "/admin/settings",
        icon: Settings, permission: FULL, status: "ready",
      },
    ],
  },
];

/** Every screen, flat, in sidebar order. */
export const ADMIN_SCREENS: (AdminScreen & { domain: AdminDomain })[] =
  ADMIN_DOMAINS.flatMap((domain) => domain.screens.map((screen) => ({ ...screen, domain })));

/** The screens that have no table behind them yet. */
export const PLANNED_SCREENS = ADMIN_SCREENS.filter((screen) => screen.status === "planned");

/**
 * Which domain a path belongs to.
 *
 * Longest match, because /admin is a prefix of every other admin path and a
 * naive startsWith puts every screen in the Command Center.
 */
export const domainForPath = (pathname: string): AdminDomain => {
  let best: { domain: AdminDomain; length: number } | null = null;
  for (const domain of ADMIN_DOMAINS) {
    for (const screen of domain.screens) {
      const isMatch = pathname === screen.href || pathname.startsWith(`${screen.href}/`);
      if (isMatch && (!best || screen.href.length > best.length)) {
        best = { domain, length: screen.href.length };
      }
    }
  }
  return best?.domain ?? ADMIN_DOMAINS[0];
};

/** The screen a path is, if it is one of ours. */
export const screenForPath = (pathname: string) =>
  ADMIN_SCREENS.find((screen) => screen.href === pathname)
  ?? ADMIN_SCREENS.find((screen) => pathname.startsWith(`${screen.href}/`))
  ?? null;

/**
 * The flattened list ⌘K searches.
 *
 * Derived rather than kept as a second list, so a screen added above is
 * reachable by ⌘K on the same commit. Both names go through: the sidebar says
 * "Customers" and the person types "לקוחות".
 */
export const commandDestinations = ADMIN_SCREENS.map((screen) => ({
  label: screen.label,
  aka: screen.hebrew,
  href: screen.href,
  permission: screen.permission,
  group: screen.domain.label,
  icon: screen.icon,
}));
