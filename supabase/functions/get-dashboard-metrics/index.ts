import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Support both body (POST) and query params (GET)
    let period = '30';
    try {
      const body = await req.json();
      if (body?.period) period = String(body.period);
    } catch {
      const url = new URL(req.url);
      period = url.searchParams.get('period') || '30';
    }
    const days = parseInt(period);

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Get daily metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('metrics_daily')
      .select('*')
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .lte('metric_date', endDate.toISOString().split('T')[0])
      .order('metric_date', { ascending: true });

    if (metricsError) {
      console.error('metrics_daily query error:', metricsError);
    }

    // If no metrics data, return mock/empty structure
    const hasData = metrics && metrics.length > 0;

    // Calculate aggregates
    const totalRevenue = metrics?.reduce((sum, m) => sum + parseFloat(m.total_revenue || '0'), 0) || 0;
    const totalOrders = metrics?.reduce((sum, m) => sum + (m.total_orders || 0), 0) || 0;
    const totalExpenses = metrics?.reduce((sum, m) => sum + parseFloat(m.total_expenses || '0'), 0) || 0;
    const newCustomers = metrics?.reduce((sum, m) => sum + (m.new_customers || 0), 0) || 0;
    const returningCustomers = metrics?.reduce((sum, m) => sum + (m.returning_customers || 0), 0) || 0;

    // Get previous period for comparison
    const previousEnd = startDate;
    const previousStart = new Date(previousEnd.getTime() - days * 24 * 60 * 60 * 1000);

    const { data: previousMetrics } = await supabase
      .from('metrics_daily')
      .select('total_revenue, total_orders')
      .gte('metric_date', previousStart.toISOString().split('T')[0])
      .lt('metric_date', previousEnd.toISOString().split('T')[0]);

    const previousRevenue = previousMetrics?.reduce((sum, m) => sum + parseFloat(m.total_revenue || '0'), 0) || 0;
    const previousOrders = previousMetrics?.reduce((sum, m) => sum + (m.total_orders || 0), 0) || 0;

    // Get top products across period
    const allProducts = new Map<string, { quantity: number; revenue: number }>();
    metrics?.forEach(m => {
      const products = m.top_products as any[] || [];
      products.forEach(p => {
        const existing = allProducts.get(p.name) || { quantity: 0, revenue: 0 };
        existing.quantity += p.quantity || 0;
        existing.revenue += p.revenue || 0;
        allProducts.set(p.name, existing);
      });
    });

    const topProducts = Array.from(allProducts.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Get low stock products (handle missing columns gracefully)
    let lowStockProducts: any[] = [];
    try {
      const { data } = await supabase
        .from('normalized_products')
        .select('id, name, sku, stock_quantity')
        .lt('stock_quantity', 10)
        .order('stock_quantity', { ascending: true })
        .limit(10);
      lowStockProducts = data || [];
    } catch (e) {
      console.error('Low stock query error:', e);
    }

    // Get recent transactions
    let recentTransactions: any[] = [];
    try {
      const { data } = await supabase
        .from('normalized_transactions')
        .select('id, external_id, customer_name, total, status, transaction_date')
        .order('transaction_date', { ascending: false })
        .limit(10);
      recentTransactions = data || [];
    } catch (e) {
      console.error('Transactions query error:', e);
    }

    // Generate mock chart data if no real data
    let chartRevenueByDay = metrics?.map(m => ({
      date: m.metric_date,
      revenue: parseFloat(m.total_revenue || '0'),
      orders: m.total_orders || 0,
    })) || [];

    let chartCustomersByDay = metrics?.map(m => ({
      date: m.metric_date,
      new: m.new_customers || 0,
      returning: m.returning_customers || 0,
    })) || [];

    if (chartRevenueByDay.length === 0) {
      // Generate mock data for chart display
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split('T')[0];
        chartRevenueByDay.push({ date: dateStr, revenue: 0, orders: 0 });
        chartCustomersByDay.push({ date: dateStr, new: 0, returning: 0 });
      }
    }

    const dashboard = {
      overview: {
        revenue: {
          total: totalRevenue,
          change: previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0,
          trend: totalRevenue >= previousRevenue ? 'up' : 'down',
        },
        orders: {
          total: totalOrders,
          change: previousOrders > 0 ? ((totalOrders - previousOrders) / previousOrders) * 100 : 0,
          pending: 0, // Would need to calculate from transactions
        },
        customers: {
          new: newCustomers,
          returning: returningCustomers,
          returningPercent: (newCustomers + returningCustomers) > 0 
            ? (returningCustomers / (newCustomers + returningCustomers)) * 100 
            : 0,
        },
        profit: {
          gross: totalRevenue - totalExpenses,
          margin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
        },
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      },
      charts: {
        revenueByDay: chartRevenueByDay,
        customersByDay: chartCustomersByDay,
      },
      topProducts,
      inventory: {
        lowStock: lowStockProducts || [],
        outOfStock: lowStockProducts?.filter(p => p.stock_quantity === 0).length || 0,
      },
      recentTransactions: recentTransactions || [],
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        days,
      },
    };

    return new Response(JSON.stringify(dashboard), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Dashboard metrics error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
