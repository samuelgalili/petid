import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PetPreferenceProvider } from "@/contexts/PetPreferenceContext";
import { GuestProvider } from "@/contexts/GuestContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { PointsProvider } from "@/contexts/PointsContext";
import { CartProvider } from "@/contexts/CartContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageTransition } from "@/components/PageTransition";
import { Header } from "@/components/Header";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AddPet from "./pages/AddPet";
import Home from "./pages/Home";
import Feed from "./pages/Feed";
import Tracker from "./pages/Tracker";
import Shop from "./pages/Shop";
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
import NotFound from "./pages/NotFound";
import Chat from "./pages/Chat";
import Adoption from "./pages/Adoption";
import Experiences from "./pages/Experiences";
import Parks from "./pages/Parks";
import Photos from "./pages/Photos";
import Documents from "./pages/Documents";
import Settings from "./pages/Settings";
import { AdminRoute } from "./components/AdminRoute";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <>
      <Header />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/auth" replace />} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/add-pet" element={<ProtectedRoute><PageTransition><AddPet /></PageTransition></ProtectedRoute>} />
        <Route path="/home" element={<ProtectedRoute><PageTransition><Home /></PageTransition></ProtectedRoute>} />
        <Route path="/archived-pets" element={<ProtectedRoute><PageTransition><ArchivedPets /></PageTransition></ProtectedRoute>} />
        <Route path="/pet/:petId" element={<ProtectedRoute><PageTransition><PetDetails /></PageTransition></ProtectedRoute>} />
        <Route path="/breed-history/:petId" element={<ProtectedRoute><PageTransition><BreedHistory /></PageTransition></ProtectedRoute>} />
        <Route path="/feed" element={<ProtectedRoute><PageTransition><Feed /></PageTransition></ProtectedRoute>} />
        <Route path="/tracker" element={<ProtectedRoute><PageTransition><Tracker /></PageTransition></ProtectedRoute>} />
        <Route path="/shop" element={<ProtectedRoute><PageTransition><Shop /></PageTransition></ProtectedRoute>} />
        <Route path="/product/:id" element={<ProtectedRoute><PageTransition><ProductDetail /></PageTransition></ProtectedRoute>} />
        <Route path="/cart" element={<ProtectedRoute><PageTransition><Cart /></PageTransition></ProtectedRoute>} />
        <Route path="/checkout" element={<ProtectedRoute><PageTransition><Checkout /></PageTransition></ProtectedRoute>} />
        <Route path="/order-confirmation" element={<ProtectedRoute><PageTransition><OrderConfirmation /></PageTransition></ProtectedRoute>} />
        <Route path="/order-history" element={<ProtectedRoute><PageTransition><OrderHistory /></PageTransition></ProtectedRoute>} />
        <Route path="/insurance" element={<ProtectedRoute><PageTransition><Insurance /></PageTransition></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><PageTransition><Tasks /></PageTransition></ProtectedRoute>} />
        <Route path="/rewards" element={<ProtectedRoute><PageTransition><Rewards /></PageTransition></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><PageTransition><Profile /></PageTransition></ProtectedRoute>} />
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
        <Route path="/settings" element={<ProtectedRoute><PageTransition><Settings /></PageTransition></ProtectedRoute>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AccessibilityProvider>
        <LanguageProvider>
          <PetPreferenceProvider>
            <GuestProvider>
              <PointsProvider>
                <CartProvider>
                  <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    <BrowserRouter>
                      <AnimatedRoutes />
                    </BrowserRouter>
                  </TooltipProvider>
                </CartProvider>
              </PointsProvider>
            </GuestProvider>
          </PetPreferenceProvider>
        </LanguageProvider>
      </AccessibilityProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
