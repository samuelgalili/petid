import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AnalyticsData {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  topProducts: { name: string; sales: number; revenue: number }[];
  ordersByStatus: Record<string, number>;
  revenueByDay: { date: string; revenue: number; orders: number }[];
  customerRetention: number;
  newCustomers: number;
  returningCustomers: number;
}

interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Advanced analytics hook for business insights
 */
export const useAnalytics = (businessId?: string) => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    to: new Date(),
  });

  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['analytics', businessId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async (): Promise<AnalyticsData> => {
      const fromDate = dateRange.from.toISOString();
      const toDate = dateRange.to.toISOString();

      // Fetch orders in date range
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total, status, created_at, user_id')
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      if (ordersError) throw ordersError;

      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + (parseFloat(o.total?.toString() || '0')), 0) || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate orders by status
      const ordersByStatus: Record<string, number> = {};
      orders?.forEach(o => {
        ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1;
      });

      // Calculate revenue by day
      const revenueByDay: Record<string, { revenue: number; orders: number }> = {};
      orders?.forEach(o => {
        const date = o.created_at.split('T')[0];
        if (!revenueByDay[date]) {
          revenueByDay[date] = { revenue: 0, orders: 0 };
        }
        revenueByDay[date].revenue += parseFloat(o.total?.toString() || '0');
        revenueByDay[date].orders += 1;
      });

      // Convert to array and sort by date
      const revenueByDayArray = Object.entries(revenueByDay)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate unique customers
      const uniqueCustomers = new Set(orders?.map(o => o.user_id)).size;

      // Fetch previous period for comparison
      const previousPeriodDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (24 * 60 * 60 * 1000));
      const previousFrom = new Date(dateRange.from.getTime() - previousPeriodDays * 24 * 60 * 60 * 1000);

      const { data: previousOrders } = await supabase
        .from('orders')
        .select('user_id')
        .gte('created_at', previousFrom.toISOString())
        .lt('created_at', fromDate);

      const previousCustomers = new Set(previousOrders?.map(o => o.user_id));
      const currentCustomers = new Set(orders?.map(o => o.user_id));

      // Calculate new vs returning customers
      let newCustomers = 0;
      let returningCustomers = 0;
      currentCustomers.forEach(id => {
        if (previousCustomers.has(id)) {
          returningCustomers++;
        } else {
          newCustomers++;
        }
      });

      const customerRetention = previousCustomers.size > 0 
        ? (returningCustomers / previousCustomers.size) * 100 
        : 0;

      // Fetch top products (simplified - would need order_items in real implementation)
      const topProducts: AnalyticsData['topProducts'] = [];

      // Conversion rate placeholder (would need session tracking)
      const conversionRate = 3.5; // Placeholder

      return {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        conversionRate,
        topProducts,
        ordersByStatus,
        revenueByDay: revenueByDayArray,
        customerRetention,
        newCustomers,
        returningCustomers,
      };
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate trends compared to previous period
  const calculateTrend = useCallback((current: number, previous: number) => {
    if (previous === 0) return { value: '0%', isPositive: true };
    const change = ((current - previous) / previous) * 100;
    return {
      value: `${Math.abs(change).toFixed(1)}%`,
      isPositive: change >= 0,
    };
  }, []);

  // Preset date ranges
  const setPresetRange = useCallback((preset: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
    const now = new Date();
    let from: Date;

    switch (preset) {
      case 'today':
        from = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    setDateRange({ from, to: new Date() });
  }, []);

  return {
    analytics,
    isLoading,
    dateRange,
    setDateRange,
    setPresetRange,
    refetch,
    calculateTrend,
  };
};

export default useAnalytics;
