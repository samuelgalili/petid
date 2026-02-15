/**
 * APP.TSX - MAIN APPLICATION ENTRY
 * =================================
 * Single source of truth for:
 * - Global providers (theme, auth, cart, etc.)
 * - Route rendering
 * - Global UI components (toasts, dialogs)
 * - Splash screen on initial load
 */

import { useState } from "react";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

// Context Providers - Single source of truth
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PetPreferenceProvider } from "@/contexts/PetPreferenceContext";
import { GuestProvider } from "@/contexts/GuestContext";
import { GameProvider } from "@/contexts/GameContext";
import { CartProvider } from "@/contexts/CartContext";
import { FlyingCartProvider } from "@/components/FlyingCartAnimation";

// Global Components
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { LoginPromptDialog } from "@/components/LoginPromptDialog";
import { SplashScreen } from "@/components/SplashScreen";
import ScrollToTop from "@/components/ScrollToTop";
import Footer from "@/components/Footer";
import CompleteProfilePrompt from "@/components/CompleteProfilePrompt";

// Route configuration - modular lazy-loaded routes
import { allRoutes } from "@/routes";

// Hooks
import { useAdminNotifications } from "@/hooks/useAdminNotifications";

// Query client - single instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Pages that should not show footer
const AUTH_PAGES = ['/auth', '/signup', '/forgot-password', '/reset-password', '/install'];

/**
 * AnimatedRoutes Component
 * Handles route rendering with animations and footer visibility
 */
const AnimatedRoutes = () => {
  const location = useLocation();
  
  // Initialize admin notifications listener
  useAdminNotifications();
  
  const showFooter = !AUTH_PAGES.includes(location.pathname);
  
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <LoginPromptDialog />
      <PWAInstallPrompt />
      <CompleteProfilePrompt />
      
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {allRoutes.map((route) => (
              <Route
                key={route.path || 'not-found'}
                path={route.path}
                element={route.element}
              />
            ))}
          </Routes>
        </AnimatePresence>
      </div>
      
      {showFooter && <Footer />}
    </div>
  );
};

/**
 * Global Providers Wrapper
 * Organized from outer (less frequently changing) to inner (more frequently changing)
 */
const GlobalProviders = ({ children }: { children: React.ReactNode }) => (
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
                      {children}
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
);

/**
 * Main App Component
 */
const App = () => {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <ErrorBoundary>
      <GlobalProviders>
        {!splashDone && <SplashScreen onFinish={() => setSplashDone(true)} />}
        {splashDone && (
          <>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AnimatedRoutes />
            </BrowserRouter>
          </>
        )}
      </GlobalProviders>
    </ErrorBoundary>
  );
};

export default App;
