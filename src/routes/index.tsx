/**
 * ROUTE CONFIGURATION - SINGLE SOURCE OF TRUTH
 * =============================================
 * Keep active routes on AWS-backed pages. Legacy Supabase-era surfaces redirect
 * to the nearest supported flow until they are ported.
 */

import { lazy, Suspense, ComponentType } from "react";
import { Navigate, RouteObject, useParams } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { PageTransition } from "@/components/PageTransition";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { ADMIN_PERMISSIONS, type AdminPermission } from "@/lib/adminPermissions";

const LoadingSpinner = ({ dark = false }: { dark?: boolean }) => (
  <div className={`min-h-screen flex items-center justify-center ${dark ? "bg-black" : "bg-background"}`}>
    <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${dark ? "border-white" : "border-primary"}`} />
  </div>
);

const LazyPage = ({
  component: Component,
  pageName,
  dark = false,
}: {
  component: ComponentType;
  pageName: string;
  dark?: boolean;
}) => (
  <PageTransition>
    <PageErrorBoundary pageName={pageName}>
      <Suspense fallback={<LoadingSpinner dark={dark} />}>
        <Component />
      </Suspense>
    </PageErrorBoundary>
  </PageTransition>
);

const Protected = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

const Admin = ({ children, permission }: { children: React.ReactNode; permission?: AdminPermission }) => (
  <AdminRoute permission={permission}>{children}</AdminRoute>
);

const PetQrRedirect = () => {
  const { petId } = useParams<{ petId: string }>();
  return <Navigate to={petId ? `/found-pet/${petId}` : "/"} replace />;
};

import Auth from "@/pages/Auth";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Install from "@/pages/Install";

const MainShell = lazy(() => import("@/components/MainShell"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));

export const authRoutes: RouteObject[] = [
  { path: "/auth", element: <PageTransition><Auth /></PageTransition> },
  { path: "/auth/callback", element: <Navigate to="/auth" replace /> },
  { path: "/signup", element: <PageTransition><Signup /></PageTransition> },
  { path: "/forgot-password", element: <PageTransition><ForgotPassword /></PageTransition> },
  { path: "/reset-password", element: <PageTransition><ResetPassword /></PageTransition> },
  { path: "/install", element: <PageTransition><Install /></PageTransition> },
  { path: "/onboarding", element: <Protected><LazyPage component={Onboarding} pageName="הצטרפות" /></Protected> },
];

export const feedRoutes: RouteObject[] = [
  { path: "/", element: <Protected><LazyPage component={MainShell} pageName="בית" /></Protected> },
  { path: "/feed", element: <Protected><LazyPage component={MainShell} pageName="בית" /></Protected> },
  { path: "/old-feed", element: <Navigate to="/feed" replace /> },
  { path: "/explore", element: <Navigate to="/feed" replace /> },
  { path: "/reels", element: <Navigate to="/feed" replace /> },
  { path: "/user/:userId", element: <Navigate to="/feed" replace /> },
  { path: "/profile/:userId", element: <Navigate to="/feed" replace /> },
  { path: "/post/:postId", element: <Navigate to="/feed" replace /> },
  { path: "/story/:userId", element: <Navigate to="/" replace /> },
  { path: "/highlight/:highlightId", element: <Navigate to="/" replace /> },
  { path: "/live", element: <Navigate to="/" replace /> },
  { path: "/live/:streamId", element: <Navigate to="/" replace /> },
  { path: "/live/:streamId/broadcast", element: <Navigate to="/" replace /> },
];

const ProductDetailAws = lazy(() => import("@/pages/ProductDetailAws"));
const Cart = lazy(() => import("@/pages/Cart"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const OrderConfirmation = lazy(() => import("@/pages/OrderConfirmation"));
const ReorderConfirmation = lazy(() => import("@/pages/ReorderConfirmation"));
const OrderHistory = lazy(() => import("@/pages/OrderHistory"));
const OrderTrackingPage = lazy(() => import("@/pages/OrderTrackingPage"));
const Favorites = lazy(() => import("@/pages/Favorites"));
const PaymentSuccess = lazy(() => import("@/pages/PaymentSuccess"));
const PaymentFailed = lazy(() => import("@/pages/PaymentFailed"));

export const shopRoutes: RouteObject[] = [
  { path: "/shop", element: <LazyPage component={MainShell} pageName="החנות" /> },
  { path: "/shop/explore", element: <Navigate to="/shop" replace /> },
  { path: "/shop/feed", element: <Navigate to="/shop" replace /> },
  { path: "/product/:id", element: <LazyPage component={ProductDetailAws} pageName="פרטי מוצר" /> },
  { path: "/cart", element: <LazyPage component={Cart} pageName="עגלת קניות" /> },
  { path: "/favorites", element: <Protected><LazyPage component={Favorites} pageName="מועדפים" /></Protected> },
  { path: "/checkout", element: <LazyPage component={Checkout} pageName="תשלום" /> },
  { path: "/order-confirmation", element: <LazyPage component={OrderConfirmation} pageName="אישור הזמנה" /> },
  { path: "/reorder-confirmation", element: <Protected><LazyPage component={ReorderConfirmation} pageName="אישור הזמנה מחדש" /></Protected> },
  { path: "/order-history", element: <LazyPage component={OrderHistory} pageName="היסטוריית הזמנות" /> },
  { path: "/order-tracking/:orderId", element: <LazyPage component={OrderTrackingPage} pageName="מעקב הזמנה" /> },
  { path: "/payment-success", element: <LazyPage component={PaymentSuccess} pageName="תשלום הצליח" /> },
  { path: "/payment-failed", element: <LazyPage component={PaymentFailed} pageName="תשלום נכשל" /> },
];

const AddPet = lazy(() => import("@/pages/AddPet"));
const EditPet = lazy(() => import("@/pages/EditPet"));
const ArchivedPets = lazy(() => import("@/pages/ArchivedPets"));
const Documents = lazy(() => import("@/pages/Documents"));
const Breeds = lazy(() => import("@/pages/Breeds"));
const Profile = lazy(() => import("@/pages/Profile"));

export const petRoutes: RouteObject[] = [
  { path: "/add-pet", element: <Protected><LazyPage component={AddPet} pageName="הוספת חיית מחמד" /></Protected> },
  { path: "/pet/:petId", element: <PetQrRedirect /> },
  { path: "/pet/:petId/*", element: <Navigate to="/" replace /> },
  { path: "/pet-profile", element: <Protected><LazyPage component={Profile} pageName="פרופיל חיית המחמד" /></Protected> },
  { path: "/pet-profile/:petId", element: <Protected><LazyPage component={Profile} pageName="פרופיל חיית המחמד" /></Protected> },
  { path: "/edit-pet/:petId", element: <Protected><LazyPage component={EditPet} pageName="עריכת חיית מחמד" /></Protected> },
  { path: "/archived-pets", element: <Protected><LazyPage component={ArchivedPets} pageName="חיות מחמד בארכיון" /></Protected> },
  { path: "/breed-history/:petId", element: <Navigate to="/" replace /> },
  { path: "/photos", element: <Navigate to="/" replace /> },
  { path: "/documents", element: <Protected><LazyPage component={Documents} pageName="מסמכים" /></Protected> },
  { path: "/training", element: <Navigate to="/chat" replace /> },
  { path: "/grooming", element: <Navigate to="/chat" replace /> },
  { path: "/insurance", element: <Navigate to="/chat" replace /> },
  { path: "/dog-parks", element: <Navigate to="/chat" replace /> },
  { path: "/adoption", element: <Navigate to="/chat" replace /> },
  { path: "/breeds", element: <LazyPage component={Breeds} pageName="אנציקלופדיית גזעים" /> },
  { path: "/breed-quiz", element: <Navigate to="/breeds" replace /> },
  { path: "/breed-detect", element: <Navigate to="/chat" replace /> },
];

const EditProfile = lazy(() => import("@/pages/EditProfile"));
const Settings = lazy(() => import("@/pages/Settings"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Chat = lazy(() => import("@/pages/Chat"));
const OwnerProfile = lazy(() => import("@/pages/OwnerProfile"));

export const userRoutes: RouteObject[] = [
  { path: "/profile", element: <Protected><LazyPage component={OwnerProfile} pageName="הפרופיל שלי" /></Protected> },
  { path: "/edit-profile", element: <Protected><LazyPage component={EditProfile} pageName="עריכת פרופיל" /></Protected> },
  { path: "/settings", element: <Protected><LazyPage component={Settings} pageName="הגדרות" /></Protected> },
  { path: "/notifications", element: <Protected><LazyPage component={Notifications} pageName="התראות" /></Protected> },
  { path: "/messages", element: <Navigate to="/chat" replace /> },
  { path: "/messages/new", element: <Navigate to="/chat" replace /> },
  { path: "/messages/:userId", element: <Navigate to="/chat" replace /> },
  { path: "/privacy-settings", element: <Navigate to="/settings" replace /> },
  { path: "/chat", element: <Protected><LazyPage component={MainShell} pageName="צ'אט" /></Protected> },
  { path: "/owner-profile", element: <Protected><LazyPage component={OwnerProfile} pageName="הפרופיל שלי" /></Protected> },
];

export const businessRoutes: RouteObject[] = [
  { path: "/businesses", element: <Navigate to="/shop" replace /> },
  { path: "/business/:id", element: <Navigate to="/shop" replace /> },
  { path: "/convert-to-business", element: <Navigate to="/shop" replace /> },
  { path: "/creator-dashboard", element: <Navigate to="/" replace /> },
  { path: "/creator-analytics", element: <Navigate to="/" replace /> },
  { path: "/smart-notifications", element: <Navigate to="/notifications" replace /> },
  { path: "/business-settings", element: <Navigate to="/settings" replace /> },
  { path: "/business-crm", element: <Navigate to="/shop" replace /> },
  { path: "/product-sourcing", element: <Navigate to="/admin/quick-import" replace /> },
  { path: "/ad-campaigns", element: <Navigate to="/shop" replace /> },
  { path: "/parks", element: <Navigate to="/chat" replace /> },
  { path: "/experiences", element: <Navigate to="/chat" replace /> },
  { path: "/guides", element: <Navigate to="/chat" replace /> },
  { path: "/radar", element: <Navigate to="/" replace /> },
];

const Accessibility = lazy(() => import("@/pages/Accessibility"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const ClubTerms = lazy(() => import("@/pages/ClubTerms"));
const Support = lazy(() => import("@/pages/Support"));
const DataDeletion = lazy(() => import("@/pages/DataDeletion"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const FoundPet = lazy(() => import("@/pages/FoundPet"));
const ScienceTrust = lazy(() => import("@/pages/ScienceTrust"));

export const staticRoutes: RouteObject[] = [
  { path: "/found-pet/:petId", element: <LazyPage component={FoundPet} pageName="מצאתי חיית מחמד" /> },
  { path: "/science", element: <LazyPage component={ScienceTrust} pageName="מדע ואמון" /> },
  { path: "/accessibility", element: <LazyPage component={Accessibility} pageName="נגישות" /> },
  { path: "/privacy-policy", element: <LazyPage component={Privacy} pageName="מדיניות פרטיות" /> },
  { path: "/terms", element: <LazyPage component={Terms} pageName="תנאי שימוש" /> },
  { path: "/club-terms", element: <LazyPage component={ClubTerms} pageName="תנאי מועדון" /> },
  { path: "/support", element: <Protected><LazyPage component={Support} pageName="תמיכה" /></Protected> },
  { path: "/data-deletion", element: <LazyPage component={DataDeletion} pageName="מחיקת נתונים" /> },
  { path: "*", element: <LazyPage component={NotFound} pageName="עמוד לא נמצא" /> },
];

const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminChangePassword = lazy(() => import("@/pages/admin/AdminChangePassword"));
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminOrders = lazy(() => import("@/pages/admin/AdminOrders"));
const AdminProducts = lazy(() => import("@/pages/admin/AdminProducts"));
const AdminCoupons = lazy(() => import("@/pages/admin/AdminCoupons"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminCategories = lazy(() => import("@/pages/admin/AdminCategories"));
const AdminEconomics = lazy(() => import("@/pages/admin/AdminEconomics"));
const AdminQuickImport = lazy(() => import("@/pages/admin/AdminQuickImport"));
const AdminSmartProductEditor = lazy(() => import("@/pages/admin/AdminSmartProductEditor"));
const AdminNotifications = lazy(() => import("@/pages/admin/AdminNotifications"));

const AdminPage = ({
  component: Component,
  pageName,
  permission,
}: {
  component: ComponentType;
  pageName: string;
  permission: AdminPermission;
}) => (
  <Admin permission={permission}>
    <LazyPage component={Component} pageName={pageName} />
  </Admin>
);

const legacyAdminPaths = [
  "/admin/growo",
  "/admin/parks",
  "/admin/adoption",
  "/admin/reports",
  "/admin/roles",
  "/admin/users",
  "/admin/business",
  "/admin/audit",
  "/admin/financial",
  "/admin/tasks",
  "/admin/suppliers",
  "/admin/leads",
  "/admin/debts",
  "/admin/inventory",
  "/admin/purchase-orders",
  "/admin/invoices",
  "/admin/marketing",
  "/admin/segments",
  "/admin/shipping",
  "/admin/returns",
  "/admin/integrations",
  "/admin/backup",
  "/admin/crm",
  "/admin/calendar",
  "/admin/helpdesk",
  "/admin/branches",
  "/admin/pricing",
  "/admin/webhooks",
  "/admin/blog",
  "/admin/stories",
  "/admin/feed-manager",
  "/admin/pet-services",
  "/admin/notification-rules",
  "/admin/automations",
  "/admin/time-tracking",
  "/admin/data-import",
  "/admin/ai-service",
  "/admin/control-room",
  "/admin/data-hub",
  "/admin/ocr-verification",
  "/admin/approval-queue",
  "/admin/bot-activity",
  "/admin/inventory-predictions",
  "/admin/content-bot",
  "/admin/content-calendar",
  "/admin/robot-fleet",
  "/admin/action-center",
  "/admin/smart-calendar",
  "/admin/integration-hub",
  "/admin/health-check",
  "/admin/test-suite",
  "/admin/shipping-settings",
  "/admin/vendor-dashboard",
  "/admin/compliance-finance",
  "/admin/user-timeline",
  "/admin/research-lab",
  "/admin/brain-dashboard",
  "/admin/vendor-audit",
  "/admin/command-center",
  "/admin/supplier-negotiation",
  "/admin/ceo",
  "/admin/architect",
  "/admin/prometheus",
  "/admin/sovereign",
  "/admin/ai-os",
  "/admin/ai-os-admin",
];

const legacyAdminRedirects = legacyAdminPaths.map((path) => {
  if (path === "/admin/growo") {
    return { path, element: <Navigate to="/admin/products" replace /> };
  }

  if (path === "/admin/data-import") {
    return { path, element: <Navigate to="/admin/quick-import" replace /> };
  }

  return { path, element: <Navigate to="/admin/analytics" replace /> };
});

export const adminRoutes: RouteObject[] = [
  { path: "/admin/login", element: <LazyPage component={AdminLogin} pageName="כניסת מנהל" /> },
  { path: "/admin/change-password", element: <Admin><LazyPage component={AdminChangePassword} pageName="בחירת סיסמה" /></Admin> },
  { path: "/admin", element: <Navigate to="/admin/products" replace /> },
  { path: "/admin/analytics", element: <AdminPage component={AdminAnalytics} pageName="אנליטיקס" permission={ADMIN_PERMISSIONS.FULL_ACCESS} /> },
  { path: "/admin/ai-economics", element: <AdminPage component={AdminEconomics} pageName="כלכלת AI" permission={ADMIN_PERMISSIONS.FULL_ACCESS} /> },
  { path: "/admin/orders", element: <AdminPage component={AdminOrders} pageName="הזמנות" permission={ADMIN_PERMISSIONS.FULL_ACCESS} /> },
  { path: "/admin/products", element: <AdminPage component={AdminProducts} pageName="מוצרים" permission={ADMIN_PERMISSIONS.PRODUCTS_READ} /> },
  { path: "/admin/coupons", element: <AdminPage component={AdminCoupons} pageName="קופונים" permission={ADMIN_PERMISSIONS.FULL_ACCESS} /> },
  { path: "/admin/settings", element: <AdminPage component={AdminSettings} pageName="הגדרות" permission={ADMIN_PERMISSIONS.FULL_ACCESS} /> },
  { path: "/admin/categories", element: <AdminPage component={AdminCategories} pageName="קטגוריות" permission={ADMIN_PERMISSIONS.FULL_ACCESS} /> },
  { path: "/admin/notifications", element: <AdminPage component={AdminNotifications} pageName="התראות" permission={ADMIN_PERMISSIONS.FULL_ACCESS} /> },
  { path: "/admin/quick-import", element: <AdminPage component={AdminQuickImport} pageName="ייבוא מהיר" permission={ADMIN_PERMISSIONS.PRODUCT_TOOLS_USE} /> },
  { path: "/admin/smart-editor", element: <AdminPage component={AdminSmartProductEditor} pageName="עורך מוצר חכם" permission={ADMIN_PERMISSIONS.PRODUCT_TOOLS_USE} /> },
  { path: "/admin/review-queue", element: <Navigate to="/admin/products?filter=needs_review" replace /> },
  { path: "/admin/scraper", element: <Navigate to="/admin/quick-import" replace /> },
  ...legacyAdminRedirects,
];

export const factoryRoutes: RouteObject[] = [
  { path: "/factory/auth", element: <Navigate to="/admin/login" replace /> },
  { path: "/factory", element: <Navigate to="/admin/products" replace /> },
];

export const allRoutes: RouteObject[] = [
  ...authRoutes,
  ...feedRoutes,
  ...shopRoutes,
  ...petRoutes,
  ...userRoutes,
  ...businessRoutes,
  ...adminRoutes,
  ...factoryRoutes,
  ...staticRoutes,
];

if (import.meta.env.DEV) {
  const paths = allRoutes.map((route) => route.path).filter(Boolean);
  const duplicates = paths.filter((path, index) => paths.indexOf(path) !== index);
  if (duplicates.length > 0) {
    console.warn("[Routes] Duplicate routes detected:", duplicates);
  }
}
