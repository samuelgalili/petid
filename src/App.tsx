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
import { GameProvider } from "@/contexts/GameContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageTransition } from "@/components/PageTransition";
import { Header } from "@/components/Header";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AddPet from "./pages/AddPet";
import Home from "./pages/Home";
import Install from "./pages/Install";
const Feed = lazy(() => import("./pages/Feed"));
import UserProfile from "./pages/UserProfile";
import PostDetail from "./pages/PostDetail";
import StoryViewer from "./pages/StoryViewer";
import HighlightViewer from "./pages/HighlightViewer";
import Tracker from "./pages/Tracker";
const Shop = lazy(() => import("./pages/Shop"));
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
import Onboarding from "./pages/Onboarding";
import Achievements from "./pages/Achievements";
import Messages from "./pages/Messages";
import MessageThread from "./pages/MessageThread";
import Accessibility from "./pages/Accessibility";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import ClubTerms from "./pages/ClubTerms";
import Favorites from "./pages/Favorites";
import Splash from "./pages/Splash";
import Support from "./pages/Support";
import Deals from "./pages/Deals";
import { AdminRoute } from "./components/AdminRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageErrorBoundary } from "./components/PageErrorBoundary";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import Footer from "./components/Footer";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  useAdminNotifications();
  
  const authPages = ['/auth', '/signup', '/forgot-password', '/reset-password', '/install'];
  const showFooter = !authPages.includes(location.pathname);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/splash" replace />} />
        <Route path="/splash" element={<PageTransition><Splash /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/install" element={<PageTransition><Install /></PageTransition>} />
        <Route path="/support" element={<ProtectedRoute><PageTransition><Support /></PageTransition></ProtectedRoute>} />
        <Route path="/deals" element={<ProtectedRoute><PageTransition><Deals /></PageTransition></ProtectedRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/add-pet" element={<ProtectedRoute><PageTransition><AddPet /></PageTransition></ProtectedRoute>} />
        <Route path="/home" element={<ProtectedRoute><PageTransition><PageErrorBoundary pageName="עמוד הבית"><Home /></PageErrorBoundary></PageTransition></ProtectedRoute>} />
        <Route path="/archived-pets" element={<ProtectedRoute><PageTransition><ArchivedPets /></PageTransition></ProtectedRoute>} />
        <Route path="/pet/:petId" element={<ProtectedRoute><PageTransition><PetDetails /></PageTransition></ProtectedRoute>} />
        <Route path="/breed-history/:petId" element={<ProtectedRoute><PageTransition><BreedHistory /></PageTransition></ProtectedRoute>} />
        <Route path="/feed" element={<ProtectedRoute><PageTransition><PageErrorBoundary pageName="הפיד"><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><Feed /></Suspense></PageErrorBoundary></PageTransition></ProtectedRoute>} />
        <Route path="/user/:userId" element={<ProtectedRoute><PageTransition><UserProfile /></PageTransition></ProtectedRoute>} />
        <Route path="/post/:postId" element={<ProtectedRoute><PageTransition><PostDetail /></PageTransition></ProtectedRoute>} />
        <Route path="/story/:userId" element={<ProtectedRoute><StoryViewer /></ProtectedRoute>} />
        <Route path="/highlight/:highlightId" element={<ProtectedRoute><HighlightViewer /></ProtectedRoute>} />
        <Route path="/tracker" element={<ProtectedRoute><PageTransition><Tracker /></PageTransition></ProtectedRoute>} />
        <Route path="/shop" element={<ProtectedRoute><PageTransition><PageErrorBoundary pageName="החנות"><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><Shop /></Suspense></PageErrorBoundary></PageTransition></ProtectedRoute>} />
        <Route path="/product/:id" element={<ProtectedRoute><PageTransition><ProductDetail /></PageTransition></ProtectedRoute>} />
        <Route path="/cart" element={<ProtectedRoute><PageTransition><Cart /></PageTransition></ProtectedRoute>} />
        <Route path="/favorites" element={<ProtectedRoute><PageTransition><Favorites /></PageTransition></ProtectedRoute>} />
        <Route path="/checkout" element={<ProtectedRoute><PageTransition><Checkout /></PageTransition></ProtectedRoute>} />
        <Route path="/order-confirmation" element={<ProtectedRoute><PageTransition><OrderConfirmation /></PageTransition></ProtectedRoute>} />
        <Route path="/order-history" element={<ProtectedRoute><PageTransition><OrderHistory /></PageTransition></ProtectedRoute>} />
        <Route path="/insurance" element={<ProtectedRoute><PageTransition><Insurance /></PageTransition></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><PageTransition><Tasks /></PageTransition></ProtectedRoute>} />
        <Route path="/rewards" element={<ProtectedRoute><PageTransition><Rewards /></PageTransition></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><PageTransition><Profile /></PageTransition></ProtectedRoute>} />
        <Route path="/edit-profile" element={<ProtectedRoute><PageTransition><EditProfile /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute><AdminRoute><PageTransition><AdminDashboard /></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/orders" element={<ProtectedRoute><AdminRoute><PageTransition><AdminOrders /></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/customers" element={<ProtectedRoute><AdminRoute><PageTransition><AdminCustomers /></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/admin/parks" element={<ProtectedRoute><AdminRoute><PageTransition><AdminParks /></PageTransition></AdminRoute></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><PageTransition><Chat /></PageTransition></ProtectedRoute>} />
        <Route path="/adoption" element={<ProtectedRoute><PageTransition><Adoption /></PageTransition></ProtectedRoute>} />
            <Route path="/experiences" element={<ProtectedRoute><PageTransition><Experiences /></PageTransition></ProtectedRoute>} />
            <Route path="/parks" element={<ProtectedRoute><PageTransition><Parks /></PageTransition></ProtectedRoute>} />
            <Route path="/photos" element={<ProtectedRoute><PageTransition><Photos /></PageTransition></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><PageTransition><Documents /></PageTransition></ProtectedRoute>} />
            <Route path="/training" element={<ProtectedRoute><PageTransition><PageErrorBoundary pageName="אימונים"><Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><Training /></Suspense></PageErrorBoundary></PageTransition></ProtectedRoute>} />
            <Route path="/grooming" element={<ProtectedRoute><PageTransition><Grooming /></PageTransition></ProtectedRoute>} />
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
                      <TooltipProvider>
                        <Toaster />
                        <Sonner />
                        <BrowserRouter>
                          <AnimatedRoutes />
                        </BrowserRouter>
                      </TooltipProvider>
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
