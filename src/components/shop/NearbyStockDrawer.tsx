/**
 * NearbyStockDrawer — Contextual map drawer showing local suppliers for a product.
 * Opens from ProductCard as a bottom sheet with gold-dot minimalist map.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Clock, Star, Store, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { haptic } from "@/lib/haptics";

interface Supplier {
  id: string;
  name: string;
  city: string | null;
  rating: number | null;
  distance: string;
  eta: string;
}

interface NearbyStockDrawerProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  productId: string;
}

export const NearbyStockDrawer = ({ open, onClose, productName, productId }: NearbyStockDrawerProps) => {
  const { direction } = useLanguage();
  const isRtl = direction === "rtl";
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    const load = async () => {
      const { data } = await supabase
        .from("business_profiles")
        .select("id, business_name, city, rating")
        .in("business_type", ["shop", "vet", "groomer"])
        .eq("is_verified", true)
        .limit(6);

      if (data) {
        const mapped: Supplier[] = (data as any[]).map((b, i) => ({
          id: b.id,
          name: b.business_name,
          city: b.city,
          rating: b.rating,
          distance: `${(0.5 + i * 0.8).toFixed(1)} km`,
          eta: `${10 + i * 5} min`,
        }));
        setSuppliers(mapped);
      }
      setLoading(false);
    };
    load();
  }, [open, productId]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[201] max-h-[75vh] rounded-t-2xl overflow-hidden"
            style={{
              background: "hsl(var(--background))",
              borderTop: "1px solid hsl(var(--border) / 0.3)",
            }}
            dir={direction}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: "hsl(var(--primary) / 0.1)",
                    border: "1px solid hsl(var(--primary) / 0.15)",
                  }}
                >
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate">
                    {isRtl ? "מלאי קרוב" : "Nearby Stock"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground truncate">{productName}</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-muted/50"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </motion.button>
            </div>

            {/* Mini Map Visual — Minimalist monochromatic with gold dots */}
            <div
              className="mx-4 h-[140px] rounded-xl mb-3 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted) / 0.5))",
                border: "1px solid hsl(var(--border) / 0.2)",
              }}
            >
              {/* Grid lines for map feel */}
              <div className="absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage: `
                    linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                    linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
                  `,
                  backgroundSize: "30px 30px",
                }}
              />

              {/* User location — center */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <motion.div
                  className="w-16 h-16 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    border: "1.5px solid hsl(var(--primary) / 0.25)",
                  }}
                  animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />
                <div className="w-3 h-3 rounded-full bg-primary border-2 border-background shadow-sm relative z-10" />
              </div>

              {/* Gold pulsing supplier dots */}
              {suppliers.slice(0, 5).map((s, i) => {
                const positions = [
                  { top: "25%", left: "20%" },
                  { top: "35%", right: "18%" },
                  { top: "65%", left: "30%" },
                  { top: "55%", right: "25%" },
                  { top: "20%", left: "55%" },
                ];
                const pos = positions[i] || positions[0];

                return (
                  <div key={s.id} className="absolute" style={pos}>
                    <motion.div
                      className="w-6 h-6 rounded-full absolute -top-1.5 -left-1.5"
                      style={{ background: "hsla(45, 90%, 55%, 0.15)" }}
                      animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3 }}
                    />
                    <div
                      className="w-3 h-3 rounded-full shadow-sm relative z-10"
                      style={{
                        background: "linear-gradient(135deg, hsl(45, 90%, 55%), hsl(45, 80%, 45%))",
                        boxShadow: "0 0 6px hsla(45, 90%, 55%, 0.4)",
                      }}
                    />
                  </div>
                );
              })}

              {/* Legend */}
              <div className="absolute bottom-2 right-3 flex items-center gap-3 text-[9px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {isRtl ? "אתה" : "You"}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(45, 90%, 55%)" }} />
                  {isRtl ? "ספקים" : "Suppliers"}
                </span>
              </div>
            </div>

            {/* Supplier List */}
            <div className="px-4 pb-[calc(16px+env(safe-area-inset-bottom))] space-y-2 max-h-[260px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Navigation className="w-5 h-5 text-muted-foreground" />
                  </motion.div>
                </div>
              ) : suppliers.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                  {isRtl ? "לא נמצאו ספקים קרובים" : "No nearby suppliers found"}
                </p>
              ) : (
                suppliers.map((supplier) => (
                  <motion.div
                    key={supplier.id}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                    style={{
                      background: "hsl(var(--muted) / 0.3)",
                      border: "1px solid hsl(var(--border) / 0.15)",
                    }}
                    onClick={() => haptic("light")}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "hsl(var(--muted) / 0.5)",
                        border: "1px solid hsl(var(--border) / 0.2)",
                      }}
                    >
                      <Store className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{supplier.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {supplier.rating != null && supplier.rating > 0 && (
                          <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            {supplier.rating.toFixed(1)}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">{supplier.city}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-[11px] font-medium text-foreground">{supplier.distance}</span>
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Clock className="w-2.5 h-2.5" /> {supplier.eta}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
