/**
 * ROUTE CONFIGURATION - SINGLE SOURCE OF TRUTH
 * =============================================
 * All routes are defined here with lazy loading by module.
 * Route changes should ONLY be made in this file.
 */

import { lazy, Suspense, ComponentType } from "react";
import { Navigate, RouteObject } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { PageTransition } from "@/components/PageTransition";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";

// Loading spinner component
const LoadingSpinner = ({ dark = false }: { dark?: boolean }) => (
  <div className={`min-h-screen flex items-center justify-center ${dark ? 'bg-black' : 'bg-background'}`}>
    <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${dark ? 'border-white' : 'border-primary'}`} />
  </div>
);

// Wrapper for lazy loaded components
const LazyPage = ({ 
  component: Component, 
  pageName,
  dark = false 
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

// Protected wrapper
const Protected = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

// Admin wrapper
const Admin = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AdminRoute>{children}</AdminRoute>
  </ProtectedRoute>
);

// ==========================================
// AUTH MODULE - Direct imports (critical path)
// ==========================================
import Auth from "@/pages/Auth";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Install from "@/pages/Install";
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const AuthCallback = lazy(() => import("@/pages/AuthCallback"));

export const authRoutes: RouteObject[] = [
  { path: "/auth", element: <PageTransition><Auth /></PageTransition> },
  { path: "/auth/callback", element: <Suspense fallback={<LoadingSpinner />}><AuthCallback /></Suspense> },
  { path: "/signup", element: <PageTransition><Signup /></PageTransition> },
  { path: "/forgot-password", element: <PageTransition><ForgotPassword /></PageTransition> },
  { path: "/reset-password", element: <PageTransition><ResetPassword /></PageTransition> },
  { path: "/install", element: <PageTransition><Install /></PageTransition> },
  { path: "/onboarding", element: <Protected><LazyPage component={Onboarding} pageName="הצטרפות" /></Protected> },
];

// ==========================================
// MAIN SHELL — persistent Feed + overlays
// ==========================================
const MainShell = lazy(() => import("@/components/MainShell"));

// ==========================================
// FEED MODULE - Lazy loaded
// ==========================================
const Explore = lazy(() => import("@/pages/Explore"));
const Reels = lazy(() => import("@/pages/Reels"));
const UserProfile = lazy(() => import("@/pages/UserProfile"));
const PostDetail = lazy(() => import("@/pages/PostDetail"));
const StoryViewer = lazy(() => import("@/pages/StoryViewer"));
const HighlightViewer = lazy(() => import("@/pages/HighlightViewer"));

// Live Streaming
const LivePage = lazy(() => import("@/pages/LivePage"));
const LiveStreamViewer = lazy(() => import("@/components/live/LiveStreamViewer").then(m => ({ default: m.LiveStreamViewer })));
const LiveBroadcaster = lazy(() => import("@/components/live/LiveBroadcaster").then(m => ({ default: m.LiveBroadcaster })));

// SoundtrackFeed is loaded internally by MainShell — no route-level import needed

export const feedRoutes: RouteObject[] = [
  // Main shell handles /, /feed, /chat, /shop — Feed always stays mounted
  { path: "/", element: <Protected><LazyPage component={MainShell} pageName="בית" /></Protected> },
  { path: "/feed", element: <LazyPage component={MainShell} pageName="פיד" /> },
  // Legacy routes - redirect to new locations
  { path: "/old-feed", element: <Navigate to="/feed" replace /> },
  { path: "/explore", element: <LazyPage component={Explore} pageName="גילוי" /> },
  { path: "/reels", element: <LazyPage component={Reels} pageName="Reels" dark /> },
  { path: "/user/:userId", element: <LazyPage component={UserProfile} pageName="פרופיל משתמש" /> },
  { path: "/profile/:userId", element: <LazyPage component={UserProfile} pageName="פרופיל משתמש" /> },
  { path: "/post/:postId", element: <LazyPage component={PostDetail} pageName="פוסט" /> },
  { 
    path: "/story/:userId", 
    element: (
      <Suspense fallback={<LoadingSpinner dark />}>
        <StoryViewer />
      </Suspense>
    )
  },
  { 
    path: "/highlight/:highlightId", 
    element: (
      <Suspense fallback={<LoadingSpinner dark />}>
        <HighlightViewer />
      </Suspense>
    )
  },
  // Live Streaming Routes
  { path: "/live", element: <LazyPage component={LivePage} pageName="שידורים חיים" /> },
  { 
    path: "/live/:streamId", 
    element: (
      <Suspense fallback={<LoadingSpinner dark />}>
        <LiveStreamViewer />
      </Suspense>
    )
  },
  { 
    path: "/live/:streamId/broadcast", 
    element: (
      <Protected>
        <Suspense fallback={<LoadingSpinner dark />}>
          <LiveBroadcaster />
        </Suspense>
      </Protected>
    )
  },
];

// ==========================================
// SHOP MODULE - Lazy loaded
// ==========================================
const Shop = lazy(() => import("@/pages/Shop"));
const ShopFeed = lazy(() => import("@/pages/ShopFeed"));
const ShopExplore = lazy(() => import("@/pages/ShopExplore"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
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
  // /shop is handled by MainShell overlay — this route points to MainShell
  { path: "/shop", element: <LazyPage component={MainShell} pageName="החנות" /> },
  { path: "/shop/explore", element: <LazyPage component={ShopExplore} pageName="גילוי מוצרים" /> },
  { path: "/shop/feed", element: <LazyPage component={ShopFeed} pageName="Shop Feed" dark /> },
  
  { path: "/product/:id", element: <LazyPage component={ProductDetail} pageName="פרטי מוצר" /> },
  { path: "/cart", element: <Protected><LazyPage component={Cart} pageName="עגלת קניות" /></Protected> },
  { path: "/favorites", element: <Protected><LazyPage component={Favorites} pageName="מועדפים" /></Protected> },
  { path: "/checkout", element: <Protected><LazyPage component={Checkout} pageName="תשלום" /></Protected> },
  { path: "/order-confirmation", element: <Protected><LazyPage component={OrderConfirmation} pageName="אישור הזמנה" /></Protected> },
  { path: "/reorder-confirmation", element: <Protected><LazyPage component={ReorderConfirmation} pageName="אישור הזמנה מחדש" /></Protected> },
  { path: "/order-history", element: <Protected><LazyPage component={OrderHistory} pageName="היסטוריית הזמנות" /></Protected> },
  { path: "/order-tracking/:orderId", element: <Protected><LazyPage component={OrderTrackingPage} pageName="מעקב הזמנה" /></Protected> },
  
  { path: "/payment-success", element: <LazyPage component={PaymentSuccess} pageName="תשלום הצליח" /> },
  { path: "/payment-failed", element: <LazyPage component={PaymentFailed} pageName="תשלום נכשל" /> },
];

// ==========================================
// PET MODULE - Lazy loaded
// ==========================================
const AddPet = lazy(() => import("@/pages/AddPet"));
// PetDetails page removed — /pet/:petId now redirects to /
const EditPet = lazy(() => import("@/pages/EditPet"));
const ArchivedPets = lazy(() => import("@/pages/ArchivedPets"));
const BreedHistory = lazy(() => import("@/pages/BreedHistory"));
const Photos = lazy(() => import("@/pages/Photos"));
const Documents = lazy(() => import("@/pages/Documents"));
// Training, Grooming, Insurance, Adoption - removed (redirected to /chat)
const Breeds = lazy(() => import("@/pages/Breeds"));
const BreedQuiz = lazy(() => import("@/pages/BreedQuiz"));
const BreedDetect = lazy(() => import("@/pages/BreedDetect"));
const PetProfileRedirect = lazy(() => import("@/pages/PetProfileRedirect"));

export const petRoutes: RouteObject[] = [
  { path: "/add-pet", element: <Protected><LazyPage component={AddPet} pageName="הוספת חיית מחמד" /></Protected> },
  { path: "/pet/:petId", element: <Navigate to="/" replace /> },
  { path: "/pet/:petId/*", element: <Navigate to="/" replace /> },
  { path: "/pet-profile", element: <Navigate to="/" replace /> },
  { path: "/pet-profile/:petId", element: <Protected><LazyPage component={PetProfileRedirect} pageName="פרופיל חיית מחמד" /></Protected> },
  { path: "/edit-pet/:petId", element: <Protected><LazyPage component={EditPet} pageName="עריכת חיית מחמד" /></Protected> },
  { path: "/archived-pets", element: <Protected><LazyPage component={ArchivedPets} pageName="חיות מחמד בארכיון" /></Protected> },
  { path: "/breed-history/:petId", element: <Protected><LazyPage component={BreedHistory} pageName="היסטוריית גזע" /></Protected> },
  { path: "/photos", element: <Protected><LazyPage component={Photos} pageName="תמונות" /></Protected> },
  { path: "/documents", element: <Protected><LazyPage component={Documents} pageName="מסמכים" /></Protected> },
  { path: "/training", element: <Navigate to="/chat" replace /> },
  { path: "/grooming", element: <Navigate to="/chat" replace /> },
  { path: "/insurance", element: <Navigate to="/chat" replace /> },
  { path: "/dog-parks", element: <Navigate to="/chat" replace /> },
  { path: "/adoption", element: <Navigate to="/chat" replace /> },
  { path: "/breeds", element: <LazyPage component={Breeds} pageName="אנציקלופדיית גזעים" /> },
  { path: "/breed-quiz", element: <LazyPage component={BreedQuiz} pageName="שאלון התאמת גזע" /> },
  { path: "/breed-detect", element: <LazyPage component={BreedDetect} pageName="זיהוי גזע" /> },
];

// ==========================================
// USER MODULE - Lazy loaded
// ==========================================
// Profile is loaded in feedRoutes as the main home page
const EditProfile = lazy(() => import("@/pages/EditProfile"));
const Settings = lazy(() => import("@/pages/Settings"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Messages = lazy(() => import("@/pages/Messages"));
const MessageThread = lazy(() => import("@/pages/MessageThread"));
const NewMessage = lazy(() => import("@/pages/NewMessage"));
const PrivacySettings = lazy(() => import("@/pages/PrivacySettings"));
const Chat = lazy(() => import("@/pages/Chat"));
const OwnerProfile = lazy(() => import("@/pages/OwnerProfile"));

export const userRoutes: RouteObject[] = [
  // Profile is now at root
  { path: "/profile", element: <Navigate to="/" replace /> },
  { path: "/edit-profile", element: <Protected><LazyPage component={EditProfile} pageName="עריכת פרופיל" /></Protected> },
  { path: "/settings", element: <Protected><LazyPage component={Settings} pageName="הגדרות" /></Protected> },
  { path: "/notifications", element: <Protected><LazyPage component={Notifications} pageName="התראות" /></Protected> },
  { path: "/messages", element: <Protected><LazyPage component={Messages} pageName="הודעות" /></Protected> },
  { path: "/messages/new", element: <Protected><LazyPage component={NewMessage} pageName="הודעה חדשה" /></Protected> },
  { path: "/messages/:userId", element: <Protected><LazyPage component={MessageThread} pageName="שיחה" /></Protected> },
  { path: "/privacy-settings", element: <Protected><LazyPage component={PrivacySettings} pageName="הגדרות פרטיות" /></Protected> },
  // /chat is handled by MainShell overlay
  { path: "/chat", element: <Protected><LazyPage component={MainShell} pageName="צ'אט" /></Protected> },
  { path: "/owner-profile", element: <Protected><LazyPage component={OwnerProfile} pageName="הפרופיל שלי" /></Protected> },
];

// ==========================================
// BUSINESS MODULE - Lazy loaded
// ==========================================
const BusinessDirectory = lazy(() => import("@/pages/BusinessDirectory"));
const BusinessProfile = lazy(() => import("@/pages/BusinessProfile"));
const ConvertToBusiness = lazy(() => import("@/pages/ConvertToBusiness"));
const AdCampaigns = lazy(() => import("@/pages/AdCampaigns"));
// Parks - removed (redirected to /chat)
const Experiences = lazy(() => import("@/pages/Experiences"));
const Guides = lazy(() => import("@/pages/Guides"));
const Radar = lazy(() => import("@/pages/Radar"));
const CreatorDashboard = lazy(() => import("@/pages/CreatorDashboard"));
const CreatorAnalytics = lazy(() => import("@/pages/CreatorAnalytics"));
const ProductSourcing = lazy(() => import("@/pages/ProductSourcing"));
const SmartNotifications = lazy(() => import("@/pages/SmartNotifications"));
const BusinessSettings = lazy(() => import("@/pages/BusinessSettings"));
const BusinessCRM = lazy(() => import("@/pages/BusinessCRM"));

export const businessRoutes: RouteObject[] = [
  { path: "/businesses", element: <LazyPage component={BusinessDirectory} pageName="ספריית עסקים" /> },
  { path: "/business/:id", element: <LazyPage component={BusinessProfile} pageName="פרופיל עסק" /> },
  { path: "/convert-to-business", element: <Protected><LazyPage component={ConvertToBusiness} pageName="המרה לעסק" /></Protected> },
  { path: "/creator-dashboard", element: <Protected><LazyPage component={CreatorDashboard} pageName="Creator Studio" /></Protected> },
  { path: "/creator-analytics", element: <Protected><LazyPage component={CreatorAnalytics} pageName="Creator Analytics" /></Protected> },
  { path: "/smart-notifications", element: <Protected><LazyPage component={SmartNotifications} pageName="מרכז התראות" /></Protected> },
  { path: "/business-settings", element: <Protected><LazyPage component={BusinessSettings} pageName="הגדרות עסק" /></Protected> },
  { path: "/business-crm", element: <Protected><LazyPage component={BusinessCRM} pageName="ניהול לקוחות" /></Protected> },
  { path: "/product-sourcing", element: <Protected><LazyPage component={ProductSourcing} pageName="קטלוג מוצרים" /></Protected> },
  { path: "/ad-campaigns", element: <LazyPage component={AdCampaigns} pageName="קמפיינים" /> },
  { path: "/parks", element: <Navigate to="/chat" replace /> },
  { path: "/experiences", element: <LazyPage component={Experiences} pageName="חוויות" /> },
  { path: "/guides", element: <LazyPage component={Guides} pageName="מדריכים" /> },
  { path: "/radar", element: <Protected><LazyPage component={Radar} pageName="רדאר" dark /></Protected> },
];

// ==========================================
// STATIC PAGES - Lazy loaded
// ==========================================
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

// ==========================================
// ADMIN MODULE - All lazy loaded
// ==========================================
const AdminGrowo = lazy(() => import("@/pages/admin/AdminGrowo"));
const AdminOrders = lazy(() => import("@/pages/admin/AdminOrders"));
const AdminParks = lazy(() => import("@/pages/admin/AdminParks"));
const AdminAdoption = lazy(() => import("@/pages/admin/AdminAdoption"));
const AdminReports = lazy(() => import("@/pages/admin/AdminReports"));
const AdminRoles = lazy(() => import("@/pages/admin/AdminRoles"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminProducts = lazy(() => import("@/pages/admin/AdminProducts"));
const AdminCoupons = lazy(() => import("@/pages/admin/AdminCoupons"));
const AdminBusiness = lazy(() => import("@/pages/admin/AdminBusiness"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminAudit = lazy(() => import("@/pages/admin/AdminAudit"));
const AdminScraper = lazy(() => import("@/pages/admin/AdminScraper"));
const AdminFinancial = lazy(() => import("@/pages/admin/AdminFinancial"));
const AdminTasks = lazy(() => import("@/pages/admin/AdminTasks"));
const AdminSuppliers = lazy(() => import("@/pages/admin/AdminSuppliers"));
const AdminLeads = lazy(() => import("@/pages/admin/AdminLeads"));
const AdminDebts = lazy(() => import("@/pages/admin/AdminDebts"));
const AdminInventory = lazy(() => import("@/pages/admin/AdminInventory"));
const AdminPurchaseOrders = lazy(() => import("@/pages/admin/AdminPurchaseOrders"));
const AdminInvoices = lazy(() => import("@/pages/admin/AdminInvoices"));
const AdminMarketing = lazy(() => import("@/pages/admin/AdminMarketing"));
const AdminCustomerSegments = lazy(() => import("@/pages/admin/AdminCustomerSegments"));
const AdminShipping = lazy(() => import("@/pages/admin/AdminShipping"));
const AdminReturns = lazy(() => import("@/pages/admin/AdminReturns"));
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminIntegrations = lazy(() => import("@/pages/admin/AdminIntegrations"));
const AdminBackup = lazy(() => import("@/pages/admin/AdminBackup"));
const AdminCRM = lazy(() => import("@/pages/admin/AdminCRM"));
const AdminCategories = lazy(() => import("@/pages/admin/AdminCategories"));
const AdminCalendar = lazy(() => import("@/pages/admin/AdminCalendar"));
const AdminHelpDesk = lazy(() => import("@/pages/admin/AdminHelpDesk"));
const AdminBranches = lazy(() => import("@/pages/admin/AdminBranches"));
const AdminPricing = lazy(() => import("@/pages/admin/AdminPricing"));
const AdminWebhooks = lazy(() => import("@/pages/admin/AdminWebhooks"));
const AdminBlog = lazy(() => import("@/pages/admin/AdminBlog"));
const AdminStories = lazy(() => import("@/pages/admin/AdminStories"));
const AdminFeedManager = lazy(() => import("@/pages/admin/AdminFeedManager"));
const AdminNotifications = lazy(() => import("@/pages/admin/AdminNotifications"));
const AdminPetServices = lazy(() => import("@/pages/admin/AdminPetServices"));

const AdminNotificationRules = lazy(() => import("@/pages/admin/AdminNotificationRules"));
const AdminAutomations = lazy(() => import("@/pages/admin/AdminAutomations"));
const AdminTimeTracking = lazy(() => import("@/pages/admin/AdminTimeTracking"));
const AdminDataImport = lazy(() => import("@/pages/admin/AdminDataImport"));
const AdminAIService = lazy(() => import("@/pages/admin/AdminAIService"));
const AIControlRoom = lazy(() => import("@/pages/admin/AIControlRoom"));
const AdminDataHub = lazy(() => import("@/pages/admin/AdminDataHub"));
const AdminQuickImport = lazy(() => import("@/pages/admin/AdminQuickImport"));
const AdminOCRVerification = lazy(() => import("@/pages/admin/AdminOCRVerification"));
const AdminSmartProductEditor = lazy(() => import("@/pages/admin/AdminSmartProductEditor"));
const AdminReviewQueue = lazy(() => import("@/pages/admin/AdminReviewQueue"));
const AdminApprovalQueue = lazy(() => import("@/pages/admin/AdminApprovalQueue"));
const AdminBotActivityLog = lazy(() => import("@/pages/admin/AdminBotActivityLog"));
const AdminInventoryPredictions = lazy(() => import("@/pages/admin/AdminInventoryPredictions"));
const AdminContentBot = lazy(() => import("@/pages/admin/AdminContentBot"));
const AdminContentCalendar = lazy(() => import("@/pages/admin/AdminContentCalendar"));
const AdminRobotFleet = lazy(() => import("@/pages/admin/AdminRobotFleet"));
const AdminActionCenter = lazy(() => import("@/pages/admin/AdminActionCenter"));
const AdminSmartCalendar = lazy(() => import("@/pages/admin/AdminSmartCalendar"));
const AdminIntegrationHub = lazy(() => import("@/pages/admin/AdminIntegrationHub"));
const AdminHealthCheck = lazy(() => import("@/pages/admin/AdminHealthCheck"));
const AdminTestSuite = lazy(() => import("@/pages/admin/AdminTestSuite"));
const AdminShippingSettings = lazy(() => import("@/pages/admin/AdminShippingSettings"));
const AdminVendorDashboard = lazy(() => import("@/pages/admin/AdminVendorDashboard"));
const AdminComplianceFinance = lazy(() => import("@/pages/admin/AdminComplianceFinance"));
const AdminUserTimeline = lazy(() => import("@/pages/admin/AdminUserTimeline"));
const AdminResearchLab = lazy(() => import("@/pages/admin/AdminResearchLab"));
const AdminBrainDashboard = lazy(() => import("@/pages/admin/AdminBrainDashboard"));
const AdminVendorAudit = lazy(() => import("@/pages/admin/AdminVendorAudit"));
const AdminCommandCenter = lazy(() => import("@/pages/admin/AdminCommandCenter"));
const AdminSupplierNegotiation = lazy(() => import("@/pages/admin/AdminSupplierNegotiation"));
const CEODashboard = lazy(() => import("@/pages/admin/CEODashboard"));
const AdminArchitectConsole = lazy(() => import("@/pages/admin/AdminArchitectConsole"));
const AdminPrometheus = lazy(() => import("@/pages/admin/AdminPrometheus"));
const SovereignDashboard = lazy(() => import("@/pages/admin/SovereignDashboard"));

// Helper for admin routes
const AdminPage = ({ component: Component, pageName }: { component: ComponentType; pageName: string }) => (
  <Admin>
    <LazyPage component={Component} pageName={pageName} />
  </Admin>
);

export const adminRoutes: RouteObject[] = [
  // Default admin route - redirect to growo dashboard
  { path: "/admin", element: <Navigate to="/admin/growo" replace /> },

  // Main admin pages
  { path: "/admin/growo", element: <AdminPage component={AdminGrowo} pageName="לוח בקרה" /> },
  { path: "/admin/orders", element: <AdminPage component={AdminOrders} pageName="הזמנות" /> },
  { path: "/admin/parks", element: <AdminPage component={AdminParks} pageName="גינות כלבים" /> },
  { path: "/admin/adoption", element: <AdminPage component={AdminAdoption} pageName="אימוץ" /> },
  { path: "/admin/reports", element: <AdminPage component={AdminReports} pageName="דיווחים" /> },
  { path: "/admin/roles", element: <AdminPage component={AdminRoles} pageName="תפקידים" /> },
  { path: "/admin/users", element: <AdminPage component={AdminUsers} pageName="משתמשים" /> },
  { path: "/admin/products", element: <AdminPage component={AdminProducts} pageName="מוצרים" /> },
  { path: "/admin/coupons", element: <AdminPage component={AdminCoupons} pageName="קופונים" /> },
  { path: "/admin/business", element: <AdminPage component={AdminBusiness} pageName="עסקים" /> },
  { path: "/admin/settings", element: <AdminPage component={AdminSettings} pageName="הגדרות" /> },
  { path: "/admin/audit", element: <AdminPage component={AdminAudit} pageName="יומן פעולות" /> },
  { path: "/admin/scraper", element: <AdminPage component={AdminScraper} pageName="סקרייפר" /> },
  { path: "/admin/financial", element: <AdminPage component={AdminFinancial} pageName="פיננסי" /> },
  { path: "/admin/tasks", element: <AdminPage component={AdminTasks} pageName="משימות" /> },
  { path: "/admin/suppliers", element: <AdminPage component={AdminSuppliers} pageName="ספקים" /> },
  { path: "/admin/leads", element: <AdminPage component={AdminLeads} pageName="לידים" /> },
  { path: "/admin/debts", element: <AdminPage component={AdminDebts} pageName="חובות" /> },
  { path: "/admin/inventory", element: <AdminPage component={AdminInventory} pageName="מלאי" /> },
  { path: "/admin/purchase-orders", element: <AdminPage component={AdminPurchaseOrders} pageName="הזמנות רכש" /> },
  { path: "/admin/invoices", element: <AdminPage component={AdminInvoices} pageName="חשבוניות" /> },
  { path: "/admin/marketing", element: <AdminPage component={AdminMarketing} pageName="שיווק" /> },
  { path: "/admin/segments", element: <AdminPage component={AdminCustomerSegments} pageName="סגמנטים" /> },
  { path: "/admin/shipping", element: <AdminPage component={AdminShipping} pageName="משלוחים" /> },
  { path: "/admin/returns", element: <AdminPage component={AdminReturns} pageName="החזרות" /> },
  { path: "/admin/analytics", element: <AdminPage component={AdminAnalytics} pageName="אנליטיקס" /> },
  { path: "/admin/integrations", element: <AdminPage component={AdminIntegrations} pageName="אינטגרציות" /> },
  { path: "/admin/backup", element: <AdminPage component={AdminBackup} pageName="גיבוי" /> },
  { path: "/admin/crm", element: <AdminPage component={AdminCRM} pageName="CRM" /> },
  { path: "/admin/categories", element: <AdminPage component={AdminCategories} pageName="קטגוריות" /> },
  { path: "/admin/calendar", element: <AdminPage component={AdminCalendar} pageName="יומן" /> },
  { path: "/admin/helpdesk", element: <AdminPage component={AdminHelpDesk} pageName="תמיכה" /> },
  { path: "/admin/branches", element: <AdminPage component={AdminBranches} pageName="סניפים" /> },
  { path: "/admin/pricing", element: <AdminPage component={AdminPricing} pageName="תמחור" /> },
  { path: "/admin/webhooks", element: <AdminPage component={AdminWebhooks} pageName="Webhooks" /> },
  { path: "/admin/blog", element: <AdminPage component={AdminBlog} pageName="בלוג" /> },
  { path: "/admin/stories", element: <AdminPage component={AdminStories} pageName="סטוריז" /> },
  { path: "/admin/feed-manager", element: <AdminPage component={AdminFeedManager} pageName="ניהול פיד" /> },
  { path: "/admin/notifications", element: <AdminPage component={AdminNotifications} pageName="מרכז התראות" /> },
  { path: "/admin/pet-services", element: <AdminPage component={AdminPetServices} pageName="שירותי חיות מחמד" /> },
  
  { path: "/admin/notification-rules", element: <AdminPage component={AdminNotificationRules} pageName="כללי התראות" /> },
  { path: "/admin/automations", element: <AdminPage component={AdminAutomations} pageName="אוטומציות" /> },
  { path: "/admin/time-tracking", element: <AdminPage component={AdminTimeTracking} pageName="מעקב זמן" /> },
  { path: "/admin/data-import", element: <AdminPage component={AdminDataImport} pageName="ייבוא נתונים" /> },
  { path: "/admin/ai-service", element: <AdminPage component={AdminAIService} pageName="שירות AI" /> },
  { path: "/admin/control-room", element: <AdminPage component={AIControlRoom} pageName="חדר בקרה" /> },
   { path: "/admin/data-hub", element: <AdminPage component={AdminDataHub} pageName="Data Hub" /> },
  { path: "/admin/quick-import", element: <AdminPage component={AdminQuickImport} pageName="ייבוא מהיר" /> },
  { path: "/admin/ocr-verification", element: <AdminPage component={AdminOCRVerification} pageName="אימות OCR" /> },
  { path: "/admin/smart-editor", element: <AdminPage component={AdminSmartProductEditor} pageName="עורך מוצר חכם" /> },
  { path: "/admin/review-queue", element: <AdminPage component={AdminReviewQueue} pageName="תור ביקורת" /> },
  { path: "/admin/approval-queue", element: <AdminPage component={AdminApprovalQueue} pageName="תור אישורים" /> },
  { path: "/admin/bot-activity", element: <AdminPage component={AdminBotActivityLog} pageName="לוג בוטים" /> },
  { path: "/admin/inventory-predictions", element: <AdminPage component={AdminInventoryPredictions} pageName="חיזוי מלאי NRC" /> },
  { path: "/admin/content-bot", element: <AdminPage component={AdminContentBot} pageName="Content Creation Bot" /> },
  { path: "/admin/content-calendar", element: <AdminPage component={AdminContentCalendar} pageName="לוח תוכן שבועי" /> },
  { path: "/admin/robot-fleet", element: <AdminPage component={AdminRobotFleet} pageName="Robot Fleet" /> },
  { path: "/admin/action-center", element: <AdminPage component={AdminActionCenter} pageName="Action Center" /> },
  { path: "/admin/smart-calendar", element: <AdminPage component={AdminSmartCalendar} pageName="לוח תוכן חכם" /> },
  { path: "/admin/integration-hub", element: <AdminPage component={AdminIntegrationHub} pageName="Integration Hub" /> },
  { path: "/admin/health-check", element: <AdminPage component={AdminHealthCheck} pageName="Health Check" /> },
  { path: "/admin/test-suite", element: <AdminPage component={AdminTestSuite} pageName="Test Suite" /> },
  { path: "/admin/shipping-settings", element: <AdminPage component={AdminShippingSettings} pageName="הגדרות משלוחים" /> },
  { path: "/admin/vendor-dashboard", element: <AdminPage component={AdminVendorDashboard} pageName="ניהול ספקים" /> },
  { path: "/admin/compliance-finance", element: <AdminPage component={AdminComplianceFinance} pageName="ציות ופיננסים" /> },
  { path: "/admin/user-timeline", element: <AdminPage component={AdminUserTimeline} pageName="מסע משתמש" /> },
  { path: "/admin/research-lab", element: <AdminPage component={AdminResearchLab} pageName="מעבדת מחקר" /> },
  { path: "/admin/brain-dashboard", element: <AdminPage component={AdminBrainDashboard} pageName="Brain Dashboard" /> },
  { path: "/admin/vendor-audit", element: <AdminPage component={AdminVendorAudit} pageName="ביקורת ספקים" /> },
  { path: "/admin/command-center", element: <AdminPage component={AdminCommandCenter} pageName="מרכז פיקוד" /> },
  { path: "/admin/supplier-negotiation", element: <AdminPage component={AdminSupplierNegotiation} pageName="משא״מ ספקים" /> },
  { path: "/admin/ceo", element: <AdminPage component={CEODashboard} pageName="דשבורד מנכ״ל" /> },
  { path: "/admin/architect", element: <AdminPage component={AdminArchitectConsole} pageName="Architect Console" /> },
  { path: "/admin/prometheus", element: <AdminPage component={AdminPrometheus} pageName="Prometheus — מאמן הסוכנים" /> },
  { path: "/admin/sovereign", element: <AdminPage component={SovereignDashboard} pageName="Sovereign Dashboard" /> },
];

// ==========================================
// ALL ROUTES COMBINED
// ==========================================
export const allRoutes: RouteObject[] = [
  ...authRoutes,
  ...feedRoutes,
  ...shopRoutes,
  ...petRoutes,
  ...userRoutes,
  ...businessRoutes,
  ...adminRoutes,
  ...staticRoutes,
];

// Route validation for development
if (process.env.NODE_ENV === 'development') {
  const paths = allRoutes.map(r => r.path).filter(Boolean);
  const duplicates = paths.filter((path, index) => paths.indexOf(path) !== index);
  if (duplicates.length > 0) {
    console.warn('[Routes] Duplicate routes detected:', duplicates);
  }
}
