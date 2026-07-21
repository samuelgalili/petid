import { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import BottomNav from "@/components/BottomNav";

const Chat = lazy(() => import("@/pages/Chat"));
const Shop = lazy(() => import("@/pages/Shop"));
const MipoFeed = lazy(() => import("@/pages/MipoFeed"));
const MipoHome = lazy(() => import("@/pages/MipoHome"));

const LoadingFallback = () => (
  <div className="mipo-screen flex min-h-screen items-center justify-center">
    <div className="mipo-gradient-ring p-[3px]">
      <div className="h-12 w-12 animate-pulse rounded-full bg-white" />
    </div>
  </div>
);

const MainShell = () => {
  const { pathname } = useLocation();
  const CurrentPage = pathname === "/feed"
    ? MipoFeed
    : pathname === "/chat"
      ? Chat
      : pathname === "/shop" || pathname.startsWith("/shop/")
        ? Shop
        : MipoHome;

  return (
    <div className="relative min-h-screen bg-mipo-soft">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <Suspense fallback={<LoadingFallback />}>
            <CurrentPage />
          </Suspense>
        </motion.div>
      </AnimatePresence>
      <BottomNav />
    </div>
  );
};

export default MainShell;
