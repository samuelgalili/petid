/**
 * MainShell — Persistent Feed + Overlay Navigation
 * ==================================================
 * The Feed (SoundtrackFeed) is always mounted as the base layer.
 * Chat, Shop, and Dashboard render as full-screen overlays on top.
 * This ensures Feed scroll position is preserved and never unmounts.
 */
import { lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useOverlayNav } from "@/contexts/OverlayNavContext";

const SoundtrackFeed = lazy(() => import("@/pages/SoundtrackFeed"));
const Chat = lazy(() => import("@/pages/Chat"));
const Shop = lazy(() => import("@/pages/Shop"));
const ProfilePage = lazy(() => import("@/pages/Profile"));
const PublicPetProfile = lazy(() => import("@/components/PublicPetProfile"));

const overlayVariants = {
  hidden: { y: "100%" },
  visible: { y: 0 },
  exit: { y: "100%" },
};

const dashboardVariants = {
  hidden: { y: "-100%" },
  visible: { y: 0 },
  exit: { y: "-100%" },
};

const overlayTransition = { type: "spring" as const, damping: 30, stiffness: 300 };

const LoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
  </div>
);

const MainShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { dashboardOpen, closeDashboard, publicPetId, closePublicPet } = useOverlayNav();

  const showChat = location.pathname === "/chat";
  const showShop = location.pathname === "/shop" || location.pathname.startsWith("/shop/");

  return (
    <div className="relative min-h-screen">
      {/* ═══ BASE LAYER: Feed (always mounted) ═══ */}
      <Suspense fallback={<LoadingFallback />}>
        <SoundtrackFeed />
      </Suspense>

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
            {/* Close handle (top) */}
            <motion.button
              onClick={closeDashboard}
              className="sticky top-0 z-10 w-full flex items-center justify-center py-2 bg-background/80 backdrop-blur-md"
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mb-1" />
            </motion.button>
            <button
              onClick={closeDashboard}
              className="absolute top-3 left-4 z-20 w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center"
              aria-label="Close dashboard"
            >
              <ChevronDown className="w-5 h-5 text-foreground" />
            </button>

            <Suspense fallback={<LoadingFallback />}>
              <ProfilePage />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ OVERLAY: Public Pet Profile ═══ */}
      <AnimatePresence>
        {publicPetId && (
          <Suspense fallback={<LoadingFallback />}>
            <PublicPetProfile petId={publicPetId} onClose={closePublicPet} />
          </Suspense>
        )}
      </AnimatePresence>

      {/* ═══ Bottom Navigation (always visible) ═══ */}
      <BottomNav />
    </div>
  );
};

export default MainShell;
