import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { lazy, Suspense } from "react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PetPreferenceProvider } from "@/contexts/PetPreferenceContext";
import { GuestProvider } from "@/contexts/GuestContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
// PointsProvider removed - using useLoyalty hook instead
import { CartProvider } from "@/contexts/CartContext";
import { FlyingCartProvider } from "@/components/FlyingCartAnimation";
import { GameProvider } from "@/contexts/GameContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageTransition } from "@/components/PageTransition";

import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AddPet from "./pages/AddPet";

import Install from "./pages/Install";
const Feed = lazy(() => import("./pages/Feed"));
const Explore = lazy(() => import("./pages/Explore"));
const Reels = lazy(() => import("./pages/Reels"));
import UserProfile from "./pages/UserProfile";
import PostDetail from "./pages/PostDetail";
import StoryViewer from "./pages/StoryViewer";
import HighlightViewer from "./pages/HighlightViewer";
import Tracker from "./pages/Tracker";
const Shop = lazy(() => import("./pages/Shop"));
const ShopExplore = lazy(() => import("./pages/ShopExplore"));
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import OrderHistory from "./pages/OrderHistory";
import ArchivedPets from "./pages/ArchivedPets";
import PetDetails from "./pages/PetDetails";
import EditPet from "./pages/EditPet";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminParks from "./pages/admin/AdminParks";
import AdminAdoption from "./pages/admin/AdminAdoption";
import AdminReports from "./pages/admin/AdminReports";
const AdminRoles = lazy(() => import("./pages/admin/AdminRoles"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminBusiness = lazy(() => import("./pages/admin/AdminBusiness"));
const AdminNotify = lazy(() => import("./pages/admin/AdminNotify"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminAudit = lazy(() => import("./pages/admin/AdminAudit"));
const AdminProductImport = lazy(() => import("./pages/admin/AdminProductImport"));
const AdminScraper = lazy(() => import("./pages/admin/AdminScraper"));
const AdminFinancial = lazy(() => import("./pages/admin/AdminFinancial"));
const AdminTasks = lazy(() => import("./pages/admin/AdminTasks"));
const AdminSuppliers = lazy(() => import("./pages/admin/AdminSuppliers"));
const AdminLeads = lazy(() => import("./pages/admin/AdminLeads"));
const AdminDebts = lazy(() => import("./pages/admin/AdminDebts"));
const AdminInventory = lazy(() => import("./pages/admin/AdminInventory"));
const AdminPurchaseOrders = lazy(() => import("./pages/admin/AdminPurchaseOrders"));
const AdminInvoices = lazy(() => import("./pages/admin/AdminInvoices"));
const AdminMarketing = lazy(() => import("./pages/admin/AdminMarketing"));
const AdminCustomerSegments = lazy(() => import("./pages/admin/AdminCustomerSegments"));
const AdminShipping = lazy(() => import("./pages/admin/AdminShipping"));
const AdminReturns = lazy(() => import("./pages/admin/AdminReturns"));
const AdminStaff = lazy(() => import("./pages/admin/AdminStaff"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminIntegrations = lazy(() => import("./pages/admin/AdminIntegrations"));
const AdminBackup = lazy(() => import("./pages/admin/AdminBackup"));
const AdminCRM = lazy(() => import("./pages/admin/AdminCRM"));
const AdminSalesChannels = lazy(() => import("./pages/admin/AdminSalesChannels"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminCalendar = lazy(() => import("./pages/admin/AdminCalendar"));
const AdminHelpDesk = lazy(() => import("./pages/admin/AdminHelpDesk"));
const AdminBranches = lazy(() => import("./pages/admin/AdminBranches"));
const AdminPricing = lazy(() => import("./pages/admin/AdminPricing"));
const AdminWebhooks = lazy(() => import("./pages/admin/AdminWebhooks"));
const AdminAlerts = lazy(() => import("./pages/admin/AdminAlerts"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const AdminStories = lazy(() => import("./pages/admin/AdminStories"));
const AdminPets = lazy(() => import("./pages/admin/AdminPets"));
const AdminLoyalty = lazy(() => import("./pages/admin/AdminLoyalty"));
const AdminNotificationRules = lazy(() => import("./pages/admin/AdminNotificationRules"));
const AdminAutomations = lazy(() => import("./pages/admin/AdminAutomations"));
const AdminTimeTracking = lazy(() => import("./pages/admin/AdminTimeTracking"));
const AdminDataImport = lazy(() => import("./pages/admin/AdminDataImport"));
import BreedHistory from "./pages/BreedHistory";
import Insurance from "./pages/Insurance";
import Tasks from "./pages/Tasks";
import Rewards from "./pages/Rewards";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import NotFound from "./pages/NotFound";
import Chat from "./pages/Chat";
import Adoption from "./pages/Adoption";
import Experiences from "./pages/Experiences";
import Parks from "./pages/Parks";
import Photos from "./pages/Photos";
import Documents from "./pages/Documents";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
const Training = lazy(() => import("./pages/Training"));
import Grooming from "./pages/Grooming";
// Onboarding merged into AddPet
import Achievements from "./pages/Achievements";
import Messages from "./pages/Messages";
import MessageThread from "./pages/MessageThread";
import Accessibility from "./pages/Accessibility";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import ClubTerms from "./pages/ClubTerms";
import Favorites from "./pages/Favorites";
import AdCampaigns from "./pages/AdCampaigns";
import BusinessDirectory from "./pages/BusinessDirectory";
import BusinessProfile from "./pages/BusinessProfile";
import ConvertToBusiness from "./pages/ConvertToBusiness";
import PrivacySettings from "./pages/PrivacySettings";
import Pricing from "./pages/Pricing";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";

import Support from "./pages/Support";
import Deals from "./pages/Deals";
import { AdminRoute } from "./components/AdminRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageErrorBoundary } from "./components/PageErrorBoundary";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import Footer from "./components/Footer";
import { LoginPromptDialog } from "./components/LoginPromptDialog";
import ScrollToTop from "./components/ScrollToTop";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  useAdminNotifications();
  
  const authPages = ['/auth', '/signup', '/forgot-password', '/reset-password', '/install'];
  const showFooter = !authPages.includes(location.pathname);
  
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <LoginPromptDialog />
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><PageErrorBoundary pageName="הפיד"><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><Feed /></Suspense></PageErrorBoundary></PageTransition>} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/install" element={<PageTransition><Install /></PageTransition>} />
        
        <Route path="/support" element={<ProtectedRoute><PageTransition><Support /></PageTransition></ProtectedRoute>} />
        <Route path="/deals" element={<ProtectedRoute><PageTransition><Deals /></PageTransition></ProtectedRoute>} />
        <Route path="/add-pet" element={<ProtectedRoute><PageTransition><AddPet /></PageTransition></ProtectedRoute>} />
        <Route path="/archived-pets" element={<ProtectedRoute><PageTransition><ArchivedPets /></PageTransition></ProtectedRoute>} />
        <Route path="/pet/:petId" element={<ProtectedRoute><PageTransition><PetDetails /></PageTransition></ProtectedRoute>} />
        <Route path="/edit-pet/:petId" element={<ProtectedRoute><PageTransition><EditPet /></PageTransition></ProtectedRoute>} />
        <Route path="/breed-history/:petId" element={<ProtectedRoute><PageTransition><BreedHistory /></PageTransition></ProtectedRoute>} />
        <Route path="/user/:userId" element={<PageTransition><UserProfile /></PageTransition>} />
        <Route path="/post/:postId" element={<PageTransition><PostDetail /></PageTransition>} />
        <Route path="/story/:userId" element={<StoryViewer />} />
        <Route path="/highlight/:highlightId" element={<HighlightViewer />} />
        <Route path="/adoption" element={<PageTransition><Adoption /></PageTransition>} />
        <Route path="/reels" element={<PageTransition><PageErrorBoundary pageName="Reels"><Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>}><Reels /></Suspense></PageErrorBoundary></PageTransition>} />
        <Route path="/explore" element={<PageTransition><PageErrorBoundary pageName="גילוי"><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><Explore /></Suspense></PageErrorBoundary></PageTransition>} />
        <Route path="/tracker" element={<ProtectedRoute><PageTransition><Tracker /></PageTransition></ProtectedRoute>} />
<Route path="/shop" element={<PageTransition><PageErrorBoundary pageName="החנות"><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><Shop /></Suspense></PageErrorBoundary></PageTransition>} />
        <Route path="/shop/explore" element={<PageTransition><PageErrorBoundary pageName="גילוי מוצרים"><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><ShopExplore /></Suspense></PageErrorBoundary></PageTransition>} />
        <Route path="/product/:id" element={<PageTransition><ProductDetail /></PageTransition>} />
        <Route path="/cart" element={<ProtectedRoute><PageTransition><Cart /></PageTransition></ProtectedRoute>} />
        <Route path="/favorites" element={<ProtectedRoute><PageTransition><Favorites /></PageTransition></ProtectedRoute>} />
        <Route path="/checkout" element={<ProtectedRoute><PageTransition><Checkout /></PageTransition></ProtectedRoute>} />
        <Route path="/order-confirmation" element={<ProtectedRoute><PageTransition><OrderConfirmation /></PageTransition></ProtectedRoute>} />
        <Route path="/order-history" element={<ProtectedRoute><PageTransition><OrderHistory /></PageTransition></ProtectedRoute>} />
        <Route path="/insurance" element={<PageTransition><Insurance /></PageTransition>} />
        <Route path="/tasks" element={<ProtectedRoute><PageTransition><Tasks /></PageTransition></ProtectedRoute>} />
        <Route path="/rewards" element={<ProtectedRoute><PageTransition><Rewards /></PageTransition></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><PageTransition><Profile /></PageTransition></ProtectedRoute>} />
        <Route path="/edit-profile" element={<ProtectedRoute><PageTransition><EditProfile /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute><AdminRoute><PageTransition><AdminDashboard /></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/orders" element={<ProtectedRoute><AdminRoute><PageTransition><AdminOrders /></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/customers" element={<ProtectedRoute><AdminRoute><PageTransition><AdminCustomers /></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/parks" element={<ProtectedRoute><AdminRoute><PageTransition><AdminParks /></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/adoption" element={<ProtectedRoute><AdminRoute><PageTransition><AdminAdoption /></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute><AdminRoute><PageTransition><AdminReports /></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/roles" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminRoles /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminUsers /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/content" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminContent /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/products" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminProducts /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/products/import" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminProductImport /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/coupons" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminCoupons /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/business" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminBusiness /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/notify" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminNotify /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminSettings /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/audit" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminAudit /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/scraper" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminScraper /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/financial" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminFinancial /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/tasks" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminTasks /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/suppliers" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminSuppliers /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/leads" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminLeads /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/debts" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminDebts /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/inventory" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminInventory /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/purchase-orders" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminPurchaseOrders /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/invoices" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminInvoices /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/marketing" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminMarketing /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/segments" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminCustomerSegments /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/shipping" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminShipping /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/returns" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminReturns /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/staff" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminStaff /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminAnalytics /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/integrations" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminIntegrations /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/backup" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminBackup /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/crm" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminCRM /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/sales-channels" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminSalesChannels /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/categories" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminCategories /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/calendar" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminCalendar /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/helpdesk" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminHelpDesk /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/branches" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminBranches /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/pricing" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminPricing /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/webhooks" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminWebhooks /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/alerts" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminAlerts /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/blog" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminBlog /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/stories" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminStories /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/pets" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminPets /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/loyalty" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminLoyalty /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/notification-rules" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminNotificationRules /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/automations" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminAutomations /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/time-tracking" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminTimeTracking /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/data-import" element={<ProtectedRoute><AdminRoute><PageTransition><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><AdminDataImport /></Suspense></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><PageTransition><Chat /></PageTransition></ProtectedRoute>} />
        <Route path="/experiences" element={<PageTransition><Experiences /></PageTransition>} />
        <Route path="/parks" element={<PageTransition><Parks /></PageTransition>} />
        <Route path="/photos" element={<ProtectedRoute><PageTransition><Photos /></PageTransition></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><PageTransition><Documents /></PageTransition></ProtectedRoute>} />
        <Route path="/training" element={<PageTransition><PageErrorBoundary pageName="אימונים"><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><Training /></Suspense></PageErrorBoundary></PageTransition>} />
        <Route path="/grooming" element={<PageTransition><Grooming /></PageTransition>} />
        <Route path="/settings" element={<ProtectedRoute><PageTransition><Settings /></PageTransition></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><PageTransition><Notifications /></PageTransition></ProtectedRoute>} />
        <Route path="/achievements" element={<ProtectedRoute><PageTransition><Achievements /></PageTransition></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><PageTransition><Messages /></PageTransition></ProtectedRoute>} />
        <Route path="/messages/:userId" element={<ProtectedRoute><PageTransition><MessageThread /></PageTransition></ProtectedRoute>} />
        <Route path="/accessibility" element={<PageTransition><Accessibility /></PageTransition>} />
        <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
        <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
        <Route path="/club-terms" element={<PageTransition><ClubTerms /></PageTransition>} />
        <Route path="/ad-campaigns" element={<PageTransition><AdCampaigns /></PageTransition>} />
        <Route path="/businesses" element={<PageTransition><BusinessDirectory /></PageTransition>} />
        <Route path="/business/:id" element={<PageTransition><BusinessProfile /></PageTransition>} />
        <Route path="/convert-to-business" element={<ProtectedRoute><PageTransition><ConvertToBusiness /></PageTransition></ProtectedRoute>} />
        <Route path="/privacy-settings" element={<ProtectedRoute><PageTransition><PrivacySettings /></PageTransition></ProtectedRoute>} />
        <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
        <Route path="/payment-success" element={<PageTransition><PaymentSuccess /></PageTransition>} />
        <Route path="/payment-failed" element={<PageTransition><PaymentFailed /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
          </Routes>
        </AnimatePresence>
      </div>
      {showFooter && <Footer />}
    </div>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AccessibilityProvider>
          <LanguageProvider>
            <PetPreferenceProvider>
              <GuestProvider>
                <GameProvider>
                  <CartProvider>
                    <FlyingCartProvider>
                      <TooltipProvider>
                        <Toaster />
                        <Sonner />
                        <BrowserRouter>
                          <AnimatedRoutes />
                        </BrowserRouter>
                      </TooltipProvider>
                    </FlyingCartProvider>
                  </CartProvider>
                </GameProvider>
              </GuestProvider>
            </PetPreferenceProvider>
          </LanguageProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
