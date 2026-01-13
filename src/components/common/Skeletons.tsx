import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

// ===== Order Card Skeleton =====
export const OrderCardSkeleton = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton variant="shimmer" className="h-5 w-32 rounded" />
            <Skeleton variant="shimmer" className="h-3 w-24 rounded" />
            <Skeleton variant="shimmer" className="h-3 w-28 rounded" />
          </div>
          <Skeleton variant="shimmer" className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <Skeleton variant="shimmer" className="h-6 w-20 rounded" />
          <Skeleton variant="shimmer" className="h-8 w-16 rounded" />
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// ===== Admin Stats Skeleton =====
export const AdminStatsSkeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {[1, 2, 3, 4].map((i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: i * 0.05 }}
      >
        <Card className="border border-border/50">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton variant="shimmer" className="h-3 w-20 rounded" />
                <Skeleton variant="shimmer" className="h-7 w-24 rounded" />
              </div>
              <Skeleton variant="shimmer" className="h-10 w-10 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    ))}
  </div>
);

// ===== Table Skeleton =====
export const TableSkeleton = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => (
  <div className="border rounded-lg overflow-hidden">
    {/* Header */}
    <div className="flex gap-4 p-4 bg-muted/50 border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} variant="shimmer" className="h-4 flex-1 rounded" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <motion.div
        key={rowIndex}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: rowIndex * 0.03 }}
        className="flex gap-4 p-4 border-b last:border-b-0"
      >
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} variant="shimmer" className="h-4 flex-1 rounded" />
        ))}
      </motion.div>
    ))}
  </div>
);

// ===== Chart Skeleton =====
export const ChartSkeleton = ({ height = 200 }: { height?: number }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="shimmer" className="h-5 w-32 rounded" />
        <div className="flex gap-2">
          <Skeleton variant="shimmer" className="h-8 w-20 rounded" />
          <Skeleton variant="shimmer" className="h-8 w-20 rounded" />
        </div>
      </div>
      <div className="flex items-end gap-2" style={{ height }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${20 + Math.random() * 80}%` }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="flex-1"
          >
            <Skeleton variant="shimmer" className="w-full h-full rounded-t" />
          </motion.div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ'].map((month) => (
          <span key={month} className="text-[10px] text-muted-foreground">{month}</span>
        ))}
      </div>
    </CardContent>
  </Card>
);

// ===== Form Skeleton =====
export const FormSkeleton = ({ fields = 4 }: { fields?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: fields }).map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
        className="space-y-2"
      >
        <Skeleton variant="shimmer" className="h-4 w-24 rounded" />
        <Skeleton variant="shimmer" className="h-10 w-full rounded-lg" />
      </motion.div>
    ))}
    <div className="flex gap-3 pt-4">
      <Skeleton variant="shimmer" className="h-10 flex-1 rounded-lg" />
      <Skeleton variant="shimmer" className="h-10 w-24 rounded-lg" />
    </div>
  </div>
);

// ===== Dashboard Skeleton =====
export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <AdminStatsSkeleton />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton height={250} />
      <ChartSkeleton height={250} />
    </div>
    <TableSkeleton rows={5} columns={5} />
  </div>
);

// ===== List Skeleton =====
export const ListSkeleton = ({ items = 5 }: { items?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: items }).map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.05 }}
        className="flex items-center gap-4 p-4 bg-card rounded-lg border"
      >
        <Skeleton variant="shimmer" className="h-12 w-12 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="shimmer" className="h-4 w-3/4 rounded" />
          <Skeleton variant="shimmer" className="h-3 w-1/2 rounded" />
        </div>
        <Skeleton variant="shimmer" className="h-8 w-8 rounded" />
      </motion.div>
    ))}
  </div>
);

export {
  OrderCardSkeleton as default,
};
