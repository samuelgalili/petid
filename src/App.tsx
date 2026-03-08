/**
 * APP.TSX - MAIN APPLICATION ENTRY
 * =================================
 * Single source of truth for:
 * - Global providers (theme, auth, cart, etc.)
 * - Route rendering
 * - Global UI components (toasts, dialogs)
 * - Splash screen on initial load
 */

import { useState, useMemo } from "react";

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
import { CentralBrainProvider } from "@/contexts/CentralBrainContext";
import { BrainDebuggerOverlay } from "@/components/admin/BrainDebuggerOverlay";
import { OverlayNavProvider } from "@/contexts/OverlayNavContext";
import { GuestProvider } from "@/contexts/GuestContext";
import { GameProvider } from "@/contexts/GameContext";
import { CartProvider } from "@/contexts/CartContext";
import { FlyingCartProvider } from "@/components/FlyingCartAnimation";

// Global Components
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HelmetProvider } from "react-helmet-async";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { OfflineBadge } from "@/components/OfflineBadge";
import { LoginPromptDialog } from "@/components/LoginPromptDialog";

import ScrollToTop from "@/components/ScrollToTop";
import { LegalDrawer } from "@/components/LegalDrawer";
import CompleteProfilePrompt from "@/components/CompleteProfilePrompt";
import SarahDataGapAlert from "@/components/SarahDataGapAlert";
import { UXGuardian } from "@/components/UXGuardian";
import { SarahCrashPopup } from "@/components/SarahCrashPopup";
import { PrivacyConsentPopup } from "@/components/PrivacyConsentPopup";

// Route configuration - modular lazy-loaded routes
import { allRoutes } from "@/routes";

// Hooks
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useActivityTracker } from "@/hooks/useActivityTracker";

// Query client - single instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});


/**
 * AnimatedRoutes Component
 * Handles route rendering with animations and footer visibility
 */
const MAIN_SHELL_ROUTES = ['/', '/feed', '/chat', '/shop'];

const AnimatedRoutes = () => {
  const location = useLocation();
  
  // Initialize admin notifications listener
  useAdminNotifications();
  
  // Global user activity tracking
  useActivityTracker();
  
  // Stable key for main shell routes so Feed never unmounts
  const routeKey = MAIN_SHELL_ROUTES.includes(location.pathname) ? 'main-shell' : location.pathname;
  
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <OfflineBadge />
      <LoginPromptDialog />
      <PWAInstallPrompt />
      <CompleteProfilePrompt />
      <SarahDataGapAlert />
      
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <Routes location={location} key={routeKey}>
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
      <LegalDrawer />
      <UXGuardian />
      <SarahCrashPopup />
      <PrivacyConsentPopup />
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
            <CentralBrainProvider>
              <OverlayNavProvider>
                <GuestProvider>
                  <GameProvider>
                    <CartProvider>
                      <FlyingCartProvider>
                        <TooltipProvider>
                          {children}
                          <BrainDebuggerOverlay />
                        </TooltipProvider>
                      </FlyingCartProvider>
                    </CartProvider>
                  </GameProvider>
                </GuestProvider>
              </OverlayNavProvider>
            </CentralBrainProvider>
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
  return (
    <ErrorBoundary>
      <GlobalProviders>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </GlobalProviders>
    </ErrorBoundary>
  );
};

export default App;
