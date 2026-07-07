/**
 * MainShell — Persistent Home + Overlay Navigation
 * ==================================================
 * The AWS-backed profile/home screen is mounted as the base layer.
 * Chat, Shop, and Dashboard render as full-screen overlays on top.
 */
import { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { useOverlayNav } from "@/contexts/OverlayNavContext";

const Chat = lazy(() => import("@/pages/Chat"));
const Shop = lazy(() => import("@/pages/Shop"));
const ProfilePage = lazy(() => import("@/pages/Profile"));

const overlayVariants = {
  hidden: { y: "100%" },
  visible: { y: 0 },
  exit: { y: "100%" },
};

const dashboardVariants = {
  hidden: { y: "-100%" },
  visible: { y: 0 },
  exit: { y: "100%" },
};

const overlayTransition = { type: "spring" as const, damping: 30, stiffness: 300 };

const LoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
  </div>
);

const MainShell = () => {
  const location = useLocation();
  const { dashboardOpen, closeDashboard } = useOverlayNav();

  const showChat = location.pathname === "/chat";
  const showShop = location.pathname === "/shop" || location.pathname.startsWith("/shop/");
  const shouldMountHome = !showShop;

  return (
    <div className="relative min-h-screen">
      {/* ═══ BASE LAYER: AWS-backed home/profile ═══ */}
      {shouldMountHome && (
        <Suspense fallback={<LoadingFallback />}>
          <ProfilePage />
        </Suspense>
      )}

      {/* ═══ OVERLAY: AI Chat ═══ */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            key="chat-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={overlayTransition}
            className="fixed inset-0 z-[200] bg-background overflow-auto"
          >
            <Suspense fallback={<LoadingFallback />}>
              <Chat />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ OVERLAY: Shop ═══ */}
      <AnimatePresence>
        {showShop && (
          <motion.div
            key="shop-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={overlayTransition}
            className="fixed inset-0 z-[200] bg-background overflow-auto"
          >
            <Suspense fallback={<LoadingFallback />}>
              <Shop />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ OVERLAY: Pet Dashboard (slide-up card) ═══ */}
      <AnimatePresence>
        {dashboardOpen && (
          <motion.div
            key="dashboard-overlay"
            variants={dashboardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={overlayTransition}
            className="fixed inset-0 z-[250] bg-background overflow-auto"
          >
            {/* Close handle — narrow pill, doesn't block header buttons */}
            <div className="sticky top-0 z-30 w-full flex justify-center pointer-events-none">
              <motion.button
                onClick={closeDashboard}
                className="pointer-events-auto px-6 py-2 bg-background/80 backdrop-blur-md rounded-b-xl"
                whileTap={{ scale: 0.95 }}
                aria-label="סגור דשבורד"
              >
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </motion.button>
            </div>

            <Suspense fallback={<LoadingFallback />}>
              <ProfilePage />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Bottom Navigation (always visible) ═══ */}
      <BottomNav />
    </div>
  );
};

export default MainShell;
