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
import { PointsProvider } from "@/contexts/PointsContext";
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
import ColorSystemShowcase from "./pages/ColorSystemShowcase";
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
import HomeAIPilot from "./pages/HomeAIPilot";
import HomeAIDebug from "./pages/HomeAIDebug";
import HomeAIBase from "./pages/HomeAIBase";
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
        <Route path="/color-system" element={<ProtectedRoute><PageTransition><ColorSystemShowcase /></PageTransition></ProtectedRoute>} />
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
        {/* Internal pilot page - not connected to navigation */}
        <Route path="/home-ai-pilot" element={<ProtectedRoute><PageTransition><HomeAIPilot /></PageTransition></ProtectedRoute>} />
        {/* Internal debug page - decoder test only */}
        <Route path="/home-ai-debug" element={<ProtectedRoute><PageTransition><HomeAIDebug /></PageTransition></ProtectedRoute>} />
        {/* Home AI Base - clean home with logic bindings */}
        <Route path="/home-ai-base" element={<ProtectedRoute><PageTransition><HomeAIBase /></PageTransition></ProtectedRoute>} />
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
                <PointsProvider>
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
                </PointsProvider>
              </GuestProvider>
            </PetPreferenceProvider>
          </LanguageProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
